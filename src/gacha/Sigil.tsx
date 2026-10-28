import type { CSSProperties } from 'react';

/**
 * A character's or totem's emblem. With SVG art it is drawn as a mask filled with the current
 * text colour, so one file works in every rarity colour; without art it falls back to the glyph.
 */
export function Sigil({ art, glyph, className = '' }: { art?: string; glyph: string; className?: string }) {
  if (!art)
    return (
      <span className={`gc-sigil ${className}`} aria-hidden="true">
        {glyph}
      </span>
    );
  return (
    <span
      className={`gc-sigil gc-sigil-art ${className}`}
      aria-hidden="true"
      style={{ '--art': `url(${JSON.stringify(art)})` } as CSSProperties}
    />
  );
}
