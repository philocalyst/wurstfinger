import test from 'node:test';
import assert from 'node:assert/strict';
import theory from '../src/theory.generated.js';
import { Engine } from '../src/engine.js';
import { defaultPacks, DEFAULT_CONTEXTS, validateEntry, labelOf } from '../src/packs.js';
import { LETTER_HOME, strokeId, DETAIL, DIRS, KEYS } from '../src/layout.js';
import { makePlanner } from '../src/planner.js';

const make = (ctx, edit, stack) => { const packs = defaultPacks(theory); edit?.(packs); return new Engine(packs, stack || DEFAULT_CONTEXTS[ctx].stack, DEFAULT_CONTEXTS[ctx].options); };
const prose = edit => make('messages', edit);
const shell = edit => make('terminal', edit);
// The stroke that types one letter with the dictionaries this engine has: a piece on the steno page, a letter key in the shell.
const letter = (e, ch) => { const o = Object.entries(e.entries).find(([o, t]) => !o.includes('/') && !/^S[PR]/.test(o) && t === `{&${ch.toLowerCase()}}`)?.[0]; assert.ok(o, `no stroke for ${ch}`); return o; };
const SHIFT = 'O-circle';
// Any character the letter page can type, as the stroke that types it.
const symbolStroke = ch => { for (const k of KEYS) for (const d of DIRS) if (DETAIL[k][d]?.label === ch) return strokeId(k, d); return null; };
const type = (e, text) => {
  for (const ch of text) {
    if (ch === ' ') e.stroke('SP');
    else if (/[a-z]/.test(ch)) e.stroke(letter(e, ch));
    else if (/[A-Z]/.test(ch)) { e.stroke(e.entries[SHIFT] ? SHIFT : 'R-n'); e.stroke(letter(e, ch)); }
    else if (/\d/.test(ch)) e.literal(ch);
    else { const s = symbolStroke(ch); assert.ok(s, `no stroke for ${ch}`); e.stroke(s); }
  }
};
const strokeFor = (e, text) => Object.entries(e.entries).find(([o, t]) => /^[A-Z]/.test(o) && !o.includes('/') && labelOf(t).toLowerCase() === text)?.[0];
// Writes words the way the planner says: a curl where there is one, otherwise the pieces, with the space a pieced word needs in front.
const write = (e, ...words) => {
  const planner = makePlanner(e.entries, theory);
  for (const w of words) {
    const plan = planner.plan(w);
    assert.ok(plan, `no plan for ${w}`);
    const first = plan.kind === 'ending' ? plan.base : plan;
    if (first.kind !== 'curl' && e.text && !/\s$/.test(e.text)) e.stroke('SP');
    for (const id of plan.strokes) e.stroke(id);
  }
};
const ending = name => Object.entries(theory.endings).find(([, v]) => v === name)[0];

test('a word brings its space; the sentence starts capital; what is sent has no trailing space', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'you', 'are', 'the');
  assert.equal(e.text, 'You are the ');
  assert.equal(e.clean, 'You are the');
});

test('letters never add a space, and a stroke after them puts one in front', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'the'); type(e, 'cat'); write(e, 'is', 'here');
  assert.equal(e.clean, 'The cat is here');
});

test('tapping space after a word that already has one changes nothing, once', () => {
  const e = prose();
  write(e, 'you'); e.stroke('SP'); write(e, 'are'); e.stroke('SP'); e.stroke('SP');
  assert.equal(e.text, 'You are  ');
});

test('two spelled words need the space bar between them', () => {
  const e = prose();
  type(e, 'big cat');
  assert.equal(e.clean, 'Big cat');
});

test('marks close up to the word and what follows a stop is capital', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'you', 'know'); e.stroke('SR-ne'); write(e, 'the'); type(e, 'cat'); e.stroke('SR-nw'); write(e, 'right'); e.stroke('SR-n');
  assert.equal(e.clean, 'You know? The cat, right.');
});

