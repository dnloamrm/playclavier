'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, click, openTools, classes } = require('../lib/browser');

const hex = (rgb) => '#' + rgb.match(/\d+/g).slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const PALETTE = ['#FFFFFF', '#0B0D0E', '#EEE6E1', '#CFBFAC', '#4B2A28', '#866A4A', '#AC966A', '#F8E869', '#E3954A', '#D95736', '#8A1D34', '#D74CD9', '#CF9ED4', '#A58BDF', '#B4B3E1', '#6194D6', '#7EBFD9', '#D7E2DE', '#626F42', '#223E27', '#80CE56', '#B4CCB5'];
const pick = async (page, mode, c) => { await click(page, mode === 'bg' ? 't-fill' : 't-text'); await sleep(150); await page.evaluate((x) => document.querySelector(x).click(), c ? `#palette button[data-c="${c}"]` : '#palette button.none'); await sleep(150); };

test('colors: the 100 curated SHUFFLE pairs are unique, palette-only and contrast >= 4.43:1', async ({ open }) => {
  const page = await open({});
  try {
    const P = await page.evaluate(() => window.__colorUtil.PAIRS);
    assert(P.length === 100, 'pairs: ' + P.length);
    assert(new Set(P.map((p) => p.join())).size === 100, 'duplicate pairs');
    assert(P.every((p) => PALETTE.includes(p[0]) && PALETTE.includes(p[1])), 'a pair uses a colour outside the palette');
    const rs = P.map((p) => ratio(p[0], p[1]));
    assert(Math.min(...rs) >= 4.43, 'min contrast ' + Math.min(...rs).toFixed(2));
  } finally { await page.close(); }
}, { tags: ['colors'] });

test('colors: default theme tokens (bg #0B0D0E, text #F9FAFA, border = text, placeholder >= 3:1)', async ({ open }) => {
  const page = await open({});
  try {
    const v = await page.evaluate(() => { const g = (s, p, ps) => getComputedStyle(document.querySelector(s), ps)[p]; return { bg: g('body', 'backgroundColor'), fg: g('textarea', 'color'), ph: g('textarea', 'color', '::placeholder'), border: g('#t-plus', 'borderTopColor') }; });
    assert(hex(v.bg) === '#0B0D0E', 'bg ' + hex(v.bg));
    assert(hex(v.fg) === '#F9FAFA', 'fg ' + hex(v.fg));
    assert(hex(v.border) === '#F9FAFA', 'border ' + hex(v.border));
    assert(ratio(hex(v.ph), '#0B0D0E') >= 3, 'placeholder contrast ' + ratio(hex(v.ph), '#0B0D0E').toFixed(2));
  } finally { await page.close(); }
}, { tags: ['colors'] });

test('colors: one foreground colour drives text, caret, labels, icons and borders; 12 SHUFFLE clicks stay consistent', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
      await click(page, 't-rand'); await sleep(120);
      const m = await page.evaluate(() => {
        const g = (s, p) => getComputedStyle(document.querySelector(s))[p];
        const fg = window.__colorMap.fg;
        const parts = { text: g('textarea', 'color'), caret: g('textarea', 'caretColor'), plus: g('#t-plus', 'color'), info: g('#t-info', 'color'), border: g('#t-play', 'borderTopColor'), borderPlus: g('#t-plus', 'borderTopColor'), icon: g('#t-new', 'color') };
        return { fg, parts, bg: window.__colorMap.bg, body: g('body', 'backgroundColor') };
      });
      Object.entries(m.parts).forEach(([k, v]) => assert(hex(v) === m.fg, `${k} (${hex(v)}) differs from the foreground (${m.fg})`));
      assert(hex(m.body) === m.bg, 'body background differs from the token');
      seen.add(m.bg + m.fg);
    }
    assert(seen.size >= 8, 'SHUFFLE gave only ' + seen.size + ' different compositions in 12 clicks');
  } finally { await page.close(); }
}, { tags: ['colors'] });

test('colors: free choice (bg = text allowed), persisted across reloads, an unset colour is the default one', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    await pick(page, 'bg', '#223E27'); await pick(page, 'fg', '#223E27');
    assert.eq(await page.evaluate(() => [window.__colorMap.bg, window.__colorMap.fg]), ['#223E27', '#223E27'], 'same colour on both');
    await pick(page, 'bg', '#F8E869');
    assert(await page.evaluate(() => window.__colorMap.fg) === '#223E27', 'the text colour was changed behind the user\'s back');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.$nuxt && window.$nuxt.$store.state.isLoading === false, { timeout: 200000 }); await sleep(900);
    assert.eq(await page.evaluate(() => [window.__colorMap.bg, window.__colorMap.fg]), ['#F8E869', '#223E27'], 'not remembered after reload');
    await openTools(page); await pick(page, 'bg', null);
    assert.eq(await page.evaluate(() => [window.__colorMap.bg, window.__colorMap.fg]), ['#0B0D0E', '#223E27'], 'reset bg must be the default and leave the text alone');
  } finally { await page.close(); }
}, { tags: ['colors'] });

test('colors: a saved value that is not in the palette falls back to the default theme', async ({ open }) => {
  const page = await open({ colors: { bg: 'not-a-colour', fg: '#123456' } });
  try {
    const v = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.querySelector('textarea')).color }));
    assert(hex(v.bg) === '#0B0D0E' && hex(v.fg) === '#F9FAFA', `got bg ${v.bg}, fg ${v.fg}`);
  } finally { await page.close(); }
}, { tags: ['colors'] });

test('colors: a saved colour of the palette is kept, an unknown one is dropped, white is valid', async ({ open }) => {
  const a = await open({ colors: { bg: '#8a1d34', fg: '#FFFFFF' } });
  try { assert.eq(await a.evaluate(() => [window.__colorMap.bg, window.__colorMap.fg]), ['#8A1D34', '#FFFFFF'], 'palette colours (any case, white included)'); } finally { await a.close(); }
  const b = await open({ colors: { bg: '#8A1D34', fg: '#123456' } });
  try { assert.eq(await b.evaluate(() => [window.__colorMap.bg, window.__colorMap.fg]), ['#8A1D34', '#F9FAFA'], 'only the unknown colour falls back'); } finally { await b.close(); }
}, { tags: ['colors'] });

test('colors: the Info glass has a fallback tint for browsers without color-mix()', async ({ open }) => {
  const page = await open({ colors: { bg: '#8A1D34', fg: '#FFFFFF' } });
  try { assert(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-glass').trim()) === 'rgba(138,29,52,.55)', 'the --c-glass fallback is not set'); } finally { await page.close(); }
}, { tags: ['colors'] });
