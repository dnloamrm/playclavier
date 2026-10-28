/* The engine never resumes its AudioContext, so mobile browsers keep it suspended (no sound). This module resumes it inside real gestures and
   opens a "playback" audio session so the iOS silent switch does not mute the piano.

   It stays armed for the whole session: if the system interrupts the audio later (share sheet, call, notification, lock screen) the NEXT gesture
   brings it back instead of leaving the piano silent. It does nothing on desktop browsers that never suspend the context. */
import { engine } from './engine-bridge-v1.js';
import { isMobile, onLayout } from './dom-v1.js';

const EVENTS = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'keydown', 'input'];
let silent = null, sessionSet = false, tries = 0, done = false, armed = false;

function silentClip() {
  /* 1 s of 8-bit silence (a zero-length looped clip would spin the media pipeline) */
  const n = 8000, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true);
  dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
  const a = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
  a.loop = true; a.setAttribute('playsinline', ''); return a;
}

export function unlockAudio() {
  if (done) {
    const k = engine.audioContext();
    if (k && k.state === 'running' && silent && !silent.paused) return;   /* still fine */
    done = false; tries = 0;                                               /* interrupted since: unlock again */
  }
  try {
    if (!sessionSet && navigator.audioSession) { navigator.audioSession.type = 'playback'; sessionSet = true; }
    const c = engine.audioContext();
    if (c && c.state !== 'running') {
      c.resume();
      const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
    }
    if (!silent) silent = silentClip();
    if (silent.paused && tries < 12) { tries++; const pr = silent.play(); if (pr && pr.catch) pr.catch(() => {}); }
    if (c && c.state === 'running' && !silent.paused) done = true;
  } catch (e) { /* a gesture can arrive before the engine exists: the next one retries */ }
}

function arm() { if (armed) return; armed = true; EVENTS.forEach((n) => document.addEventListener(n, unlockAudio, true)); }
function disarm() { if (!armed) return; armed = false; EVENTS.forEach((n) => document.removeEventListener(n, unlockAudio, true)); }

export function initAudioUnlock() {
  const sync = () => (isMobile() ? arm() : disarm());
  sync(); onLayout(sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && isMobile()) unlockAudio(); });
}
