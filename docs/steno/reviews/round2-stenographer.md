# Round 2 review: a stenographer's reading

I read this as a working stenographer and Plover contributor would. I read the revised design
document, the engine, the packs, the orthography, the planner, the script, the theory generator,
the generated theory and all three test files, and I checked every claim I could against the
tools. I went through the first round's twenty-three defects one by one with a reproduction for
each. I typed eighteen messages of my own in the live demo, thirteen of them with real pointer
events through the recogniser and five through the page hooks, and I drove the engine from Node
for most of the edge cases: about seventy spacing and capitalisation probes, 313 base and ending
pairs through the orthography, 104 base and ending pairs through the live translator, and
thirty-odd dictionary and operator cases. I did not anchor on the first round's scores.

The scripts and screenshots are in
`scratch/review2/steno/`.
`h.mjs` is the Node harness; `r1.mjs` replays the round-one defects; `sp.mjs`, `q.mjs`,
`orth.mjs`, `live.mjs`, `dict.mjs`, `suf.mjs`, `sh.mjs` and `tape.mjs` are the engine probes;
`blib.mjs`, `msgs.mjs`, `undo.mjs`, `coach.mjs`, `rec.mjs`, `shots2.mjs` and `showme.mjs` drive the
browser; the PNG files are the screenshots I refer to.

## Scores

| Dimension | Score |
| --- | --- |
| Novelty | 7.0 |
| Wonderful and intuitive to use | 7.0 |
| End-to-end useful for real texting | 7.0 |
| Without fault (correctness and polish) | 6.0 |
| Grounded in real words and patterns | 7.5 |
| Faithful to stenography | 6.3 |
| Configurability | 6.8 |
| **Overall** | **6.8** |

This is a large step from the first round, and most of what I complained about then is genuinely
gone. The orthography no longer produces wrong or offensive words in the common cases, the shell
is clean, apostrophes and literals join the word they belong to, the one-letter words are strokes,
undo of a multi-stroke outline retranslates as Plover does, the brief layer has been purged of
dropped-g spellings and prefix hijacks, and the texting pack no longer rewrites anyone's voice.
Sixteen of my eighteen messages came out exactly as intended on the first attempt, and the two
that did not were my own forgotten space between two spelled words, which is the documented rule.

I still would not put my name on it in front of my peers. Three things stand in the way. The
translator still has defects that put wrong text into a sent message (a missing space after a
mid-message insertion, and no capital after an opening quote). The theory is honest now about
being a brief table rather than a writing system, but the one rule it teaches as a rule, the
contraction turns, still has exceptions that produce confident wrong words, and the compositional
layer is five endings wide. And the dictionary system, while sound in shape, lacks the tools a
Plover power user expects: retro operators, affix orthography for user suffixes, a reorderable
stack, a lookup that lists every outline, and a tape longer than two chips.

## What is genuinely good

The translator is a faithful miniature of Plover's model where it matters most. A stroke is
looked up in a stack with strict priority, the longest outline wins and rewrites what its shorter
prefix typed, and one undo takes back exactly one stroke, including the retranslation back to the
shorter outline (`T-n/T-e/S-e`, undo, gives the `T-n/T-e` text, and a second undo gives *The*).
Fingerspelling as glue strokes means spelling is never a mode. Spelled entries such as `omw` or
`gc` fire only on an explicit stroke, which is the right answer to the first round's complaint
that the keyboard changed text behind the typist's back. The caret operator puts the cursor inside
`git commit -m ""`. Unknown operators are now refused at entry with a reason, which is exactly
what a conformance-minded engine should do.

