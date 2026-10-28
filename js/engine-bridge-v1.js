/* The ONE place that touches the compiled app (Nuxt / Vue 2) and the audio engine (Klang). Everything else talks to this module.

   Contract with the bundle (_nuxt/*.js), written down because it is not under our control:
     window.__audioConfig       read by the engine when it boots: which audio config to load (set by the bootstrap script; the phone one is softer)
     window.$nuxt               the Vue root; we emit events on it
       $nuxt.$emit('clavier-clear')    empty the text and the engine's recorded keys, focus the field
       $nuxt.$emit('clavier-replay')   play the typed text again (PLAY)
     <a Vue component>.pianoEngine     found by walking $nuxt.$children
       pianoEngine.soundOnly(key, keyCode)   sound a note for a key the browser already typed (virtual keyboards), without touching the text
     window.Klang.context       the engine's AudioContext (never resumed by the engine itself: see audio-unlock-v1.js)
   If a piece is missing the calls below throw a clear error (the bundle did not boot, or its contract changed). */
export class EngineBridgeError extends Error { constructor(msg) { super('engine-bridge: ' + msg); this.name = 'EngineBridgeError'; } }

const nuxt = () => { if (!window.$nuxt) throw new EngineBridgeError('window.$nuxt is missing: the app bundle did not boot'); return window.$nuxt; };

let pianoEngine = null;
function findPianoEngine() {
  if (pianoEngine) return pianoEngine;
  (function walk(vm) {
    if (pianoEngine || !vm) return;
    if (vm.pianoEngine) { pianoEngine = vm.pianoEngine; return; }
    (vm.$children || []).forEach(walk);
  })(window.$nuxt);
  return pianoEngine;
}

export const engine = {
  /** empties the text field and the engine's key history */
  clear() { nuxt().$emit('clavier-clear'); },
  /** plays the typed text again */
  replay() { nuxt().$emit('clavier-replay'); },
  /** sounds the note of a key that the browser already wrote into the field. Returns false when the engine is not ready (yet). */
  soundOnly(key, keyCode) {
    const eg = findPianoEngine();
    if (!eg) return false;
    if (typeof eg.soundOnly !== 'function') throw new EngineBridgeError('pianoEngine.soundOnly is missing: the bundle contract changed');
    eg.soundOnly(key, keyCode); return true;
  },
  /** the engine's AudioContext, or null before it exists */
  audioContext() { return (window.Klang && window.Klang.context) || null; },
  get ready() { return !!window.$nuxt; },
};
