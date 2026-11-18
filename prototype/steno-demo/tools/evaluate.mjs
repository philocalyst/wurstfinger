// Measures the theory on text it has never seen.
//
//   node tools/evaluate.mjs [--json]
//
// The held-out tenth of each corpus (data/build/heldout.json) is typed twice by
// a model typist: once letter by letter on the current keyboard, once in steno
// mode with whatever part of the theory the typist is assumed to use. Stroke
// counts are exact. Two counts are given: strokes, which is what one thumb
// makes, and chords, which is what two thumbs make when neighbouring pieces in
// bank order are pressed together. Times come from src/model.js and are a
// model: they rank designs and size effects; they are not a measurement of
// people.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import theory from '../src/theory.generated.js';
import { defaultPacks, DEFAULT_CONTEXTS, resolvePacks } from '../src/packs.js';
import { makePlanner } from '../src/planner.js';
import { TIMING, SCENARIOS, costsFor, wpm } from '../src/model.js';
import { errorRates, HANDS } from './robustness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const heldout = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'build', 'heldout.json'), 'utf8'));
// The texting pack rewrites what the corpus says, so the evaluation leaves it out.
const { entries } = resolvePacks(defaultPacks(theory), DEFAULT_CONTEXTS.messages.stack.filter(id => id !== 'texting'));
const planner = makePlanner(entries, theory);

