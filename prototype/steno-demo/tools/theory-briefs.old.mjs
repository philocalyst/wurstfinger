// Derives the English steno theory from the corpus statistics.
//
//   node tools/theory.mjs
//
// Reads data/build/lexicon.json, writes src/theory.generated.js and prints the
// resulting keyboard. The rules, in the order they are applied:
//
// 1. WORD FLICKS. Letters, the six everyday marks and shift keep their
//    directions. Every other direction on a key holds a word of at most five
//    letters that begins with one of that key's letters: the words that save
//    the most. The two one-letter words, I and a, are the flick straight up on
//    their own keys. Within a key a word prefers the direction that points at
//    the key of its second letter, then the axes, and words that look alike
//    are kept off neighbouring directions, where a slip would swap them unseen.
// 2. HOOKS. A flick finished with a curl to the right or the left, or drawn
//    out and back, types another word from the same key.
//      a. The flicked word's own contractions, on fixed turns: right is
//         is/are/am, left is not/will, back is have/would.
//      b. Then, by how much each saves: a phrase that begins with the flicked
//         word, its kin, a word that begins with it, and after those any word
//         that begins with the same letter.
//      c. A letter flick takes the commonest words that begin with that letter.
//    A contraction never sits on another word's turn.
// 3. ENDINGS are fixed, not generated: the three inflections along the top of
//    the space bar, the two contractions that work on any word below.
// 4. COMPLETIONS. A word with no stroke gets the shortest spelling prefix that
//    no other word in the lexicon shares, so the offer is never ambiguous.
//    It is typed only when the typist asks.
//
// A word is assigned at most once, so every word has exactly one stroke.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KEYS, DIRS, FAMILY, LETTER_SLOTS, neighbour, isCardinal, strokeId, DETAIL, stenoSlotKind,
} from '../src/layout.js';
import { TIMING, spelledMs, EFFORT_MS } from '../src/model.js';
import { ENDINGS, applyEnding, stemsFor, canEnd } from '../src/orthography.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const lexicon = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'build', 'lexicon.json'), 'utf8'));

// ------------------------------------------------------------ vocabulary

// Fragments the tokeniser leaves behind, dialect spellings and fillers: real
// tokens, but not words anyone wants a stroke or a completion for.
const NOT_WORDS = new Set(`s t m d ll ve re n u r k c e b x o y p f g h j l q v w z ur im dont cant wat coz cos da th mr mrs
  dr ya em ah uh um hmm huh eh la didnt thats wont doesnt isnt ive youre ill hes shes theyre weve
  nothin somethin gettin goin doin lookin talkin comin tryin sayin havin makin takin bein thinkin fuckin
  woulda coulda shoulda kinda sorta outta lotta gotcha dunno lemme gimme`.split(/\s+/));
const proper = new Set(lexicon.proper);
const isWord = e => /^[a-z][a-z']*$/.test(e.w) && !NOT_WORDS.has(e.w) && !/in'$/.test(e.w);

const everyToken = lexicon.words;                                 // what the typist might spell
const words = lexicon.words.filter(isWord);                       // what may be offered
const strokable = words.filter(e => !proper.has(e.w));            // what may get a stroke
const pm = new Map(lexicon.words.map(e => [e.w, e.pm]));
const totalPm = words.reduce((s, e) => s + e.pm, 0);
const known = w => pm.has(w) && !NOT_WORDS.has(w);

// What a stroke saves: time under the model, plus a small price on every
// gesture it replaces, because a gesture is also a chance to slip.
const saved = (w, strokeMs) => spelledMs(w) - strokeMs + EFFORT_MS * w.length;
const flickBenefit = w => pm.get(w) * saved(w, TIMING.flick);
const hookBenefit = w => pm.get(w) * saved(w, TIMING.hook);

const assigned = new Map();            // word or phrase -> stroke id
const strokes = new Map();             // stroke id -> word or phrase
const assign = (word, stroke) => { assigned.set(word, stroke); strokes.set(stroke, word); };

// ------------------------------------------------------- 1. word flicks

const MAX_FLICK_LETTERS = 5;           // has to be readable in a corner of its key
const ONE_LETTER = { I: 'i', A: 'a' }; // the two one-letter words, straight up on their own keys
const slots = {};

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(p => [x, ...p]));
}