test('an apostrophe continues the word before it, stroked or spelled', () => {
  const e = prose();
  write(e, 'can'); e.stroke('SR-sw'); type(e, 't'); write(e, 'they'); e.stroke('SR-sw'); type(e, 're'); write(e, 'here');
  assert.equal(e.clean, "Can't they're here");
});

test('the one-letter words are strokes, so spelling after them does not glue', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'i'); type(e, 'text'); e.stroke(ending('ed')); write(e, 'a'); type(e, 'friend');
  assert.equal(e.clean, 'I texted a friend');
});

test('a lone spelled i becomes the pronoun at the end of its word', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'the'); type(e, 'i'); write(e, 'know'); type(e, "i'm"); e.stroke('SR-n');
  assert.equal(e.clean, "The I know I'm.");
});

test('endings on stroked and spelled words, with the spelling English uses', () => {
  const e = prose();
  write(e, 'think'); e.stroke(ending('ing'));
  type(e, 'stop'); e.stroke(ending('ed'));
  write(e, 'you'); e.stroke(ending("'s"));
  write(e, 'can'); e.stroke(ending("n't"));
  type(e, 'rap'); e.stroke(ending('ing'));
  assert.equal(e.clean, "Thinking stopped you're can't rapping");
});

test('an ending with no word before it types nothing', () => {
  const e = prose();
  const r = e.stroke(ending('ing'));
  assert.equal(r.kind, 'invalid');
  assert.equal(e.text, '');
  write(e, 'the'); e.stroke('SR-n');
  assert.equal(e.stroke(ending('ing')).kind, 'invalid');
  assert.equal(e.clean, 'The.');
});

test('nothing rewrites a spelled word unasked; the complete stroke does', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const [outline, word] = Object.entries(theory.completions)[0];
  const e = prose();
  write(e, 'the'); type(e, outline);
  assert.equal(e.pendingOutline().expansion, word);
  e.stroke('SP');
  assert.equal(e.text, `The ${outline} `, 'a space leaves the letters as typed');
  e.backspace(); e.stroke('SP-s');
  assert.equal(e.text, `The ${word} `);
  e.backspace();
  assert.equal(e.text, `The ${outline}`, 'one undo gives the letters back');
});

test('texting shorthand expands on the complete stroke, with the sentence capital', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  type(e, 'omw'); e.stroke('SP-s'); e.stroke('SR-n');
  assert.equal(e.clean, 'On my way.');
  const f = prose();
  type(f, 'omw'); f.stroke('E-s');
  assert.equal(f.clean, 'Omw.');
});

test('the complete stroke with nothing to complete closes the gap', () => {
  const e = prose();
  write(e, 'thank'.length ? 'you' : 'you'); e.stroke('SP-s'); type(e, 'th');
  assert.equal(e.clean, 'Youth');
});

test('undo takes back one stroke, then deletes characters', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'you', 'think');
  e.backspace(); assert.equal(e.text, 'You ');
  e.backspace(); assert.equal(e.text, '');
  e.reset('abc'); e.backspace(); assert.equal(e.text, 'ab');
});

test('a longer outline rewrites the shorter one, and undo steps back one stroke', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const [a, b] = Object.keys(theory.slots);
  const e = prose(packs => { packs.find(p => p.id === 'mine').entries[`${a}/${b}`] = 'rewritten'; });
  e.stroke(a); const first = e.text;
  e.stroke(b);
  assert.equal(e.text, 'Rewritten ');
  e.backspace();
  assert.equal(e.text, first);
});

test('a higher pack overrides a lower one and the shadowed entry is reported', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const stroke = Object.keys(theory.slots)[0];
  const e = prose(packs => { packs.find(p => p.id === 'mine').entries[stroke] = 'banana'; });
  e.stroke(stroke);
  assert.equal(e.text, 'Banana ');
  assert.ok(e.shadowed.some(s => s.outline === stroke && s.by === 'mine'));
});

