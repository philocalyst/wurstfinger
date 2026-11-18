// Turns one finger's path into a stroke.
//
// `classify` is the keyboard's existing classifier, transcribed from
// docs/steno/research/03-current-keyboard-spec.md §6.5 (tap, eight flick
// directions, return swipe, circle), with one change noted at `preprocess`.
//
// `classifyStroke` is what steno mode adds on top: it looks for one corner in
// the path and reports the stroke as a flick (no corner), a hook (the path
// turns about a quarter, clockwise or counter-clockwise) or a back stroke (it
// turns round). The four outcomes own equal 90 degree sectors of turn angle.
//
// Paths are lists of {x, y} translations from the touch-down point, in
// points, y pointing down.

const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const GESTURE = { e: 'swipeRight', se: 'swipeDownRight', s: 'swipeDown', sw: 'swipeDownLeft', w: 'swipeLeft', nw: 'swipeUpLeft', n: 'swipeUp', ne: 'swipeUpRight' };

/**
 * The angle, from level, at which a key's diagonal labels sit: 45 degrees on
 * a square key, less on a wide one. People aim at the label, so the sectors
 * are built round where the labels are.
 */
export const diagonalOf = (keyW, keyH) => Math.min(55, Math.max(35, Math.atan2(keyH, keyW) * 180 / Math.PI));

/**
 * The direction of an angle (radians, y down) on a key of this shape. Each
 * boundary is the bisector between two neighbouring labels, so on a 94 x 70
 * key level owns 37 degrees, a diagonal 45 and upright 53.
 */
export function dirOfAngle(angle, keyW = 1, keyH = 1) {
  const x = Math.cos(angle), y = Math.sin(angle);
  const level = Math.atan2(Math.abs(y), Math.abs(x)) * 180 / Math.PI;      // 0 = level, 90 = upright
  const diagonal = diagonalOf(keyW, keyH);
  if (level < diagonal / 2) return x >= 0 ? 'e' : 'w';
  if (level >= (diagonal + 90) / 2) return y < 0 ? 'n' : 's';
  return (y < 0 ? 'n' : 's') + (x >= 0 ? 'e' : 'w');
}

/**
 * Jitter filter and Savitzky-Golay smoothing (spec §6.2).
 *
 * The Swift classifier also divides x by the key's width-to-height ratio, so
 * that a diagonal aims at the corner of a wide key. That is a no-op on the
 * square keys it ships with. On the wider keys of the three-column layout it
 * would make a sideways flick need half as much again as an upward one and
 * squeeze the sideways sectors to under fifteen degrees, so here directions
 * are the real angles on the glass, each with the same 45 degree sector, and
 * every distance is a real distance.
 */
export function preprocess(raw) {
  let p = [raw[0]], last = raw[0];
  for (const q of raw.slice(1)) if (D(q, last) >= 3) { p.push(q); last = q; }
  if (D(raw.at(-1), last) >= 0.1) p.push(raw.at(-1));
  if (p.length >= 5) {
    const k = [-3, 12, 17, 12, -3].map(v => v / 35), e = p.length - 1, src = p;
    p = src.map((_, i) => k.reduce((s, w, j) => {
      const q = src[Math.max(0, Math.min(e, i - 2 + j))];
      return { x: s.x + w * q.x, y: s.y + w * q.y };
    }, { x: 0, y: 0 }));
  }
  return p;
}

// The Swift classifier lengthens the tap/flick boundary on keys taller than
// 58 pt, up to 1.6 times. A flick is a movement of the thumb, not of the key,
// and it does not get longer because the key did, so the boundary here only
// ever shrinks with small keys: 20 pt (3.1 mm) on anything 58 pt or more.
export const keyScale = (keyW, keyH) => Math.min(Math.max(Math.min(keyW, keyH) / 58, 0.7), 1);

