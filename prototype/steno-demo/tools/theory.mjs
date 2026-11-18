// Derives the English steno theory from the corpus statistics.
//
//   node tools/theory.mjs
//
// Reads data/build/lexicon.json, writes src/theory.generated.js and prints the
// resulting keyboard.
//
// The theory is structural. The grid's three columns are three banks, in the
// order a syllable is said: what starts it, its vowel, what ends it. Each of
// the nine keys carries nine chunks (a tap and eight flicks), so each bank
// holds 27. A word is written by its pieces, as it is spelled: th·i·nk,
// w·ea·th·er, str·ee·t. Nothing here is a list of whole words to memorise;
// any word can be written by rule.
//
// 1. CHUNKS. Starting from single letters, the chunk that would save the most
//    strokes over the whole corpus is added, again and again, until the banks
//    are full: consonant clusters (th, st, nd, ght) and vowel groups (ea, ou,
//    er, igh).
// 2. BANKS. Every vowel piece goes in the vowel bank. A consonant piece goes
//    in the onset bank if it mostly comes before a vowel and in the coda bank
//    if it mostly comes after one; a consonant that is common in both places
//    is in both, because a chord is read in bank order and needs the piece on
//    the right side.
// 3. KEYS. Within a bank, pieces that sound alike share a key: stops, then
//    hissing sounds and h-digraphs, then the liquids and nasals; front vowels,
//    then a and u, then o. The commonest piece on a key is its tap, the next
//    four its upright and level flicks.
// 4. CURLS. A flick finished with a curl is a whole word that starts with that
//    onset or vowel, or ends with that coda: th curled is the, that, this.
//    These are the briefs. They are a convenience on top of the structure,
//    never the only way to write a word.
// 5. ENDINGS and COMPLETIONS are as before: the inflections and contractions
//    on the space bar, and an offer to finish a word that can only be one word.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIRS, strokeId } from '../src/layout.js';
import { TIMING, EFFORT_MS } from '../src/model.js';
import { ENDINGS, applyEnding, stemsFor, canEnd } from '../src/orthography.js';
import { segment, roles, pieceKind } from '../src/syllable.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const lexicon = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'build', 'lexicon.json'), 'utf8'));

// ------------------------------------------------------------ vocabulary

const NOT_WORDS = new Set(`s t m d ll ve re n u r k c e b x o y p f g h j l q v w z ur im dont cant wat coz cos da th mr mrs
  dr ya em ah uh um hmm huh eh la didnt thats wont doesnt isnt ive youre ill hes shes theyre weve
  nothin somethin gettin goin doin lookin talkin comin tryin sayin havin makin takin bein thinkin fuckin
  woulda coulda shoulda kinda sorta outta lotta gotcha dunno lemme gimme`.split(/\s+/));
