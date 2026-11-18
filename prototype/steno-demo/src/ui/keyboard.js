// The keyboard: three pages of nine keys over a two-cell space bar and one
// corner key, and the touch handling that turns fingers into strokes.
//
// Everything is laid out in points from src/geometry.js, so the hit map and
// the drawing can never disagree.

import { KEYS, DIRS, DETAIL, NUMERIC, ENDING_DIRS, strokeId, parseStroke, columnOf } from '../layout.js';
import { GEO, keyRect } from '../geometry.js';
import { classify, classifyStroke, classifySpace, SPACE_LEVEL } from '../recognizer.js';
import { labelOf, parseTranslation } from '../packs.js';

export { GEO, keyRect };
export const MODES = ['detail', 'steno', 'numeric'];
export const MODE_LABEL = { detail: 'abc', steno: 'steno', numeric: '123' };

export const ICON = {
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.2 5.5h9.3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.2a2 2 0 0 1-1.5-.7L3 12l4.7-5.8a2 2 0 0 1 1.5-.7Z"/><path d="m11.5 9.5 5 5m0-5-5 5"/></svg>',
  ret: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v6a3 3 0 0 1-3 3H6"/><path d="m10 10.5-4.5 4.5 4.5 4.5"/></svg>',
  word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H6"/><path d="m11 7-5 5 5 5"/><path d="M3 6v12"/></svg>',
  change: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13l-3-3"/><path d="M20 15H7l3 3"/></svg>',
};

/**
 * What the corner key does, by direction. The centre (a tap) is undo.
 * Sending sits alone at the top: the directions either side of it are empty,
 * so no slip of aim on another stroke can send a message.
 */
export const CORNER = {
  n: { action: 'return', label: 'send', icon: 'ret' },
  w: { action: 'deleteWord', label: 'word', icon: 'word' },
  e: { action: 'change', label: 'change', icon: 'change' },
  s: { action: 'numbers', label: '123' },
  sw: { action: 'flip', label: 'abc' },
  se: { action: 'stack', label: 'shell' },
};

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const isGlue = t => { try { const a = parseTranslation(t); return a.length === 1 && a[0].op?.[0] === '&'; } catch { return false; } };

export class Keyboard {
  /**
   * @param root    the .keys element
   * @param engine  the translator
   * @param hooks   { onMode, onTouch, onCandidate, onRelease, onAction, onStroke, onGhost, capture }
   */
  constructor(root, engine, hooks) {
    this.root = root;
    this.engine = engine;
    this.hooks = hooks;
    this.mode = 'steno';
    this.detailShift = false;
    this.touches = new Map();
    this.keyEls = {};
    this.build();
    root.addEventListener('pointerdown', e => this.down(e));
    root.addEventListener('pointermove', e => this.move(e));
    root.addEventListener('pointerup', e => this.up(e));
    root.addEventListener('pointercancel', e => this.cancel(e));
    root.addEventListener('contextmenu', e => e.preventDefault());
    engine.on(() => { if (this.stamp !== this.engine.entries) { this.stamp = this.engine.entries; this.renderFaces(); } });
  }

  // ------------------------------------------------------------- building

  build() {
    const r = this.root;
    r.style.width = GEO.block + 'px';
    r.style.height = GEO.height + 'px';
    r.innerHTML = '';
    const pages = el('div', 'pages');
    pages.style.height = GEO.gridHeight + 'px';
    this.strip = el('div', 'strip');
    this.strip.style.width = GEO.block * MODES.length + 'px';
    for (const mode of MODES) {
      const page = el('div', 'page');
      page.style.width = GEO.block + 'px';
      page.dataset.page = mode;
      this.keyEls[mode] = {};
      for (const key of KEYS) {
        const k = el('div', 'key');
        const rc = keyRect(key);
        Object.assign(k.style, { left: rc.x + 'px', top: rc.y + 'px', width: rc.w + 'px', height: rc.h + 'px' });
        page.appendChild(k);
        this.keyEls[mode][key] = k;
      }
      this.strip.appendChild(page);
    }
    pages.appendChild(this.strip);
    r.appendChild(pages);

    this.spaceEl = el('div', 'key space');
    this.utilEl = el('div', 'key utility');
    for (const [e, key] of [[this.spaceEl, 'SPACE'], [this.utilEl, 'UT']]) {
      const rc = keyRect(key);
      Object.assign(e.style, { left: rc.x + 'px', top: rc.y + 'px', width: rc.w + 'px', height: rc.h + 'px' });
      r.appendChild(e);
    }
    this.ratchet = el('div', 'ratchet', Array.from({ length: 15 }, (_, i) => `<i class="${i === 7 ? 'mid' : ''}"></i>`).join(''));
    this.stamp = this.engine.entries;
    this.renderFaces();
    this.placeStrip(false);
  }