/** How well a word sits on a direction: it points at its second letter's key. */
function pointsAt(word, key, dir) {
  const next = neighbour(key, dir);
  if (!next || !word[1]) return 0;
  if (DETAIL[next].tap === word[1]) return 1;                 // t -> h for "the"
  return FAMILY[next].includes(word[1]) ? 0.35 : 0;
}

const commonPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };
/** How easily two words are mistaken for each other at a glance: you/your, he/her, it/if. */
const alike = (a, b) => { const r = commonPrefix(a, b) / Math.max(a.length, b.length); return r >= 0.5 ? r : 0; };
const adjacent = (d1, d2) => { const i = DIRS.indexOf(d1), j = DIRS.indexOf(d2); return (i - j + 8) % 8 === 1 || (j - i + 8) % 8 === 1; };

const freeDirs = key => DIRS.filter(d => stenoSlotKind(key, d) === 'free');

// Where a word may sit. A word belongs on the key of its first letter. The
// middle key has nine letters and no free direction, so a word that begins
// with one of them sits on the key of its second letter instead: "of" on S
// with f, "on" on N, "be" on E, "can" on A.
const MIDDLE = 'O';
const keysWith = letter => KEYS.filter(k => FAMILY[k].includes(letter));
function homeKeys(word) {
  const first = keysWith(word[0]);
  if (!first.includes(MIDDLE)) return first;
  return word.length > 1 ? keysWith(word[1]).filter(k => k !== MIDDLE) : [];
}

for (const key of KEYS) {
  slots[key] = {};
  let free = freeDirs(key);
  if (ONE_LETTER[key]) { slots[key].n = ONE_LETTER[key]; assign(ONE_LETTER[key], strokeId(key, 'n')); free = free.filter(d => d !== 'n'); }
  if (!free.length) continue;
  const candidates = strokable
    .filter(e => e.w.length >= 2 && e.w.length <= MAX_FLICK_LETTERS && !e.w.includes("'") && homeKeys(e.w).includes(key) && !assigned.has(e.w))
    .sort((a, b) => flickBenefit(b.w) - flickBenefit(a.w))
    .slice(0, free.length)
    .map(e => e.w);
  let best = null;
  for (const order of permutations(free)) {
    let score = 0;
    candidates.forEach((w, i) => { score += flickBenefit(w) * ((isCardinal(order[i]) ? 1 : 0.93) + 0.6 * pointsAt(w, key, order[i])); });
    // Look-alike words on neighbouring directions cost the smaller of the two, in proportion.
    const placed = [...candidates.map((w, i) => [w, order[i]]), ...Object.entries(slots[key]).map(([d, w]) => [w, d])];
    for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) {
      if (adjacent(placed[a][1], placed[b][1])) score -= 0.6 * alike(placed[a][0], placed[b][0]) * Math.min(flickBenefit(placed[a][0]), flickBenefit(placed[b][0]));
    }
    if (!best || score > best.score) best = { score, order };
  }
  candidates.forEach((w, i) => { slots[key][best.order[i]] = w; assign(w, strokeId(key, best.order[i])); });
}

// ------------------------------------------------------------- 2. hooks

const KIN = {
  do: ["don't", 'did', 'does', 'done', 'doing'], go: ['going', 'gone', 'went', 'gonna', 'goes'],
  get: ['got', 'getting', 'gotta', 'gets'], have: ['has', 'had', 'having'], be: ['been', 'being'],
  was: ['were'], will: ['would'], can: ['could'], want: ['wanna', 'wanted', 'wants'],
  know: ['knew', 'known', 'knows'], think: ['thought', 'thinking'], say: ['said', 'says', 'saying'],
  see: ['saw', 'seen', 'seeing'], come: ['came', 'coming', 'comes'], take: ['took', 'taken', 'taking'],
  make: ['made', 'making', 'makes'], give: ['gave', 'given', 'giving'], tell: ['told', 'telling'],
  he: ['him', 'his'], she: ['her'], they: ['them', 'their'], we: ['us', 'our'],
  you: ['your', 'yours', 'yourself'], me: ['my', 'mine', 'myself'], it: ['its'], this: ['these'],
  that: ['those'], good: ['better', 'best'], not: ['no', 'never', 'nothing'], what: ['whatever'],
  who: ['whose', 'whom'], thank: ['thanks'], feel: ['felt', 'feeling'], find: ['found'],
  leave: ['left', 'leaving'], mean: ['meant', 'means'], i: ['me', 'my'], a: ['an'],
};

