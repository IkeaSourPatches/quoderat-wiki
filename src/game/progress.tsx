import { useEffect, useState } from 'react';
import type { Language } from '../i18n';
import './games.css';

// Every key a game keeps in this browser. Language and bookmarks are not game progress.
export const gameKeys = {
  sai: 'quoderat-sai-v1',
  flat: 'quoderat-flat-ledger',
  court: 'quoderat-court-solved',
  axiom: 'quoderat-axiom-attempts',
} as const;
export type GameId = keyof typeof gameKeys;

export function resetGame(id: GameId) {
  try {
    localStorage.removeItem(gameKeys[id]);
  } catch {
    /* per-viewer convenience only */
  }
}
export function resetAllGames() {
  (Object.keys(gameKeys) as GameId[]).forEach(resetGame);
}

// A reset that asks once inline, so a stray click never erases anything.
// Without `game` it clears every game; `onReset` lets a mounted game drop its in-memory state.
export function ResetProgress({
  language,
  game,
  onReset,
  className = 'games-link',
}: {
  language: Language;
  game?: GameId;
  onReset?: () => void;
  className?: string;
}) {
  const text = (en: string, zh: string) => (language === 'zh' ? zh : en);
  const [state, setState] = useState<'idle' | 'armed' | 'done'>('idle');
  useEffect(() => {
    if (state !== 'done') return;
    const id = setTimeout(() => setState('idle'), 2600);
    return () => clearTimeout(id);
  }, [state]);
  const erase = () => {
    if (game) resetGame(game);
    else resetAllGames();
    onReset?.();
    setState('done');
  };

  if (state === 'armed')
    return (
      <span className="games-reset" role="group">
        <span>
          {game
            ? text('Erase your progress in this game?', '清除本游戏的进度？')
            : text('Erase your progress in every game?', '清除所有游戏的进度？')}
        </span>
        <button className={className} onClick={erase} autoFocus>
          {text('Erase', '清除')}
        </button>
        <button className={className} onClick={() => setState('idle')}>
          {text('Cancel', '取消')}
        </button>
      </span>
    );
  if (state === 'done')
    return (
      <span className="games-reset" role="status">
        {game
          ? text('Progress cleared.', '进度已清除。')
          : text('Progress cleared in every game.', '所有游戏的进度已清除。')}
      </span>
    );
  return (
    <button className={className} onClick={() => setState('armed')}>
      {game ? text('Reset progress', '重置进度') : text('Reset all games', '重置所有游戏')}
    </button>
  );
}