/** The existing classifier: { gesture, isReturn }. */
export function classify(raw, keyW, keyH, peakTime = 0) {
  const p = preprocess(raw);
  const n = p.length;
  if (n < 2) return { gesture: 'tap', isReturn: false, path: p };

  const o = p[0];
  let len = 0; for (let i = 1; i < n; i++) len += D(p[i - 1], p[i]);
  let maxD = 0, far = 0; p.forEach((q, i) => { const d = D(o, q); if (d > maxD) { maxD = d; far = i; } });
  const chord = D(o, p[n - 1]), progress = far / (n - 1), ratio = len > 0 ? chord / len : 1;
  const scale = keyScale(keyW, keyH), swipeLen = 20 * scale;
  const outBack = ratio < 0.5 && progress >= 0.2 && progress <= 0.8;
  const samplesOut = p.filter(q => D(q, o) >= maxD / 2).length;
  const fast = peakTime > 0 && (chord >= 0.6 * maxD || (samplesOut >= 3 && outBack))
            && maxD >= 12 * scale && maxD >= 100 * scale * peakTime;
  const farAngle = Math.atan2(p[far].y - o.y, p[far].x - o.x);

  const c = { x: p.reduce((s, q) => s + q.x, 0) / n, y: p.reduce((s, q) => s + q.y, 0) / n };
  const turn = (a, b) => Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
  let span = 0;
  for (let i = 1; i < n; i++) span += turn({ x: p[i - 1].x - c.x, y: p[i - 1].y - c.y }, { x: p[i].x - c.x, y: p[i].y - c.y });
  const radii = p.map(q => D(q, c)), mean = radii.reduce((s, r) => s + r, 0) / n;
  const circularity = mean > 0
    ? Math.max(0, Math.min(1, 1 - Math.sqrt(radii.reduce((s, r) => s + (r - mean) ** 2, 0) / n) / mean)) : 0;
  let angle = farAngle;
  if (n >= 3 && far >= 2) { const r = robustDirection(p, far); if (r !== null) angle = r; }
  const dir = dirOfAngle(angle, keyW, keyH);
  const shape = { dir, isReturn: outBack, path: p, far, len, chord, swipeLen, keyW, keyH };
  if (len > 2 * swipeLen && circularity > 0.3 && Math.abs(span) > 255 * Math.PI / 180
      && turnConsistency(p, len) > 0.8 && compactness(p, farAngle) > 0.45
      && (Math.abs(span) >= 3 * Math.PI || circleFitResidual(p, c) <= 0.3)) {
    return { ...shape, gesture: span > 0 ? 'circularClockwise' : 'circularCounterclockwise', isReturn: false };
  }

  if (maxD < swipeLen && !fast) return { gesture: 'tap', isReturn: false, path: p };
  return { ...shape, gesture: GESTURE[dir] };
}

function turnConsistency(p, len) {
  let pts = p;
  if (p.length > 16) {
    const step = Math.max(len / 24, 4); pts = [p[0]]; let walked = 0;
    for (let i = 1; i < p.length; i++) {
      let from = p[i - 1], rem = D(from, p[i]);
      while (walked + rem >= step) {
        const t = (step - walked) / rem;
        from = { x: from.x + (p[i].x - from.x) * t, y: from.y + (p[i].y - from.y) * t };
        pts.push(from); rem = D(from, p[i]); walked = 0;
      }
      walked += rem;
    }
  }
  let cw = 0, ccw = 0, prev = null, corner = null;
  for (const q of pts) {
    if (corner && corner.x === q.x && corner.y === q.y) continue;
    if (prev && corner) {
      const a = { x: corner.x - prev.x, y: corner.y - prev.y }, b = { x: q.x - corner.x, y: q.y - corner.y };
      const t = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
      if (t > 0.15) ccw++; else if (t < -0.15) cw++;
    }
    prev = corner; corner = q;
  }
  return cw + ccw ? Math.max(cw, ccw) / (cw + ccw) : 1;
}

function compactness(p, angle) {
  const ca = Math.cos(angle), sa = Math.sin(angle); let a0 = 0, a1 = 0, b0 = 0, b1 = 0;
  for (const q of p) {
    const dx = q.x - p[0].x, dy = q.y - p[0].y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    a0 = Math.min(a0, u); a1 = Math.max(a1, u); b0 = Math.min(b0, v); b1 = Math.max(b1, v);
  }
  return a1 > a0 ? (b1 - b0) / (a1 - a0) : 0;
}

function circleFitResidual(p, c) {
  const n = p.length; if (n < 4) return 1;
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, bx = 0, by = 0, b1 = 0;
  for (const q of p) {
    const x = q.x - c.x, y = q.y - c.y, z = -(x * x + y * y);
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; bx += x * z; by += y * z; b1 += z;
  }
  const det = sxx * (syy * n - sy * sy) - sxy * (sxy * n - sy * sx) + sx * (sxy * sy - syy * sx);
  if (Math.abs(det) <= 1e-9) return 1;
  const d = (bx * (syy * n - sy * sy) - sxy * (by * n - sy * b1) + sx * (by * sy - syy * b1)) / det;
  const e = (sxx * (by * n - sy * b1) - bx * (sxy * n - sy * sx) + sx * (sxy * b1 - by * sx)) / det;
  const f = (sxx * (syy * b1 - sy * by) - sxy * (sxy * b1 - by * sx) + bx * (sxy * sy - syy * sx)) / det;
  const ox = -d / 2, oy = -e / 2, r2 = ox * ox + oy * oy - f; if (r2 <= 1e-9) return 1;
  const r = Math.sqrt(r2);
  return Math.sqrt(p.reduce((s, q) => s + (Math.hypot(q.x - c.x - ox, q.y - c.y - oy) - r) ** 2, 0) / n) / r;
}

