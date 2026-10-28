/* The share card: what the post looks like. Used for the static PNG and for every frame of the clip, so both always match.
   1080x1920 (9:16). The canvas is a darker, slightly desaturated tone of the page colour (HSL lightness -28%); ONE card (88% of the width, 4:5,
   rounded corners) in the exact page colour holds the text in the text colour, set in ABC Arizona. No logo, no slogan, no metadata. */
import { field } from './dom-v1.js';

export const W = 1080, H = 1920;

function wrap(ctx, text, max) {
  const out = [];
  text.split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (line && ctx.measureText(t).width > max) { out.push(line); line = w; } else line = t;
    });
    out.push(line);
  });
  return out;
}

/* HSL lightness scaled by k (hue and saturation kept) */
function dim(c, k) {
  const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => v / 255), r = m[0], g = m[1], b = m[2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, sa = 0;
  if (d) {
    sa = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return 'hsl(' + Math.round(h * 360) + ',' + Math.round(sa * 100) + '%,' + (l * k * 100).toFixed(2) + '%)';
}

/**
 * Paints the card.
 *  tail  true: when the text is longer than the card, show its LAST lines (the way the field scrolls)
 *        false: the first lines, the last visible one ending with an ellipsis
 *  more  true: an ellipsis follows the text (the clip hit its 10 s limit while you were still playing)
 */
export function drawCard(ctx, ta, tail, more) {
  const style = getComputedStyle(ta);
  const bg = getComputedStyle(document.body).backgroundColor, fg = style.color, face = style.fontFamily || 'serif';
  const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  ctx.fillStyle = dim(bg, 0.72); ctx.fillRect(0, 0, W, H);
  const cw = Math.round(W * 0.88), k = cw / 842, ch = Math.round(cw * 5 / 4);
  const x = Math.round((W - cw) / 2), y = Math.round((H - ch) / 2);
  rr(x, y, cw, ch, 36 * k); ctx.fillStyle = bg; ctx.fill();
  ctx.save(); rr(x, y, cw, ch, 36 * k); ctx.clip();
  const fs = Math.round(44 * W / 390);                                       /* 44px on a 390-wide phone screen, scaled to the 1080-wide image */
  ctx.fillStyle = fg; ctx.textBaseline = 'top'; ctx.font = '400 ' + fs + 'px ' + face;
  const lh = Math.round(fs * 1.25), pad = Math.round(104 * k), fit = Math.floor((ch - 2 * pad) / lh);
  let lines = wrap(ctx, ta.value + (more ? '…' : ''), cw - 2 * pad);
  if (lines.length > fit) {
    if (tail) lines = lines.slice(lines.length - fit);
    else {
      lines = lines.slice(0, fit); let last = lines[fit - 1].replace(/\s+$/, '');
      while (last && ctx.measureText(last + '…').width > cw - 2 * pad) last = last.slice(0, -1).replace(/\s+$/, '');
      if (last.length < lines[fit - 1].length && last.indexOf(' ') > 0) last = last.slice(0, last.lastIndexOf(' ')).replace(/[\s,.;:!?-]+$/, '');   /* cut at a whole word */
      lines[fit - 1] = last + '…';
    }
  }
  lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * lh));
  ctx.restore();
}

/** the card as a PNG File, drawn synchronously (the share sheet needs the tap that is still running) */
export function cardPng() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  drawCard(cv.getContext('2d'), field(), false);
  const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  cv.width = cv.height = 0;                                                  /* release the canvas */
  return new File([bytes], 'clavier.png', { type: 'image/png' });
}
