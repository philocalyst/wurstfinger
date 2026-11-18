# Steno mode: design

> This document describes the second iteration. The third is summarised in `STATUS.md`, which also
> records the review scores and what is still open. Where the two disagree, `STATUS.md` is current.

This document describes a second keyboard mode for Wurstfinger that brings the working parts of
machine stenography to thumb typing, and the prototype that demonstrates it. The prototype lives
in `prototype/steno-demo/` and runs in a browser; nothing in the Swift app has changed yet. The
research the design rests on is in `docs/steno/research/`, and the reviews that shaped the second
iteration are in `docs/steno/reviews/`.

## What is being proposed

Wurstfinger today is a letter keyboard: nine keys, a tap for the commonest letter on each and a
flick for the others. Steno mode keeps every one of those letters exactly where it is and adds
whole words on top. The current keyboard stays one swipe away, unchanged, for symbols and for
anyone who wants plain letters. There are five things to know.

1. **A flick is a word.** On each key the letters keep their directions, and so do the six marks
   people use in every message (`. , ? ! ' -`) and shift. Every other direction used to hold a
   symbol that a text message almost never needs. In steno mode it holds a word of at most five
   letters that begins with one of that key's letters, and the word arrives with its space. The
   two one-letter words, *I* and *a*, are the flick straight up on their own keys. There are 48.
2. **A curl is another word from the same key.** Finishing a flick with a corner, to the right or
   to the left, or drawing it out and back, types a second word. First come the flicked word's
   own contractions, on turns that mean the same thing everywhere: right is *is/are/am*, left is
   *not/will*, back is *have*. So *you* gives *you're*, *you'll* and *you've*, and *he* gives
   *he's*. Then come a phrase that begins with the flicked word (*I don't*, *no problem*), its kin
   and the words that begin with it (*to* gives *tomorrow* and *today*), and after those other
   words with the same first letter. A letter's flick takes the commonest words that begin with
   that letter. A contraction never sits on another word's turn. There are 188.
3. **The space bar ends a word.** Tapping it types a space, and tapping it after a word that
   already has one changes nothing, so the habit of tapping space after every word is harmless.
   Flicking it finishes the word before the caret: `-ed`, `-s` and `-ing` along the top, `n't` and
   `'s` below. Endings are meanings rather than strings, so *stop* becomes *stopping*, *try*
   becomes *tried*, *go* becomes *went*, *can* becomes *can't* and *you* becomes *you're*.
4. **Everything else is spelled, and nothing is changed behind your back.** Letters glue to each
   other as they always did. When the letters spelled so far can only be one word, the rest of it
   appears in grey and pulling the space bar down takes it. A plain space leaves the letters as
   typed. The same pull closes the gap after a word, so that a suffix can be spelled onto it.
5. **One key undoes, changes and sends.** The bottom-right key takes back a whole stroke on a tap,
   however much the stroke wrote. A flick to the right steps the last word to its neighbour on the
   same flick, which is how a misread curl is put right in one move. Up sends.

## Which parts of stenography this is, and which it is not

A stenotype is fast because a stroke is a syllable or a word rather than a letter, because the
commonest words and phrases have short strokes called briefs, because the machine and not the
typist handles spaces, capitals and the spelling changes that suffixes cause, and because a whole
stroke can be taken back with one key. None of that depends on having ten fingers. What does is
the chord itself, pressing many keys at once, and the research report is blunt that drawing a
22-key steno layout on glass has been tried repeatedly and has never produced a published speed.