const proper = new Set(lexicon.proper);
const isWord = e => /^[a-z][a-z']*$/.test(e.w) && !NOT_WORDS.has(e.w) && !/in'$/.test(e.w);
const everyToken = lexicon.words;
const words = lexicon.words.filter(isWord);
const plain = words.filter(e => !e.w.includes("'"));
const pm = new Map(lexicon.words.map(e => [e.w, e.pm]));
const totalPm = words.reduce((s, e) => s + e.pm, 0);
const known = w => pm.has(w) && !NOT_WORDS.has(w);

// -------------------------------------------------------------- 1. chunks

const BANK = 27;
const VOWEL_SINGLES = ['a', 'e', 'i', 'o', 'u', 'y'];
// q is only ever written with its u, so the piece is "qu" and q alone is left to the letter page.
const CONSONANT_SINGLES = [...'bcdfghjklmnprstvwxz'];
const kindOf = c => c === 'qu' ? 'C' : pieceKind(c);
const MAX_CHUNK = 4;

const chunks = new Set(['qu']);
// More consonant clusters are found than there is room for, because a cluster may earn a place in both banks.
const budget = { V: BANK - VOWEL_SINGLES.length, C: 50 };
const count = { V: 0, C: 0 };
const order = [];
const corpus = plain.slice(0, 25000);
while (count.V < budget.V || count.C < budget.C) {
  const gain = new Map();
  for (const { w, pm: weight } of corpus) {
    const pieces = segment(w, chunks, MAX_CHUNK);
    for (let i = 0; i < pieces.length; i++) for (let k = 2; k <= 4 && i + k <= pieces.length; k++) {
      const c = pieces.slice(i, i + k).join('');
      const kind = c.length <= MAX_CHUNK ? kindOf(c) : null;
      if (!kind || chunks.has(c) || count[kind] >= budget[kind]) continue;
      gain.set(c, (gain.get(c) || 0) + weight * (k - 1));
    }
  }
  const best = [...gain].sort((a, b) => b[1] - a[1])[0];
  if (!best) break;
  chunks.add(best[0]); count[kindOf(best[0])]++; order.push(best[0]);
}

// How each piece is used once the chunks are settled.
const use = new Map();                 // piece -> { onset, vowel, coda }
for (const { w, pm: weight } of corpus) {
  const pieces = segment(w, chunks, MAX_CHUNK), where = roles(w, pieces);
  pieces.forEach((p, i) => { if (!use.has(p)) use.set(p, { onset: 0, vowel: 0, coda: 0 }); use.get(p)[where[i]] += weight; });
}
const used = (p, role) => use.get(p)?.[role] || 0;

// --------------------------------------------------------------- 2. banks

const vowelBank = [...VOWEL_SINGLES, ...order.filter(c => kindOf(c) === 'V')];
const clusters = ['qu', ...order.filter(c => kindOf(c) === 'C')];
const majority = p => used(p, 'onset') >= used(p, 'coda') ? 'onset' : 'coda';
// Each consonant bank is filled on its own terms. Every consonant has to be
// somewhere, so each goes first in the bank where it is used most (and qu,
// which is how q is written, starts syllables). The rest of a bank goes to
// whatever is worth most there: a cluster saves a stroke per extra letter each
// time it is used in that position; a consonant that already lives in the
// other bank saves the chord that would otherwise be broken, taken as half a
// stroke.
const CROSS = 0.5;
const bank = {};
for (const b of ['onset', 'coda']) {
  const must = [...CONSONANT_SINGLES.filter(c => majority(c) === b), ...(b === 'onset' ? ['qu'] : [])];
  const rest = [
    ...clusters.filter(c => c !== 'qu').map(c => ({ p: c, value: used(c, b) * (c.length - 1) })),
    ...CONSONANT_SINGLES.filter(c => majority(c) !== b).map(c => ({ p: c, value: used(c, b) * CROSS })),
  ].filter(it => it.value > 0).sort((x, y) => y.value - x.value);
  bank[b] = [...must, ...rest.slice(0, BANK - must.length).map(it => it.p)];
}

// ---------------------------------------------------------------- 3. keys

const COLUMN = { onset: ['A', 'H', 'T'], vowel: ['N', 'O', 'E'], coda: ['I', 'R', 'S'] };
// Pieces that sound alike share a key.
const CLASS = {
  onset: c => /^(th|sh|ch|wh|ph)/.test(c) || 'sfvzh'.includes(c[0]) ? 1 : 'ptkbdgcq'.includes(c[0]) ? 0 : 2,
  coda: c => 'td'.includes(c.at(-1)) ? 0 : 'nmlr'.includes(c.at(-1)) || c.endsWith('ng') ? 1 : 2,
  vowel: c => 'eiy'.includes(c[0]) ? 0 : 'au'.includes(c[0]) ? 1 : 2,
};
const SLOT_ORDER = [null, 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];      // tap, then the easy directions
const chunkAt = {};                    // stroke id -> chunk
const slotOf = { onset: {}, vowel: {}, coda: {} };                          // bank -> chunk -> stroke id
for (const [name, list] of Object.entries({ onset: bank.onset, vowel: vowelBank, coda: bank.coda })) {
  const role = name;
  const weight = p => used(p, role) + 1e-6 * (used(p, 'onset') + used(p, 'coda') + used(p, 'vowel'));
  const keys = [[], [], []];
  for (const p of list) keys[CLASS[name](p)].push(p);
  // Nine to a key: the least used piece of an overfull key moves to the key with most room.
  for (;;) {
    const over = keys.findIndex(k => k.length > 9);
    if (over < 0) break;
    const to = keys.map((k, i) => [k.length, i]).sort((a, b) => a[0] - b[0])[0][1];
    const moved = keys[over].sort((a, b) => weight(b) - weight(a)).pop();
    keys[to].push(moved);
  }
  keys.forEach((k, i) => {
    k.sort((a, b) => weight(b) - weight(a));
    k.forEach((p, j) => { const id = strokeId(COLUMN[name][i], SLOT_ORDER[j]); chunkAt[id] = p; slotOf[name][p] = id; });
  });
}
const allChunks = new Set(Object.values(chunkAt).filter(c => c.length > 1));

// --------------------------------------------------------------- 4. curls

const piecesOf = w => segment(w, allChunks, MAX_CHUNK);
const structuralMs = w => (piecesOf(w).length + 1) * TIMING.letter;         // its pieces, and the space
const hookBenefit = w => pm.get(w) * (structuralMs(w) - TIMING.hook + EFFORT_MS * piecesOf(w).length);
const MIN_CURL_PM = 100;
const curls = {};
const assigned = new Map();
const free = new Map(Object.keys(chunkAt).filter(id => id.includes('-')).map(id => [id, ['cw', 'ccw', 'back']]));
const candidates = plain.filter(e => !proper.has(e.w) && e.pm >= MIN_CURL_PM && piecesOf(e.w).length >= 2 && hookBenefit(e.w) > 0)
  .sort((a, b) => hookBenefit(b.w) - hookBenefit(a.w));
for (const { w } of candidates) {
  const pieces = piecesOf(w), where = roles(w, pieces);
  // A word curls off the piece it starts with, or failing that the piece it ends with.
  const first = where[0] === 'coda' ? null : slotOf[where[0]][pieces[0]];
  const last = where.at(-1) === 'coda' ? slotOf.coda[pieces.at(-1)] : null;
  const parent = [first, last].find(id => id && free.get(id)?.length);
  if (!parent) continue;
  const turn = free.get(parent).shift();
  curls[`${parent}-${turn}`] = w;
  assigned.set(w, `${parent}-${turn}`);
}

// ------------------------------------------------------------- 5. endings

const endings = {
  'SP-nw': 'ed', 'SP-n': 's', 'SP-ne': 'ing',
  'SP-sw': "n't", 'SP-sw-cw': "'ll", 'SP-sw-ccw': "'ll",
  'SP-se': "'s", 'SP-se-ccw': "'ve", 'SP-se-cw': "'d",
};
const liveEndings = new Set(Object.values(endings));
const FALSE_FRIENDS = new Set(`evening news shed herring wing king thing during morning nothing something anything
  everything bring spring string ring sing bed red need feed speed seed weed hundred united less class glass pass
  across always perhaps towards besides sometimes series species lens means earnings clothes glasses jeans pants
  shorts scissors thanks congratulations regards customs goods odds sales savings stairs surroundings wed bled fed
  sled cling sting swing wring ceiling darling sibling pudding wedding building feeling meeting being
  better butter letter matter number paper water under over other mother father brother sister never ever
  family early only holy july reply apply supply fly ally belly bully jelly lily rally silly ugly folly`.split(/\s+/));
const derived = new Map();
for (const { w } of words) {
  if (assigned.has(w)) continue;
  for (const ending of Object.keys(ENDINGS)) {
    for (const base of stemsFor(w, ending)) {
      const contraction = ending.includes("'");
      if (!known(base) || base === w || base.length < (contraction ? 1 : 3) || pm.get(base) < pm.get(w) * 0.3) continue;
      if (!canEnd(base, ending) || FALSE_FRIENDS.has(w) || applyEnding(base, ending) !== w) continue;
      const have = derived.get(w);
      if (!have || pm.get(base) > pm.get(have.base)) derived.set(w, { base, ending });
    }
  }
}
const endingMass = {};
for (const [w, { ending }] of derived) endingMass[ending] = (endingMass[ending] || 0) + pm.get(w);

// --------------------------------------------------------- 6. completions

const MIN_COMPLETION_PM = 5, MIN_PREFIX = 3, DOMINANCE = 0.9;
const MIN_PIECES_SAVED = 2;            // the offer has to save pieces, not just letters; taking it costs one stroke
const prefixMass = new Map();
for (const { w, pm: weight } of everyToken) for (let n = MIN_PREFIX; n <= w.length; n++) {
  const p = w.slice(0, n);
  prefixMass.set(p, (prefixMass.get(p) || 0) + weight);
}
const familyOf = new Map();
for (const { w } of everyToken) {
  const base = derived.get(w)?.base;
  for (const head of [w, base].filter(Boolean)) { if (!familyOf.has(head)) familyOf.set(head, []); familyOf.get(head).push(w); }
}
const completions = {};
const properCase = w => w[0].toUpperCase() + w.slice(1);
for (const { w } of plain) {
  if (assigned.has(w) || pm.get(w) < MIN_COMPLETION_PM) continue;
  const d = derived.get(w);
  if (d && liveEndings.has(d.ending)) continue;
  const family = familyOf.get(w) || [w];
  const whole = piecesOf(w).length;
  for (let n = MIN_PREFIX; n < w.length; n++) {
    const prefix = w.slice(0, n);
    if (pm.has(prefix) || prefix in completions) continue;
    if (whole - piecesOf(prefix).length < MIN_PIECES_SAVED) break;
    const mine = family.filter(f => f.startsWith(prefix)).reduce((s, f) => s + pm.get(f), 0);
    if (mine < DOMINANCE * prefixMass.get(prefix)) continue;
    completions[prefix] = proper.has(w) ? properCase(w) : w;
    assigned.set(w, prefix);
    break;
  }
}

// --------------------------------------------------------------- report

const share = list => list.reduce((s, w) => s + (pm.get(w) || 0), 0) / totalPm * 100;
const curlWords = Object.values(curls);
const completionWords = Object.values(completions).map(w => w.toLowerCase());
let pieceSum = 0, letterSum = 0, weightSum = 0;
for (const { w, pm: weight } of plain) { pieceSum += piecesOf(w).length * weight; letterSum += w.length * weight; weightSum += weight; }

const theory = {
  meta: {
    generated: 'tools/theory.mjs',
    corpora: lexicon.corpora,
    timing: TIMING,
    counts: { chunks: Object.keys(chunkAt).length, clusters: allChunks.size, curls: curlWords.length, endings: Object.keys(endings).length, completions: completionWords.length },
    share: { curls: +share(curlWords).toFixed(2), completions: +share(completionWords).toFixed(2) },
    piecesPerWord: +(pieceSum / weightSum).toFixed(3), lettersPerWord: +(letterSum / weightSum).toFixed(3),
    endingMass: Object.fromEntries(Object.entries(endingMass).sort((a, b) => b[1] - a[1]).map(([e, m]) => [e, +(m / totalPm * 100).toFixed(2)])),
  },
  // Which keys make up each bank, top to bottom.
  banks: COLUMN,
  // stroke id -> the chunk it types
  chunks: chunkAt,
  // stroke id -> how often that piece is written from that bank, per million words
  usage: Object.fromEntries(Object.entries(chunkAt).map(([id, c]) => [id, Math.round(used(c, Object.keys(COLUMN).find(b => COLUMN[b].includes(id.split('-')[0]))))])),
  curls,
  endings,
  completions,
  derived: Object.fromEntries([...derived].filter(([w, d]) => liveEndings.has(d.ending) && pm.get(w) >= 1.5).map(([w, d]) => [w, `${d.base} ${d.ending}`])),
  lexicon: words.filter(e => e.pm >= 3).map(e => e.w).join(' '),
  weight: Object.fromEntries([...curlWords, ...completionWords].map(w => [w, Math.round(pm.get(w))])),
};

fs.writeFileSync(path.join(here, '..', 'src', 'theory.generated.js'),
  `// Generated by tools/theory.mjs from data/build/lexicon.json. Do not edit.\nexport default ${JSON.stringify(theory, null, 1)};\n`);

console.log(`chunks: ${order.filter(c => kindOf(c) === 'C').length + 1} consonant clusters, ${order.filter(c => kindOf(c) === 'V').length} vowel groups`);
console.log(`letters per word ${theory.meta.lettersPerWord}, pieces per word ${theory.meta.piecesPerWord} (${((1 - pieceSum / letterSum) * 100).toFixed(1)} % fewer)`);
console.log(`curls ${curlWords.length} (${share(curlWords).toFixed(1)} % of tokens), completions ${completionWords.length} (${share(completionWords).toFixed(1)} %)`);
for (const [name, keys] of Object.entries(COLUMN)) {
  console.log(`\n== ${name} bank`);
  for (const key of keys) {
    const cells = d => (chunkAt[strokeId(key, d)] || '').padEnd(5);
    console.log(`  [${key}]  ${cells('nw')}${cells('n')}${cells('ne')}`);
    console.log(`       ${cells('w')}${(chunkAt[key] || '').toUpperCase().padEnd(5)}${cells('e')}`);
    console.log(`       ${cells('sw')}${cells('s')}${cells('se')}`);
    const cs = DIRS.map(d => ['cw', 'ccw', 'back'].map(t => curls[`${key}-${d}-${t}`]).filter(Boolean)).map((c, i) => c.length ? `${chunkAt[strokeId(key, DIRS[i])]}: ${c.join(' ')}` : null).filter(Boolean);
    console.log(`       curls  ${cs.join(' | ')}`);
  }
}
const noCurl = plain.slice(0, 100).map(e => e.w).filter(w => !assigned.has(w));
console.log('\ntop 100 written by structure (pieces):', noCurl.map(w => piecesOf(w).join('·')).join('  '));
for (const w of ['the', 'think', 'street', 'through', 'about', 'tomorrow', 'something', 'because', 'weather', 'beautiful', 'restaurant', 'question', 'you', 'what', 'know', 'right']) process.stdout.write(`${piecesOf(w).join('·')}  `);
console.log('\nfirst completions:', Object.entries(completions).slice(0, 40).map(([p, w]) => `${p}→${w}`).join('  '));
