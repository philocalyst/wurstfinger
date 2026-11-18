// The keyboard's geography, shared by the theory generator, the evaluator and
// the browser demo. Nothing here depends on the DOM.
//
// Keys are named by their tap letter in the English MessagEase layout:
//
//     A N I
//     H O R
//     T E S
//
// A stroke is written KEY-direction[-turn]: `T-n` is a flick north on T,
// `T-n-cw` the same flick finished with a clockwise curl, `T-n-ccw` with a
// counter-clockwise curl, `T-n-back` an out-and-back. `SP` is the left half of
// the space bar and `SR` its right half; a tap on either is `SP`.
//
// The names are positions. On the letter page a key types the letter it is
// named for; on the steno page it types whatever the dictionaries put there.

export const KEYS = ['A', 'N', 'I', 'H', 'O', 'R', 'T', 'E', 'S'];
export const KEY_POS = Object.fromEntries(KEYS.map((k, i) => [k, { col: i % 3, row: Math.floor(i / 3) }]));
export const keyAt = (col, row) => (col < 0 || col > 2 || row < 0 || row > 2) ? null : KEYS[row * 3 + col];

// Screen directions, y pointing down, in the classifier's sector order.
export const DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
export const DIR_VEC = {
  e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0], nw: [-1, -1], n: [0, -1], ne: [1, -1],
};
export const DIR_ARROW = { e: '→', se: '↘', s: '↓', sw: '↙', w: '←', nw: '↖', n: '↑', ne: '↗' };
export const isCardinal = d => d.length === 1;
export const TURNS = ['cw', 'ccw', 'back'];

export const neighbour = (key, dir) => {
  const p = KEY_POS[key], v = DIR_VEC[dir];
  return keyAt(p.col + v[0], p.row + v[1]);
};

/** Direction after a quarter turn; `cw` is clockwise as seen on screen. */
export function turned(dir, turn) {
  const i = DIRS.indexOf(dir);
  if (turn === 'back') return DIRS[(i + 4) % 8];
  return DIRS[(i + (turn === 'cw' ? 2 : 6)) % 8];
}

// ------------------------------------------------------------ detail mode
//
// The current keyboard, unchanged: docs/steno/research/03-current-keyboard-spec.md §1.3.
// `ret` is what a return swipe types when it differs from the plain flick.

const L = (label, ret) => ({ label, ret });
const act = (label, action) => ({ label, action });

export const DETAIL = {
  A: { tap: 'a', nw: act('🅒', 'cycleAccents'), ne: L('˘', '‚'), e: L('-', '÷'), sw: L('$', '¥'), s: L('…', '•'), se: L('v', 'V') },
  N: { tap: 'n', nw: L('`', '‘'), n: L('^'), ne: L('´', '’'), w: L('+', '×'), e: L('!', '¡'), sw: L('/', '–'), s: L('l', 'L'), se: L('\\', '—') },
  I: { tap: 'i', n: act('↑', 'lineUp'), ne: { label: '', out: '\n' }, w: L('?', '¿'), sw: L('x', 'X'), s: L('=', '±'), se: L('€', '£') },
  H: { tap: 'h', nw: L('{', '}'), ne: L('%', '‰'), w: L('(', ')'), e: L('k', 'K'), sw: L('[', ']'), s: L('˛'), se: L('_', '¬') },
  O: { tap: 'o', nw: L('q', 'Q'), n: L('u', 'U'), ne: L('p', 'P'), w: L('c', 'C'), e: L('b', 'B'), sw: L('g', 'G'), s: L('d', 'D'), se: L('j', 'J') },
  R: { tap: 'r', nw: L('|', '¶'), n: act('⇧', 'shift'), ne: L('}', '{'), w: L('m', 'M'), e: L(')', '('), sw: L('@', 'ª'), se: L(']', '[') },
  T: { tap: 't', nw: L('~', '˜'), n: L('¨'), ne: L('y', 'Y'), w: L('<', '‹'), e: L('*', '†'), sw: L('ˇ', '«'), s: L('¸', '»'), se: { label: '⇥', out: '\t' } },
  E: { tap: 'e', nw: L('"', '“'), n: L('w', 'W'), ne: L("'", '”'), e: L('z', 'Z'), sw: L(','), s: L('.', '…'), se: L(':', '„') },
  S: { tap: 's', nw: L('f', 'F'), n: L('&', '§'), ne: L('°', 'º'), w: L('#', '£'), e: L('>', '›'), sw: L(';'), s: act('↓', 'lineDown'), se: { label: '', out: ' ' } },
};

