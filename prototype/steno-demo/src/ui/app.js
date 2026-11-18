// Wires the demo together: the phone, the composer, the strip above the
// keys, the coach, and the synthetic finger that demonstrates strokes.

import theory from '../theory.generated.js';
import { Engine } from '../engine.js';
import { defaultPacks, DEFAULT_CONTEXTS, isStrokeOutline, parseTranslation } from '../packs.js';
import { makePlanner } from '../planner.js';
import { scriptFor } from '../script.js';
import { pathFor } from '../robot.js';
import { parseStroke } from '../layout.js';
import { Keyboard, GEO, MODES, MODE_LABEL, keyRect } from './keyboard.js';
import { Guide } from './guide.js';
import { glyph, setKeyNamer } from './glyph.js';
import { mountPanel } from './panel.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: nothing persists */ } },
};

// ---------------------------------------------------------------- settings

const settings = Object.assign({ guide: 'pause', theme: 'dark', words: true, trail: true }, store.get('wf-steno-settings', {}));
if (!['pause', 'always', 'off'].includes(settings.guide)) settings.guide = 'pause';
function saveSettings() {
  store.set('wf-steno-settings', settings);
  document.documentElement.dataset.theme = settings.theme;
  $('keys').classList.toggle('words-hidden', !settings.words);
}

// ------------------------------------------------------------ dictionaries

// What ships, untouched, so that a user's changes can be kept as changes: a
// later version of a shipped dictionary still reaches someone who edited it.
const shipped = Object.fromEntries(defaultPacks(theory).map(p => [p.id, p.entries]));
const packs = defaultPacks(theory);
{
  const saved = store.get('wf-steno-edits', {});
  for (const p of packs) {
    const edit = saved[p.id];
    if (!p.editable || !edit) continue;
    for (const o of edit.removed || []) delete p.entries[o];
    Object.assign(p.entries, edit.set || {});
  }
  // Dictionaries the user made, whole.
  for (const u of store.get('wf-steno-own', [])) {
    if (u && typeof u.id === 'string' && u.entries && !packs.some(p => p.id === u.id)) packs.unshift({ id: u.id, name: String(u.name || 'Untitled'), description: 'Yours.', editable: true, own: true, entries: u.entries });
  }
}
const contexts = JSON.parse(JSON.stringify(DEFAULT_CONTEXTS));
{
  const saved = store.get('wf-steno-stacks', {});
  for (const [id, ctx] of Object.entries(contexts)) {
    if (Array.isArray(saved[id])) ctx.stack = saved[id].filter(p => packs.some(x => x.id === p));
    if (!ctx.stack.includes('letters')) ctx.stack.push('letters');
  }
}

function savePacks() {
  const edits = {};
  for (const p of packs) {
    if (!p.editable || p.own) continue;
    const base = shipped[p.id] || {};
    const set = Object.fromEntries(Object.entries(p.entries).filter(([o, t]) => base[o] !== t));
    const removed = Object.keys(base).filter(o => !(o in p.entries));
    if (Object.keys(set).length || removed.length) edits[p.id] = { set, removed };
  }
  store.set('wf-steno-edits', edits);
  store.set('wf-steno-own', packs.filter(p => p.own).map(p => ({ id: p.id, name: p.name, entries: p.entries })));
  store.set('wf-steno-stacks', Object.fromEntries(Object.entries(contexts).map(([id, c]) => [id, c.stack])));
}

// `app` is the app on the phone. `dict` is whose dictionaries the keyboard is
// using, which follows the app but can be switched by a stroke.
const state = {
  app: store.get('wf-steno-context', 'messages'), dict: null, drafts: {},
  coach: null, spelled: 0, word: '', capture: null, playing: false, cancel: false, history: [], historyAt: 0,
};
if (!contexts[state.app]) state.app = 'messages';
state.dict = state.app;

const engine = new Engine(packs, contexts[state.dict].stack, contexts[state.dict].options);
let planner = makePlanner(engine.entries, theory);

