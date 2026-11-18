# Round 1 review: a stenographer's reading

I read this as a working stenographer and Plover contributor would. I read the design document,
the research it rests on, the engine, the packs, the orthography, the planner, the theory
generator and the generated theory. I drove the live demo with real pointer events and with the
`wf` hooks, and I drove the engine directly from Node for most of the edge cases. I ran
`npm test`, `node tools/evaluate.mjs` and `node tools/robustness.mjs`. Every defect below has a
reproduction I ran myself. The scratch scripts are in
`scratch/review/steno/`
(`t1.mjs` to `t21.mjs` for the engine, `drive.mjs`, `coach.mjs`, `rec.mjs`, `at.mjs` and `ut.mjs`
for the browser), together with the screenshots I refer to.

## Scores

| Dimension | Score |
| --- | --- |
| Novelty | 6.5 |
| Wonderful and intuitive to use | 6.0 |
| End-to-end useful for real texting | 5.0 |
| Without fault (correctness and polish) | 3.5 |
| Grounded in real words and patterns | 6.0 |
| Faithful to stenography | 4.5 |
| Configurability | 5.0 |
| **Overall** | **5.2** |

I would not put my name on this in front of my peers yet. The interaction idea is good and the
engine is built on the right model, but the shipped theory is a frequency-ranked brief table
rather than a writing system, the orthography produces wrong and in one case offensive words, the
contraction story that the Learn tab teaches is contradicted by the theory, and the shell use case
that the owner named explicitly is broken by the English dictionary leaking into it.

## What is genuinely good

Before the defects, it is worth saying what I would keep. The translator is deterministic and
small, and it borrows the right parts of Plover: a stack of dictionaries with strict priority and
a shadow report, fingerspelling as glue strokes so that spelling is never a separate mode, attach
operators, a caret operator that makes `gc` land inside the quotes, and undo by stroke rather than
by character. The stroke notation (`T-n`, `T-n-cw`, `SP-ne`) is canonical, plain ASCII and easy to
keep in a text file. Putting the endings on the space bar so that an inflection replaces the space
is a real idea, and it is consistent and learnable. Printing the flick words on the keys turns the
first layer into a marking menu that a newcomer can read without any lesson, and the guide that
unfolds the curls mid-stroke is well judged. The round-trip test is a proper golden test, and the
design document is unusually candid that its speed figures are a model. Of the twenty rows in the
table below, fourteen behaved as intended and six did not.

## Messages I typed

"Pointer" means real mouse events through the recogniser; "hooks" means `wf.engine.stroke`.

| # | Intended | How | What came out |
| --- | --- | --- | --- |
| 1 | Hey, are you free tonight? | pointer: hey, comma, are, you, f-r-e-e, tonight, ? | exact |
| 2 | I can't make it, sorry. Running late! | pointer: I, *can* hook, apostrophe, t, ... | `I can' t make it, sorry. Running late!` |
| 3 | the same | pointer: I, space, c-a-n-'-t spelled, ... | exact |
| 4 | Priya's flight lands at noon. | pointer: shift, p-r-i-y-a, `'s` ending, spelled, `-s` ending | exact |
| 5 | Did you get my message? | pointer: did and get spelled, `messa` brief | exact |
| 6 | We're going to the beach tomorrow, want to come? | hooks | exact |
| 7 | Thanks so much, that's really kind of you. | pointer | exact |
| 8 | omw, be there in ten | hooks, texting pack | `On my way, be there in ten` (expansion intended) |
| 9 | They're stopping at Dave's first. | hooks: they're spelled, stop + `-ing`, Dave + `'s` | exact |
| 10 | I think she is right. (typed *he*, undid, typed *she*) | pointer, corner-key undo | exact |
| 11 | Probably ... (spelled *proba*, stroked *the*, undid) | hooks | `Proba` kept literal after the undo, as designed |
| 12 | I texted Sam, he said idk lol | hooks: I, t-e-x-t + `-ed`, ... | `Itexted Sam, he said I don't know lol` |
| 13 | Is it a good idea? | pointer | exact |
| 14 | Because I said so. | hooks: `beca` brief, I, said, so | `Becai said so.` |
| 15 | git commit -m "fix typo" | pointer, terminal | exact |
| 16 | cd ~/repo && npm run dev | hooks, terminal | `cd ~/report && npm run dev` |
| 17 | ls -la ./src | hooks, terminal | exact |
| 18 | Ask @sam. | pointer, `@` from the abc page | `Ask@ sam.` |
| 19 | See you at 7pm | engine, `7` from the number page | `At7 pm` pattern (see defect 6) |
| 20 | three sentences via `wf.typeSentence` | expert script | all exact |

