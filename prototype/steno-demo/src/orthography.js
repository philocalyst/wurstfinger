// Endings: what a space-bar flick does to the word before the caret.
//
// An ending is a meaning, not a string. "Past" turns walk into walked, stop
// into stopped, try into tried and go into went; "not" turns can into can't
// and will into won't; "is" turns you into you're and I into I'm.
// Stenographers fold endings into the stroke for the same reason: the ending
// is the last thing your hand does to a word.
//
// The rules are the ordinary rules of English spelling, written out, with
// curated tables for what the rules cannot know (which two-syllable verbs
// stress their last syllable, which plurals are irregular). Nothing here is
// learned from a corpus, because a corpus contains "raping" and so cannot be
// asked how "rap" takes -ing.

const isVowel = c => 'aeiou'.includes(c);
const isConsonant = c => /[a-z]/.test(c) && !isVowel(c);

/** Vowel groups, ignoring a silent final e: a serviceable syllable count. */
const syllables = w => (w.replace(/(?<=[^aeiou])e$/, '').match(/[aeiouy]+/g) || []).length || 1;

// Verbs of more than one syllable that stress the last one, and so double it:
// begin -> beginning. Everything else of more than one syllable does not.
const STRESSED_FINAL = new Set(`begin forget forbid regret admit commit permit submit omit emit transmit occur recur
  refer prefer defer confer infer transfer deter incur concur control patrol compel expel rebel excel propel repel
  dispel upset reset beset inset outrun overrun rerun babysit outfit equip acquit unplug unwrap kidnap unzip
  rezip regret abet allot unpin unclog outwit recap remap rewrap overlap handicap program diagram format
  unfit refit befit submit readmit recommit uncap`.split(/\s+/));
// One-syllable words the consonant-vowel-consonant rule gets wrong.
const NEVER_DOUBLE = new Set(['bus', 'gas', 'yes', 'this', 'was', 'his', 'us', 'if', 'of', 'is', 'as']);

/** Does the final consonant double before a vowel suffix? stop yes, open no, begin yes, quit yes. */
function doublesFinal(w) {
  if (w.length < 3 || NEVER_DOUBLE.has(w)) return false;
  const last = w.at(-1), vowel = w.at(-2), before = w.at(-3);
  if (!isConsonant(last) || 'wxy'.includes(last) || !isVowel(vowel)) return false;
  // "qu" is a consonant sound: quit, quiz, equip.
  const beforeIsConsonant = isConsonant(before) || (before === 'u' && w.at(-4) === 'q');
  if (!beforeIsConsonant) return false;
  if (STRESSED_FINAL.has(w)) return true;
  return syllables(w) === 1;
}

const PAST = {
  go: 'went', do: 'did', have: 'had', get: 'got', make: 'made', say: 'said', see: 'saw', take: 'took',
  come: 'came', know: 'knew', think: 'thought', tell: 'told', find: 'found', give: 'gave', feel: 'felt',
  leave: 'left', keep: 'kept', mean: 'meant', meet: 'met', hear: 'heard', buy: 'bought', bring: 'brought',
  send: 'sent', pay: 'paid', run: 'ran', sit: 'sat', lose: 'lost', break: 'broke', eat: 'ate', drive: 'drove',
  write: 'wrote', speak: 'spoke', forget: 'forgot', fall: 'fell', hold: 'held', stand: 'stood',
  understand: 'understood', sleep: 'slept', win: 'won', spend: 'spent', catch: 'caught', teach: 'taught',
  sell: 'sold', begin: 'began', drink: 'drank', wake: 'woke', wear: 'wore', choose: 'chose', grow: 'grew',
  throw: 'threw', fly: 'flew', draw: 'drew', build: 'built', is: 'was', am: 'was', are: 'were', be: 'was',
  can: 'could', will: 'would', shall: 'should', may: 'might', let: 'let', put: 'put', cut: 'cut', hit: 'hit',
  read: 'read', hurt: 'hurt', shut: 'shut', set: 'set', quit: 'quit', cost: 'cost', lay: 'laid', lead: 'led',
  fight: 'fought', sing: 'sang', swim: 'swam', ride: 'rode', rise: 'rose', shake: 'shook', steal: 'stole',
  stick: 'stuck', hang: 'hung', hide: 'hid', bite: 'bit', blow: 'blew', dig: 'dug', feed: 'fed',
  forgive: 'forgave', freeze: 'froze', lend: 'lent', light: 'lit', ring: 'rang', shoot: 'shot', swear: 'swore',
  tear: 'tore', become: 'became', bet: 'bet', bend: 'bent', bleed: 'bled', breed: 'bred', deal: 'dealt',
  flee: 'fled', grind: 'ground', kneel: 'knelt', seek: 'sought', shine: 'shone', slide: 'slid', spin: 'spun',
  spit: 'spat', split: 'split', spread: 'spread', strike: 'struck', sweep: 'swept', swing: 'swung',
  weep: 'wept', wind: 'wound', withdraw: 'withdrew', overcome: 'overcame', undo: 'undid', redo: 'redid',
  mistake: 'mistook', upset: 'upset', reset: 'reset', outrun: 'outran', rerun: 'reran', babysit: 'babysat',
  beat: 'beat', burst: 'burst', cast: 'cast', fit: 'fit', sink: 'sank', stink: 'stank', sting: 'stung',
  cling: 'clung', fling: 'flung', creep: 'crept', bind: 'bound', arise: 'arose', awake: 'awoke', bear: 'bore',
};

