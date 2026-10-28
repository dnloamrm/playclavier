'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, openTools, rect, classes, click } = require('../lib/browser');

// Desktop (>= 821, 40px margins) and phones (<= 820 or a phone UA, 20px margins). Values are the design tokens of the document (sections 6.2, 6.4, 9).
const DESKTOP = [{ w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1024, h: 768 }];
const PHONES = [320, 360, 375, 390, 393, 402, 414, 430, 820].map((w) => ({ w, h: w === 820 ? 1000 : 844 }));

for (const d of DESKTOP) {
  test(`layout desktop ${d.w}x${d.h}: margins, clearance, 24px between blocks, 60px buttons, one row`, async ({ open }) => {
    const page = await open({ width: d.w, height: d.h });
    try {
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'page scrolls horizontally');
      const ta = await rect(page, 'textarea');
      assert.near(ta.left, 40, 1, 'text left margin'); assert.near(d.w - ta.right, 40, 1, 'text right margin');
      await openTools(page);
      const m = await page.evaluate(() => {
        const R = (e) => e.getBoundingClientRect(), blocks = [...document.querySelectorAll('#dock .blk')].map(R), dock = R(document.getElementById('dock')), ta = R(document.querySelector('textarea')), plus = R(document.getElementById('t-plus')), info = R(document.getElementById('t-info'));
        return { gaps: blocks.slice(1).map((r, i) => r.left - blocks[i].right), sameRow: new Set(blocks.map((r) => Math.round(r.top))).size === 1, inView: dock.left >= 0 && dock.right <= innerWidth, taToDock: dock.top - ta.bottom, btnW: R(document.getElementById('t-new')).width, plusW: plus.width, plusLeft: plus.left, infoRight: innerWidth - info.right, plusBottom: innerHeight - plus.bottom, centre: (dock.left + dock.right) / 2 };
      });
      assert(m.sameRow, 'the desktop dock must be one row'); assert(m.inView, 'dock leaves the screen');
      assert.near(m.taToDock, 32, 1, 'text-to-dock clearance'); assert.near(m.btnW, 60, 1, 'dock button width'); assert.near(m.plusW, 60, 1, 'corner button width');
      assert.near(m.plusLeft, 40, 1, 'left corner x'); assert.near(m.infoRight, 40, 1, 'right corner x'); assert.near(m.plusBottom, 40, 1, 'corner bottom'); assert.near(m.centre, d.w / 2, 1, 'dock centre');
      m.gaps.forEach((g) => assert.near(g, 24, 1, 'block gap'));
      assert(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
    } finally { await page.close(); }
  }, { tags: ['layout'] });
}

for (const d of PHONES) {
  test(`layout phone ${d.w}: the dock is the same fixed 2-row grid, nothing overlaps, the text stays 16px above the stack, the palette sits 12px above the dock`, async ({ open }) => {
    const page = await open({ width: d.w, height: d.h, mobile: true });
    try {
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'page scrolls horizontally');
      for (const state of ['closed', 'tools', 'palette']) {
        if (state !== 'closed') await openTools(page);
        if (state === 'palette') { await page.evaluate(() => { if (!document.documentElement.classList.contains('palette-open')) document.getElementById('t-fill').click(); }); await sleep(350); }
        const m = await page.evaluate(() => {
          const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, c = document.documentElement.classList, tools = c.contains('tools-open'), pal = c.contains('palette-open');
          const els = [['plus', document.getElementById('t-plus')]]; if (tools) { els.push(['info', document.getElementById('t-info')]); [...document.querySelectorAll('#dock .blk')].forEach((e, i) => els.push(['blk' + i, e])); } if (tools && pal) els.push(['palette', document.getElementById('palette')]);
          const rects = els.map(([n, e]) => [n, R(e)]), hits = [];
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i][1], b = rects[j][1]; if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) hits.push(rects[i][0] + 'x' + rects[j][0]); }
          const blk = [...document.querySelectorAll('#dock .blk')].map(R), ta = R(document.querySelector('textarea')), dock = R(document.getElementById('dock')), pr = R(document.getElementById('palette')), plus = R(document.getElementById('t-plus')), info = document.getElementById('t-info');
          return { hits, top: Math.min(...rects.map(([n, r]) => r.t)), taBottom: ta.b, palGap: pal ? dock.t - pr.b : null, rows: new Set(blk.map((r) => Math.round(r.t))).size, row1: blk.filter((r) => Math.round(r.t) === Math.round(blk[0].t)).length, maxRight: Math.max(...rects.map(([n, r]) => r.r)) - innerWidth, minLeft: Math.min(...rects.map(([n, r]) => r.l)), dockToPlus: plus.t - dock.b, infoOpacity: getComputedStyle(info).opacity, infoInert: info.inert };
        });
        const who = `${d.w} ${state}`;
        assert(m.hits.length === 0, `${who}: overlapping elements ${m.hits.join(',')}`);
        assert(m.top - m.taBottom >= 15.5, `${who}: the text is only ${(m.top - m.taBottom).toFixed(1)}px above the first control`);
        if (state === 'palette') assert.near(m.palGap, 12, 0.6, `${who}: palette above the dock`);
        assert(m.rows === 2 && m.row1 === 3, `${who}: the dock is not the 2-row grid (rows ${m.rows}, first row ${m.row1} blocks)`);
        assert(m.maxRight <= 0.5 && m.minLeft >= 19.5, `${who}: something leaves the 20px margins`);
        if (state !== 'closed') assert.near(m.dockToPlus, 12, 0.6, `${who}: dock to corner buttons`);
        if (state === 'closed') assert(m.infoOpacity === '0' && m.infoInert, `${who}: the Info button is visible or focusable`); else assert(m.infoOpacity === '1' && !m.infoInert, `${who}: the Info button is hidden`);
      }
      assert(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
    } finally { await page.close(); }
  }, { tags: ['layout'] });
}

