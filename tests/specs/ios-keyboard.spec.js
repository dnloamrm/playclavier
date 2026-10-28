'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, click } = require('../lib/browser');

// iOS Safari fires no visualViewport event when the keyboard closes. window.visualViewport is replaced by an object that NEVER fires an
// event on its own, so the page can only follow the keyboard by reading the live values.
const geo = (page) => page.evaluate(() => {
  const r = (e) => document.querySelector(e).getBoundingClientRect(), v = window.__vv;
  return { plusBottom: Math.round(innerHeight - r('#t-plus').bottom), infoBottom: Math.round(innerHeight - r('#t-info').bottom), visibleBottom: Math.round(innerHeight - (v.offsetTop + v.height)) };
});
const glued = async (page) => { const g = await geo(page); return { ok: g.plusBottom - g.visibleBottom === 20 && g.infoBottom - g.visibleBottom === 20, g }; };

test('ios keyboard: corner buttons stay 20px above the visible bottom (keyboard up, page scrolled, closed with and without blur, 5 fast cycles)', async ({ open }) => {
  const page = await open({ width: 390, height: 700, mobile: true, fakeViewport: true });
  try {
    let s = await glued(page); assert(s.ok, 'start ' + JSON.stringify(s.g));
    await page.evaluate(() => { document.querySelector('textarea').focus(); window.__vv.height = innerHeight - 300; }); await sleep(450);
    s = await glued(page); assert(s.ok && s.g.plusBottom === 320, 'keyboard up, no event: ' + JSON.stringify(s.g));
    await page.evaluate(() => { window.__vv.offsetTop = 120; window.__vv.height = innerHeight - 420; }); await sleep(450);
    s = await glued(page); assert(s.ok, 'page scrolled by iOS: ' + JSON.stringify(s.g));
    await page.evaluate(() => { window.__vv.offsetTop = 0; window.__vv.height = innerHeight; }); await sleep(450);
    s = await glued(page); assert(s.ok && s.g.plusBottom === 20, 'keyboard closed without blur: ' + JSON.stringify(s.g));
    await page.evaluate(() => { document.querySelector('textarea').focus(); window.__vv.height = innerHeight - 300; }); await sleep(400);
    await page.evaluate(() => { window.__vv.height = innerHeight; document.querySelector('textarea').blur(); }); await sleep(700);
    s = await glued(page); assert(s.ok && s.g.plusBottom === 20, 'closed with blur: ' + JSON.stringify(s.g));
    for (let i = 0; i < 5; i++) {
      await page.evaluate((i) => { document.querySelector('textarea').focus(); window.__vv.height = innerHeight - (260 + i * 10); }, i); await sleep(180);
      await page.evaluate(() => { window.__vv.height = innerHeight; document.querySelector('textarea').blur(); }); await sleep(250);
    }
    await sleep(500);
    s = await glued(page); assert(s.ok && s.g.plusBottom === 20, 'after 5 fast cycles: ' + JSON.stringify(s.g));
  } finally { await page.close(); }
}, { tags: ['keyboard-ios'] });

test('ios keyboard: the open dock keeps its distance from the visible bottom with and without the keyboard', async ({ open }) => {
  const page = await open({ width: 390, height: 700, mobile: true, fakeViewport: true });
  try {
    await click(page, 't-plus'); await sleep(400);
    const dist = () => page.evaluate(() => { const d = document.getElementById('dock').getBoundingClientRect(), v = window.__vv; return Math.round(v.offsetTop + v.height - d.bottom); });
    await page.evaluate(() => { document.querySelector('textarea').focus(); window.__vv.height = innerHeight - 280; }); await sleep(400);
    const up = await dist();
    await page.evaluate(() => { window.__vv.height = innerHeight; document.querySelector('textarea').blur(); }); await sleep(700);
    const down = await dist();
    assert(up === down && up === 20 + 46 + 12, `dock distance ${up} / ${down}`);
  } finally { await page.close(); }
}, { tags: ['keyboard-ios'] });

test('ios keyboard: the root is locked (fixed, overflow hidden, no page scroll) on phones', async ({ open }) => {
  const page = await open({ width: 390, height: 700, mobile: true, fakeViewport: true });
  try {
    const l = await page.evaluate(() => { const h = getComputedStyle(document.documentElement), b = getComputedStyle(document.body); return { pos: h.position + '/' + b.position, of: h.overflow + '/' + b.overflow, scroll: scrollY + '/' + scrollX }; });
    assert.eq(l, { pos: 'fixed/fixed', of: 'hidden/hidden', scroll: '0/0' }, 'root lock');
  } finally { await page.close(); }
}, { tags: ['keyboard-ios'] });