function robustDirection(p, f) {
  const o = p[0], far = p[f]; let total = 0;
  for (let i = 1; i <= f; i++) total += D(p[i - 1], p[i]);
  if (!(total > 0)) return null;
  const a1 = Math.atan2(far.y - o.y, far.x - o.x); let sx = Math.cos(a1), sy = Math.sin(a1);
  let w = 0, mx = 0, my = 0, mxx = 0, myy = 0, mxy = 0, walked = 0;
  for (let i = 1; i <= f; i++) {
    const a = p[i - 1], b = p[i], L = D(a, b);
    const t0 = L > 0 ? Math.min(Math.max((0.15 * total - walked) / L, 0), 1) : 0;
    const t1 = L > 0 ? Math.min(Math.max((0.90 * total - walked) / L, 0), 1) : 0;
    walked += L; if (t1 <= t0) continue;
    const P = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
    const Q = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 }, l = (t1 - t0) * L;
    w += l; mx += l * (P.x + Q.x) / 2; my += l * (P.y + Q.y) / 2;
    mxx += l * (P.x * P.x + P.x * Q.x + Q.x * Q.x) / 3; myy += l * (P.y * P.y + P.y * Q.y + Q.y * Q.y) / 3;
    mxy += l * (2 * P.x * P.y + P.x * Q.y + Q.x * P.y + 2 * Q.x * Q.y) / 6;
  }
  if (w > 0) {
    const cx = mx / w, cy = my / w;
    let th = 0.5 * Math.atan2(2 * (mxy / w - cx * cy), (mxx / w - cx * cx) - (myy / w - cy * cy));
    if (Math.cos(th) * (far.x - o.x) + Math.sin(th) * (far.y - o.y) < 0) th += Math.PI;
    sx += Math.cos(th); sy += Math.sin(th);
  }
  let s = 0; while (s < f - 1 && D(o, p[s + 1]) < 5) s++;
  let along = 0, end = far;
  for (let i = 1; i <= f; i++) {
    const L = D(p[i - 1], p[i]);
    if (along + L >= 0.85 * total && L > 0) {
      const t = (0.85 * total - along) / L;
      end = { x: p[i - 1].x + (p[i].x - p[i - 1].x) * t, y: p[i - 1].y + (p[i].y - p[i - 1].y) * t }; break;
    }
    along += L;
  }
  const a3 = Math.atan2(end.y - p[s].y, end.x - p[s].x);
  return Math.atan2(sy + Math.sin(a3), sx + Math.cos(a3));
}

// ------------------------------------------------------------------ hooks

// A hook has to be drawn on purpose. The second leg must be a real leg: at
// least 3 mm, and at least half as long as the first. The tail a thumb leaves
// as it lifts off is neither, and stays the flick it was.
export const HOOK = {
  minFirst: 0.7,        // first leg, in swipe lengths (20 pt)
  minSecond: 0.95,      // second leg, in swipe lengths: 19 pt, 3 mm
  minRatio: 0.5,        // second leg at least this fraction of the first
  minBackRatio: 0.33,   // a back stroke has to come at least a third of the way home
  minTurn: 45,          // degrees: below this the stroke is a plain flick
  backTurn: 135,        // degrees: above this it is a back stroke
  minCircle: 300,       // degrees of heading change before a path is a circle and not a sharp hook
};

/** Total change of heading along a path, in degrees: about 90 for a hook, 360 for a circle. */
function headingChange(p) {
  let total = 0, prev = null;
  for (let i = 1; i < p.length; i++) {
    const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y;
    if (Math.hypot(dx, dy) < 2) continue;
    const a = Math.atan2(dy, dx);
    if (prev !== null) { let d = a - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; total += Math.abs(d); }
    prev = a;
  }
  return total * 180 / Math.PI;
}

/**
 * The path as one or two legs: { straight } or { a, b, la, lb, turnDeg, cw, corner }.
 * The corner is the point farthest from the line start to end; for a stroke
 * that comes back on itself that line is too short to mean anything, so it is
 * the point farthest from the start.
 */
