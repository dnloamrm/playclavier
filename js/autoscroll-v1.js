/* While text is added at the end (typed or Auto-jam), scroll the field up smoothly so the current line always stays visible. */
let raf = 0;
function keep(t) {
  if (!t || t.selectionStart !== t.value.length) return;
  const max = t.scrollHeight - t.clientHeight;
  if (max > t.scrollTop + 1) t.scrollTo({ top: max, behavior: 'smooth' });
}
export function initAutoscroll() {
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'TEXTAREA') return;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => keep(t));
  }, true);
}
