'use strict';
const { test, assert } = require('../lib/runner');

test('shuffle: never repeats the previous background, starting from the default theme', async ({ open }) => {
  const page = await open({});
  try {
    const bad = await page.evaluate(() => {
      const U = window.__colorUtil; let repeats = 0, prev = { bg: null, fg: null };
      for (let i = 0; i < 1500; i++) {
        const effective = prev.bg || U.D.bg, next = U.compose(prev);
        if (next.bg === effective) repeats++;
        prev = next;
        if (i % 50 === 0) prev = { bg: null, fg: null };          // go back to the default theme now and then (the pick-"default" swatch)
      }
      return repeats;
    });
    assert(bad === 0, bad + ' of 1500 draws repeated the previous background');
  } finally { await page.close(); }
}, { tags: ['shuffle', 'colors'] });

test('shuffle: every draw is one of the 100 pairs and all 100 are reachable', async ({ open }) => {
  const page = await open({});
  try {
    const r = await page.evaluate(() => {
      const U = window.__colorUtil, set = new Set(U.PAIRS.map((p) => p.join())); let prev = null, bad = 0; const seen = new Set();
      for (let i = 0; i < 4000; i++) { const c = U.compose(prev); const k = c.bg + ',' + c.fg; if (!set.has(k)) bad++; seen.add(k); prev = c; }
      return { bad, reach: seen.size };
    });
    assert(r.bad === 0, r.bad + ' draws outside the curated pairs');
    assert(r.reach === 100, 'only ' + r.reach + ' of 100 pairs reachable');
  } finally { await page.close(); }
}, { tags: ['shuffle', 'colors'] });