function legs(base) {
  const p = base.path, n = p.length, o = p[0], e = p[n - 1];
  let corner = base.far;
  if (base.chord >= 0.5 * base.len) {
    let best = 0;
    const ux = (e.x - o.x) / base.chord, uy = (e.y - o.y) / base.chord;
    for (let i = 1; i < n - 1; i++) {
      const h = Math.abs((p[i].x - o.x) * uy - (p[i].y - o.y) * ux);
      if (h > best) { best = h; corner = i; }
    }
    if (best < 0.16 * base.len) return { straight: true };
  }
  const c = p[corner];
  const a = { x: c.x - o.x, y: c.y - o.y }, b = { x: e.x - c.x, y: e.y - c.y };
  const cross = a.x * b.y - a.y * b.x, dot = a.x * b.x + a.y * b.y;
  return {
    a, b, la: Math.hypot(a.x, a.y), lb: Math.hypot(b.x, b.y), corner,
    turnDeg: Math.abs(Math.atan2(cross, dot)) * 180 / Math.PI,
    cw: cross > 0,                       // y points down, so a positive cross product turns clockwise on screen
  };
}

/**
 * Steno classification of one path.
 * Returns { type: 'tap' | 'flick' | 'hook' | 'back' | 'circle', dir, turn }.
 *
 * A stroke that turns but is not a hook is the flick of its FIRST leg: a curl
 * that falls short types the word that was flicked, never a neighbour's.
 */
export function classifyStroke(raw, keyW, keyH, peakTime = 0) {
  const base = classify(raw, keyW, keyH, peakTime);
  if (base.gesture === 'tap') return { type: 'tap' };
  if (base.gesture.startsWith('circular') && headingChange(base.path) >= HOOK.minCircle) {
    return { type: 'circle', turn: base.gesture === 'circularClockwise' ? 'cw' : 'ccw' };
  }
  const L = legs(base);
  if (L.straight) return { type: 'flick', dir: base.dir };
  const swipeLen = base.swipeLen;
  if (L.la < HOOK.minFirst * swipeLen || L.turnDeg < HOOK.minTurn) return { type: 'flick', dir: base.dir };
  const dir = dirOfAngle(Math.atan2(L.a.y, L.a.x), keyW, keyH);
  if (L.turnDeg > HOOK.backTurn) {
    return L.lb >= HOOK.minBackRatio * L.la ? { type: 'back', dir, turn: 'back', corner: L.corner } : { type: 'flick', dir, fell: 'back' };
  }
  if (L.lb < HOOK.minSecond * swipeLen || L.lb < HOOK.minRatio * L.la) return { type: 'flick', dir, fell: L.cw ? 'cw' : 'ccw' };
  return { type: 'hook', dir, turn: L.cw ? 'cw' : 'ccw', corner: L.corner };
}

// ---------------------------------------------------------------- space bar

// The space bar is a wide key that also slides the caret, so it reads its
// strokes by their real angle on the glass: within 25 degrees of level is the
// caret's; above 70 degrees is straight up or down; between is a diagonal.
export const SPACE_LEVEL = 25;
export const SPACE_UPRIGHT = 70;

function spaceDir(x, y) {
  const level = Math.atan2(Math.abs(y), Math.abs(x)) * 180 / Math.PI;
  if (level < SPACE_LEVEL) return x > 0 ? 'e' : 'w';
  const vertical = y < 0 ? 'n' : 's';
  return level > SPACE_UPRIGHT ? vertical : vertical + (x > 0 ? 'e' : 'w');
}

/** { type: 'tap' }, { type: 'flick', dir } or { type: 'hook', dir, turn } for a release on the space bar. */
export function classifySpace(raw, keyH, peakTime = 0) {
  const base = classify(raw, keyH, keyH, peakTime);
  if (base.gesture === 'tap') return { type: 'tap' };
  const p = base.path;
  const L = legs(base);
  if (!L.straight && L.la >= HOOK.minFirst * base.swipeLen && L.turnDeg >= HOOK.minTurn) {
    const dir = spaceDir(L.a.x, L.a.y);
    const hook = L.turnDeg <= HOOK.backTurn && L.lb >= HOOK.minSecond * base.swipeLen && L.lb >= HOOK.minRatio * L.la;
    return hook ? { type: 'hook', dir, turn: L.cw ? 'cw' : 'ccw' } : { type: 'flick', dir };
  }
  const far = p[base.far ?? p.length - 1] || p.at(-1);
  return { type: 'flick', dir: spaceDir(far.x - p[0].x, far.y - p[0].y) };
}
