// The side panel: lessons, lookup, dictionaries, the numbers, settings.
// In the app these are settings screens; here they sit beside the phone.

import results from '../eval.generated.js';
import { KEYS, DIRS, DIR_ARROW, strokeId } from '../layout.js';
import { labelOf, isStrokeOutline, validateEntry } from '../packs.js';
import { glyph, describe } from './glyph.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PLAY = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>';

const LESSONS = [
  { id: 'pieces', title: 'Write by pieces', blurb: 'A word is what starts it, its vowel and what ends it: left column, middle column, right column. “th” is one tap, “nk” is one flick.', text: 'I think that is right.' },
  { id: 'chords', title: 'Two thumbs, one chord', blurb: 'Put both thumbs down together. Pieces are read left to right whichever thumb moved first, so “the” is one chord: th and e.', text: 'What is the weather like there?' },
  { id: 'curls', title: 'Curl for a whole word', blurb: 'Flick to a piece, then turn a corner: a word that starts with that piece, or ends with it. “nd” curled is and, find, mind.', text: 'I would like to know what you think.' },
  { id: 'endings', title: 'End a word on the space bar', blurb: 'The left half of the space bar finishes a word: -ed, -s, -ing above, n’t and ’s below. The right half is punctuation.', text: 'He wants to keep working on it.' },
  { id: 'offer', title: 'Take the offer', blurb: 'When the pieces so far can only be one word, the rest shows in grey. Pull the left of the space bar down to take it.', text: 'We stopped at the restaurant together.' },
  { id: 'shell', title: 'A terminal, with its own dictionaries', context: 'terminal', blurb: 'No English here: the keys are the letter page, every character is exact. g, c and a pull on the space bar is a commit with the caret inside the quotes.', strokes: ['O-sw', 'O-w', 'SP-s', 'S-nw', 'I', 'I-sw', 'SP', 'T', 'T-ne', 'O-ne', 'O'], expect: 'git commit -m "fix typo"' },
];