// Contractions take fixed turns on every word that has them, so a turn means
// the same thing across the keyboard.
const TURN_CLASS = [
  { turn: 'cw', name: 'is/are/am', forms: base => [applyEnding(base, "'s")] },
  { turn: 'ccw', name: 'not/will', forms: base => [ENDINGS["n't"].apply(base), base + "'ll"] },
  { turn: 'back', name: 'have/would', forms: base => [base + "'ve", base + "'d"] },
];

const hooks = {};
const freeTurns = new Map();
const slotWord = new Map();
for (const key of KEYS) for (const [dir, w] of Object.entries(slots[key])) {
  freeTurns.set(strokeId(key, dir), ['cw', 'ccw', 'back']);
  slotWord.set(strokeId(key, dir), w);
}
// A letter's out-and-back stays its capital, as on the letter page, so a
// letter flick has two turns.
for (const s of LETTER_SLOTS) freeTurns.set(strokeId(s.key, s.dir), ['cw', 'ccw']);

function hook(parent, turn, text) {
  const left = freeTurns.get(parent);
  left.splice(left.indexOf(turn), 1);
  hooks[`${parent}-${turn}`] = text;
  assign(text, `${parent}-${turn}`);
}

const MIN_HOOK_PM = 100;               // a hook has to be worth learning
const worthHook = w => known(w) && !proper.has(w) && !assigned.has(w) && pm.get(w) >= MIN_HOOK_PM && hookBenefit(w) > 0;

// 2a. Contractions on their fixed turns.
for (const [parent, base] of slotWord) {
  for (const cls of TURN_CLASS) {
    const forms = cls.forms(base).map(f => f.toLowerCase()).filter(w => w !== base && worthHook(w)).sort((a, b) => pm.get(b) - pm.get(a));
    if (forms.length) hook(parent, cls.turn, forms[0]);
  }
}

// Phrases that begin with a flick word. What a phrase stroke saves is measured
// against the cheapest way to write its words one by one.
const costAlone = w => assigned.has(w) && !assigned.get(w).includes('-cw') && !assigned.get(w).includes('-ccw') && !assigned.get(w).includes('-back')
  ? TIMING.flick : Math.min(spelledMs(w), assigned.has(w) ? TIMING.hook : Infinity);
const phrases = lexicon.phrases
  .map(p => ({ text: p.g, parts: p.g.split(' '), pm: p.pm }))
  .filter(p => p.parts.length <= 3 && p.parts.every(known) && slotWord.size && [...slotWord.values()].includes(p.parts[0]))
  .map(p => ({ ...p, benefit: p.pm * (p.parts.reduce((s, w) => s + costAlone(w), 0) - TIMING.hook + EFFORT_MS * (p.parts.length - 1)) }))
  .filter(p => p.pm >= 3 * MIN_HOOK_PM && p.benefit > 0);

// 2b and 2c. Everything else, by what it saves.
const related = (base, w) => w.length > base.length && w.startsWith(base) && base.length >= 2;
const candidates = [
  ...strokable.map(e => e.w).filter(worthHook).map(w => ({ text: w, benefit: hookBenefit(w) })),
  ...phrases.map(p => ({ text: p.text, benefit: p.benefit, phrase: p })),
].sort((a, b) => b.benefit - a.benefit);
// Contractions are placed first among the winners, so each finds its own turn free.
const contractionsFirst = list => [...list.filter(c => c.text.includes("'") && !c.phrase), ...list.filter(c => !c.text.includes("'") || c.phrase)];