The failures cluster. Every one of them is something a learner does on the first day: reaching for
a contraction the theory forgot, tapping *I* before a spelled word, ending a brief with a letter,
inserting an `@` or a digit, or typing a directory name in a shell.

## Defects, most severe first

### 1. Lexicon-mined doubling rules produce wrong and offensive words

`tools/theory.mjs` lines 209 to 218 mark a base as "does not double" whenever the lexicon contains
the undoubled form and not the doubled one. The undoubled form is usually a different lemma (the
inflection of an `-e` verb), so correct results are inverted.

- Strokes: *you* (`T-e`), spell `r a p`, `SP-ne`. Expected `You rapping`. Actual `You raping`.
- `rap` + `-ed` gives `raped`; `scrap` + `-ed` gives `scraped`; `prop` + `-ed` gives `proped`;
  `snip` + `-ed` gives `sniped`; `rid` + `-ing` gives `riding`; `sob` + `-ing` gives `sobing`;
  `grub` + `-ed` gives `grubed`.
- The generated table (`theory.doubling`) also holds noise such as `hav`, `mak`, `giv`, `lov`.

A messaging keyboard that turns *rapping* into *raping* cannot ship. This needs Plover's approach:
generate the rule candidates and pick the one the word list attests *for that base*.

### 2. Contractions: the obvious route breaks, and many common ones have no stroke

`can't` (1,341 per million, about the 103rd word), `doesn't`, `we'll`, `they're`, `wasn't`,
`we've`, `wouldn't`, `couldn't`, `you'd`, `they'll`, `she'll`, `he'll`, `that'll`, `hasn't` and
`weren't` have no stroke and must be spelled letter by letter, apostrophe included. A learner who
knows *can* and *they* will stroke the word and add the ending, and that produces a broken word,
because `glue()` in `src/engine.js` lines 284 to 296 attaches an apostrophe to a finished word
without reopening it, so the next letter starts a new word with a space.

- `O-w-cw` (*can*), `E-ne`, `T`. Expected `Can't`. Actual `Can' t`.
- `T-n-back` (*they*), `E-ne`, `R`, `E`. Expected `They're`. Actual `They' re`.

### 3. The contraction rule the Learn tab teaches is contradicted by the theory

DESIGN.md rule 2 and the Learn tab say right is *is/are/am*, left is *not/will* and back is *have*,
"on every word that has them". The generator places:

- `didn't` on `O-s-cw` (the *is/are* turn) next to `don't` on `O-s-ccw`;
- `she's` on `S-se-ccw`, which is *should* plus the *not* turn, so a learner aiming for
  *shouldn't* gets *she's*;
- `there's` on `T-nw-back` (on *think*), `let's` on `N-ne-back` (on *look*), `we're` on the
  apostrophe mark (`E-ne-cw`) while *we* is on the comma (`E-sw-ccw`), and `i'd` on *it's*.

A rule with this many exceptions is worse than no rule, because it produces confident wrong
strokes.

### 4. English briefs fire inside the shell

The terminal context switches the shell pack on and the texting pack off, but the English pack
stays underneath, and its spelled briefs expand on the next boundary.

- Terminal: `c d`, `SP`, `I-w-cw` (`~/`), `r e p o`, `SP`. Expected `cd ~/repo `. Actual
  `cd ~/report `.
- `git init` gives `git initial`. Also `env` → environment, `var` → various, `opt` → option,
  `proc` → process, `dist` → distance, `prod` → product, `conf` → confirm, `auth` → authority,
  `perf` → perfect, `req` → request, `obj` → object, `arr` → arrange, `awk` → awkward,
  `exe` → exercise.

Writing for a command line was the owner's named example of configurability, and it fails on
ordinary directory and subcommand names.

### 5. Hyphenated tokens cannot be written in the shell pack

`SHELL['A-e']` is `-{^}` (`src/packs.js` line 83), which attaches only to the right.

- Terminal: `k u b e`, `A-e`, `s y s t e m`. Expected `kube-system`. Actual `kube -system`. The
  same breaks `docker-compose`, branch names and file names with dashes.

