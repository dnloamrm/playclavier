/* Clavier picks: which piano (recorded sample bank) and which piece the keyboard plays in this visit. Pure functions, no DOM: loaded as a
   classic script in <head> (the engine reads the choice when it boots) and importable from Node for tests:  const { create } = require('./picks-v1.js').

   Every page load draws one piano and one piece, each independently, and never the one of the previous visit. */
(function (root, factory) {
  var api = { create: factory };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.Clavier = root.Clavier || {}; Object.defineProperty(root.Clavier, 'createPicks', { value: factory }); }
})(typeof self !== 'undefined' ? self : this, function create() {
  'use strict';

  /* config: the audio config of the bank (the phone one has softer envelopes: config.<id>.mobile.js). The first one keeps the original file names. */
  var PIANOS = [
    { id: 'sal', name: 'Salamander Grand (Yamaha C5)', config: 'audio/config.js', mobile: 'audio/config.mobile.js' },
    { id: 'upr', name: 'Upright KW (Kawai upright)', config: 'audio/config.upr.js', mobile: 'audio/config.upr.mobile.js' },
    { id: 'spl', name: 'Splendid Grand (Steinway)', config: 'audio/config.spl.js', mobile: 'audio/config.spl.mobile.js' },
    { id: 'hdr', name: 'Headroom Piano (Yamaha C3)', config: 'audio/config.hdr.js', mobile: 'audio/config.hdr.mobile.js' },
    { id: 'kaw', name: 'Kawai Grand (VCSL)', config: 'audio/config.kaw.js', mobile: 'audio/config.kaw.mobile.js' },
    { id: 'knt', name: 'Knight Upright (VCSL)', config: 'audio/config.knt.js', mobile: 'audio/config.knt.mobile.js' }
  ];
  var SONGS = [
    { id: 'clair', name: 'Clair de lune (Debussy)', file: 'clair-de-lune-v1.mid' },
    { id: 'gymnopedie', name: 'Gymnopédie No. 1 (Satie)', file: 'gymnopedie-1-v1.mid' },
    { id: 'raindrop', name: 'Prelude Op. 28 No. 15, Raindrop (Chopin)', file: 'raindrop-v1.mid' },
    { id: 'prelude', name: 'Prelude in C, BWV 846 (Bach)', file: 'prelude-in-c-v1.mid' },
    { id: 'elise', name: 'Für Elise (Beethoven)', file: 'fur-elise-v1.mid' },
    { id: 'arabesque', name: 'Arabesque No. 1 (Debussy)', file: 'arabesque-1-v1.mid' }
  ];

  function drawFrom(list, lastId, random) {
    var pool = list.filter(function (x) { return x.id !== lastId; });
    return pool[Math.floor(random() * pool.length)];
  }

  /* last: { piano, song } ids of the previous visit (anything else is ignored). Returns the new { piano, song } entries. */
  function choose(last, random) {
    random = random || Math.random;
    last = last && typeof last === 'object' ? last : {};
    return { piano: drawFrom(PIANOS, last.piano, random), song: drawFrom(SONGS, last.song, random) };
  }

  return Object.freeze({ PIANOS: Object.freeze(PIANOS.slice()), SONGS: Object.freeze(SONGS.slice()), choose: choose });
});