| Stenography | In steno mode | Notes |
| --- | --- | --- |
| A stroke writes a word | One touch writes a word: a flick or a hook | A touch ends when the finger lifts, as a chord ends on release |
| Briefs chosen by frequency | Word flicks and hooks assigned from a corpus | Assigned by time saved, not by rank alone |
| Phrase briefs | A hook on the phrase's first word | Only where the phrase beats writing its words one by one |
| Suffix keys folded into the stroke | Endings on the space bar | The ending replaces the space, so it costs nothing extra |
| Orthography rules on attach | `src/orthography.js` | Written rules and curated tables, tested on over two hundred cases |
| Automatic spacing and capitals | The translator owns both | |
| Fingerspelling with glue | Letters are `{&x}` strokes | So spelling is never a different mode |
| Attach operators | `{^}`, `{^ing}`, `{un^}`, and the complete stroke as a bare attach | Any suffix can be spelled onto any word |
| Longest match over several strokes | Outlines joined with `/` | A later stroke rewrites an earlier one; undo steps back one stroke |
| The asterisk | The corner key: undo, and change | |
| Stacked dictionaries, top wins | Packs, one stack per context | Plover's JSON shape and a subset of its operators |
| Paper tape, lookup, suggestions | The strip above the keys, Look up, the coach chip | Suggestions never insert anything |
| Steno order | Not used | A glide already has an order |
| Phonetic theory, multi-key letters | Not used | Nine keys cannot carry it; spelling is orthographic |
| Simultaneous chords | Not used | One thumb must be enough |

This is not a full writing system in the stenographer's sense: an unfamiliar word is spelled, not
built from sound. What is compositional is the ending layer and the bare attach, which work on any
word. The honest name for the whole is a brief system over a letter keyboard, with steno's
translator underneath it.

Determinism is kept whole. The same strokes always give the same text, nothing is predicted from
context, there is no language model, and the keyboard never replaces what was typed unless asked.

## Why these gestures

The HCI report sets the constraints.

Spelling a word by gliding through its letters does not work on this grid: only a tenth of word
tokens can be glided over adjacent keys. So word strokes are codes, and what matters is that the
codes are reliable, cheap and easy to find.

A stroke must not differ from a letter flick only by being longer. Hooks are told from flicks by a
corner, and the four outcomes (straight, right, left, back) each own a ninety-degree sector of
turn angle, which is scale-free. Depth-two marks were measured at about three percent error on a
thumb and depth three at nine to seventeen, so no stroke here has more than two segments.

Taps and flicks keep typing letters, so a word outside the dictionary never forces a mode switch.
Stenographers name the same thing from the other side: the drop to near zero when a word is not
in the dictionary is one of the main reasons learners quit.

Where the design departs from the report is the word flick. The report ranked "directional flicks
as briefs" last because all 72 flick slots were taken. They are taken by symbols such as `¸`, `˛`
and `¬`, and steno mode hands those directions to words while the symbols stay on the letter page.
This matters because a flick costs about what a letter costs, whereas a hook costs more than two:
the 48 flick words are 40 % of everything typed.

Directions are read as real angles on the glass, each with the same 45 degree sector. The Swift
classifier divides horizontal motion by the key's aspect ratio, which is harmless on its square
keys and would be harmful on the wider keys of a three-column layout, where it would make a
sideways flick need half as much again as an upward one. The tap and flick boundary stays at 20 pt
whatever the key size, because a flick is a movement of the thumb and does not grow with the key.

## How the words are chosen

`tools/corpus.mjs` reads three conversational corpora: the Cornell Movie-Dialogs Corpus (2.9
million words of scripted speech), DailyDialog (0.9 million words of written everyday dialogue)
and the NUS SMS Corpus (0.5 million words of real text messages). Every tenth utterance is held
out before anything is counted. A word's weight is the geometric mean of its relative frequency
in the three, so a word has to be common in all of them. Words the two cased corpora write with a
capital in mid-sentence at least half the time are treated as proper nouns and get no stroke. In
this blend the hundred commonest words are 58 % of all tokens and the top three hundred are 74 %,
which is why a small inventory of strokes goes a long way in conversation.

`tools/theory.mjs` then assigns strokes.

