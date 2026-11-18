// A stroke drawn small: the key it starts on, with its letter, and the
// finger's path leaving it. This is the notation the ribbon, the coach and the
// lookup tool show, so a stroke always looks the same wherever you meet it.

import { DIR_VEC, parseStroke, turned, LETTER_HOME, strokeId } from '../layout.js';

const NS = 'http://www.w3.org/2000/svg';

// What a key is called in a glyph. A key's name is its position; what the
// reader knows it by is what it types when tapped, which the page supplies.
let nameOf = key => key.toLowerCase();
export const setKeyNamer = fn => { nameOf = fn; };

/**
 * SVG markup for one stroke: the key it starts on, drawn as a small key with
 * its letter, and the finger's path leaving it.
 * @param id    stroke id (`T-n-cw`, `T`, `T-circle`, `SP-ne`)
 * @param size  pixel height of the glyph
 */
export function glyph(id, size = 28) {
  const circle = id.endsWith('-circle');
  const s = parseStroke(circle ? id.slice(0, -7) : id);
  if (!s) return '';
  const isSpace = s.key === 'SP' || s.key === 'SR';
  const c = 18;                                              // centre of a 36 x 36 box
  const name = isSpace ? '' : String(nameOf(s.key) || '').slice(0, 3);
  // The mini key grows a little for a two- or three-letter name.
  const half = isSpace ? { x: 9, y: 4.6 } : { x: name.length > 1 ? 7.5 : 6, y: 6 };
  const tap = !s.dir && !circle;
  // The space bar is drawn whole, with the half the stroke starts on filled in.
  const key = isSpace
    ? `<rect x="${c - 9}" y="${c - 4.6}" width="18" height="9.2" rx="3.2" class="g-key"/>` + (s.dir ? `<rect x="${s.key === 'SP' ? c - 9 : c}" y="${c - 4.6}" width="9" height="9.2" rx="3.2" class="g-key g-half"/>` : `<rect x="${c - 9}" y="${c - 4.6}" width="18" height="9.2" rx="3.2" class="g-key g-on"/>`)
    : `<rect x="${c - half.x}" y="${c - half.y}" width="${2 * half.x}" height="${2 * half.y}" rx="3.2" class="g-key${tap ? ' g-on' : ''}"/>`
      + `<text x="${c}" y="${c + 3.6}" text-anchor="middle" class="g-letter${tap ? ' g-on' : ''}${name.length > 2 ? ' g-small' : ''}">${name}</text>`;
  // A stroke from a half of the space bar leaves from the middle of that half.
  const ox = isSpace && s.dir ? (s.key === 'SP' ? -4.5 : 4.5) : 0;
  let path = '';
  if (circle) {
    path = `<circle cx="${c}" cy="${c}" r="10" class="g-line" fill="none" stroke-dasharray="52 12" transform="rotate(-70 ${c} ${c})"/>`;
  } else if (s.dir) {
    const v = DIR_VEC[s.dir], n = Math.hypot(v[0], v[1]);
    const ux = v[0] / n, uy = v[1] / n;
    // Leave from the key's edge in the stroke's direction.
    const edge = Math.min(v[0] ? half.x / Math.abs(ux) : Infinity, v[1] ? half.y / Math.abs(uy) : Infinity) + 1.2;
    const reach = s.turn && s.turn !== 'back' ? 13.4 : 16;
    const p0 = { x: c + ox + ux * edge, y: c + uy * edge };
    const p1 = { x: c + ox + ux * reach, y: c + uy * reach };
    let d, end = p1, hx = ux, hy = uy;
    if (s.turn === 'back') {
      const ox = -uy * 3.4, oy = ux * 3.4;
      end = { x: p0.x + ox + ux * 0.6, y: p0.y + oy + uy * 0.6 };
      d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y} C${p1.x + ux * 2.4 + ox * 0.2} ${p1.y + uy * 2.4 + oy * 0.2} ${p1.x + ux * 2.4 + ox} ${p1.y + uy * 2.4 + oy} ${p1.x + ox} ${p1.y + oy} L${end.x} ${end.y}`;
      hx = -ux; hy = -uy;
    } else if (s.turn) {
      const w = DIR_VEC[turned(s.dir, s.turn)], m = Math.hypot(w[0], w[1]);
      const wx = w[0] / m, wy = w[1] / m;
      end = { x: p1.x + wx * 9, y: p1.y + wy * 9 };
      d = `M${p0.x} ${p0.y} L${p1.x - ux * 2.6} ${p1.y - uy * 2.6} Q${p1.x} ${p1.y} ${p1.x + wx * 2.6} ${p1.y + wy * 2.6} L${end.x} ${end.y}`;
      hx = wx; hy = wy;
    } else {
      d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
    }
    const a = 3, bq = 2.3;
    const head = `M${end.x - hx * a - hy * bq} ${end.y - hy * a + hx * bq} L${end.x} ${end.y} L${end.x - hx * a + hy * bq} ${end.y - hy * a - hx * bq}`;
    path = `<path d="${d}" class="g-line" fill="none"/><path d="${head}" class="g-line" fill="none"/>`;
  }
  return `<svg xmlns="${NS}" class="glyph" width="${size}" height="${size}" viewBox="0 0 36 36" aria-hidden="true">${key}${path}</svg>`;
}

/** The stroke that types a letter: a tap or a flick. */
export const letterStroke = ch => {
  const h = LETTER_HOME[ch.toLowerCase()];
  return h ? strokeId(h.key, h.dir) : null;
};

/** A stroke in words, for screen readers and the lookup tool. */
export function describe(id) {
  const circle = id.endsWith('-circle');
  const s = parseStroke(circle ? id.slice(0, -7) : id);
  if (!s) return id;
  const NAMES = { n: 'up', ne: 'up-right', e: 'right', se: 'down-right', s: 'down', sw: 'down-left', w: 'left', nw: 'up-left' };
  const key = s.key === 'SP' ? 'the left of the space bar' : s.key === 'SR' ? 'the right of the space bar' : `the ${String(nameOf(s.key)).toUpperCase()} key`;
  if (circle) return `circle on ${key}`;
  if (!s.dir) return s.key.startsWith('S') ? 'tap the space bar' : `tap ${key}`;
  const turn = { cw: ', then curl right', ccw: ', then curl left', back: ' and back' }[s.turn] || '';
  return `flick ${NAMES[s.dir]} on ${key}${turn}`;
}