/** Where a candidate may hook, best first. */
function optionsFor(c) {
  const w = c.text;
  const options = [];
  if (c.phrase) {
    for (const [parent, base] of slotWord) if (base === c.phrase.parts[0] && freeTurns.get(parent).length) options.push({ id: parent, rank: 6 });
    return options;
  }
  const contraction = w.includes("'");
  for (const [parent, base] of slotWord) {
    if (!freeTurns.get(parent).length || contraction) continue;        // a contraction never sits on another word's turn
    if ((KIN[base] || []).includes(w)) options.push({ id: parent, rank: 5 });
    else if (related(base, w)) options.push({ id: parent, rank: 4 + base.length / 10 });
    else if (base[0] === w[0]) options.push({ id: parent, rank: commonPrefix(base, w) >= 2 ? 2 : 1 });
  }
  for (const s of LETTER_SLOTS) {
    const id = strokeId(s.key, s.dir);
    if (!freeTurns.get(id).length) continue;
    if (w[0] === s.letter) options.push({ id, rank: 3 });
    else if (w[0] === DETAIL[s.key].tap && w[1] === s.letter) options.push({ id, rank: 2.5 });     // o, u: out
  }
  return options.sort((x, y) => y.rank - x.rank);
}

// The turns that words beginning with one letter compete for: those of the
// flick words that begin with it, and its own letter flick. The most valuable
// candidates win the turns; relatedness only decides which turn each gets.
const capacity = {};
for (const [parent, base] of slotWord) capacity[base[0]] = (capacity[base[0]] || 0) + freeTurns.get(parent).length;
for (const s of LETTER_SLOTS) capacity[s.letter] = (capacity[s.letter] || 0) + freeTurns.get(strokeId(s.key, s.dir)).length;
// A word whose first letter has no turns of its own (o, on a key whose every
// direction is a letter) competes for the flick it spells next: o, u for "out".
const groupOf = c => {
  const first = (c.phrase ? c.phrase.parts[0] : c.text)[0];
  return capacity[first] || c.phrase ? first : c.text[1];
};
const winners = new Set();
const taken = {};
for (const c of candidates) {
  const g = groupOf(c);
  if ((taken[g] || 0) >= (capacity[g] || 0)) continue;
  taken[g] = (taken[g] || 0) + 1;
  winners.add(c.text);
}
// First the winners go to their closest relative; then everything, winners
// first by value, takes whatever turn is left on the right key.
// A contraction keeps its turn wherever it lands: is/are/am to the right, not/will to the left.
const turnFor = (id, text) => {
  const left = freeTurns.get(id);
  const cls = /n't$|'ll$/.test(text) ? 'ccw' : /'(m|re|s)$/.test(text) ? 'cw' : /'(ve|d)$/.test(text) ? 'back' : null;
  return cls && left.includes(cls) ? cls : left[0];
};
for (const c of contractionsFirst(candidates)) {
  if (!winners.has(c.text) || assigned.has(c.text)) continue;
  const options = optionsFor(c).filter(o => o.rank >= 2.5);
  if (options.length) hook(options[0].id, turnFor(options[0].id, c.text), c.text);
}
for (const c of candidates) {
  if (assigned.has(c.text)) continue;
  const options = optionsFor(c);
  if (options.length) hook(options[0].id, turnFor(options[0].id, c.text), c.text);
}

// ----------------------------------------------------------- 3. endings

// Along the top, the inflections. Below, the contractions, laid out as the
// curls are: "not" and "will" to the left, "is" and "have" to the right. A
// curl on a lower flick is the second contraction of that side.
const endings = {
  'SP-nw': 'ed', 'SP-n': 's', 'SP-ne': 'ing',
  'SP-sw': "n't", 'SP-sw-cw': "'ll", 'SP-sw-ccw': "'ll",
  'SP-se': "'s", 'SP-se-ccw': "'ve", 'SP-se-cw': "'d",
};
const liveEndings = new Set(Object.values(endings));

// Words that look like a base plus an ending and are not.
const FALSE_FRIENDS = new Set(`evening news shed herring wing king thing during morning nothing something anything
  everything bring spring string ring sing bed red need feed speed seed weed hundred united less class glass pass
  across always perhaps towards besides sometimes series species lens means earnings clothes glasses jeans pants
  shorts scissors thanks congratulations regards customs goods odds sales savings stairs surroundings wed bled fed
  sled bring cling sting swing wring ceiling darling sibling pudding wedding building feeling meeting being
  better butter letter matter number paper water under over other mother father brother sister never ever
  family early only holy july reply apply supply fly ally belly bully jelly lily rally silly ugly folly`.split(/\s+/));