  /** What one flick slot shows in a mode: { label, cls } or null. */
  slot(mode, key, dir) {
    if (mode === 'steno') {
      const t = this.engine.lookup(strokeId(key, dir));
      if (t === undefined) return null;
      const label = labelOf(t);
      if (!label) return null;
      // A mark a dictionary above the letters pack chose to keep is one people use in every message.
      const kept = this.engine.source[strokeId(key, dir)] !== 'letters';
      if (isGlue(t)) return { label, cls: /^[a-z]+$/i.test(label) ? (label.length > 1 ? 'letter chunk' : 'letter') : kept ? 'mark kept' : 'mark' };
      if ([...label].length === 1 && !/[a-z0-9]/i.test(label)) return { label, cls: 'mark kept' };
      return { label, cls: 'word' + (label.length > 4 ? ' long' : '') + (/^[^a-z]/i.test(label) ? ' token' : '') };
    }
    const b = (mode === 'numeric' ? NUMERIC : DETAIL)[key][dir];
    if (!b || !b.label) return null;
    let label = b.label;
    const letter = /^[a-z]$/.test(label);
    if (letter && this.detailShift) label = label.toUpperCase();
    return { label, cls: letter || /^\d$/.test(label) ? 'letter' : 'mark' };
  }

  tapLabel(mode, key) {
    // On the steno page a key is whatever the dictionaries make its tap.
    if (mode === 'steno') return this.engine.label(key) || '';
    const tap = (mode === 'numeric' ? NUMERIC : DETAIL)[key].tap;
    return mode === 'detail' && this.detailShift ? tap.toUpperCase() : tap;
  }

  renderFaces() {
    for (const mode of MODES) for (const key of KEYS) {
      const tap = this.tapLabel(mode, key);
      let html = `<span class="c${tap.length > 1 ? ' c' + Math.min(4, tap.length) : ''}">${escapeHtml(tap)}</span>`;
      for (const dir of DIRS) {
        const s = this.slot(mode, key, dir);
        if (s) html += `<span class="h ${dir} ${s.cls}" data-dir="${dir}">${escapeHtml(s.label)}</span>`;
      }
      this.keyEls[mode][key].innerHTML = html;
      // The steno page's columns are banks: what starts a syllable, its vowel, what ends it.
      this.keyEls[mode][key].dataset.bank = mode === 'steno' ? columnOf(key) : '';
    }
    this.renderBottom();
    this.fitHints();
  }

  /**
   * Keeps the three labels along a key's top and bottom edges from touching:
   * the middle one sits in the middle of the room the outer two leave, and a
   * row that is still too full is set a size smaller.
   */
  fitHints() {
    const GAP = 4, EDGE = 6;
    // Each half of the space bar is fitted on its own, like a key.
    for (const k of this.root.querySelectorAll('.key:not(.space), .key.space .half')) {
      const width = parseFloat(k.style.width) || k.offsetWidth;
      for (const [l, m, r] of [['nw', 'n', 'ne'], ['sw', 's', 'se']]) {
        const mid = k.querySelector(`.h.${m}`);
        if (!mid) continue;
        const left = k.querySelector(`.h.${l}`), right = k.querySelector(`.h.${r}`);
        const row = [left, mid, right].filter(Boolean);
        for (const e of row) e.classList.remove('tight');
        const need = () => row.reduce((s, e) => s + e.offsetWidth, 0) + GAP * (row.length - 1) + 2 * EDGE;
        if (need() > width) for (const e of row) if (e.classList.contains('word')) e.classList.add('tight');
        const from = left ? EDGE + left.offsetWidth + GAP : EDGE, to = right ? width - EDGE - right.offsetWidth - GAP : width - EDGE;
        const centre = Math.max(from + mid.offsetWidth / 2, Math.min(to - mid.offsetWidth / 2, width / 2));
        mid.style.left = centre + 'px';
      }
    }
  }

