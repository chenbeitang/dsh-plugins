/**
 * Markdown 渲染引擎的离线单测（不需要浏览器 / DOM）。
 * 运行：node tests/markdown.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'src', 'client', '10-markdown.js'), 'utf8');
const MN = {};
new Function('MN', source)(MN);
const render = MN.md.render;

function check(name, fn) {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (error) {
    console.error('FAIL - ' + name);
    throw error;
  }
}

check('heading and paragraph', () => {
  const html = render('# Title\n\nhello world');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<p>hello world<\/p>/);
});

check('inline formatting', () => {
  const html = render('**bold** *italic* ~~gone~~ ==mark== <u>under</u> `code`');
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<del>gone<\/del>/);
  assert.match(html, /<mark>mark<\/mark>/);
  assert.match(html, /<u>under<\/u>/);
  assert.match(html, /<code>code<\/code>/);
});

check('code fence is escaped, not formatted', () => {
  const html = render('```js\nconst a = "<b>" && 1;\n```');
  assert.match(html, /<pre><code class="language-js">/);
  assert.match(html, /&lt;b&gt;/);
  assert.doesNotMatch(html, /<b>/);
});

check('links and images', () => {
  const html = render('[site](https://example.com?a=1&b=2) ![shot](assets/a.png)', {
    mediaUrl: (rel) => '/markdown-notes/api/media?path=' + encodeURIComponent(rel),
  });
  assert.match(html, /<a href="https:\/\/example\.com\?a=1&amp;b=2"/);
  assert.match(html, /<img src="\/markdown-notes\/api\/media\?path=assets%2Fa\.png"/);
});

check('image width extension', () => {
  const html = render('![shot](a.png){width=320}', {
    mediaUrl: (rel) => '/media/' + rel,
  });
  assert.match(html, /<img[^>]*width="320"/);
  const plain = render('![shot](a.png){note}', { mediaUrl: (rel) => '/media/' + rel });
  assert.match(plain, /<img/);
  assert.doesNotMatch(plain, /width=/);
});

check('line mapping attrs only when requested', () => {
  const markdown = '# A\n\npara\nline2\n\n- x\n- y\n\n```js\ncode\n```';
  const tracked = render(markdown, { trackLines: true });
  assert.match(tracked, /<h1 data-line="1" data-line-end="1">/);
  assert.match(tracked, /<p data-line="3" data-line-end="4">/);
  assert.match(tracked, /<ul data-line="6" data-line-end="7">/);
  assert.match(tracked, /<pre data-line="9" data-line-end="11">/);
  assert.doesNotMatch(render(markdown, {}), /data-line/);

  const table = render('| a | b |\n| --- | --- |\n| 1 | 2 |', { trackLines: true });
  assert.match(table, /<div class="mn-table-wrap" data-line="1" data-line-end="3">/);
});

check('javascript links are neutralised', () => {
  const html = render('[x](javascript:alert(1))');
  assert.doesNotMatch(html, /javascript:/);
});

check('raw script is escaped', () => {
  const html = render('<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

check('nested lists and tasks', () => {
  const html = render('- a\n  - b\n- [x] done\n- [ ] todo');
  assert.match(html, /<ul><li>a<ul><li>b<\/li><\/ul><\/li><li class="mn-task-item"><input[^>]*checked[^>]*> done<\/li>/);
  assert.match(html, /\[ \] todo|todo/);
});

check('ordered list', () => {
  const html = render('1. one\n2. two');
  assert.match(html, /<ol><li>one<\/li><li>two<\/li><\/ol>/);
});

check('blockquote', () => {
  const html = render('> quoted\n> second');
  assert.match(html, /<blockquote><p>quoted<br>second<\/p><\/blockquote>/);
});

check('table', () => {
  const html = render('| a | b |\n| --- | --- |\n| 1 | 2 |');
  assert.match(html, /<table>/);
  assert.match(html, /<th>a<\/th>/);
  assert.match(html, /<td>2<\/td>/);
});

check('horizontal rule and hard line break', () => {
  const html = render('a\nb\n\n---');
  assert.match(html, /a<br>b/);
  assert.match(html, /<hr>/);
});

check('empty input', () => {
  assert.equal(render(''), '');
  assert.equal(render('   \n  '), '');
});

console.log('all markdown tests passed');
