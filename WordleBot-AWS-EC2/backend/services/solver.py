"""Wordle solver modelled on https://github.com/ybenhayun/wordlebot (normal mode).

- Candidate answers come from the official answer list (data/wordle_ques.csv); only if none fit
  do we fall back to the full valid-word list.
- Any valid word (data/possible_words.csv) may be guessed, so non-answer "probe" words are allowed.
- Guesses are ranked by a bucket-size heuristic, then the top CHECK_SIZE are scored exactly by
  playing every remaining answer out, sorted by (share unsolved within 6, average guesses).
- Colour patterns for every (guess, answer) pair are precomputed once as base-3 codes.
"""

import time
from collections import OrderedDict

import numpy as np
import pandas as pd

WORD_LENGTH = 5
MAX_GUESSES = 6
OPENER = "salet"        # best normal-mode opener for the official answer list
CHECK_SIZE = 50         # guesses scored exactly by lookahead
MAX_TIME = 1.0          # keep scoring past CHECK_SIZE only while no guess solves everything
TEMP_LIST_SIZE = 100    # with > LARGE_LIST answers, only heuristic-score this many guesses
LARGE_LIST = 1000
POOL_LIMIT = 100_000    # cap on answers * guesses when building the guess pool
SOLVED = 3 ** WORD_LENGTH - 1   # pattern code for "ggggg"
CODES = {"b": 0, "y": 1, "g": 2}
CACHE_SIZE = 5000


def _load(path):
    return [w.strip().lower() for w in pd.read_csv(path)["words"].tolist()]


answers = _load("data/wordle_ques.csv")
guesses = list(dict.fromkeys(answers + _load("data/possible_words.csv")))
guess_index = {w: i for i, w in enumerate(guesses)}
answer_index = {w: i for i, w in enumerate(answers)}


def _letters(words):
    return np.frombuffer("".join(words).encode(), dtype=np.uint8).reshape(-1, WORD_LENGTH)


def _patterns(guess_letters, answer_letters, chunk=500):
    """Base-3 colour codes (b=0, y=1, g=2, first letter most significant) for every pair."""
    out = np.empty((len(guess_letters), len(answer_letters)), dtype=np.uint8)
    a = answer_letters[None, :, :]
    for start in range(0, len(guess_letters), chunk):
        G = guess_letters[start:start + chunk]
        green = G[:, None, :] == a
        codes = np.zeros(green.shape[:2], dtype=np.uint8)
        for i in range(WORD_LENGTH):
            available = ((a == G[:, i][:, None, None]) & ~green).sum(-1)
            # earlier non-green copies of this letter in the guess claim yellows first
            earlier = ((G[:, :i] == G[:, i:i + 1])[:, None, :] & ~green[:, :, :i]).sum(-1)
            yellow = ~green[:, :, i] & (earlier < available)
            codes = codes * 3 + np.where(green[:, :, i], 2, yellow.astype(np.uint8))
        out[start:start + chunk] = codes
    return out


guess_letters = _letters(guesses)
PATTERNS = _patterns(guess_letters, _letters(answers))   # (guesses, answers) uint8


def encode_feedback(feedback: str) -> int:
    code = 0
    for ch in feedback.lower():
        code = code * 3 + CODES[ch]
    return code


class _Context:
    """Pattern lookups for one candidate set: rows are guess ids, columns are candidates."""

    def __init__(self, words, likely):
        self.words = words
        if likely:
            self.matrix = PATTERNS[:, [answer_index[w] for w in words]]
        else:
            self.matrix = _patterns(guess_letters, _letters(words))
        self.memo = {}

    def ids(self, cols):
        return np.array([guess_index[self.words[c]] for c in cols])


def _letter_ranking(pool, words):
    """Order pool by how common its letters are among words (each letter counted once per word)."""
    cand = _letters(words) - ord('a')
    positional = np.zeros((26, WORD_LENGTH), dtype=np.int64)
    for j in range(WORD_LENGTH):
        positional[:, j] = np.bincount(cand[:, j], minlength=26)
    present = np.zeros(26, dtype=np.int64)
    for row in cand:
        present[np.unique(row)] += 1

    letters = guess_letters[pool] - ord('a')
    score = np.zeros(len(pool), dtype=np.int64)
    for j in range(WORD_LENGTH):
        first = np.ones(len(pool), dtype=bool)
        for k in range(j):
            first &= letters[:, k] != letters[:, j]
        score += np.where(first, present[letters[:, j]] + positional[letters[:, j], j], 0)
    return pool[np.argsort(-score, kind="stable")], present, positional


def _merge(first, rest):
    return np.concatenate([first, rest[~np.isin(rest, first)]])


