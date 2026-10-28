'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, click, openTools, typeInto } = require('../lib/browser');

const LINK = 'https://playclavier.vercel.app';

test('share (phone, native files, nothing played): the PNG card (1080x1920) is handed to the share sheet at once, with title and link', async ({ open }) => {
  const page = await open({ width: 390, height: 844, mobile: true, shareSpy: 'files' });
  try {
    await page.evaluate(() => { document.querySelector('textarea').value = 'Clair de lune, un peu de clarte'; });   // set, not typed: no session, so no clip
    await openTools(page);
    await page.evaluate(() => { window.__t0 = performance.now(); document.getElementById('t-share').click(); });
    const r = await page.evaluate(async () => {
      const d = window.__shared; if (!d || !d.files || !d.files[0]) return { none: true };
      const f = d.files[0], bm = await createImageBitmap(f);
      const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0);
      const px = (a, b) => Array.from(x.getImageData(a, b, 1, 1).data.slice(0, 3));
      return { ms: Math.round(window.__sharedAt - window.__t0), type: f.type, w: bm.width, h: bm.height, title: d.title, text: d.text, outer: px(10, 10), card: px(540, 960), toast: getComputedStyle(document.getElementById('toast')).display };
    });
    assert(!r.none, 'the share sheet received no file');
    assert(r.type === 'image/png' && r.w === 1080 && r.h === 1920, `image: ${r.type} ${r.w}x${r.h}`);
    assert(r.ms < 250, 'the sheet opened after ' + r.ms + ' ms');
    assert(r.title === 'Clavier' && r.text === LINK, `title/text: ${r.title} / ${r.text}`);
    assert(r.toast === 'none', 'a note is shown on phones');
    assert(r.outer.join() !== r.card.join(), 'canvas and card have the same colour');
  } finally { await page.close(); }
}, { tags: ['share'] });

test('share (phone): after playing, the sheet receives a VIDEO clip with sound; NEW throws it away (the next share is the card); a new session gets its own clip', async ({ open }) => {
  const page = await open({ width: 390, height: 844, mobile: true, shareSpy: 'files' });
  try {
    const shared = async () => { await page.evaluate(() => { window.__shared = null; document.getElementById('t-share').click(); }); await sleep(1800); return page.evaluate(() => { const d = window.__shared; return d && d.files && d.files[0] ? { type: d.files[0].type, name: d.files[0].name, size: d.files[0].size } : null; }); };
    await typeInto(page, 'hello world', 110); await openTools(page);
    const v = await shared();
    assert(v && /^video\//.test(v.type) && v.size > 10000, 'no video after playing: ' + JSON.stringify(v));
    await click(page, 't-new'); await sleep(2300);
    const p = await shared();
    assert(p && p.type === 'image/png', 'after NEW the share must be the card, got ' + JSON.stringify(p));
    await page.evaluate(() => document.querySelector('textarea').focus()); await page.keyboard.type('second', { delay: 120 }); await sleep(300);
    const v2 = await shared();
    assert(v2 && /^video\//.test(v2.type), 'the new session has no clip: ' + JSON.stringify(v2));
    assert(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
  } finally { await page.close(); }
}, { tags: ['share'] });

test('share (phone without the Web Share API): copies the link, no note', async ({ open }) => {
  const page = await open({ width: 390, height: 844, mobile: true, shareSpy: 'none' });
  try {
    await openTools(page); await click(page, 't-share'); await sleep(300);
    assert(await page.evaluate(() => window.__copied) === LINK, 'link was not copied');
    assert(await page.evaluate(() => getComputedStyle(document.getElementById('toast')).display) === 'none', 'a note is shown on phones');
  } finally { await page.close(); }
}, { tags: ['share'] });

test('share (desktop without the Web Share API): copies the link and shows "Link copied" 40px above the button, then hides it', async ({ open }) => {
  const page = await open({ shareSpy: 'none' });
  try {
    await openTools(page); await click(page, 't-share'); await sleep(250);
    assert(await page.evaluate(() => window.__copied) === LINK, 'link was not copied');
    const m = await page.evaluate(() => { const t = document.getElementById('toast').getBoundingClientRect(), s = document.getElementById('t-share').getBoundingClientRect(), e = document.getElementById('toast'); return { text: e.textContent, above: s.top - t.bottom, dx: (t.left + t.width / 2) - (s.left + s.width / 2), border: getComputedStyle(e).borderTopWidth, bg: getComputedStyle(e).backgroundColor }; });
    assert(m.text === 'Link copied', m.text); assert.near(m.above, 40, 1, 'distance above the button'); assert.near(m.dx, 0, 1, 'centred on the button');
    assert(m.border === '0px' && m.bg === 'rgba(0, 0, 0, 0)', 'the note has a box');
    await sleep(2400);
    assert(await page.evaluate(() => getComputedStyle(document.getElementById('toast')).display) === 'none', 'the note stays');
  } finally { await page.close(); }
}, { tags: ['share'] });

test('share (desktop where navigator.share exists, e.g. Safari/macOS, Edge): copies the link, no native sheet, no image', async ({ open }) => {
  const page = await open({ shareSpy: 'files' });
  try {
    await openTools(page); await click(page, 't-share'); await sleep(300);
    assert(await page.evaluate(() => window.__shared) == null, 'the native share sheet was opened on desktop');
    assert(await page.evaluate(() => window.__copied) === LINK, 'link was not copied');
  } finally { await page.close(); }
}, { tags: ['share'] });
