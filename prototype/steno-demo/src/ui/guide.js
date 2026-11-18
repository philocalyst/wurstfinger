// The guide: a small card beside the finger. Resting on a key unfolds a map
// of what every direction types. Moving lights the one being headed for.
// Pausing on the way turns the card into the short list of what this flick
// can still become: itself, and each of its curls, drawn as the stroke that
// makes it.
//
// It is the keyboard's existing touch guide carried one level further, and it
// follows what marking-menu research found:
//   - it appears on hesitation, not on contact, so someone who knows the
//     stroke never sees it and someone tapping letters is never interrupted;
//   - it shows what is still reachable from where the finger is;
//   - following it is the same movement as the stroke made without it;
//   - it never covers the text being written, never leaves the screen and is
//     never under the finger, because it is one card in one place.

import { DIRS, DIR_VEC, strokeId, ENDING_DIRS } from '../layout.js';
import { labelOf } from '../packs.js';
import { GEO, keyRect, CORNER, ICON } from './keyboard.js';
import { glyph } from './glyph.js';

export const MAP_DELAY = 300;          // resting on a key this long unfolds its map
export const CURL_DELAY = 250;         // pausing on the way this long shows the curls
const RIBBON = 42;                     // the strip above the keys may be covered; the composer above it may not
const SIDE = (393 - GEO.block) / 2;    // screen to the left and right of the key block
const TURNS = ['cw', 'ccw', 'back'];

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const textWidth = (s, per = 9.2, pad = 18) => pad + [...String(s)].length * per;

export class Guide {
  constructor(overlay, keyboard, engine, settings) {
    this.overlay = overlay;
    this.kb = keyboard;
    this.engine = engine;
    this.settings = settings;
    this.active = null;
  }