function packsChanged() {
  savePacks();
  engine.setPacks(packs, contexts[state.dict].stack, contexts[state.dict].options);
  planner = makePlanner(engine.entries, theory);
  state.coach = null;
  kb.renderFaces();
  renderPager();
  renderRibbon();
  document.dispatchEvent(new CustomEvent('wf-packs'));
}

// Keys a terminal acts on. The translator hands them over and forgets the line, because the shell now owns it.
engine.host = {
  key(name) {
    if (state.app !== 'terminal') return ['Escape', 'Up', 'Down'].includes(name) || /^Control/.test(name);   // nothing to do in a message
    switch (name) {
      case 'Return': submit(); return true;
      case 'Up': case 'Down': {
        if (!state.history.length) return true;
        state.historyAt = Math.max(0, Math.min(state.history.length, state.historyAt + (name === 'Up' ? -1 : 1)));
        setTimeout(() => engine.reset(state.history[state.historyAt] || ''), 0);
        return true;
      }
      case 'Control(c)': setTimeout(() => { terminalLine('cmd', engine.text + '^C'); engine.reset(''); }, 0); return true;
      case 'Control(l)': $('terminal').innerHTML = ''; return true;
      case 'Tab': toast('Tab: the shell would complete this'); return true;
      case 'Escape': return true;
      default: if (/^Control/.test(name)) { toast(`${name.replace('Control(', 'Ctrl-').replace(')', '').toUpperCase().replace('CTRL', 'Ctrl')} sent`); return true; }
    }
    return false;
  },
};

// ---------------------------------------------------------------- keyboard

const overlay = $('overlay');
const SHORT = { messages: 'words', terminal: 'shell' };
const otherContext = () => Object.keys(contexts).find(id => id !== state.dict);
const kb = new Keyboard($('keys'), engine, {
  onMode: () => { renderPager(); renderRibbon(); },
  onTouch: t => { guide.show(t); trailStart(t); $('field').classList.add('busy'); },
  onCandidate: t => guide.update(t),
  onRelease: (t, c, entry) => {
    const typed = c && c.type !== 'tap' && !(entry && (entry.kind === 'undefined' || entry.kind === 'invalid'));
    guide.hide(t, typed ? liftText(c, entry) : null);
    trailEnd(t);
    $('field').classList.remove('busy');
  },
  onStroke: (c, entry) => noteStroke(entry, c),
  onAction: (action, amount) => act(action, amount),
  onGhost: (phase, p) => ghost(phase, p),
  capture: () => state.capture,
  stackLabel: () => SHORT[state.dict] || 'steno',
  otherStackLabel: () => SHORT[otherContext()] || '',
});
const guide = new Guide(overlay, kb, engine, settings);
// In a stroke's picture a key is named by what it types when tapped.
setKeyNamer(key => engine.label(key) || key.toLowerCase());

/** What lifts off the guide when a stroke is released: what it wrote, not what it is called. */
function liftText(c, entry) {
  if (!entry) return c.label;
  if (entry.kind === 'completion' || entry.kind === 'ending') return (/\S+\s*$/.exec(entry.out) || [c.label])[0].trim();
  return c.label;
}

function act(action, amount) {
  switch (action) {
    case 'undo': engine.backspace(); resync(); break;
    case 'deleteChar': for (let i = 0; i < amount; i++) engine.deleteChar(); resync(); break;
    case 'deleteWord': engine.deleteWord(); resync(); break;
    case 'caret': engine.moveCaret(amount); resync(); break;
    case 'return': submit(); break;
    case 'change': change(); break;
    case 'stack': setDict(otherContext()); break;
    default: break;
  }
}

/** After an edit, what the coach thinks is being spelled is whatever the engine says. */
function resync() {
  const p = engine.pendingOutline();
  state.spelled = p ? p.typed.length : 0;
  state.word = p ? p.typed : '';
  state.coach = null;
  renderRibbon();
}

const isWordStroke = id => {
  const s = id && parseStroke(id);
  if (!s || !s.dir || s.key === 'SP') return false;
  try { return !parseTranslation(engine.lookup(id) || '').some(a => a.op?.[0] === '&'); } catch { return false; }
};

