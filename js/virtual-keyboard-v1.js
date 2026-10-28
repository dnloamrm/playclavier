/* Virtual (phone) keyboards often report key "Unidentified" / keyCode 229 on keydown, so the engine would not hear them. When a character
   arrives through an input event without a matching real keydown, ask the engine for the note (or, for Backspace, replay the key and restore
   the native text). Only on the phone layout. */
import { engine } from './engine-bridge-v1.js';
import { isMobile } from './dom-v1.js';

let lastGood = 0;
export function initVirtualKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key && e.key !== 'Unidentified' && e.keyCode !== 229) lastGood = Date.now();   /* includes Auto-jam's own keydowns */
  }, true);
  document.addEventListener('input', (e) => {
    const t = e.target; if (!isMobile() || !t || t.tagName !== 'TEXTAREA' || !e.isTrusted) return;
    if (Date.now() - lastGood < 120) return;
    const key = e.inputType === 'insertText' && e.data && e.data.length === 1 ? e.data : e.inputType === 'deleteContentBackward' ? 'Backspace' : null;
    if (!key) return;
    /* A typed character: the browser already wrote it, so only ask the engine for the note (it records the key for Play, but never touches the
       text, which is what used to give "Hlo" instead of "Hello"). */
    if (key !== 'Backspace') { try { if (engine.soundOnly(key, key.toUpperCase().charCodeAt(0))) return; } catch (err) { /* fall through to the replay */ } }
    /* Backspace (or no engine yet): replay the key and restore the native text. */
    const v = t.value, a = t.selectionStart, z = t.selectionEnd;
    t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    setTimeout(() => {
      if (t.value === v) return;
      t.value = v; try { t.setSelectionRange(a, z); } catch (_) { /* no selection to restore */ }
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }, 60);
  }, true);
}