  /** The label and class of each cell of the map for the touched key. */
  cells(t) {
    const out = {};
    if (t.key === 'UT') {
      for (const d of Object.keys(CORNER)) if (this.kb.cornerHas(d)) out[d] = { label: this.kb.cornerLabel(d), cls: 'action' };
      out.c = { label: 'undo', cls: 'action' };
      return out;
    }
    if (t.key === 'SP' || t.key === 'SR') {
      for (const d of ENDING_DIRS) { const l = this.kb.spaceLabel(d, t.key); if (l) out[d] = { label: l, cls: /^[a-z'-]/i.test(l) ? 'word' : 'mark' }; }
      out.c = { label: 'space', cls: 'action' };
      return out;
    }
    for (const d of DIRS) { const s = this.kb.slot(this.kb.mode, t.key, d); if (s) out[d] = { label: s.label, cls: s.cls.split(' ')[0] }; }
    out.c = { label: this.kb.tapLabel(this.kb.mode, t.key), cls: 'letter' };
    return out;
  }

  /** Whether strokes on this key can have curls: the letter keys and the space bar, on the steno page. */
  curly(t) { return this.kb.mode === 'steno' && t.key !== 'UT'; }

  show(t) {
    this.hide();
    const cells = this.cells(t);
    if (Object.keys(cells).length < 2) return;
    const wide = this.curly(t) || Object.values(cells).some(c => c.cls === 'word' || c.cls === 'action');
    const size = wide ? { w: 56, h: 30 } : { w: 30, h: 30 };
    const pad = 6;
    const cardW = size.w * 3 + pad * 2, cardH = size.h * 3 + pad * 2;
    const rc = keyRect(t.key);
    // Above the key when that stays below the composer; otherwise beside it, on
    // the side with more room.
    let x = rc.x + rc.w / 2 - cardW / 2, y = rc.y - cardH - 8, origin;
    if (y < -RIBBON + 2) {
      const roomLeft = rc.x + SIDE, roomRight = GEO.block - rc.x - rc.w + SIDE;
      x = roomLeft >= roomRight ? rc.x - cardW - 8 : rc.x + rc.w + 8;
      y = Math.max(-RIBBON + 3, rc.y + rc.h / 2 - cardH / 2);
      origin = `${roomLeft >= roomRight ? cardW + 8 : -8}px ${rc.y + rc.h / 2 - y}px`;
    }
    x = Math.max(-SIDE + 5, Math.min(GEO.block + SIDE - 5 - cardW, x));
    const root = el('div', 'guide');
    const card = el('div', 'card');
    Object.assign(card.style, { left: x + 'px', top: y + 'px', width: cardW + 'px', height: cardH + 'px' });
    card.style.transformOrigin = origin || `${rc.x + rc.w / 2 - x}px ${cardH + 8}px`;
    root.appendChild(card);
    const pos = d => {
      const v = d === 'c' ? [0, 0] : DIR_VEC[d];
      return { x: x + pad + (v[0] + 1) * size.w, y: y + pad + (v[1] + 1) * size.h };
    };
    for (const [d, c] of Object.entries(cells)) {
      const p = pos(d);
      const e = el('div', `cell ${c.cls}${String(c.label).length > 6 ? ' small' : ''}`, esc(c.label));
      Object.assign(e.style, { left: p.x + 'px', top: p.y + 'px', width: size.w + 'px', height: size.h + 'px' });
      root.appendChild(e);
    }
    const lit = el('div', 'lit');
    lit.style.height = size.h - 2 + 'px';
    root.appendChild(lit);
    // The list of what this flick can become sits in the card, in place of the map.
    const list = el('div', 'list');
    Object.assign(list.style, { left: x + 'px', top: y + 'px', width: cardW + 'px', height: cardH + 'px' });
    root.appendChild(list);
    this.overlay.appendChild(root);

    const g = { t, root, card, lit, list, pos, size, x, y, cardW, cardH, mapTimer: null, curlTimer: null, curlsFor: null, curls: false };
    const delay = this.settings.guide === 'always' ? 0 : this.settings.guide === 'off' ? Infinity : MAP_DELAY;
    if (delay === 0) root.classList.add('map');
    else if (delay !== Infinity) g.mapTimer = setTimeout(() => { if (!t.candidate && !t.sliding) { root.classList.add('map'); this.update(t); } }, delay);
    this.active = g;
    this.update(t);
  }

  update(t) {
    const g = this.active;
    if (!g || g.t !== t) return;
    // A slide (the caret, or deleting) has its own indicator; the map gets out of the way.
    if (t.sliding) { clearTimeout(g.mapTimer); g.root.classList.remove('map', 'listing', 'aimed'); g.lit.classList.remove('on'); return; }
    const c = t.candidate;
    g.root.classList.toggle('aimed', !!c && !!c.dir);
    if (!c || !c.dir) {
      g.lit.classList.remove('on');
      g.root.classList.remove('listing');
      g.curlsFor = null;
      if (c && c.type === 'circle') this.light(g, 'c', c.label);
      return;
    }
    clearTimeout(g.mapTimer);
    const base = this.curly(t) ? strokeId(t.key, c.dir) : null;
    const options = base ? TURNS.map(turn => ({ turn, id: `${base}-${turn}`, label: labelOf(this.engine.lookup(`${base}-${turn}`)) })).filter(o => o.label) : [];
    if (!options.length) {
      g.root.classList.remove('listing');
      this.light(g, c.dir, c.label);
      return;
    }
    // The curls show once the finger pauses on its way, or at once when a curl
    // is already being drawn or the map was already open.
    if (g.curlsFor !== base) {
      g.curlsFor = base; g.curls = false;
      clearTimeout(g.curlTimer);
      if (this.settings.guide === 'always' || g.root.classList.contains('map')) g.curls = true;
      else if (this.settings.guide !== 'off') g.curlTimer = setTimeout(() => { g.curls = true; this.update(t); }, CURL_DELAY);
    }
    if (c.turn && this.settings.guide !== 'off') g.curls = true;
    if (!g.curls) { g.root.classList.remove('listing'); this.light(g, c.dir, this.engine.label(base)); return; }

    const rows = [{ turn: null, id: base, label: this.engine.label(base) }, ...options];
    const key = rows.map(r => r.id).join(' ');
    if (g.list.dataset.key !== key) {
      g.list.dataset.key = key;
      g.list.innerHTML = rows.map(r => `<div class="item" data-turn="${r.turn || ''}">${glyph(r.id, 26)}<span>${esc(r.label)}</span></div>`).join('');
    }
    for (const item of g.list.children) item.classList.toggle('sel', (item.dataset.turn || null) === (c.turn || null));
    g.root.classList.add('listing');
    g.lit.classList.remove('on');
    this.selected = [...g.list.children].find(i => i.classList.contains('sel'));
  }

  light(g, d, label) {
    const p = g.pos(d);
    const icon = g.t.key === 'UT' && CORNER[d]?.icon ? ICON[CORNER[d].icon] : '';
    const w = Math.max(g.size.w, textWidth(label, 9.2, icon ? 40 : 18));
    g.lit.innerHTML = icon + `<span>${esc(label)}</span>`;
    const left = Math.max(-SIDE + 5, Math.min(GEO.block + SIDE - 5 - w, p.x + g.size.w / 2 - w / 2));
    Object.assign(g.lit.style, { left: left + 'px', top: p.y + 1 + 'px', width: w + 'px' });
    g.lit.classList.add('on');
    g.lit.classList.toggle('send', g.t.key === 'UT' && d === 'n');
    this.selected = g.lit;
  }

  /**
   * The finger lifted. If it typed something by moving, what it typed lifts
   * off from where the guide showed it.
   * @param typed  the text to show lifting off, or null for nothing
   */
  hide(t, typed) {
    const g = this.active;
    if (!g || (t && g.t !== t)) return;
    clearTimeout(g.mapTimer); clearTimeout(g.curlTimer);
    const from = this.selected;
    if (typed && from && (g.lit.classList.contains('on') || g.root.classList.contains('listing'))) {
      const box = from === g.lit
        ? { left: parseFloat(from.style.left), top: parseFloat(from.style.top), width: parseFloat(from.style.width), height: g.size.h - 2 }
        : { left: g.x + 6, top: g.y + from.offsetTop, width: g.cardW - 12, height: from.offsetHeight };
      const pop = el('div', 'pop', esc(typed));
      Object.assign(pop.style, { left: box.left + 'px', top: box.top + 'px', minWidth: box.width + 'px', height: box.height + 'px' });
      this.overlay.appendChild(pop);
      setTimeout(() => pop.remove(), 320);
    }
    // The card goes at once, so the word lifting off is the only thing left to look at.
    g.root.remove();
    this.active = null;
    this.selected = null;
  }
}
