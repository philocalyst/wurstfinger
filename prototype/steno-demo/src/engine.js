// The translator: strokes in, text out. No DOM, no timers, no randomness.
//
// It borrows Plover's model. Every stroke is looked up in a stack of
// dictionaries; the longest run of strokes that has an entry wins and may
// rewrite what the shorter run typed; spaces and capitals are the
// translator's job; and one undo takes back one stroke, however much text
// that stroke wrote.
//
// Letters are strokes too. A letter's translation is `{&x}`, which glues to
// what is round it, so spelling a word is fingerspelling. The run of letters
// being spelled is itself an outline, but nothing ever rewrites it behind the
// typist's back: an entry for a spelled outline ("proba", "omw", "gs") is
// only offered, and typed when the typist asks with the complete stroke.
//
// Spacing, in a prose stack: a word arrives with its space after it. That
// space is the translator's and it takes it back when a mark, an ending or an
// apostrophe turns up; tapping the space bar on top of it changes nothing, so
// tapping space after every word out of habit is harmless. Letters never add
// a space. In a literal stack (a shell) nothing is added or taken back.

import { applyEnding, attachSuffix, canEnd, ENDINGS } from './orthography.js';
import { resolvePacks, labelOf, parseTranslation, isStrokeOutline } from './packs.js';