### 6. Symbols and digits from the other pages split the next word

`Engine.literal()` (`src/engine.js` lines 121 to 129) appends without any boundary logic and
clears the pending word, so a literal glues to the left and the next letter opens a new word.

- Pointer: *ask* (`A-nw-back`), corner key up-right to abc, `@` (`R-sw`), back to steno,
  `s a m`, `.`. Expected `Ask @sam.` Actual `Ask@ sam.`
- *at* (`A-nw`), number page `7`, back, `p m`. Expected `at 7pm`. Actual `At7 pm`.
- `$HOME` gives `$ HOME`; `user@host` gives `user@ host`; a `-s` ending after `7` gives `7s`.

Mentions, hashtags, e-mail addresses, prices and times are everyday texting.

### 7. The two commonest one-letter words, and briefs, glue to the next spelled word

*I* and *a* are letter taps, and a letter never ends the word being spelled. A spelled brief is
likewise not committed by a letter, although DESIGN.md says "the next stroke commits it".

- `I`, `t e x t`, `SP-nw`. Expected `I texted`. Actual `Itexted`.
- `b e c a`, `I`. Expected `Because I`. Actual `Becai`.

The ribbon does show the space hint for briefs, but *I* followed by a spelled verb is so common
that a learner will hit this constantly.

### 8. Undo of a multi-stroke outline takes back every stroke of it

With `T-n/S-e` defined as *the following*: `T-n`, `S-e`, undo. Plover gives `The`; this engine
gives an empty field, because `record()` stores one history entry for the whole outline. DESIGN.md
says "one undo takes back one stroke", and the research's acceptance criterion 6.1.4 says the
same, yet `test/engine.test.mjs` line 136 asserts the deviant behaviour.

### 9. The coach appears one stroke late

`noteStroke` (`src/ui/app.js` lines 93 to 109) sets the coach after the engine's change event has
already redrawn the ribbon (line 415), and nothing redraws it again.

- Spell `t h e`, then `T-n`. No coach chip. Only after the next stroke does "the · one flick"
  appear, beside the wrong word. (`coach.mjs` prints the ribbon after each step.)

### 10. Look up and the coach teach orthographic coincidences

`makePlanner().plan()` (`src/planner.js` lines 63 to 74) accepts any lexicon word as a stem if the
spelling happens to match, and the coach and Look up then teach it.

- Spell `t h i n g`, then *is*, then `.`: the coach chip reads "thing — the + ing"
  (`coach_thing.png`). Look up gives the same.
- Look up also teaches *only* = *on* + `-ly`, *bed* = *be* + `-ed`, *sing* = *se* + `-ing`,
  *called* = *cal* + `-ed`, *early* = *ear* + `-ly`, *better* = *bet* + `-er`, *letter* =
  *let* + `-er`, *bring* = *br* + `-ing`, *per* = *pe* + `-er`, *died* = *di* + `-ed`, and
  *dinner*, *summer*, *corner*, *offer*, *reply*, *evening* in the same way. The evaluator counts
  these as savings.

No stenographer would accept *thing* written as *the*-ing; a lookup tool that suggests it destroys
trust in every other suggestion.

### 11. The brief layer contains junk and hijacks common words

- Dropped-g and colloquial film spellings are briefs: `someth` → somethin, `noth` → nothin,
  `gett` → gettin, `watc` → watchin, `drin` → drinkin, `kidd` → kiddin, `sitt` → sittin,
  `driv` → drivin, `fuc` → fuckin, `woul` → woulda, `coul` → coulda, `shou` → shoulda.
- 54 of the 400 commonest words, spelled one letter short, are briefs for a different word, and
  the grey ghost proposes that word while the learner is spelling: `whe` → whether while spelling
  *when*, `som` → somewhere for *some*, `sur` → surprise, `lon` → london, `pla` → place while
  spelling *plan* or *play*.
- Truncations and typos in real SMS become other words: `gua` → guard, `fai` → faith,
  `whic` → whichever.

DESIGN.md calls these prefixes "unambiguous"; they are the first free prefix in frequency order.

### 12. Proper nouns from the corpora are briefs, and they expand in lowercase

`display()` (`src/orthography.js` line 138) capitalises only days, months, *English*, *Christmas*
and *God*. At least 37 briefs are names or places.

