import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { checkHealth, fetchNextGuess } from '../services/wordleApi';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

interface GameContextValue {
  guesses: string[];
  feedbacks: string[];
  currentInput: string;
  isLoading: boolean;
  suggestedGuess: string | null;
  error: string | null;
  toast: string | null;
  isBackendConnected: boolean;
  isWon: boolean;
  isOutOfGuesses: boolean;
  isShaking: boolean;
  canRequestSuggestion: boolean;
  isKeyboardLocked: boolean;
  typeLetter: (letter: string) => void;
  backspace: () => void;
  submit: () => void;
  updateFeedback: (wordIndex: number, charIndex: number) => void;
  getSuggestion: () => Promise<void>;
  applySuggestion: () => void;
  resetGame: () => void;
  retryConnection: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

const NEXT_FEEDBACK: Record<string, string> = { b: 'y', y: 'g', g: 'b' };

export function GameProvider({ children }: { children: ReactNode }) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [feedbacks, setFeedbacks] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedGuess, setSuggestedGuess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const shakeTimer = useRef<number | undefined>(undefined);

  const isWon = feedbacks.length > 0 && feedbacks[feedbacks.length - 1] === 'ggggg';
  const isOutOfGuesses = guesses.length >= MAX_GUESSES && !isWon;
  const isKeyboardLocked = isLoading || guesses.length >= MAX_GUESSES || isWon;
  const canRequestSuggestion =
    !isLoading && !isWon && guesses.length < MAX_GUESSES && currentInput === '' && suggestedGuess === null;

  const retryConnection = async () => {
    setIsLoading(true);
    setIsBackendConnected(await checkHealth());
    setIsLoading(false);
  };

  useEffect(() => {
    retryConnection();
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(shakeTimer.current);
    },
    [],
  );

  const flash = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1400);

    if (isShaking) return;
    setIsShaking(true);
    shakeTimer.current = window.setTimeout(() => setIsShaking(false), 450);
  };

  const typeLetter = (letter: string) => {
    if (isKeyboardLocked) return;
    if (currentInput.length < WORD_LENGTH) {
      setCurrentInput(currentInput + letter.toLowerCase());
    }
  };

  const backspace = () => {
    if (isKeyboardLocked) return;
    setCurrentInput(currentInput.slice(0, -1));
  };

  const commitGuess = () => {
    setGuesses([...guesses, currentInput]);
    setFeedbacks([...feedbacks, 'bbbbb']);
    setCurrentInput('');
    setSuggestedGuess(null);
  };

  const applySuggestion = () => {
    if (suggestedGuess !== null && !isKeyboardLocked) {
      setCurrentInput(suggestedGuess);
    }
  };

  const getSuggestion = async () => {
    if (!canRequestSuggestion) return;
    setIsLoading(true);
    setError(null);
    try {
      setSuggestedGuess(await fetchNextGuess(guesses, feedbacks));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  // Enter walks the whole flow: commit a typed word, load a ready suggestion, or ask for one.
  const submit = () => {
    if (isKeyboardLocked) return;
    if (currentInput.length === WORD_LENGTH) {
      commitGuess();
    } else if (currentInput.length > 0) {
      flash('Not enough letters');
    } else if (suggestedGuess !== null) {
      applySuggestion();
    } else {
      getSuggestion();
    }
  };

  const updateFeedback = (wordIndex: number, charIndex: number) => {
    if (isLoading || wordIndex !== guesses.length - 1) return;
    const chars = feedbacks[wordIndex].split('');
    chars[charIndex] = NEXT_FEEDBACK[chars[charIndex]] ?? 'b';
    const next = [...feedbacks];
    next[wordIndex] = chars.join('');
    setFeedbacks(next);
    // A suggestion computed from the old colors is no longer valid.
    setSuggestedGuess(null);
  };

  const resetGame = () => {
    setGuesses([]);
    setFeedbacks([]);
    setCurrentInput('');
    setSuggestedGuess(null);
    setError(null);
  };

  const value: GameContextValue = {
    guesses,
    feedbacks,
    currentInput,
    isLoading,
    suggestedGuess,
    error,
    toast,
    isBackendConnected,
    isWon,
    isOutOfGuesses,
    isShaking,
    canRequestSuggestion,
    isKeyboardLocked,
    typeLetter,
    backspace,
    submit,
    updateFeedback,
    getSuggestion,
    applySuggestion,
    resetGame,
    retryConnection,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