// Which words are a commoner word plus an ending. The planner writes them that way.
const derived = new Map();
for (const { w } of words) {
  if (assigned.has(w)) continue;
  for (const ending of Object.keys(ENDINGS)) {
    for (const base of stemsFor(w, ending)) {
      // The base has to be a real word in its own right: at least three letters
      // (or a pronoun or auxiliary taking a contraction) and not much rarer than
      // what it is said to make. "thing" is not "the" with an ending.
      const contraction = ending.includes("'");
      if (!known(base) || base === w || base.length < (contraction ? 1 : 3) || pm.get(base) < pm.get(w) * 0.3) continue;
      // The keyboard has to agree that the base takes the ending, and the result
      // must not be a word of its own that only looks like one (evening, news).
      if (!canEnd(base, ending) || FALSE_FRIENDS.has(w) || applyEnding(base, ending) !== w) continue;
      const have = derived.get(w);
      if (!have || pm.get(base) > pm.get(have.base)) derived.set(w, { base, ending });
    }
  }
}
const endingMass = {};
for (const [w, { ending }] of derived) endingMass[ending] = (endingMass[ending] || 0) + pm.get(w);

// --------------------------------------------------------- 4. completions

// A prefix completes to a word when the typist could hardly mean anything else
// by it: the word and its own inflections are at least nine tenths of
// everything in the lexicon that begins that way, and the prefix is not a
// token itself. Names and other proper nouns complete to their capital form.
const MIN_COMPLETION_PM = 5;
const MIN_PREFIX = 3;
const MIN_SAVED = 2;                   // letters saved; the complete stroke costs one back and saves the space
const DOMINANCE = 0.9;
const prefixMass = new Map();          // prefix -> total weight of tokens that begin with it
for (const { w, pm: weight } of everyToken) for (let n = MIN_PREFIX; n <= w.length; n++) {
  const p = w.slice(0, n);
  prefixMass.set(p, (prefixMass.get(p) || 0) + weight);
}
const familyOf = new Map();            // word -> the tokens that are that word or an inflection of it
for (const { w } of everyToken) {
  const base = derived.get(w)?.base;
  for (const head of [w, base].filter(Boolean)) { if (!familyOf.has(head)) familyOf.set(head, []); familyOf.get(head).push(w); }
}
const completions = {};
const properCase = w => w[0].toUpperCase() + w.slice(1);
for (const { w } of words) {
  if (assigned.has(w) || pm.get(w) < MIN_COMPLETION_PM || w.includes("'")) continue;
  const d = derived.get(w);
  if (d && liveEndings.has(d.ending)) continue;       // base + ending is already its one stroke
  const family = familyOf.get(w) || [w];
  for (let n = MIN_PREFIX; n <= w.length - MIN_SAVED; n++) {
    const prefix = w.slice(0, n);
    if (pm.has(prefix) || prefix in completions) continue;
    const mine = family.filter(f => f.startsWith(prefix)).reduce((s, f) => s + pm.get(f), 0);
    if (mine < DOMINANCE * prefixMass.get(prefix)) continue;
    completions[prefix] = proper.has(w) ? properCase(w) : w;
    assigned.set(w, prefix);
    break;
  }
}

// --------------------------------------------------------------- report

const share = list => list.reduce((s, w) => s + (pm.get(w) || 0), 0) / totalPm * 100;
const flickWords = KEYS.flatMap(k => Object.values(slots[k]));
const hookTexts = Object.values(hooks);
const hookWords = hookTexts.filter(t => !t.includes(' '));
const hookPhrases = hookTexts.filter(t => t.includes(' '));
const viaEnding = [...derived].filter(([w, d]) => liveEndings.has(d.ending) && !assigned.has(w)).map(([w]) => w);
const completionWords = Object.values(completions).map(w => w.toLowerCase());
const phrasePm = new Map(lexicon.phrases.map(p => [p.g, p.pm]));