- *I'm*, `f l y i n g`, *to*, `l o n`, *tomorrow*. Expected `I'm flying to London tomorrow`.
  Actual `I'm flying to london tomorrow`. Also `dav` → david, `singa` → singapore, `jas` → jason,
  `nic` → nicole, and the common given names *Ava* and *Bea* become *available* and *beautiful*.

DESIGN.md says the geometric mean "removes character names ... without a stop list". It does not.

### 13. Further orthography failures

I tried 128 base and ending pairs; 25 are wrong, besides defect 1.

- `occur` + `-ed` → occured; `defer` + `-ed` → defered (a test case the research's own acceptance
  criteria name); `occur` + `-ing` → occuring; `quit` + `-ing` → quiting (the comment in
  `doublesFinal` claims *qu* is handled; it is not); `equip` + `-ed` → equiped.
- `panic` + `-ed` → paniced; `panic` / `picnic` + `-ing` → panicing, picnicing.
- `potato`, `hero` + `-s` → potatos, heros; `quiz` + `-s` → quizes; `child`, `man`, `woman`,
  `life`, `wife` + `-s` → childs, mans, womans, lifes, wifes.
- `good`, `bad`, `far` + `-er` → gooder, badder, farrer; `public` + `-ly` → publically;
  `shy` + `-ly` → shily.
- Casing: `NASA` + `-s` → NASAS; `iPhone` + `-s` → iphones; `DM` + `-ed` → DMED.

### 14. Endings with nothing to attach to type raw text

- `SP-ne` in an empty field gives `ing`. *the*, `.`, `SP-ne` gives `The.ing`.
- Endings are never checked against the word list: `proba` + `-ly` gives `Probablily`,
  `cou` + `-ing` gives `Coulding`. Plover would at least show these as untranslates.

### 15. Ribbon and history desynchronise around undefined strokes

- `T-n`, `T-e`, an undefined stroke, undo. The text loses *you*, but the tape still shows *the*
  and *you*, because `backspace()` pops the tape's last entry (the undefined one) rather than the
  entry it undid (`src/engine.js` line 140).
- Longest match skips over an undefined stroke: with `T-n/S-e` defined, `T-n`, undefined, `S-e`
  gives `The following`, and the tape then shows `T-n` twice (`src/engine.js` line 114 splices the
  wrong entries).

In the shipped keyboard these are only reachable through user packs or with the English pack
switched off, because the keyboard turns an undefined curl into its flick.

### 16. Undefined curls silently type the flick, and Record cannot reach them

`resolve()` in `src/ui/keyboard.js` lines 329 to 330 types the straight flick when the curl is
undefined. The research's criterion 6.1.7 asks that an undefined stroke never produce a guessed
word. Worse, Record goes through the same path:

- Dictionaries, Record, draw `I-ne-cw`. Expected outline `I-ne-cw`. Actual `I-ne`, and adding it
  overrides *if*. The same happens on `A-ne-back`. The fourteen curls the theory leaves empty are
  exactly where a user would want to put their own words.

### 17. The dictionary editor accepts what the engine cannot honour

- Adding `T-n` → `{*-|}` is accepted; the key face then reads `*-|`, and *the*, `p a r i s`,
  that stroke gives `The paris *-|`. `{~|"}` types `~|"`. Unsupported operators should be refused
  at entry.
- Outlines `gr8` and `e.g` are accepted, but digits and full stops can never be part of a spelled
  outline in steno mode, so they never fire.
- A `{^}` at the start of a spelled outline's translation does not remove the space the first
  letter inserted: `lol` → `{^}😂` gives `THE 😂`.

### 18. Inserting text mid-message gets the spacing wrong

- Field `I am happy`, caret after `am `, *really* (`R-se`). Expected `I am really happy`. Actual
  `I am reallyhappy`. Spelling *very* there gives `veryhappy`.
- Caret at the start of `You are`, *hey* and comma. Actual `Hey,You are`.

The engine has no right-hand context. An iOS keyboard does (`documentContextAfterInput`).

### 19. A shallow up-left flick on the corner key deletes instead of opening numbers

`slideDelete` (`src/ui/keyboard.js` lines 286 to 297) starts deleting once the drag is more than
1.4 times as wide as it is tall and older than 160 ms, which overlaps the up-left flick sector
(22.5 to 67.5 degrees).

- With *The you* typed, a 250 ms flick from the corner key about 35 degrees above horizontal
  deleted *you* and stayed in steno. At 45 degrees it opened the number page correctly (`ut.mjs`).

