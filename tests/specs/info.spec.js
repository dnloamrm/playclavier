'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, click, openTools, classes, text, typeInto } = require('../lib/browser');

const TEXTS = ['Clavier is an interactive experience where you improvise using your computer keyboard.', 'Design and Code by Danilo Amorim.'];
const openInfo = async (page) => { await openTools(page); await click(page, 't-info'); await sleep(400); };

for (const d of [{ w: 1440, h: 900, mobile: false }, { w: 1920, h: 1080, mobile: false }, { w: 390, h: 844, mobile: true }]) {
  test(`info ${d.w}x${d.h}: only the two sentences, Arizona Sans 28/35, centred block over 4 grid columns, left-aligned`, async ({ open }) => {
    const page = await open({ width: d.w, height: d.h, mobile: d.mobile });
    try {
      await openInfo(page);
      const m = await page.evaluate(() => {
        const ps = [...document.querySelectorAll('#info-view p')], R = (e) => e.getBoundingClientRect(), c = (e) => getComputedStyle(e), col = (innerWidth - 80 - 11 * 48) / 12;
        const top = Math.min(...ps.map((p) => R(p).top)), bottom = Math.max(...ps.map((p) => R(p).bottom));
        return { texts: ps.map((p) => p.textContent), fs: ps.map((p) => c(p).fontSize + '/' + c(p).lineHeight + ' ' + c(p).fontFamily.split(',')[0].replace(/"/g, '') + ' ' + c(p).textAlign), left: R(ps[0]).left, width: R(ps[0]).width, four: col * 4 + 3 * 48, col5: 40 + 4 * (col + 48), cx: R(ps[0]).left + R(ps[0]).width / 2, topGap: top, bottomGap: innerHeight - bottom, all: document.querySelector('#info-view').textContent.trim() };
      });
      assert.eq(m.texts, TEXTS, 'texts');
      m.fs.forEach((f) => assert(/^28px\/35px Arizona Sans (left|start)$/.test(f), 'type: ' + f));
      if (!d.mobile) { assert.near(m.width, m.four, 1, '4 columns wide'); assert.near(m.left, m.col5, 1, 'starts at column 5'); assert.near(m.cx, d.w / 2, 1, 'horizontal centre'); }
      else { assert.near(m.left, 20, 1, 'phone left margin'); assert.near(m.width, d.w - 40, 1, 'phone width'); }
      assert.near(m.topGap, m.bottomGap, 2, 'vertical centre');
    } finally { await page.close(); }
  }, { tags: ['info'] });
}

test('info: opens instantly (no fade, no cascade) and never changes the address', async ({ open }) => {
  const page = await open({});
  try {
    const url0 = page.url();
    await openTools(page);
    const frames = await page.evaluate(() => new Promise((res) => {
      const out = []; const v = document.getElementById('info-view'), ps = [...v.querySelectorAll('p')];
      document.getElementById('t-info').click();
      let n = 0; (function f() { const c = getComputedStyle(v); out.push([c.opacity, c.visibility, ps.map((p) => getComputedStyle(p).opacity + '|' + getComputedStyle(p).transform).join(',')].join(' ')); if (++n < 12) requestAnimationFrame(f); else res(out); })();
    }));
    assert(frames.every((f) => f === frames[0]), 'frames differ while opening: ' + [...new Set(frames)].join(' ; '));
    assert(/^1 visible/.test(frames[0]), 'first frame is not final: ' + frames[0]);
    assert(page.url() === url0, 'the address changed to ' + page.url());
    assert(!/#/.test(page.url()), 'a hash was added');
  } finally { await page.close(); }
}, { tags: ['info'] });

test('info: X goes home, "i" never closes it, NEW closes it and clears the text', async ({ open }) => {
  const page = await open({});
  try {
    await typeInto(page, 'abc');
    await openInfo(page);
    await click(page, 't-info'); await click(page, 't-info'); await sleep(250);
    assert((await classes(page)).info, '"i" closed the Info');
    await page.mouse.click(720, 300); await sleep(200);
    assert((await classes(page)).info, 'a click on the page closed the Info');
    await click(page, 't-plus'); await sleep(300);
    const a = await classes(page); assert(!a.info && !a.tools, 'X did not return to the home screen');
    assert(await text(page) === 'abc', 'X must keep the text');
    await openInfo(page); await click(page, 't-new'); await sleep(300);
    assert(!(await classes(page)).info && await text(page) === '', 'NEW must close the Info and clear the text');
  } finally { await page.close(); }
}, { tags: ['info'] });

test('info: a refresh and an old /#info or /info link land on the home screen with a clean address', async ({ open, url }) => {
  const page = await open({});
  try {
    await openInfo(page);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.$nuxt && window.$nuxt.$store.state.isLoading === false, { timeout: 200000 }); await sleep(800);
    assert(!(await classes(page)).info, 'reload kept the Info open');
    await page.goto(url + '/?cb=' + Date.now() + '#info', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.$nuxt && window.$nuxt.$store.state.isLoading === false, { timeout: 200000 }); await sleep(800);
    assert(!(await classes(page)).info && !/#info/.test(page.url()), '/#info opened the Info or kept the hash');
    await page.goto(url + '/info', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.$nuxt && window.$nuxt.$store.state.isLoading === false, { timeout: 200000 }); await sleep(800);
    assert(!(await classes(page)).info && new URL(page.url()).pathname === '/', '/info did not redirect to the root: ' + page.url());
  } finally { await page.close(); }
}, { tags: ['info'] });

test('info: the text area stops above the buttons (it scrolls inside, nothing runs under the dock)', async ({ open }) => {
  const page = await open({ width: 1440, height: 560 });
  try {
    await openInfo(page);
    const m = await page.evaluate(() => { const a = document.querySelector('#info-view .info-in'), d = document.getElementById('dock'); a.scrollTop = a.scrollHeight; return { gap: d.getBoundingClientRect().top - a.getBoundingClientRect().bottom, page: document.getElementById('info-view').scrollHeight > document.getElementById('info-view').clientHeight }; });
    assert(m.gap >= 30, 'area ends ' + m.gap + 'px above the dock'); assert(!m.page, 'the whole page scrolls instead of the text area');
  } finally { await page.close(); }
}, { tags: ['info'] });

test('info: with the Info open the controls still work from the keyboard (Tab reaches them, Enter presses NEW)', async ({ open }) => {
  const page = await open({});
  try {
    await typeInto(page, 'abc'); await openInfo(page);
    await page.evaluate(() => document.getElementById('info-view').focus());
    for (let n = 0; n < 12; n++) { if ((await page.evaluate(() => document.activeElement.id)) === 't-new') break; await page.keyboard.press('Tab'); await sleep(70); }
    assert(await page.evaluate(() => document.activeElement.id) === 't-new', 'Tab never reached NEW with the Info open');
    await page.keyboard.press('Enter'); await sleep(400);
    assert(!(await classes(page)).info && await text(page) === '', 'Enter on NEW did not close the Info and clear the text');
  } finally { await page.close(); }
}, { tags: ['info'] });