1. Each key takes, for its free directions, the words of its letter family that save the most.
   The saving is frequency times the time and the gestures a flick replaces. An exhaustive search
   places the words on the key: a word prefers the direction that points at the key of its second
   letter (*the* is T toward H), then the axes, and words that look alike (*you* and *your*, *he*
   and *her*) are kept off neighbouring directions, where a slip would swap them unnoticed.
2. Each flick word's contractions go on their fixed turns. The remaining turns are competed for
   letter by letter: the candidates that begin with a letter are ranked by what a hook would save,
   and as many win as that letter has turns. Winners then go to their closest relative with a turn
   free, and whatever is left takes any free turn on the right key. A hook has to be worth
   learning, so words under a hundred per million get none.
3. The endings are fixed by design, not generated.
4. A remaining word gets a completion: the shortest spelling prefix that no other token in the
   lexicon shares, apart from the word's own inflections, and that is not a token itself. Because
   the prefix is unambiguous, the grey offer is never a guess between two words.

Which words are "a base plus an ending" is derived once, with the same spelling rules the keyboard
applies, and only where the base is a real word of at least three letters that is not much rarer
than the result. *Thinking* is *think* and `-ing`; *thing* is not *the* and anything.

A word is assigned once, so every word has exactly one way to be written and the lookup tool can
always give a single answer. The whole theory is regenerated from the corpus by one command.

## What it buys

`tools/evaluate.mjs` types the held-out tenth of each corpus with a model typist, once on the
letter keyboard and once in steno mode at successive stages of learning. Stroke counts are exact.
Speeds are a model and are given under three sets of assumptions, defined in `src/model.js`. The
bare model is a one-thumb expert at 262 ms a letter, 300 ms a word flick and 702 ms a hook.
"Cautious" makes a hook 922 ms, adds 150 ms to recall every stroke that is not a letter, and
charges for misreads at two percent of flicks and four percent of hooks, each costing the time to
notice, undo and redo. "Pessimistic" doubles the recall and the misreads.

| Everyday dialogue, held out | Strokes a word | Fewer | Bare model | Cautious | Pessimistic |
| --- | --- | --- | --- | --- | --- |
| The letter keyboard | 5.14 | | 45.8 | 43.5 | 43.5 |
| Steno mode, letters only | 5.04 | 2 % | 46.4 | 44.1 | 44.1 |
| 12 word flicks | 4.39 | 15 % | 52.8 | 48.8 | 47.3 |
| 24 word flicks | 4.10 | 20 % | 56.3 | 51.4 | 49.2 |
| All 48 word flicks | 3.81 | 26 % | 60.3 | 54.4 | 51.3 |
| and the five endings | 3.74 | 27 % | 61.3 | 54.8 | 51.3 |
| and 40 hooks | 3.28 | 36 % | 65.2 | 55.2 | 50.4 |
| and every hook | 2.79 | 46 % | 71.5 | 57.5 | 51.3 |
| and completions | 2.75 | 47 % | 72.4 | 58.0 | 51.6 |

| | Film dialogue | | Real SMS | |
| --- | --- | --- | --- | --- |
| | Strokes a word | Cautious WPM | Strokes a word | Cautious WPM |
| The letter keyboard | 5.22 | 43.5 | 4.99 | 43.5 |
| Steno mode, letters only | 5.08 | 44.4 | 4.96 | 42.7 |
| All 48 word flicks | 3.90 | 53.9 | 4.21 | 48.1 |
| Everything | 2.90 | 57.2 | 3.37 | 50.6 |

Four things about these numbers should be said plainly.

They are a model built from pen and tablet timings. Nobody has measured a thumb making these
strokes on a key this size, and the bare model's 72 words a minute is well above what one-thumb
typists reach on any keyboard.

The flicks carry the result. Under the pessimistic assumptions the hooks add strokes saved but no
speed at all; the 48 flicks and the endings still give about a sixth.

