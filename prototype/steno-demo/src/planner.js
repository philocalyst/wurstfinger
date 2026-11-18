// Answers "how is this word written?" for a set of dictionaries.
//
// The lookup tool, the coach, the lessons and the evaluator all ask the same
// question, so they all go through here. A word is written by its pieces,
// which is always possible; a curl, an ending or a completion is used when it
// is quicker. The answer is the single cheapest plan.

import { TIMING } from './model.js';
import { isStrokeOutline, isSpelledOutline, labelOf, parseTranslation } from './packs.js';
import { parseStroke, columnOf, BANK_NAMES } from './layout.js';
import { segment, roles } from './syllable.js';

const TURN = /-(cw|ccw|back)$/;

/**
 * @param entries  the resolved dictionary, { outline: translation }
 * @param theory   the generated theory, for which words are a base plus an ending
 */
export function makePlanner(entries, theory) {
  const wordStroke = new Map();        // text (a word or a phrase, lowercase) -> the one stroke that types it
  const completionOf = new Map();      // text -> spelled outline
  const endingStroke = new Map();      // ending -> stroke id
  const pieceStrokes = new Map();      // a chunk or a single character -> [{ id, bank }]
  let completeStroke = null, spaceStroke = null, shiftStroke = null;

  const costOfStroke = id => id.startsWith('S') && parseStroke(id)?.key.startsWith('S') ? TIMING.ending : TURN.test(id) ? TIMING.hook : TIMING.letter;
  for (const [outline, translation] of Object.entries(entries)) {
    const stroke = isStrokeOutline(outline) && !outline.includes('/');
    if (stroke && translation === '{=}') { completeStroke ||= outline; continue; }
    if (stroke && translation === '{^ ^}') { spaceStroke ||= outline; continue; }
    if (stroke && translation === '{-|}') { shiftStroke ||= outline; continue; }
    const ending = /^\{\^([^}^]+)\}$/.exec(translation);
    if (ending && stroke) { if (!endingStroke.has(ending[1]) || outline.length < endingStroke.get(ending[1]).length) endingStroke.set(ending[1], outline); continue; }
    let atoms;
    try { atoms = parseTranslation(translation); } catch { continue; }
    // A piece: one glued run of characters on a tap or a flick.
    if (stroke && atoms.length === 1 && atoms[0].op?.[0] === '&' && !TURN.test(outline) && !outline.endsWith('-circle')) {
      const text = atoms[0].op.slice(1);
      if (!pieceStrokes.has(text)) pieceStrokes.set(text, []);
      pieceStrokes.get(text).push({ id: outline, bank: BANK_NAMES[columnOf(parseStroke(outline).key)] });
      continue;
    }
    if (!atoms.every(a => a.text !== undefined)) continue;
    const text = translation.toLowerCase();
    if (stroke) {
      const have = wordStroke.get(text);
      if (!have || costOfStroke(outline) < costOfStroke(have)) wordStroke.set(text, outline);
    } else if (isSpelledOutline(outline) && (!completionOf.has(text) || outline.length < completionOf.get(text).length)) {
      completionOf.set(text, outline);
    }
  }
  const chunks = new Set([...pieceStrokes.keys()].filter(c => c.length > 1));
  const longest = Math.max(1, ...[...chunks].map(c => c.length));
  const derived = theory.derived;

  /** The pieces of a run of letters and the stroke for each, or null if a character has no stroke here. */
  function pieces(text) {
    const parts = segment(text, chunks, longest), where = roles(text, parts);
    const strokes = [];
    for (let i = 0; i < parts.length; i++) {
      const options = pieceStrokes.get(parts[i]);
      if (!options) return null;
      // The stroke in the bank the piece belongs to, so that a chord reads in order.
      strokes.push((options.find(o => o.bank === where[i]) || options[0]).id);
    }
    return { parts, strokes };
  }

  /** How many chords two thumbs make of a run of strokes: neighbours in rising bank order go together, two at a time. */
  function chords(strokes) {
    let n = 0, size = 0, last = -1;
    for (const id of strokes) {
      const s = parseStroke(id);
      const col = s && !s.key.startsWith('S') && !s.turn ? columnOf(s.key) : null;
      if (col !== null && size === 1 && col > last) { size = 2; continue; }      // joins the stroke before it
      n++; size = col === null ? 2 : 1; last = col ?? -1;
    }
    return n;
  }

  const spelled = word => {
    const p = pieces(word);
    return p ? { kind: 'pieces', word, parts: p.parts, strokes: p.strokes, gestures: p.strokes.length, ms: p.strokes.length * TIMING.letter, spelled: true } : null;
  };

  /** A word on its own, endings not considered. Null if it cannot be written on this page at all. */
  function direct(word) {
    const structural = spelled(word);
    const stroke = wordStroke.get(word);
    const curl = stroke ? { kind: 'curl', word, strokes: [stroke], gestures: 1, ms: costOfStroke(stroke), spelled: false } : null;
    const outline = completionOf.get(word);
    const prefix = outline && completeStroke ? spelled(outline) : null;
    const completion = prefix ? { kind: 'completion', word, outline, parts: prefix.parts, strokes: [...prefix.strokes, completeStroke], gestures: prefix.gestures + 1, ms: prefix.ms + TIMING.ending, spelled: false } : null;
    // A spelled word owes a space as often as not; a curl or a completion never does.
    const cost = p => p.ms + (p.spelled ? TIMING.space / 2 : 0);
    return [curl, completion, structural].filter(Boolean).sort((a, b) => cost(a) - cost(b))[0] || null;
  }

  /**
   * The cheapest way to write `word` (lowercase), or null. `spelled` says
   * whether the plan ends in pieces, in which case a space is owed before the
   * next word; a curl, an ending or a completion supplies its own.
   */
  function plan(word) {
    const best = direct(word);
    if (best && best.kind === 'curl') return best;
    const d = derived[word];
    if (d) {
      const [stem, ending] = d.split(' ');
      const stroke = endingStroke.get(ending);
      const base = stroke ? direct(stem) : null;
      if (base) {
        const withEnding = { kind: 'ending', word, base, ending, strokes: [...base.strokes, stroke], gestures: base.gestures + 1, ms: base.ms + TIMING.ending, spelled: false };
        if (!best || withEnding.ms <= best.ms + (best.spelled ? TIMING.space / 2 : 0)) return withEnding;
      }
    }
    return best;
  }

  /** The stroke for a run of words written as one phrase, or null. */
  const phrase = words => wordStroke.get(words.join(' ')) || null;
  const longestPhrase = Math.max(1, ...[...wordStroke.keys()].map(t => t.split(' ').length));

  /** Outlines that type exactly this text, whatever it is: a word, a phrase or a snippet. */
  function producing(text) {
    const want = text.toLowerCase();
    return Object.entries(entries).filter(([, t]) => labelOf(t).toLowerCase() === want).map(([o]) => o);
  }

  return { plan, pieces, chords, phrase, longestPhrase, producing, wordStroke, completionOf, endingStroke, pieceStrokes, completeStroke, spaceStroke, shiftStroke, costOfStroke };
}