  /** The label of a space-bar flick in the current mode, or ''. */
  /** The label of a flick on one half of the space bar ('SP' left, 'SR' right) in the current mode, or ''. */
  spaceLabel(dir, half = 'SP') { return this.mode === 'steno' ? this.engine.label(strokeId(half, dir)) : ''; }

  cornerLabel(dir) {
    if (dir === 's') return this.mode === 'numeric' ? 'abc' : '123';
    if (dir === 'sw') return this.mode === 'steno' ? 'abc' : this.hooks.stackLabel?.() || 'steno';
    if (dir === 'se') return this.hooks.otherStackLabel?.() || '';
    return CORNER[dir]?.label || '';
  }

  /** Whether the corner key has something on a direction right now. */
  cornerHas(dir) {
    if (!CORNER[dir]) return false;
    if (dir === 'e' || dir === 'se') return this.mode === 'steno' && (dir === 'e' || !!this.cornerLabel('se'));
    return true;
  }

  renderBottom() {
    // Each half of the space bar has its own flicks; a tap anywhere is a space.
    let space = '<span class="c">space</span>';
    for (const half of ['SP', 'SR']) {
      space += `<div class="half ${half === 'SP' ? 'left' : 'right'}" data-half="${half}">`;
      for (const dir of ENDING_DIRS) {
        const label = this.spaceLabel(dir, half);
        if (label) space += `<span class="h ${dir} ${/^[a-z'-]/i.test(label) ? 'word' : 'mark kept'}" data-dir="${dir}">${escapeHtml(label)}</span>`;
      }
      space += '</div>';
    }
    this.spaceEl.innerHTML = space;
    let util = `<span class="c">${ICON.delete}</span>`;
    for (const [dir, c] of Object.entries(CORNER)) {
      if (!this.cornerHas(dir)) continue;
      util += `<span class="h ${dir} icon" data-dir="${dir}">${c.icon ? ICON[c.icon] : this.cornerLabel(dir)}</span>`;
    }
    this.utilEl.innerHTML = util;
    this.utilEl.appendChild(this.ratchet);
  }

  // ----------------------------------------------------------------- modes

  setMode(mode, animate = true) {
    if (mode === this.mode) { this.placeStrip(animate); return; }
    if (mode === 'numeric') this.before = this.mode;         // the number page hands back to where it was called from
    this.mode = mode;
    this.detailShift = false;
    this.placeStrip(animate);
    this.renderFaces();
    this.root.dataset.mode = mode;
    this.hooks.onMode?.(mode);
  }

  placeStrip(animate) {
    const x = -MODES.indexOf(this.mode) * GEO.block;
    this.strip.style.transition = animate ? 'transform .34s cubic-bezier(.2, .9, .3, 1)' : 'none';
    this.strip.style.transform = `translateX(${x}px)`;
  }

  /** Follows a finger dragging the pages sideways; `dx` in points. */
  dragStrip(dx) {
    const i = MODES.indexOf(this.mode);
    const edge = (i === 0 && dx > 0) || (i === MODES.length - 1 && dx < 0);
    this.strip.style.transition = 'none';
    this.strip.style.transform = `translateX(${-i * GEO.block + (edge ? dx * 0.25 : dx)}px)`;
  }

  /** Ends a sideways drag: turns the page if it went far or fast enough. */
  endDrag(dx, velocity = 0) {
    const i = MODES.indexOf(this.mode);
    let next = i;
    if (dx < -GEO.block * 0.22 || velocity < -0.45) next = Math.min(MODES.length - 1, i + 1);
    if (dx > GEO.block * 0.22 || velocity > 0.45) next = Math.max(0, i - 1);
    this.setMode(MODES[next]);
  }

