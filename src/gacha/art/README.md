# Gacha art

Optional SVGs for the summon reveal and reward cards. `src/gacha/art.ts` picks up any file saved here under these names; anything missing falls back to artwork drawn in code. The prompts that produce each file, and the rules they must follow, are in `docs/gacha-art-prompts.md`.

```
compass/head.svg         120 × 160, hinge pivot at (60, 112), full colour
compass/leg-needle.svg    40 × 400, hinge end at (20, 0), point at (20, 400), full colour
compass/leg-pencil.svg    40 × 400, same anchors, full colour
card-back.svg            200 × 280, full colour
holders/<slug>.svg       256 × 256, black only (tinted by rarity)
totems/<family>.svg      256 × 256, black only (tinted by family colour)
```
