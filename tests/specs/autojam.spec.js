'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, openTools, classes, text } = require('../lib/browser');

test('auto-jam: every poem is a complete text ending in ONE full stop and lasts at least 30 s (validated here, not filtered at runtime)', async ({ open }) => {
  const page = await open({});
  try {
    const r = await page.evaluate(() => {
      const concepts = window.__CLAVIER_CONCEPTS, est = window.__clavierEstimate, bad = [];
      concepts.forEach((c) => c.poems.forEach((p, i) => { if (!/[^.]\.$/.test(p)) bad.push(`${c.id}#${i}: not a complete text with one final full stop`); const ms = est(c, p); if (ms < 30000) bad.push(`${c.id}#${i}: only ${Math.round(ms / 1000)} s`); }));
      return { n: concepts.length, poems: concepts.map((c) => c.poems.length), bad };
    });
    assert(r.n === 3, 'concepts: ' + r.n);
    assert(r.poems.every((n) => n >= 3), 'a concept has fewer than 3 poems: ' + r.poems);
    assert(r.bad.length === 0, r.bad.join('; '));
  } finally { await page.close(); }
}, { tags: ['autojam'] });

test('auto-jam: starts, types characters one by one, stops when pressed again and clears the text', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(2500);
    assert((await classes(page)).auto, 'did not start');
    const n = (await text(page)).length; assert(n > 3, 'typed ' + n + ' characters');
    await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(500);
    assert(!(await classes(page)).auto, 'did not stop'); assert(await text(page) === '', 'pressing it again must clear the text');
  } finally { await page.close(); }
}, { tags: ['autojam'] });

test('auto-jam: a concept without poems does nothing instead of throwing', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    await page.evaluate(() => { window.__CLAVIER_CONCEPTS.forEach((c) => { c.poems.length = 0; }); });
    await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(900);
    assert(!(await classes(page)).auto, 'it started without any poem');
    assert(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
  } finally { await page.close(); }
}, { tags: ['autojam'] });