The orthography is now written rules plus curated tables, and the comment in `orthography.js`
explaining why it is not learned from a corpus ("a corpus contains *raping* and so cannot be asked
how *rap* takes *-ing*") is the correct lesson drawn from the first round. All twenty-five of the
first round's failures pass, and so do the research's own acceptance cases that apply
(*defer* + `-ed`, *cherry* + `-s`).

The space-bar endings remain the best idea here. "Past" turning *go* into *went* and *can* into
*could*, and "not" turning *will* into *won't*, is a meaning-level ending that a stenographer
recognises, and replacing the space rather than adding to it is genuinely clever. The "change"
gesture on the corner key, which cycles the last word through its flick and curls, is a sensible
thumb-sized answer to the asterisk and to misread curls.

The shell context is now something I would use. `cd ~/repo`, `git init`, `kube-system`,
`ps aux | grep node`, `make && make install`, `echo hi > out.txt`, `./run.sh`,
`kubectl get pods -n kube-system` and `curl --verbose` all come out exactly, with no English in
the stack. Recording a stroke on an empty curl now captures the curl as drawn.

The interface teaches well. Printing the flick words on the keys turns the first layer into a
marking menu a newcomer reads without a lesson; the guide that unfolds the curls at a corner pause
places each curl where the finger must go (`hold_T_ncw_corner.png`, `hold_O_s_corner.png`); the
offer chip (`strip_offer.png`) shows the spelled letters, the word and the stroke that takes it;
and the coach chip now appears on the stroke that ends the word (`coach_the.png`,
`coach_could.png`), and its "Show me" plays the strokes without typing (`coach_showme_mid.png`).

## Status of the round-one defects

| # | Round-one defect | Status | What I ran |
| --- | --- | --- | --- |
| 1 | Lexicon-mined doubling (*raping*) | Fixed | *you*, `r a p`, `-ing` gives "You rapping"; rap, scrap, prop, snip, rid, sob, grub all double correctly. |
| 2 | Contractions break or have no stroke | Partly fixed | *can* `'` `t` gives "Can't" and *they* `'` `r e` gives "They're"; *can't* is one stroke and *they're* is *they* + `'s`. But *we'll*, *I'd*, *you'd*, *we've*, *he'll*, *they'll*, *she'll*, *that'll* and *they've* still have no stroke or ending (defect 5 below). |
| 3 | Contraction rule contradicted by the theory | Partly fixed | The four cited violations are gone, but `I-n-cw` is *I don't*, `I-s-cw` is *if*, `H-se-cw` is *happy*, `H-sw-ccw` is *help*, and on the letter flicks *don't* is on a right turn and *can't* on a back turn (defect 4). |
| 4 | English briefs fire in the shell | Fixed | `cd ~/repo`, `git init`, `env`, `dist` all exact; the terminal stack has no English. |
| 5 | Hyphenated tokens in the shell | Fixed | `kube-system` exact. |
| 6 | Literals split the next word | Fixed | "Ask @sam.", "At 7pm", "$HOME", "Meet at 3:30" all exact, by hook and by pointer across pages. |
| 7 | *I*, *a* and briefs glue to spelled words | Fixed / moot | *I* and *a* are word strokes ("I texted a friend"); spelled briefs no longer expand unasked, so `b e c a i` is simply what was typed. |
| 8 | Multi-stroke undo takes back the whole outline | Fixed | `T-n/S-e`, undo, gives "The"; the test now asserts the Plover behaviour. |
| 9 | Coach one stroke late | Fixed | Spell `t h e`, stroke *you*: the chip "the · one flick" appears at once. |
| 10 | Lookup and coach teach coincidences | Partly fixed | *thing*, *only*, *bed* and *sing* are now spelled, but Look up and the coach teach *evening* = *even* + `-ing`, *shed* = *she* + `-ed`, *news* = *new* + `-s` and *herring* = *her* + `-ing` (defect 8). |
| 11 | Junk briefs and prefix hijacks | Fixed, small residue | 2,624 completions are now 380, none is a prefix of another lexicon token and no dropped-g forms remain; *zea* → "zealand" and *desm* → "desmond" survive (defect 14). |
| 12 | Proper nouns as lowercase briefs | Mostly fixed | *london*, *david*, *jason* and the rest are gone; *zealand* and *desmond* remain in lowercase. |
| 13 | Further orthography failures | Fixed as listed | All twenty-five pass. My wider set of 313 pairs finds 34 deviations, about half of them acceptable variants (*drier*, *queuing*, *tornados*); the real ones are listed under defect 13. |
| 14 | Endings with nothing to attach | Fixed | `-ing` on an empty field or after a full stop is refused and types nothing. Endings are still not checked against a word list (defect 13). |
| 15 | Tape and history desynchronise | Not fixed | Still reproducible, and now reachable with shipped strokes (defect 9). |
| 16 | Undefined curls type the flick; Record cannot reach them | Partly fixed | Record captures `I-sw-cw` as drawn and the new entry works. Undefined curls still silently type their flick (defect 11). |
| 17 | Editor accepts what the engine cannot honour | Mostly fixed | `{*-|}`, `{~|"}`, `{*}`, `{MODE:CAPS}` are refused; `gr8` now works with the digit from the number page. `{^}` at the start of a spelled entry still keeps the space ("The 😂"), and unreachable outlines such as `SP-e` and `SP-n-cw` are accepted (defect 12). |
| 18 | Mid-message insertion spacing | Partly fixed | The composer now shows "I am really happy", but the text that is sent is "I am reallyhappy" (defect 1). |
| 19 | Shallow up-left corner flick deletes | Partly fixed | At 35° and steeper it opens the number page; at 27° and 30° it still deletes a character (defect 10). |
| 20 | Guide and ribbon polish | Fixed | No overlapping or clipped chips on T, S or I at desktop or phone width (`hold_T_wccw_mobile.png`); the coach chip is spaced. |
| 21 | Texting pack rewrites by default | Fixed | `tmr` and a space stays "Tmr"; expansions happen only on the complete stroke. |
| 22 | Switching off English removes the alphabet | Fixed | Letters are their own locked pack; a stack without English types "hello world". |
| 23 | Lookup and tape below the tools they borrow from | Not fixed | Look up still shows one plan with no dictionary name and no alternatives; the strip shows two chips; there is no log to export (defect 15). |

Of twenty-three, thirteen are fixed (two with a small residue), two mostly fixed, six partly fixed
and two not fixed.

## Messages I typed

"Pointer" means real mouse events through the recogniser, including page switches on the corner
key for digits; "hooks" means `wf.engine.stroke`.

| # | Intended | How | Result |
| --- | --- | --- | --- |
| 1 | Hey, are you free tonight? | pointer: *hey* `,` *are* *you* *free* *tonight* `?` | exact |
| 2 | I can't make it, sorry. Running late! | pointer: *I* *can't* *make* *it* `,` *sorry* `.` `r u n` `-ing` *late* `!` | exact |
| 3 | We'll be there at 7:30, don't worry. | pointer: *we* `' l l` space `b e` *there* *at* 123 page `7:30` `,` *don't* `w o r r y` `.` | exact |
| 4 | She said, "no way" lol | pointer: *she* *said* `,` `"` *no* `w a y` `"` `l o l` | exact |
| 5 | Did you get my message? | pointer: `d i d` *you* *get* *my* `m e s s a g e` `?` | exact |
| 6 | They're stopping at Dave's first. | pointer: *they* `'s` `s t o p` `-ing` *at* shift `d a v e` `'s` *first* `.` | exact |
| 7 | Thanks so much, that's really kind of you. | pointer | exact |
| 8 | Can you pick up milk on the way home? Thank you! | pointer, `t y` and the complete stroke from the texting pack | exact |
| 9 | I'm going to be a little late, no problem. | pointer, three phrase curls | exact |
| 10 | Meeting moved to 3pm in room 204: bring the slides. | pointer, digits from the 123 page, `:` curl, `slide` + `-s` | exact |
| 11 | Who's coming tomorrow? Let me know! | pointer, `w h o` + `'s`, *come* + `-ing` | exact |
| 12 | Ok, I'll call you when I'm done. | pointer | exact |
| 13 | Sounds good, see you at 8! | pointer | exact |
| 14 | On my way, be there in 10 mins | hooks, `omw` + complete | "…in 10mins": I forgot the space after the digits, which the rules require |
| 15 | Hi Priya! Are you around this weekend? | hooks | "HiPriya!": I forgot the space between two spelled words, which the rules require |
| 16 | Don't forget the tickets (and your ID). | hooks, `(` and `)` curls | exact |
| 17 | Ask @sam about the 5-day trip. | hooks, `@` curl, digit, hyphen | exact |
| 18 | I texted Mum: "running late, sorry" | hooks, colon and quotes | exact |

I also exercised undo after every kind of stroke (flick, curl, ending, completion, letter, mark,
phrase, literal): each takes back exactly its own stroke, and undoing a completion gives the
letters back. The change gesture cycles *you* → *you're* → *you'll* → *you've* → *you* correctly,
and after a full stop it cycles `.` → `:` → `…`, which is a nice touch. The failures were all in
corrections: undo and change after a habitual space, change after a letter, and sending after a
mid-message insertion (defects 1, 3 and 7).

## Defects now, most severe first

### 1. A word inserted mid-message is sent without its space

`Engine.clean` (`src/engine.js` line 88) strips the translator's held space whenever `autoSpace`
is set, even when there is text after the caret. `trail()` (line 304) added that space precisely
because the text after the caret does not begin with a separator, so the sent text loses it.

- In the demo: type *I*, `a m`, space, `h a p p y`; drag the space bar left five characters;
  stroke *really* (`R-s-cw`). The composer shows "I am really happy". Flick the corner key up.
  The bubble that is sent reads **"I am reallyhappy"**.
- Field "You are", caret at the start, *hey* and `,`: sent as "Hey,You are".

`test/engine.test.mjs` lines 162 to 170 check `e.text`, not `e.clean`, which is why this passes the
suite. A keyboard that silently sends different text from what it showed is the most serious kind
of fault this design can have.

### 2. No capital after an opening quote or bracket at the start of a sentence

`sentenceStart` (`src/engine.js` line 36) requires the text to end in whitespace, so an opening
`"` or `(` at the start of the message or after a full stop defeats it.

- `"` (`E-ne-cw`), *no*, `,`, `"`, *she*, *said*, `.` gives `"no," she said.` Expected
  `"No," she said.`
- *the*, `.`, `"`, *no*, `.`, `"` gives `The. "no."`; *the*, `.`, `(`, *you*, `)` gives
  `The. (you)`; the same happens with `"` and `(` from the letter page.

The round trip skips every held-out message that contains a double quote
(`test/roundtrip.test.mjs` line 58), so quotes are never exercised end to end. Plover carries the
pending capital through an attached opener; this engine should too.

### 3. The habitual space is an undo step and blocks "change"

The design says tapping space after a word "changes nothing, so the habit … is harmless", but the
swallowed tap is recorded as a stroke.

- *the*, space, undo: nothing visible happens and the strip shows "␣"; a second undo removes
  *the*.
- *the*, space, corner key right: the toast says "Nothing to change", because the last history
  entry is `SP`.

These are the two correction moves the design promotes, and the habit it promotes defeats them.
A swallowed space should not be its own undo step, and change should look past it.

### 4. The contraction turns are not a rule yet

The Learn tab teaches "right is 's / 're / 'm, left is n't / 'll, back is 've". Where the
contraction is under 100 per million, or already has a flick, the turn holds an unrelated word, so
the learner who applies the rule gets a confident wrong one.

- `I-n-cw` types *I don't*; the rule says *I'm*. `I-s-cw` (*it* right) types *if*; the rule says
  *it's*.
- `H-se-cw` (*here* right) types *happy*, not *here's*; `H-sw-ccw` (*he* left) types *help*, not
  *he'll*; `T-w-ccw` (*that* left) types *time*, not *that'll*; `H-sw-back` types *his*;
  `I-s-back` types *important*.
- On the letter flicks the convention is not applied at all: on *d* (`O-s`), *don't* is right
  and *didn't* left; on *c* (`O-w`), *can* is right, *come* left and *can't* back. A learner
  reaching for *can't* on the "not" turn gets *come*.

The guide shows the truth (`hold_I_n_cw.png`), so a hesitant learner is saved, but a rule with
exceptions trains the wrong reflex in exactly the strokes people make fastest.

### 5. *'ll*, *'ve* and *'d* have no stroke

The engine supports the three endings (`src/orthography.js` lines 142 to 144), but
`tools/theory.mjs` line 251 puts only five endings on the space bar, and contractions are excluded
from completions. So *we'll* (394 per million), *I'd* (416), *we've*, *you'd*, *he'll*, *they'll*,
*she'll*, *that'll*, *they've*, *would've* and *could've* are spelled with the apostrophe: *we*,
`'`, `l`, `l`. Look up even says *we'll* is "spelled letter by letter, 5 strokes", although *we* is
a stroke and the real count is four. These are among the commonest words in texting.

### 6. User-defined suffixes get no spelling rules

`Engine.apply` (`src/engine.js` line 261) applies orthography only to the ten built-in ending
names; any other `{^…}` is a plain attach.

- With `{^ness}` on a stroke: `h a p p y` + stroke gives "Happyness". `{^ful}` on *beauty* gives
  "Beautyful", `{^ish}` on *red* gives "Redish", `{^ment}` on *argue* gives "Arguement" and
  `{^able}` on *love* gives "Loveable".

*beauty* + `{^ful}` and *red* + `{^ish}` are the research's own acceptance tests (criterion 6.1.6).
For a design whose answer to "no writing system" is "the ending layer and the bare attach, which
work on any word", the affixes a user adds have to follow the same rules as the shipped ones.

### 7. "Change" acts on letters and does nothing after an ending

`siblings()` (`src/ui/keyboard.js` line 459) treats a letter flick that has curls as a word stroke.

- Spell `g o o` and flick `d` (`O-s`); flick the corner key right. Expected: nothing, or the
  letter left alone. Actual: "Goo don't ".
- *think* + `-ing`, change: nothing happens; the obvious neighbours (*-s*, *-ed*) are not offered.

### 8. Look up and the coach still teach orthographic coincidences

The planner's guard (a base of three letters or more, not much rarer than the word) removed
*thing* = *the* + *-ing* but not these:

- Look up and the coach chip give *evening* = *even* + `-ing` (`coach_evening.png`), *shed* =
  *she* + `-ed`, *news* = *new* + `-s` and *herring* = *her* + `-ing`. `theory.derived` also holds
  *wicked* = *wick* + `-ed`, *united* = *unit* + `-ed`, *cunning* = *cun* + `-ing` and *channing*
  = *chan* + `-ing`.

The output is right, but a lookup tool that tells a learner *shed* is *she* in the past costs it
the trust it needs for every other answer. *Left* = *leave* + `-ed` and *could* = *can* + `-ed`
are defensible as meaning-level endings; these are not.

### 9. Tape and undo still desynchronise

`backspace()` (`src/engine.js` line 172) pops the tape's last entry rather than the entry it
undid, and refused or undefined strokes are on the tape but not in the history.

- With shipped strokes: *you*, *think*, `.`, `-ing` (refused after a full stop), undo, undo. The
  text is "You " but the tape still holds *think*, and the strip shows it.
- Longest match still skips an undefined stroke: with `T-n/S-e` defined, `T-n`, `I-sw-cw`
  (undefined), `S-e` gives "The following", where Plover would break the outline at the
  untranslate.

### 10. A shallow up-left flick on the corner key still deletes

`slideDelete` (`src/ui/keyboard.js` line 312) starts deleting when the drag is more than 1.6 times
as wide as it is tall, which is anything flatter than 32°, while the up-left sector starts at
22.5°.

- From "The you ", a 40 pt drag up-left at 30° (120 ms and 300 ms) and at 27° deleted the
  trailing space and stayed in steno; at 35°, 45° and 60° it opened the number page.

### 11. Untranslates are guessed, not shown

`resolve()` (`src/ui/keyboard.js` line 361) types the straight flick when a curl is undefined.
Eleven curls in the messages stack are undefined (`I-sw-cw`, `I-sw-ccw`, `I-w-ccw`, `R-n-cw`,
`R-n-ccw`, `R-n-back`, `E-ne-ccw`, `E-e-cw`, `E-e-ccw`, `E-sw-ccw`, `E-sw-back`), so a sloppy
`I-w-ccw` types `?` and `E-e-cw` types `z` with no sign that anything was guessed. This is a
deliberate choice, but it is the opposite of the research's criterion 6.1.7 and of Plover's
behaviour, and the tape could at least mark it.

### 12. The dictionary editor still has gaps

- Multi-stroke outlines cannot be recorded. `record()` (`src/ui/panel.js` line 327) extends the
  outline only if `btn.dataset.extend` is set, and nothing sets it. Recording `T-n` and then `S-e`
  leaves `S-e`, not `T-n/S-e`; the comment says the opposite.
- Unreachable outlines are accepted: pasting `{"SP-e": …, "SP-n-cw": …}` reports "Added 3
  entries", but the space bar's sideways strokes are the caret slide and it has no curls.
- `{^}` at the start of a spelled entry does not remove the space before the letters:
  `lol` → `{^}😂`, then *the*, `l o l`, complete, gives "The 😂", not "The😂".

### 13. Endings produce non-words on contractions and phrases, and some plurals are wrong

- *I'm* + `-ing` gives "I'ming", *it's* + `-s` "It'ses", *a lot* + `-s` "A lots", *I don't* +
  `-ed` "I don'ted", *on my way* + `-s` "On my ways". The ending should be refused, or shown as an
  untranslate, when the result is not a word.
- `k i d s` + `'s` gives "Kids's" (expected *kids'*); *sheep*, *deer*, *crisis*, *analysis* and
  *stomach* + `-s` give *sheeps*, *deers*, *crisises*, *analysises* and *stomaches*.

### 14. Residual junk in the theory

- Completions `zea` → "zealand" and `desm` → "desmond" type proper nouns in lowercase.
- The phrase curl `H-ne-back` is *know where* (105 per million): a phrase no texter thinks of as a
  unit, chosen because it scored.

### 15. Look up and the tape remain below what they borrow from

Look up shows one plan with no dictionary name and no alternatives, so *can't* is shown only as
`O-w-back` although *can* + `n't` also works and is easier to remember. The strip shows the last
two word chips; the undo chip after taking back a completion reads "ther" rather than *together*;
there is no tape of fifty strokes and no session log to export (research criteria 6.3.4 and 6.3.6).

### 16. Undo after an edit deletes characters it did not write

After the caret moves, the history is cleared and the corner key's tap falls through to deleting a
character. That is reasonable backspace behaviour, but it contradicts the design's promise that a
tap "takes back a whole stroke" and the research's criterion 6.1.4 that undo never deletes what
the engine did not write. A distinct glyph on the corner key when there is nothing to undo would
make the switch visible.

## The theory, entry by entry where it matters

**The flicks.** The 48 flick words are defensible, frequency-justified and readable on the keys.
The look-alike rule holds (*you* and *your*, *he* and *her* are not neighbours), the five-letter
limit holds, and every flick word begins with a letter of its key. This layer I could teach in an
afternoon, and it carries about forty percent of word tokens in dialogue.

**The contraction turns.** Where they apply they are right (*you're*, *you'll*, *you've*;
*that's*; *what's*; *he's*; *how's*; *isn't*; *aren't*; *haven't*; *won't*; *I'll*; *I've*;
*it'll*), but defect 4 lists the turns that break the rule.

**The other curls.** These are a brief table with a loose mnemonic. Some families are lovely
(*some*: *something*, *someone*, *sometimes*; *to*: *tomorrow*, *too*, *today*; *the*: *there*,
*they*, *then*). Many are arbitrary from the learner's side: *we* is a curl of *with*, *she* of
*see*, *said* of *sorry*, *let* of *look*, *really* of *right*, *if* of *it*, *needs* of *no*
(while *need* is its own flick), *friend* is on *from* but *friends* on the *f* flick, and *years*
and *year*, *question* and *questions* sit on neighbouring turns of one flick where a misread swaps
them silently. Every one of these is visible in the guide, so the design works as a marking menu;
it does not work as a theory a learner can derive.

**The words that have no stroke.** Fifteen of the hundred commonest words are spelled: *of*,
*be*, *on*, *go*, *one*, *got*, *up*, *oh*, *or*, *as*, *did*, *am*, *an*, *okay*, *by*. Together
they are 5.9 % of all tokens, and *of* alone (8,997 per million) is the tenth commonest word. In
the same theory *visit* (124 per million), *join* (149), *questions* (109), *information* (111),
*nobody* (101) and *know where* (105) have curls. The cost model justifies this (two taps for *of*
beat a 702 ms hook), and DESIGN.md admits it for five of them, but it also means no phrase can be
built on *of*, *on* or *be* (*of the*, *on the*, *I'll be*, *to be*), which is where phrasing
earns its keep in real steno. The cause is structural: the O key's nine letters leave no free
flick for any word beginning with *o*, *b*, *d*, *g*, *c*, *u*, *p*, *j* or *q*.

**The completions.** The 380 completions are sound by construction (no other lexicon token begins
with the prefix), clean apart from defect 14, and almost irrelevant: they cover 1 % of tokens.
That is the honest consequence of the stricter rule, and I prefer it to the first round's 2,624.

**The derived words.** 4,041 words are a base plus an ending; the meaning-level ones (*could*,
*told*, *saw*, *these*, *those*) are good teaching, and the coincidences in defect 8 are not.

## The claims, checked

These hold. 48 flicks and 188 curls (179 words and nine phrases). Flick words are 39.9 % of word
tokens. The evaluation table in DESIGN.md reproduces exactly from `node tools/evaluate.mjs` for all
three corpora, including the 45.8 / 43.5 letter baseline and the 72.4 / 58.0 / 51.6 final row.
The robustness figures reproduce exactly: 95.7 % at 4.5 mm legs and 9° aim, 97.9 % at 6 mm, 84 % at
3.5 mm, with the loss mostly curls read as their flick. `npm test` passes 36 of 36, and the round
trip is 3,034 of 3,034 exact. The orthography tests hold about 260 cases. The SMS day-one row is
about two percent slower than the letter keyboard, as stated. The engine is deterministic and has
no language model.

These are overstated.

- "`test/engine.test.mjs` holds the translator to its rules, including every wrong output the
  first round of reviews found." It does not cover round-one defects 15, 18 (the sent text), 19,
  23 or the `{^}` case in 17, and four of those still fail.
- "A word is assigned once, so every word has exactly one way to be written." Lookup gives one
  answer, but *can't*, *isn't*, *aren't*, *haven't*, *won't*, *you're*, *that's*, *what's*,
  *he's* and *how's* can each also be written as their base plus an ending. That is fine, as it is
  in Plover, but the claim should go and Look up should list both.
- The round trip "counts and skips" messages it cannot type, without saying how many: 1,466 of
  4,500, and 904 of the 1,500 SMS messages (60 %). Every message with a double quote is skipped, so
  defect 2 is invisible to it.
- "The 48 flick words are 40 % of everything typed": they are 40 % of word tokens in dialogue and
  25 % in the SMS corpus.
- `src/model.js` says the cautious variant charges misreads at "the recogniser's error rate"; at
  the headline 4.5 mm and 9°, `tools/robustness.mjs` gives curls 92.8 % and 93.5 % correct, that is
  about 7 % misreads, while "cautious" charges 4 %. The 8 % "pessimistic" figure matches the
  document's own headline condition, and under it the curls add no speed. The document says this
  plainly about the pessimistic row, but the cautious row is the one people will quote.
- "Contractions … on turns that mean the same thing everywhere" (defect 4).
- "Words the two cased corpora write with a capital … get no stroke": *zealand* and *desmond* get
  completions.

These are missing.

- Any test of the sent text (`clean`) after caret movement, of quotes, or of the tape.
- A count of how often the documented "space between two spelled words" rule is needed: 95 of the
  300 commonest words are planned as plain spelling, and I tripped over the rule twice in eighteen messages while
  knowing it.
- Any measurement on thumbs, which the document admits.

## Design-level objections that no bug fix cures

I separate those inherent to a prototype from those the designer could act on now.

**Inherent for now.** Nobody has made these strokes with a thumb under measurement; the hook
timings come from pens and the misread rates from a synthetic thumb, so whether the curl layer
pays at all is unknown, and the tool's own numbers say it is roughly speed-neutral at 4.5 mm legs.
Whether iOS lets a keyboard extension see the text after the caret (which defect 1's fix needs)
and deliver control characters to a terminal is untested on a device. None of this counts against
the prototype; all of it stands between the prototype and a speed claim.

**Fixable now.**

1. **The theory is a brief table, and the one rule it teaches leaks.** DESIGN.md now says so
   honestly ("a brief system over a letter keyboard, with steno's translator underneath"), and I
   credit that. But steno earns its name from outlines a learner can derive. The cheapest step
   towards that is to make the turns mean one thing on every flick: reserve all three turns of
   every pronoun and auxiliary for its contractions, whatever their frequency (*he'll*, *here's*,
   *that'll*, *it'd*), allow *I'm* and *it's* a second outline on their right turns, apply the same
   convention on letter flicks (*don't* and *can't* on the not turn), and confine words that are
   merely "the same first letter" to letter flicks. A rule with no exceptions is teachable; a rule
   with eight is not.
2. **The compositional layer is five endings wide.** Steno's power on unseen words comes from
   affix strokes that combine with anything. Add *'ll* and *'ve* (and *'d*) as endings, give a
   handful of productive affixes strokes (*re-*, *un-*, *-ly*, *-er*, *-ness*, *-ful*, *-ment*,
   *-able*, *-tion*), and run every user suffix through the same orthography.
3. **The function words are starved and there is no phrasing.** The first-letter constraint
   leaves *of*, *be*, *on*, *go*, *up*, *or*, *by* and *did* spelled while rare words take curls.
   Give the commonest function words a home (the key of their second letter, a free corner, or the
   space bar's down-diagonals as a small function-word ring), then build a short phrase family on
   them (*of the*, *on the*, *to be*, *I'll be*, *do you*, *I don't know*), measured against
   writing the words one by one.
4. **Untranslates should be visible.** Typing the flick for an undefined curl is forgiving, but it
   hides misreads and trains nothing. Make it a setting, and mark guessed strokes on the tape.
5. **The dictionary system needs the power-user half.** Retro operators (`{*?}`, `{*!}`, `{*+}`,
   `{*-|}`), a stack the user can reorder and add packs to, file import and export, multi-stroke
   Record, and a lookup that lists every outline with its dictionary.

## What would raise my score most, in order

1. Fix the translator faults that put wrong text in a sent message: the held space after a
   mid-message insertion (use the text after the caret in `clean`), the capital after an opening
   quote or bracket, and the `{^}` at the start of a spelled entry; add `clean`, quotes and the
   tape to the tests, and stop skipping quoted messages in the round trip.
2. Make the habitual space transparent to undo and change, restrict change to word strokes, and
   fix the tape so it pops the entry that was undone.
3. Make the contraction turns exceptionless as described above, and add *'ll*, *'ve* and *'d*
   endings so that *we'll*, *they'll*, *I'd* and *you'd* are two strokes.
4. Give user-defined suffixes the same orthography as the built-in ones, refuse endings whose
   result is not a word, and fix the plural possessive and the common irregular plurals.
5. Give *of*, *be*, *on*, *go*, *up*, *or*, *by*, *did* and *one* a stroke each and add a small,
   measured phrase family built on them.
6. Clean the planner and the theory: no coincidental bases (*even*, *she*, *new*, *her*), no
   lowercase names, no *know where*.
7. Bring the dictionary tools up to the research criteria: retro operators, a reorderable stack
   with user packs, file import and export, multi-stroke Record, rejection of unreachable outlines,
   a lookup listing every outline with its dictionary, and a fifty-stroke tape with export.
8. Close the corner key's delete drag out of the whole up-left sector, and mark guessed curls.
9. Correct the overstated claims listed above.
10. Then measure curl accuracy and time on real thumbs, error recovery included.

If the first nine were done as described, I would score it about 8.4 overall: Without fault
around 8.5, Faithful to stenography around 7.5, Configurability around 8, Wonderful and intuitive
around 8. To go past 9 it would need the tenth item, evidence from real thumbs that the curl layer
pays, and a theory layer a learner can derive rather than look up.
