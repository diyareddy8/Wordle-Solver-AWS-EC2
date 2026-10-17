import { useGame, WORD_LENGTH } from '../context/GameContext';

function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function StatusPanel() {
  const game = useGame();
  const { guesses, currentInput, suggestedGuess, isLoading } = game;
  const lastGuess = guesses[guesses.length - 1];

  if (game.isWon) {
    return (
      <div className="panel panel--success">
        <div>
          <p className="panel-title">
            Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}
          </p>
          <p className="panel-text">
            The word was <strong>{lastGuess.toUpperCase()}</strong>.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={game.resetGame}>
          Play again
        </button>
      </div>
    );
  }

  if (game.isOutOfGuesses) {
    return (
      <div className="panel">
        <div>
          <p className="panel-title">All six guesses used</p>
          <p className="panel-text">Mark the last row green if you solved it, or start over.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={game.resetGame}>
          Start over
        </button>
      </div>
    );
  }

  if (suggestedGuess !== null) {
    return (
      <div className="panel panel--suggestion">
        <div>
          <p className="panel-eyebrow">Suggested next guess</p>
          <div className="mini-tiles" aria-label={suggestedGuess.toUpperCase()}>
            {[...suggestedGuess].map((letter, i) => (
              <span key={i} className="mini-tile">
                {letter}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={game.applySuggestion}>
          Use word
          <span className="btn-hint desktop-only">
            <Kbd>Enter</Kbd>
          </span>
        </button>
      </div>
    );
  }

  if (currentInput.length > 0) {
    return (
      <div className="panel panel--hint">
        <p className="panel-text">
          {currentInput.length === WORD_LENGTH ? (
            <>
              Press <Kbd>Enter</Kbd> to add <strong>{currentInput.toUpperCase()}</strong> to the board.
            </>
          ) : (
            <>Type the {WORD_LENGTH}-letter word you played in Wordle.</>
          )}
        </p>
      </div>
    );
  }

  const isOpener = guesses.length === 0;

  return (
    <div className="panel">
      <div className="panel-body">
        {isOpener ? (
          <p className="panel-text">Type the word you played in Wordle, or let the solver pick an opener.</p>
        ) : (
          <>
            <p className="panel-text">Tap the tiles to match Wordle's colors:</p>
            <ul className="legend">
              <li>
                <span className="legend-swatch" data-state="b" /> Not in word
              </li>
              <li>
                <span className="legend-swatch" data-state="y" /> Wrong spot
              </li>
              <li>
                <span className="legend-swatch" data-state="g" /> Correct
              </li>
            </ul>
          </>
        )}
      </div>
      <button
        type="button"
        className={`btn ${isOpener ? 'btn-secondary' : 'btn-primary'}`}
        disabled={!game.canRequestSuggestion}
        onClick={game.getSuggestion}
      >
        {isLoading ? (
          <span className="spinner spinner--small" aria-label="Loading" />
        ) : (
          <>
            {isOpener ? 'Suggest opener' : 'Get next guess'}
            <span className="btn-hint desktop-only">
              <Kbd>Enter</Kbd>
            </span>
          </>
        )}
      </button>
    </div>
  );
}