test('layout: phone buttons are 46px, 12px between blocks, SHARE is right-aligned in row 1, the dock starts at the 20px margin', async ({ open }) => {
  const page = await open({ width: 390, height: 844, mobile: true });
  try {
    await openTools(page);
    const m = await page.evaluate(() => { const R = (i) => document.getElementById(i).getBoundingClientRect(), b = [...document.querySelectorAll('#dock .blk')].map((e) => e.getBoundingClientRect()); return { btn: R('t-new').width, plus: R('t-plus').width, left: Math.min(...b.map((r) => r.left)), gapH: b[1].left - b[0].right, gapV: b[2].top - b[0].bottom, shareRight: innerWidth - b[3].right, shareTop: b[3].top, newTop: b[0].top }; });
    assert.near(m.btn, 46, 1, 'dock button'); assert.near(m.plus, 46, 1, 'corner button'); assert.near(m.left, 20, 1, 'dock left'); assert.near(m.gapH, 12, 1, 'horizontal block gap'); assert.near(m.gapV, 12, 1, 'row gap');
    assert.near(m.shareRight, 20, 1, 'SHARE is not at the right margin'); assert.near(m.shareTop, m.newTop, 1, 'SHARE is not in the first row');
  } finally { await page.close(); }
}, { tags: ['layout'] });

test('layout: with a simulated 300px keyboard the whole stack follows the visible area and keeps its 12px gaps', async ({ open }) => {
  const page = await open({ width: 390, height: 760, mobile: true, fakeViewport: true });
  try {
    await openTools(page); await page.evaluate(() => document.getElementById('t-fill').click()); await sleep(400);
    const geo = () => page.evaluate(() => { const R = (i) => document.getElementById(i).getBoundingClientRect(), v = window.__vv, vb = innerHeight - (v.offsetTop + v.height); return { plusGap: Math.round(innerHeight - R('t-plus').bottom - vb), dockToPlus: Math.round(R('t-plus').top - R('dock').bottom), palGap: Math.round(R('dock').top - R('palette').bottom), taGap: Math.round(R('palette').top - document.querySelector('textarea').getBoundingClientRect().bottom) }; });
    const a = await geo();
    await page.evaluate(() => { document.querySelector('textarea').focus(); window.__vv.height = innerHeight - 300; }); await sleep(500); const k = await geo();
    await page.evaluate(() => { window.__vv.height = innerHeight; document.querySelector('textarea').blur(); }); await sleep(800); const c = await geo();
    [a, k, c].forEach((g, i) => { assert(g.plusGap === 20, `state ${i}: corner buttons ${g.plusGap}px above the visible bottom`); assert(g.dockToPlus === 12 && g.palGap === 12, `state ${i}: gaps ${g.dockToPlus}/${g.palGap}`); assert(g.taGap >= 15, `state ${i}: text ${g.taGap}px above the palette`); });
  } finally { await page.close(); }
}, { tags: ['layout', 'keyboard-ios'] });

test('layout: desktop with the palette open keeps the text above it (it is part of the reserved band)', async ({ open }) => {
  const page = await open({ width: 1440, height: 900 });
  try {
    await openTools(page); await page.evaluate(() => document.getElementById('t-fill').click()); await sleep(350);
    const g = await page.evaluate(() => { const p = document.getElementById('palette').getBoundingClientRect(), d = document.getElementById('dock').getBoundingClientRect(), t = document.querySelector('textarea').getBoundingClientRect(); return { pal: d.top - p.bottom, text: p.top - t.bottom }; });
    assert.near(g.pal, 12, 0.6, 'palette 12px above the dock'); assert(g.text >= 31, 'the text is ' + g.text + 'px above the palette');
  } finally { await page.close(); }
}, { tags: ['layout'] });

test('layout: the dock is left-aligned on phones and centred on desktop; the narrow breakpoint follows the window width live (820px)', async ({ open }) => {
  const ph = await open({ width: 390, height: 844, mobile: true });
  await openTools(ph);
  const left = await ph.evaluate(() => Math.min(...[...document.querySelectorAll('#dock .blk')].map((e) => e.getBoundingClientRect().left)));
  await ph.close(); assert.near(left, 20, 1, 'phone dock left edge');
  const page = await open({ width: 1440, height: 900 });
  try {
    await openTools(page);
    assert.near(await page.evaluate(() => { const r = document.getElementById('dock').getBoundingClientRect(); return (r.left + r.right) / 2; }), 720, 1, 'desktop dock centre');
    assert(!(await page.evaluate(() => document.documentElement.classList.contains('is-mobile'))), 'desktop starts as desktop');
    await page.setViewport({ width: 700, height: 800 }); await sleep(400);
    assert(await page.evaluate(() => document.documentElement.classList.contains('is-mobile')), 'narrow window does not switch to the phone layout');
    await page.setViewport({ width: 1440, height: 900 }); await sleep(400);
    assert(!(await page.evaluate(() => document.documentElement.classList.contains('is-mobile'))), 'wide window does not switch back');
  } finally { await page.close(); }
}, { tags: ['layout'] });

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
