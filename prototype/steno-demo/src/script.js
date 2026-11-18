// Turns a sentence into the strokes that type it in steno mode.
//
// The demo's "watch" button plays these strokes with a synthetic finger, the
// lessons show them under each word, and the round-trip test feeds them to the
// engine and checks the text comes out exactly.

/**
 * @param text     the sentence
 * @param planner  from makePlanner
 * @param entries  the resolved dictionary, to find the stroke for each mark
 * @param level    'pieces' writes every word by its pieces; 'all' also uses curls, endings and completions
 * @returns [{ id, word?, kind }] or null when the text needs something the steno page does not have
 */
export function scriptFor(text, planner, entries, level = 'all') {
  // The stroke for each mark: the shortest single stroke whose entry is that mark.
  const markStroke = {};
  for (const [outline, translation] of Object.entries(entries)) {
    if (!/^[A-Z]/.test(outline) || outline.includes('/')) continue;
    const m = /^\{([.,?!:;])\}$/.exec(translation) || /^\{&(')\}$/.exec(translation) || /^\{\^\}(-)\{\^\}$/.exec(translation);
    if (m && (!(m[1] in markStroke) || outline.length < markStroke[m[1]].length)) markStroke[m[1]] = outline;
  }
  const out = [];
  const tokens = text.match(/[A-Za-z]+(?:'[A-Za-z]+)*|\s+|[^\sA-Za-z]/g) || [];
  let owesSpace = false;               // the last thing written ended in pieces
  let sentenceStart = true;
  let glued = false;                   // a hyphen attaches what follows

  const cased = (tok, expectCapital) => {
    const isCapital = tok[0] !== tok[0].toLowerCase();
    if (tok.slice(1) !== tok.slice(1).toLowerCase()) return null;         // mixed case: not for this script
    if (isCapital === expectCapital) return [];
    return isCapital && planner.shiftStroke ? [{ id: planner.shiftStroke, word: tok, kind: 'shift' }] : null;
  };
  /** A word with an apostrophe the dictionaries have no ending for: its pieces, with the apostrophe between. */
  const withApostrophe = lower => {
    const strokes = [];
    for (const [i, part] of lower.split("'").entries()) {
      if (i) { if (!markStroke["'"]) return null; strokes.push(markStroke["'"]); }
      const p = planner.pieces(part);
      if (!p) return null;
      strokes.push(...p.strokes);
    }
    return { kind: 'pieces', strokes, spelled: true };
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^\s+$/.test(tok)) { if (tok.includes('\n')) return null; continue; }
    if (!/^[A-Za-z]/.test(tok)) {
      const id = markStroke[tok];
      if (!id) return null;
      out.push({ id, kind: 'mark' });
      owesSpace = false;
      glued = tok === '-';
      if (/[.?!]/.test(tok)) sentenceStart = true;
      continue;
    }
    const lower = tok.toLowerCase();

    // A phrase stroke, if the next words are one.
    if (level === 'all' && planner.longestPhrase > 1) {
      let used = 0;
      for (let n = planner.longestPhrase; n >= 2 && !used; n--) {
        const run = [];
        let j = i;
        while (run.length < n && j < tokens.length) {
          if (/^[A-Za-z]/.test(tokens[j])) run.push(tokens[j]); else if (!/^ $/.test(tokens[j])) break;
          j++;
        }
        if (run.length < n) continue;
        const stroke = planner.phrase(run.map(w => w.toLowerCase()));
        if (!stroke) continue;
        const shifts = cased(run[0], sentenceStart);
        if (!shifts || run.slice(1).some(w => w !== w.toLowerCase() && !/^I($|')/.test(w))) continue;
        out.push(...shifts, { id: stroke, word: run.join(' '), kind: 'phrase', words: n });
        used = j - i;
      }
      if (used) { i += used - 1; owesSpace = false; sentenceStart = false; glued = false; continue; }
    }

    let plan = level === 'pieces' ? null : planner.plan(lower);
    if (!plan || (plan.kind === 'pieces' && lower.includes("'"))) plan = lower.includes("'") && !(plan && plan.kind !== 'pieces') ? withApostrophe(lower) : (plan || null);
    if (level === 'pieces') plan = lower.includes("'") ? withApostrophe(lower) : (() => { const p = planner.pieces(lower); return p ? { kind: 'pieces', strokes: p.strokes, spelled: true } : null; })();
    if (!plan) return null;
    // A completion that would give a capital the text does not have (Friday for friday) is not the way to write it.
    const capital = p => p.kind === 'completion' && /^[A-Z]/.test(String(entries[p.outline])) && tok[0] === lower[0];
    if (capital(plan) || (plan.kind === 'ending' && capital(plan.base))) { const p = planner.pieces(lower); if (!p) return null; plan = { kind: 'pieces', strokes: p.strokes, spelled: true }; }

    const first = plan.kind === 'ending' ? plan.base : plan;
    const startsWithPieces = first.kind !== 'curl';
    // The pronoun is capital whoever writes it; a curl that types it types it capital.
    const shifts = cased(tok, sentenceStart || /^i($|')/.test(lower));
    if (!shifts) return null;
    if (startsWithPieces && owesSpace && !glued) { if (!planner.spaceStroke) return null; out.push({ id: planner.spaceStroke, kind: 'space' }); }
    out.push(...shifts);
    const kindOfStroke = (p, k) => p.kind === 'curl' ? 'curl' : p.kind === 'completion' ? (k === p.strokes.length - 1 ? 'complete' : 'completion') : 'piece';
    if (plan.kind === 'ending') {
      plan.base.strokes.forEach((id, k) => out.push({ id, word: tok, kind: kindOfStroke(plan.base, k) }));
      out.push({ id: plan.strokes.at(-1), word: tok, kind: 'ending' });
    } else plan.strokes.forEach((id, k) => out.push({ id, word: tok, kind: kindOfStroke(plan, k) }));
    owesSpace = !!plan.spelled;
    sentenceStart = false; glued = false;
  }
  return out;
}
