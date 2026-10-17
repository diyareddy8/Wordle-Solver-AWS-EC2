import { ApiConfig } from '../config/apiConfig';
import { MAX_GUESSES, useGame } from '../context/GameContext';
import { usePhysicalKeyboard } from '../hooks/usePhysicalKeyboard';
import { Keyboard } from './Keyboard';
import { StatusPanel } from './StatusPanel';
import { WordRow } from './WordRow';

function Header() {
  const { resetGame, isBackendConnected } = useGame();

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <span className="header-side" />
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i data-state="g" />
            <i data-state="y" />
            <i data-state="b" />
            <i data-state="g" />
          </span>
          <h1>Wordle Solver</h1>
        </div>
        <span className="header-side header-side--end">
          {isBackendConnected && (
            <button
              type="button"
              className="icon-btn"
              aria-label="New game"
              title="New game"
              onClick={resetGame}
              onMouseDown={(e) => e.preventDefault()}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </span>
      </div>
    </header>
  );
}

function Board() {
  const { guesses, feedbacks, currentInput, isLoading, isShaking } = useGame();
  const emptyRowCount = Math.max(0, MAX_GUESSES - guesses.length - 1);

  return (
    <div className="board">
      {guesses.map((word, index) => (
        <WordRow
          key={`row-${index}`}
          word={word}
          feedback={feedbacks[index]}
          rowIndex={index}
          editable={index === guesses.length - 1 && !isLoading}
        />
      ))}
      {guesses.length < MAX_GUESSES && <WordRow key="input" word={currentInput} shaking={isShaking} />}
      {Array.from({ length: emptyRowCount }, (_, index) => (
        <WordRow key={`empty-${index}`} word="" />
      ))}
    </div>
  );
}

export function GameScreen() {
  const game = useGame();
  usePhysicalKeyboard();

  if (!game.isBackendConnected) {
    return (
      <div className="app">
        <Header />
        <main className="center-state">
          {game.isLoading ? (
            <>
              <span className="spinner" aria-label="Loading" />
              <p className="center-title">Connecting to the solver…</p>
              <p className="center-text">If the server was asleep, this can take up to a minute.</p>
            </>
          ) : (
            <>
              <span className="center-icon" aria-hidden="true">!</span>
              <p className="center-title">Can't reach the solver</p>
              <p className="center-text">
                Make sure the backend is running at <code>{ApiConfig.baseUrl}</code>.
              </p>
              <button type="button" className="btn btn-primary" onClick={game.retryConnection}>
                Try again
              </button>
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="game">
        {game.toast && (
          <div className="toast" role="status">
            {game.toast}
          </div>
        )}
        <div className="board-area">
          <Board />
        </div>
        <div className="game-footer">
          {game.error && (
            <div className="alert" role="alert">
              {game.error}
            </div>
          )}
          <StatusPanel />
          <p className="shortcuts desktop-only">
            <kbd className="kbd">A–Z</kbd> type · <kbd className="kbd">Enter</kbd> submit ·{' '}
            <kbd className="kbd">⌫</kbd> delete · <kbd className="kbd">1</kbd>–<kbd className="kbd">5</kbd> cycle
            tile colors
          </p>
        </div>
      </main>
      <Keyboard />
    </div>
  );
}