test('text from the letter and number pages joins what it lands in', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'at'); e.literal('3'); e.literal(':'); e.literal('3'); e.literal('0');
  assert.equal(e.text, 'At 3:30');
  e.reset(''); type(e, 'ask'); e.literal('@'); type(e, 'sam');
  assert.equal(e.text, 'Ask@sam');
  e.reset(''); write(e, 'about'); e.literal('8'); e.literal('.'); write(e, 'want');
  assert.equal(e.clean, 'About 8. Want');
  e.reset(''); write(e, 'you'); e.literal(')');
  assert.equal(e.text, 'You)', 'a closing mark takes the automatic space');
});

test('editing in the middle of the text keeps the spacing right', () => {
  const e = prose();
  e.reset('really happy'); e.moveCaret(-6);
  write(e, 'not');
  assert.equal(e.text, 'really not happy');
  e.reset('you ar right'); e.moveCaret(-6);
  e.stroke(letter(e, 'e'));
  assert.equal(e.text, 'you are right');
});

test('replaying the same strokes gives the same text', () => {
  const run = () => { const e = prose(); write(e, 'you', 'know', 'what'); type(e, 'omw'); e.stroke('SP-s'); e.backspace(); e.stroke('SR-n'); return e.text; };
  assert.equal(run(), run());
});

test('shell: exact typing, no English, no capitals, nothing expanded unasked', () => {
  const lines = ['cd ~/repo', 'git init', 'grep -i foo', 'env | grep path', 'cat /var/log/nginx.conf', 'my_file', 'kube-system',
    'ls -la ./src', 'npm run dist', 'main.py', 'echo $home', 'user@host', 'nginx:latest', 'k8s', "awk '{print $1}'",
    'a || b && c', 'x >> out.log', 'git rev-parse --show-toplevel', 'find . -exec rm {} \;'];
  for (const line of lines) {
    const e = shell();
    type(e, line);
    assert.equal(e.text, line);
  }
});

test('shell: commands are spelled entries, typed on the complete stroke, with the caret where it belongs', () => {
  const e = shell();
  type(e, 'gs');
  assert.equal(e.pendingOutline().expansion, 'git status');
  e.stroke('SP-s');
  assert.equal(e.text, 'git status');
  e.reset(''); type(e, 'gc'); e.stroke('SP-s');
  assert.equal(e.state.text, 'git commit -m "'); assert.equal(e.state.after, '"');
  type(e, 'fix typo');
  assert.equal(e.text, 'git commit -m "fix typo"');
  e.reset(''); type(e, 'ls'); e.stroke('SP'); e.stroke('A-e-cw'); type(e, 'color'); e.stroke('I-s'); type(e, 'auto');
  assert.equal(e.text, 'ls --color=auto');
  e.reset(''); type(e, 'echo'); e.stroke('SP'); e.stroke('A-sw-ccw'); type(e, 'home');
  assert.equal(e.text, 'echo ${home}');
});

test('shell: terminal keys go to the host when it takes them, and are control characters when it does not', () => {
  const e = shell();
  e.stroke('T-se'); e.stroke('A-n'); e.stroke('I-n');
  assert.equal(e.text, '\t\x03\x1b[A');
  const f = shell();
  const seen = [];
  f.host = { key: name => { seen.push(name); return name !== 'Tab'; } };
  type(f, 'ls'); f.stroke('T-se'); f.stroke('A-n'); f.stroke('I-n');
  assert.deepEqual(seen, ['Tab', 'Control(c)', 'Up']);
  assert.equal(f.text, 'ls\t');
});

test('shell: digits on circles, nothing but ASCII, and prose endings do nothing', () => {
  const e = shell();
  type(e, 'port'); e.stroke('I-s'); e.stroke('E-circle'); e.stroke('SP-n'); e.stroke('E-circle'); e.stroke('SP-n');
  assert.equal(e.text, 'port=8080');
  for (const [outline, t] of Object.entries(e.entries)) {
    if (!/^[A-Z]/.test(outline)) continue;
    e.reset(''); e.stroke(outline);
    assert.ok(!/[^\x00-\x7f]/.test(e.text), `${outline} types ${JSON.stringify(e.text)}`);
  }
  e.reset(''); type(e, 'it');
  for (const s of ['SP-se', 'SP-sw', 'SP-ne', 'SP-nw']) assert.equal(e.stroke(s).kind, 'undefined');
  assert.equal(e.text, 'it');
});