A person who learns nothing loses very little, but not nothing. On the SMS corpus, which is full
of digits and of marks such as `:` and `)`, steno mode with letters only comes out two percent
slower than the letter keyboard, because those characters are a page or a curl away.

The SMS corpus is the hard case throughout, because a third of its tokens are spellings no
dictionary carries.

The recogniser was tested against a synthetic thumb on the real key size (`tools/robustness.mjs`),
across how long each leg of the stroke is and how far the aim is off, with the corner cut and the
length off by a fifth. With 4.5 mm legs and nine degrees of aim error, 95.7 % of strokes are read
correctly; with 6 mm legs, 97.9 %; with 3.5 mm legs, 84 %, and nearly all of the loss is curls read
as their own plain flick. Curls want legs of about 4.5 mm or more. This shows where the
classifier's margins run out. It says nothing about how real thumbs behave.

`test/roundtrip.test.mjs` types 3,034 held-out messages from all three corpora through the whole
chain, from sentence to strokes to translator to text, and requires the text back exactly. It
shows that the planner, the script and the translator agree on real sentences for every kind of
stroke. Messages that need a digit or a symbol the steno page does not carry are counted and
skipped. `test/engine.test.mjs` holds the translator to its rules, including every wrong output
the first round of reviews found.

## The translator

`src/engine.js` is Plover's model in miniature. Every stroke is looked up in the stack; the
longest run of strokes with an entry wins and rewrites what the shorter run typed; one undo steps
back one stroke.

Spacing in a prose stack works the way phone keyboards have taught people to expect. A word
arrives with a space after it. That space belongs to the translator, which takes it back when a
mark, an ending or an apostrophe arrives, and gives it up to the caret when a closing mark is
typed from another page. Letters never add a space, so correcting a letter in the middle of a
word does what it should. Text typed on the letter and number pages joins the token it lands in,
so a time or an address typed across pages comes out whole.

In a literal stack, which is what a terminal uses, nothing is added and nothing is taken back.

## The interface

The keys show the letters as before, in white, and the words in a second colour. The research on
marking menus says a guide should appear on hesitation rather than on contact, should show what
is still reachable, should make the novice's movement the same as the expert's, and should not
become something the learner leans on. The existing touch guide is carried one level further to
do that.

Tapping a letter shows nothing. Resting on a key for 0.3 s unfolds a map of what each direction
types. Moving lights the cell being headed for with exactly what a release would type. Pausing on
the way for a quarter of a second shows the curls still possible from there, each placed where
the finger would have to go to make it. The map sits above the key when that leaves the message
field uncovered and beside the key otherwise. The corner key and the space bar have maps too.

The strip above the keys is the paper tape. It shows the last strokes in the notation used
everywhere else: the key, drawn as a small key with its letter, and the path leaving it. While a
word is being spelled it shows the letters, and the word they can be completed to with the stroke
that completes it. When a word was spelled that has a shorter way, the strip shows that way once;
tapping it plays the stroke on the keyboard with a ghost finger without typing anything.

In the message field the word a stroke just wrote lands with a brief highlight, the word being
spelled is underlined, and its completion is shown in grey.

## Dictionaries

Everything the keyboard types comes from a stack of dictionaries, letters and punctuation
included. A dictionary maps outlines to translations. An outline is a stroke (`T-n`, `T-n-cw`,
`SP-ne`), several strokes joined with a slash, or a run of letters, which is typed on the complete
stroke. A translation is text with a subset of Plover's operators; `src/packs.js` lists them, and
an entry that uses anything else is refused with a reason.

At the bottom of every stack is a pack that is simply the old keyboard: every letter and every
symbol, typed exactly. A context is a stack on top of it.

- Messages uses the user's strokes, texting shorthand, English, and letters. Texting shorthand
  holds the abbreviations people already write (*omw*, *tmrw*, *idk*); they expand only on the
  complete stroke, so typing *ty* and a space is still *ty*.