  // --------------------------------------------------------------- touches

  local(e) {
    const r = this.root.getBoundingClientRect();
    const scale = r.width / GEO.block;
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  hit(p) {
    const col = Math.max(0, Math.min(2, Math.floor((p.x - GEO.padX + GEO.gap / 2) / (GEO.cellW + GEO.gap))));
    const row = Math.max(0, Math.min(3, Math.floor((p.y - GEO.padTop + GEO.gap / 2) / (GEO.cellH + GEO.gap))));
    if (row === 3) return col === 2 ? 'UT' : col === 1 ? 'SR' : 'SP';
    return KEYS[row * 3 + col];
  }

  elementFor(key) { return key === 'SP' || key === 'SR' ? this.spaceEl : key === 'UT' ? this.utilEl : this.keyEls[this.mode][key]; }

  down(e) {
    if (e.button > 0) return;
    e.preventDefault();
    this.root.setPointerCapture?.(e.pointerId);
    this.begin(e.pointerId, this.local(e), performance.now(), false);
  }
  move(e) { if (this.touches.has(e.pointerId)) this.advance(e.pointerId, this.local(e), performance.now()); }
  up(e) { if (this.touches.has(e.pointerId)) { this.advance(e.pointerId, this.local(e), performance.now()); this.finish(e.pointerId, performance.now()); } }
  cancel(e) { const t = this.touches.get(e.pointerId); if (t) this.abandon(t); }

  /** A touch lands. `ghost` marks the synthetic finger. */
  begin(id, p, now, ghost) {
    const key = this.hit(p);
    const rc = keyRect(key);
    const t = {
      id, key, ghost, origin: p, at: p, path: [{ x: 0, y: 0 }], t0: now, maxD: 0, peakTime: 0, lastMove: now,
      rect: rc, el: this.elementFor(key), candidate: null, sliding: false, lastX: 0,
    };
    this.touches.set(id, t);
    const ox = ((p.x - rc.x) / rc.w * 100).toFixed(1), oy = ((p.y - rc.y) / rc.h * 100).toFixed(1);
    t.el.classList.remove('releasing');
    t.el.style.transformOrigin = `${ox}% ${oy}%`;
    t.el.style.transform = 'scale(.965)';
    t.el.classList.add('pressed');
    this.hooks.onTouch?.(t);
    return t;
  }

  advance(id, p, now) {
    const t = this.touches.get(id);
    if (!t) return;
    const q = { x: p.x - t.origin.x, y: p.y - t.origin.y };
    if (Math.hypot(p.x - t.at.x, p.y - t.at.y) > 1.5) t.lastMove = now;
    t.at = p;
    t.path.push(q);
    const d = Math.hypot(q.x, q.y);
    if (d > t.maxD) { t.maxD = d; t.peakTime = (now - t.t0) / 1000; }
    if (this.pageSwipe(t)) return;
    if (t.key === 'SP' || t.key === 'SR') this.slideSpace(t, q);
    else if (t.key === 'UT') this.slideDelete(t, q, now);
    if (!t.sliding) this.speculate(t);
  }

  /** Two fingers moving sideways together turn the page instead of typing. */
  pageSwipe() {
    if (this.touches.size !== 2) return false;
    const [a, b] = [...this.touches.values()];
    const dx = f => f.at.x - f.origin.x, dy = f => f.at.y - f.origin.y;
    const sideways = f => Math.abs(dx(f)) > 14 && Math.abs(dx(f)) > 1.6 * Math.abs(dy(f));
    if (!a.paging && !(sideways(a) && sideways(b) && Math.sign(dx(a)) === Math.sign(dx(b)))) return false;
    for (const f of [a, b]) if (!f.paging) { f.paging = true; this.release(f); this.hooks.onRelease?.(f, null); }
    this.dragStrip((dx(a) + dx(b)) / 2);
    return true;
  }

  slideSpace(t, q) {
    // Level, and far enough: the caret's. A steeper stroke is an ending.
    if (!t.sliding && Math.abs(q.x) >= 12 && Math.abs(q.y) < Math.abs(q.x) * Math.tan(SPACE_LEVEL * Math.PI / 180)) {
      t.sliding = true; t.lastX = Math.sign(q.x) * 12;
      this.spaceEl.appendChild(this.ratchet);
      this.ratchet.classList.remove('del'); this.ratchet.classList.add('on');
      this.setCandidate(t, null);
    }
    if (!t.sliding) return;
    const steps = Math.trunc((q.x - t.lastX) / 14);
    if (steps) { t.lastX += steps * 14; this.hooks.onAction?.('caret', steps); this.kick(); }
  }

  /** Dragging the corner key left, held, deletes character by character, as the delete key always did. */
  slideDelete(t, q, now) {
    // Within twenty degrees of level, and held: nothing else on this key is that flat and that slow.
    if (!t.sliding && q.x <= -30 && Math.abs(q.x) > Math.abs(q.y) * 2.75 && now - t.t0 > 220) {
      t.sliding = true; t.lastX = q.x;
      this.utilEl.appendChild(this.ratchet);
      this.ratchet.classList.add('on', 'del');
      this.setCandidate(t, null);
      this.hooks.onAction?.('deleteChar', 1);
      this.kick();
    }
    if (!t.sliding) return;
    const steps = Math.trunc((t.lastX - q.x) / 14);
    if (steps > 0) { t.lastX -= steps * 14; this.hooks.onAction?.('deleteChar', steps); this.kick(); }
  }

  kick() {
    this.ratchet.animate([{ transform: 'translateX(-7px)' }, { transform: 'translateX(0)' }], { duration: 130, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  }

  /** What a release would do right now, or null for nothing. */
  resolve(t, raw = false) {
    const { w, h } = t.rect;
    if (t.key === 'UT') {
      const c = classify(t.path, w, h, t.peakTime);
      if (c.gesture === 'tap') return { action: 'undo', label: 'undo', type: 'tap' };
      // Coming back to where the finger started calls the stroke off: nothing here is worth sending by accident.
      const end = t.path.at(-1);
      if (c.isReturn || Math.hypot(end.x, end.y) < c.swipeLen * 0.8) return null;
      if (!this.cornerHas(c.dir)) return null;
      return { action: CORNER[c.dir].action, dir: c.dir, type: 'flick', label: this.cornerLabel(c.dir) };
    }
    if (t.key === 'SP' || t.key === 'SR') {
      const c = classifySpace(t.path, h, t.peakTime);
      if (c.type === 'tap') return this.mode === 'steno' ? { id: 'SP', type: 'tap', label: 'space' } : { literal: ' ', type: 'tap', label: 'space' };
      if (this.mode === 'steno' && ENDING_DIRS.includes(c.dir)) {
        const flick = strokeId(t.key, c.dir);
        const hook = c.type === 'hook' ? strokeId(t.key, c.dir, c.turn) : null;
        if (hook && (this.engine.lookup(hook) !== undefined || raw)) return { id: hook, dir: c.dir, turn: c.turn, type: 'hook', label: this.engine.label(hook) };
        return this.engine.lookup(flick) !== undefined || raw ? { id: flick, dir: c.dir, type: 'flick', label: this.engine.label(flick), tail: hook ? c.turn : undefined } : null;
      }
      if (c.dir === 'e' || c.dir === 'w') return { action: 'caret', amount: c.dir === 'e' ? 1 : -1, type: 'flick', dir: c.dir, label: '' };
      return null;
    }
    if (this.mode === 'steno') {
      const c = classifyStroke(t.path, w, h, t.peakTime);
      if (c.type === 'tap') return { id: t.key, type: 'tap', label: this.engine.label(t.key) };
      if (c.type === 'circle') return { id: `${t.key}-circle`, type: 'circle', label: this.engine.label(`${t.key}-circle`) };
      const flick = strokeId(t.key, c.dir);
      if (c.type === 'flick') return { id: flick, type: 'flick', dir: c.dir, label: this.engine.label(flick) };
      const hook = strokeId(t.key, c.dir, c.turn);
      // A curl that means nothing is read as its flick, so a sloppy tail never
      // types nothing. Recording wants the stroke as it was drawn.
      if (this.engine.lookup(hook) === undefined && !raw) return { id: flick, type: 'flick', dir: c.dir, label: this.engine.label(flick), tail: c.turn };
      return { id: hook, type: c.type, dir: c.dir, turn: c.turn, label: this.engine.label(hook) };
    }
    const map = this.mode === 'numeric' ? NUMERIC : DETAIL;
    const c = classify(t.path, w, h, t.peakTime);
    const tap = map[t.key].tap;
    if (c.gesture === 'tap') return { literal: this.detailShift ? tap.toUpperCase() : tap, type: 'tap', label: tap, letter: true };
    if (c.gesture.startsWith('circular')) return this.mode === 'detail' ? { literal: tap.toUpperCase(), type: 'circle', label: tap.toUpperCase() } : null;
    const b = map[t.key][c.dir];
    if (!b) return null;
    if (b.action) return { action: b.action, type: 'flick', dir: c.dir, label: b.label };
    let out = c.isReturn && b.ret ? b.ret : (b.out ?? b.label);
    const letter = /^[a-z]$/.test(out);
    if (letter && this.detailShift) out = out.toUpperCase();
    return { literal: out, type: c.isReturn && b.ret ? 'back' : 'flick', dir: c.dir, label: out === '\n' ? '⏎' : out === '\t' ? '⇥' : out, letter };
  }

  speculate(t) {
    const c = this.resolve(t, !!this.hooks.capture?.());
    this.setCandidate(t, c && c.type !== 'tap' ? c : null);
  }

  setCandidate(t, c) {
    const prev = t.candidate;
    t.candidate = c;
    const same = prev && c && prev.id === c.id && prev.dir === c.dir && prev.type === c.type && prev.label === c.label && prev.action === c.action;
    if (same || (!prev && !c)) return;
    const k = t.el;
    k.classList.toggle('aiming', !!c && c.type !== 'circle');
    k.classList.toggle('circling', !!c && c.type === 'circle');
    for (const h of k.querySelectorAll('.h.target')) h.classList.remove('target');
    const scope = t.key === 'SP' || t.key === 'SR' ? k.querySelector(`[data-half="${t.key}"]`) || k : k;
    if (c && c.dir) scope.querySelector(`.h.${c.dir}`)?.classList.add('target');
    this.hooks.onCandidate?.(t);
  }

  release(t) {
    const k = t.el;
    k.classList.add('releasing');
    k.classList.remove('pressed', 'aiming', 'circling');
    k.style.transform = '';
    for (const h of k.querySelectorAll('.h.target')) h.classList.remove('target');
    setTimeout(() => k.classList.remove('releasing'), 200);
  }

  abandon(t) {
    this.touches.delete(t.id);
    if (!t.paging) { this.release(t); this.hooks.onRelease?.(t, null); }
    this.ratchet.classList.remove('on');
  }

  finish(id, now) {
    const t = this.touches.get(id);
    if (!t) return;
    this.touches.delete(id);
    if (t.paging) {
      const dx = t.at.x - t.origin.x;
      if (![...this.touches.values()].some(f => f.paging)) this.endDrag(dx, dx / Math.max(1, now - t.t0));
      return;
    }
    this.release(t);
    this.ratchet.classList.remove('on');
    // Whatever was waiting on this finger goes out right after it.
    const flush = () => { for (const q of t.after || []) if (!q.done) { q.done = true; q.land(); } };
    if (t.sliding) { this.hooks.onRelease?.(t, null); flush(); return; }
    setTimeout(flush, 0);
    const capture = this.hooks.capture?.();
    const c = this.resolve(t, !!capture);
    const land = () => {
      let entry = null;
      if (c && capture && c.id !== undefined) capture(c.id);
      else if (c && !t.dry) entry = this.commit(c, t);
      this.hooks.onRelease?.(t, c, entry);
    };
    // On the steno page two thumbs make a chord: pieces whose touches overlap
    // are typed in bank order, left to right, whichever thumb moved first. That
    // is steno order, and it is what lets both thumbs go down together.
    if (this.mode === 'steno' && KEYS.includes(t.key) && !capture) {
      (this.chord ||= []).push({ col: columnOf(t.key), t0: t.t0, land });
      const others = [...this.touches.values()].some(f => KEYS.includes(f.key) && !f.paging);
      if (!others) {
        const group = this.chord.sort((a, b) => a.col - b.col || a.t0 - b.t0);
        this.chord = [];
        for (const g of group) g.land();
      }
      return;
    }
    // Elsewhere, what was pressed first is typed first, even if it is
    // lifted second. A finger that went down earlier and has not decided yet is
    // waited for, for at most a quarter of a second after it went down.
    const earlier = [...this.touches.values()].filter(f => f.t0 < t.t0 && !f.sliding && !f.paging);
    const wait = Math.max(0, ...earlier.map(f => f.t0 + 250 - now));
    if (!earlier.length || wait <= 0) { land(); return; }
    const queued = { land, done: false };
    for (const f of earlier) (f.after ||= []).push(queued);
    setTimeout(() => { if (!queued.done) { queued.done = true; land(); } }, wait);
  }

  /** Performs a resolved release. Returns the engine's tape entry, if any. */
  commit(c, t) {
    if (c.id !== undefined) {
      const entry = this.engine.stroke(c.id);
      this.hooks.onStroke?.(c, entry, t);
      return entry;
    }
    if (c.literal !== undefined) {
      const entry = this.engine.literal(c.literal);
      if (this.detailShift && c.letter) { this.detailShift = false; this.renderFaces(); }
      this.hooks.onStroke?.(c, entry, t);
      return entry;
    }
    switch (c.action) {
      case 'shift': this.detailShift = !this.detailShift; this.renderFaces(); break;
      case 'numbers': this.setMode(this.mode === 'numeric' ? this.before || 'steno' : 'numeric'); break;
      case 'flip': this.setMode(this.mode === 'steno' ? 'detail' : 'steno'); break;
      case 'caret': this.hooks.onAction?.('caret', c.amount); break;
      default: this.hooks.onAction?.(c.action);
    }
    return null;
  }

  /**
   * The strokes that share a flick with a word stroke: the flick itself and
   * its curls. "Change" steps through them, which is how a misread curl is
   * put right in one move.
   */
  siblings(id) {
    const s = parseStroke(id);
    if (!s || !s.dir || s.key === 'SP' || s.key === 'SR') return [];
    const base = strokeId(s.key, s.dir);
    return [base, `${base}-cw`, `${base}-ccw`, `${base}-back`].filter(x => this.engine.lookup(x) !== undefined);
  }

  // --------------------------------------------------------- synthetic finger

  /**
   * Plays a path through the same code as a real finger.
   * @param key    key to start on ('SP' and 'UT' included)
   * @param path   [{x, y, t}] from src/robot.js
   */
  async play(key, path, { speed = 1, offset = { x: 0, y: 0 }, hold = 0, dry = false, pause = 0 } = {}) {
    const rc = keyRect(key);
    const origin = { x: rc.x + rc.w / 2 + offset.x, y: rc.y + rc.h / 2 + offset.y };
    const id = 'ghost-' + (this.ghostSeq = (this.ghostSeq || 0) + 1);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const t = this.begin(id, origin, performance.now(), true);
    t.dry = dry;
    this.hooks.onGhost?.('down', origin);
    if (hold) await wait(hold);
    let last = 0;
    for (const p of path.slice(1)) {
      // A pause at the corner lets the guide show what the curls are.
      await wait(Math.max(0, (p.t - last) / speed) + (pause && p.t - last > 15 ? pause : 0));
      last = p.t;
      const at = { x: origin.x + p.x, y: origin.y + p.y };
      this.hooks.onGhost?.('move', at);
      this.advance(id, at, performance.now());
    }
    await wait(60 / speed + pause * 0.6);
    this.hooks.onGhost?.('up', t.at);
    this.finish(id, performance.now());
  }
}
