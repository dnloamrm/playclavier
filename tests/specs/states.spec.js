'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, openTools } = require('../lib/browser');

// Principle: no hover, no pressed state, no focus ring from the mouse, no fill, no motion on the buttons.
const IDS = ['t-new', 't-play', 't-auto', 't-fill', 't-text', 't-share', 't-info'];   // (t-rand and t-plus change the theme / collapse the dock when clicked)

test('states: hover, mouse-down and click never change a button\'s computed style', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    const snap = () => page.evaluate((ids) => ids.map((i) => { const c = getComputedStyle(document.getElementById(i)); return i + ':' + [c.color, c.backgroundColor, c.borderTopColor, c.outlineStyle, c.transform, c.opacity, c.textDecorationLine, c.boxShadow].join('/'); }), IDS);
    const base = await snap();
    for (const id of IDS) {
      const r = await page.evaluate((i) => { const b = document.getElementById(i).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, id);
      await page.mouse.move(r[0], r[1]); await sleep(120);
      assert.eq(await snap(), base, `hover on ${id}`);
      await page.mouse.down(); await sleep(120);
      assert.eq(await snap(), base, `pressed ${id}`);
      await page.mouse.up(); await sleep(150);
      if (id === 't-info') { await page.evaluate(() => document.getElementById('t-plus').click()); await sleep(250); await page.evaluate(() => document.getElementById('t-plus').click()); await sleep(250); }
    }
  } finally { await page.close(); }
}, { tags: ['states'] });

test('states: buttons have no fill, no native tooltip, no transition (except the Info button\'s fade)', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    const v = await page.evaluate(() => ['t-plus', 't-info', 't-new', 't-play', 't-auto', 't-fill', 't-text', 't-rand', 't-share'].map((i) => { const e = document.getElementById(i), c = getComputedStyle(e); return { i, bg: c.backgroundColor, title: e.hasAttribute('title'), tr: c.transitionProperty + ' ' + c.transitionDuration }; }));
    v.forEach((b) => { assert(b.bg === 'rgba(0, 0, 0, 0)', `${b.i} has a fill (${b.bg})`); assert(!b.title, `${b.i} has a title tooltip`); });
    v.filter((b) => b.i !== 't-info').forEach((b) => assert(/ 0s$/.test(b.tr), `${b.i} transitions (${b.tr})`));
  } finally { await page.close(); }
}, { tags: ['states'] });

test('states: palette swatches are flat colour (no hatch) and the default swatch is black', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page); await page.evaluate(() => document.getElementById('t-fill').click()); await sleep(200);
    const r = await page.evaluate(() => ({ flat: [...document.querySelectorAll('#palette button')].every((b) => getComputedStyle(b).backgroundImage === 'none'), none: getComputedStyle(document.querySelector('#palette .none')).backgroundColor, n: document.querySelectorAll('#palette button').length }));
    assert(r.flat, 'a swatch has a background image'); assert(r.none === 'rgb(0, 0, 0)', 'default swatch is ' + r.none); assert(r.n === 22, 'swatches: ' + r.n);
  } finally { await page.close(); }
}, { tags: ['states'] });
