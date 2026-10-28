/* Audio patches that must exist BEFORE the engine builds its graph, so this is a classic script in <head> (not a module), and it must not move.

   WARNING: both patches below modify global browser prototypes (HTMLMediaElement.prototype.canPlayType and AudioNode.prototype.connect).
   They are the only global patches in the project; tests/specs/audio.spec.js watches the graph they build.

   1. Safari: pretend it cannot play Ogg / Opus / Vorbis, so the engine picks the MP3 samples (Safari's Ogg support is partial).
   2. Phones: every sound goes through a master chain  low-pass 3800 Hz -> compressor -> gain -4 dB -> speakers  (phone speakers distort easily).
      The signal that finally reaches the speakers is also copied into an in-memory MediaStream, exposed as Clavier.audioTap: the Share clip
      (js/share-clip-v1.js) reads it during the first 10 s of a session. Nothing is recorded by the tap alone. */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var safari = /iPad|iPhone|iPod/.test(ua) || (/^((?!chrome|android|crios|fxios).)*safari/i.test(ua));
  if (safari) { var canPlay = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (t) { return /ogg|opus|vorbis/i.test(t) ? '' : canPlay.call(this, t); }; }

  if (!window.Clavier || !window.Clavier.device.phone) return;

  /* the tap: wraps connect() first, so the chain below (which wraps this) delivers its OUTPUT here */
  var taps = new WeakMap(), base = AudioNode.prototype.connect, tapNode = null;
  Object.defineProperty(window.Clavier, 'audioTap', { get: function () { return tapNode; }, enumerable: true });
  AudioNode.prototype.connect = function (dest) {
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) {
      try {
        var ctx = dest.context, t = taps.get(ctx);
        if (!t && ctx.createMediaStreamDestination) { t = ctx.createMediaStreamDestination(); taps.set(ctx, t); tapNode = t; }
        if (t) base.call(this, t);
      } catch (e) {}
    }
    return base.apply(this, arguments);
  };

  /* the master chain */
  var chains = new WeakMap(), rawConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest) {
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && !this.__clavierMaster) {
      var ctx = dest.context, chain = chains.get(ctx);
      if (!chain) {
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800; lp.Q.value = 0.7;
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -24; comp.knee.value = 30; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
        var gain = ctx.createGain(); gain.gain.value = Math.pow(10, -4 / 20);
        lp.__clavierMaster = comp.__clavierMaster = gain.__clavierMaster = true;   /* marks our own nodes so they are not routed through themselves */
        rawConnect.call(lp, comp); rawConnect.call(comp, gain); rawConnect.call(gain, dest);
        chain = lp; chains.set(ctx, chain);
      }
      var rest = Array.prototype.slice.call(arguments, 1);
      return rawConnect.apply(this, [chain].concat(rest)), dest;
    }
    return rawConnect.apply(this, arguments);
  };
})();