- The terminal uses the user's commands, the shell pack, and letters. There is no English in it,
  so nothing a shell would mind can happen to a word. Every symbol is where the letter page has
  it. The shell pack adds, on a curl of each symbol, the forms a shell writes with it (`--` on the
  dash, `./` and `../` on the slash, ` | ` on the bar, `"…"` with the caret inside on the quote,
  `$(…)` on the dollar); on the space bar, the keys a terminal lives on (history up, Tab, Escape,
  Ctrl-C, Ctrl-R); and commands as spelled entries, so `g`, `c` and a pull on the space bar is
  `git commit -m ""` with the caret between the quotes.

An iOS keyboard cannot see which app it is in, so the app would choose the stack from the field's
traits (a field that asks for no capitals and no correction is what terminal apps present) and
let the user switch by hand.

Adding an entry is pressing Record, making the stroke on the keyboard and typing what it should
produce. Recording captures the stroke as drawn, including a curl that means nothing yet.
Replacing something that already works takes a second press. Dictionaries, stacks and settings
persist. The format is plain JSON in Plover's shape, and can be pasted in to add or to replace.

## Layout changes

The right-hand utility column is gone and the grid is three columns wide. A key is 94 by 70 pt
where it was 57.75 pt square. The space bar is two cells wide on every page. The bottom-right key
holds what the column held: a tap is undo, up is return, left deletes a word, a held drag to the
left deletes letter by letter as the delete key always did, up-left is the number page and
up-right the letter page. Coming back to where the finger started calls a flick off, so nothing
is sent by an aborted stroke. Switching pages is also a sideways drag of the strip above the keys,
or a two-finger swipe across the keys.

On the number page zero has no key of its own in a three-column grid with a two-cell space bar. In
the prototype it is a flick down from 8 and from 5. That is the weakest decision here and needs
the owner's view.

## What is new and what is not

Word gestures on a keyboard are twenty years old (SHARK, ShapeWriter, Swype). Tap-plus-flick on
nine targets is thirty (T-Cube, MessagEase). Strokes from soft-keyboard keys that enter chunks of
several characters, guided by a radial menu, are KeyScretch (2011, 2014). Gestures through a
three-by-three grid as commands are M3. Hesitation guides are marking menus and OctoPocus.
Abbreviation expansion is older than all of them, and deterministic lookup of strokes in stacked
dictionaries is stenography.

What this search did not find elsewhere is the combination: a whole-word layer with no language
model living in the unused directions of a MessagEase-style letter grid, so that the mode with
word strokes contains the letter mode; endings on the word-boundary key, so that inflecting or
contracting a word replaces the space rather than adding to it; a theory assigned by program from
a corpus under a stated cost model and checked on held-out text; and steno's translator, with
stacked per-context dictionaries, underneath a thumb keyboard. One check is still owed before a
novelty claim is made in public: whether MessagEase or Thumb-Key ship word-level gestures.

## What is not done

Nobody has typed on this with a thumb under measurement. The first things to measure are hook
accuracy and time on these keys against plain flicks, the distribution of real flick lengths, and
whether people adopt strokes at all when letters keep working. Until then the speed figures are a
ranking of designs.

The center key's nine letters have only the turns of their own flicks, so several common short
words that begin with them (*of*, *on*, *one*, *got*, *did*) are spelled. They are two to four
taps, and the model says a hook would not beat that, but it is the theory's least even corner.

The prototype is English only. The generator is language-independent in principle; the
contraction classes and the spelling tables are not.

Whether a terminal app accepts control characters and caret movement from a keyboard extension
the way the demo's terminal does has not been tested on a device.

The port to Swift has not started. `docs/steno/research/03-current-keyboard-spec.md` §8.5 says
where it would plug in: a new mode, a three-column arrangement, a corner case in the gesture
classifier, and a translator in the pipeline where text replacement sits today.