/** Steps the last word stroke to the next stroke on the same flick: the flick, then each curl. */
function change() {
  const last = engine.history.at(-1);
  const family = last && isWordStroke(last.id) ? kb.siblings(last.id).filter(isWordStroke) : [];
  if (family.length < 2) { toast('Change works on the word you just stroked'); return; }
  const next = family[(family.indexOf(last.id) + 1) % family.length];
  engine.backspace();
  engine.stroke(next);
  resync();
}

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text;
  $('keyboard').appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

// ------------------------------------------------------------------- coach

/**
 * Watches how words get written. When a word was spelled that has a shorter
 * way, the strip shows that way once. It never changes the text.
 */
function noteStroke(entry, c) {
  if (!entry) return;
  entry.guessed = !!(c && c.tail);       // a curl that means nothing was read as its flick
  const letter = entry.kind === 'letter' || (entry.kind === 'literal' && /^[A-Za-z']$/.test(entry.outline));   // a piece of a word
  if (letter) {
    state.spelled++;
    state.word = engine.pendingOutline()?.typed || '';
  } else if (!['undefined', 'invalid', 'shift'].includes(entry.kind)) {
    const finishedSpelled = state.spelled > 0 && ['word', 'space', 'mark', 'key', 'ending'].includes(entry.kind);
    const word = state.word.toLowerCase();
    state.coach = finishedSpelled && kb.mode === 'steno' ? coachFor(word, state.spelled) : null;
    if (finishedSpelled) document.dispatchEvent(new CustomEvent('wf-spelled', { detail: { word } }));
    if (['word', 'ending', 'completion'].includes(entry.kind) && entry.id) document.dispatchEvent(new CustomEvent('wf-stroked', { detail: { id: entry.id, text: entry.label } }));
    state.spelled = 0; state.word = '';
  }
  renderRibbon();
}

function coachFor(word, typedGestures) {
  if (!word || word.length < 2 || !/^[a-z']+$/.test(word)) return null;
  const plan = planner.plan(word);
  const shown = plan && planStrokes(plan);
  if (!shown || shown.gestures >= typedGestures) return null;
  return { word, ...shown };
}

/** A plan as what to show: the strokes that write it, and a few words on why. */
function planStrokes(plan) {
  const parts = plan.strokes.map(stroke => ({ stroke }));
  if (plan.kind === 'curl') return { parts, gestures: 1, why: 'one stroke: flick and curl' };
  if (plan.kind === 'pieces') return { parts, gestures: plan.gestures, why: plan.parts.join(' · ') };
  if (plan.kind === 'completion') return { parts, gestures: plan.gestures, why: `${plan.parts.join(' · ')}, then pull space down` };
  if (plan.kind === 'ending') {
    const ending = plan.ending.startsWith("'") || plan.ending === "n't" ? plan.ending : `-${plan.ending}`;
    return { parts, gestures: plan.gestures, why: `${plan.base.word}, then ${ending}` };
  }
  return null;
}

const partsHtml = (parts, size = 28) => parts.map(p => p.stroke ? glyph(p.stroke, size) : `<span class="spell">${esc(p.letters)}</span>`).join('');

// ------------------------------------------------------------------ strip

function renderPager() {
  const pager = $('pager');
  if (!pager.children.length) {
    pager.innerHTML = '<div class="thumb"></div>' + MODES.map(m => `<button role="tab" data-mode="${m}"></button>`).join('');
    pager.addEventListener('click', e => { const b = e.target.closest('button'); if (b) kb.setMode(b.dataset.mode); });
  }
  const i = MODES.indexOf(kb.mode);
  pager.querySelector('.thumb').style.transform = `translateX(${i * 44}px)`;
  for (const b of pager.querySelectorAll('button')) {
    b.setAttribute('aria-pressed', b.dataset.mode === kb.mode);
    // The middle page is named for the dictionaries it is using.
    b.textContent = b.dataset.mode === 'steno' ? (SHORT[state.dict] || MODE_LABEL.steno) : MODE_LABEL[b.dataset.mode];
  }
}

let ribbonKey = '';
function renderRibbon() {
  const tape = $('tape');
  const chips = [];
  const pending = engine.pendingOutline();
  const last = engine.lastEvent;
  // The last strokes that wrote words, oldest first. Letters show as the word being spelled.
  const shown = engine.tape.filter(e => ['word', 'ending', 'completion', 'undefined', 'invalid'].includes(e.kind) && e.id).slice(-2);
  for (const e of shown) {
    const fresh = e === last && !pending;
    const old = fresh ? '' : ' old';
    if (e.kind === 'undefined') { if (fresh) chips.push(`<span class="chip raw" data-seq="${e.seq}">${glyph(e.id, 30)}<span>nothing on this stroke</span></span>`); continue; }
    if (e.kind === 'invalid') { if (fresh) chips.push(`<span class="chip raw" data-seq="${e.seq}">${glyph(e.id, 30)}<span>${esc(e.label)}</span></span>`); continue; }
    // What the stroke wrote: the finished word for an ending or a completion, the entry's text otherwise.
    const text = e.kind === 'word' ? e.label : (/\S+\s*$/.exec(e.out) || [e.label])[0].trim();
    chips.push(`<span class="chip${old}${e.guessed ? ' guessed' : ''}" data-seq="${e.seq}"${e.guessed ? ' title="No curl there: read as the flick"' : ''}>${isStrokeOutline(e.id) ? glyph(e.id, 30) : ''}<span>${esc(text)}</span></span>`);
  }
  if (last?.kind === 'undo') chips.push(`<span class="chip undo" data-seq="u${last.seq}"><span>${esc(last.removed.trim() || last.label)}</span></span>`);
  if (pending) {
    const complete = planner.completeStroke;
    const more = pending.expansion && complete
      ? `<span class="arrow">→</span><span class="to">${esc(pending.expansion)}</span>${glyph(complete, 26)}` : '';
    chips.push(`<span class="chip spelling${more ? ' offer' : ''}" data-seq="p${more ? 'o' : ''}">${esc(pending.typed)}${more}</span>`);
  } else if (state.coach) {
    const c = state.coach;
    chips.push(`<button class="chip coach" data-seq="c${esc(c.word)}" id="coachChip" title="Show me">${partsHtml(c.parts, 30)}<span>${esc(c.word)}</span><span class="why">${esc(c.why)}</span></button>`);
  }
  const key = chips.join('');
  if (key === ribbonKey) return;
  const before = new Set([...tape.children].map(n => n.dataset.seq));
  tape.innerHTML = key;
  for (const n of tape.children) if (before.has(n.dataset.seq)) n.style.animation = 'none';
  ribbonKey = key;
  const coach = state.coach;
  $('coachChip')?.addEventListener('click', () => { if (coach) demonstrate(coach.parts); });
}

// Dragging the strip sideways turns the keyboard's page.
{
  const ribbon = $('ribbon');
  let drag = null;
  ribbon.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = { x: e.clientX, t: performance.now(), moved: false }; ribbon.setPointerCapture(e.pointerId); });
  ribbon.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / scale();
    if (Math.abs(dx) > 6) drag.moved = true;
    if (drag.moved) kb.dragStrip(dx);
  });
  const end = e => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / scale();
    if (drag.moved) kb.endDrag(dx, dx / Math.max(1, performance.now() - drag.t));
    drag = null;
  };
  ribbon.addEventListener('pointerup', end);
  ribbon.addEventListener('pointercancel', end);
}

