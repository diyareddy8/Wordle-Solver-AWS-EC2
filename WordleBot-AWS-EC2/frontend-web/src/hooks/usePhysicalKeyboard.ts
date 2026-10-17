import { useEffect, useEffectEvent } from 'react';
import { useGame } from '../context/GameContext';

export function usePhysicalKeyboard() {
  const game = useGame();

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Enter') {
      // Stop a focused button from also receiving the Enter as a click.
      e.preventDefault();
      if (!e.repeat) game.submit();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      game.backspace();
    } else if (/^[a-z]$/i.test(e.key)) {
      game.typeLetter(e.key);
    } else if (/^[1-5]$/.test(e.key) && game.guesses.length > 0) {
      game.updateFeedback(game.guesses.length - 1, Number(e.key) - 1);
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
