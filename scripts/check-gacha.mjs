import assert from 'node:assert/strict';
import { pool, collection, save, seeded } from './gacha-modules.mjs';
const { emptyCollection, decodeCollection, addPulls, equipTotem, mergeCandidates, mergeTotems, discardTotem } = collection;
const earth = { family: 'earth', tier: 'common', depth: 20 };
for (const [tier,cost,next,power] of [['common',10,'strong',26],['strong',20,'elite',31],['elite',30,'epic',36]]) {
  const depth=pool.TIERS.find(t=>t.id===tier).depth[0];
  const original=addPulls(emptyCollection(),Array(cost).fill({...earth,tier,depth}));
  const equipped=equipTotem(original,1,7);
  const choice=mergeCandidates(equipped,1);
  assert.equal(choice.ids.length,cost);
  const upgraded=mergeTotems(equipped,1,choice.ids.slice(1));
  assert.equal(upgraded.items.length,1);assert.equal(upgraded.items[0].tier,next);assert.equal(upgraded.items[0].power,power);
  assert.equal(upgraded.slots[7],1);assert.equal(upgraded.total,cost);assert.equal(original.items.length,cost);
  assert.deepEqual(decodeCollection(JSON.stringify(upgraded)),upgraded);
  assert.throws(()=>mergeTotems(equipped,1,choice.ids.slice(2)));
  assert.throws(()=>mergeTotems(equipped,1,Array(cost-1).fill(1)));
  assert.throws(()=>mergeTotems(equipTotem(equipped,2,0),1,choice.ids.slice(1)));
}
let saved=addPulls(emptyCollection(),Array(10).fill(earth));
assert.throws(()=>mergeTotems({...saved,items:saved.items.map(t=>t.id===2?{...t,family:'water'}:t)},1,[2,3,4,5,6,7,8,9,10]));
const ss=addPulls(emptyCollection(),[{...earth,tier:'epic',depth:36}]);
assert.equal(mergeCandidates(ss,1).recipe,undefined);assert.throws(()=>mergeTotems(ss,1,[]));
const equipped=equipTotem(saved,1,0),moved=equipTotem(equipped,1,1);
assert.deepEqual(moved.slots.slice(0,2),[null,1]);assert.equal(discardTotem(moved,1).slots[1],null);
assert.equal(equipTotem(moved,null,1).items.length,10);
assert.throws(()=>equipTotem(saved,1,8));assert.throws(()=>equipTotem(saved,99,0));
assert.throws(()=>decodeCollection(JSON.stringify({...saved,slots:[1,1,null,null,null,null,null,null]})));
const storageData=new Map([['quoderat-gacha-save-v1','old'],['quoderat-gacha-totems','old'],['quoderat-gacha-holders','old'],['language','zh']]);
const storage={getItem:k=>storageData.get(k)??null,removeItem:k=>storageData.delete(k)};
assert.deepEqual(save.readCurrentSave(storage),save.emptySave());assert.deepEqual([...storageData],[['language','zh']]);
const persisted={...save.emptySave(),totems:equipped,pity:{small:4,big:25,featuredGuaranteed:true}};
storageData.set(save.SAVE_KEY,JSON.stringify(persisted));assert.deepEqual(save.readCurrentSave(storage),persisted);
assert.deepEqual(save.readCurrentSave(storage),persisted,'reset must not recur for new progress');
console.log('Verified 10/20/30 rank upgrades, rank-bounded power, protected equipment, slot movement/discard, and one-time gacha wipe.');
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
const next=save.applyDraw(save.emptySave(),ten.rewards,ten.state);
assert.deepEqual(save.loadSave(JSON.stringify(next)),next);
assert.throws(()=>save.loadSave('{'));
assert.throws(()=>save.loadSave(JSON.stringify({...next,pity:{...next.pity,big:80}})));
let r=seeded(2026);state=emptyPity();
for(let i=0;i<1000;i++){const d=pullMixed(10,r,HOLDERS,state);assert.ok(d.rewards.some(isRare));state=d.state;}
console.log('Verified 12,000 state/slot combinations, 15-pull rolling pity, batch protection, ramp boundaries, UP, 160 ceiling, carryover, unified save persistence.');

const stackSave=collection.addPulls(collection.emptyCollection(),[earth,{...earth,depth:25},{...earth,tier:'strong',depth:26},{...earth,family:'water'}]);
const stackView=collection.inventoryStacks(collection.equipTotem(stackSave,1,0));
assert.equal(stackView.length,3);
const earthB=stackView.find(s=>s.family==='earth'&&s.tier==='common');
assert.equal(earthB.items.length,2);assert.equal(earthB.equipped,1);assert.equal(earthB.minPower,20);assert.equal(earthB.maxPower,25);
assert.equal(stackSave.items.length,4);assert.equal(stackView.reduce((n,s)=>n+s.items.length,0),4);
console.log('Verified type/rank stacks, individual power range, equipped counts and inventory preservation.');
