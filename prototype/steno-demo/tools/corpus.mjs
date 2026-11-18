// Builds the word and phrase statistics the steno theory is derived from.
//
// Three raw conversational corpora are read from data/raw (not committed, see
// data/README.md for where each comes from):
//   movie  Cornell Movie-Dialogs Corpus      scripted speech, US English
//   daily  DailyDialog (train)               written everyday dialogue
//   sms    NUS SMS Corpus (English, 2015)    real text messages
//
// Every tenth utterance of each corpus is held out and never counted, so the
// evaluation in tools/evaluate.mjs measures text the theory has not seen.
//
//   node tools/corpus.mjs
//
// Output: data/build/lexicon.json, data/build/heldout.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = path.join(here, '..', 'data', 'raw');
const out = path.join(here, '..', 'data', 'build');
fs.mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- reading

function readMovie() {
  const file = path.join(raw, 'cornell', 'cornell movie-dialogs corpus', 'movie_lines.txt');
  return fs.readFileSync(file, 'latin1').split('\n')
    .map(line => line.split(' +++$+++ ')[4])
    .filter(Boolean);
}

function readDaily() {
  const file = path.join(raw, 'dd', 'train', 'dialogues_train.txt');
  return fs.readFileSync(file, 'utf8').split(/__eou__|\n/)
    // The corpus is pre-tokenised with spaces round punctuation; undo that.
    .map(u => u.replace(/\s+([,.?!;:])/g, '$1').replace(/\s+’\s+/g, "'").replace(/\s+'\s+/g, "'").trim())
    .filter(Boolean);
}

function readSms() {
  const file = path.join(raw, 'sms', 'smsCorpus_en_2015.03.09_all.xml');
  const xml = fs.readFileSync(file, 'utf8');
  const texts = [];
  const re = /<text>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml))) {
    texts.push(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#\d+;/g, ' '));
  }
  return texts;
}

// ------------------------------------------------------------- tokenising

const normalise = s => s.replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"');

