import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localizeArticle, translate} from '../src/i18n.ts';
const articles = JSON.parse(readFileSync(new URL('../data/articles.json', import.meta.url)));
for (const article of articles) {
  assert.ok(article.translations?.zh?.body, `${article.slug} lacks Chinese content`);
  assert.ok(article.translations.zh.title);
  const en = localizeArticle(article, 'en');
  const zh = localizeArticle(article, 'zh');
  assert.equal(zh.slug, en.slug);
  assert.equal(zh.category, en.category);
  assert.deepEqual(Object.keys(zh.stats), Object.keys(en.stats));
  assert.ok(!en.body.includes('中文\n证毕'), 'Chinese tab leaked into English');
}
const timeline = articles.find(a=>a.slug==='timeline');
assert.equal((timeline.body.match(/^### Floor /gm)||[]).length,7);
assert.equal((timeline.translations.zh.body.match(/^### 第.+层：/gm)||[]).length,7);
assert.ok(timeline.body.includes('Limitrest Range'));
assert.ok(timeline.translations.zh.body.includes('极限山脉'));
assert.equal(translate('zh','Creatures'),'神兽');
const custom={slug:'custom',title:'English only',body:'New article',category:'Characters',stats:{},source:''};
assert.equal(localizeArticle(custom,'zh').body,'New article');
console.log(`Verified ${articles.length} bilingual entries, stable identities, seven timeline floors, and fallback.`);
// The rewound timeline reads its text out of the article, so check that it still can.
const world = await import('../src/timeline/world.ts');
for (const [lang, body] of [['en', timeline.body], ['zh', timeline.translations.zh.body]]) {
  const {floors} = world.parseTimeline(body);
  assert.equal(floors.length, 7, `${lang}: seven floors`);
  assert.equal(world.splitActs(floors[world.FEUD].body).acts.length, 4, `${lang}: the Feud has four acts`);
  for (const kind of ['dragon', 'unicorn', 'phoenix', 'kitsune', 'troll']) {
    const name = world.KIND_NAMES[kind][lang];
    assert.ok(world.myth(floors, name), `${lang}: ${kind} creation myth`);
    assert.ok(world.fate(floors, name), `${lang}: ${kind} fate in the Hunt`);
  }
  assert.ok(world.myth(floors, world.KIND_NAMES.mortal[lang]), `${lang}: mortal creation myth`);
  assert.ok(world.present(floors, world.KIND_NAMES.kitsune[lang]), `${lang}: kitsune in the Present`);
}
for (const text of [world.T, world.TIP, world.LAW, world.REGION, world.KIND_NAMES].flatMap(Object.values)) assert.ok(text.en?.trim() && text.zh?.trim(), JSON.stringify(text));
assert.equal(world.STOPS.length, world.CAMERA.length, 'one camera per stop');
console.log('Verified the rewound timeline: seven floors, four Feud acts, every creature in both languages.');
