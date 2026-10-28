/* Clavier colours: pure functions, no DOM, no storage. Loaded as a classic script in <head> (the theme must be on screen before the first
   paint) and importable from Node for tests:  const { create } = require('./colors-v1.js').

   The interface is made of three colours only:
     bg  the page
     fg  ONE colour for the typography, the borders, the icons and the labels
     ph  the placeholder: 100% black or white (whichever contrasts more with bg) laid over bg as a 35% overlay (3.17:1 on the default theme)
   The user picks bg and fg freely from the palette; SHUFFLE draws one of the 100 curated pairs. */
(function (root, factory) {
  var api = { create: factory };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.Clavier = root.Clavier || {}; Object.defineProperty(root.Clavier, 'createColors', { value: factory }); }   /* the browser's only global is Clavier */
})(typeof self !== 'undefined' ? self : this, function create(defaults) {
  'use strict';

  /* The 22 palette swatches. null is the "default" swatch (it puts the role back to the default colour). */
  var PAL = ['#FFFFFF', null, '#EEE6E1', '#CFBFAC', '#4B2A28', '#866A4A', '#AC966A', '#F8E869', '#E3954A', '#D95736', '#8A1D34',
             '#D74CD9', '#CF9ED4', '#A58BDF', '#B4B3E1', '#6194D6', '#7EBFD9', '#D7E2DE', '#626F42', '#223E27', '#80CE56', '#B4CCB5'];
  var PLACEHOLDER_OVERLAY = 0.35;
  var GLASS_ALPHA = 0.55;

  /* The 100 compositions (background, foreground): every ordered pair of the palette's colours that contrasts, ranked by ratio.
     Each unordered pair appears both ways (light on dark and dark on light). Contrast 19.5 down to 4.43; 96 of them are >= 4.5. */
  var PAIRS = [
    ['#FFFFFF','#0B0D0E'], ['#0B0D0E','#FFFFFF'], ['#0B0D0E','#EEE6E1'], ['#EEE6E1','#0B0D0E'], ['#0B0D0E','#F8E869'],
    ['#F8E869','#0B0D0E'], ['#0B0D0E','#D7E2DE'], ['#D7E2DE','#0B0D0E'], ['#FFFFFF','#4B2A28'], ['#4B2A28','#FFFFFF'],
    ['#FFFFFF','#223E27'], ['#223E27','#FFFFFF'], ['#0B0D0E','#B4CCB5'], ['#B4CCB5','#0B0D0E'], ['#0B0D0E','#CFBFAC'],
    ['#CFBFAC','#0B0D0E'], ['#EEE6E1','#4B2A28'], ['#4B2A28','#EEE6E1'], ['#0B0D0E','#80CE56'], ['#80CE56','#0B0D0E'],
    ['#4B2A28','#F8E869'], ['#F8E869','#4B2A28'], ['#0B0D0E','#B4B3E1'], ['#B4B3E1','#0B0D0E'], ['#0B0D0E','#7EBFD9'],
    ['#7EBFD9','#0B0D0E'], ['#EEE6E1','#223E27'], ['#223E27','#EEE6E1'], ['#4B2A28','#D7E2DE'], ['#D7E2DE','#4B2A28'],
    ['#F8E869','#223E27'], ['#223E27','#F8E869'], ['#FFFFFF','#8A1D34'], ['#8A1D34','#FFFFFF'], ['#D7E2DE','#223E27'],
    ['#223E27','#D7E2DE'], ['#0B0D0E','#CF9ED4'], ['#CF9ED4','#0B0D0E'], ['#0B0D0E','#E3954A'], ['#E3954A','#0B0D0E'],
    ['#EEE6E1','#8A1D34'], ['#8A1D34','#EEE6E1'], ['#4B2A28','#B4CCB5'], ['#B4CCB5','#4B2A28'], ['#F8E869','#8A1D34'],
    ['#8A1D34','#F8E869'], ['#CFBFAC','#4B2A28'], ['#4B2A28','#CFBFAC'], ['#8A1D34','#D7E2DE'], ['#D7E2DE','#8A1D34'],
    ['#223E27','#B4CCB5'], ['#B4CCB5','#223E27'], ['#0B0D0E','#A58BDF'], ['#A58BDF','#0B0D0E'], ['#0B0D0E','#AC966A'],
    ['#AC966A','#0B0D0E'], ['#4B2A28','#80CE56'], ['#80CE56','#4B2A28'], ['#CFBFAC','#223E27'], ['#223E27','#CFBFAC'],
    ['#4B2A28','#B4B3E1'], ['#B4B3E1','#4B2A28'], ['#0B0D0E','#6194D6'], ['#6194D6','#0B0D0E'], ['#4B2A28','#7EBFD9'],
    ['#7EBFD9','#4B2A28'], ['#223E27','#80CE56'], ['#80CE56','#223E27'], ['#B4B3E1','#223E27'], ['#223E27','#B4B3E1'],
    ['#7EBFD9','#223E27'], ['#223E27','#7EBFD9'], ['#4B2A28','#CF9ED4'], ['#CF9ED4','#4B2A28'], ['#0B0D0E','#D74CD9'],
    ['#D74CD9','#0B0D0E'], ['#FFFFFF','#626F42'], ['#626F42','#FFFFFF'], ['#CF9ED4','#223E27'], ['#223E27','#CF9ED4'],
    ['#8A1D34','#B4CCB5'], ['#B4CCB5','#8A1D34'], ['#4B2A28','#E3954A'], ['#E3954A','#4B2A28'], ['#CFBFAC','#8A1D34'],
    ['#8A1D34','#CFBFAC'], ['#FFFFFF','#866A4A'], ['#866A4A','#FFFFFF'], ['#0B0D0E','#D95736'], ['#D95736','#0B0D0E'],
    ['#E3954A','#223E27'], ['#223E27','#E3954A'], ['#8A1D34','#80CE56'], ['#80CE56','#8A1D34'], ['#8A1D34','#B4B3E1'],
    ['#B4B3E1','#8A1D34'], ['#8A1D34','#7EBFD9'], ['#7EBFD9','#8A1D34'], ['#4B2A28','#A58BDF'], ['#A58BDF','#4B2A28'],
  ];

  function rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hex(a) { return '#' + a.map(function (v) { v = Math.round(Math.max(0, Math.min(255, v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('').toUpperCase(); }
  /* WCAG relative luminance and contrast ratio */
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(function (i) { return x[i] * t + y[i] * (1 - t); })); }

  function placeholder(bg) { return mix(ratio('#FFFFFF', bg) >= ratio('#000000', bg) ? '#FFFFFF' : '#000000', bg, PLACEHOLDER_OVERLAY); }
  function glass(bg) { return 'rgba(' + rgb(bg).join(',') + ',' + String(GLASS_ALPHA).replace('0.', '.') + ')'; }

  /* Only palette colours are accepted (a hand-edited value, a colour from an old version...): anything else falls back to the default one.
     Returns { bg, fg } with null for "default", or null when nothing is left. */
  function validate(c) {
    if (!c || typeof c !== 'object') return null;
    /* the swatches, plus the two default colours (the default swatch stands for #0B0D0E and SHUFFLE draws it as a real colour, e.g. dark text on light) */
    var ok = function (v) { v = typeof v === 'string' ? v.toUpperCase() : ''; return v && (PAL.indexOf(v) > -1 || v === defaults.bg.toUpperCase() || v === defaults.fg.toUpperCase()); };
    var out = { bg: ok(c.bg) ? c.bg.toUpperCase() : null, fg: ok(c.fg) ? c.fg.toUpperCase() : null };
    return out.bg || out.fg ? out : null;
  }

  /* The full map for a saved / chosen state: an unset colour is the default one, never derived from the other. */
  function resolve(c) {
    c = c || {};
    var bg = c.bg || defaults.bg, fg = c.fg || defaults.fg;
    return { bg: bg, fg: fg, ph: placeholder(bg), glass: glass(bg) };
  }

  /* SHUFFLE: one of the 100 pairs, never the same background twice in a row (the default theme counts as the default bg). */
  function compose(prev, random) {
    random = random || Math.random;
    var prevBg = prev ? (prev.bg || defaults.bg) : null;
    var pool = PAIRS.filter(function (p) { return !prevBg || p[0] !== prevBg; });
    var p = pool[Math.floor(random() * pool.length)];
    return { bg: p[0], fg: p[1] };
  }

  return Object.freeze({ PAL: Object.freeze(PAL.slice()), PAIRS: Object.freeze(PAIRS.map(Object.freeze)), defaults: Object.freeze({ bg: defaults.bg, fg: defaults.fg }),
    ratio: ratio, lum: lum, mix: mix, placeholder: placeholder, glass: glass, validate: validate, resolve: resolve, compose: compose });
});