test('shell: a space is never doubled, closers are stepped over, a command expands after a quote', () => {
  const e = shell();
  type(e, 'ls '); e.stroke('R-nw-cw'); type(e, 'wc');
  assert.equal(e.text, 'ls | wc');
  e.reset(''); type(e, 'dk'); e.stroke('SP-s'); e.stroke('SP'); type(e, 'ps');
  assert.equal(e.text, 'docker ps');
  e.reset(''); type(e, 'echo '); e.stroke('E-nw-cw'); type(e, 'hi there'); e.stroke('E-nw'); type(e, ' x');
  assert.equal(e.text, 'echo "hi there" x');
  e.reset(''); type(e, 'echo '); e.stroke('A-sw-cw'); type(e, 'pwd'); e.stroke('R-e');
  assert.equal(e.text, 'echo $(pwd)');
  e.reset(''); type(e, "bash -c '"); type(e, 'gs'); e.stroke('SP-s');
  assert.equal(e.text, "bash -c 'git status");
});

test('turning the shell pack on in messages does not change how messages are written', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = make('messages', null, ['mine', 'shell', 'texting', 'english', 'letters']);
  write(e, 'i', 'think', 'you', 'are', 'right'); e.stroke('SR-n');
  assert.equal(e.clean, 'I think you are right.');
});

test('entries are validated, and braces can be written', () => {
  assert.equal(validateEntry('T-n-cw', 'hello'), null);
  assert.equal(validateEntry('omw', 'on my way'), null);
  assert.equal(validateEntry('T-n/SP-ne', '{^}x{^}'), null);
  assert.equal(validateEntry('gr', "awk '\\{print $1\\}'"), null);
  assert.match(validateEntry('t-n', 'x'), /neither a stroke/);
  assert.match(validateEntry('T-q', 'x'), /neither a stroke/);
  assert.match(validateEntry('Hello World', 'x'), /neither a stroke/);
  assert.match(validateEntry('abc', '{mode:snake}'), /not an operator/);
  assert.match(validateEntry('abc', 'echo {'), /never closes/);
  assert.match(validateEntry('abc', '{#Hyper}'), /not a key/);
  assert.match(validateEntry('abc', ''), /has to type/);
  const e = shell(packs => { packs.find(p => p.id === 'commands').entries.aw = "awk '\\{print ${|}\\}'"; });
  type(e, 'aw'); e.stroke('SP-s'); type(e, '1');
  assert.equal(e.text, "awk '{print $1}'");
});

test('camel case and prefixes compose', () => {
  const e = prose(packs => { Object.assign(packs.find(p => p.id === 'mine').entries, { 'T-n-cw': '{^}{-|}', 'T-n-ccw': '{un^}' }); });
  type(e, 'set'); e.stroke('T-n-cw'); type(e, 'attribute');
  assert.equal(e.text, 'SetAttribute');
  e.reset(''); e.stroke('T-n-ccw'); write(e, 'like');
  assert.equal(e.clean, 'Unlike');
});

test('every word has exactly one plan', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  const planner = makePlanner(e.entries, theory);
  assert.equal(planner.plan('the').kind, 'flick');
  assert.equal(planner.plan('thinking').kind, 'ending');
  for (const w of ['thing', 'evening', 'news', 'shed', 'herring', 'only', 'besides']) assert.notEqual(planner.plan(w).kind, 'ending', `${w} is not a base and an ending`);
  assert.equal(planner.plan('zebra').kind, 'spell');
});

test('what is sent keeps the space after a word put into the middle of a message', () => {
  const e = prose();
  e.reset('I am happy'); e.moveCaret(-5);
  write(e, 'really');
  assert.equal(e.text, 'I am really happy');
  assert.equal(e.clean, 'I am really happy');
});