const MAX_HISTORY = 200;
const MAX_OUTLINE_STROKES = 4;
const WORD_TAIL = /([A-Za-z][A-Za-z']*)$/;
const TOKEN_TAIL = /[A-Za-z0-9'_-]*$/;
const CLOSERS = /^[\s.,?!:;)\]}]/;
const OPENERS = /[\s(\[{<\/]$/;
const OPEN_QUOTE = /(^|[\s(\[{])["'“‘]$/;                    // a quote that has just opened
const OVERTYPE = new Set(['"', "'", ')', ']', '}', '`']);     // typed again in front of itself, it is stepped over
const KEYS = {
  Return: '\n', Tab: '\t', Escape: '\x1b', Up: '\x1b[A', Down: '\x1b[B', Right: '\x1b[C', Left: '\x1b[D',
};

const capitalise = s => s.replace(/[A-Za-z]/, c => c.toUpperCase());
// A sentence starts at the start, after a stop and a space, or after a new
// line, and an opening quote or bracket in between does not change that.
const sentenceStart = text => /^[\s"'“‘(\[]*$/.test(text) || /[.?!]["'”’)\]]*\s+["'“‘(\[]*$/.test(text) || /\n[\s"'“‘(\[]*$/.test(text);

export class Engine {
  /**
   * @param packs  every dictionary the user has, in priority order
   * @param stack  ids of the packs in use, or null for all that are enabled
   */
  constructor(packs, stack = null, options = null) {
    this.listeners = new Set();
    this.host = null;                    // { key(name) -> handled } for keys the host app acts on
    this.setPacks(packs, stack, options);
    this.reset('');
  }

  // ------------------------------------------------------------ dictionaries

  /**
   * @param options  how the context writes: { spacing: 'auto' | 'literal', autoCapitalize, pronounI }.
   *                 It belongs to the context, not to a pack, so switching a pack on never changes it.
   */
  setPacks(packs, stack = null, options = null) {
    this.packs = packs;
    this.stack = stack;
    const resolved = resolvePacks(packs, stack);
    this.entries = resolved.entries;
    this.source = resolved.source;
    this.shadowed = resolved.shadowed;
    this.options = options || resolved.options;
    this.multi = new Set(Object.keys(this.entries).filter(o => o.includes("/")));
    this.emit();
  }

  lookup(outline) { return this.entries[outline]; }
  /** What a stroke would type, as a short label, or '' when it is undefined. */
  label(outline) { return labelOf(this.entries[outline]); }
  get prose() { return this.options.spacing === 'auto'; }

  // ------------------------------------------------------------------ state

  reset(text = '') {
    this.state = {
      text, after: '',
      capNext: false, lowerNext: false,    // an explicit shift, waiting for the next letter or word
      attachNext: false,                   // the next word goes straight on, no space before it
      autoSpace: false,                    // the text ends in a space the translator added
      swallowed: false,                    // ...and the space bar has already been tapped on it once
      pending: null,                       // { start } while a word is being spelled
    };
    this.history = [];
    this.tape = [];
    this.seq = 0;
    this.lastEvent = null;
    this.emit();
  }

  get text() { return this.state.text + this.state.after; }
  /** The text as it would be sent: without the space the translator is still holding. */
  get clean() {
    const s = this.state;
    return (s.autoSpace && !s.after && s.text.endsWith(' ') ? s.text.slice(0, -1) : s.text) + s.after;
  }
  /** Letters, digits and, in prose, the apostrophe make up a word. */
  wordy(ch) { return this.prose ? /[A-Za-z0-9'_]/.test(ch) : /[A-Za-z0-9_]/.test(ch); }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }

  /** The letters being spelled, and the entry the complete stroke would turn them into. */
  pendingOutline() {
    const tail = this.spelled();
    if (!tail) return null;
    const entry = this.completionFor(tail.typed);
    return { typed: tail.typed, expansion: entry ? labelOf(entry) : null };
  }

  /** The run of letters the caret is at the end of: the part of the token after any hyphen. */
  spelled() {
    const p = this.state.pending;
    if (!p) return null;
    const text = this.state.text;
    const start = Math.max(p.start, text.length - (this.prose ? /[A-Za-z0-9']*$/ : /[A-Za-z0-9]*$/).exec(text)[0].length);
    return start < text.length ? { start, typed: text.slice(start) } : null;
  }

  completionFor(typed) {
    const key = typed.toLowerCase();
    if (isStrokeOutline(key) || isStrokeOutline(typed)) return null;
    const t = this.entries[key];
    return t !== undefined && labelOf(t).toLowerCase() !== key ? t : null;
  }

  // ----------------------------------------------------------------- input

  /** One stroke. Returns the tape entry describing what happened. */
  stroke(id) {
    const before = this.snapshot();
    let translation = this.entries[id];
    let outline = id;
    let joined = 0;

    // Longest match: does this stroke complete an outline begun by the strokes before it?
    const chain = this.chain();
    for (let k = Math.min(chain.length, MAX_OUTLINE_STROKES - 1); k >= 1; k--) {
      const candidate = [...chain.slice(-k).map(c => c.id), id].join('/');
      if (this.multi.has(candidate)) { outline = candidate; translation = this.entries[candidate]; joined = k; break; }
    }
    if (translation === undefined) return this.record({ id, outline: id, kind: 'undefined', before, label: '' });

    // A longer outline rewrites what its earlier strokes typed. Undo still
    // takes back only this stroke: it restores `before`, the shorter outline's text.
    if (joined) this.restore(chain.at(-joined).before);
    let kind;
    try { kind = this.apply(translation); } catch (err) {
      this.restore(before);
      return this.record({ id, outline, kind: 'invalid', before, label: String(err.message || err) });
    }
    return this.record({ id, outline, kind, before, label: labelOf(translation), strokes: joined + 1 });
  }

  /**
   * Text from the letter and number pages, which type exactly what they show.
   * It joins the token it lands in; only the translator's own space gives way
   * to a closing mark.
   */
  literal(str) {
    const before = this.snapshot();
    const s = this.state;
    if (str === ' ') {
      s.pending = null;
      this.space();
      return this.record({ id: null, outline: ' ', kind: 'space', before, label: '␣' });
    }
    if (this.overtype(str)) return this.record({ id: null, outline: str, kind: 'literal', before, label: str });
    if (this.prose && s.autoSpace && CLOSERS.test(str)) this.takeBackSpace();
    const cap = s.capNext && /^[a-z]/.test(str);
    s.text += cap ? capitalise(str) : str;
    if (cap || /[A-Za-z]/.test(str)) { s.capNext = false; s.lowerNext = false; }
    s.autoSpace = false; s.swallowed = false; s.attachNext = false;
    if (this.wordy(str.at(-1))) { if (!s.pending) s.pending = { start: s.text.length - TOKEN_TAIL.exec(s.text)[0].length }; } else s.pending = null;
    return this.record({ id: null, outline: str, kind: 'literal', before, label: str });
  }

  /** The undo key: takes back the last stroke whole, or failing that one character. */
  backspace() {
    const last = this.history.pop();
    if (last) {
      this.restore(last.before);
      // Take the stroke off the tape too, along with anything refused since.
      const at = this.tape.findLastIndex(e => e.undoable);
      if (at >= 0) this.tape.length = at;
      return this.note({ kind: 'undo', id: '*', outline: '*', label: last.label, out: '', removed: last.out || '' });
    }
    return this.deleteChar();
  }

  /** Deletes one character before the caret: an edit, not an undo. */
  deleteChar() {
    const s = this.state;
    if (!s.text) return null;
    const removed = [...s.text].pop();
    s.text = s.text.slice(0, -removed.length);
    this.afterEdit();
    return this.note({ kind: 'delete', id: '*', outline: '*', label: '⌫', out: '', removed });
  }

  /** Deletes the word before the caret, with the space after it. */
  deleteWord() {
    const s = this.state;
    const m = /\S+\s*$/.exec(s.text);
    if (!m) return null;
    const removed = s.text.slice(m.index);
    s.text = s.text.slice(0, m.index);
    this.afterEdit();
    return this.note({ kind: 'delete', id: '*', outline: '*', label: '⌫', out: '', removed });
  }

  moveCaret(delta) {
    const s = this.state;
    const all = s.text + s.after;
    const at = Math.max(0, Math.min(all.length, s.text.length + delta));
    if (at === s.text.length) return false;
    s.text = all.slice(0, at); s.after = all.slice(at);
    this.afterEdit();
    this.emit();
    return true;
  }

  /** The text changed under us: what we remember about our own strokes no longer applies. */
  afterEdit() {
    const s = this.state;
    this.history = [];
    Object.assign(s, { pending: null, attachNext: false, lowerNext: false, capNext: false, autoSpace: false, swallowed: false });
  }

  note(entry) {
    entry.seq = ++this.seq;
    this.lastEvent = entry;
    this.emit();
    return entry;
  }

  // ------------------------------------------------------------ translation

  /** Applies one translation. Returns the kind of thing it was. */
  apply(translation) {
    const s = this.state;
    const atoms = parseTranslation(translation);
    let kind = 'word';
    let caretMark = null;
    let attached = false;                // this translation has already started writing
    let attachPrev = false;              // a leading {^}: join what comes before

    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      const last = i === atoms.length - 1;
      if (a.text !== undefined) {
        this.word(a.text, attachPrev || attached, last);
        attached = true; attachPrev = false;
        continue;
      }
      const op = a.op;
      if (op === '|') { caretMark = s.text.length; continue; }
      if (op === '') { Object.assign(s, { attachNext: false, capNext: false, lowerNext: false }); kind = 'shift'; continue; }
      if (op[0] === '&') { this.glue(op.slice(1)); kind = 'letter'; attached = true; continue; }
      if (op === '^') {
        if (!attached) { this.boundary(); this.takeBackSpace(); attachPrev = true; if (kind === 'word') kind = 'join'; }
        if (attached || last) { this.takeBackSpace(); s.attachNext = true; }
        continue;
      }
      if (op === '^ ^') { this.boundary(); this.space(); kind = 'space'; continue; }
      if (op === '=') { kind = this.complete(); continue; }
      if (op === '*-|' || op === '*>') { this.retroCase(op === '*-|'); kind = 'retro'; continue; }
      if (op === '*!') { this.retroJoin(); kind = 'retro'; continue; }
      if (op === '-|') { s.capNext = true; s.lowerNext = false; if (kind === 'word') kind = 'shift'; continue; }
      if (op === '>') { s.lowerNext = true; s.capNext = false; if (kind === 'word') kind = 'shift'; continue; }
      if (/^[.?!,:;]$/.test(op)) { this.mark(op); kind = 'mark'; attached = true; continue; }
      if (op === '"') { this.quote(); kind = 'mark'; attached = true; continue; }
      if (op[0] === '#') { this.key(op.slice(1)); kind = 'key'; attached = true; continue; }
      const open = op.startsWith('^'), close = op.endsWith('^') && op.length > 1;
      const inner = op.slice(open ? 1 : 0, close ? -1 : undefined);
      if (open && !close && ENDINGS[inner] && !attached) { this.ending(inner); kind = 'ending'; attached = true; continue; }
      if (open && !attached) {
        this.boundary(); this.takeBackSpace();
        if (kind === 'word') kind = 'ending';
        // A suffix of the user's own follows the same spelling rules as the built-in endings.
        const m = !close && /^[a-z]+$/.test(inner) ? WORD_TAIL.exec(s.text) : null;
        if (m && !m[1].includes("'")) {
          s.text = s.text.slice(0, m.index) + attachSuffix(m[1], inner);
          s.attachNext = false;
          if (last) this.trail();
          attached = true;
          continue;
        }
      }
      this.word(inner, open || attached || attachPrev, !close && last);
      if (close) { this.takeBackSpace(); s.attachNext = true; }
      attached = true; attachPrev = false;
    }
    if (caretMark !== null) {
      this.takeBackSpace();
      s.after = s.text.slice(caretMark) + s.after;
      s.text = s.text.slice(0, caretMark);
      Object.assign(s, { attachNext: true, autoSpace: false, swallowed: false });
    }
    return kind;
  }

  /** Ends the word being spelled. */
  boundary() {
    const s = this.state;
    const p = s.pending;
    if (!p) return;
    s.pending = null;
    // English writes the pronoun with a capital, however it was typed.
    if (this.options.pronounI) {
      const typed = s.text.slice(p.start);
      if (/^i('(m|ll|ve|d))?$/.test(typed)) s.text = s.text.slice(0, p.start) + 'I' + typed.slice(1);
    }
  }

  takeBackSpace() {
    const s = this.state;
    if (s.autoSpace && s.text.endsWith(' ')) s.text = s.text.slice(0, -1);
    s.autoSpace = false; s.swallowed = false;
  }

  /** Whether a word written now needs a space put before it. */
  needsLead() {
    const s = this.state;
    return this.prose && s.text.length > 0 && !s.attachNext && !OPENERS.test(s.text) && !OPEN_QUOTE.test(s.text);
  }

  /** Adds the translator's own space after a finished word, unless what follows already separates it. */
  trail() {
    const s = this.state;
    if (!this.prose || s.attachNext || CLOSERS.test(s.after)) return;
    s.text += ' ';
    s.autoSpace = true; s.swallowed = false;
  }

  cased(text) {
    const s = this.state;
    let out = text;
    if (s.capNext || (!s.lowerNext && this.options.autoCapitalize && sentenceStart(s.text))) out = capitalise(out);
    else if (s.lowerNext) out = out.replace(/[A-Za-z]/, c => c.toLowerCase());
    s.capNext = false; s.lowerNext = false;
    return out;
  }

  /**
   * Writes text as a word.
   * @param attach   join what is before it: no space is put in front
   * @param finished whether the translator's space should follow
   */
  word(text, attach, finished = true) {
    const s = this.state;
    if (!attach) this.boundary();
    if (!attach && this.needsLead()) s.text += ' ';
    // In a literal stack an entry that begins with a space does not double one that is already there,
    // and one that ends with a space has supplied it: a space tapped next is the same space.
    if (!this.prose && text.startsWith(' ') && / $/.test(s.text)) text = text.slice(1);
    s.text += this.cased(text);
    s.attachNext = false; s.autoSpace = false; s.swallowed = false;
    if (finished) this.trail();
    if (!this.prose && / $/.test(text)) s.autoSpace = true;
  }

  glue(ch) {
    const s = this.state;
    if (this.overtype(ch)) return;
    const wordy = this.wordy(ch);
    if (!s.pending) {
      // An apostrophe or a hyphen joins the word before it: can + 't, well + -known.
      if ((ch === "'" || ch === '-') && this.prose) this.takeBackSpace();
      if (wordy || ch === '-') s.pending = { start: s.text.length - TOKEN_TAIL.exec(s.text)[0].length };
    }
    s.text += /^[A-Za-z]+$/.test(ch) ? this.cased(ch) : ch;        // a chunk is cased as the letters it is
    if (!wordy && ch !== '-') s.pending = null;
    s.attachNext = false; s.autoSpace = false; s.swallowed = false;
  }

  /** A closing quote or bracket typed where one already stands steps over it instead of doubling it. */
  overtype(ch) {
    const s = this.state;
    if (!OVERTYPE.has(ch) || !s.after.startsWith(ch)) return false;
    s.text += ch; s.after = s.after.slice(ch.length);
    Object.assign(s, { pending: null, autoSpace: false, swallowed: false, attachNext: false });
    return true;
  }

  space() {
    const s = this.state;
    // The translator already put a space here; the first tap on top of it is the same space.
    if (s.autoSpace && !s.swallowed) { s.swallowed = true; return; }
    s.text += ' ';
    s.autoSpace = false; s.swallowed = false; s.attachNext = false;
  }

  mark(ch) {
    const s = this.state;
    this.boundary();
    if (s.autoSpace) this.takeBackSpace();
    else if (this.prose && /\S $/.test(s.text)) s.text = s.text.slice(0, -1);
    s.text += ch;
    s.attachNext = false;
    this.trail();
  }

  /** A double quote that knows whether it opens or closes. */
  quote() {
    const s = this.state;
    this.boundary();
    const opening = (s.text.match(/"/g) || []).length % 2 === 0;
    if (opening) {
      s.text += (this.needsLead() ? ' ' : '') + '"';
      Object.assign(s, { attachNext: true, autoSpace: false, swallowed: false });
    } else {
      this.takeBackSpace();
      s.text += '"';
      s.attachNext = false;
      this.trail();
    }
  }

  ending(name) {
    const s = this.state;
    this.boundary();
    this.takeBackSpace();
    const m = WORD_TAIL.exec(s.text);
    // An ending with no word before it, or on a word that cannot take it, is not typed at all.
    if (!m) throw new Error('no word to end');
    if (!canEnd(m[1], name)) throw new Error(`${m[1]} takes no ${ENDINGS[name].label}`);
    s.text = s.text.slice(0, m.index) + applyEnding(m[1], name);
    s.attachNext = false;
    this.trail();
  }

  /**
   * The complete stroke. If the letters being spelled are an entry, they
   * become it. Otherwise it closes the gap after the last word, so that what
   * is typed next joins it: thank, close, f-u-l is "thankful".
   */
  complete() {
    const s = this.state;
    const p = this.spelled();
    if (s.pending) {
      const translation = p ? this.completionFor(p.typed) : null;
      if (translation === null) return 'join';
      const wasCapital = /^[A-Z]/.test(p.typed);
      s.text = s.text.slice(0, p.start);
      s.pending = null;
      // Where the letters stood is where the entry goes; no new space in front.
      s.attachNext = true;
      if (wasCapital) s.capNext = true;
      this.apply(translation);
      return 'completion';
    }
    if (s.autoSpace) { this.takeBackSpace(); s.attachNext = true; return 'join'; }
    throw new Error('nothing to finish');
  }

  /** Capitalises or lowercases the word before the caret, after the fact. */
  retroCase(upper) {
    const s = this.state;
    this.boundary();
    const m = /([A-Za-z][A-Za-z']*)(\s*)$/.exec(s.text);
    if (!m) throw new Error('no word to change');
    const word = upper ? capitalise(m[1]) : m[1][0].toLowerCase() + m[1].slice(1);
    s.text = s.text.slice(0, m.index) + word + m[2];
  }

  /** Closes the gap before the word before the caret: "note book" becomes "notebook". */
  retroJoin() {
    const s = this.state;
    this.boundary();
    const m = /(\S) (\S+\s*)$/.exec(s.text);
    if (!m) throw new Error('no gap to close');
    s.text = s.text.slice(0, m.index) + m[1] + m[2];
  }

  key(name) {
    const s = this.state;
    this.boundary();
    if (name === 'BackSpace') { s.text = s.text.slice(0, -1); return; }
    if (name === 'Left' || name === 'Right') {
      const all = s.text + s.after, at = Math.max(0, Math.min(all.length, s.text.length + (name === 'Left' ? -1 : 1)));
      s.text = all.slice(0, at); s.after = all.slice(at);
      Object.assign(s, { pending: null, attachNext: false, autoSpace: false, swallowed: false });
      return;
    }
    // A key the host acts on (history, completion, interrupt) changes the line
    // behind the translator's back, so what it remembers is dropped.
    if (this.host?.key?.(name)) { this.history = []; return; }
    const control = /^Control\((.)\)$/.exec(name);
    const out = control ? String.fromCharCode(control[1].toUpperCase().charCodeAt(0) & 31) : KEYS[name];
    if (out === undefined) throw new Error(`unknown key ${name}`);
    if (name === 'Return') this.takeBackSpace();
    s.text += out;
    Object.assign(s, { attachNext: false, autoSpace: false, swallowed: false });
  }

  // --------------------------------------------------------------- history

  snapshot() { return { ...this.state, pending: this.state.pending && { ...this.state.pending } }; }
  restore(snap) { this.state = { ...snap, pending: snap.pending && { ...snap.pending } }; }

  /** The strokes since the last thing that was not a stroke, for longest match. */
  chain() {
    const out = [];
    for (let i = this.history.length - 1; i >= 0 && out.length < MAX_OUTLINE_STROKES; i--) {
      if (!this.history[i].id) break;
      out.unshift(this.history[i]);
    }
    return out;
  }

  record({ id, outline, kind, before, label, strokes = 1 }) {
    // What changed, as "removed" and "added" round the common prefix and suffix.
    const was = before.text + before.after, now = this.state.text + this.state.after;
    let i = 0;
    while (i < was.length && i < now.length && was[i] === now[i]) i++;
    let j = 0;
    while (j < was.length - i && j < now.length - i && was[was.length - 1 - j] === now[now.length - 1 - j]) j++;
    const entry = { id, outline, kind, label, out: now.slice(i, now.length - j), removed: was.slice(i, was.length - j), strokes };
    // A space tapped on top of the translator's own space changed nothing: it
    // is not a stroke to undo and it does not go on the tape.
    if (kind === 'space' && entry.out === '' && entry.removed === '') return this.note(entry);
    if (kind !== 'undefined' && kind !== 'invalid') {
      this.history.push({ id, before, label, out: entry.out });
      if (this.history.length > MAX_HISTORY) this.history.shift();
      entry.undoable = true;
    }
    this.tape.push(entry);
    if (this.tape.length > 200) this.tape.shift();
    return this.note(entry);
  }
}