// Numbers: the same punctuation round digits (spec §1.5). The grid is three
// columns wide now, so zero has no key of its own: it sits under the 8, a
// flick down toward the space bar, and under the 5.
export const NUMERIC = {
  A: { ...DETAIL.A, tap: '1', se: undefined, w: L('≤') },
  N: { ...DETAIL.N, tap: '2', s: undefined },
  I: { ...DETAIL.I, tap: '3', sw: undefined, e: L('≥') },
  H: { ...DETAIL.H, tap: '4', e: undefined },
  O: { tap: '5', s: L('0') },
  R: { ...DETAIL.R, tap: '6', n: undefined, w: undefined },
  T: { ...DETAIL.T, tap: '7', ne: undefined },
  E: { ...DETAIL.E, tap: '8', n: L('0'), e: undefined },
  S: { ...DETAIL.S, tap: '9', nw: undefined },
};

// ------------------------------------------------------------- steno mode
//
// Letters stay exactly where they are. So do the six everyday marks and
// shift. Every other direction is free for a word.

const isLetter = s => /^[a-z]$/.test(s);
export const STENO_KEEP_MARKS = new Set(['.', ',', '?', '!', "'", '-']);

/** The letter a flick types (lowercase), or null. Same in both modes. */
export const letterOf = (key, dir) => {
  const b = DETAIL[key][dir];
  return b && isLetter(b.label) ? b.label : null;
};

/** Letters a key carries: its tap letter first, then its flick letters. */
export const FAMILY = Object.fromEntries(KEYS.map(k =>
  [k, [DETAIL[k].tap, ...DIRS.map(d => letterOf(k, d)).filter(Boolean)]]));

/** Where each letter lives: { key, dir } with dir null for a tap. */
export const LETTER_HOME = {};
for (const k of KEYS) {
  LETTER_HOME[DETAIL[k].tap] = { key: k, dir: null };
  for (const d of DIRS) { const l = letterOf(k, d); if (l) LETTER_HOME[l] = { key: k, dir: d }; }
}

/** What a steno-mode flick slot is before the theory fills it. */
export function stenoSlotKind(key, dir) {
  const b = DETAIL[key][dir];
  if (!b) return 'free';
  if (isLetter(b.label)) return 'letter';
  if (STENO_KEEP_MARKS.has(b.label)) return 'mark';
  if (b.action === 'shift') return 'shift';
  return 'free';
}

export const FREE_SLOTS = KEYS.flatMap(k => DIRS.filter(d => stenoSlotKind(k, d) === 'free').map(d => ({ key: k, dir: d })));
export const LETTER_SLOTS = KEYS.flatMap(k => DIRS.filter(d => stenoSlotKind(k, d) === 'letter').map(d => ({ key: k, dir: d, letter: letterOf(k, d) })));

// The space bar's flicks, in steno mode, finish the word with an ending.
// Left and right stay the caret slide.
export const ENDING_DIRS = ['n', 'ne', 'nw', 's', 'se', 'sw'];

export const strokeId = (key, dir, turn) => turn ? `${key}-${dir}-${turn}` : dir ? `${key}-${dir}` : key;
export function parseStroke(id) {
  const m = /^(SP|SR|[ANIHORTES])(?:-(n|ne|e|se|s|sw|w|nw)(?:-(cw|ccw|back))?)?$/.exec(id);
  return m ? { key: m[1], dir: m[2] || null, turn: m[3] || null } : null;
}
export const isStrokeId = id => parseStroke(id) !== null;

/** The column a key is in: 0, 1 or 2. On the steno page these are the onset, vowel and coda banks. */
export const columnOf = key => KEY_POS[key]?.col ?? (key === 'SP' ? 0 : key === 'SR' ? 1 : 2);
export const BANK_NAMES = ['onset', 'vowel', 'coda'];
