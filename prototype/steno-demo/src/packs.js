// Dictionaries. Everything steno mode types comes from here, letters included.
//
// A pack is a named dictionary: { outline: translation }. Packs are stacked,
// and the first pack in the stack that defines an outline wins, as in Plover.
// A context (messages, a terminal) is nothing more than a stack.
//
// An outline is
//
//   a stroke          T-n        flick north on T
//                     T-n-cw     the same flick, curled right (clockwise)
//                     T-n-ccw    curled left
//                     T-n-back   out and back
//                     T          a tap; T-circle a circle on the key
//                     SP-ne      a flick on the space bar
//   several strokes   T-n/SP-ne  joined with a slash; the longest match wins
//   letters           tmrw       what has been spelled; typed on the complete stroke
//
// and a translation is plain text with these operators:
//
//   word              a word; in a prose stack it brings its space
//   {^ing}            attach to the word before (known endings follow spelling rules)
//   {un^}             attach to the word after
//   {^}               bare attach, either side; {^}{-|} is camelCase
//   {&x}              a character that glues to what is round it (fingerspelling)
//   {.} {?} {!} {,} {:} {;}   prose marks: they close up to the word and space themselves
//   {"}               a double quote that knows whether it opens or closes
//   {-|}  {>}         capitalise / lowercase what comes next
//   {^ ^}             the space bar
//   {=}               the complete stroke: finish the spelled entry, or close the gap
//   {#Return} {#Tab} {#Escape} {#BackSpace} {#Up} {#Down} {#Left} {#Right} {#Control(c)}
//   {|}               where the caret lands afterwards
//   \{ \} \\          a literal brace or backslash

import { KEYS, DIRS, DETAIL, letterOf, strokeId } from './layout.js';
import { display } from './orthography.js';

