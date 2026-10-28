/* Keyboard and focus. Three rules, in one place:
   1. The field has the focus from the start. Only keys that PRODUCE TEXT (a character, Backspace, Enter) go back to it, and never while a button of
      #ui has the focus: Tab, Enter, Space and the arrows belong to the button then.
   2. While the Info is open the keyboard does not play or type into the app behind it; the controls stay operable.
   3. Esc: with the Info open it closes only the Info (the tools stay open and the focus goes back to the "i" button); otherwise it closes the tools. */
import { byId, field } from './dom-v1.js';
import { store, dispatch } from './state-v1.js';
import { stopAuto } from './auto-type-v1.js';

function grabField() {
  const ta = field(); if (!ta) return false;
  if (document.activeElement !== ta) ta.focus({ preventScroll: true });
  return true;
}

function onKeydown(e) {
  const inUi = !!(e.target && e.target.closest && e.target.closest('#ui'));
  if (e.key === 'Escape') {
    const wasInfo = store.state.info;
    dispatch({ type: 'escape' });
    if (wasInfo) { e.preventDefault(); e.stopImmediatePropagation(); }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (store.state.info) {
    if (inUi) return;                                                        /* the controls stay operable from the keyboard while Info is open */
    e.stopImmediatePropagation();
    if (e.key !== 'Tab' && !/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) e.preventDefault();
    return;
  }
  const ta = field(), a = document.activeElement;
  if (!ta || a === ta || (a && a.closest && a.closest('#ui'))) return;
  if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') ta.focus({ preventScroll: true });
}

export function initA11y() {
  if (!grabField()) {                                                        /* the field appears when the app boots */
    const mo = new MutationObserver(() => { if (grabField()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('keydown', onKeydown, true);

  /* the Info page is a modal dialog: opening it moves the focus in, closing it hands the focus back */
  store.subscribe((s, prev, e) => {
    if (s.info && !prev.info) {
      stopAuto();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      byId('info-view').focus({ preventScroll: true });
    } else if (!s.info && prev.info) {
      const ib = byId('t-info');
      if (e.type === 'escape' && s.tools && ib) ib.focus({ preventScroll: true });   /* Esc: back to the button that opened it */
      else { const ta = field(); if (ta) ta.focus({ preventScroll: true }); }
    }
  });
}