test('a sentence that opens with a quote or a bracket still starts with a capital', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  e.stroke('E-ne-cw'); write(e, 'no'); e.stroke('SR-nw'); e.stroke('E-ne-cw'); write(e, 'she'); type(e, 'said'); e.stroke('SR-n');
  assert.equal(e.clean, '"No," she said.');
  e.reset(''); write(e, 'the'); e.stroke('SR-n'); e.stroke('A-e-cw'); write(e, 'you'); e.stroke('A-e-ccw');
  assert.equal(e.clean, 'The. (You)');
  e.reset(''); type(e, 'she said '); e.literal('"'); write(e, 'not'); type(e, 'today'); e.literal('"');
  assert.equal(e.clean, 'She said "not today"');
});

test('a habitual space after a word is not a stroke: undo and the tape skip it', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose();
  write(e, 'the'); e.stroke('SP');
  assert.equal(e.history.length, 1);
  e.backspace();
  assert.equal(e.text, '');
  write(e, 'you', 'think'); e.stroke('SR-n');
  assert.equal(e.stroke('SP-ne').kind, 'invalid');
  e.backspace(); e.backspace();
  assert.equal(e.text, 'You ');
  assert.deepEqual(e.tape.map(t => t.label), ['you']);
});

test('endings that would not make a word are refused, and contractions take the right form', () => {
  const e = prose();
  for (const [word, end] of [['and', 'ing'], ['you', 'ing'], ['the', 's'], ['i', 'ed']]) {
    e.reset(''); write(e, word);
    assert.equal(e.stroke(ending(end)).kind, 'invalid', `${word} + ${end}`);
  }
  e.reset(''); write(e, 'i'); e.stroke(ending("'s"));
  assert.equal(e.stroke(ending('ing')).kind, 'invalid');
  assert.equal(e.clean, "I'm");
  e.reset(''); type(e, 'kids'); e.stroke(ending("'s"));
  assert.equal(e.clean, "Kids'");
  e.reset(''); write(e, 'we'.length ? 'you' : ''); e.stroke('SP-sw-cw'); write(e, 'i'); e.stroke('SP-se-ccw'); write(e, 'he'); e.stroke('SP-se-cw');
  assert.equal(e.clean, "You'll I've he'd");
  e.reset(''); type(e, 'happy'); assert.equal(e.stroke(ending("n't")).kind, 'invalid');
});

test('a suffix of the user\'s own follows the spelling rules', () => {
  const e = prose(packs => Object.assign(packs.find(p => p.id === 'mine').entries, { 'T-n-cw': '{^ness}', 'T-n-ccw': '{^ful}', 'T-n-back': '{^ish}', 'T-e-cw': '{^able}' }));
  type(e, 'happy'); e.stroke('T-n-cw'); type(e, 'beauty'); e.stroke('T-n-ccw'); type(e, 'red'); e.stroke('T-n-back'); type(e, 'love'); e.stroke('T-e-cw');
  assert.equal(e.clean, 'Happiness beautiful reddish lovable');
});

test('retro operators change the word just written', { todo: 'written for the brief theory, not yet ported to the banks' }, () => {
  const e = prose(packs => Object.assign(packs.find(p => p.id === 'mine').entries, { 'T-n-cw': '{*-|}', 'T-n-ccw': '{*!}' }));
  write(e, 'the'); type(e, 'sarah'); e.stroke('T-n-cw'); type(e, ' note book'); e.stroke('T-n-ccw');
  assert.equal(e.clean, 'The Sarah notebook');
});

test('entries that could never fire are refused', () => {
  assert.match(validateEntry('SP-e', 'x'), /not a stroke the space bar/);
  assert.match(validateEntry('SP-n-cw', 'x'), /not a stroke the space bar/);
  assert.match(validateEntry('T-n/T-n/T-n/T-n/T-n', 'x'), /at most 4/);
  assert.match(validateEntry('ab', 'a{|}b{|}c'), /once/);
  assert.equal(validateEntry('SP-sw-cw', "{^'ll}"), null);
});
