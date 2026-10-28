/* The buttons: what each one asks the state machine, the engine or Auto-jam to do. No state of their own. */
import { byId, field } from './dom-v1.js';
import { store, dispatch } from './state-v1.js';
import { engine } from './engine-bridge-v1.js';
import { startAuto, stopAuto } from './auto-type-v1.js';

export function initControls() {
  /* "+" opens the tools; once open it is the "X": it always lands on the home screen, the Info page included */
  byId('t-plus').addEventListener('click', () => dispatch(store.state.tools ? { type: 'home' } : { type: 'tools/open' }));
  /* "i" only opens the Info: pressing it again does not send you back to the writing screen (X goes home, NEW starts a new text) */
  byId('t-info').addEventListener('click', () => dispatch({ type: 'info/open' }));
  byId('t-fill').addEventListener('click', () => dispatch({ type: 'palette/toggle', mode: 'bg' }));
  byId('t-text').addEventListener('click', () => dispatch({ type: 'palette/toggle', mode: 'fg' }));
  byId('t-play').addEventListener('click', () => engine.replay());
  byId('t-auto').addEventListener('click', () => {
    if (store.state.auto) { stopAuto(); engine.clear(); }                    /* pressed again: stop and go back to the default (empty) state */
    else startAuto();
  });
  byId('t-new').addEventListener('click', () => {
    dispatch({ type: 'info/close', via: 'new' });                            /* NEW over the Info: close it and get back to the writing screen */
    stopAuto(); engine.clear();
    const ta = field(); if (ta) ta.focus({ preventScroll: true });
  });
  /* the buttons never steal the focus from the field with a mouse or a touch (the keyboard stays up) */
  const keepFocus = (e) => { if (e.target.closest('#ui button')) e.preventDefault(); };
  document.addEventListener('mousedown', keepFocus);
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') keepFocus(e); });
}
