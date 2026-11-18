# 01 — Stenography: mechanisms, practice, and what survives on two thumbs

*Research note, 2026-11-17. Every non-obvious claim links to its source. Text in quotation marks is a direct quote. Figures marked **derived** are my own arithmetic or analysis, not a published measurement.*

This note answers four questions for the planned stenography mode in Wurstfinger: what machine stenography actually is at the level of mechanism, what working stenographers and hobbyists report about learning and using it, what has already been tried on phones and with few-key chorders, and which pieces survive the move from a 23-key, ten-finger machine to one or two thumbs on a 3 × 3 grid of glass keys. It ends with a transfer analysis and with acceptance criteria written the way an experienced stenographer and Plover contributor would review a "thumb steno" proposal.

**Vocabulary.** *Stroke* is used in the steno sense: one atomic unit of input that the translator looks up. *Flick* is what the Wurstfinger glossary calls a *swipe*, a directional gesture from the key centre ([GLOSSARY.md](../../GLOSSARY.md)). *Glide* means one touch that travels across several keys before it lifts. A glide is not the glossary's *slide*, which is a sustained drag on one held key, and the current touch engine does not support glides at all, because it binds each finger to the key it landed on for the finger's whole life ([03-current-keyboard-spec.md §6.1](03-current-keyboard-spec.md)).

