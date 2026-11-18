// Types real held-out messages through the whole chain: sentence -> strokes
// (script) -> translator (engine) -> text, and expects the text back exactly.
//
// What this proves: the planner, the script and the translator agree, for
// every stroke kind, on real sentences. What it does not prove: anything about
// fingers. Messages that need a character steno mode's page does not have
// (digits, most symbols) or casing the script does not attempt are counted
// and skipped, and the count is printed.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import theory from '../src/theory.generated.js';
import { Engine } from '../src/engine.js';
import { defaultPacks, DEFAULT_CONTEXTS } from '../src/packs.js';
import { makePlanner } from '../src/planner.js';
import { scriptFor } from '../src/script.js';

// The texting pack only acts on the complete stroke, which the script never
// sends for a word the corpus spells out, so it stays in the stack.
const engine = new Engine(defaultPacks(theory), DEFAULT_CONTEXTS.messages.stack, DEFAULT_CONTEXTS.messages.options);
const planner = makePlanner(engine.entries, theory);

const run = (text, level) => {
  const script = scriptFor(text, planner, engine.entries, level);
  if (!script) return null;
  engine.reset('');
  for (const s of script) engine.stroke(s.id);
  return { text: engine.clean, strokes: script.length, kinds: script.map(s => s.kind) };
};

test('lesson sentences come out exactly, at every level of knowledge', () => {
  for (const text of ['I think you are right about that.', 'What is it like in here?', "Thanks, that's good. See you tomorrow.",
    'He wants to keep working on it.', 'She is probably at the restaurant with everybody.', "I don't know, maybe we should ask Sarah first?",
    'Are you coming to the party tonight? I can pick you up.', "Sorry, I didn't think you were coming!",
    "I'm going to be a little late, no problem.", 'We stopped running and tried walking.', "They're well-known, it's fine: really."]) {
    for (const level of ['pieces', 'all']) {
      const r = run(text, level);
      assert.ok(r, `no script for: ${text}`);
      assert.equal(r.text, text, `${level}: ${text}`);
    }
  }
});

test('held-out messages round-trip exactly', { skip: !fs.existsSync(new URL('../data/build/heldout.json', import.meta.url)) }, () => {
  const heldout = JSON.parse(fs.readFileSync(new URL('../data/build/heldout.json', import.meta.url), 'utf8'));
  const report = {};
  const failures = [];
  const kinds = {};
  for (const corpus of ['daily', 'movie', 'sms']) {
    let tried = 0, exact = 0, skipped = 0;
    for (const raw of heldout[corpus].slice(0, 1500)) {
      let text = raw.replace(/\s+/g, ' ').replace(/ ([,.?!;:])/g, '$1').trim();
      // SMS casing is whatever the phone did; give every sentence the capital the translator would.
      if (corpus === 'sms') text = text.toLowerCase().replace(/(^|[.?!] )([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, 'I');
      // Skipped: characters the steno page does not carry, dashes used as punctuation,
      // apostrophes outside a word, a mark not followed by a space, and repeated marks.
      if (!/^[A-Z]/.test(text) || /[^A-Za-z ,.?!;:'-]/.test(text) || / -|- |-$|''|(^|[^A-Za-z])'|'([^A-Za-z]|$)|[,.?!;:][A-Za-z,.?!;:]|  /.test(text)) { skipped++; continue; }
      const r = run(text, 'all');
      if (!r) { skipped++; continue; }
      tried++;
      for (const k of r.kinds) kinds[k] = (kinds[k] || 0) + 1;
      if (r.text === text) exact++; else if (failures.length < 12) failures.push(`${corpus}: ${JSON.stringify(text)}\n   -> ${JSON.stringify(r.text)}`);
    }
    report[corpus] = `${exact}/${tried} exact, ${skipped} skipped`;
  }
  console.log('round trip:', JSON.stringify(report), 'strokes by kind:', JSON.stringify(kinds));
  assert.deepEqual(failures, []);
  for (const k of ['piece', 'curl', 'ending', 'completion', 'complete', 'mark', 'space', 'shift']) assert.ok(kinds[k] > 0, `no ${k} stroke was exercised`);
});
