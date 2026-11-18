// The time model the theory is optimised against and evaluated with.
//
// Every number is borrowed, and says where from. The model ranks designs; it
// does not predict anyone's speed. docs/steno/research/02-hci-text-entry.md
// §6.1 derives the letter and hook costs.

export const TIMING = {
  // One letter gesture, tap or flick, for a one-thumb expert: the same-side
  // thumb tap fit of Oulasvirta et al. (2013) at the layout's mean index of
  // difficulty, 1.64 bits (docs/layout-science.md).
  letter: 262,
  // A word flick is a letter flick that types a word: one acquisition and one
  // short directed stroke. Costed slightly above the mean letter because it is
  // always a flick, never a tap.
  flick: 300,
  // A hook as the generator prices it: one acquisition plus two stroke
  // segments (CLC line times for a 10 mm and a 14 mm segment, Cao & Zhai 2007).
  // That is long for legs of 5 mm, so the evaluation also runs a faster figure.
  hook: 702,
  // An ending is a flick on the space bar, which is two cells wide.
  ending: 280,
  space: 262,
  mark: 300,
  // Turning to the letter or number page for one character, each way.
  pageSwitch: 400,
};

// Three sets of assumptions the evaluation is run under.
//
//   bare      the motor model alone: no recall, no mistakes; a hook is a flick
//             with a corner and a second short leg.
//   careful   a thumb that makes 6 mm strokes and aims within 6 degrees.
//   hurried   a thumb that makes 4.5 mm strokes and aims within 9 degrees.
//
// The last two take their mistake rates from tools/robustness.mjs, which
// draws the real dictionary's strokes with that kind of thumb. A mistake
// costs the time to notice it, take it back and write it again; a curl that
// came out as its own flick costs noticing and one "change" stroke. They also
// charge for recalling a curl or an ending, and price a hook more slowly. A
// piece is charged nothing for recall: it is a letter or a cluster in a fixed
// place, like a key.
export const SCENARIOS = {
  bare: { hook: 560, recall: 0, hand: null },
  careful: { hook: 702, recall: 150, hand: 'careful' },
  hurried: { hook: 922, recall: 300, hand: 'hurried' },
};
const NOTICE = 400;

/** Per-stroke costs for a scenario, given the mistake rates measured for its thumb. */
export function costsFor(scenario, rates) {
  const s = SCENARIOS[scenario];
  if (!rates) return { hook: s.hook, recall: 0, pieceError: 0, hookError: 0, endingError: 0 };
  const redo = ms => NOTICE + TIMING.letter + ms;            // notice, undo, write again
  return {
    hook: s.hook, recall: s.recall,
    pieceError: rates.piece.wrong * redo(TIMING.letter),
    hookError: rates.curl.wrong * redo(s.hook) + rates.curl.ownFlick * (NOTICE + TIMING.flick),
    endingError: rates.ending.wrong * redo(TIMING.ending),
  };
}

// What the generator charges, on top of time, for each gesture a stroke
// replaces: every gesture is a chance to slip, and fewer of them is less work
// even where the clock says it is a wash.
export const EFFORT_MS = 60;

/** Milliseconds to type a word letter by letter, followed by a space. */
export const spelledMs = w => (w.length + 1) * TIMING.letter;

/** Words per minute for `chars` characters typed in `ms` milliseconds. */
export const wpm = (chars, ms) => (chars / 5) / (ms / 60000);
