/* Browsers without :has() cannot match the home section by its content (see layout-v1.css). They get the same two resets through classes. */
export function initHasFallback() {
  if (window.CSS && CSS.supports && CSS.supports('selector(:has(*))')) return;
  function mark() {
    const w = document.querySelector('.main-wrapper'); if (!w) return false;
    const c = w.parentElement, sec = c && c.parentElement;
    if (c && c.classList.contains('container')) { c.classList.add('is-home-container'); if (sec && sec.classList.contains('section')) sec.classList.add('is-home-section'); }
    return true;
  }
  const mo = new MutationObserver(() => { if (mark()) mo.disconnect(); });
  mo.observe(document.documentElement, { childList: true, subtree: true }); mark();
}