// Marks the steno page can type, and whether each is a flick or a flick and a curl.
const markCost = {};
for (const [outline, translation] of Object.entries(entries)) {
  if (!/^SR/.test(outline) || outline.includes('/')) continue;
  const m = /^\{([.,?!:;"])\}$/.exec(translation) || /^\{&(.)\}$/.exec(translation) || /^\{\^\}(.)\{\^\}$/.exec(translation) || /^\{\^?([()])\^?\}$/.exec(translation);
  if (m) markCost[m[1]] = /-(cw|ccw|back)$/.test(outline) ? 'hook' : 'flick';
}

function tokens(text) {
  const out = [];
  const re = /([A-Za-z]+(?:'[A-Za-z]+)*)|(\d+)|(\s+)|(.)/gu;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) out.push({ t: 'word', v: m[1].toLowerCase() });
    else if (m[2]) out.push({ t: 'num', v: m[2] });
    else if (m[3]) out.push({ t: 'gap' });
    else out.push({ t: 'mark', v: m[4] });
  }
  return out;
}

/** The current keyboard: one gesture per character, as typed. */
const letterCost = text => [...text.replace(/\s+/g, ' ').trim()].length;

const BREAK = 'SP';                    // anything that is not a piece ends a chord

/**
 * One message in steno mode: counts by kind of stroke, and the strokes in
 * order (for counting chords). `uses(plan)` says whether the typist uses a
 * plan or writes the word by its pieces.
 */
function stenoCount(text, uses) {
  const n = { piece: 0, space: 0, curl: 0, ending: 0, complete: 0, mark: 0, markHook: 0, pageSwitch: 0, words: 0, chords: 0, by: { pieces: 0, curl: 0, ending: 0, completion: 0, other: 0 } };
  const order = [];
  let owesSpace = false;
  const piecesOf = word => {
    // A word with an apostrophe the endings do not cover is its parts with the apostrophe between.
    const strokes = [];
    for (const [i, part] of word.split("'").entries()) {
      if (i) strokes.push('SR-sw');
      const p = planner.pieces(part);
      if (!p) return null;
      strokes.push(...p.strokes);
    }
    return { kind: 'pieces', strokes, spelled: true };
  };
  for (const tok of tokens(text.replace(/\s+/g, ' ').trim())) {
    if (tok.t === 'gap') continue;
    if (tok.t === 'word') {
      n.words++;
      let plan = planner.plan(tok.v);
      if (!plan || !uses(plan)) plan = piecesOf(tok.v);
      if (!plan) {                         // a letter the steno page does not have (a bare q): the letter page
        n.piece += tok.v.length; n.pageSwitch += 2; n.by.other++; owesSpace = true; order.push(BREAK);
        continue;
      }
      const first = plan.kind === 'ending' ? plan.base : plan;
      if (first.kind !== 'curl' && owesSpace) { n.space++; order.push(BREAK); }
      const count = p => {
        if (p.kind === 'curl') { n.curl++; order.push(BREAK); }
        else if (p.kind === 'completion') { n.piece += p.strokes.length - 1; n.complete++; order.push(...p.strokes.slice(0, -1), BREAK); }
        else { n.piece += p.strokes.length; order.push(...p.strokes); }
      };
      if (plan.kind === 'ending') { count(plan.base); n.ending++; order.push(BREAK); } else count(plan);
      n.by[plan.kind]++;
      owesSpace = !!plan.spelled;
    } else if (tok.t === 'num') {
      n.piece += tok.v.length; n.pageSwitch += 2; order.push(BREAK);
      owesSpace = true;
    } else {
      const kind = markCost[tok.v];
      if (kind === 'flick') n.mark++; else if (kind === 'hook') n.markHook++; else { n.piece++; n.pageSwitch += 2; }
      order.push(BREAK);
      owesSpace = false;
    }
  }
  // Two thumbs: pieces in rising bank order go down together.
  let run = [];
  const flush = () => { if (run.length) { n.chords += planner.chords(run); run = []; } };
  for (const id of order) { if (id === BREAK) { flush(); n.chords++; } else run.push(id); }
  flush();
  // The breaks stood in for strokes already counted, except where a number or an unknown word was typed letter by letter.
  n.chords += n.pageSwitch;
  return n;
}

const strokesOf = n => n.piece + n.space + n.curl + n.ending + n.complete + n.mark + n.markHook + n.pageSwitch;
const msOf = (n, c) => (n.piece + n.space) * (TIMING.letter + c.pieceError)
  + n.curl * (c.hook + c.recall + c.hookError)
  + (n.ending + n.complete) * (TIMING.ending + c.recall + c.endingError)
  + n.mark * TIMING.mark + n.markHook * c.hook + n.pageSwitch * TIMING.pageSwitch;

const RATES = Object.fromEntries(Object.entries(HANDS).map(([name, hand]) => [name, errorRates(hand)]));
const COSTS = Object.fromEntries(Object.keys(SCENARIOS).map(name => [name, costsFor(name, SCENARIOS[name].hand ? RATES[SCENARIOS[name].hand] : null)]));
// The letter keyboard makes mistakes too: a letter flick there is as likely to go astray as a piece here.
const letterMs = (strokes, c) => strokes * (TIMING.letter + c.pieceError);

// What a typist uses, as stages. Curls are picked up commonest first.
const curlRank = Object.values(theory.curls).sort((a, b) => (theory.weight[b] || 0) - (theory.weight[a] || 0));
function stage(name, { endings = false, curls = 0, completions = false }) {
  const known = new Set(curlRank.slice(0, curls));
  const direct = p => p.kind === 'pieces' || (p.kind === 'curl' && known.has(p.word)) || (p.kind === 'completion' && completions);
  return { name, uses: p => p.kind === 'ending' ? endings && direct(p.base) : direct(p) };
}
const stages = [
  stage('pieces only', {}),
  stage('and the endings', { endings: true }),
  stage('and 40 curls', { endings: true, curls: 40 }),
  stage('and every curl', { endings: true, curls: 9999 }),
  stage('and completions', { endings: true, curls: 9999, completions: true }),
];

const results = {};
for (const [corpus, messages] of Object.entries(heldout)) {
  let chars = 0;
  for (const text of messages) chars += letterCost(text);
  const letterWpm = Object.fromEntries(Object.entries(COSTS).map(([id, c]) => [id, wpm(chars, letterMs(chars, c))]));
  let words = 0;
  const rows = stages.map(st => {
    const total = { piece: 0, space: 0, curl: 0, ending: 0, complete: 0, mark: 0, markHook: 0, pageSwitch: 0, words: 0, chords: 0, by: { pieces: 0, curl: 0, ending: 0, completion: 0, other: 0 } };
    for (const text of messages) {
      const n = stenoCount(text, st.uses);
      for (const k of Object.keys(total)) if (k !== 'by') total[k] += n[k];
      for (const k of Object.keys(total.by)) total.by[k] += n.by[k];
    }
    words = total.words;
    const strokes = strokesOf(total);
    return {
      stage: st.name, strokesPerWord: strokes / total.words, chordsPerWord: total.chords / total.words, saving: 1 - strokes / chars,
      chordSaving: 1 - total.chords / chars,
      wpm: Object.fromEntries(Object.entries(COSTS).map(([id, c]) => [id, wpm(chars, msOf(total, c))])),
      share: Object.fromEntries(Object.entries(total.by).map(([k, v]) => [k, v / total.words])),
    };
  });
  results[corpus] = { messages: messages.length, chars, letterStrokesPerWord: chars / words, letterWpm, rows };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ results, rates: RATES }, null, 1));
} else {
  console.log('mistake rates by thumb:', JSON.stringify(RATES, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
  for (const [corpus, r] of Object.entries(results)) {
    console.log(`\n== ${corpus}: ${r.messages} held-out messages, ${r.chars} characters; letter keyboard ${r.letterStrokesPerWord.toFixed(2)} strokes/word, ${Object.entries(r.letterWpm).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' / ')} WPM (model)`);
    console.log('you use'.padEnd(20), 'strokes/word', 'fewer', 'chords/word', 'fewer', ...Object.keys(COSTS).map(k => k.padStart(9)), '   pieces/curl/ending/completion %');
    for (const row of r.rows) {
      const pct = k => (row.share[k] * 100).toFixed(0).padStart(3);
      console.log(row.stage.padEnd(20), row.strokesPerWord.toFixed(2).padStart(12), ((row.saving * 100).toFixed(0) + ' %').padStart(5),
        row.chordsPerWord.toFixed(2).padStart(11), ((row.chordSaving * 100).toFixed(0) + ' %').padStart(5),
        ...Object.keys(COSTS).map(k => row.wpm[k].toFixed(1).padStart(9)), '  ', pct('pieces'), pct('curl'), pct('ending'), pct('completion'));
    }
  }
}
