export type TileState = 'empty' | 'filled' | 'b' | 'y' | 'g';

const STATE_LABELS: Record<string, string> = {
  b: 'not in the word',
  y: 'in the word, wrong spot',
  g: 'in the correct spot',
};

interface WordTileProps {
  letter: string;
  state: TileState;
  position: number;
  onClick?: () => void;
}

export function WordTile({ letter, state, position, onClick }: WordTileProps) {
  if (state === 'empty' || state === 'filled') {
    return (
      <div className="tile" data-state={state}>
        {letter}
      </div>
    );
  }

  // Colored tiles stay <button>s even when locked so they don't remount and replay the reveal animation.
  return (
    <button
      type="button"
      className={`tile${onClick ? ' tile--editable' : ''}`}
      data-state={state}
      style={{ animationDelay: `${position * 70}ms` }}
      disabled={!onClick}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={`${letter.toUpperCase()}, ${STATE_LABELS[state]}${onClick ? `. Press to change color (key ${position + 1}).` : ''}`}
    >
      {letter}
    </button>
  );
}
