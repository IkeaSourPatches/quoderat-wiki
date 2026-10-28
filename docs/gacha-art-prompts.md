# Gacha art: prompts for the SVGs

The summon reveal works without any artwork: every slot below has a fallback drawn in code (the glyphs from `src/emblems.ts`, the family glyphs in `src/gacha/pool.ts`, a brass compass and a Euclid I.1 card back). Each SVG you add replaces one fallback. No code changes are needed: save the file under `src/gacha/art/` with the exact name given, then rebuild or restart `npm run dev`. Missing files are fine.

| Slot | File | Used for | Colour |
|---|---|---|---|
| Compass head | `art/compass/head.svg` | The hinge and handle of the compass that draws the construction | Full colour |
| Compass legs | `art/compass/leg-needle.svg`, `art/compass/leg-pencil.svg` | Its two legs, rotated and placed in code | Full colour |
| Card back | `art/card-back.svg` | Face-down cards before they turn over | Full colour |
| Law sigils | `art/holders/<slug>.svg` (16) | Reward cards, the reveal splash, the results list and the collection | One colour, tinted in code |
| Totem emblems | `art/totems/<family>.svg` (8) | The same places, for totems | One colour, tinted in code |

**How to use these prompts.** Start a new ChatGPT conversation, paste the shared brief first, then paste one asset prompt at a time. Ask for one file per reply; long batches tend to drift in style. Copy the SVG from the reply into the named file.

**Before you save a file, check that:**
- it starts with `<svg` and has exactly the `viewBox` asked for;
- it contains no `<text>`, `<script>`, `<foreignObject>`, `<image>`, `<style>`, `<animate>` or `<filter>`, and no links to other files;
- one-colour files use only `#000000` (opacity is allowed): the page uses the shape as a mask and fills it with the reward's colour, so any other colour is ignored;
- it looks right when you open it in a browser tab, at full size and when zoomed out to about 28 pixels.

---

## 1. Shared brief (paste first)

```text
You are drawing SVG artwork for Quoderat, an original fantasy world. Its gods are mortals who each hold one unique natural law from mathematics, logic, physics or social science (Non-Contradiction, Sets, Entropy, Goodhart's Law and so on). The world is named after Q.E.D., the mark at the end of a proof. Mythical creatures (dragons, unicorns, phoenixes, kitsune, trolls) were hunted, and the world condensed their power back out as totems that mortals carry.

Visual language: an engraved scientific instrument meets a page of Euclid. Clean geometric construction lines, circles, arcs and straightedge strokes; precise, symmetric, calm; the feel of a brass instrument or an engraved seal. No cartoon style, no gradients of rainbow colour, no faces, no human or creature portraits, and no letters, words or numbers anywhere.

Output rules for every file:
- Reply with one complete SVG file in a single code block and nothing else.
- Use exactly the viewBox I give. Do not set width or height attributes.
- Use only <svg>, <g>, <path>, <circle>, <ellipse>, <rect>, <line>, <polyline>, <polygon>, <defs>, <linearGradient>, <radialGradient> and <stop>.
- No <text>, <script>, <style>, <foreignObject>, <image>, <filter>, <mask>, <clipPath>, <animate> or external references.
- Transparent background: never fill the whole canvas.
- Keep the file under 12 KB; prefer a few clean paths over many tiny ones.
```

## 2. Compass (three files)

The canvas rotates and positions these parts itself, so the anchor points must be exact.

```text
Draw part 1 of 3 of a drafting compass, the brass instrument used for Euclid's ruler-and-compass constructions. This file is the HEAD: the hinge disc and the knurled handle above it.

- viewBox="0 0 120 160".
- The hinge pivot (the centre of the hinge screw) must be exactly at (60, 112).
- Hinge disc: a circle of radius about 22 around the pivot, polished brass with a darker rim, and a small slotted screw head at the pivot.
- Handle: a slim knurled cylinder rising straight up from the disc, centred on x = 60, from about y = 90 up to about y = 10, about 16 wide, with fine engraved knurling rings and a rounded cap at the top.
- Leave everything below y = 136 empty: the legs are separate files that attach under the disc.
- Colours: brass #c9b482 with highlights #fff2c9 and shadows #5e4720, using linear or radial gradients; a dark outline #3a2c12 at about 1.2 units.
- Upright, front view, symmetric left to right.
```

```text
Draw part 2 of 3 of the same brass drafting compass. This file is the NEEDLE LEG.

- viewBox="0 0 40 400".
- The leg runs straight down the middle: its top end (where it meets the hinge) is centred at (20, 0) and its point is exactly at (20, 400).
- From y = 0 to about y = 360: a tapered brass bar, about 12 wide at the top narrowing to about 4, with a highlight along its left edge and shadow along its right edge (linear gradient across the width: #fff2c9, #d8b469, #8c6b32, #4a3817), and one small engraved ring near the top.
- From about y = 360 to y = 400: a thin steel needle, colour #d6dcde with a darker edge, ending in a sharp point at (20, 400).
- Nothing outside x = 4 to 36.
```