### 20. Visual polish of the guide and ribbon

- On S, the back-curl chip *same* overlaps the selected *she's* chip (`g4.png`).
- On T, the left-curl chip *time* is clipped at the screen edge (`g1.png`).
- Curls that end toward the screen edge on the outer keys run off the glass: the `S-se-ccw` path
  leaves the keyboard on the right (`g4.png`).
- The coach chip runs its text together: `thingthe + ing` (`coach_thing.png`).

### 21. The texting pack rewrites the user's own shorthand by default

8.1 % of the held-out SMS messages contain a token the default stack would rewrite: `tmr` →
tomorrow, `nvm` → never mind, `btw` → by the way, `cya` → see you, `idk` → I don't know. People
write these on purpose and in their own voice. In steno, an abbreviation is something you chose
to stroke; here the user's natural spelling is silently replaced.

### 22. Switching off the English pack removes the alphabet

`alphabetEntries()` is merged into the English pack (`src/packs.js` lines 55 and 106). A user who
switches English off to use only their own strokes is left with a keyboard that types nothing.

### 23. Lookup and tape fall short of the tools they borrow from

Look up shows one plan, without the dictionary that supplied it or any alternative. The ribbon
shows three chips and there is no log to export. Both are acceptance criteria in the research
(6.3.4 and 6.3.6).

## The claims, checked

These hold: 48 word flicks, 178 curls and six endings; flick words are 34.4 % of word tokens; the
top 100 words are 57.8 % and the top 300 are 74.0 % of tokens; the evaluator's table reproduces to
within 0.2 WPM (65.0 against the stated 65.2, 71.1 against 71.0, 79.9 against 79.8, and 3.34
against 3.33 strokes per word, so the document predates the last regeneration); the robustness
tool gives 97.57 % at sloppiness 1; the round trip passes 2,437 of 2,437; the engine is
deterministic and contains no language model.

These are overstated:

- "Contractions take fixed turns on every word that has them" (defects 2 and 3).
- "A curl is its relative": *the* curls to *time*, *think* to *tonight*, the apostrophe to
  *enough*. Many curls are simply other words on the same key.
- "Once enough of it has been spelled to be unambiguous" and "the next stroke commits it"
  (defects 7 and 11).
- "One undo takes back one stroke" (defect 8).
- "Spelling two words in a row is the only time the space bar is tapped": it is also needed after
  *I*, *a* and every brief before a spelled word, and 91 of the 300 commonest words are spelled.
- "A person who learns nothing loses nothing": on the SMS corpus the day-one row is 0.3 % worse
  than the letter keyboard, and `: ; " ( ) @ # & / $` now cost a page switch each way.
- "Removes character names ... without a stop list" (defect 12).
- Look up's "Every word has exactly one [stroke]": *of*, *do*, *be*, *on*, *their* and *can't*
  have none.
- The round trip: 3,000 messages were offered, 490 were skipped for characters, 70 had no script
  and 3 for abbreviation collisions, and the texting pack was switched off. The pass is real, but
  it excludes exactly the material behind defects 4, 6 and 21.

These are missing:

- The cost of errors. At 97.6 % per stroke and roughly three strokes a word, about one word in
  fourteen needs an undo and a rewrite, and the WPM model charges nothing for it. In real steno,
  accuracy and not stroke count decides whether people stay.
- Any measurement of hooks on a thumb, which the document admits.
- The evaluator's planner uses the coincidental decompositions of defect 10, and the briefs row
  assumes the typist knows where each of 2,624 arbitrary prefixes ends.

## The theory, as a theory

The 48 flicks are defensible and, because they are printed on the keys, easy to learn. The
endings on the space bar are consistent and teachable. Past that, the theory is not one I could
teach as a system.

