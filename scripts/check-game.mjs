import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conflicts,solved,restoreColours} from '../src/game/rules.ts';
const puzzles=JSON.parse(readFileSync(new URL('../data/sai-puzzles.json',import.meta.url)));
for(const p of puzzles){
  const colours=Array(p.regions.length).fill(-1);
  function solve(i){if(i===colours.length)return true;for(let c=0;c<4;c++){colours[i]=c;if(!conflicts(p,colours).length&&solve(i+1))return true;}colours[i]=-1;return false;}
  assert.ok(solve(0),p.id);assert.ok(solved(p,colours));
  const [a,b]=p.borders[0].regions;colours[b]=colours[a];assert.ok(!solved(p,colours));
  assert.deepEqual(restoreColours(['bad'],p.regions.length),Array(p.regions.length).fill(-1));
}
assert.equal(conflicts(puzzles[2],[0,1,0,1]).length,0,'Corner contact is not an edge conflict');
console.log('Verified nine solvable maps, conflicts, corner-only contacts and corrupt-save recovery.');
// The ninth puzzle must require four colours, not merely allow them.
const ninth=puzzles[8];
assert.equal(puzzles.length,9);
function canColour(k){
  const colours=Array(ninth.regions.length).fill(-1);
  function visit(i){if(i===colours.length)return true;for(let c=0;c<k;c++){colours[i]=c;if(!conflicts(ninth,colours).length&&visit(i+1))return true;}colours[i]=-1;return false;}
  return visit(0);
}
assert.equal(canColour(3),false,'Puzzle 9 must not admit a three-colour solution');
assert.equal(canColour(4),true,'Puzzle 9 must admit a four-colour solution');
console.log('Puzzle 9 proven four-chromatic by exhaustive search.');

// The Spear and Shield's court: every testimony must be winnable and fully bilingual.
const {cases} = await import('../src/game/court/cases.ts');
function bilingual(value, path) {
  if (value && typeof value === 'object' && 'en' in value && 'zh' in value) {
    assert.ok(value.en.trim() && value.zh.trim(), `${path} needs English and Chinese text`);
    return;
  }
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) bilingual(v, `${path}.${k}`);
}
for (const c of cases) {
  bilingual(c, c.id);
  const evidence = new Set(c.evidence.map(e => e.id));
  assert.equal(evidence.size, c.evidence.length, `${c.id}: duplicate evidence ids`);
  for (const [ti, t] of c.testimonies.entries()) {
    const where = `${c.id} testimony ${ti + 1}`;
    const ids = t.statements.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length, `${where}: duplicate statement ids`);
    const contradictions = t.statements.filter(s => s.contradicts);
    assert.equal(contradictions.length, 1, `${where}: needs exactly one contradiction`);
    assert.ok(evidence.has(contradictions[0].contradicts), `${where}: contradiction points at missing evidence`);
    for (const s of t.statements) {
      assert.ok(s.press.length, `${where}: ${s.id} has nothing to say when pressed`);
      if (s.reveals) assert.ok(t.statements.find(x => x.id === s.reveals)?.hidden, `${where}: ${s.id} reveals a statement that is not hidden`);
      if (s.hidden) assert.ok(t.statements.some(x => x.reveals === s.id && !x.hidden), `${where}: hidden ${s.id} can never be revealed`);
    }
    assert.ok(t.wrong.length && t.breakthrough.length, `${where}: needs wrong-answer retorts and a breakthrough`);
  }
}
console.log(`Verified ${cases.length} court cases: one reachable contradiction per testimony, fully bilingual.`);

// Keep it flat: the law always wins if nobody plays, and the simulation stays finite.
const flat = await import('../src/game/flat/sim.ts');
for (const seed of [11, 222, 3333]) {
  const s = flat.create(seed);
  while (!s.over && s.t < 60) flat.step(s, 1 / 120);
  assert.ok(s.over, `seed ${seed}: an untended commune must fall within a minute`);
  assert.ok(s.members.every(m => Number.isFinite(m.x) && Number.isFinite(m.y)), `seed ${seed}: positions must stay finite`);
  if (s.over.reason === 'committee') assert.equal(new Set(s.over.names).size, 3, `seed ${seed}: a committee has three different members`);
}
const tended = flat.create(5);
while (!tended.over && tended.t < 600) {
  flat.step(tended, 1 / 120);
  if (Math.round(tended.t * 120) % 40 === 0) for (const m of flat.onDais(tended)) flat.nudge(tended, m);
}
assert.ok(flat.year(tended) > 4, 'Nudging members off the dais must buy the commune time');
console.log('Verified that Keep it flat always ends without a player, and that playing buys time.');