// ---------------------------------------------------------------- composer

// Keys a terminal understands arrive as control characters; show them as what was pressed.
const visible = s => esc(s).replace(/\x1b\[A/g, '<kbd>↑</kbd>').replace(/\x1b\[B/g, '<kbd>↓</kbd>').replace(/\x1b\[C/g, '<kbd>→</kbd>')
  .replace(/\x1b\[D/g, '<kbd>←</kbd>').replace(/\x1b/g, '<kbd>esc</kbd>').replace(/\t/g, '<kbd>tab</kbd>')
  .replace(/[\x01-\x08\x0b-\x1a]/g, c => `<kbd>^${String.fromCharCode(c.charCodeAt(0) + 64)}</kbd>`);

function renderField() {
  const f = $('field');
  const s = engine.state;
  const pending = engine.pendingOutline();
  const last = engine.lastEvent;
  let html;
  if (!s.text && !s.after) {
    html = `<span class="caret"></span><span class="placeholder">${state.app === 'terminal' ? '' : 'Message'}</span>`;
  } else if (pending && s.text.endsWith(pending.typed)) {
    const exp = pending.expansion;
    const rest = exp && exp.toLowerCase().startsWith(pending.typed.toLowerCase()) ? exp.slice(pending.typed.length) : '';
    html = visible(s.text.slice(0, -pending.typed.length)) + `<span class="spelling">${visible(pending.typed)}</span><span class="caret"></span>`
      + (rest ? `<span class="ghost">${visible(rest)}</span>` : '');
  } else {
    // The word a stroke just wrote lands with a brief highlight.
    const out = last && ['word', 'ending', 'completion'].includes(last.kind) ? last.out.replace(/\s+$/, '') : '';
    const trailing = s.text.length - s.text.replace(/\s+$/, '').length;
    const body = trailing ? s.text.slice(0, -trailing) : s.text;
    if (out.trim().length > 1 && body.endsWith(out)) {
      const lead = out.match(/^\s*/)[0];
      html = visible(body.slice(0, -out.length) + lead) + `<span class="landed">${visible(out.slice(lead.length))}</span>` + visible(s.text.slice(body.length));
    } else html = visible(s.text);
    html += '<span class="caret"></span>';
  }
  f.innerHTML = `<span>${html}${visible(s.after)}</span>`;
  $('send').disabled = !engine.clean.trim();
}

const REPLIES = ['ok! what time?', 'sounds good to me', 'haha yes', 'are you bringing anyone?', 'see you there then', 'wait, which one?', "can't wait"];
let replyIndex = 0;

function addBubble(text, side) {
  const thread = $('thread');
  const b = document.createElement('div');
  b.className = `bubble ${side}`;
  b.textContent = text;
  thread.appendChild(b);
  while (thread.children.length > 9) thread.firstChild.remove();
}

function terminalLine(cls, text) {
  if (!text) return;
  const term = $('terminal');
  const l = document.createElement('div');
  l.className = 'ln ' + cls; l.innerHTML = visible(text);
  term.appendChild(l);
  while (term.children.length > 14) term.firstChild.remove();
}

function submit() {
  const text = engine.clean.trim();
  if (!text) return;
  if (state.app === 'terminal') {
    terminalLine('cmd', text);
    terminalLine('', fakeOutput(text));
    state.history.push(text); state.historyAt = state.history.length;
  } else {
    addBubble(text, 'out');
    if (!state.playing) setTimeout(() => addBubble(REPLIES[replyIndex++ % REPLIES.length], 'in'), 1100);
  }
  engine.reset('');
  state.coach = null; state.spelled = 0; state.word = '';
  renderRibbon();
}

function fakeOutput(cmd) {
  if (/^git status/.test(cmd)) return 'On branch engine\nnothing to commit, working tree clean';
  if (/^git commit/.test(cmd)) return '[engine 4c1d2e7] ' + (cmd.match(/"(.*)"/)?.[1] || 'update') + '\n 1 file changed, 3 insertions(+)';
  if (/^ls/.test(cmd)) return 'Package.swift  README.md  Sources  Tests  docs';
  if (/^git/.test(cmd)) return 'ok';
  return '';
}

$('send').addEventListener('click', submit);

/** Whose dictionaries the keyboard uses. The text stays; only how it is written from here on changes. */
function setDict(id) {
  if (!contexts[id]) return;
  state.dict = id;
  $('keys').dataset.context = id;
  engine.boundary();
  packsChanged();
  document.dispatchEvent(new CustomEvent('wf-context'));
}

/** Which app is on the phone. Each app keeps its own unfinished text. */
function setContext(app) {
  if (!contexts[app]) return;
  state.drafts[state.app] = { text: engine.state.text, after: engine.state.after };
  state.app = app;
  store.set('wf-steno-context', app);
  const terminal = app === 'terminal';
  $('ctxMessages').setAttribute('aria-pressed', !terminal);
  $('ctxTerminal').setAttribute('aria-pressed', terminal);
  $('thread').hidden = terminal; $('terminal').hidden = !terminal;
  $('who').textContent = terminal ? 'zsh' : 'Maya';
  $('whoSub').textContent = terminal ? '~/wurstfinger' : 'Messages';
  $('field').classList.toggle('mono', terminal);
  $('screen').dataset.context = app;
  setDict(app);
  restoreDraft(state.drafts[app]);
}

function restoreDraft(draft) {
  engine.reset(draft?.text || '');
  if (draft?.after) { engine.state.after = draft.after; engine.emit(); }
  state.coach = null; state.spelled = 0; state.word = '';
  renderRibbon();
}

/** Runs something that types (a demonstration, a lesson) and puts the user's own text back afterwards. */
async function sandbox(run) {
  const draft = { text: engine.state.text, after: engine.state.after };
  engine.reset('');
  try { return await run(); } finally { restoreDraft(draft); }
}

$('ctxMessages').addEventListener('click', () => setContext('messages'));
$('ctxTerminal').addEventListener('click', () => setContext('terminal'));

// ------------------------------------------------------------------- trail

const trailCanvas = $('trail');
const trails = [];
let trailRaf = 0;
const TRAIL_PAD = 40;
const keysLeft = () => $('keys').offsetLeft;
const keysTop = () => $('keys').offsetTop;

function sizeTrail() {
  const dpr = Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, scale()));
  const w = GEO.block + 2 * TRAIL_PAD, h = GEO.height + 2 * TRAIL_PAD;
  trailCanvas.width = Math.round(w * dpr); trailCanvas.height = Math.round(h * dpr);
  Object.assign(trailCanvas.style, { width: w + 'px', height: h + 'px', left: keysLeft() - TRAIL_PAD + 'px', top: keysTop() - TRAIL_PAD + 'px' });
  trailCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, TRAIL_PAD * dpr, TRAIL_PAD * dpr);
  overlay.style.setProperty('--kx', keysLeft() + 'px');
  overlay.style.setProperty('--ky', keysTop() + 'px');
}

function trailStart(t) {
  if (!settings.trail) return;
  trails.push({ t, released: 0 });
  if (!trailRaf) trailRaf = requestAnimationFrame(drawTrails);
}
function trailEnd(t) { const tr = trails.find(x => x.t === t); if (tr) tr.released = performance.now(); }

function drawTrails() {
  const ctx = trailCanvas.getContext('2d');
  ctx.clearRect(-TRAIL_PAD, -TRAIL_PAD, GEO.block + 2 * TRAIL_PAD, GEO.height + 2 * TRAIL_PAD);
  const now = performance.now();
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--label').trim() || '#fff';
  for (let i = trails.length - 1; i >= 0; i--) {
    const tr = trails[i];
    const fade = tr.released ? 1 - (now - tr.released) / 350 : 1;
    if (fade <= 0) { trails.splice(i, 1); continue; }
    const pts = tr.t.path.map(p => ({ x: tr.t.origin.x + p.x, y: tr.t.origin.y + p.y }));
    if (pts.length < 3) continue;
    // One path, stroked once, so the ink does not pile up where samples overlap.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.3 * fade;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length - 1; j++) ctx.quadraticCurveTo(pts[j].x, pts[j].y, (pts[j].x + pts[j + 1].x) / 2, (pts[j].y + pts[j + 1].y) / 2);
    ctx.lineTo(pts.at(-1).x, pts.at(-1).y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  trailRaf = trails.length ? requestAnimationFrame(drawTrails) : 0;
}

// ---------------------------------------------------------- synthetic finger

const finger = $('finger');
function ghost(phase, p) {
  if (phase === 'up') { finger.classList.remove('down'); return; }
  finger.style.left = keysLeft() + p.x + 'px';
  finger.style.top = keysTop() + p.y + 'px';
  if (phase === 'down') finger.classList.add('down');
}

/**
 * Plays stroke ids with the synthetic finger.
 * @param dry    show the strokes without typing anything
 * @param teach  slow down and pause where the guide has something to show
 */
async function playStrokes(ids, { speed = 0.6, gap = 220, dry = false, teach = false } = {}) {
  if (state.playing) return false;
  state.playing = true; state.cancel = false;
  document.body.classList.add('playing');
  const was = settings.guide;
  if (teach) settings.guide = 'always';
  try {
    for (const id of ids) {
      if (state.cancel) break;
      // The corner key is not a dictionary key, but the finger can still show it.
      const corner = /^UT(?:-(n|ne|e|se|s|sw|w|nw))?$/.exec(id);
      const s = corner ? { key: 'UT', dir: corner[1] || null } : parseStroke(id.replace(/-circle$/, ''));
      if (!s) continue;
      const rc = keyRect(s.key);
      const path = pathFor(corner ? (s.dir ? `O-${s.dir}` : 'O') : id, rc.w, rc.h, 0);
      const moving = !!s.dir || id.endsWith('-circle');
      await kb.play(s.key, path, { speed: moving ? speed : 1, hold: moving ? (teach ? 380 : 90) : 60, dry, pause: teach && s.turn ? 30 : 0 });
      await wait(moving ? gap : gap * 0.4);
    }
  } finally {
    settings.guide = was;
    state.playing = false;
    document.body.classList.remove('playing');
  }
  return !state.cancel;
}
const stopPlaying = () => { if (state.playing) state.cancel = true; };

/** Shows how a plan is written, without typing anything. */
function demonstrate(parts) {
  const ids = parts.map(p => p.stroke).filter(Boolean);
  if (kb.mode !== 'steno') kb.setMode('steno');
  return playStrokes(ids, { dry: true, speed: 0.4, teach: true, gap: 320 });
}

/** Types a sentence for real with the synthetic finger. */
async function typeSentence(text, opts = {}) {
  if (kb.mode !== 'steno') kb.setMode('steno');
  const script = scriptFor(text, planner, engine.entries, opts.level || 'all');
  if (!script) return false;
  return playStrokes(script.map(s => s.id), opts);
}

function startRecording() { return new Promise(resolve => { state.capture = id => { state.capture = null; resolve(id); }; }); }
const cancelRecording = () => { state.capture = null; };

// ------------------------------------------------------------------- layout

function scale() { return parseFloat(getComputedStyle($('phoneWrap')).getPropertyValue('--scale')) || 1; }
function fit() {
  const narrow = window.innerWidth <= 900;
  document.body.classList.toggle('narrow', narrow);
  // On a phone the demo's phone is the screen: no bezel, as wide as the window, but never taller than it.
  const s = narrow ? Math.min(window.innerWidth / 393, window.innerHeight / 640) : Math.min(1.1, (window.innerHeight - 40) / 876, (window.innerWidth * 0.5) / 417);
  $('phoneWrap').style.setProperty('--scale', Math.max(0.5, s).toFixed(4));
  sizeTrail();
}
window.addEventListener('resize', fit);

// --------------------------------------------------------------------- boot

engine.on(() => { renderField(); renderRibbon(); });
addBubble('are you coming to the thing tonight?', 'in');
saveSettings();
renderPager();
fit();
const api = {
  engine, kb, packs, contexts, theory, settings, state, saveSettings, packsChanged, typeSentence, demonstrate, playStrokes, stopPlaying,
  startRecording, cancelRecording, planStrokes, partsHtml, setContext, setDict, toast, sandbox, restoreDraft, isWordStroke, shipped,
  planner: () => planner,
  scriptFor: (text, level) => scriptFor(text, planner, engine.entries, level),
  get stacks() { return Object.fromEntries(Object.entries(contexts).map(([id, c]) => [id, c.stack])); },
};
mountPanel(api);
setContext(state.app);
document.fonts?.ready.then(() => { fit(); kb.fitHints(); });

// For the screenshot and review scripts.
window.wf = api;
