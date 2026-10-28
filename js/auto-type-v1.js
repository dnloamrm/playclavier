/* Auto-jam. Types a poem into the field one real key at a time (a genuine keydown per character, so the engine plays the same MIDI step as for a
   user keystroke). The poem is always typed to its final full stop; it only stops when the user types, clicks elsewhere, starts a new Auto-jam or
   presses the button again. Modifier keys and shortcuts (screenshots, copy) never interrupt it. */
import { CONCEPTS, PAUSE_CHARS, PAUSE_MIN, PAUSE_MAX } from './poems-v1.js';
import { engine } from './engine-bridge-v1.js';
import { field } from './dom-v1.js';
import { dispatch } from './state-v1.js';

const CODES = { '.': 190, ',': 188, ';': 186, "'": 222, '-': 189, '?': 191, '!': 49, ':': 186 };
const MODIFIERS = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'CapsLock', 'Fn', 'FnLock', 'ContextMenu'];

let conceptBag = [], lastConcept = -1;
const poemBags = {};
let timer = null, running = false, runId = 0, idx = 0, text = '', current = null;

const shuffle = (a) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)), x = a[k]; a[k] = a[j]; a[j] = x; } return a; };

function pickConcept() {
  const usable = CONCEPTS.map((c, i) => (c.poems.length ? i : -1)).filter((i) => i > -1);
  if (!usable.length) return null;                                          /* no usable poem: the caller does nothing instead of throwing */
  if (!conceptBag.length) {
    conceptBag = shuffle(usable.slice());
    if (conceptBag.length > 1 && conceptBag[conceptBag.length - 1] === lastConcept) conceptBag.unshift(conceptBag.pop());   /* never the same concept twice in a row */
  }
  lastConcept = conceptBag.pop(); return CONCEPTS[lastConcept];
}
function pickPoem(c) {
  let bag = poemBags[c.id];
  if (!bag || !bag.length) poemBags[c.id] = bag = shuffle(c.poems.map((_, i) => i));
  return c.poems[bag.pop()];
}
function keyInfo(ch) {
  if (ch === '\n') return { key: 'Enter', code: 'Enter', kc: 13 };
  const kc = /[a-z]/i.test(ch) ? ch.toUpperCase().charCodeAt(0) : (CODES[ch] || ch.charCodeAt(0));
  return { key: ch, code: '', kc };
}
function gap(ch) {
  let d = current.delay + (Math.random() * 2 - 1) * current.randomVariation;
  if (PAUSE_CHARS.indexOf(ch) > -1) d += PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN);
  return Math.max(40, d);
}

export function stopAuto() {
  runId++; if (timer) { clearTimeout(timer); timer = null; }
  running = false; dispatch({ type: 'auto/stop' });
}

function step(id) {
  timer = null;
  if (!running || id !== runId) return;
  const t = field();
  if (!t || idx >= text.length) { running = false; dispatch({ type: 'auto/stop' }); return; }
  const ch = text.charAt(idx++), k = keyInfo(ch);
  t.dispatchEvent(new KeyboardEvent('keydown', { key: k.key, code: k.code, keyCode: k.kc, which: k.kc, bubbles: true, cancelable: true }));
  if (t !== document.activeElement) t.focus({ preventScroll: true });
  if (!document.execCommand('insertText', false, ch)) { t.value += ch; t.dispatchEvent(new Event('input', { bubbles: true })); }
  timer = setTimeout(() => step(id), gap(ch));
}

/** starts Auto-jam (a given concept id, or the next one of the shuffled bag) */
export function startAuto(conceptId) {
  stopAuto();
  const forced = conceptId && CONCEPTS.filter((c) => c.id === conceptId)[0];
  current = forced && forced.poems.length ? forced : pickConcept();
  if (!current) return;
  text = pickPoem(current); idx = 0;
  engine.clear();
  const t = field(); if (t) t.focus({ preventScroll: true });
  running = true; dispatch({ type: 'auto/start' });
  const id = runId; timer = setTimeout(() => step(id), 450);
}

export const isAutoRunning = () => running;

export function initAutoType() {
  window.addEventListener('keydown', (e) => {
    if (!running || !e.isTrusted) return;
    if (MODIFIERS.indexOf(e.key) > -1 || e.key === 'Tab') return;
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#ui')) return;   /* keys that operate a button are not typing */
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    stopAuto();
  }, true);
  window.addEventListener('pointerdown', (e) => {
    if (running && e.isTrusted && !(e.target.closest && e.target.closest('#t-auto'))) stopAuto();
  }, true);
}
