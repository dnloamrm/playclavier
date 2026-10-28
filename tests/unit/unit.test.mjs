// Pure-logic tests: no browser. Run with  node --test tests/unit   (Node 20+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { reduce, createStore, initial } from '../../js/state-v1.js';
import { CONCEPTS, estimateMs, MIN_MS } from '../../js/poems-v1.js';

const require = createRequire(import.meta.url);
const { create } = require('../../js/colors-v1.js');
const colors = create({ bg: '#0B0D0E', fg: '#F9FAFA' });

test('colors: 100 unique palette-only pairs, contrast >= 4.43', () => {
  assert.equal(colors.PAIRS.length, 100);
  assert.equal(new Set(colors.PAIRS.map((p) => p.join())).size, 100);
  const pal = colors.PAL.filter(Boolean).concat('#0B0D0E');   // the default swatch is the dark default colour
  colors.PAIRS.forEach(([bg, fg]) => { assert.ok(pal.includes(bg) && pal.includes(fg)); assert.ok(colors.ratio(bg, fg) >= 4.43, bg + ' ' + fg); });
});

test('colors: compose never repeats the effective previous background (the default theme counts)', () => {
  let prev = { bg: null, fg: null };
  for (let i = 0; i < 3000; i++) {
    const effective = prev.bg || '#0B0D0E', next = colors.compose(prev);
    assert.notEqual(next.bg, effective);
    prev = i % 40 === 0 ? { bg: null, fg: null } : next;
  }
});

test('colors: compose is deterministic with an injected random source and reaches the whole pool', () => {
  assert.deepEqual(colors.compose(null, () => 0), colors.PAIRS[0] ? { bg: colors.PAIRS[0][0], fg: colors.PAIRS[0][1] } : null);
  const seen = new Set(); for (let i = 0; i < 100; i++) seen.add(colors.compose(null, () => i / 100).bg + colors.compose(null, () => i / 100).fg);
  assert.ok(seen.size > 50);
});

test('colors: validate keeps palette colours (any case, white included), drops the rest', () => {
  assert.deepEqual(colors.validate({ bg: '#8a1d34', fg: '#FFFFFF' }), { bg: '#8A1D34', fg: '#FFFFFF' });
  assert.deepEqual(colors.validate({ bg: '#8A1D34', fg: '#123456' }), { bg: '#8A1D34', fg: null });
  assert.equal(colors.validate({ bg: 'red', fg: 12 }), null);
  assert.equal(colors.validate('x'), null); assert.equal(colors.validate(null), null);
});

test('colors: resolve gives the default for an unset role and a placeholder with >= 3:1 on the default theme', () => {
  const d = colors.resolve({});
  assert.deepEqual([d.bg, d.fg, d.ph], ['#0B0D0E', '#F9FAFA', '#606262']);
  assert.ok(colors.ratio(d.ph, d.bg) >= 3);
  assert.equal(colors.resolve({ bg: '#8A1D34' }).fg, '#F9FAFA');                  // never derived from the other colour
  assert.equal(colors.resolve({ bg: '#8A1D34', fg: '#FFFFFF' }).glass, 'rgba(138,29,52,.55)');
});

test('state: every transition of the machine', () => {
  const s = (o) => ({ ...initial, ...o });
  assert.deepEqual(reduce(initial, { type: 'tools/open' }), s({ tools: true }));
  assert.deepEqual(reduce(s({ tools: true, palette: 'bg' }), { type: 'tools/close' }), initial);
  assert.deepEqual(reduce(initial, { type: 'tools/toggle' }), s({ tools: true }));
  assert.equal(reduce(initial, { type: 'palette/toggle', mode: 'bg' }), initial);                               // needs the tools open
  assert.deepEqual(reduce(s({ tools: true }), { type: 'palette/toggle', mode: 'bg' }), s({ tools: true, palette: 'bg' }));
  assert.deepEqual(reduce(s({ tools: true, palette: 'bg' }), { type: 'palette/toggle', mode: 'fg' }), s({ tools: true, palette: 'fg' }));
  assert.deepEqual(reduce(s({ tools: true, palette: 'bg' }), { type: 'palette/toggle', mode: 'bg' }), s({ tools: true }));
  assert.deepEqual(reduce(s({ tools: true }), { type: 'info/open' }), s({ tools: true, info: true }));
  assert.deepEqual(reduce(s({ tools: true, info: true }), { type: 'home' }), initial);                          // X: the Info page too
  assert.deepEqual(reduce(s({ tools: true, info: true }), { type: 'escape' }), s({ tools: true }));            // Esc: only the Info
  assert.deepEqual(reduce(s({ tools: true, palette: 'fg' }), { type: 'escape' }), initial);                     // Esc without Info: the tools (and the palette)
  assert.deepEqual(reduce(initial, { type: 'auto/start' }), s({ auto: true }));
  assert.equal(reduce(initial, { type: 'auto/stop' }), initial);
  assert.equal(reduce(initial, { type: 'nope' }), initial);
});

test('state: the store notifies only on real changes and hands over (state, previous, event)', () => {
  const store = createStore(); const seen = [];
  store.subscribe((n, p, e) => seen.push([n.tools, p.tools, e.type]));
  store.dispatch({ type: 'tools/open' }); store.dispatch({ type: 'tools/open' }); store.dispatch({ type: 'home' });
  assert.deepEqual(seen, [[true, false, 'tools/open'], [false, true, 'home']]);
  assert.throws(() => { store.state.tools = true; });                                                         // frozen
});

test('poems: every poem is complete, ends with ONE full stop and lasts >= MIN_MS', () => {
  assert.equal(CONCEPTS.length, 3);
  CONCEPTS.forEach((c) => { assert.ok(c.poems.length >= 3); c.poems.forEach((p) => { assert.match(p, /[^.]\.$/); assert.ok(estimateMs(c, p) >= MIN_MS, c.id); }); });
});

test('colors: every SHUFFLE pair survives a save + reload (validate keeps all of them)', () => {
  colors.PAIRS.forEach(([bg, fg]) => assert.deepEqual(colors.validate({ bg, fg }), { bg, fg }, bg + ' ' + fg));
});
