/* The colour tools: the palette strip (THEME = background, FONT = text colour) and SHUFFLE. The colours themselves live in the theme
   (the bootstrap script: Clavier.theme); this module only builds the swatches and asks the theme to change. */
import { byId } from './dom-v1.js';
import { store, dispatch } from './state-v1.js';

export function initColorsUi() {
  const colors = window.Clavier.colors, theme = window.Clavier.theme, palette = byId('palette');

  colors.PAL.forEach((c) => {
    const b = document.createElement('button'); b.type = 'button';
    b.setAttribute('aria-label', c || 'Default'); b.setAttribute('data-c', c || '');
    if (c) { b.style.setProperty('--sw-c', c); b.style.setProperty('--dot', colors.lum(c) > 0.4 ? '#171A1C' : '#F9FAFA'); }
    else { b.className = 'none'; b.style.setProperty('--dot', '#F9FAFA'); }
    palette.appendChild(b);
  });

  /* the swatch of the colour in use for the open role is marked (aria-pressed; a dot is drawn on it) */
  function paintSelection() {
    const mode = store.state.palette, sel = mode ? (theme.choice[mode] || '') : null;
    [].forEach.call(palette.children, (b) => b.setAttribute('aria-pressed', sel !== null && b.getAttribute('data-c') === sel ? 'true' : 'false'));
  }
  store.subscribe(paintSelection); theme.onChange(paintSelection);

  palette.addEventListener('click', (e) => {
    const b = e.target.closest('button'), mode = store.state.palette; if (!b || !mode) return;
    /* free choice: background and text colour are picked independently, nothing is adjusted behind the user's back */
    theme.set({ bg: theme.choice.bg, fg: theme.choice.fg, [mode]: b.getAttribute('data-c') || null });
  });
  byId('t-rand').addEventListener('click', () => theme.set(colors.compose(theme.choice)));
  document.addEventListener('click', (e) => {                                /* a click anywhere else puts the palette away */
    if (store.state.palette && !e.target.closest('#palette, #t-fill, #t-text')) dispatch({ type: 'palette/close' });
  }, true);
  paintSelection();
}
