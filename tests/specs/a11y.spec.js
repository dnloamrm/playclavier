'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, click, openTools, classes, text, typeInto } = require('../lib/browser');

const ring = (page) => page.evaluate(() => { const a = document.activeElement, c = getComputedStyle(a); return { id: a.id || a.tagName, ring: c.outlineStyle === 'solid' && parseFloat(c.outlineWidth) >= 1, visible: a.matches(':focus-visible') }; });
// Tab (like a keyboard user) until the wanted control has the focus
const tabTo = async (page, id) => { for (let i = 0; i < 14; i++) { if ((await page.evaluate(() => document.activeElement.id)) === id) return; await page.keyboard.press('Tab'); await sleep(70); } throw new Error('Tab never reached ' + id); };
const startFromField = async (page) => { await openTools(page); await page.evaluate(() => document.querySelector('textarea').focus()); await sleep(250); };

test('keyboard: Tab walks every control in order and each one shows a focus ring', async ({ open }) => {
  const page = await open({});
  try {
    await startFromField(page);
    const seq = [];
    for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); await sleep(80); seq.push(await ring(page)); }
    assert.eq(seq.map((s) => s.id), ['t-new', 't-play', 't-auto', 't-fill', 't-text', 't-rand', 't-share', 't-plus', 't-info'], 'Tab order');
    seq.forEach((s) => assert(s.ring && s.visible, `${s.id} shows no focus ring when reached by keyboard`));
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('keyboard: Enter and Space press the focused button (the whole dock works without a mouse)', async ({ open }) => {
  const page = await open({});
  try {
    await typeInto(page, 'abc');
    await startFromField(page);
    // NEW (Enter) clears the text
    await tabTo(page, 't-new'); await page.keyboard.press('Enter'); await sleep(350);
    assert(await text(page) === '', 'Enter on NEW did not clear the text');
    // PLAY (Space) must not type a space into the field
    await tabTo(page, 't-play'); await page.keyboard.press('Space'); await sleep(300);
    assert(await text(page) === '', 'Space on PLAY was typed into the field: "' + await text(page) + '"');
    // AUTO-JAM (Enter) starts the generator, a second press stops it
    await tabTo(page, 't-auto'); await page.keyboard.press('Enter'); await sleep(900);
    assert((await classes(page)).auto, 'Enter on AUTO-JAM did not start it');
    await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(500);   // stop it (by pointer) so the next steps start clean
    // THEME (Space) opens the palette
    await tabTo(page, 't-fill'); await page.keyboard.press('Space'); await sleep(250);
    assert((await classes(page)).palette, 'Space on THEME did not open the palette');
    // SHUFFLE (Enter) changes the colours
    const before = await page.evaluate(() => JSON.stringify(window.__colorMap));
    await tabTo(page, 't-rand'); await page.keyboard.press('Enter'); await sleep(250);
    assert(await page.evaluate(() => JSON.stringify(window.__colorMap)) !== before, 'Enter on SHUFFLE did not change the colours');
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('keyboard: with a button focused no key is redirected; with nothing focused text keys go to the field; Tab never types', async ({ open }) => {
  const page = await open({});
  try {
    await startFromField(page);
    await tabTo(page, 't-new');
    await page.keyboard.type('xy', { delay: 60 }); await sleep(200);
    assert(await text(page) === '', 'letters were redirected to the field while a button had the focus: "' + await text(page) + '"');
    assert(await page.evaluate(() => document.activeElement.id) === 't-new', 'the focus left the button');
    await page.evaluate(() => document.activeElement.blur()); await sleep(100);
    await page.keyboard.type('ab', { delay: 60 }); await sleep(200);
    assert(await text(page) === 'ab', 'with nothing focused the letters must reach the field: "' + await text(page) + '"');
    await page.keyboard.press('Tab'); await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift'); await sleep(100);
    assert(await text(page) === 'ab', 'Tab typed something');
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('keyboard: Esc closes the Info (only), keeps the tools open and returns the focus to the "i" button', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page); await click(page, 't-info'); await sleep(400);
    assert((await classes(page)).info, 'Info did not open');
    await page.keyboard.press('Escape'); await sleep(300);
    const c = await classes(page);
    assert(!c.info, 'Esc did not close the Info'); assert(c.tools, 'Esc also closed the tools');
    assert(await page.evaluate(() => document.activeElement.id) === 't-info', 'focus is on ' + await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
    await page.keyboard.press('Escape'); await sleep(300);
    assert(!(await classes(page)).tools, 'a second Esc does not close the tools');
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('keyboard: a mouse click or a tap never leaves a focus ring', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page);
    for (const id of ['t-new', 't-play', 't-auto', 't-fill', 't-text']) {
      const r = await page.evaluate((i) => { const b = document.getElementById(i).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, id);
      await page.mouse.click(r[0], r[1]); await sleep(150);
      const f = await page.evaluate(() => { const a = document.activeElement, c = getComputedStyle(a); return c.outlineStyle !== 'none' && a.id !== 'info-view'; });
      assert(!f, 'a ring is visible after clicking ' + id);
      if (id === 't-auto') { await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(300); }
    }
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('a11y: landmarks and names (main, h1, field label, Info as a modal dialog with the page behind it inert)', async ({ open }) => {
  const page = await open({});
  try {
    const a = await page.evaluate(() => { const ta = document.querySelector('textarea'), h1 = document.querySelector('main > h1'), r = h1 && h1.getBoundingClientRect(); return { label: ta.getAttribute('aria-label'), main: !!document.querySelector('main #ui'), h1: h1 && h1.textContent, h1Hidden: !!r && r.width <= 1 && r.height <= 1, dlg: document.getElementById('info-view').getAttribute('role') + '/' + document.getElementById('info-view').getAttribute('aria-modal') }; });
    assert(a.label === 'Type to play', 'field label: ' + a.label); assert(a.main, 'no <main> around the interface'); assert(a.h1 === 'Clavier' && a.h1Hidden, 'visually hidden h1 missing'); assert(a.dlg === 'dialog/true', 'Info is not a modal dialog: ' + a.dlg);
    await openTools(page); await click(page, 't-info'); await sleep(300);
    const o = await page.evaluate(() => { const n = document.getElementById('__nuxt'); return { hidden: n.getAttribute('aria-hidden'), inert: n.inert, dockInert: !!document.getElementById('dock').closest('[inert]') }; });
    assert(o.hidden === 'true' && o.inert, 'the page behind the Info is reachable'); assert(!o.dockInert, 'the dock became inert too');
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('a11y: the "+" button keeps one static name and exposes its state with aria-expanded; "i" has no pressed state or label swap', async ({ open }) => {
  const page = await open({});
  try {
    const read = () => page.evaluate(() => { const p = document.getElementById('t-plus'), i = document.getElementById('t-info'); return { plus: p.getAttribute('aria-label') + '|' + p.getAttribute('aria-expanded') + '|' + p.hasAttribute('aria-pressed'), info: i.getAttribute('aria-label') + '|' + i.hasAttribute('aria-pressed') }; });
    const closed = await read(); await openTools(page); const open_ = await read();
    assert(closed.plus.split('|')[0] === open_.plus.split('|')[0], 'the "+" label changes with its state (' + closed.plus + ' -> ' + open_.plus + ')');
    assert(closed.plus.split('|')[1] === 'false' && open_.plus.split('|')[1] === 'true', 'aria-expanded does not follow the state');
    assert(closed.plus.split('|')[2] === 'false', 'the "+" button has aria-pressed');
    await click(page, 't-info'); await sleep(250); const info = await read();
    assert(info.info === closed.info && info.info.endsWith('|false'), '"i" announces a state or swaps its label: ' + info.info);
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('a11y: the palette is a group of toggle buttons (not a listbox) and the dock is not a toolbar without arrow-key support', async ({ open }) => {
  const page = await open({});
  try {
    await openTools(page); await click(page, 't-fill'); await sleep(200);
    const r = await page.evaluate(() => ({ pal: document.getElementById('palette').getAttribute('role'), opt: document.querySelector('#palette button').getAttribute('role'), pressed: document.querySelector('#palette button').hasAttribute('aria-pressed'), tb: document.getElementById('dock').getAttribute('role') }));
    assert(r.pal !== 'listbox' && r.opt !== 'option' && r.pressed, `palette semantics: ${r.pal}/${r.opt}, aria-pressed ${r.pressed}`);
    assert(r.tb !== 'toolbar', 'the dock is a toolbar but has no arrow-key navigation');
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('a11y: the live document keeps the static head (viewport-fit=cover, zoomable, theme-color #0B0D0E) after the app boots', async ({ open }) => {
  const page = await open({});
  try {
    const m = await page.evaluate(() => ({ vp: document.querySelector('meta[name=viewport]').content, tc: document.querySelector('meta[name=theme-color]').content }));
    assert(/viewport-fit=cover/.test(m.vp), 'viewport-fit=cover was lost: ' + m.vp); assert(!/user-scalable=no/.test(m.vp), 'zoom is blocked: ' + m.vp); assert(m.tc.toUpperCase() === '#0B0D0E', 'theme-color is ' + m.tc);
  } finally { await page.close(); }
}, { tags: ['a11y'] });

test('keyboard: AUTO-JAM can be stopped from the keyboard (Tab to it, Enter) without being restarted', async ({ open }) => {
  const page = await open({});
  try {
    await startFromField(page);
    await tabTo(page, 't-auto'); await page.keyboard.press('Enter'); await sleep(900);
    assert((await classes(page)).auto, 'Enter on AUTO-JAM did not start it');
    await tabTo(page, 't-auto'); await page.keyboard.press('Enter'); await sleep(600);
    assert(!(await classes(page)).auto, 'AUTO-JAM is running again: the Tab that moved the focus counted as typing and stopped it, then Enter restarted it');
  } finally { await page.close(); }
}, { tags: ['a11y'], knownFailing: 'any trusted key, Tab included, stops Auto-jam; so a keyboard user cannot stop it with its own button (auto-type handler)' });