const NOT = {
  can: "can't", will: "won't", shall: "shan't", do: "don't", does: "doesn't", did: "didn't", is: "isn't",
  are: "aren't", was: "wasn't", were: "weren't", have: "haven't", has: "hasn't", had: "hadn't",
  would: "wouldn't", could: "couldn't", should: "shouldn't", must: "mustn't", need: "needn't", am: "ain't",
  might: "mightn't",
};

// "is", "are" or "am", by who is doing it.
const BE = { i: "I'm", you: "you're", we: "we're", they: "they're", who: "who's" };

const PLURAL = {
  man: 'men', woman: 'women', child: 'children', person: 'people', foot: 'feet', tooth: 'teeth',
  mouse: 'mice', goose: 'geese', life: 'lives', wife: 'wives', knife: 'knives', leaf: 'leaves',
  half: 'halves', self: 'selves', wolf: 'wolves', shelf: 'shelves', thief: 'thieves', loaf: 'loaves',
  myself: 'ourselves', yourself: 'yourselves', potato: 'potatoes', tomato: 'tomatoes', hero: 'heroes',
  echo: 'echoes', veto: 'vetoes', go: 'goes', do: 'does', have: 'has', be: 'is', quiz: 'quizzes',
  this: 'these', that: 'those',
};
const LY = {
  true: 'truly', due: 'duly', whole: 'wholly', good: 'well', day: 'daily', gay: 'gaily', public: 'publicly',
  shy: 'shyly', sly: 'slyly', dry: 'dryly', full: 'fully', dull: 'dully',
};
const ER = { good: 'better', well: 'better', bad: 'worse', far: 'farther' };

const endsCk = w => /[aeiou]c$/.test(w);                     // panic -> panicked