```text
Draw part 3 of 3 of the same brass drafting compass. This file is the PENCIL LEG.

- viewBox="0 0 40 400".
- Same tapered brass bar as the needle leg, top end centred at (20, 0), running straight down the middle.
- From about y = 340 to y = 385: a dark lead holder (colour #2a2722) clamped to the leg with a small brass collar.
- From y = 385 to y = 400: a short graphite lead (#9a958a) whose sharpened tip is exactly at (20, 400).
- Nothing outside x = 4 to 36.
```

## 3. Card back

```text
Draw the back of a collectible card for Quoderat.

- viewBox="0 0 200 280". Fill the whole card area (this file is the one exception to the transparent-background rule) with a deep green slate gradient from #173327 at the top left to #0b1813 at the bottom right.
- Leave the outer 10 units free of strokes; the page draws its own frame on top.
- Centre: Euclid's first construction in thin brass lines (#c9b482, about 1.2 units): a short horizontal segment, two circles drawn around its two ends with the segment as radius, and the equilateral triangle that rises from where the circles meet. Centre this figure at (100, 140) and keep it between y = 100 and y = 180: on phones the card is shown as a wide strip that crops away the top and bottom.
- Around it, a fine ring of tick marks like a protractor, very faint (brass at about 25% opacity).
- Below the figure, a small filled square (the Q.E.D. tombstone ∎) in brass at about (100, 214), about 10 units wide.
- Subtle, not busy: this is the card's back, not its face.
```

## 4. Law sigils (sixteen files)

One-colour emblems, one per law holder. The page tints them: gold for 5★, violet for 4★, blue for 3★.

Paste this once:

```text
Next I will ask for a series of sigils, one per law holder. Each is an emblem of the holder's LAW, never a picture of the person: no faces, figures or portraits.

Rules for every sigil:
- viewBox="0 0 256 256".
- Use only black (#000000). Vary opacity (0.35 to 1) for secondary detail; never use another colour.
- Transparent background. Keep everything inside a circle of radius 112 centred at (128, 128).
- Line weights in viewBox units: main strokes 10, secondary strokes 5, fine detail 2.5; round line caps and joins. Filled shapes are allowed.
- It must read clearly when shrunk to 28 pixels: one strong central idea, symmetric or balanced, with fine detail only as a bonus.
- No letters, words or numbers. A mathematical symbol may appear only where I name it, drawn as geometry.
- Same family look across all sixteen: engraved seal, geometric, calm.
```

Then one at a time, replacing the bracketed line with the entry from the list below:

```text
Sigil: [paste one entry from the list]
Save name: [slug].svg
```