// What the marks that lost their direction would have saved, against the word that took it.
const markTable = Object.entries(lexicon.marks).map(([m, perMillion]) => ({ mark: m, perMillion }));

const theory = {
  meta: {
    generated: 'tools/theory.mjs',
    corpora: lexicon.corpora,
    timing: TIMING,
    counts: { flicks: flickWords.length, hooks: hookWords.length, phrases: hookPhrases.length, endings: Object.keys(endings).length, completions: completionWords.length },
    share: {
      flicks: +share(flickWords).toFixed(2), hooks: +share(hookWords).toFixed(2),
      endings: +share(viaEnding).toFixed(2), completions: +share(completionWords).toFixed(2),
    },
    endingMass: Object.fromEntries(Object.entries(endingMass).sort((a, b) => b[1] - a[1]).map(([e, m]) => [e, +(m / totalPm * 100).toFixed(2)])),
    marks: Object.fromEntries(markTable.map(m => [m.mark, m.perMillion])),
  },
  slots: Object.fromEntries(KEYS.flatMap(k => Object.entries(slots[k]).map(([d, w]) => [strokeId(k, d), w]))),
  hooks,
  endings,
  completions,
  // word -> "base ending" for the words the planner writes as a base and an ending
  derived: Object.fromEntries([...derived].filter(([w, d]) => liveEndings.has(d.ending) && pm.get(w) >= 1.5).map(([w, d]) => [w, `${d.base} ${d.ending}`])),
  // Every word of at least three per million, commonest first: what the coach treats as a real word.
  lexicon: words.filter(e => e.pm >= 3).map(e => e.w).join(' '),
  // Per-million weight of everything the theory knows a stroke for.
  weight: Object.fromEntries([...flickWords, ...hookWords, ...completionWords].map(w => [w, Math.round(pm.get(w))])
    .concat(hookPhrases.map(p => [p, Math.round(phrasePm.get(p) || 0)]))),
};

fs.writeFileSync(path.join(here, '..', 'src', 'theory.generated.js'),
  `// Generated by tools/theory.mjs from data/build/lexicon.json. Do not edit.\nexport default ${JSON.stringify(theory, null, 1)};\n`);

const grid = [['A', 'N', 'I'], ['H', 'O', 'R'], ['T', 'E', 'S']];
console.log(`flicks ${flickWords.length} (${share(flickWords).toFixed(1)} % of tokens)  hook words ${hookWords.length} (${share(hookWords).toFixed(1)} %)  phrases ${hookPhrases.length}  via endings ${share(viaEnding).toFixed(1)} %  completions ${completionWords.length} (${share(completionWords).toFixed(1)} %)`);
console.log('ending mass %:', JSON.stringify(theory.meta.endingMass));
for (const row of grid) for (const key of row) {
  console.log(`\n[${key}] family ${FAMILY[key].join('')}`);
  for (const dir of DIRS) {
    const id = strokeId(key, dir);
    const head = slots[key][dir] ? `"${slots[key][dir]}"` : (LETTER_SLOTS.find(s => s.key === key && s.dir === dir)?.letter || DETAIL[key][dir]?.label);
    if (!head) continue;
    const hs = ['cw', 'ccw', 'back'].map(t => hooks[`${id}-${t}`] ? `${t}:${hooks[`${id}-${t}`]}` : null).filter(Boolean).join('  ');
    console.log(`  ${dir.padEnd(2)} ${String(head).padEnd(10)} ${hs}`);
  }
}
const top = words.slice(0, 100).map(e => e.w);
console.log('\ntop 100 without a single stroke:', top.filter(w => !strokes.has(assigned.get(w))).join(' '));
console.log('top 101-300 without a single stroke:', words.slice(100, 300).map(e => e.w).filter(w => !strokes.has(assigned.get(w)) && !(derived.get(w) && liveEndings.has(derived.get(w).ending))).join(' '));
console.log('\nfree turns left:', [...freeTurns].filter(([, t]) => t.length).map(([id, t]) => `${id}:${t.join('/')}`).join(' '));
console.log('\nfirst completions:', Object.entries(completions).slice(0, 70).map(([p, w]) => `${p}→${w}`).join('  '));
