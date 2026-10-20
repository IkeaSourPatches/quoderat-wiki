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