export function mountPanel(api) {
  const { engine, kb, packs, contexts, theory, settings, state } = api;
  const $ = id => document.getElementById(id);

  // ------------------------------------------------------------------ tabs
  const TABS = ['learn', 'lookup', 'packs', 'numbers', 'settings'];
  function openTab(name) {
    for (const t of $('tabs').children) t.setAttribute('aria-selected', t.dataset.tab === name);
    for (const n of TABS) $('pane-' + n).hidden = n !== name;
    if (name === 'packs') renderPacks();
    if (name === 'lookup') { lookup(); renderKeyMap(); }
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) openTab(b.dataset.tab); });
  // On a phone the panel is a sheet over the keyboard.
  $('sheetOpen').addEventListener('click', () => document.body.classList.add('sheet'));
  $('sheetClose').addEventListener('click', () => document.body.classList.remove('sheet'));

  // --------------------------------------------------------------- lessons
  let active = null;
  let draft = null;                     // what was in the field before a lesson took it over

  const lessonStrokes = l => l.strokes ? l.strokes.map(id => ({ id })) : (api.scriptFor(l.text, 'all') || []);

  /** The lesson's words, each with the strokes that write it. */
  function lessonWords(l) {
    if (l.strokes) return [{ text: l.expect, parts: l.strokes.map(id => ({ stroke: id })) }];
    const script = api.scriptFor(l.text, 'all') || [];
    const tokens = l.text.match(/[A-Za-z]+(?:'[A-Za-z]+)*|[^\sA-Za-z]/g) || [];
    const out = [];
    let i = 0;
    for (const tok of tokens) {
      const parts = [];
      if (!/^[A-Za-z]/.test(tok)) {
        if (script[i]?.kind === 'mark') { parts.push({ stroke: script[i].id }); i++; }
        out.push({ text: tok, punct: true, parts });
        continue;
      }
      while (script[i] && (script[i].kind === 'space' || script[i].kind === 'shift')) { if (script[i].kind === 'space') parts.push({ stroke: script[i].id }); i++; }
      while (script[i] && script[i].word === tok) parts.push({ stroke: script[i++].id });
      out.push({ text: tok, parts });
    }
    return out;
  }

  const wordsHtml = (l, size) => lessonWords(l).map((w, i) => `<span class="w${w.punct ? ' punct' : ''}" data-i="${i}"><span class="t">${esc(w.text)}</span><span class="strokes">${api.partsHtml(w.parts, size)}</span></span>`).join('');

  function renderLearn() {
    const th = Object.entries(theory.chunks).find(([, c]) => c === 'th')[0];
    const e = Object.entries(theory.chunks).find(([, c]) => c === 'e')[0];
    const nd = Object.entries(theory.chunks).find(([, c]) => c === 'nd')[0];
    const rules = [
      { demo: [th, e], glyphs: [th], title: 'Three columns, in the order you say a syllable', text: 'Left is <b>what starts it</b>, middle is <b>its vowel</b>, right is <b>what ends it</b>. Every key has nine pieces: tap for the big one, flick toward a small one. A word is its pieces: th·i·nk, w·ea·th·er.' },
      { demo: [`${nd}-cw`], glyphs: [`${nd}-cw`], title: 'A curl is a whole word', text: 'Flick to a piece and turn a corner without lifting: a common word that <b>starts with that piece</b> (left and middle columns) or <b>ends with it</b> (right column). These are shortcuts. Any word can always be written by its pieces.' },
      { demo: ['SP-ne'], glyphs: ['SP-ne'], title: 'The space bar ends a word', text: 'Tap it for a space. Flick its <b>left half</b> for an ending (-ed, -s, -ing, n’t, ’s, with the spelling English uses) and its <b>right half</b> for a mark. Pull the left half down to take a word that is offered in grey.' },
      { demo: ['UT'], glyphs: ['UT'], corner: true, title: 'One key undoes, sends and fixes', text: 'The corner key: <b>tap to take back a whole stroke</b>, flick right to turn a misread curl into its neighbour, flick up to send, hold and drag left to delete letter by letter.' },
    ];
    $('pane-learn').innerHTML = `
      <h2>How it works</h2>` + rules.map((r, i) => `
      <div class="card rule">
        <button class="demo" data-rule="${i}" title="Show me on the keyboard">${r.corner ? '<span class="corner-demo">⌫</span>' : glyph(r.glyphs[0], 46)}</button>
        <div><h3>${r.title}</h3><p>${r.text}</p></div>
      </div>`).join('') + `
      <h2>Try it</h2>
      <p>Watch a sentence being written, then write it yourself. Drag with a mouse, or use both thumbs on a phone.</p>` + LESSONS.map((l, i) => `
      <div class="card lesson" data-lesson="${l.id}">
        <h3><span class="num">${i + 1}</span>${esc(l.title)}</h3>
        <p>${esc(l.blurb)}</p>
        <div class="target">${wordsHtml(l, 36)}</div>
        <div class="row"><button class="btn" data-watch="${l.id}">${PLAY} Watch</button><button class="btn quiet" data-try="${l.id}">Try it yourself</button><span class="meta" data-meta="${l.id}"></span></div>
      </div>`).join('') + `
      <p class="note">Every word and stroke here was assigned by a program from ${(Object.values(theory.meta.corpora).reduce((s, c) => s + c.trainingTokens, 0) / 1e6).toFixed(1)} million words of conversation and real text messages. “Numbers” has the method and what it buys.</p>`;
    for (const l of LESSONS) {
      const n = lessonStrokes(l).length, letters = (l.expect || l.text).length;
      $('pane-learn').querySelector(`[data-meta="${l.id}"]`).textContent = `${n} strokes, ${letters} letter by letter`;
    }
    $('pane-learn').dataset.demos = JSON.stringify(rules.map(r => r.demo));
  }

  $('pane-learn').addEventListener('click', async e => {
    const rule = e.target.closest('[data-rule]');
    if (rule) {
      const demo = JSON.parse($('pane-learn').dataset.demos)[+rule.dataset.rule];
      if (state.app !== 'messages') api.setContext('messages');
      document.body.classList.remove('sheet');
      endLesson();
      // A demonstration types in a sandbox: whatever was in the field comes back afterwards.
      await api.sandbox(() => api.playStrokes(demo, { teach: true, speed: 0.45, gap: 380 }));
      return;
    }
    const watch = e.target.closest('[data-watch]'), tryIt = e.target.closest('[data-try]');
    const id = watch?.dataset.watch || tryIt?.dataset.try;
    if (!id) return;
    startLesson(LESSONS.find(x => x.id === id), !!watch);
  });

  async function startLesson(l, watch) {
    api.stopPlaying();
    if (state.app !== (l.context || 'messages')) api.setContext(l.context || 'messages');
    if (kb.mode !== 'steno') kb.setMode('steno');
    document.body.classList.remove('sheet');
    if (!active) draft = { text: engine.state.text, after: engine.state.after };
    engine.reset('');
    active = { lesson: l, startSeq: engine.seq, watching: watch };
    renderLessonCard();
    progress();
    if (watch) {
      await api.playStrokes(lessonStrokes(l).map(s => s.id), { teach: true, speed: 0.5, gap: 260 });
      if (active?.lesson === l) { active.watching = false; progress(); }
    }
  }
  function endLesson() { if (active && draft) { api.restoreDraft(draft); draft = null; } active = null; $('lessonCard').hidden = true; for (const w of document.querySelectorAll('.lesson .w')) w.classList.remove('done', 'next', 'off'); }

  /** The lesson rides along in the phone, so it is in view while you type. */
  function renderLessonCard() {
    const card = $('lessonCard');
    if (!active) { card.hidden = true; return; }
    const l = active.lesson;
    card.hidden = false;
    card.innerHTML = `<div class="head"><span>${esc(l.title)}</span><button id="lessonAgain" class="mini">${PLAY} Watch</button><button id="lessonClose" class="mini" aria-label="Close">×</button></div>
      <div class="target" data-lesson="${l.id}">${wordsHtml(l, 34)}</div><div class="lesson-status" id="lessonStatus"></div>`;
    $('lessonClose').addEventListener('click', endLesson);
    $('lessonAgain').addEventListener('click', () => startLesson(l, true));
  }

  /** Marks the words of the active lesson as they appear in the field, and says so when a stroke went astray. */
  function progress() {
    if (!active) return;
    const l = active.lesson;
    const words = lessonWords(l);
    const typed = engine.clean.toLowerCase();
    const target = (l.expect || l.text).toLowerCase();
    let done = 0, upTo = 0;
    if (l.strokes) done = typed === target ? 1 : 0;
    else for (const [i, w] of words.entries()) {
      const at = target.indexOf(w.text.toLowerCase(), upTo), end = at + w.text.length;
      if (typed.length >= end && typed.slice(0, end) === target.slice(0, end)) { done = i + 1; upTo = end; } else break;
    }
    const astray = !target.startsWith(typed.replace(/\s+$/, '')) && !target.startsWith(typed);
    for (const scope of document.querySelectorAll(`[data-lesson="${l.id}"]`)) {
      scope.querySelectorAll('.w').forEach((w, i) => {
        w.classList.toggle('done', i < done);
        w.classList.toggle('next', i === done && !astray);
        w.classList.toggle('off', i === done && astray);
      });
    }
    const status = $('lessonStatus');
    if (!status) return;
    const used = engine.seq - active.startSeq;
    if (done === words.length) status.innerHTML = `<b>Done</b> in ${used} strokes. Letter by letter it is ${(l.expect || l.text).length}.`;
    else if (astray && !active.watching) status.innerHTML = 'That was a different stroke. <b>Tap the corner key</b> to take it back.';
    else status.textContent = active.watching ? 'Watch the finger; the strokes are under each word.' : 'Your turn. The strokes are under each word.';
  }
  engine.on(progress);

  // ---------------------------------------------------------------- lookup
  function renderLookup() {
    $('pane-lookup').innerHTML = `
      <h2>How do I write…</h2>
      <div class="lookup"><input id="lookupWord" type="text" placeholder="a word, a phrase or a command" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="plan" id="lookupPlan"></div>
      <h2>What is on each key</h2>
      <p id="keymapNote"></p>
      <div class="keymap" id="keymap"></div>`;
    $('lookupWord').addEventListener('input', lookup);
  }

  function lookup() {
    const input = $('lookupWord'); if (!input) return;
    const raw = input.value.trim();
    const out = $('lookupPlan');
    const planner = api.planner();
    const where = state.dict === 'terminal' ? 'the terminal' : 'messages';
    if (!raw) { out.innerHTML = `<span class="how">Type something to see how it is written with the dictionaries ${where} uses. A word has exactly one way.</span>`; return; }
    const show = (parts, how) => {
      out.innerHTML = `<div class="strokes">${api.partsHtml(parts, 38)}</div><span class="how">${how}</span><button class="btn quiet" id="lookupShow">${PLAY} Show me</button>`;
      $('lookupShow').addEventListener('click', () => { document.body.classList.remove('sheet'); api.demonstrate(parts); });
    };
    // Anything an entry types as a whole: a phrase, an abbreviation's expansion, a command.
    const outlines = planner.producing(raw).filter(o => !o.includes('/'));
    const word = raw.toLowerCase();
    const plan = /^[a-z]+$/.test(word) ? planner.plan(word) : null;
    const s = plan && api.planStrokes(plan);
    if (s) {
      const how = plan.kind === 'curl' ? `One stroke: ${describe(plan.strokes[0])}.`
        : plan.kind === 'pieces' ? `By its pieces: <b>${esc(plan.parts.join(' · '))}</b>, ${plan.gestures} strokes, or ${planner.chords(plan.strokes)} with two thumbs. Letter by letter it is ${word.length}.`
        : plan.kind === 'completion' ? `<b>${esc(plan.parts.join(' · '))}</b>, then pull the left of the space bar down: ${s.gestures} strokes instead of ${word.length + 1}.`
        : `${esc(plan.base.word)}, then ${describe(plan.strokes.at(-1))}: ${s.gestures} strokes instead of ${word.length + 1}.`;
      show(s.parts, how);
      return;
    }
    if (outlines.length) {
      const o = outlines.sort((a, b) => a.length - b.length)[0];
      const stroke = isStrokeOutline(o);
      const parts = stroke ? [{ stroke: o }] : [{ letters: o }, ...(planner.completeStroke ? [{ stroke: planner.completeStroke }] : [])];
      show(parts, stroke ? `One stroke: ${describe(o)}.` : `Spell <b>${esc(o)}</b>, then pull the space bar down.`);
      return;
    }
    if (plan) { out.innerHTML = `<div class="strokes"><span class="spell">${esc(word)}</span></div><span class="how">In ${where}: spelled letter by letter, ${word.length} strokes. To give it a stroke of its own, add one under Dictionaries.</span>`; return; }
    out.innerHTML = `<span class="how">Nothing in the dictionaries ${where} uses types exactly that. Spell it, or add an entry under Dictionaries.</span>`;
  }

  function renderKeyMap() {
    const map = $('keymap'); if (!map) return;
    $('keymapNote').textContent = state.dict === 'terminal'
      ? 'In the terminal each flick is the symbol it always was; these are the forms on its curls.'
      : 'Each piece a key flicks to, then the words on its curls: right, left, back.';
    map.innerHTML = KEYS.map(key => {
      let html = `<div class="k"><b>${key.toLowerCase()}</b>`;
      for (const dir of DIRS) {
        const base = engine.lookup(strokeId(key, dir));
        if (base === undefined) continue;
        const curls = ['cw', 'ccw', 'back'].map(t => labelOf(engine.lookup(strokeId(key, dir, t)))).filter(l => l && !/^[A-Z]$/.test(l));
        if (!curls.length && /^\{&/.test(base)) continue;
        html += `<div><span>${DIR_ARROW[dir]} ${esc(labelOf(base))}</span>${curls.length ? `<span class="curls">${esc(curls.join(' · '))}</span>` : ''}</div>`;
      }
      return html + '</div>';
    }).join('');
  }

  // ----------------------------------------------------------- dictionaries
  let openPack = null;
  let filter = '';
  let pendingOverride = null;

  const stack = () => contexts[state.dict].stack;
  const defaultOpen = () => state.dict === 'terminal' ? 'commands' : 'mine';

  function renderPacks() {
    if (!openPack || !packs.some(p => p.id === openPack)) openPack = defaultOpen();
    const pane = $('pane-packs');
    const pack = packs.find(p => p.id === openPack);
    const on = id => stack().includes(id);
    const entries = Object.entries(pack.entries).filter(([o, t]) => !filter || o.toLowerCase().includes(filter) || t.toLowerCase().includes(filter));
    const shadowed = on(pack.id) ? engine.shadowed.filter(s => s.pack === pack.id) : [];
    const ctxName = state.dict === 'terminal' ? 'the terminal' : 'messages';
    pane.innerHTML = `
      <h2>Dictionaries for ${ctxName}</h2>
      <p>Everything the keyboard types comes from these, letters included. They are stacked, and <b>the first one that knows a stroke wins</b>. Each context has its own stack: switch the app at the top of the phone to see the other.</p>
      ${packs.map(p => `
        <div class="card pack${p.id === openPack ? ' open' : ''}${on(p.id) ? '' : ' off'}" data-pack="${p.id}">
          <button class="switch" role="switch" aria-checked="${on(p.id)}" data-toggle="${p.id}" ${p.locked ? 'disabled' : ''} aria-label="Use ${esc(p.name)} in ${ctxName}"></button>
          <div><div class="name">${esc(p.name)}</div><div class="desc">${esc(p.description)}</div></div>
          <div class="count">${Object.keys(p.entries).length}</div>
        </div>`).join('')}
      <h2>${esc(pack.name)}${on(pack.id) ? '' : ' <span class="tag">not used in ' + ctxName + '</span>'}</h2>
      <div class="lookup"><input id="packFilter" type="text" placeholder="Filter ${Object.keys(pack.entries).length} entries" value="${esc(filter)}" autocomplete="off" spellcheck="false"></div>
      <div class="entries">${entries.slice(0, 150).map(([o, t]) => `
        <div class="e"><span>${isStrokeOutline(o) && !o.includes('/') ? glyph(o, 28) : ''}</span><code>${esc(o)}</code><span class="t">${esc(t)}</span>${pack.editable ? `<button class="x" data-del="${esc(o)}" aria-label="Remove ${esc(o)}">×</button>` : '<span></span>'}</div>`).join('') || '<div class="e empty">Nothing here yet.</div>'}
      </div>
      ${entries.length > 150 ? `<div class="note">Showing 150 of ${entries.length}. Filter to narrow it.</div>` : ''}
      ${pack.editable ? `
        <div class="entry">
          <div class="outline"><input id="newOutline" type="text" placeholder="stroke or letters" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="rec" id="recBtn">Record</button></div>
          <input id="newText" type="text" placeholder="what it types" autocomplete="off" spellcheck="false">
          <button class="btn" id="addBtn">Add</button>
        </div>
        <div class="note" id="entryNote">Press <b>Record</b> and make a stroke on the keyboard, or type letters such as <code>omw</code> (spelled, then pulled down on the space bar). Then say what it types.</div>`
    : `<div class="note">This dictionary is generated and read-only. To change one of its strokes, add the same stroke to a dictionary above it: the higher one wins.</div>`}
      ${shadowed.length ? `<div class="note warn">${shadowed.length} ${shadowed.length === 1 ? 'entry here is' : 'entries here are'} overridden by a dictionary above: ${shadowed.slice(0, 8).map(s => `<code>${esc(s.outline)}</code>`).join(' ')}</div>` : ''}
      <h2>As text</h2>
      <p>A dictionary is plain JSON in the shape Plover uses, <code>"outline": "translation"</code>. Operators: <code>{^ing}</code> <code>{un^}</code> <code>{^}</code> attach; <code>{&amp;x}</code> a glued character; <code>{.}</code> <code>{,}</code> prose marks; <code>{-|}</code> capital next; <code>{|}</code> where the caret lands; <code>{#Tab}</code> <code>{#Escape}</code> <code>{#Up}</code> <code>{#Control(c)}</code> keys; <code>\\{</code> a literal brace.</p>
      <textarea id="packJson" rows="7" spellcheck="false" ${pack.editable ? '' : 'readonly'}>${esc(JSON.stringify(pack.editable ? pack.entries : Object.fromEntries(Object.entries(pack.entries).slice(0, 40)), null, 1))}</textarea>
      ${pack.editable ? '<div class="row" style="margin-top:6px"><button class="btn quiet" id="mergeJson">Add these</button><button class="btn quiet" id="replaceJson">Replace all with these</button><button class="btn quiet" id="copyJson">Copy</button><span class="note" id="jsonNote" style="margin:0"></span></div>' : '<div class="note">The first 40 entries are shown.</div>'}`;
    $('packFilter').addEventListener('input', e => { filter = e.target.value.toLowerCase(); const pos = e.target.selectionStart; renderPacks(); const f = $('packFilter'); f.focus(); f.setSelectionRange(pos, pos); });
    $('addBtn')?.addEventListener('click', addEntry);
    $('newText')?.addEventListener('keydown', e => { if (e.key === 'Enter') addEntry(); });
    $('newOutline')?.addEventListener('input', () => { pendingOverride = null; describeOutline(); });
    $('recBtn')?.addEventListener('click', record);
    $('mergeJson')?.addEventListener('click', () => applyJson(false));
    $('replaceJson')?.addEventListener('click', () => applyJson(true));
    $('copyJson')?.addEventListener('click', () => { navigator.clipboard?.writeText($('packJson').value); $('jsonNote').textContent = 'Copied.'; });
  }

  const note = (html, warn) => { const n = $('entryNote'); if (n) { n.innerHTML = html; n.classList.toggle('warn', !!warn); } };

  /** Says what the outline in the box is, and what adding it would replace. */
  function describeOutline() {
    const outline = $('newOutline').value.trim();
    if (!outline) return;
    const error = validateEntry(outline, 'x');
    if (error) { note(esc(error), true); return false; }
    const was = engine.lookup(outline);
    const what = isStrokeOutline(outline) ? outline.split('/').map(describe).join(', then ') : `spell ${outline}, then pull the space bar down`;
    if (was !== undefined) note(`<b>${esc(what)}</b> now types <b>${esc(labelOf(was) || was)}</b> (from ${esc(packs.find(p => p.id === engine.source[outline])?.name || 'another dictionary')}). Adding it here replaces that.`, true);
    else note(`<b>${esc(what[0].toUpperCase() + what.slice(1))}</b> is free.`);
    return true;
  }

  async function record() {
    const btn = $('recBtn');
    if (btn.classList.contains('on')) { api.cancelRecording(); btn.classList.remove('on'); btn.textContent = 'Record'; return; }
    btn.classList.add('on'); btn.textContent = 'Make the stroke';
    if (kb.mode !== 'steno') kb.setMode('steno');
    document.body.classList.remove('sheet');
    const id = await api.startRecording();
    document.body.classList.add('sheet');
    const input = $('newOutline');
    if (!input) return;
    // A second recorded stroke extends the outline.
    input.value = input.value.trim() && isStrokeOutline(input.value.trim()) && btn.dataset.extend ? `${input.value.trim()}/${id}` : id;
    $('recBtn').classList.remove('on'); $('recBtn').textContent = 'Record';
    pendingOverride = null;
    describeOutline();
    $('newText').focus();
  }

  function addEntry() {
    const outline = $('newOutline').value.trim(), text = $('newText').value;
    const error = validateEntry(outline, text);
    if (error) { note(esc(error), true); return; }
    const pack = packs.find(p => p.id === openPack);
    const was = engine.lookup(outline);
    // Replacing something that already works takes a second press.
    if (was !== undefined && was !== text && pendingOverride !== outline) {
      pendingOverride = outline;
      note(`This replaces <b>${esc(labelOf(was) || was)}</b> on that stroke. Press Add again to go ahead.`, true);
      return;
    }
    pendingOverride = null;
    pack.entries[outline] = text;
    api.packsChanged();
    renderPacks();
    note(stack().includes(pack.id)
      ? `Added. ${isStrokeOutline(outline) ? 'Try the stroke.' : `Spell ${esc(outline)} and pull the space bar down.`}`
      : 'Added, but this dictionary is switched off here, so it does nothing until you switch it on.', !stack().includes(pack.id));
  }

  function applyJson(replace) {
    const pack = packs.find(p => p.id === openPack);
    const say = (text, warn) => { const n = $('jsonNote'); n.textContent = text; n.classList.toggle('warn', !!warn); };
    let parsed;
    try { parsed = JSON.parse($('packJson').value); } catch (err) { say(`Not applied: that is not JSON (${err.message}).`, true); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { say('Not applied: expected an object of "outline": "translation".', true); return; }
    for (const [o, t] of Object.entries(parsed)) {
      const error = validateEntry(o, t);
      if (error) { say(`Not applied: "${o}": ${error}`, true); return; }
    }
    pack.entries = replace ? parsed : { ...pack.entries, ...parsed };
    api.packsChanged();
    renderPacks();
    $('jsonNote').textContent = `${replace ? 'Replaced with' : 'Added'} ${Object.keys(parsed).length} entries.`;
  }

  function toggle(id) {
    const s = stack();
    if (s.includes(id)) s.splice(s.indexOf(id), 1);
    else {
      // Keep the stack in the dictionaries' own order, which is their priority.
      s.push(id);
      s.sort((a, b) => packs.findIndex(p => p.id === a) - packs.findIndex(p => p.id === b));
    }
  }

  $('pane-packs').addEventListener('click', e => {
    const t = e.target.closest('[data-toggle]');
    if (t) { if (!t.disabled) { toggle(t.dataset.toggle); api.packsChanged(); renderPacks(); } return; }
    const del = e.target.closest('[data-del]');
    if (del) { delete packs.find(p => p.id === openPack).entries[del.dataset.del]; api.packsChanged(); renderPacks(); return; }
    const card = e.target.closest('[data-pack]');
    if (card && card.dataset.pack !== openPack) { openPack = card.dataset.pack; filter = ''; renderPacks(); }
  });
  document.addEventListener('wf-context', () => {
    openPack = defaultOpen();
    if (!$('pane-packs').hidden) renderPacks();
    if (!$('pane-lookup').hidden) { lookup(); renderKeyMap(); }
    if (active && (active.lesson.context || 'messages') !== state.app) endLesson();
  });

  // --------------------------------------------------------------- numbers
  function renderNumbers(corpus = 'daily') {
    const r = results.evaluation[corpus];
    const names = { daily: 'Everyday dialogue', movie: 'Film dialogue', sms: 'Real SMS' };
    const max = r.letterStrokesPerWord;
    const tokens = Object.values(theory.meta.corpora).reduce((s, c) => s + c.trainingTokens, 0);
    const pct = x => (x * 100).toFixed(1);
    const rows = [...results.robustness.grid];
    $('pane-numbers').innerHTML = `
      <h2>What it buys, on text it never saw</h2>
      <p>A tenth of each corpus was set aside before any stroke was assigned. A model typist then typed it: <b>${r.messages.toLocaleString()} messages, ${r.chars.toLocaleString()} characters</b>. Each row adds what a learner would pick up next. The letter keyboard takes <b>${r.letterStrokesPerWord} strokes a word</b>.</p>
      <div class="seg" id="corpusSeg">${Object.keys(results.evaluation).map(c => `<button data-corpus="${c}" aria-pressed="${c === corpus}">${names[c]}</button>`).join('')}</div>
      <div class="bars">${r.stages.map(s => `<div class="bar"><span class="lbl">${esc(s.stage)}</span><div class="track"><div class="fill" style="width:${(s.strokesPerWord / max * 100).toFixed(1)}%"></div></div><span class="val">${s.strokesPerWord.toFixed(2)}</span></div>`).join('')}</div>
      <table class="t"><tr><th>You use</th><th>Strokes a word</th><th>Chords a word</th><th>WPM, bare model</th><th>careful thumb</th><th>hurried thumb</th></tr>
        <tr><td>the letter keyboard</td><td>${r.letterStrokesPerWord}</td><td></td><td>${r.letterWpm.bare}</td><td>${r.letterWpm.careful}</td><td>${r.letterWpm.hurried}</td></tr>
        ${r.stages.map(s => `<tr><td>${esc(s.stage)}</td><td>${s.strokesPerWord.toFixed(2)}</td><td>${s.chordsPerWord.toFixed(2)}</td><td>${s.wpm.bare}</td><td>${s.wpm.careful}</td><td>${s.wpm.hurried}</td></tr>`).join('')}
      </table>
      <p class="note"><b>Stroke counts are exact; speeds are a model, not a measurement of people.</b> The bare model has no mistakes and no recall time. The careful thumb makes 6 mm strokes and aims within 6°; the hurried one makes 4.5 mm strokes and aims within 9°. Both pay to notice and redo every mistake, at the rates in the table below, and to recall each stroke that is not a letter. Writing by pieces pays under every assumption. The curls pay only for the careful thumb.</p>
      <h2>Where the words come from</h2>
      <p>${tokens.toLocaleString()} words from three corpora: film dialogue, written everyday dialogue and real text messages. A word’s weight is the geometric mean of its frequency in all three, so it has to be common everywhere. Written by its pieces a word takes ${theory.meta.piecesPerWord} strokes on average where its letters take ${theory.meta.lettersPerWord}; the ${theory.meta.counts.curls} curled words are ${theory.meta.share.curls} % of all word tokens.</p>
      <h2>How often a stroke types the wrong thing</h2>
      <p>A population of synthetic thumbs wrote with the real dictionary on keys of the real size (${results.robustness.key.mm.map(x => x.toFixed(1)).join(' × ')} mm), each with its own bias, stroke length, bowed path, cut corner and, a third of the time, a tail as it lifts. Strokes are weighted by how often they are used. This is a model of error, not a measurement of people. “Strokes” is one thumb; “chords” is two thumbs pressing neighbouring pieces together.</p>
      <table class="t"><tr><th>Stroke length, aim</th><th>Piece flick right</th><th>another piece</th><th>Curl right</th><th>its own piece</th><th>something else</th></tr>
        ${rows.map(g => `<tr><td>${g.leg} mm, ${g.aim}°</td><td>${pct(g.kinds['piece flick'].right)} %</td><td>${pct(g.kinds['piece flick']['another piece'])} %</td><td>${pct(g.kinds.curl.right)} %</td><td>${pct(g.kinds.curl['own flick'])} %</td><td>${pct(g.kinds.curl['another piece'] + g.kinds.curl['another word'])} %</td></tr>`).join('')}
      </table>
      <p class="note">A curl that falls short types the word that was flicked, which the corner key’s “change” puts right in one move. Curls want legs of about 6 mm; shorter ones are unreliable in this model, and that is the first thing a study with real thumbs should measure.</p>`;
    $('corpusSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) renderNumbers(b.dataset.corpus); });
  }

  // -------------------------------------------------------------- settings
  function renderSettings() {
    const seg = (id, options, value) => `<div class="seg" data-setting="${id}">${options.map(([v, label]) => `<button data-value="${v}" aria-pressed="${String(v) === String(value)}">${label}</button>`).join('')}</div>`;
    $('pane-settings').innerHTML = `
      <h2>Settings</h2>
      <div class="card">
        <div class="setting"><div><div class="what">Guide</div><div class="why">The map beside your finger. “On pause” shows it only when you rest on a key or hesitate on the way, so it is there when you need it and never in the way when you do not.</div></div>${seg('guide', [['pause', 'On pause'], ['always', 'Always'], ['off', 'Off']], settings.guide)}</div>
        <div class="setting"><div><div class="what">Words on the keys</div><div class="why">Hide them once you know them. The guide still shows them.</div></div>${seg('words', [[true, 'Shown'], [false, 'Hidden']], settings.words)}</div>
        <div class="setting"><div><div class="what">Finger trail</div><div class="why">Draws the path of each stroke.</div></div>${seg('trail', [[true, 'On'], [false, 'Off']], settings.trail)}</div>
        <div class="setting"><div><div class="what">Appearance</div></div>${seg('theme', [['dark', 'Dark'], ['light', 'Light']], settings.theme)}</div>
        <div class="setting"><div><div class="what">Start over</div><div class="why">Forget your dictionaries, stacks and settings.</div></div><button class="btn quiet" id="resetAll">Reset</button></div>
      </div>
      <h2>Getting around</h2>
      <div class="card">
        <p><b>Three keyboards, side by side.</b> Steno is in the middle. Drag the strip above the keys sideways, swipe the keys with two fingers, or flick the corner key down for numbers and down-left for plain letters. Down-right switches between your word and shell dictionaries without leaving the app. The letter page is the keyboard as it always was, with every symbol.</p>
        <p><b>The space bar</b> is two keys wide on every page. Drag it sideways to move the caret.</p>
        <p><b>The corner key</b> holds what the right-hand column used to hold. Rest on it to see its map.</p>
      </div>`;
    $('pane-settings').querySelectorAll('[data-setting]').forEach(s => s.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.value;
      settings[s.dataset.setting] = v === 'true' ? true : v === 'false' ? false : v;
      api.saveSettings(); renderSettings();
    }));
    $('resetAll').addEventListener('click', () => { for (const k of ['wf-steno-settings', 'wf-steno-edits', 'wf-steno-own', 'wf-steno-stacks', 'wf-steno-context']) localStorage.removeItem(k); location.reload(); });
  }

  document.addEventListener('wf-packs', () => { renderLearn(); if (active) { renderLessonCard(); progress(); } });
  renderLearn(); renderLookup(); renderNumbers(); renderSettings();
  api.openTab = openTab;
  api.startLesson = id => startLesson(LESSONS.find(l => l.id === id), false);
}