const STROKE = /^(SP|SR|[ANIHORTES])(?:-(?:circle|(?:n|ne|e|se|s|sw|w|nw)(?:-(?:cw|ccw|back))?))?$/;
export const isStrokeOutline = o => typeof o === 'string' && o.length > 0 && o.split('/').every(p => STROKE.test(p));
export const isSpelledOutline = o => /^[a-z][a-z0-9']*$/.test(o);

const KEY_NAMES = /^(Return|Tab|Escape|BackSpace|Up|Down|Left|Right|Control\(.\))$/;
export const MAX_STROKES = 4;          // the longest outline the translator looks back for

/** Splits a translation into { text } and { op } atoms. Throws on a brace that never closes. */
export function parseTranslation(translation) {
  const atoms = [];
  let text = '';
  const flush = () => { if (text) { atoms.push({ text }); text = ''; } };
  for (let i = 0; i < translation.length; i++) {
    const c = translation[i];
    if (c === '\\' && '{}\\'.includes(translation[i + 1])) { text += translation[++i]; continue; }
    if (c === '}') throw new Error('a } without its {; write \\} for a brace');
    if (c !== '{') { text += c; continue; }
    // The operator runs to the next brace that is not escaped.
    let op = '', j = i + 1;
    for (; j < translation.length && translation[j] !== '}'; j++) {
      if (translation[j] === '\\' && '{}\\'.includes(translation[j + 1])) j++;
      op += translation[j];
    }
    if (j >= translation.length) throw new Error('a { that never closes; write \\{ for a brace');
    flush();
    atoms.push({ op });
    i = j;
  }
  flush();
  return atoms;
}

/** Null when an entry is well formed, otherwise what is wrong with it, in words. */
export function validateEntry(outline, translation) {
  if (!isStrokeOutline(outline) && !isSpelledOutline(outline)) {
    return 'The left side is neither a stroke such as T-n-cw nor lowercase letters such as omw.';
  }
  if (isStrokeOutline(outline)) {
    const parts = outline.split('/');
    if (parts.length > MAX_STROKES) return `An outline can be at most ${MAX_STROKES} strokes long.`;
    // Level strokes on the space bar move the caret, and the complete stroke has no turns: none of them can be an entry.
    const dead = parts.find(p => /^S[PR]-(e|w)(-|$)/.test(p) || /^S[PR]-(n|ne|nw|s)-/.test(p) || /^S[PR]-circle$/.test(p) || p === 'SR');
    if (dead) return `${dead} is not a stroke the space bar can make.`;
  }
  if (typeof translation !== 'string' || translation === '') return 'It has to type something.';
  let atoms;
  try { atoms = parseTranslation(translation); } catch (err) { return err.message[0].toUpperCase() + err.message.slice(1) + '.'; }
  for (const a of atoms) {
    if (a.op === undefined) continue;
    const op = a.op;
    if (['', '^', '^ ^', '=', '-|', '>', '|', '"', '*-|', '*>', '*!'].includes(op) || /^[.?!,:;]$/.test(op)) continue;
    if (op[0] === '&') { if (op.length < 2) return '{&} needs a character: {&x}.'; continue; }
    if (op[0] === '#') { if (!KEY_NAMES.test(op.slice(1))) return `{${op}} is not a key this keyboard can press.`; continue; }
    if (op.startsWith('^') || op.endsWith('^')) continue;
    return `{${op}} is not an operator here. Write \\{ and \\} for literal braces.`;
  }
  if (atoms.filter(a => a.op === '|').length > 1) return 'The caret can only land in one place: use {|} once.';
  return null;
}

/** What a translation looks like on a key: the operators reduced to what gets typed. */
export function labelOf(translation) {
  if (translation == null) return '';
  let atoms;
  try { atoms = parseTranslation(translation); } catch { return translation; }
  if (atoms.length === 1 && atoms[0].op !== undefined) {
    const op = atoms[0].op;
    if (op === '-|') return '⇧';
    if (op === '^ ^') return '␣';
    if (op === '=') return 'finish';
    if (op === '^') return 'join';
    if (op === '*-|') return 'Aa';
    if (op === '*!') return 'close';
    if (/^\^[a-z]+$/.test(op)) return '-' + op.slice(1);
    if (/^\^[^^]+$/.test(op)) return op.slice(1);
  }
  const KEY_GLYPH = { Return: '⏎', Tab: '⇥', Escape: 'esc', BackSpace: '⌫', Up: '↑', Down: '↓', Left: '←', Right: '→' };
  const out = atoms.map(a => {
    if (a.text !== undefined) return a.text;
    const op = a.op;
    if (op[0] === '&') return op.slice(1);
    if (op[0] === '#') { const c = /^Control\((.)\)$/.exec(op.slice(1)); return c ? '^' + c[1].toUpperCase() : KEY_GLYPH[op.slice(1)] || ''; }
    if (/^[.?!,:;"]$/.test(op)) return op;
    if (['', '^', '^ ^', '=', '-|', '>', '|', '*-|', '*>', '*!'].includes(op)) return '';
    return op.replace(/^\^|\^$/g, '');
  }).join('');
  // A space an entry types is part of what it types, so it is shown.
  return /^[a-z]/i.test(out.trim()) && out.trim().length > 3 ? out.trim() : out.replace(/^ +| +$/g, m => '␣'.repeat(m.length));
}

// ---------------------------------------------------------------- letters

/**
 * The keyboard as it has always been, as a dictionary: every letter, every
 * symbol and the space bar, typed exactly. It is the bottom of every stack,
 * so a direction no other pack claims still does what the letter page does.
 */
export function lettersPack() {
  const e = {};
  for (const k of KEYS) {
    const tap = DETAIL[k].tap;
    e[k] = `{&${tap}}`;
    e[`${k}-circle`] = `{&${tap.toUpperCase()}}`;
    for (const d of DIRS) {
      const b = DETAIL[k][d];
      if (!b) continue;
      const id = strokeId(k, d);
      const letter = letterOf(k, d);
      if (letter) { e[id] = `{&${letter}}`; e[`${id}-back`] = `{&${letter.toUpperCase()}}`; continue; }
      if (b.action === 'shift') { e[id] = '{-|}'; continue; }
      if (b.out === '\n') { e[id] = '{#Return}'; continue; }
      if (b.out === '\t') { e[id] = '{#Tab}'; continue; }
      if (b.action || b.out === ' ' || !b.label || /[˘´¨ˇ˛¸🅒]/u.test(b.label)) continue;   // dead keys and caret moves stay on the letter page
      const ch = b.label.replace(/[{}\\]/g, '\\$&');
      e[id] = `{&${ch}}`;
      if (b.ret) e[`${id}-back`] = `{&${b.ret.replace(/[{}\\]/g, '\\$&')}}`;
    }
  }
  e.SP = '{^ ^}';
  e['SP-s'] = '{=}';
  return {
    id: 'letters', name: 'Letters and symbols', locked: true, editable: false,
    description: 'The keyboard as it always was: every letter and symbol, typed exactly. Always on, at the bottom.',
    options: { spacing: 'literal', autoCapitalize: false, pronounI: false },
    entries: e,
  };
}

// ---------------------------------------------------------------- English

// Prose punctuation lives on the right half of the space bar: like an ending,
// a mark is something that finishes a word. The quieter marks are a curl of
// the two lower ones.
export const PROSE_MARKS = {
  'SR-nw': '{,}', 'SR-n': '{.}', 'SR-ne': '{?}',
  'SR-sw': "{&'}", 'SR-s': '{^}-{^}', 'SR-se': '{!}',
  'SR-sw-cw': '{"}', 'SR-sw-ccw': '{:}', 'SR-se-cw': '{(^}', 'SR-se-ccw': '{^)}',
};

/**
 * The generated English theory as one dictionary: a chunk on every tap and
 * flick, whole words on the curls, endings on the left half of the space bar
 * and marks on the right, and completions as spelled entries.
 */
export function englishPack(theory) {
  const e = { ...PROSE_MARKS };
  for (const [id, chunk] of Object.entries(theory.chunks)) e[id] = `{&${chunk}}`;
  // A circle on any key capitalises what is written next.
  for (const k of KEYS) e[`${k}-circle`] = '{-|}';
  for (const [id, w] of Object.entries(theory.curls)) e[id] = display(w);
  for (const [id, ending] of Object.entries(theory.endings)) e[id] = `{^${ending}}`;
  for (const [outline, w] of Object.entries(theory.completions)) e[outline] = display(w);
  const words = Object.values(theory.meta.corpora).reduce((s, c) => s + c.trainingTokens, 0);
  return {
    id: 'english', name: 'English', editable: false,
    description: `Three banks of chunks (what starts a syllable, its vowel, what ends it), whole words on the curls, endings and marks on the space bar. Assigned by program from ${(words / 1e6).toFixed(1)} million words of conversation and real text messages.`,
    options: { spacing: 'auto', autoCapitalize: true, pronounI: true },
    entries: e,
  };
}

// Abbreviations people already write. Spell one, then pull the space bar down.
export const TEXTING = {
  tmrw: 'tomorrow', tmr: 'tomorrow', tdy: 'today', tn: 'tonight', pls: 'please', plz: 'please', thx: 'thanks',
  ty: 'thank you', tysm: 'thank you so much', yw: "you're welcome", np: 'no problem', bc: 'because',
  abt: 'about', ppl: 'people', msg: 'message', sry: 'sorry', prob: 'probably', def: 'definitely',
  obv: 'obviously', rn: 'right now', idk: "I don't know", idc: "I don't care", omw: 'on my way',
  lmk: 'let me know', brb: 'be right back', btw: 'by the way', imo: 'in my opinion', tbh: 'to be honest',
  nvm: 'never mind', ttyl: 'talk to you later', hbu: 'how about you', wyd: 'what are you doing',
  ily: 'I love you', jk: 'just kidding', gm: 'good morning', gn: 'good night', bday: 'birthday',
  wknd: 'weekend', mins: 'minutes', hrs: 'hours', appt: 'appointment', addr: 'address', asap: 'as soon as possible',
  fyi: 'for your information', wfh: 'working from home', ofc: 'of course', atm: 'at the moment',
  irl: 'in real life', smth: 'something', rly: 'really', cya: 'see you', gtg: 'got to go',
};

// ------------------------------------------------------------------ shell

// A shell line is exact, so this pack holds no English and the terminal
// context adds no spacing and no capitals. Its symbols are the letter page's,
// in the same places, and it types nothing a shell cannot read: the letter
// page's typographic characters are switched off here. What it adds:
//   - on a curl of each symbol, the forms a shell writes with it;
//   - on directions the shell has no symbol for, the keys a terminal lives on;
//   - a digit on each key's circle, in the number page's order, and zero on
//     the space bar's flick up;
//   - commands, as spelled entries.
const SHELL_ENTRIES = {
  // a curl of a symbol is the thing you write with it
  'A-e-cw': '--', 'A-e-ccw': ' -', 'A-e-back': '->',
  'N-sw-cw': './', 'N-sw-ccw': '../', 'N-sw-back': '~/',
  'R-nw-cw': ' | ', 'R-nw-ccw': ' || ', 'R-nw-back': ' |& ',
  'S-n-cw': ' && ', 'S-n-ccw': ' &', 'S-n-back': '&>',
  'S-e-cw': ' > ', 'S-e-ccw': ' >> ', 'S-e-back': ' 2>&1',
  'T-w-cw': ' < ', 'T-w-ccw': ' << ',
  'E-nw-cw': '"{|}"', 'E-ne-cw': "'{|}'", 'N-nw-cw': '`{|}`',
  'A-sw-cw': '$({|})', 'A-sw-ccw': '$\\{{|}\\}', 'A-sw-back': '$?',
  'H-w-cw': '({|})', 'H-nw-cw': '\\{{|}\\}', 'H-sw-cw': '[{|}]', 'H-sw-ccw': '[[ {|} ]]',
  'I-s-cw': '==', 'I-s-ccw': '!=', 'T-e-cw': '**', 'T-e-ccw': '*.', 'E-s-cw': '..', 'E-s-ccw': '...',
  'T-nw-cw': '~/', 'S-w-cw': '#!/bin/sh', 'S-sw-cw': ';;',
  // the keys a terminal lives on, where the letter page keeps typography
  'A-nw': '{#Escape}', 'A-n': '{#Control(c)}', 'A-w': '{#Control(d)}', 'A-ne': '{#Control(z)}', 'A-s': '...',
  'I-n': '{#Up}', 'S-s': '{#Down}', 'I-e': '{#Control(r)}', 'I-nw': '{#Control(l)}', 'I-ne': '{#Return}',
  // numbers: circle a key for its digit, flick the space bar up for zero
  'A-circle': '{&1}', 'N-circle': '{&2}', 'I-circle': '{&3}', 'H-circle': '{&4}', 'O-circle': '{&5}',
  'R-circle': '{&6}', 'T-circle': '{&7}', 'E-circle': '{&8}', 'S-circle': '{&9}', 'SP-n': '{&0}',
  // commands: spell the letters, pull the space bar down
  gs: 'git status', ga: 'git add ', gaa: 'git add -A', gc: 'git commit -m "{|}"', gca: 'git commit --amend',
  gco: 'git checkout ', gcb: 'git checkout -b ', gp: 'git push', gpf: 'git push --force-with-lease',
  gl: 'git pull', gd: 'git diff', gds: 'git diff --staged', glg: 'git log --oneline --graph', grb: 'git rebase ',
  gst: 'git stash', gsw: 'git switch ', gb: 'git branch',
  lla: 'ls -la', cdd: 'cd ..', mkd: 'mkdir -p ', rmr: 'rm -rf ', grp: 'grep -rn "{|}" .', fnd: 'find . -name "{|}"',
  dk: 'docker ', dkc: 'docker compose ', dps: 'docker ps', kc: 'kubectl ', kgp: 'kubectl get pods',
  kd: 'kubectl describe ', nr: 'npm run ', ni: 'npm install ', sd: 'sudo ', crl: 'curl -sL ', tlf: 'tail -f ',
  // flags: spelled without their dashes
  hlp: '--help', vrs: '--version', vrb: '--verbose', frc: '--force', dryr: '--dry-run', rcr: '--recursive',
  qt: '--quiet', otp: '--output ', nm: '--name ', amd: '--amend', nmsp: '--namespace ',
};

/** The shell pack: the entries above, plus a no-op over every stroke of the letters pack that is not plain ASCII. */
export function shellEntries() {
  const e = {};
  for (const [outline, translation] of Object.entries(lettersPack().entries)) {
    if (/[^\x00-\x7f]/.test(translation)) e[outline] = '{}';
  }
  return { ...e, ...SHELL_ENTRIES };
}
export const SHELL = SHELL_ENTRIES;

// ---------------------------------------------------------------- contexts

/** Every dictionary the demo starts with. */
export function defaultPacks(theory) {
  return [
    { id: 'mine', name: 'My strokes', editable: true, entries: {}, description: 'Yours, for messages.' },
    { id: 'commands', name: 'My commands', editable: true, entries: {}, description: 'Yours, for the terminal.' },
    { id: 'texting', name: 'Texting shorthand', editable: true, entries: { ...TEXTING }, description: 'omw, tmrw, idk: spell one and pull the space bar down, and it becomes the words it stands for.' },
    { id: 'shell', name: 'Shell', editable: true, entries: shellEntries(), description: 'For a command line: the forms a shell writes on the curls of its symbols, terminal keys, a digit on each key’s circle, and commands as spelled entries. No English, nothing but ASCII.' },
    englishPack(theory),
    lettersPack(),
  ];
}

/**
 * A context is where the keyboard is being used: which dictionaries, in what
 * order, and how text is written. How text is written belongs to the context
 * and not to any dictionary, so switching a dictionary on never changes it.
 */
export const DEFAULT_CONTEXTS = {
  messages: {
    name: 'Messages', stack: ['mine', 'texting', 'english', 'letters'],
    options: { spacing: 'auto', autoCapitalize: true, pronounI: true },
  },
  terminal: {
    name: 'Terminal', stack: ['commands', 'shell', 'letters'],
    options: { spacing: 'literal', autoCapitalize: false, pronounI: false },
  },
};
export const DEFAULT_STACKS = Object.fromEntries(Object.entries(DEFAULT_CONTEXTS).map(([k, c]) => [k, c.stack]));

/**
 * Flattens a stack into one dictionary.
 * @param packs every pack
 * @param stack ids in use, in priority order; null uses every pack in order
 */
export function resolvePacks(packs, stack = null) {
  const order = stack ? stack.map(id => packs.find(p => p.id === id)).filter(Boolean) : packs;
  const entries = {}, source = {}, shadowed = [];
  for (const pack of order) {
    for (const [outline, translation] of Object.entries(pack.entries)) {
      if (outline in entries) { shadowed.push({ outline, by: source[outline], pack: pack.id, translation }); continue; }
      entries[outline] = translation;
      source[outline] = pack.id;
    }
  }
  // Without a context to say how text is written, the lowest pack that states it decides.
  const options = { spacing: 'literal', autoCapitalize: false, pronounI: false };
  for (const pack of [...order].reverse()) Object.assign(options, pack.options || {});
  return { entries, source, shadowed, options, order: order.map(p => p.id) };
}
