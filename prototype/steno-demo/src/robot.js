// A synthetic finger: the path a stroke would be drawn with.
//
// The coach uses it to demonstrate a stroke on the keyboard, the screenshot
// script uses it to drive the demo, and the robustness test uses its noisy
// variant to measure how often the recogniser reads a sloppy stroke wrong.

import { DIR_VEC, parseStroke, turned } from './layout.js';
import { diagonalOf } from './recognizer.js';

/** Mulberry32: a small deterministic random generator, so tests repeat. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/**
 * The path for a stroke, as [{x, y, t}] translations from the touch-down
 * point (points, milliseconds), drawn at real angles on the glass.
 *
 * @param id      stroke id; taps and circles are understood too
 * @param keyW    key width in points
 * @param keyH    key height in points
 * @param hand    0 for the textbook stroke, or how a thumb departs from it:
 *                { aim: degrees of direction error (sd), reach: fraction of length error (sd),
 *                  leg: length of a leg in points, corner: how much the corner is cut (0..1),
 *                  arc: degrees the path bows, as a thumb pivoting at its base does,
 *                  jitter: points of sensor noise (sd),
 *                  bias: degrees every stroke of this hand is turned by (a habit, not noise),
 *                  tail: points of stray movement at right angles as the thumb lifts,
 *                  second: length of a hook's second leg as a fraction of its first }
 *                A number n is shorthand for a hurried thumb scaled by n.
 * @param random  random source in [0, 1)
 */
export function pathFor(id, keyW, keyH, hand = 0, random = Math.random) {
  const s = parseStroke(id.replace(/-circle$/, ''));
  const circle = id.endsWith('-circle');
  const unit = Math.min(keyW, keyH);
  const h = typeof hand === 'number'
    ? { aim: 9 * hand, reach: 0.25 * hand, leg: 0, corner: hand ? 0.35 : 0, arc: 0, jitter: hand, bias: 0, tail: 0, second: 0.9 }
    : { aim: 0, reach: 0, leg: 0, corner: 0, arc: 0, jitter: 0, bias: 0, tail: 0, second: 0.9, ...hand };
  const noisy = h.aim || h.reach || h.jitter;
  const g = () => noisy ? gauss(random) : 0;
  const pts = [{ x: 0, y: 0, t: 0 }];
  const push = (x, y, t) => pts.push({ x: x + g() * h.jitter, y: y + g() * h.jitter, t });

  if (circle) {
    const r = unit * 0.24, steps = 28;
    for (let i = 1; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * 2 * Math.PI * 0.95;
      push(r * Math.cos(a), r + r * Math.sin(a), i * 9);
    }
    return pts;
  }
  if (!s || !s.dir) { push(g() * h.jitter, g() * h.jitter, 60); return pts; }

  const legLength = h.leg || unit * 0.5;
  const reach = () => Math.exp(g() * h.reach);
  // A diagonal is aimed where the key's diagonal labels are: 45 degrees on a square key, less on a wide one.
  const diagonal = (s.key === 'SP' ? 45 : diagonalOf(keyW, keyH)) * Math.PI / 180;
  const leg = (dir, length, offDeg) => {
    const v = DIR_VEC[dir];
    const ideal = v[0] && v[1] ? Math.atan2(Math.sign(v[1]) * Math.sin(diagonal), Math.sign(v[0]) * Math.cos(diagonal)) : Math.atan2(v[1], v[0]);
    const a = ideal + (offDeg + h.bias) * Math.PI / 180;
    return { x: Math.cos(a) * length, y: Math.sin(a) * length, a };
  };
  // A leg drawn as an arc that bows by `arc` degrees from end to end.
  const draw = (from, l, t0, steps) => {
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const bow = (h.arc * Math.PI / 180) * (k - 1);           // sets off to one side and curves home onto the target
      const len = Math.hypot(l.x, l.y) * k;
      push(from.x + Math.cos(l.a + bow) * len, from.y + Math.sin(l.a + bow) * len, t0 + i * 9);
    }
    return { x: from.x + l.x, y: from.y + l.y };
  };
  const steps = 9;
  const first = leg(s.dir, legLength * reach(), g() * h.aim);
  const corner = draw({ x: 0, y: 0 }, first, 0, steps);
  if (!s.turn) {
    // The thumb does not lift straight up: it drags a little sideways as it goes.
    if (h.tail) {
      const side = random() < 0.5 ? 1 : -1, a = first.a + side * (Math.PI / 2) * (0.7 + 0.6 * random());
      for (let i = 1; i <= 3; i++) push(corner.x + Math.cos(a) * h.tail * i / 3, corner.y + Math.sin(a) * h.tail * i / 3, steps * 9 + i * 8);
    }
    return pts;
  }

  const tA = steps * 9;
  if (s.turn === 'back') {
    const home = 0.8 * reach();
    const slip = g() * h.aim * 0.6 * Math.PI / 180;           // the way back is not quite the way out
    for (let i = 1; i <= steps; i++) {
      const k = home * i / steps;
      push(corner.x - Math.cos(first.a + slip) * Math.hypot(first.x, first.y) * k,
        corner.y - Math.sin(first.a + slip) * Math.hypot(first.x, first.y) * k, tA + 20 + i * 9);
    }
    return pts;
  }
  const second = leg(turned(s.dir, s.turn), legLength * h.second * reach(), g() * h.aim * 1.3);
  // A hurried corner is cut: the finger starts turning before the first leg is done.
  const cut = h.corner ? h.corner * (0.6 + 0.8 * random()) : 0;
  if (cut) {
    const keep = Math.max(2, Math.round(steps * (1 - cut * 0.5)));
    pts.length = 1 + keep;
  }
  const from = pts.at(-1);
  draw({ x: from.x, y: from.y }, second, tA + 30, steps);
  return pts;
}

/** A path as the absolute pointer events to dispatch: down, moves, up. */
export function eventsFor(path, origin) {
  return path.map((p, i) => ({
    type: i === 0 ? 'down' : i === path.length - 1 ? 'up' : 'move',
    x: origin.x + p.x, y: origin.y + p.y, t: p.t,
  }));
}
