import assert from 'node:assert/strict';
import { pool, collection, save, seeded } from './gacha-modules.mjs';
const { emptyCollection, decodeCollection, addPulls } = collection;
const earth = { family: 'earth', tier: 'common', depth: 20 };
let saved = addPulls(emptyCollection(), [earth, {...earth, depth:25}, {...earth,family:'water'}]);
assert.deepEqual(saved.pools,[{family:'earth',count:2,power:45},{family:'water',count:1,power:20}]);
assert.deepEqual(decodeCollection(JSON.stringify(saved)),saved);
saved = addPulls(saved,Array(60).fill(earth));
assert.equal(saved.pools[0].power,1245);assert.equal(saved.pools[0].count,62);assert.equal(saved.recent.length,50);
const migrated=decodeCollection(JSON.stringify({version:2,total:10,merges:1,recent:[earth],stacks:[{...earth,count:2},{...earth,depth:25,count:3}]}));
assert.deepEqual(migrated.pools,[{family:'earth',count:5,power:115}]);
assert.equal(migrated.total,10);
assert.deepEqual(decodeCollection(JSON.stringify(migrated)),migrated);
const legacy=decodeCollection(JSON.stringify({total:100,recent:Array(50).fill(earth)}));
assert.equal(legacy.pools[0].power,1000);assert.ok(legacy.recovered);
for(const raw of ['{','{}',JSON.stringify({...saved,pools:[{family:'bad',count:1,power:20}]}),JSON.stringify({...saved,pools:[{family:'earth',count:-1,power:20}]})]) assert.throws(()=>decodeCollection(raw));
console.log('Verified type-only pooling, depth addition, separate types, persistence, both save migrations and corrupt saves.');
const { emptyPity, pullMixed, rollOutcome, outcomeTable, fiveStarChance, isRare, CURRENT_BANNER, validateBanner, HOLDERS, BASE_RATES } = pool;
assert.equal(fiveStarChance(54), .006);
assert.ok(Math.abs(fiveStarChance(55)-.016)<1e-12);
assert.ok(Math.abs(fiveStarChance(79)-.256)<1e-12);
assert.equal(fiveStarChance(80),1);
assert.deepEqual(outcomeTable(emptyPity()).map(x=>Math.round(x*10000)),BASE_RATES.map(x=>Math.round(x.chance*10000)));
for(let big=0;big<80;big++)for(let small=0;small<15;small++)for(let pos=1;pos<=10;pos++) {
  const state={big,small,featuredGuaranteed:false};
  const table=outcomeTable(state,pos===10);
  assert.ok(Math.abs(table.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(table.every(x=>x>=0&&x<=1));
  const draw=rollOutcome(state,pos===10,()=>.999999);
  if(small===14||pos===10)assert.ok(draw.index<5);
  if(big===79)assert.equal(draw.index,0);
  assert.ok(draw.state.small<15&&draw.state.big<80);
}
assert.ok(Math.abs(outcomeTable({big:65,small:14,featuredGuaranteed:false})[0]-.5680)<.001);
assert.ok(Math.abs(outcomeTable({big:78,small:14,featuredGuaranteed:false})[0]-.7583)<.001);
let state=emptyPity();
for(let i=1;i<=15;i++){ const d=pullMixed(1,()=>.999999,undefined,state); state=d.state;assert.equal(isRare(d.rewards[0]),i===15); }
const ten=pullMixed(10,()=>.999999);
assert.equal(ten.rewards.length,10);assert.ok(ten.rewards.slice(0,9).every(r=>!isRare(r)));assert.ok(isRare(ten.rewards[9]));
assert.equal(pullMixed(10,()=>.999999,undefined,{big:0,small:5,featuredGuaranteed:false}).rewards.length,10);
const seq=(...values)=>()=>{assert.ok(values.length);return values.shift();};
let d=rollOutcome({big:79,small:14,featuredGuaranteed:false},true,seq(.99,.99));
assert.deepEqual(d.state,{big:0,small:0,featuredGuaranteed:true});assert.equal(d.featured,false);
d=rollOutcome({...d.state,big:79},false,seq(.99));assert.equal(d.featured,true);assert.equal(d.state.featuredGuaranteed,false);
d=rollOutcome({big:10,small:0,featuredGuaranteed:true},false,()=>.02);
assert.equal(d.index,2);assert.deepEqual(d.state,{big:11,small:0,featuredGuaranteed:true});
// 5-star at slot four must reset the ramp for slot five, not after the entire batch.
const mid=pullMixed(10,()=>.999999,undefined,{big:76,small:0,featuredGuaranteed:false});
assert.equal(mid.rewards[3].rating.stars,5);assert.equal(mid.state.big,6);
// Worst-case random stream loses first 50/50, then takes both hard ceilings.
state=emptyPity();let featuredAt=0;
for(let i=1;i<=160;i++){const d=pullMixed(1,()=>.999999,undefined,state);state=d.state;if(d.rewards[0].kind==='holder'&&d.rewards[0].rating.slug===CURRENT_BANNER.featured){featuredAt=i;break;}}
assert.equal(featuredAt,160);
const newBanner={...CURRENT_BANNER,featured:'tertia',pastFeatured:['ensa']};
const carried=pullMixed(1,()=>.999999,undefined,{big:79,small:14,featuredGuaranteed:true},newBanner);
assert.equal(carried.rewards[0].rating.slug,'tertia');assert.deepEqual(carried.state,emptyPity());
assert.throws(()=>validateBanner(CURRENT_BANNER,[]));
assert.equal(validateBanner({...CURRENT_BANNER,pastFeatured:CURRENT_BANNER.permanent}).off.length,4);
assert.throws(()=>pullMixed(2));
const migratedSave=save.loadSave(null,JSON.stringify({...emptyCollection(),misses:9}),JSON.stringify({total:2,copies:{ensa:2}}));
assert.deepEqual(migratedSave.pity,{big:0,small:9,featuredGuaranteed:false});assert.equal(migratedSave.holders.copies.ensa,2);
const next=save.applyDraw(migratedSave,ten.rewards,ten.state);
assert.deepEqual(save.loadSave(JSON.stringify(next),null,null),next);
assert.throws(()=>save.loadSave('{',null,null));
assert.throws(()=>save.loadSave(null,null,JSON.stringify({total:1,copies:{ensa:-1}})));
assert.throws(()=>save.loadSave(JSON.stringify({...next,pity:{...next.pity,big:80}}),null,null));
let r=seeded(2026);state=emptyPity();
for(let i=0;i<1000;i++){const d=pullMixed(10,r,HOLDERS,state);assert.ok(d.rewards.some(isRare));state=d.state;}
console.log('Verified 12,000 state/slot combinations, 15-pull rolling pity, batch protection, ramp boundaries, UP, 160 ceiling, carryover, unified save and migrations.');