**People.** The author of *The Art of Chording* now publishes as Thea Morin; her older forum posts and blog appear under Ted or Theodore Morin. Stanley "Stan" Sakai, a certified shorthand reporter and developer, blogs as "the Stanographer" ([blog](https://blog.stanographer.com/), [video profile](https://laughingsquid.com/how-stenography-differs-from-qwerty-typing/)). Aerick is the author of the Lapwing theory and *Lapwing for Beginners*. Peter Park writes the StenoKeyboards blog.

**Access limits.** The Plover Discord is not publicly readable, and Reddit refused automated access, so no Reddit post is quoted here. Practitioner quotes come from the Plover blog, the Plover Google Group, Hacker News, personal blogs and the theory books.

## Key findings

1. Steno's speed comes from **strokes per word**, not from fast fingers. Mark Kislingbury's 360 wpm record was "averaging .8 strokes per word and 4.8 strokes per second" ([Magnum Steno](https://www.magnumsteno.com/writingshort.html)). Thumbs on glass will be slower per stroke, so a thumb system wins only if it gets close to one stroke per word.
2. The parts of steno that are pure software transfer intact: the dictionary, longest-match translation with retroactive rewriting, stroke-level undo, orthography rules on attach, the formatting operators, dictionary stacking, the paper tape, lookup and suggestions. These are the core of what makes steno feel like steno, and Plover documents every one of them.
3. The parts that exist because ten fingers press 23 keys at once do not transfer: steno order as a rule, multi-key letter chords, inversion, and the full phonetic onset/vowel/coda theory. Reproducing them on a phone is cargo cult.
4. Practitioners quit for three reasons that a phone design can address directly: the physical strain of the machine, the "binary" cliff when a word is missing from the dictionary, and inconsistent theory and dictionaries. Wurstfinger's existing letter gestures are a far better fingerspelling fallback than steno's own, which removes most of the cliff.
5. The steno community is strongly deterministic. Plover lists context-based disambiguation as a bad idea because it makes output unpredictable ([Plover docs](https://plover.readthedocs.io/en/latest/system-dev/steno-system.html)), and Lapwing exists to give learners "one outline that is correct for a given pronunciation" ([Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)). Steno's answer to prediction is a suggestion window that teaches a shorter stroke, never silent auto-insertion.
6. Every touchscreen steno attempt so far has copied the 22-key layout for fingers. The one recent iPhone product dropped lift-to-commit in favour of an explicit Translate key in the space-bar position, because lifting a full chord cleanly was unreliable on a small screen ([Steno Keyboard Pocket](https://apps.apple.com/us/app/id6792498937)). No measured speed for any phone steno system was found.
7. Established abbreviation conventions exist and partly agree: *n* = "not" in Braille, Gregg and Dutton Speedwords; *m* = "more", *g* = "go" and *c/k* = "can" in Braille and Gregg. Braille deliberately gives no wordsign to *a*, *i* and *o*, which are words in their own right.
8. iOS custom keyboards can only insert text, delete backward and move the caret; they cannot send key combinations, and without Full Access they cannot share files with their containing app ([Apple, App Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html)). Steno's shortcut and modifier dictionaries are therefore mostly unavailable, and dictionary import needs an explicit design.

---

## 1. Mechanism inventory

### 1.1 The machine, the chord and the stroke

A steno machine has 22 or 23 keys: an initial consonant bank for the left hand, vowel keys `A O E U` for the thumbs, a final consonant bank for the right hand, an asterisk in the middle and a number bar ([Art of Chording, How steno works](https://www.artofchording.com/introduction/how-steno-works.html); [Plover glossary](https://plover.wiki/index.php/Glossary)). The writer presses several keys together, and "upon release, the keys are read from left-to-right" (Art of Chording). One such press is a **stroke**; a **chord** is a group of keys pressed together that stands for one sound, such as `TPH-` for an initial N; an **outline** is "one or more strokes that translate to an affix, word, or phrase" ([Plover glossary](https://plover.wiki/index.php/Glossary)).

*Problem solved:* a whole syllable, word or phrase is entered in one hand motion, and because the machine reads the keys on release, the order in which fingers land does not matter. Typing speed stops being limited by sequencing individual letters.

Speed is the product of two factors. Kislingbury puts it as "Speed is a combination of exactly, and only, two things": how few strokes you write and how fast your fingers move ([Magnum Steno](https://www.magnumsteno.com/writingshort.html)). Plover's design guide tells system designers to "expect speeds of about 3 to 4 chords for second for most chorded boards" ([Plover, Picking a board layout](https://plover.readthedocs.io/en/latest/system-dev/board-layout.html)). Court reporters must certify at 225 wpm, and Plover's FAQ puts amateur users at "160+ words per minute" with practice ([Plover FAQ](https://plover.wiki/index.php/FAQ)).

### 1.2 Steno order

Every stroke is a subset of the fixed sequence `STKPWHRAO*EUFRPBLGTSDZ` ([Plover glossary](https://plover.wiki/index.php/Glossary)). Right-bank keys are written with a leading hyphen when no vowel separates them, so `-T` is the final T and `T-` the initial one.

*Problem solved:* a chord is a set, and sets have no order. Steno order turns each set into one canonical string, so a dictionary can be keyed on it and every key has exactly one position. It also lets the same letter mean an onset on the left and a coda on the right ("the left side of the keyboard is dedicated to the beginning of the syllable", [Art of Chording](https://www.artofchording.com/introduction/how-steno-works.html)).

### 1.3 Phonetic compression and multi-key letters

There are not enough keys for one key per sound, so the less common consonants are combinations of keys on the same bank: `TP` is F, `TPH` is N, `PH` is M, `TKPW` is G, and an initial Z is "commonly chorded by the entire initial bank, STKPWHR, in order to avoid thousands of potential conflicts" ([Wikipedia, Stenotype](https://en.wikipedia.org/wiki/Stenotype); [Thea Morin, 2014](https://typingwithted.blogspot.com/2014/08/learning-plover.html)). Outlines are written by sound rather than spelling: "Because chords are roughly syllables, writing in stenography feels more like speaking than spelling" ([Art of Chording](https://www.artofchording.com/introduction/how-steno-works.html)).

*Problem solved:* a 23-key machine can spell every English syllable, and the writer never has to convert speech to spelling. Plover's design guide notes the trade-off: phonetic systems "are great for dictation speed", but "the greatest weakness of phonetic systems are homophones", and they "rely on dictionaries much more than orthographic systems". Orthographic (spelling-based) systems such as Velotype can in principle write any word without a dictionary ([Plover, Types of stenographic systems](https://plover.readthedocs.io/en/latest/system-dev/steno-system.html)).

### 1.4 Folding and inversion

**Folding** (also called tucking) puts a suffix into the same stroke as the word: "instead of writing `HROF` then `-D`, it makes sense to 'fold-in' the `-D` and write `HROFD`" ([Art of Chording, Prefixes and suffixes](https://www.artofchording.com/multistroke/prefixes-and-suffixes.html)). Plover theory folds only `-S`, `-Z`, `-D` and `-G` automatically, and Plover's system definition names exactly those four as `SUFFIX_KEYS` ([english_stenotype.py](https://github.com/openstenoproject/plover/blob/main/plover/system/english_stenotype.py)). Lapwing adds R-, L-, T- and E-folding as named shortening techniques ([Lapwing ch. 17](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-17.md)).

**Inversion** writes two neighbouring sounds out of steno order in one stroke, for example `WAEURT` for "waiter" and `STKUS` for "discuss"; it is allowed "only with neighboring sounds and only once per stroke" ([Art of Chording, Inversion](https://www.artofchording.com/compounds/inversion.html)).

*Problem solved:* both reduce strokes per word. Inversion exists only because a simultaneous chord cannot express order.

### 1.5 Briefs

A brief is "a shortcut to save time": a single stroke for a common word such as "with" or a long one such as "particular" ([Art of Chording](https://www.artofchording.com/introduction/how-steno-works.html)). The Plover glossary calls them "less rigid mappings" of outlines to words or phrases, also known as abbreviations, short forms or arbitraries ([Plover glossary](https://plover.wiki/index.php/Glossary)).

*Problem solved:* the most frequent words cost one stroke regardless of syllable count, which is how professionals get below one stroke per word.

### 1.6 Phrase briefs and phrasing systems

A **phrase brief** writes several words in one stroke. Lapwing's examples include `ST` for "is it", `TPH-T` for "in the" and `SKPU` for "and you" ([Lapwing ch. 24](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-24.md)).

A **phrasing system** generates phrases compositionally instead of listing them. Jeff's phrasing builds one stroke from a starter or pronoun on the left bank, a modal (do, can, shall, will, plus `*` for negation) on `AO*`, structure words such as "just" and "never" on `EUF`, and a verb on the right bank with `-D` for past tense. `SWR-GT` gives "I go to", `SWR-GTD` "I went to", `SWRAFGTD` "I could have gone to" and `KWHRO*UFGTD` "he just shouldn't go to" ([jeff-phrasing README](https://github.com/jthlim/jeff-phrasing)). Its motivation is consistency: other systems allow unusable output such as "I really doesn't wanted", whereas this dictionary "automatically matches tenses and verb forms, which makes it easier to learn because there's less to remember." It is a Python dictionary, word choices come from "statistical data and Google Books N-gram Viewer", and it "supports full reverse lookup, so you can see how to stroke phrases in Plover's suggestions window." Lapwing recommends it in place of memorised phrase briefs ([Lapwing ch. 24](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-24.md)).

*Problem solved:* function-word phrases are the bulk of running text, and a rule-generated phrase system gives thousands of one-stroke phrases with little memorisation.

### 1.7 Prefix and suffix strokes

Affix strokes attach to the neighbouring word: `RE` for `{re^}`, `-G` for `{^ing}`, `-D` for `{^ed}` ([Art of Chording](https://www.artofchording.com/multistroke/prefixes-and-suffixes.html)). Lapwing uses a `KWR` "linker chord" to mark a stroke as attaching to the previous word, and says affixes should be used "only ... when it semantically makes sense", so the "er" in "coriander" is not written with `{^er}` ([Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)).

*Problem solved:* one dictionary entry per root plus a small set of affix strokes covers whole word families, and words missing from the dictionary can still be built from parts.

### 1.8 Orthography rules on attach

An orthography-aware suffix such as `{^ish}` adjusts spelling at the join, so `RED/EURB` produces "reddish" ([Plover translation language](https://plover.readthedocs.io/en/latest/translation_language.html)). Plover's English system implements this with 33 regular-expression rules covering silent-e removal (narrate + ing = narrating), consonant doubling (defer + ed = deferred), y-to-i (beauty + ful = beautiful), sibilant plurals (establish + s = establishes), consonant-plus-y plurals (cherry + s = cherries) and many derivational suffixes, plus a list of American English words used to validate candidates and an alias table that treats *able* and *ible* as variants ([english_stenotype.py](https://github.com/openstenoproject/plover/blob/main/plover/system/english_stenotype.py)).

*Problem solved:* suffix strokes stay universal (one `{^ing}` for every verb) while output stays correctly spelled.

### 1.9 The asterisk

"In stenography the asterisk is always used to undo the last stroke"; in Plover theory it is also used "to make certain sounds, resolve ambiguous strokes, fingerspell, and is often used as a briefing tool" ([Art of Chording, *, D and Z](https://www.artofchording.com/layout/d-and-z.html)). Plover's default undo stroke is `*` ([english_stenotype.py](https://github.com/openstenoproject/plover/blob/main/plover/system/english_stenotype.py)). Lapwing uses it to mark the second word of a compound (`AOEU/HRA*RB` for "eyelash") and to pick the word over a prefix that owns the bare stroke ([Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)). Cocoa theory was created partly to reduce "the overuse of disambiguation by asterisks", preferring spelling-based disambiguation ([cocoa-specs](https://github.com/Kaoffie/cocoa-specs)). Plover also has a retroactive version, `{*}` or `=retro_toggle_asterisk`, which adds or removes the asterisk on the stroke already written ([translation language](https://plover.readthedocs.io/en/latest/translation_language.html)).

*Problem solved:* one key gives whole-stroke undo, plus a second "plane" of outlines for homophones and variants without a new chord.

### 1.10 Conflicts and determinism

A **conflict** is one stroke with several possible translations; traditional "conflict-based" theories leave the choice to a human editing the transcript afterwards. "Plover is a realtime-only system and does not support conflict-theories" ([Plover glossary](https://plover.wiki/index.php/Glossary)). In Plover's translator each outline maps to exactly one translation, and "entries farther up the dictionary stack will override, rather than augment, entries lower in the stack" ([Plover design](https://plover.readthedocs.io/en/latest/design.html)). Theories resolve homophones with distinct outlines: Lapwing writes "cent" as `KREPBT` because `SEPBT` is already "sent" ([Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)). Plover's system-design guide lists three bad ideas: category-based systems, orderless systems (which cannot tell "rat" from "tar"), and context-based disambiguation, "a system where many words are assigned the same stroke", which makes output unpredictable ([Plover, Types of stenographic systems](https://plover.readthedocs.io/en/latest/system-dev/steno-system.html)).

*Problem solved:* realtime output with no after-the-fact editing, and a writer who can predict exactly what each stroke will produce.

### 1.11 Longest-match multi-stroke translation, retroactive rewriting and word boundaries

Plover keeps a buffer of recent strokes (100 by default) and "searches the dictionary stack for the longest possible series of strokes first", then one fewer, down to the last stroke alone; the maximum is the longest entry in any enabled dictionary, declared per dictionary as `LONGEST_KEY` ([Plover design](https://plover.readthedocs.io/en/latest/design.html)). When a later stroke completes a longer outline, earlier output is rewritten, and the renderer computes the minimum change, so turning "cat" into "catalog" inserts only the missing letters (same source). An unmatched stroke is an **untranslate** and its raw steno is output instead ([Plover glossary](https://plover.wiki/index.php/Glossary)).

The cost is the **word boundary error**: writing "cat" then "log" yields "catalog", because `KAT/HROG` is a dictionary entry ([Plover glossary](https://plover.wiki/index.php/Glossary); [main.json](https://github.com/openstenoproject/plover/blob/main/plover/assets/main.json)). Retro operators fix boundaries after the fact: `{*?}` inserts and `{*!}` deletes the space between the last two strokes ([translation language](https://plover.readthedocs.io/en/latest/translation_language.html)).

*Problem solved:* long words are written syllable by syllable without a "word finished" key, because the translator revises its output as evidence arrives. Undo removes the last stroke and restores the previous translation; key combinations cannot be undone because they "often have no inverse" ([Plover design](https://plover.readthedocs.io/en/latest/design.html)).

### 1.12 Fingerspelling and glue

"Fingerspelling comprises rules that allow for output of individual characters to handle arbitrary strings of text" ([Plover glossary](https://plover.wiki/index.php/Glossary)). In Plover and Lapwing a letter is its left-hand chord plus the asterisk (`A*` a, `PW*` b, `TKPW*` g, `STKPW*` z), with `-P` added for capitals ([Lapwing ch. 18](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-18.md)). Fingerspelled letters use the **glue** operator `{&x}`, which attaches only to other glued translations, so `HE/HROE/A*/PW*/KR*` gives "hello abc" (same source). Thea Morin found it painful as a beginner: "every letter takes at least two keys to hit, with the largest being Z. To just type Z takes a total of 6 keys being hit simultaneously" ([2014](https://typingwithted.blogspot.com/2014/08/learning-plover.html)).

*Problem solved:* anything outside the dictionary (names, acronyms, identifiers, flags) can still be written without leaving steno.

### 1.13 Plover's translation language

Dictionary values are written in Plover's translation language ([reference](https://plover.readthedocs.io/en/latest/translation_language.html)). The operators that matter for a thumb system:

| Group | Syntax | Effect |
| --- | --- | --- |
| Attach | `{^}x`, `x{^}`, `{^x^}`, `{^^}` | attach to previous, next, both sides; delete the space |
| Orthographic attach | `{^ing}`, `{re^}` | affix with spelling rules applied |
| Force space | `{^ ^}` | a space even where attachment would occur |
| Glue | `{&x}` | attaches only to other glued text (fingerspelling, digits) |
| Capitalise next | `{-\|}` | capitalise the next word; `{^}{-\|}` builds CamelCase |
| Capitalise previous | `{*-\|}` | retroactively capitalise the last word |
| Lowercase next / previous | `{>}`, `{*>}` | force lowercase first letter |
| Uppercase next / previous | `{<}`, `{*<}` | whole word in capitals |
| Carry capitalisation | `{~\|"^}` | punctuation that passes capitalisation through |
| Punctuation | `{.}` `{?}` `{!}` `{,}` `{:}` `{;}` | stops capitalise the next word, commas do not |
| Retro spacing | `{*?}`, `{*!}` | insert or delete the space between the last two strokes |
| Repeat, toggle | `{*+}`, `{*}` | repeat last stroke; toggle asterisk on the last stroke |
| Conditional | `{=regex/match/nomatch}` | e.g. `{=[AEIOUaeiou]/an/a}` chooses by the *following* text |
| Key combo | `{#control(z)}`, `{#Return}` | send keystrokes; not undoable |
| Modes | `{mode:caps}`, `{mode:camel}`, `{mode:snake}`, `{mode:set_space:_}`, `{mode:reset_case}` | persistent casing and spacing |
| Cancel, null, word end | `{}`, `{#}`, `{$}` | cancel formatting; output nothing; mark word end |
| Whitespace | `\n`, `\t` | undoable newline and tab |
| Commands | `{plover:add_translation}`, `{plover:lookup}`, `{plover:suggestions}`, `{plover:toggle}` | tool and control commands |
| Plugins | `{plover:cmd:arg}`, `{:meta:arg}`, `=macro:arg` | extension points |

*Problem solved:* the dictionary carries spacing and capitalisation intent, so the writer never types a space and rarely a Shift, and formatting stays correct through undo.

### 1.14 Dictionaries: formats, stacking and programmatic dictionaries

**Formats.** JSON is "the most common format": each key is an outline in canonical notation with strokes separated by slashes (`"KAT/HROG"`) and each value a translation; RTF/CRE is supported for exchange with commercial CAT software but "generally not recommended" for maintenance, and plugins read the proprietary formats of Case CATalyst, digitalCAT and Eclipse ([Plover, Dictionary formats](https://plover.readthedocs.io/en/latest/dict_formats.html)). Community plugins add Markdown dictionaries, which Paul Fioravanti uses for most of his ([steno-dictionaries](https://github.com/paulfioravanti/steno-dictionaries)).

**Stacking.** The default stack is `user.json`, `commands.json`, `main.json`, top first ([english_stenotype.py](https://github.com/openstenoproject/plover/blob/main/plover/system/english_stenotype.py)), and higher dictionaries override lower ones ([Plover design](https://plover.readthedocs.io/en/latest/design.html)). Users choose the order to pick a style; Lapwing's author tells Plover-theory converts to put `lapwing-base` above `main.json` to prefer Lapwing write-outs, or below it to keep Plover briefs ([Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)). The Dict Commands plugin enables, disables and reorders dictionaries from a stroke ([awesome-plover](https://github.com/opensteno/awesome-plover)).

**Programmatic dictionaries.** A Python dictionary is "a single UTF-8 source file" with `LONGEST_KEY`, a `lookup(key)` that returns a translation for a tuple of strokes "or raise KeyError", and an optional `reverse_lookup(text)` ([plover_python_dictionary](https://github.com/openstenoproject/plover_python_dictionary)). Lapwing explains why the symbol and modifier systems use them: they "generate their translations 'on the fly'", parsing each part of the outline, which suits "systematic dictionaries such as those for writing keyboard shortcuts and symbols" ([Lapwing ch. 25](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-25.md)).

*Problem solved:* personal and domain vocabulary lives in small files that override the base theory, and systematic subsystems are code rather than thousands of listed entries.

### 1.15 Number entry

The number bar turns the top-row keys into digits (`S T P H A O F P L T` → `1 2 3 4 5 0 6 7 8 9`); several digits in one stroke come out in steno order (`#STPHAF` = 123456), adding `EU` reverses them (`#TPEU` = 32), and digit strokes glue to each other ([Art of Chording, Basic number bar](https://www.artofchording.com/layout/basic-number-bar.html)). Lapwing replaces this with a calculator-style numpad on the right hand (`#-R` 1, `#-B` 2, `#-G` 3 …), vowel keys for trailing zeros (`#EUPB` 5000), and `T` to stop a number gluing to neighbouring glued text ([Lapwing ch. 18](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-18.md)).

### 1.16 Commands, shortcuts and symbols

Plover ships a 37-entry `commands.json` that maps strokes to editing keys and control commands: `STPH-R` → `{#Left}{^}`, `SKW-BGS` → `{#Return}{^}`, `TK*EL` → `{#Delete}`, `KHR-BG` → Control-C, `TKUPT` → add translation, `PHRO*F` → suspend Plover ([commands.json](https://github.com/openstenoproject/plover/blob/main/plover/assets/commands.json)).

**Emily's Symbols** types "(pretty much) every symbol" in one stroke with spacing and capitalisation. A reserved left-hand starter (`SKWH`, a chord no English word uses) marks the stroke; the right hand picks a symbol by shape, because "all of the patterns for symbols are done according to shape, rather than phonetics or briefs"; `E` and `U` choose one of four variants; `A` and `O` add a space before or after; `*` capitalises the next word; `-S` and `-T` repeat the symbol two, three or four times ([emily-symbols](https://github.com/EPLHREU/emily-symbols)). The table in `emily-symbols.py` defines about 34 shape patterns with four variants each, so roughly 130 symbols and keys (**derived**, my count). **Emily's Modifiers** reserves a right-hand ending (`-LTZ`), encodes Control, Shift, Super and Alt on `FRPB` in any combination, and takes the key itself from left-hand fingerspelling, a binary digit pad or a symbol plane ([emily-modifiers](https://github.com/EPLHREU/emily-modifiers)).

*Problem solved:* a closed, learnable grammar for symbols and shortcuts instead of hundreds of unrelated briefs. Lapwing's author still advises against drilling them: "It's difficult to learn these by drilling them, so instead I recommend referring back to this page you need to", with printed charts on the wall ([Lapwing ch. 25](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-25.md)).

### 1.17 Paper tape, lookup, suggestions and add-translation

Plover's built-in tools include a stroke display (the paper tape), a lookup window and a suggestions window, the latter two since version 3.0 ([release notes](https://github.com/openstenoproject/plover/releases/tag/v3.0.0)). The paper tape shows which keys each stroke contained, which is how a writer diagnoses misstrokes, *dragging* (an extra key pulled into a stroke) and *stacking* (two strokes merged into one) ([Plover glossary](https://plover.wiki/index.php/Glossary)). The Tapey Tape plugin shows strokes beside translations with "bars showing hesitation time" and suggestions "whenever you write something using more strokes than necessary", including when `{^}` was used where an affix stroke existed, and treats a run of fingerspelling as one word ([plover-tapey-tape](https://pypi.org/project/plover-tapey-tape/)). Clippy logs inefficient strokes to a file ([plover_clippy](https://github.com/tckmn/plover_clippy)). `{plover:add_translation}` opens a dialog to define a new entry mid-sentence ([translation language](https://plover.readthedocs.io/en/latest/translation_language.html)).

Lapwing's guidance on the lookup tool is instructive: learners should pick "the longest outline available" because short ones are usually briefs, and should look up roots separately because the dictionary does not list every affixed form, as with `THOR/KWROE/HREU` for "thoroughly" ([Lapwing ch. 3](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-03.md)).

*Problem solved:* the writer can see what the machine heard, find how to write anything, and learn shorter outlines from their own writing, all without leaving the flow.

### 1.18 The theories compared

| Theory | Character | Source |
| --- | --- | --- |
| Phoenix | "holds tight to phonetic rules and therefore is easier to learn, but a little more stroke-intensive" | [Art of Chording](https://www.artofchording.com/introduction/theories-and-dictionaries.html) |
| StenEd | "the base theory is phonetic, but the most common words and phrases are available in shortcut form" | same |
| Magnum Steno | memory-heavy: "harder to learn, but produce more text for less movement, at the cost of mental effort"; Kislingbury's own record at 0.8 strokes per word | same; [Magnum](https://www.magnumsteno.com/writingshort.html) |
| Plover theory | "has its roots in StenEd, but leans slightly more to the memory-intensive side"; its dictionary is Mirabai Knight's working dictionary | [Art of Chording](https://www.artofchording.com/introduction/theories-and-dictionaries.html); [Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md) |
| Lapwing | "Plover theory but more defined", "always one outline that is correct for a given pronunciation"; strict syllable splitting | [Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md) |
| Cocoa | Plover-derived, spelling-based disambiguation instead of heavy asterisk use | [cocoa-specs](https://github.com/Kaoffie/cocoa-specs) |

Plover's `main.json` illustrates the "memory-intensive, organically grown" end. It has 147,424 entries, of which 27,764 are single strokes; "and" has 12 outlines, "monotonous" 7, "stenographer" 10 and the period 12, because the dictionary keeps alternates and misstrokes that its owner made over years (**derived**, my count of [main.json](https://github.com/openstenoproject/plover/blob/main/plover/assets/main.json)). Lapwing's author shows the seven "monotonous" entries and notes that a natural eighth, `PHOPB/TPHOT/TPHUS`, is missing, which is exactly the inconsistency a learner trips over ([Lapwing Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)).

---

## 2. What practitioners actually report

### 2.1 Learning curve

| Who | Context | Reported progress | Source |
| --- | --- | --- | --- |
| Plover FAQ | hobbyists | theory in 2–6 months, then 10–60 wpm; "6 to 18 months to reach speeds comparable to their QWERTY speed"; schools advertise two years but average "closer to 3 or 4" | [FAQ](https://plover.wiki/index.php/FAQ) |
| Mirabai Knight | steno school | "Most people can reach about 140 to 160 words per minute in steno in, I would say, three to six months. But getting that extra additional speed from 160 to 225, which is graduation speed, can take two to six years." Slide: "Nationwide dropout rate is 85%" | [PyCon 2013 transcript](https://openstenoproject.stenoknight.com/transcripts/pycon-2013-video-transcript.php) |
| Mirabai Knight | her own path | about six months to 100 wpm and a year to 200, with about six hours a week of drilling plus 35 hours a week of transcription work from 160 wpm on | [Google Group, 2016](https://groups.google.com/g/ploversteno/c/aCOdh9IdE7w) |
| Thea Morin | hobbyist | 2014: about 5 wpm after learning the chords, then 40 wpm on TypeRacer; 2015: "It took me 3 months to average 70, and I hovered there for about another 3 months" | [blog](https://typingwithted.blogspot.com/2014/08/learning-plover.html); [Google Group](https://groups.google.com/g/ploversteno/c/9CCnj6JVX08) |
| Aerick | hobbyist | three months to a consistent 30 wpm; at six months 150 wpm peak but 90 average; six months later 180; "Another year and a half after that, I completely switched to steno for all computer tasks" | [Lapwing ch. 3](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-03.md) |
| Peter Park | hobbyist, about 20 minutes a day | 50 wpm after three to four months, 120 at six, 149 at nine, about 160 at fourteen | [StenoKeyboards](https://stenokeyboards.com/blogs/posts/how-long-does-it-take-to-get-good-at-steno) |
| Amber | hobbyist | faster in Plover than on QWERTY after about six months, against two decades of touch typing | [Plover blog, 2012](http://plover.stenoknight.com/2012/10/guest-post-ambers-advice-to-plover.html) |
| suby (HN) | court-reporting school | "240+ WPM with 98+% accuracy, it took me about a year and a half"; classmates "there for 4+ years, seemingly unable to reach the graduation speed" | [Hacker News](https://news.ycombinator.com/item?id=29024716) |
| Schools | outcome data | six-year graduation 8.1% at Brown College of Court Reporting; 20–23% at College of Court Reporting (cohorts of 22–36 students) | [College Factual, Brown](https://www.collegefactual.com/colleges/brown-college-of-court-reporting/outcomes/graduation-and-retention/); [College Factual, CCR](https://www.collegefactual.com/colleges/college-of-court-reporting-inc/outcomes/graduation-and-retention) |

The consistent shape is a slow first quarter-year (single digits to 30–50 wpm), parity with QWERTY somewhere between six and eighteen months, and a long tail for professional speed. Lapwing's author summarises it as "Most people take 6 months to a year to reach their old typing speed" and compares the difficulty to "learning a musical instrument" ([Lapwing ch. 3](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-03.md)).

### 2.2 What makes people quit

**The body.** suby: "I left stenography because I felt like it was destroying my body. It takes a toll on your hands, shoulders, body" ([HN](https://news.ycombinator.com/item?id=29024716)). In 2026 Mirabai Knight reported that a video on steno was cancelled because the producer "bought a non-ergonomic steno keyboard and wound up getting a repetitive stress injury from trying to learn steno" ([Plover blog](http://plover.stenoknight.com/2026/05/answer-not-in-progress.html)).

**The out-of-dictionary cliff.** xkfm on HN: Plover is "more like learn this theory, and you'll be able to type 85-95% of your sentence really fast. Also, whenever you get to word that's not in your dictionary, you go from typing say 150wpm to basically 0 ... Using plover is very binary. When it works, it's incredible, when it doesn't, it sucks" ([HN](https://news.ycombinator.com/item?id=29024716)).

**Inconsistent theory and the expectation to customise.** The same writer disliked that "it's heavily encouraged that every stenographer heavily modify their dictionary, making it harder to learn. There's a million and one different theories" (same thread). Aerick: "The inconsistencies make it hard for beginners and learners" ([aerick.ca](https://aerick.ca/steno/dictionary-building/)). Thea Morin on *Learn Plover!*: "it just dumps on a bunch of briefs for common words, punctuation, and affixes as an afterthought" and "You don't end up writing coherent sentences in Learn Plover! until the end of the book" ([Art of Chording, Why this book](https://www.artofchording.com/introduction/why-this-book.html)).

**The slow start.** Thea Morin: "At first, learning was very, very slow. There are plenty of conventions, and 'intuitive' is not the first nor the last term I'd use to describe them" ([2014](https://typingwithted.blogspot.com/2014/08/learning-plover.html)). A 135 wpm QWERTY typist on HN decided against it because "learning steno theory is much like learning a new foreign language" ([HN](https://news.ycombinator.com/item?id=29024716)). Lapwing warns against switching on day one: "If you try to ditch regular typing too early on, you will constantly encounter concepts that won't make sense and will only fuel your frustration" ([Lapwing ch. 3](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-03.md)).

**Typing is not the bottleneck.** Programmers in particular say so: "My bottleneck when programming is not typing speed but how quickly I can decide on what to type next" (suby), "I consider thinking to be the bottleneck" (yellow_lead) ([HN](https://news.ycombinator.com/item?id=29024716)); Lars Doucet started steno knowing that "speed has never been the bottleneck on my programming effectiveness" ([Game Developer](https://gamedeveloper.com/programming/stenography-for-programming)).

**Hardware.** Amber could not press `g` on a standard keyboard and rebuilt hers with R4 keycaps ([Plover blog](http://plover.stenoknight.com/2012/10/guest-post-ambers-advice-to-plover.html)); on glass, Mirabai found the iPad app "really frustrating, due to lack of haptic feedback" ([Google Group, 2013](https://groups.google.com/g/ploversteno/c/yAJnm9sjOM4)).

### 2.3 What made it click

Thea Morin describes the turn clearly: "There was a point a few weeks ago where suddenly steno started feeling much better to me ... With steno, you mostly have one stroke per word, and the 'backspace'-style key undoes the entire stroke. It's much friendlier on the brain to type in chords" ([2014](https://typingwithted.blogspot.com/2014/08/learning-plover.html)). Two things in that sentence are design requirements: one stroke per word, and undo at the granularity of the stroke rather than the character.

Amber credits owning the dictionary ("I might be the only person in the entire world who uses PH-RB for 'remember'. And that's okay") and early usefulness: "If all you know is 'and', 'but', and 'the' – great! You're already way ahead of the vast majority of people on the planet; you won't believe how much ground those three words cover" ([Plover blog](http://plover.stenoknight.com/2012/10/guest-post-ambers-advice-to-plover.html)). Mike Neale found it "more like playing a game than learning" ([Google Group, 2014](https://groups.google.com/g/ploversteno/c/bXygI7E4sHI)). Peter Park practised the physical side before theory, "I wanted my muscles to develop before really diving deep into learning theory", and stressed daily consistency ([StenoKeyboards](https://stenokeyboards.com/blogs/posts/how-long-does-it-take-to-get-good-at-steno)). Lapwing's structure is 26 short chapters, each with a test, and real-world use only after chapter 18 so that learners are not forced into heavy lookup ([Lapwing ch. 3](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-03.md)).

### 2.4 Memorising briefs versus rule-derived outlines

The community is split, and the split tracks goals. Speed-first writers brief heavily: Stan Sakai calls the advice to avoid briefs "Absolutely false. I frequently write strokes containing three words and I do fine", though he allows "You might prefer a more consistent (but longer) style of writing" ([Q&A](https://blog.stanographer.com/qa-cart-captioning-edition/)). A court-reporting graduate describes how "people end up making their own language constructs to shorten things (called briefs at my school)", to the point that "Everyone ends up typing in their own bastardized version of the standard" ([HN](https://news.ycombinator.com/item?id=29024716)).

Learner-first writers want rules first. Lapwing makes briefs optional ("It's not important to explicitly memorize them"), tells learners to focus on write-outs "until you start speed building", and argues against making learners fill dictionary gaps themselves: "I disagree with the notion that learners should be doing this right from the start" ([Lapwing ch. 3](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-03.md); [Appendix A](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Appendix-A.md)). Aerick's own compromise for awkward multi-syllable words is pragmatic: "simply not think about them too much and brief them instead" ([aerick.ca](https://aerick.ca/steno/dictionary-building/)). Mike Neale criticised courses that amount to "here is a list of briefs, learn them" ([Google Group](https://groups.google.com/g/ploversteno/c/bXygI7E4sHI)).

The synthesis practitioners converge on: a predictable, rule-derived outline must exist for every word; briefs are an optional accelerator layered on top; phrase briefs are better generated by a consistent system (Jeff's phrasing) than memorised one by one.

### 2.5 Steno for programming, shell commands, symbols and custom dictionaries

**Boilerplate and identifiers are the win.** Mirabai Knight: "Programming is especially suited for steno, because there's so much boilerplate to write again and again", with examples such as a one-stroke `def` scaffold and a one-stroke function name ([stenoknight.com](https://www.stenoknight.com/WritingCoding.html)). At PyCon 2013 she showed a Codecademy snippet taking 143 keystrokes on QWERTY and 54 in steno, defined `RIPT` as `raw_input("`, and recommended that for a variable "you're going to be writing in your program many times over, you can just take a second, define it as a one stroke, mnemonic syllable" ([transcript](https://openstenoproject.stenoknight.com/transcripts/pycon-2013-video-transcript.php)). For Vim she keeps ordinary mappings and fingerspells them: "I just write b on the steno keyboard, which is PW plus asterisk" (same). Her 2010 essay is honest that "I still haven't managed to find a good solution to programming using the steno keyboard" ([stenoknight.com](https://www.stenoknight.com/WritingCoding.html)).

**Shell commands are dictionary entries with formatting operators.** Stan Sakai's daily outlines include `TKPWEUPLT` → `{>}git commit`, `TKPW*EUPLT` → `{>}git commit -m "{^}{-|}`, `TKPWAUTS` → `{>}git status` and `TKHR*RB` → `./{^}` for paths in bash, plus `{^}{-|}` for camelCase ("set" + stroke + "attribute" gives "setAttribute") and attached brackets ([Stanographer](https://blog.stanographer.com/my-top-essential-plover-commands/)). The `{>}` lowercase operator and the attach operators do most of the work; the words themselves are ordinary.

**Symbols and modifiers come from Python systems, not theory.** "Lapwing theory really only covers writing English prose, and so symbols is beyond its scope", and the book points to Emily's Symbols, Emily's Modifiers and Abby's left-hand modifiers ([Lapwing ch. 25](https://github.com/aerickt/lapwing-for-beginners/blob/main/src/Chapter-25.md)). Paul Fioravanti writes boilerplate with editor snippets triggered from steno ("I take advantage of snippets to help me write code boilerplate more quickly and flexibly") and has outlines that run shell scripts and AppleScript ([steno-dictionaries](https://github.com/paulfioravanti/steno-dictionaries)).

**Some programmers go back.** Garrett Hopper found that "language syntax can be assigned chords" so that it "acts almost like code snippets", but later wrote that steno is "great for writing long prose" while he is "just as efficient writing code with a well organized keyboard layout" ([Keyhole Software](https://keyholesoftware.com/2017/08/14/stenography/)). An HN commenter warns that "putting modifier keys like Ctrl and Alt on normal letters is guaranteed to cause issues" ([HN](https://news.ycombinator.com/item?id=29024716)).

### 2.6 Determinism versus prediction

Steno practitioners treat determinism as the point. Plover's engine guarantees one translation per outline with override-only stacking ([design](https://plover.readthedocs.io/en/latest/design.html)), its design guide calls context-based disambiguation a bad idea ([system types](https://plover.readthedocs.io/en/latest/system-dev/steno-system.html)), and the only context-sensitive operator, `{=regex/match/nomatch}`, is itself deterministic on the following text ([translation language](https://plover.readthedocs.io/en/latest/translation_language.html)). A captioning advocacy piece puts it bluntly: "Stenography is 100% deterministic" ([Equal Entry](https://equalentry.com/?p=115915)). When CharaChorder's word chords were discussed, a commenter said chording "sounds like hardware autocorrect" and would hinder you "when you deviate from whatever set of words it was trained on" ([Hackaday](https://hackaday.com/2022/01/12/the-charachorder-keyboard-is-too-fast-for-competition)).

The evidence from ordinary phone typing is more mixed: in a study of 37,370 volunteers, "auto-correct usage correlates positively with entry rates, whereas word prediction usage has a negative correlation" ([Palin et al., MobileHCI 2019](https://www.repository.cam.ac.uk/items/809c909b-9301-4cad-955d-998bdce7e0e0)). Steno's own answer to prediction is the suggestions window and Tapey Tape: show the writer a shorter outline for what they just wrote, and leave the output alone.

---

## 3. Prior attempts on phones, touchscreens and thumbs

### 3.1 Steno on touchscreens

| System | Platform | How a stroke is entered | What happened |
| --- | --- | --- | --- |
| iStenoPad | iPad | full steno layout, multitouch | Mirabai Knight found it "really frustrating, due to lack of haptic feedback" ([Google Group, 2013](https://groups.google.com/g/ploversteno/c/yAJnm9sjOM4); [App Store](https://apps.apple.com/us/app/istenopad/id399707498)) |
| iStenoPhone | iPhone | "basically like Swype with a steno keyboard" | keys too large and close together; a reviewer reported it did not handle multistroke entries (same thread) |
| StenoKeyboard prototype (Brent Nesbitt, 2013) | Android | on-screen steno keys | "just a start", no backspace yet; Mirabai suggested much smaller, widely spaced keys so a swiped path does not hit neighbours (same thread) |
| Dotterel | Android | **Touch mode:** touching or dragging toggles keys, with the contact radius scaled by pressure; toggled keys latch until the finger lifts outside the keys or the user taps the translation preview. **Swipe mode:** each finger drags across keys, toggling them, and the stroke commits when every finger has lifted. Also accepts NKRO hardware | actively maintained (last push November 2026); ships Plover's `main.json`, regex orthography and an English stenotype ("Ireland") system definition ([repo](https://github.com/nimble0/dotterel); [TouchStenoView.kt](https://github.com/nimble0/dotterel/blob/master/app/src/main/java/nimble/dotterel/machines/TouchStenoView.kt); [SwipeStenoView.kt](https://github.com/nimble0/dotterel/blob/master/app/src/main/java/nimble/dotterel/machines/SwipeStenoView.kt)). One r/Plover user found it awkward to tap the preview after every stroke in touch mode ([thread](https://www.reddit.com/r/Plover/comments/11baj0c/help_with_dotterel/), read only through a search snippet). Sacha Chua has used Dotterel on her Android phone and practises on a hardware Georgi keyboard ([blog](https://sachachua.com/blog/category/steno)) |
| plover-touchscreen-stenotype | desktop touchscreens | full layout | "works best on touchscreens that support at least 10 simultaneous touch points"; OS gestures steal touches; on GNOME a touch delay means users must hold a stroke about 200 ms, otherwise "each touch [is] registered as a stroke individually" ([PyPI](https://pypi.org/project/plover-touchscreen-stenotype/)) |
| Steno Keyboard Pocket / Steno Keyboard | iPhone / iPad | on iPhone, press a chord and then a Translate key placed where the space bar would be; multistroke words get Translate between strokes and are corrected retroactively. The iPad app keeps lift-to-send | the developer says Translate is more reliable on a small screen than lifting a full chord cleanly; imports Plover JSON and RTF/CRE, priority-ordered dictionaries, a conflicts view, lookup and define; no data collected; three ratings ([App Store](https://apps.apple.com/us/app/id6792498937)) |
| StenoBoard | Android | not chorded: a 3 × 3 grid of fields, eight directions per field, and four *terminating* gestures (lift, or a small sideways or backward hook) give "297 possible keys (288 strokes plus 9 taps)"; a second finger aborts a stroke; haptics at stroke start and end are "quite helpful for a precise input" | the closest existing relative of Wurstfinger's grid ([README](https://software-lab.de/StenoBoard/README)) |
| StenoKeyboards Asterisk | hardware, capacitive keys | touch-sensitive PCB | ships a stroke to raise the touch force needed because keys can be too sensitive ([docs](https://docs.stenokeyboards.com/keyboards/asterisk.html)) |

No measured speed exists for any of these. The lessons are consistent: on glass the hard problem is not translation but deciding when a stroke has ended and which keys it contained. Lift-of-all-fingers is fragile, timing windows split strokes, and the practical products moved to explicit commit (Dotterel's preview tap, Steno Keyboard Pocket's Translate key). Mirabai's 2013 estimate frames expectations: one-finger steno would be "slower than actual steno, because it would be done with just one finger versus 10", yet still potentially faster and more accurate than typical touch keyboards ([Google Group](https://groups.google.com/g/ploversteno/c/yAJnm9sjOM4)).

### 3.2 One-handed steno

The plover-one-handed layout makes one hand produce both banks in sequence: a left-only outline is prefixed with an `l` key, a right-only one with `r`, and a two-sided stroke is written as two half-strokes that "the plugin interprets ... as two halves of the same outline" (`KP-/-L` for "example") ([plover-one-handed](https://github.com/jenchanws/plover-one-handed)). Plover's own worked example of a one-handed system sets the goal as "not realtime capable, but faster than one-handed typing" ([Designing steno systems](https://plover.readthedocs.io/en/v4.0.2/system_dev.html)). Both are honest about the cost: removing a hand roughly doubles strokes or keys per finger.

### 3.3 Few-key chorders and gesture keyboards

| Method | Input | Measured speed (independent unless noted) | Source |
| --- | --- | --- | --- |
| Twiddler | one hand, 12 keys, chords | novices 26.2 wpm after 400 minutes (multi-tap 19.8); five continuing users 47 wpm after about 25 hours, best 67 | [Lyons et al., CHI 2004](https://wearables.cc.gatech.edu/publications/twiddler-chi04-abstract.html); [expert study](https://wearables.cc.gatech.edu/publications/twiddler-iswc-abstract.html) |
| Microwriter / CyKey | five finger keys plus thumb | claims only: 35–60 wpm in the patent, 30–60 for CyKey; pictographic chords sold as learnable in under an hour | [Wikipedia, Microwriter](https://en.wikipedia.org/wiki/Microwriter); [CyKey](https://en.wikipedia.org/wiki/CyKey) |
| GKOS | six keys on the back of a phone | beginners overtook multi-tap after a short learning phase, but the thesis judged it "unlikely to become a successful competitor"; vendor claims 20–40 wpm | [Tampere thesis](https://trepo.tuni.fi/handle/10024/81829); [GKOS](https://sites.google.com/site/gkoskbd/) |
| ASETNIOP | ten touch points on a tablet, plus steno-like word shortcuts | designer claims 80 and later "in excess of 100" wpm; no independent study found | [New Atlas 2012](https://newatlas.com/asetniop-chorded-keyboard-concept/24477); [New Atlas 2017](https://newatlas.com/asetniop-app-tablet/52810/) |
| ARTSEY / Ardux | eight keys, one hand | community guide: typically 40 wpm, tops out around 55 | [ARTSEY guide](https://dokk.org/library/learning_artsey_v0.4_2021_Cluney); [kbd.news](https://kbd.news/artsey-and-ardux.io-1712.html) |
| Taipo | two hands, two thumb keys, "no holding down of keys" | the designer's own 35 wpm; letters in unfamiliar positions "frequently coming out with the wrong key" | [davidb.org](https://www.davidb.org/post/2024/taipo) |
| CharaChorder | joystick keys plus word chords | marketing claims of 300–500 wpm; Monkeytype excludes chorded input; commenters doubt it for variable names | [Hackaday](https://hackaday.com/2022/01/12/the-charachorder-keyboard-is-too-fast-for-competition) |
| 8pen | one-finger circular gestures | no study found; discontinued; a 2010 review noted "It forces us to type with one finger, when one-finger typing is actually the problem" | [AlternativeTo](https://alternativeto.net/software/8pen/about); [Wired](https://wirednews.pages.dev/2010/11/hate-touchscreen-typing-try-8pens-spiral-gestures) |
| BrailleTouch | six-dot braille chords on a phone | expert blind users 23.2 wpm, about 14.5% errors | [MobileHCI 2012](https://dl.acm.org/doi/pdf/10.1145/2371574.2371623) |
| Perkinput | braille chords on a touchscreen | one expert 17.56 wpm one-handed with 0.14% uncorrected errors | [GI 2012](https://faculty.washington.edu/wobbrock/pubs/gi-12.01.pdf) |
| MessagEase | 3 × 3 taps and flicks | beginners 7.4 wpm rising to 11.0 over three sessions (QWERTY about 17); vendor claims 40–60 wpm "after several days" and a champion at 87 | [Thapa 2013](https://trepo.tuni.fi/handle/10024/84910); [The Next Web](https://thenextweb.com/news/messagease-claims-that-it-can-increase-smartphone-typing-speads-to-60-wpm) |
| SHARK / ShapeWriter | word-shape glides on a keyboard | framed explicitly as "shorthand": "the shapes of words builds up in users' muscle memory" | [Kristensson](https://www.pokristensson.com/gesturekeyboard.html) |
| Phone QWERTY (baseline) | soft keyboard | 36.2 wpm average across 37,370 volunteers | [Palin et al. 2019](https://www.repository.cam.ac.uk/items/809c909b-9301-4cad-955d-998bdce7e0e0) |

Letter-level chorders top out around 40–65 wpm after tens of hours, which is roughly where a practised phone QWERTY or MessagEase typist already is. None of them reaches steno speeds, because none of them changes strokes per word; ASETNIOP and CharaChorder, the two that add word-level chords, are also the two whose speed claims are unverified.

### 3.4 Speed envelope for thumbs (derived)

Words per minute equals 60 × strokes per second ÷ strokes per word. Kislingbury's record is 60 × 4.8 ÷ 0.8 = 360. For thumbs (**derived estimates, to be measured**):

- Letter entry on a MessagEase grid costs about 5.7 gestures per word (about 4.7 letters plus a space). At three to four gestures per second that is 32–42 wpm, consistent with the vendor's 40–60 claim for experts.
- A glide over two to four keys should take roughly twice as long as a single flick, so assume 1.5–2 strokes per second.
- At 1.6 strokes per word and 1.5 strokes per second the result is about 56 wpm; at 1.2 strokes per word and 2 strokes per second it is 100 wpm.

The lever is therefore strokes per word. A thumb system that averages more than about two strokes per word will not beat Wurstfinger's own letter entry, however clever its theory.

---

## 4. Pen shorthand and abbreviation systems as a second source of primitives

### 4.1 Gregg (Simplified)

Gregg represents "frequently recurring words" by simple alphabetic characters, and one sign often covers several words ("the sign for r represents are, our, hour") ([Anniversary unit 1](https://greggshorthand.github.io/anunit01.html)). The single-sign brief forms of Gregg Simplified ([chart](https://greggshorthand.github.io/smpbfs.html)), where the letter is a Gregg sound-sign:

| Sign | Word(s) | Sign | Word(s) |
| --- | --- | --- | --- |
| dot | a, an | n | in, not |
| a (large circle) | I | o | of |
| e (small circle) | he | p | put |
| b | be, by | r | are, our, hour |
| ch | which | s | is, his |
| d | would | sh | shall, ship |
| f | for | t | at, it |
| g | go, good | th | the (their, there written below the line) |
| i | why | u | you, your |
| k | can | v | have |
| l | well, will | m | am, more |

Useful two-sign forms include *ab* about, *bt* but, *kd* could, *fm* from, *nv* never, *ne* any, *ev* ever, *et* yet, *en* when, *er* were or year, *ar* where, *os* was, *ot* what, *sn* soon, *tm* time, *dt* date or did, *pl* please, *rk* work, *ri* right or write and *un* one (same chart). Gregg also teaches phrasing from the first lesson, because joining simple words "improves accuracy and speed" and should be learned before the habit of writing them separately sets in ([unit 1](https://greggshorthand.github.io/anunit01.html)). Position carries meaning: "all" and "over" are the *o* sign turned or raised, and "under" is *u* above the line ([chart](https://greggshorthand.github.io/smpbfs.html)).

### 4.2 Pitman

Pitman calls word-level abbreviations grammalogues or, in New Era, short forms; they are written without vowels, and phrase outlines are "phraseography" ([Long Live Pitman's Shorthand](https://long-live-pitmans-shorthand.org.uk/short-forms-intro.htm); [phrasing](https://long-live-pitmans-shorthand.org.uk/phrasing1-intro.htm)). Pitman 2000 cut the official list to 144 short forms ([Wikipedia](https://en.wikipedia.org/wiki/Pitman_shorthand)). Pitman's distinctive primitive is position: the same outline written above, on or through the line selects the vowel or the word. That is a direct analogue of a flick direction selecting among words sharing a base key.

### 4.3 Teeline

Teeline drops vowels "when they are not the first or last letter of a word", ignores silent letters, merges common clusters such as "sh" and "ing" into single signs, and gives some letters fixed meanings (B for "be", M for "me") ([Wikipedia](https://en.wikipedia.org/wiki/Teeline_shorthand)). Writers build their own groupings such as "at the" and "in the" for speed (same source). Single-letter assignments are not standardised across Teeline textbooks, and the [teeline.online special outlines page](https://teeline.online/learn/special-outlines) lists only a handful, so I could not give an authoritative list. Teeline's rule, keep the first and last vowel and drop the middle, is the cleanest published rule for orthographic consonant skeletons.

### 4.4 Alphabetic shorthands

**Speedwriting** (Emma Dearborn) uses "letters of the alphabet and a few punctuation marks to represent the sounds of English", drops vowels, abbreviates prefixes (capital N for *enter-* and *inter-*, so "entertainment" is *Ntn-*), and claimed 80–100 wpm with a pen after twelve weeks ([Wikipedia](https://en.wikipedia.org/wiki/Speedwriting)). **Stenoscript** has only 24 brief forms to memorise, such as *ak* acknowledge, *ac* accompany, *bz* business and *gvt* government ([Britannica](https://www.britannica.com/topic/Stenoscript-ABC-Shorthand)). **Personal Shorthand** (formerly Briefhand) uses a single letter for slightly more than a hundred business words, such as *a* about, *t* time and *v* very ([Wikipedia](https://en.wikipedia.org/wiki/Personal_Shorthand)). I found no published word list for **Keyscript** or **EasyScript**.

### 4.5 Dutton Speedwords

Dutton Speedwords is an auxiliary language whose commonest words are single letters ([Wikipedia](https://en.wikipedia.org/wiki/Dutton_Speedwords)):

| | | | | | |
| --- | --- | --- | --- | --- | --- |
| a = at, to | b = but | c = this | d = of, from | e = to be, is, am, are | f = for |
| g = they, them | h = has, have | i = in, within | j = I, me | k = that | l = the |
| m = with | n = no, not | o = on | p = can, to be able | q = question particle | r = will, shall |
| s = he, him | t = it | u = a, an, one | v = you | w = we, us | x = whether, if |
| y = was, were | z = as, then | & = and | sh = she, her | | |

The same article claims a 1,000-word vocabulary "handles 85% of daily conversation" and that the system takes 20–30 hours to learn.

### 4.6 Braille Grade 2 (Unified English Braille)

UEB is the most exactly specified of these standards, and blind readers and writers use it daily ([Rules of UEB, 3rd ed. 2024, §10](https://iceb.org/Rules%20of%20Unified%20English%20Braille%202024.pdf)). An alphabetic wordsign is used only when the word is "standing alone", which is the braille equivalent of a word boundary.

**Alphabetic wordsigns (§10.1):** b but, c can, d do, e every, f from, g go, h have, j just, k knowledge, l like, m more, n not, p people, q quite, r rather, s so, t that, u us, v very, x it, y you, z as, w will. The letters a, i and o have no wordsign because they are words already.

**Strong wordsigns (§10.2)**, one cell each: child, shall, this, which, out, still (the ch, sh, th, wh, ou and st signs).

**Strong contractions (§10.3)**, used wherever the letters occur: and, for, of, the, with.

**Lower wordsigns (§10.5):** be, enough, were, his, in, was.

**Shortforms (§10.9)**, 75 words, given here in print letters; an asterisk marks forms that use a contraction cell: ab about, abv above, ac according, acr across, af after, afn afternoon, afw afterward, ag again, ag(st)\* against, al also, alm almost, alr already, alt altogether, al(th)\* although, alw always, bl blind, brl braille, cd could, dcl declare, dclg declaring, dcv deceive, dcvg deceiving, ei either, fr friend, f(st)\* first, gd good, grt great, hm him, hmf himself, h(er)f\* herself, imm immediate, ll little, lr letter, myf myself, m(ch)\* much, m(st)\* must, nec necessary, nei neither, pd paid, p(er)cv\* perceive, p(er)cvg\* perceiving, p(er)h\* perhaps, qk quick, rcv receive, rcvg receiving, rjc rejoice, rjcg rejoicing, sd said, s(ch)\* such, td today, tgr together, tm tomorrow, tn tonight, xf itself, xs its, yr your, yrf yourself, yrvs yourselves, (the)mvs\* themselves, (ch)n\* children, (sh)d\* should, (th)yf\* thyself, (ou)rvs\* ourselves, wd would, (be)c\* because, (be)f\* before, (be)h\* behind, (be)l\* below, (be)n\* beneath, (be)s\* beside, (be)t\* between, (be)y\* beyond, (con)cv\* conceive, (con)cvg\* conceiving, (one)f\* oneself.

The shortforms are a tested, standard set of consonant skeletons for long common words, which is exactly what an orthographic thumb layer would need.

### 4.7 Texting abbreviations (textese)

The established phone conventions are phonetic letter and digit substitution (b be, c see, r are, u you, y why, 2 to/too/two, 4 for/four, 8 in "l8r") and vowel-dropped skeletons (txt, msg, pls, thx), plus initialisms (btw, idk, imo, lol) ([Wikipedia, SMS language](https://en.wikipedia.org/wiki/SMS_language)). Two findings matter for design. Textese is less common than assumed (under 20% of messages in one American study), and a 2024 study found that abbreviations make the sender "seem less sincere" and lead to "fewer replies" (same source). A steno system sidesteps both: the writer inputs an abbreviation but the reader receives full words.

### 4.8 Court-reporting CAT, CART and medical transcription expanders

CAT software layers a personal dictionary under job or case dictionaries and offers "globals" that apply a correction to the current transcript only or write it into the case dictionary; study material warns that globaling a misstroke into the master dictionary "permanently injects systemic errors" ([RPR study guide](https://open-exam-prep.com/study-guides/rpr/ch05-dictionary-management/sec02-globaling-untranslates)). Captioners expect realtime output to be "nearly perfect with the occasional error here and there", and fingerspell unknown words rather than "blasting through words syllabically you aren't sure will translate", because "the goal here is readability" ([Stan Sakai](https://blog.stanographer.com/qa-cart-captioning-edition/)). Medical transcriptionists use expanders such as Instant Text, which builds glossaries from frequently used words and phrases and suggests sentence continuations ([GPII listing](https://ul.gpii.net/node/11267)). Mirabai Knight, a former transcriptionist, compared the two: with expanders "they have to write the first two or three letters of a word, and then it'll sort of expand out, but with steno, most of those you can do in one stroke, so it's still almost triple the efficiency" ([PyCon 2013](https://openstenoproject.stenoknight.com/transcripts/pycon-2013-video-transcript.php)).

### 4.9 Single letters across conventions

| Letter | UEB braille | Gregg sign | Dutton | Textese |
| --- | --- | --- | --- | --- |
| a | (none: is a word) | a/an is a dot; large circle = I | at, to | |
| b | but | be, by | but | be |
| c / k | c = can, k = knowledge | k = can | c = this, k = that | c = see |
| d | do | would | of, from | |
| e | every | he | to be, is, am, are | |
| f | from | for | for | |
| g | go | go, good | they, them | |
| h | have | | has, have | |
| i | (none: is a word) | why | in, within | |
| j | just | | I, me | |
| l | like | well, will | the | |
| m | more | am, more | with | |
| n | not | in, not | no, not | |
| o | (none: is a word) | of | on | |
| p | people | put | can | |
| q | quite | | question | |
| r | rather | are, our, hour | will, shall | are |
| s | so | is, his | he, him | |
| t | that | at, it | it | |
| u | us | you, your | a, an, one | you |
| v | very | have | you | |
| w | will | | we, us | |
| x | it | | whether, if | |
| y | you | | was, were | why |
| z | as | | as, then | |

Agreement is real but partial (**derived** from the table): *n* = not in three systems; *m* = more, *g* = go and *can* on c/k in braille and Gregg; *z* = as in braille and Dutton; *t* = it and *f* = for in Gregg and Dutton; *h* = have in braille and Dutton; *r* = are and *u* = you in Gregg and textese. "Will" has no consensus (w, l, r). For Wurstfinger's nine tap letters (a n i / h o r / t e s), braille's meanings are not, have, rather, that, every and so, and Gregg's are in/not, of, are, at/it, he and is/his. Any "letter standing alone becomes a word" layer must leave a, I and o alone, as braille does, and must be switchable off for command lines, where `ls -a` and `x` mean themselves.

---

## 5. Transfer analysis

### 5.1 Hard facts that bound the design

- **Contacts.** One thumb gives one contact; two thumbs give at most two. Typical steno chords press three to eight keys at once. Anything that needs three simultaneous contacts is impossible, and two-contact chords are possible only when both thumbs are on the grid.
- **Glass.** There is no key travel and no home-row feel. Mirabai's verdict on iStenoPad, frustrating "due to lack of haptic feedback", applies; StenoBoard found haptics at stroke start and end "quite helpful for a precise input" ([README](https://software-lab.de/StenoBoard/README)).
- **Commit.** Lift-to-commit worked for Dotterel's swipe mode, but the iPhone product chose an explicit Translate key, and desktop touch steno split strokes when timing went wrong (§3.1).
- **Glide geometry.** On a 3 × 3 grid a straight path between two non-adjacent keys crosses the key between them. Android's pattern lock resolves this by ruling that a dot can be joined directly only if every dot on the straight path is already joined, so a crossed dot is pulled in ([Tupsamudre et al.](https://dev.ndss-symposium.org/wp-content/uploads/2018/07/usec2018_02-1_Tupsamudre_paper.pdf)). Under that rule there are 56 two-key, 320 three-key and 1,624 four-key paths, 2,000 glides of two to four keys in total (**derived**, matching the published counts in [android-pattern-combinations](https://github.com/greigdp/android-pattern-combinations/blob/master/README.md)). The space is ample for briefs; memorability, not capacity, is the constraint.
- **Spelling glides collide with the crossing rule.** 30 of the 100 most common English words ([Oxford list](https://en.wikipedia.org/wiki/Most_common_words_in_English)) use only Wurstfinger's nine tap letters, which makes "glide over the letters of the word" tempting. But "it", "as", "at", "this", "his", "one", "then" and "its" each contain a hop across the middle of a row, column or diagonal, and "that", "see", "there" and "these" repeat a letter, which a glide cannot express without a dwell or re-entry rule (**derived**, my analysis of the tap layout).
- **iOS.** A keyboard extension can insert text, delete backward and move the caret, cannot select text, is replaced by the system keyboard in secure and phone-pad fields, and "by default ... has no network access and cannot share a container with its containing app" ([Apple](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/CustomKeyboard.html)). There is no way to send Control or Command combinations to the host app. Whether a terminal app accepts control characters inserted as text is unverified.
- **Wurstfinger today.** Fingers are bound to their landing key and there is no keyboard-wide gesture recogniser, so glides need new touch routing; up to ten fingers are tracked, and rollover already orders output by press time ([03-current-keyboard-spec.md §6.1, §6.7](03-current-keyboard-spec.md)).

### 5.2 Primitive by primitive

| Steno primitive | Needs simultaneous multi-finger input? | Closest honest equivalent for one or two thumbs on a 9-key grid | Risk | Verdict |
| --- | --- | --- | --- | --- |
| Stroke (chord read on release) | Yes, 3–8 keys | One gesture is one stroke: tap, flick, return swipe, circle, or a glide visiting an ordered set of keys; optionally a two-thumb pair (one thumb holds a key while the other gestures) | High: glide segmentation and the crossing rule; each stroke is slower than a chord, so the design must recover it in strokes per word | Adapt |
| Lift-to-commit | Yes | Lift of the single touch commits; two-thumb strokes commit when the last thumb lifts; offer an explicit commit (the space bar, which steno does not otherwise need) as a mode | Medium: timing windows split or stack strokes (§3.1) | Adapt |
| Steno order | Exists because chords lose order | Not needed: a glide is already ordered. Keep its *function*, a canonical, typable notation for every stroke so dictionaries stay plain text | Low | Keep the notation, drop the rule |
| Left/right bank split (onset vs coda) | No in principle, but needs about 17 consonant keys | Two-thumb halves (left thumb onset, right thumb coda) or sequential half-strokes as in plover-one-handed | High: with one thumb it doubles strokes per syllable | Adapt only if two-thumb is primary |
| Multi-key letter chords (`TPH` = N) | Yes | None needed: every letter is already one Wurstfinger gesture | None | Cargo cult |
| Phonetic theory (one stroke per syllable) | Yes | A new syllable-glide theory, or an orthographic skeleton layer (Teeline vowel rule, braille shortforms) built on tap letters | Very high: years of theory design, homophones, and Plover theory itself has gaps (§1.18) | Do not import; prefer orthographic where any rule layer is wanted |
| Briefs | No | Any gesture maps to any text | Memory load; must stay optional (§2.4) | Keep: the main lever |
| Phrase briefs | No | Same as briefs | Low | Keep |
| Compositional phrasing (Jeff's) | Yes: one chord carries starter, modal, structure, verb and tense | Starter stroke then verb stroke, or left thumb = subject and modal, right thumb = verb and tense; implement as a programmatic dictionary | High: bits per stroke are limited | Adapt |
| Prefix and suffix strokes | No | Dedicated gestures for `{^ing}`, `{^ed}`, `{^s}`, `{^ly}`, `{re^}`, `{un^}` | Low | Keep |
| Suffix folding | Yes: extra key in the same chord | A terminal hook on the same gesture (StenoBoard-style sideways or backward ending, §3.1), or the other thumb touching a suffix key before lift | Medium: gesture complexity and misrecognition | Adapt |
| Inversion | Yes: order-free chord | Irrelevant, since glides are ordered | None | Cargo cult |
| Orthography on attach | No (software) | Plover's English rules and word list, verbatim | Low | Keep |
| Asterisk as undo | No (one key) | One reserved gesture or the utility key undoes the whole last stroke, including retroactive rewrites | Low; must never fire by accident | Keep (§2.3) |
| Asterisk as variant | Yes: pressed with the chord | Retroactive toggle (`{*}`) as a follow-up gesture, or a held second thumb | Medium | Adapt |
| One outline, one translation | No | Same; homophones get distinct outlines; no context guessing | Low technically, medium for learnability | Keep |
| Longest match with retroactive rewrite | No | Same; rewrite via delete-backward and insert with minimal edits | Medium: word-boundary errors; host text may change between strokes | Keep |
| Fingerspelling with glue | No (but 2–6 keys per letter in steno) | Wurstfinger's existing letter gestures *are* the fingerspelling alphabet, faster than steno's own, emitted as glued text | Low | Keep: the strongest advantage a phone has |
| Formatting and retro operators | No | Plover's translation language verbatim | Low | Keep |
| Number bar, many digits per chord | Yes | Digits are one gesture each; a glide over the 3 × 3 grid is literally a keypad path, so multi-digit glides map naturally | Medium: crossing rule for digit sequences like 1-3 | Adapt |
| Symbol system (Emily's) | Yes: starter, spacing, shape and count in one chord | Wurstfinger's flick symbols plus spacing and capitalisation parameters as follow-up modifiers or two-thumb holds | Medium | Adapt |
| Modifier and shortcut systems (`{#control(c)}`) | Yes | Mostly unavailable on iOS; newline, tab, caret movement and deletion only | High (platform) | Mostly cargo cult on iOS |
| Command dictionaries (git, shell) | No | Same | Low | Keep |
| Dictionary stacking and toggles | No | Same | Low | Keep |
| Programmatic dictionaries | No | Same API in a language a keyboard extension can run (JavaScriptCore is the obvious candidate) | Medium: sandbox, memory | Keep |
| Paper tape | No | Compact strip of recent strokes and translations | Screen space | Keep |
| Lookup and suggestions | No | Same | Low | Keep: steno's alternative to prediction |
| Add translation in flow | No | Same | Low | Keep |
| Misstroke entries in the base dictionary | No | User-level only; keep the shipped base clean | Medium | Adapt (§2.4) |
| 22-key layout on glass | Yes: ten fingers | None for thumbs | n/a | Cargo cult |

### 5.3 What is cargo cult on a phone

Several steno ideas are worth naming plainly as cargo cult if carried over to thumbs. Drawing the 22-key steno layout on glass is the first: every attempt so far did it, none produced measured speeds, and it needs ten fingers. Teaching steno order as a rule is the second, because a glide already has an order and steno order only exists to recover one from a simultaneous press. Multi-key letter chords such as `TKPW` for G are the third; Wurstfinger gives every letter in a single gesture, so building letters out of key combinations would make the phone slower than the thing it replaces. Inversion is the fourth, for the same reason as steno order. Importing Plover theory or `main.json` as if it were usable is the fifth: its 147,000 outlines are keyed to chords no thumb can make, so only its translations, formatting operators and orthography transfer. A full phonetic onset/vowel/coda theory for one thumb is the sixth; it would double strokes per syllable while carrying all of steno's learning cost. Shortcut dictionaries that rely on Control and Command are the seventh, because iOS keyboards cannot send them. The last is the speed story: 225 wpm needs about four strokes a second at below one stroke per word, and no thumb system will approach it. An honest target is "clearly faster than this person's own letter entry".

### 5.4 What survives, in one paragraph

What survives is the engine and the economics. The engine is a deterministic, dictionary-driven translator with longest-match rewriting, stroke-level undo, Plover's formatting operators and orthography, stacked user-editable dictionaries, programmatic dictionaries, a paper tape, lookup and suggestions. The economics is "one gesture per common word": briefs, compositional phrasing, affix strokes and folded suffixes, with Wurstfinger's letter gestures as a fast, glued fingerspelling fallback that removes most of the out-of-dictionary cliff practitioners complain about. Whether the stroke vocabulary is glide-based briefs, an orthographic skeleton theory, or a two-thumb half-stroke theory is the open design question; the research says only that it must be consistent, rule-derived at its base, and cheap enough to average well under two strokes per word.

---

## 6. Acceptance criteria for any "thumb steno"

These are written as I would review a proposal as a working stenographer and Plover contributor. Items marked **must** would block release; **should** items would block calling it "steno".

### 6.1 Engine and determinism

1. **Must: replay determinism.** Replaying a recorded stroke log against the same dictionary stack and settings produces byte-identical text on every run and device. No learned, frequency-adapted or context-guessed choice ever changes output. Test: golden-file replay of at least 10,000 strokes.
2. **Must: one outline, one translation.** Lookup is strict stack priority with override, never merge. A conflicts view lists every outline defined in more than one enabled dictionary and shows which one wins.
3. **Must: longest match with minimal rewrite.** Outlines up to the stack's longest key resolve longest-first, and completing a longer outline rewrites earlier output with the minimum number of deletions and insertions. Test: the strokes for "cat" then "log", where a `cat/log` entry exists, leave exactly "catalog" in the host field, and `{*?}` turns it back into "cat log".
4. **Must: stroke-level undo.** One undo gesture reverts exactly one stroke, including retroactive rewrites, spacing and capitalisation state, for at least 100 levels (Plover's default `undo_levels`, [config](https://plover.readthedocs.io/en/latest/api/config.html)). If the host text no longer matches what the engine wrote (the caret moved, the user edited), undo deletes nothing it did not write.
5. **Must: Plover translation language.** Every operator in §1.13 that is meaningful on iOS behaves as Plover documents it, verified by a conformance suite built from the examples in Plover's [translation language reference](https://plover.readthedocs.io/en/latest/translation_language.html). Unsupported operators (key combinations) are reported, never silently dropped.
6. **Must: orthography.** Plover's English rules and word list apply to orthographic affixes. Test cases include red + `{^ish}` = reddish, narrate + `{^ing}` = narrating, defer + `{^ed}` = deferred, cherry + `{^s}` = cherries and beauty + `{^ful}` = beautiful.
7. **Must: visible untranslates.** An undefined stroke shows its raw notation in the output (Plover behaviour) or a marked entry on the paper tape, and never produces a guessed word.
8. **Should: retro operators.** `{*-|}`, `{*<}`, `{*>}`, `{*?}`, `{*!}`, `{*}` and `{*+}` work on the last word or stroke.

### 6.2 Input and recognition

1. **Must: documented stroke grammar.** Every stroke type (tap, flick, return swipe, circle, glide, two-thumb pair, terminal hook) has a written definition, including how a glide that crosses a key is resolved. The same intended stroke is recognised identically at any speed within a documented range, with no timing window that turns one stroke into two.
2. **Must: recognition accuracy.** A practised user writing a scripted set that exercises every stroke shape achieves at least 99% correct strokes, with at most 0.5% stacked (two merged into one) or split strokes, measured from logs in one-thumb and two-thumb postures.
3. **Must: one thumb is complete.** Every function, including undo, fingerspelling, numbers, symbols and dictionary commands, is reachable with one thumb. The second thumb may only accelerate.
4. **Must: undo is one gesture from rest.** It never requires leaving the grid and is never produced by a plausible misrecognition of a common stroke.
5. **Should: latency.** Text for a completed stroke appears within 50 ms of commit on the oldest supported device.
6. **Should: eyes-up writing.** Haptic feedback marks key entry during a glide and stroke commit, so that the top 100 strokes can be written at 95% accuracy while looking at the text field.

### 6.3 Learnability

1. **Must: no brief is ever required.** Every word, digit and printable ASCII character can be entered without leaving steno mode and without memorising any brief, using Wurstfinger's letter gestures as glued fingerspelling.
2. **Must: one correct base outline.** The shipped base theory has exactly one rule-derived outline per word; alternates live in a separate optional dictionary; the shipped dictionaries contain no misstroke entries (Lapwing's principle, §2.4).
3. **Should: the top 100 words are one stroke each.** The 100 most common English words, about half of running text ([Oxford list](https://en.wikipedia.org/wiki/Most_common_words_in_English)), each have a one-stroke outline, and the whole set fits on one reference screen.
4. **Must: lookup from the keyboard.** Given a word, show every outline in stack order with its dictionary name, with the rule-derived outline marked.
5. **Must: suggestions without side effects.** After a word is written with more strokes than necessary, or fingerspelled when an outline exists, show the shorter outline, as Tapey Tape does, without changing the output.
6. **Must: paper tape.** The last 50 or more strokes are visible as raw notation beside their translations, and a session log with timestamps can be exported for review.
7. **Should: evidence before speed claims.** Publish learning curves (standard wpm against cumulative practice hours) for a group of users before claiming a speed, and compare each user against their own Wurstfinger letter entry.

### 6.4 Power use and the command line

1. **Must: literal output.** Straight quotes, `--`, `~`, `|`, `\` and backticks arrive unchanged in a terminal app. No autocorrect, auto-capitalisation, smart punctuation or text replacement touches steno output. Test in at least two iOS terminal apps.
2. **Must: a shell task suite.** With the shipped shell dictionary, each of `git commit -m "Fix typo"`, `ls -la`, `rm -rf ./build`, `grep -rn "TODO" src/`, `ssh user@host -p 2222`, `cd ..` and `kubectl get pods -n kube-system` can be written with correct spacing and no manual deletion, and the stroke count for each is reported.
3. **Must: flags compose.** Short flags glue (`-l` then `a` gives `-la`), long flags are a stroke family (`--force`, `--help`, `--version`), and a command can start in lowercase regardless of sentence state (`{>}`).
4. **Should: a symbol grammar.** Every printable ASCII symbol is one stroke with control over a space before, after or neither, capitalise-next, and repetition, following Emily's Symbols.
5. **Must: casing and spacing modes.** `{mode:camel}`, `{mode:snake}`, `{mode:caps}`, `{mode:set_space:x}` and their resets work.
6. **Must: switch dictionaries by stroke.** Named dictionaries (shell, code, prose) can be enabled or disabled from a stroke without leaving the host app, as Plover's Dict Commands plugin does.
7. **Must: honest key commands.** Newline, tab, caret movement and word deletion work; key combinations that iOS cannot deliver are documented as unsupported.

### 6.5 Configurability and dictionary format

1. **Must: Plover JSON.** Dictionaries are UTF-8 JSON objects mapping a slash-separated outline to a translation in Plover's translation language, imported and exported losslessly. Translations from any Plover dictionary load unchanged.
2. **Must: a canonical stroke notation.** Every thumb stroke has exactly one ASCII spelling, documented and stable across versions, so dictionaries can be written in a text editor, diffed and kept in git.
3. **Must: a real stack.** Any number of dictionaries, user-ordered, individually enabled, with a writable user dictionary on top by default.
4. **Must: add a translation in flow.** Defining a new entry takes at most two interactions from inside the host app, writes to the top writable dictionary and takes effect on the next stroke.
5. **Must: scale.** A dictionary the size of Plover's `main.json` (147,424 entries) loads within the keyboard extension's measured memory and cold-start budget on the oldest supported device, with both numbers published.
6. **Should: programmatic dictionaries.** An equivalent of Plover's Python dictionaries, with `LONGEST_KEY`, `lookup(strokes)` that returns a translation or "no entry", and optional `reverse_lookup(text)`, in a sandboxed language that runs in a keyboard extension. Acceptance test: Emily's Symbols and Jeff's phrasing can be ported.
7. **Should: data-driven system definition.** Stroke grammar, orthography rules and default stack are data files, so that another language or theory can be added without code changes.
8. **Must: Plover's output settings.** Space placement before or after output, start attached, start capitalised and undo levels are configurable ([config](https://plover.readthedocs.io/en/latest/api/config.html)).
9. **Must: files the user can reach.** Dictionaries live where the Files app and iCloud can reach them, and any Full Access requirement for that is stated explicitly, since Apple's guide ties shared containers to open access.
10. **Should: RTF/CRE import** for professional users bringing their CAT dictionaries, as Steno Keyboard Pocket already offers.

### 6.6 Privacy

1. **Must: local only.** No network access in steno mode; dictionaries, logs and paper tape stay on the device; core steno works without Full Access if the platform allows it.

---

## Open questions and things I could not verify

- No measured wpm exists for any phone steno product, including Dotterel and Steno Keyboard Pocket.
- The 2025 Open Steno community survey (161 responses) exists, but its results were not retrievable.
- Teeline's single-letter list and Keyscript's and EasyScript's brief forms are not published in a citable form I could find.
- Whether iOS smart punctuation can rewrite text inserted by a custom keyboard, and whether a keyboard without Full Access can read its app group, should be tested on a current device.
- Whether iOS terminal apps accept control characters (for example U+0003 for Control-C) inserted as text is unverified, and it decides whether any shell control keys are possible.
- "StenoIME" did not turn up as a project; the Android steno input methods found were Brent Nesbitt's 2013 prototype and Dotterel.
