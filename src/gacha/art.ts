// Optional SVG artwork for the gacha. Save files into src/gacha/art/ under the names listed in
// docs/gacha-art-prompts.md and they are picked up at build time. Every slot has a fallback drawn
// in code, so any file can be missing.
import type { CompassArt } from './revealCanvas';

const files = import.meta.glob<string>('./art/**/*.svg', { eager: true, query: '?url', import: 'default' });

export const artUrl = (name: string): string | undefined => files[`./art/${name}.svg`];
/** A law holder's sigil, one-colour line art tinted by the page. */
export const holderArt = (slug: string) => artUrl(`holders/${slug}`);
/** A totem family's emblem, one-colour line art tinted with the family colour. */
export const totemArt = (family: string) => artUrl(`totems/${family}`);
/** Full-colour back of a face-down card. */
export const cardBackArt = () => artUrl('card-back');

let compass: CompassArt | undefined;
/** Compass parts as images for the canvas; only the parts that exist are loaded. */
export function compassArt(): CompassArt {
  if (compass) return compass;
  const load = (name: string) => {
    const url = artUrl(`compass/${name}`);
    if (!url) return undefined;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    return img;
  };
  compass = { head: load('head'), needle: load('leg-needle'), pencil: load('leg-pencil') };
  return compass;
}