The curls are a frequency-ordered brief table with a loose rule (a word that starts with one of
the key's letters), and the contraction rule fails in the places listed above. The families are
partly real (*you*, *you're*, *you'll*, *you've*; *will*, *would*, *won't*, *were*) and partly
not (*the*, *there*, *time*, *they*; *with*, *was*, *why*, *work*; the comma curls to *we* and
*working*; the full stop curls to *everything* and *which*).

The most damaging structural fact is that the O key carries nine letters and has no free
direction, so every word beginning with o, b, d, g, c, u, p, j or q can only be one of sixteen
letter curls. That is why *of* (the tenth commonest word), *do*, *be*, *on*, *go*, *get*, *one*,
*got*, *up*, *or*, *did*, *by* and *our* are spelled: nineteen of the hundred commonest words have
no one-stroke outline. The research asked for the whole top hundred. Meanwhile fourteen curl
positions on A, I and E sit empty because no worthy word starts with *a*, *v*, *i*, *x* or *z*.

The 2,624 spelled briefs are a deterministic autocomplete triggered at the word boundary. That is a
reasonable feature, but it is not what a stenographer means by a brief, and as generated it carries
names, film spellings and prefixes that hijack common words.

## Objections no bug fix will cure

1. **There is no writing system.** In steno, any word can be written in strokes by rule; that is
   what makes unseen words fast. Here about 230 words plus six endings have strokes, and
   everything else is letters with autocomplete. The research's own summary asks for a base that
   is "consistent, rule-derived". To earn the word, steno mode needs a compositional layer: affix
   strokes that combine with any base (`re-`, `un-`, `-ment`, `-tion`, `-ness`, `-ful`, `-able`,
   and the five contraction endings as one family), and either an orthographic skeleton theory
   (Teeline-style, consonants with the first vowel) or two-thumb half strokes. Phrasing in the
   manner of Jeff's phrasing (*I don't*, *do you*, *I'll be*, *I can't*) is where steno speed
   actually lives, and dismissing phrases because two flicks cost two flicks misses that a phrase
   stroke also carries the contraction and the capital.
2. **The first-letter family is the wrong constraint for this layout.** It is mnemonic, but on a
   grid where one key holds nine letters it starves the commonest function words. Allow a word on
   the key of its first or second letter, or give the O-family a home on the space bar's curls,
   and free the out-and-back on letter flicks: with automatic capitals and shift, a capital on
   every letter direction is a luxury that costs seventeen curls, eight of them on O.
3. **Prose vocabulary and the alphabet must not be one pack.** Profiles should start from letters
   and marks, and add English, texting or shell vocabulary on top. The shell profile then never
   sees *report* for `repo`, and switching English off leaves a working keyboard.
4. **Orthography must be Plover's, not mined from a noisy lexicon.** Candidate generation, a word
   list consulted for the specific base, a curated irregular table, and an untranslate marker when
   the result is not a word.
5. **Briefs triggered at the boundary need an explicit grammar.** Either a short curated set with
   a visible rule, or a commit gesture. As it stands the learner cannot know where any of 2,624
   prefixes ends without watching the ghost every word, and the ghost lies while they spell common
   words.
6. **Error recovery needs a steno answer.** Plover's `{*}` toggle and retro operators exist
   because misstrokes are normal. A "turn the last curl into the straight flick or the other
   turn" stroke would make hook errors cheap, and the evaluator should charge for errors at the
   measured rate.

## What would raise my score most, in order

1. Replace the orthography with Plover's rules and word list, add the 25 failures here and the
   research's acceptance cases as tests, and validate every ending against the word list.
2. Make contractions complete and composable: an apostrophe continues the word it attaches to,
   the five contraction endings form one family that works on any base, and the four rule
   violations go.
3. Split the alphabet from the English vocabulary and build per-context profiles, so the shell
   profile has no English briefs, hyphens glue, and literals from other pages join the token they
   sit in.
4. Relax the family constraint and free the out-and-back on letters so that the whole top hundred,
   including *of*, *do*, *be*, *on*, *go*, *get*, *can't* and *they're*, is one stroke each, and fill
   the fourteen empty curls.
5. Clean the brief layer: no names, no dropped-g or *woulda* forms, no brief on a prefix of a common
   word's spelling, capital proper nouns, and give *I* and *a* word strokes so that spelling after
   them does not glue.
6. Fix the planner so that Look up and the coach only teach real inflections, and fix the coach's
   one-stroke lag.
7. Bring the engine to Plover conformance where it claims it: one undo per stroke with
   retranslation for multi-stroke outlines, the retro operators, refusal of unsupported operators
   and unreachable outlines, Record on empty curls, and a stack the user can add to, reorder,
   import and export.
8. Use the host's right-hand context for spacing, separate the corner key's delete drag from its
   up-left flick, and fix the guide's overlapping and clipped chips.
9. Then measure: hook accuracy and time on real thumbs, error cost included, against each person's
   own letter entry.