function addS(w) {
  if (PLURAL[w]) return PLURAL[w];
  if (/(s|x|z|ch|sh)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}

function addEd(w) {
  if (PAST[w]) return PAST[w];
  if (w.endsWith('e')) return w + 'd';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ied';
  if (endsCk(w)) return w + 'ked';
  if (doublesFinal(w)) return w + w.at(-1) + 'ed';
  return w + 'ed';
}

function addIng(w) {
  if (w.endsWith('ie')) return w.slice(0, -2) + 'ying';
  // A silent e drops (make, making); the only vowel of a short word does not (be, being).
  if (w.endsWith('e') && !/(ee|ye|oe)$/.test(w) && /[aeiouy].*e$/.test(w)) return w.slice(0, -1) + 'ing';
  if (endsCk(w)) return w + 'king';
  if (doublesFinal(w)) return w + w.at(-1) + 'ing';
  return w + 'ing';
}

function addEr(w) {
  if (ER[w]) return ER[w];
  if (w.endsWith('e')) return w + 'r';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ier';
  if (endsCk(w)) return w + 'ker';
  if (doublesFinal(w)) return w + w.at(-1) + 'er';
  return w + 'er';
}

function addLy(w) {
  if (LY[w]) return LY[w];
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ily';
  if (/[^aeiou]le$/.test(w)) return w.slice(0, -1) + 'y';
  if (w.endsWith('ic')) return w + 'ally';
  return w + 'ly';
}

export const ENDINGS = {
  s:     { label: '-s',   name: 'more than one, or he/she does', apply: addS },
  ing:   { label: '-ing', name: 'ongoing', apply: addIng },
  ed:    { label: '-ed',  name: 'past', apply: addEd },
  ly:    { label: '-ly',  name: 'manner', apply: addLy },
  er:    { label: '-er',  name: 'more', apply: addEr },
  "n't": { label: "n't",  name: 'not', apply: w => NOT[w] || w + "n't" },
  "'s":  { label: "'s",   name: 'is, are, am, or belonging to', apply: w => BE[w] || (w.endsWith('s') ? w + "'" : w + "'s") },
  "'ll": { label: "'ll",  name: 'will', apply: w => w + "'ll" },
  "'ve": { label: "'ve",  name: 'have', apply: w => w + "'ve" },
  "'d":  { label: "'d",   name: 'would or had', apply: w => w + "'d" },
};

/**
 * Applies an ending to a word and keeps the word's casing: Walk -> Walked,
 * NASA -> NASAs, iPhone -> iPhones.
 */
export function applyEnding(word, ending) {
  const spec = ENDINGS[ending];
  if (!spec || !word) return word;
  const lower = word.toLowerCase();
  const result = spec.apply(lower);
  if (result === lower) return word;
  const regular = result.startsWith(lower);
  // Mixed case and acronyms keep what was typed and take the added letters in lowercase.
  if (word !== lower && word !== lower[0].toUpperCase() + lower.slice(1)) {
    return regular ? word + result.slice(lower.length) : word === word.toUpperCase() ? result.toUpperCase() : result;
  }
  if (word[0] !== lower[0]) return result[0].toUpperCase() + result.slice(1);
  return result;
}

// Words that take no -s, -ing or -ed: pronouns, determiners, prepositions,
// conjunctions, the forms of "be" and the little adverbs. "anding" is not a word.
const CLOSED_CLASS = new Set(`a an the and or but nor if of to in on at by for with from as into onto than then so
  i you he she it we they me him her us them my your his its our their mine yours hers ours theirs this that these
  those is am are was were been not no yes very too also just here there when where why how what who whom which
  whose because although though while until unless since about above across after against along among around
  before behind below beneath beside between beyond during except inside outside over through toward under upon
  within without each every either neither both all any some many much most more less few such only even ever
  never always often again already still yet soon now maybe perhaps okay ok oh hey hi yeah`.split(/\s+/));

/**
 * Whether an ending makes sense on a word. An ending that does not is not
 * typed at all, so a slip on the space bar cannot leave "youing" behind.
 */
export function canEnd(word, ending) {
  const w = word.toLowerCase();
  if (!ENDINGS[ending] || !/^[a-z][a-z']*$/.test(w)) return false;
  if (w.includes("'")) return false;                         // I'm, don't: already contracted
  if (ending === "n't") return w in NOT;
  if (ending.startsWith("'")) return true;                   // 's, 'll, 've, 'd go on any word
  if (ending === 's' && w in PLURAL) return true;            // this -> these, that -> those
  return !CLOSED_CLASS.has(w) || (w === 'be' && ending === 'ing');
}

/**
 * Joins a suffix that is not one of the endings above (-ness, -ful, -able,
 * -ish) with the ordinary spelling changes: happy + ness is happiness, red +
 * ish is reddish, love + able is lovable.
 */
export function attachSuffix(word, suffix) {
  const w = word.toLowerCase();
  if (!/^[a-z]+$/.test(suffix) || !/^[a-z]+$/.test(w) || w.length < 2) return word + suffix;
  const vowelFirst = 'aeiouy'.includes(suffix[0]);
  let stem = word;
  if (/[^aeiou]y$/.test(w) && suffix[0] !== 'i') stem = word.slice(0, -1) + 'i';
  else if (vowelFirst && /[^aeiou]e$/.test(w) && !(/[cg]e$/.test(w) && 'ao'.includes(suffix[0]))) stem = word.slice(0, -1);
  else if (vowelFirst && endsCk(w)) stem = word + 'k';
  else if (vowelFirst && doublesFinal(w)) stem = word + word.at(-1);
  return stem + suffix;
}

/** Candidate bases a word might be `base + ending` of. Cheap and generous; verify with applyEnding. */
export function stemsFor(w, ending) {
  const out = [];
  const strip = n => w.slice(0, -n);
  const undouble = b => { if (b.length > 2 && b.at(-1) === b.at(-2)) out.push(b.slice(0, -1)); };
  switch (ending) {
    case 's': if (w.endsWith('ies')) out.push(strip(3) + 'y'); if (w.endsWith('es')) out.push(strip(2)); if (w.endsWith('s')) out.push(strip(1)); break;
    case 'ing': if (w.endsWith('ing')) { const b = strip(3); out.push(b, b + 'e'); undouble(b); if (b.endsWith('y')) out.push(b.slice(0, -1) + 'ie'); if (b.endsWith('ck')) out.push(b.slice(0, -1)); } break;
    case 'ed': if (w.endsWith('ied')) out.push(strip(3) + 'y'); if (w.endsWith('ed')) { const b = strip(2); out.push(b, b + 'e'); undouble(b); if (b.endsWith('ck')) out.push(b.slice(0, -1)); } break;
    case 'er': if (w.endsWith('ier')) out.push(strip(3) + 'y'); if (w.endsWith('er')) { const b = strip(2); out.push(b, b + 'e'); undouble(b); } break;
    case 'ly': if (w.endsWith('ily')) out.push(strip(3) + 'y'); if (w.endsWith('ally')) out.push(strip(4)); if (w.endsWith('ly')) out.push(strip(2), strip(1) + 'e', strip(1)); break;
    case "n't": if (w.endsWith("n't")) out.push(strip(3)); break;
    case "'s": if (w.endsWith("'s")) out.push(strip(2)); if (w.endsWith("'re")) out.push(strip(3)); if (w.endsWith("'m")) out.push(strip(2)); break;
    default: if (w.endsWith(ending)) out.push(strip(ending.length));
  }
  for (const [table, e] of [[PAST, 'ed'], [PLURAL, 's'], [NOT, "n't"], [LY, 'ly'], [ER, 'er']]) {
    if (e === ending) for (const [base, form] of Object.entries(table)) if (form === w) out.push(base);
  }
  return [...new Set(out)];
}

/** How a lexicon word is written: the pronoun I and its contractions are capital. */
export const display = w => /^i($|'| )/.test(w) ? 'I' + w.slice(1).replace(/ i($|'| )/g, ' I$1') : w.replace(/ i($|'| )/g, ' I$1');
