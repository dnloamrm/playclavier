'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, openTools, rect, classes } = require('../lib/browser');

// Desktop (>= 1024) and phones (<= 820 or a phone UA). Values are the design tokens of the document (sections 6.2, 6.4, 9).
const DEVICES = [
  { w: 1920, h: 1080, mobile: false }, { w: 1440, h: 900, mobile: false }, { w: 1024, h: 768, mobile: false },
  { w: 430, h: 900, mobile: true }, { w: 390, h: 844, mobile: true }, { w: 360, h: 740, mobile: true }, { w: 320, h: 568, mobile: true },
];

for (const d of DEVICES) {
  const t = d.mobile ? { edge: 20, btn: 44, gap: 12, clear: 16 } : { edge: 40, btn: 60, gap: 24, clear: 32 };
  test(`layout ${d.w}x${d.h}: margins, clearance, block gaps, button size`, async ({ open }) => {
    const page = await open({ width: d.w, height: d.h, mobile: d.mobile });
    try {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert(!overflow, 'page scrolls horizontally');
      const ta = await rect(page, 'textarea');
      assert.near(ta.left, t.edge, 1, 'text left margin');
      assert.near(d.w - ta.right, t.edge, 1, 'text right margin');
      await openTools(page);
      const m = await page.evaluate(() => {
        const R = (e) => e.getBoundingClientRect();
        const blocks = [...document.querySelectorAll('#dock .blk')].map(R);
        const gaps = blocks.slice(1).map((r, i) => (Math.abs(r.top - blocks[i].top) < 2 ? ['h', r.left - blocks[i].right] : ['v', r.top - blocks[i].bottom]));
        const dock = R(document.getElementById('dock')), ta = R(document.querySelector('textarea')), plus = R(document.getElementById('t-plus')), info = R(document.getElementById('t-info'));
        const first = R(document.getElementById('t-new'));
        return { gaps, dockInView: dock.left >= 0 && dock.right <= innerWidth, taToDock: dock.top - ta.bottom, btnW: first.width, plusW: plus.width, plusLeft: plus.left, infoRight: innerWidth - info.right, plusBottom: innerHeight - plus.bottom };
      });
      assert(m.dockInView, 'dock leaves the screen');
      const oneRow = new Set(m.gaps.map((g) => g[0])).size === 1 && m.gaps.every((g) => g[0] === 'h');
      // (when the whole dock fits on one row the text area still reserves two rows: see the known-bug test below)
      if (!oneRow) assert.near(m.taToDock, t.clear, 1, 'text-to-dock clearance');
      assert.near(m.btnW, t.btn, 1, 'dock button width');
      assert.near(m.plusW, t.btn, 1, 'corner button width');
      assert.near(m.plusLeft, t.edge, 1, 'left corner button x');
      assert.near(m.infoRight, t.edge, 1, 'right corner button x');
      assert.near(m.plusBottom, t.edge, 1, 'corner button bottom');
      m.gaps.forEach(([axis, v]) => assert.near(v, t.gap, 1, `block gap (${axis})`));
      assert(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
    } finally { await page.close(); }
  }, { tags: ['layout'] });
}

test('layout: the dock is left-aligned on phones and centred on desktop', async ({ open }) => {
  const ph = await open({ width: 390, height: 844, mobile: true });
  await openTools(ph);
  const left = await ph.evaluate(() => Math.min(...[...document.querySelectorAll('#dock .blk')].map((e) => e.getBoundingClientRect().left)));
  await ph.close();
  assert.near(left, 20, 1, 'phone dock left edge');
  const dk = await open({ width: 1440, height: 900 });
  await openTools(dk);
  const c = await dk.evaluate(() => { const r = document.getElementById('dock').getBoundingClientRect(); return (r.left + r.right) / 2; });
  await dk.close();
  assert.near(c, 720, 1, 'desktop dock centre');
}, { tags: ['layout'] });

test('layout: the narrow breakpoint follows the window width live (820px)', async ({ open }) => {
  const page = await open({ width: 1440, height: 900 });
  try {
    assert(!(await page.evaluate(() => document.documentElement.classList.contains('is-mobile'))), 'desktop starts as desktop');
    await page.setViewport({ width: 700, height: 800 }); await sleep(400);
    assert(await page.evaluate(() => document.documentElement.classList.contains('is-mobile')), 'narrow window does not switch to the phone layout');
    await page.setViewport({ width: 1440, height: 900 }); await sleep(400);
    assert(!(await page.evaluate(() => document.documentElement.classList.contains('is-mobile'))), 'wide window does not switch back');
  } finally { await page.close(); }
}, { tags: ['layout'] });

test('layout: the dock fits on one row from 393px (needs 352px of 44px buttons), wraps below', async ({ open }) => {
  for (const [w, rows] of [[430, 1], [393, 1], [390, 2], [320, 2]]) {
    const page = await open({ width: w, height: 800, mobile: true });
    await openTools(page);
    const n = await page.evaluate(() => new Set([...document.querySelectorAll('#dock .blk')].map((e) => Math.round(e.getBoundingClientRect().top))).size);
    await page.close();
    assert(n === rows, `${w}px: expected ${rows} row(s), got ${n}`);
  }
}, { tags: ['layout'] });

test('layout: when the dock fits on ONE row (phones >= 393px) the text area stops just above it (16px), not above a second empty row', async ({ open }) => {
  const page = await open({ width: 430, height: 900, mobile: true });
  try {
    await openTools(page);
    const g = await page.evaluate(() => document.getElementById('dock').getBoundingClientRect().top - document.querySelector('textarea').getBoundingClientRect().bottom);
    assert.near(g, 16, 1, 'clearance above the one-row dock');
  } finally { await page.close(); }
}, { tags: ['layout'], knownFailing: 'the reserved band always assumes a two-row dock, so on one row there are 72px instead of 16px (side effect of --btn 44px)' });

test('layout: 821-1023px uses the desktop layout with the same 40px margins (no legacy 140px) and an 11-swatch palette', async ({ open }) => {
  for (const [w, h] of [[821, 768], [900, 768], [1023, 768]]) {
    const page = await open({ width: w, height: h });
    try {
      const m = await page.evaluate(() => { const r = document.querySelector('textarea').getBoundingClientRect(), c = document.documentElement.classList; return { left: r.left, right: innerWidth - r.right, mobile: c.contains('is-mobile'), wide: c.contains('is-wide') }; });
      assert(!m.mobile && !m.wide, `${w}px classes: mobile ${m.mobile}, wide ${m.wide}`);
      assert.near(m.left, 40, 1, `${w}px text left margin`); assert.near(m.right, 40, 1, `${w}px text right margin`);
      await openTools(page); await page.evaluate(() => document.getElementById('t-fill').click()); await sleep(300);
      const pw = await page.evaluate(() => document.getElementById('palette').getBoundingClientRect().width);
      assert(pw <= w - 80 + 1, `${w}px: the palette (${pw}px) is wider than the margins allow`);
    } finally { await page.close(); }
  }
  const wide = await open({ width: 1024, height: 768 });
  try { assert(await wide.evaluate(() => document.documentElement.classList.contains('is-wide')), '1024px is not wide'); } finally { await wide.close(); }
}, { tags: ['layout'] });
