# Ideas

Ideas worth keeping that are not built yet, or that were replaced. Add to this file instead of deleting an idea; note where any code for it lives.

## Timeline presentations

Three ways to show the timeline that go further than a list of eras. Each one tries to show what changed, not only when it happened.

### 1. The world, rewound (built in #12)

One living scene in place of a stack of floors. Laws hang in the sky as a constellation, Llama and Origo sit on either side of the Limitrest Range, and a time slider moves the whole world through history in place.

- The Great Hunt: armies pour over the range, unicorns fade, trolls turn to stone, phoenixes flicker back smaller and kitsune slip into mortal crowds. The lost power soaks into the world and rises again as totems.
- The Feud: surgery on the sky. Sets drops in above Number, Ilar's paradox cracks it, it sits hollow at 0–0 for generations, and Ensa lights it again.
- Strength: cause and effect become motion you can scrub backwards and forwards.
- Risk: the most work. The landmasses must stay rough shapes so they do not commit the world to a map that has not been drawn yet.

### 2. The unfinished proof

History written as the proof Quoderat is named for. Each era is a numbered line with its reason, and clicking a line lights up the earlier lines it depends on: totems ⟸ the Hunt ("the power soaks into the world") ⟸ the first gods ⟸ the Axiom. The last line, the Present, ends in an empty Q.E.D. box that never fills, because the Law of All Laws is still vacant.

- Strength: the cleanest and cheapest of the three, and true to the world's name.
- Risk: the homepage already uses the proof look, so it could feel like a rerun.
- Could still be combined with idea 1 as click-to-see-causes inside the rewound world.

### 3. The tapestry

A long embroidered cloth you scroll sideways, like the Bayeux Tapestry. Each era is a stitched scene captioned in both languages. As you scroll, a needle stitches the next scene in front of you; at the far end the cloth stops mid-row, with loose threads and the needle still going.

- Strength: the most charming.
- Risk: the most drawing. Dragons in running stitch are forgiving; armies less so.

### Retired: the Tower of History

The first animated timeline (#10) drew history the way the timeline doc describes it: an upside-down tower climbed from Creation to the Present, with era colours, motes and a lift that rode to the top. The rewound world replaced it in #12. The code is in commits 97d1863 and 796b8ac.

### Open question: the doc's own framing

The timeline doc still opens with "How to Read the Tower" and calls each section a floor, and it stays that way for now. If the doc drops the tower, the floors need a new name (eras, lines, panels), and these follow it: `scripts/import-lore.py` (which also sets the article title "The Tower of History"), the Floor checks in `scripts/check-localization.mjs`, the heading parser in `src/timeline/WorldRewound.tsx`, and the zh title test in `backend/wiki/tests.py`.

## Games

### Vera's dig (shelved)

Vera, the Witness Beneath, holds the Law of Superposition. The game had you read cliffs, date a grave, find the tunnels, then search earth-tribe ground for something hidden that is never named. It was not fun enough yet. The full version is kept on the branch `claude/shelved-vera-dig` (b3aac07) for when it has a better design.