def _guess_pool(ctx, cols):
    """Candidates first, then all guesses, by letter frequency; pruned and size-capped."""
    words = [ctx.words[c] for c in cols]
    ranked_cands, present, positional = _letter_ranking(ctx.ids(cols), words)
    pool = _merge(ranked_cands, _letter_ranking(np.arange(len(guesses)), words)[0])
    n = len(cols)
    if n > 10:
        # drop guesses using a letter no candidate has, or a letter where no candidate has it
        letters = guess_letters[pool] - ord('a')
        keep = np.ones(len(pool), dtype=bool)
        for j in range(WORD_LENGTH):
            c = letters[:, j]
            keep &= (present[c] != 0) & ~((positional[c, j] == 0) & (present[c] == n))
        pool = pool[keep]
    if n * len(pool) > POOL_LIMIT:
        pool = pool[:max(n, POOL_LIMIT // n)]
    return pool


def _rank(ctx, pool, cols):
    """Sort by (1 - share of answers that end next turn) * expected bucket size, best first."""
    n = len(cols)
    sub = ctx.matrix[np.ix_(pool, cols)].astype(np.int64)
    sub += (np.arange(len(pool)) * (SOLVED + 1))[:, None]
    counts = np.bincount(sub.ravel(), minlength=len(pool) * (SOLVED + 1)).reshape(len(pool), -1)
    solved = counts[:, SOLVED] > 0
    counts[:, SOLVED] = 0
    weighted = (counts ** 2).sum(1) / n
    ends_next = ((counts > 0).sum(1) + solved) / n
    return pool[np.argsort((1 - ends_next) * weighted, kind="stable")]


def _play_out(ctx, pool, guess_id, cols, attempt, results):
    """Guess guess_id at 0-based turn `attempt`, then follow the greedy policy; tally solve turns."""
    codes = ctx.matrix[guess_id, cols]
    order = np.argsort(codes, kind="stable")
    codes, cols = codes[order], cols[order]
    splits = np.flatnonzero(np.diff(codes)) + 1
    for code, bucket in zip(codes[np.r_[0, splits]], np.split(cols, splits)):
        if code == SOLVED:
            results[attempt] += 1
        else:
            _play_bucket(ctx, pool, bucket, attempt + 1, results)


def _play_bucket(ctx, pool, cols, attempt, results):
    if attempt >= MAX_GUESSES:
        results[MAX_GUESSES] += len(cols)
    elif len(cols) <= 2:
        results[attempt] += 1
        if len(cols) == 2:
            results[min(attempt + 1, MAX_GUESSES)] += 1
    else:
        last_turn = attempt == MAX_GUESSES - 1
        key = (tuple(cols.tolist()), last_turn)
        if key not in ctx.memo:
            options = ctx.ids(cols) if last_turn else _merge(ctx.ids(cols), pool)
            ctx.memo[key] = _rank(ctx, options, cols)[0]
        _play_out(ctx, pool, ctx.memo[key], cols, attempt, results)


def _score(results):
    solved = results[:MAX_GUESSES]
    average = (solved * np.arange(1, MAX_GUESSES + 1)).sum() / max(solved.sum(), 1)
    return results[MAX_GUESSES] / results.sum(), average


def _best_guess(ctx, cols, attempt):
    words = [ctx.words[c] for c in cols]
    if len(cols) <= 2:
        return _letter_ranking(ctx.ids(cols), words)[0][0]
    if len(cols) > LARGE_LIST:
        ranked = _letter_ranking(np.arange(len(guesses)), words)[0]
        return _rank(ctx, ranked[:TEMP_LIST_SIZE], cols)[0]

    pool = _guess_pool(ctx, cols)
    options = ctx.ids(cols) if attempt == MAX_GUESSES - 1 else pool
    start = time.perf_counter()
    best, best_key, can_finish = None, None, False
    for i, guess_id in enumerate(_rank(ctx, options, cols)):
        results = np.zeros(MAX_GUESSES + 1, dtype=np.int64)
        _play_out(ctx, pool, guess_id, cols, attempt, results)
        key = _score(results)
        if best_key is None or key < best_key:
            best, best_key = guess_id, key
        can_finish |= key[0] == 0
        if i + 1 >= CHECK_SIZE and (can_finish or time.perf_counter() - start > MAX_TIME):
            break
    return best


def _remaining(words, history):
    keep = np.ones(len(words), dtype=bool)
    for g, f in history:
        if words is answers and g in guess_index:
            row = PATTERNS[guess_index[g]]
        else:
            row = _patterns(_letters([g]), _letters(words))[0]
        keep &= row == encode_feedback(f)
    return [w for w, k in zip(words, keep) if k]


_cache = OrderedDict()


def get_next_guess(guesses_made, feedbacks):
    if not guesses_made:
        return OPENER

    history = tuple((g.lower(), f.lower()) for g, f in zip(guesses_made, feedbacks))
    if history not in _cache:
        likely = _remaining(answers, history)
        words = likely or _remaining(guesses, history)
        if not words:
            return None
        ctx = _Context(words, likely=bool(likely))
        _cache[history] = guesses[_best_guess(ctx, np.arange(len(words)), len(history))]
        if len(_cache) > CACHE_SIZE:
            _cache.popitem(last=False)
    _cache.move_to_end(history)
    return _cache[history]
