import { useGame } from '../context/GameContext';

const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['ENTER', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACK'],
];

const STATUS_RANK: Record<string, number> = { b: 1, y: 2, g: 3 };

function getLetterStatuses(guesses: string[], feedbacks: string[]) {
  const statuses: Record<string, string> = {};
  guesses.forEach((word, row) => {
    [...word].forEach((letter, i) => {
      const status = feedbacks[row][i];
      if (STATUS_RANK[status] > (STATUS_RANK[statuses[letter]] ?? 0)) {
        statuses[letter] = status;
      }
    });
  });
  return statuses;
}

function BackspaceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 5H8.5a1 1 0 0 0-.76.35L2.5 12l5.24 6.65a1 1 0 0 0 .76.35H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m17 9.5-5 5m0-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Keyboard() {
  const { guesses, feedbacks, isKeyboardLocked, typeLetter, backspace, submit } = useGame();
  const statuses = getLetterStatuses(guesses, feedbacks);

  const handleKey = (key: string) => {
    if (key === 'ENTER') submit();
    else if (key === 'BACK') backspace();
    else typeLetter(key);
  };

  return (
    <div className={`keyboard${isKeyboardLocked ? ' keyboard--locked' : ''}`} aria-disabled={isKeyboardLocked}>
      {KEY_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={rowIndex}>
          {rowIndex === 1 && <span className="key-spacer" />}
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === 'BACK';
            return (
              <button
                key={key}
                type="button"
                className={`key${isWide ? ' key--wide' : ''}`}
                data-status={statuses[key]}
                onClick={() => handleKey(key)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={key === 'BACK' ? 'Backspace' : key === 'ENTER' ? 'Enter' : key.toUpperCase()}
              >
                {key === 'BACK' ? <BackspaceIcon /> : key}
              </button>
            );
          })}
          {rowIndex === 1 && <span className="key-spacer" />}
        </div>
      ))}
    </div>
  );
}