/** Splits an utterance into sentences of lowercase word tokens. */
export function sentences(text) {
  return normalise(text).split(/[.?!\n;:()"]+|--+|\s-\s/)
    .map(s => (s.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) || []))
    .filter(s => s.length);
}

// ---------------------------------------------------------------- counting

const corpora = { movie: readMovie(), daily: readDaily(), sms: readSms() };
const stats = {};
const heldout = {};
const MAX_HELDOUT = 4000;

for (const [name, utterances] of Object.entries(corpora)) {
  const uni = new Map();
  const grams = new Map();
  const marks = new Map();             // punctuation and symbols, per character
  const capital = new Map();           // word -> times written with a capital away from a sentence start
  let tokens = 0;
  let trainUtterances = 0;
  heldout[name] = [];
  utterances.forEach((u, index) => {
    if (index % 10 === 7) {                       // held out, never counted
      const text = normalise(u).replace(/\s+/g, ' ').trim();
      if (heldout[name].length < MAX_HELDOUT && text.length >= 2 && text.length <= 240) heldout[name].push(text);
      return;
    }
    trainUtterances++;
    for (const ch of normalise(u)) if (/[^\sA-Za-z0-9]/.test(ch)) marks.set(ch, (marks.get(ch) || 0) + 1);
    // Capitals that are not the first word of a sentence mark names and other proper nouns.
    for (const m of normalise(u).matchAll(/[a-z,;] ([A-Z][a-z]+(?:'[a-z]+)?)\b/g)) {
      const w = m[1].toLowerCase();
      capital.set(w, (capital.get(w) || 0) + 1);
    }
    for (const s of sentences(u)) {
      tokens += s.length;
      for (let i = 0; i < s.length; i++) {
        uni.set(s[i], (uni.get(s[i]) || 0) + 1);
        for (let n = 2; n <= 4 && i + n <= s.length; n++) {
          const g = s.slice(i, i + n).join(' ');
          grams.set(g, (grams.get(g) || 0) + 1);
        }
      }
    }
  });
  stats[name] = { uni, grams, marks, capital, tokens, utterances: utterances.length, trainUtterances };
  console.log(`${name}: ${utterances.length} utterances, ${tokens} training tokens, ${uni.size} types, ${heldout[name].length} held out`);
}

// ------------------------------------------------------------------ blend
//
// A word's weight is the geometric mean of its relative frequency in the three
// corpora (add-half smoothing). A word has to be common in scripted speech,
// written dialogue AND real texts to rank high, which keeps out each corpus's
// own quirks: character names from the films, "lah" and "oso" from Singapore
// SMS, the textbook phrasing of DailyDialog.

const names = Object.keys(stats);
const perMillion = (count, name) => (count + 0.5) / stats[name].tokens * 1e6;

function blend(key, table) {
  let logSum = 0;
  const per = {};
  for (const n of names) {
    const pm = perMillion(stats[n][table].get(key) || 0, n);
    per[n] = Math.round(pm * 100) / 100;
    logSum += Math.log(pm);
  }
  return { pm: Math.exp(logSum / names.length), per };
}

const allWords = new Set();
for (const n of names) for (const [w, c] of stats[n].uni) if (c >= 3) allWords.add(w);

const words = [...allWords].map(w => ({ w, ...blend(w, 'uni') }))
  .filter(e => e.pm >= 1)                          // at least one per million, blended
  .sort((a, b) => b.pm - a.pm)
  .map(e => ({ w: e.w, pm: Math.round(e.pm * 100) / 100, per: e.per }));

const allGrams = new Set();
for (const n of names) for (const [g, c] of stats[n].grams) if (c >= 5) allGrams.add(g);
const phrases = [...allGrams].map(g => ({ g, ...blend(g, 'grams') }))
  .filter(e => e.pm >= 8)
  .sort((a, b) => b.pm - a.pm)
  .slice(0, 6000)
  .map(e => ({ g: e.g, pm: Math.round(e.pm * 100) / 100, per: e.per }));

// SMS-only vocabulary, for the texting pack: tokens that are frequent in real
// texts and rare in the other two corpora are the abbreviations people use.
const smsOnly = [...stats.sms.uni].filter(([w, c]) => c >= 25)
  .map(([w, c]) => ({ w, sms: perMillion(c, 'sms'), other: Math.max(perMillion(stats.movie.uni.get(w) || 0, 'movie'), perMillion(stats.daily.uni.get(w) || 0, 'daily')) }))
  .filter(e => e.sms > 20 * e.other)
  .sort((a, b) => b.sms - a.sms)
  .slice(0, 400)
  .map(e => ({ w: e.w, smsPm: Math.round(e.sms) }));

// Marks, blended the same way, per million word tokens.
const allMarks = new Set();
for (const n of names) for (const [m] of stats[n].marks) allMarks.add(m);
const marks = Object.fromEntries([...allMarks].map(m => [m, Math.round(blend(m, 'marks').pm)]).filter(([, pm]) => pm >= 20).sort((a, b) => b[1] - a[1]));

// Proper nouns: words that the two cased corpora write with a capital in mid-sentence
// at least four times in five (the SMS corpus's casing is too irregular to count).
const proper = [];
for (const e of words) {
  let caps = 0, all = 0;
  for (const n of ['movie', 'daily']) { caps += stats[n].capital.get(e.w) || 0; all += stats[n].uni.get(e.w) || 0; }
  if (all >= 2 && caps / all >= 0.8 && !/^i($|')/.test(e.w)) proper.push(e.w);
}

const total = words.reduce((s, e) => s + e.pm, 0);
fs.writeFileSync(path.join(out, 'lexicon.json'), JSON.stringify({
  generated: 'tools/corpus.mjs',
  corpora: Object.fromEntries(names.map(n => [n, { utterances: stats[n].utterances, trainingTokens: stats[n].tokens, types: stats[n].uni.size }])),
  totalPm: Math.round(total),
  words, phrases, smsOnly, marks, proper,
}));
fs.writeFileSync(path.join(out, 'heldout.json'), JSON.stringify(heldout));

console.log(`lexicon: ${words.length} words, ${phrases.length} phrases, blended mass ${Math.round(total)} per million`);
console.log('top 60:', words.slice(0, 60).map(e => e.w).join(' '));
let acc = 0;
const checkpoints = [10, 26, 50, 100, 200, 300, 500, 1000, 2000];
words.forEach((e, i) => { acc += e.pm; if (checkpoints.includes(i + 1)) console.log(`top ${i + 1}: ${(acc / total * 100).toFixed(1)} % of blended tokens`); });
console.log('top phrases:', phrases.slice(0, 40).map(e => e.g).join(' | '));
console.log('sms-only:', smsOnly.slice(0, 60).map(e => e.w).join(' '));
console.log('marks per million words:', JSON.stringify(marks));
console.log(`proper nouns: ${proper.length}:`, proper.slice(0, 50).join(' '));