| Save as | Holder | Law and idea for the sigil |
|---|---|---|
| `the-spear-and-shield.svg` | The Spear and Shield (5★) | The Law of Non-Contradiction: nothing is both true and false at the same time and in the same sense. His title comes from the old story of a spear that pierces everything and a shield that nothing pierces. A spear point meeting the centre of a round shield at a single point, frozen at the moment of contact, neither piercing nor breaking; the logical "not" sign ¬ worked into the shield's boss. |
| `tertia.svg` | Tertia (5★) | The Law of Excluded Middle, *tertium non datur*, "no third option is given": every statement is true or false. A two-pronged fork or crown with exactly two tines; between them an empty slot where a third tine would be, marked only by a faint dashed outline. The "or" sign ∨ may shape the fork. |
| `the-open-question.svg` | The Open Question (5★) | Incompleteness (Gödel, 1931): any system rich enough for arithmetic has truths it cannot prove; around her, nothing ever fully closes. A ring built from a chain of linked segments that almost closes but leaves one small, deliberate gap at the top; the ring's loose end curls inward into the hook of a question mark. |
| `ilar-hesabu.svg` | Ilar Hesabu, the Uncounted (5★) | Number: he nudges quantities into exact, equal shares while the total stays the same. Counting stones settling into equal groups under a level beam, nothing extra and nothing missing; the double-struck ℕ may be suggested in the beam's supports. |
| `ensa.svg` | Ensa, the Restorer (5★) | Sets, with her fix that forbids a set of everything: around her, belonging becomes definite. Overlapping circles with crisp boundaries and one small point clearly inside exactly one region; an outer boundary deliberately left open because no set may contain everything. The membership sign ∈ may be traced by the circles. |
| `voss-halloran.svg` | Voss Halloran, the Ledger-Keeper (4★) | Conservation of Energy: nothing is created or destroyed, only moved, and he audits where it goes ("The Closed Book"). A closed ledger seen from the front with a loop arrow on its cover that returns exactly to its start; a balanced scale may sit behind it. |
| `rudolf-ludwig.svg` | Rudolf Ludwig, the Chancellor of Thermal Decay (4★) | Entropy: order spreads into disorder. An hourglass whose upper bulb holds an ordered lattice of dots and whose lower bulb holds the same dots scattered at random. |
| `rushd.svg` | Rushd, the Uncertain Cause (4★) | Causality: he cannot reverse cause and effect, but chooses which permitted effect a cause produces, never faster than light. One node with a single incoming arrow and several possible outgoing arrows fanning out inside a cone; one outgoing arrow solid, the others faint. |
| `lian-xiu.svg` | Lian Xiu, the Equilibrium Sovereign (4★) | Supply and Demand: markets drift toward balance. Two curves, one rising and one falling, crossing at a single bright equilibrium point; the double harpoon ⇌ may echo the curves. |
| `akhil.svg` | Akhil, the Unfinished Answer (4★) | The Halting Problem (Turing, 1936): no one can know whether a process will ever end until it does. A path that loops back on itself in a spiral whose end cannot be seen, with three dots trailing off from it. |
| `aldous-vane.svg` | Aldous Vane, the Iron Clerk (3★) | The Iron Law of Oligarchy: every organisation ends up run by a few; he lets the floor tilt. A tilted flat disc of many small equal dots sliding toward a few larger dots at its centre. |
| `mattias-krane.svg` | Mattias Krane, the Moving Target (3★) | Goodhart's Law: when a measure becomes a target, it stops being a good measure. A bullseye target that has slid to one side, with an arrow stuck in the empty spot where its centre used to be; faint motion lines. |
| `zaid.svg` | Zaid, the Patient Gardener (3★) | Mendel's Laws: traits pass to children in predictable ratios. A two-by-two Punnett square with a pea tendril growing out of it, and four peas below in a three-to-one ratio (three round, one wrinkled). |
| `vera.svg` | Vera, the Witness Beneath (3★) | The Law of Superposition (Steno): in undisturbed layers, lower layers are older. A block of wavy rock strata stacked in layers, with a narrow vertical shaft cut down through them. |
| `kalyan.svg` | Kalyan, the Quiet Heir (3★) | The Pigeonhole Principle: put n + 1 things in n boxes and one box holds two. A three-by-three grid of boxes, each holding one small dot, except one box that holds two. |
| `sai.svg` | Sai, the Border-Baiter (3★) | The Four Colour Theorem: any flat map needs only four colours so that no neighbours match. A small map of irregular regions filled with four different patterns (solid, dots, diagonal hatching, crosshatch) so that no two touching regions share one. |

## 5. Totem emblems (eight files)

One-colour emblems, one per totem family. The page tints each with its family colour.

```text
Next, eight totem emblems for Quoderat. A totem is a fragment of a slain creature's power that the world condensed back out and gave to mortals. Each emblem combines a sign of the creature with its power, as an engraved seal: never a full creature portrait, and no faces.

Rules for every emblem:
- viewBox="0 0 256 256".
- Only black (#000000), opacity 0.35 to 1 allowed for secondary detail.
- Transparent background; everything inside a circle of radius 112 centred at (128, 128).
- Line weights: main 10, secondary 5, fine 2.5; round caps and joins; filled shapes allowed.
- Must read at 28 pixels. No letters, words or numbers.
- The eight must look like one set.
```

Then one at a time:

```text
Totem emblem: [paste one entry from the list]
Save name: [family].svg
```

| Save as | Family | Idea for the emblem |
|---|---|---|
| `earth.svg` | Earth, from the dragons | Solids, from soil to metal. A single dragon scale whose surface is layered like stone and ore, with a small upward triangle cut into it. |
| `water.svg` | Water, from the dragons | Liquids, with ice and steam included. A dragon scale filled with three flowing wave lines, a few ice crystals at one edge and a curl of steam at the other. |
| `air.svg` | Air, from the dragons | Gases and everything in the atmosphere. A dragon scale made of open swirling air currents that leave its outline partly dotted. |
| `plasma.svg` | Plasma, from the dragons | Fire and lightning. A dragon scale split by a lightning bolt, with a flame rising from the split. |
| `life.svg` | Life and healing, from the unicorns | Every life totem is a piece of their dead. A spiralled unicorn horn upright through a small healing cross, with two leaves at its base. |
| `renewal.svg` | Renewal, from the phoenixes | Released each time a phoenix was killed; phoenixes always come back. A single phoenix feather curling round into a closed circle, its tip touching its own base. |
| `illusion.svg` | Illusion and concealment, from the kitsune | Includes the cloak that hides you from law holders. A fox's tail sweeping round a crescent moon, half of the design drawn solid and half fading out as if veiled. |
| `body.svg` | The body, from the trolls | Rarer: most troll power is locked in stone, since sunlight petrifies trolls. A clenched stone fist with cracks running through it and a thin line of light showing in the deepest crack. |
