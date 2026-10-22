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
