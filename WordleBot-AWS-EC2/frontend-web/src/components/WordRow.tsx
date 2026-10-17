import { useGame, WORD_LENGTH } from '../context/GameContext';
import { WordTile } from './WordTile';
import type { TileState } from './WordTile';

interface WordRowProps {
  word: string;
  feedback?: string;
  rowIndex?: number;
  editable?: boolean;
  shaking?: boolean;
}

export function WordRow({ word, feedback, rowIndex = -1, editable = false, shaking = false }: WordRowProps) {
  const { updateFeedback } = useGame();

  const tiles = Array.from({ length: WORD_LENGTH }, (_, i) => {
    const letter = word[i] ?? '';
    const state: TileState = feedback ? (feedback[i] as TileState) : letter ? 'filled' : 'empty';

    return (
      <WordTile
        key={i}
        letter={letter}
        state={state}
        position={i}
        onClick={editable ? () => updateFeedback(rowIndex, i) : undefined}
      />
    );
  });

  return <div className={`word-row${shaking ? ' word-row--shake' : ''}`}>{tiles}</div>;
}
