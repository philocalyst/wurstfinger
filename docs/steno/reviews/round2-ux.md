# Steno mode, round 2: UX and visual design review

Reviewer stance: two hats, as in round one. The first is a person who texts all day on a stock phone keyboard, has never used MessagEase or stenography, and was handed the demo with no explanation. The second is a senior interaction and visual designer who has shipped mobile keyboards. I did a cold pass on the screen alone before reading `round1-ux.md` or `DESIGN.md`, then re-tested every round-one defect myself.

Everything below was driven through Playwright with real pointer events (mouse down, move, up along thumb-like paths), CDP touch events for the two-finger cases, and CDP screencasts at about 16 ms per frame for motion. Screenshots and frame folders live under

`scratch/review2/ux/shots/`

and are named relative to that folder below. The scripts that produced them are one level up (`lessons.mjs`, `matrix.mjs`, `msgs.mjs`, `msgs2.mjs`, `msg7b.mjs`, `guideall.mjs`, `clip.mjs`, `motion.mjs`, `pageturn.mjs`, `ghost.mjs`, `rec.mjs`, `pagelvl.mjs` and so on).

## Scores

| Dimension | Score |
| --- | --- |
| Novelty | 8.0 |
| Wonderful and intuitive to use | 6.8 |
| End-to-end useful for real texting | 6.6 |
| Without fault (correctness and polish) | 6.2 |
| Communicative guidance | 7.3 |
| Visual design | 6.8 |
| Motion and feedback | 7.0 |
| **Overall** | **6.9** |

This is a much better prototype than the one round one saw. Nearly every correctness bug that made real texting unsafe is gone: numbers no longer glue to words, capitals survive the number page, an aborted send no longer sends, Record captures free curls and asks before overriding, drag-delete works letter by letter, a letter typed inside a word stays inside the word, and the guide no longer strobes on taps. The recogniser is genuinely robust; every lesson completed with short, drifting, rounded and hesitating strokes. The guide, the paper-tape strip and the offer chip together are the most communicative gesture-keyboard feedback I have used.

It is still well short of the owner's 9.2. The guide now hides options at the top of the keyboard (sixteen curl chips are clipped, six of them completely), the lesson card on a phone never says anything because a CSS class collision hides its status line, the demonstrations silently destroy whatever the user was writing, diagonal flicks aimed at their labels have only fourteen degrees of slack on one side, the key face is still a dense word cloud whose custom labels overlap, page turns still snap the bottom row, and the moment of taking a completion celebrates the word "finish" instead of the word. I would call it promising and clearly improving, not something I would ship under my name today.

## First contact, cold

Screens: `c01_desk_dark.png`, `c02_desk_light.png`, `c03_mob_dark.png`, `c04_mob_light.png`, compared with `docs/images/keyboard-lower-dark.webp` and `keyboard-lower-light.webp` (converted copies in `ref_keyboard-lower-dark.png` and `ref_keyboard-lower-light.png`).

In the first minute, from the screen alone, I understood that this is a nine-key keyboard with a big letter on each key, small letters around it, and blue words in the corners and edges, and that "abc / steno / 123" are three keyboards. The first rule card now says the most basic thing plainly ("tap a key for its big letter, flick toward a small one for that"), which round one asked for, and the blue words are explained as "flick toward one and it is typed, with its space". The space bar is now labelled "space", and it is two cells wide on every page as the owner asked.

What confused me cold was the following. The word "finish" in the middle of the space bar's bottom edge reads like a seventh ending, and nothing on the key says it means "take the grey completion". The corner key is still a cluster of seven small glyphs (`123`, return, `abc`, a left-bar arrow, backspace, a pair of opposed arrows and a chevron), and two of them do not say what they do: the left-bar arrow (delete word) reads as "tab back" or "home", and the opposed arrows (change) read as "swap keyboard". I could not tell why "want", "was" and "with" live on the e key until I realised that the "first letter" rule means the key where that letter lives (w is a flick on e), which the copy never says. The lede's "the letters are where they always were" still assumes I have seen the current keyboard.

At phone size the "Learn & set up" pill is obvious and opens a full-screen sheet. On a 393 pt screen the sheet's header and lede take about 40 % of the height before any content, and the five tabs wrap to two lines (`c08_mob_sheet.png`). The keyboard itself sits in a 316 pt block with 38 pt of bare background on each side (`c03_mob_dark.png`); that matches the current keyboard's centred block and the keys did grow from 57.75 pt square to 94 by 70 pt, so I do not count it as a defect, but the owner asked for the column to be collapsed "to leave more room for keys" and the extra width went into wider keys rather than taller ones.

The moment that would make me keep going is the same as in round one: rest a thumb on a key, the map unfolds, move toward a word, it lights in blue, pause and its curls appear where the thumb would go (`c10_mob_rest_T.png`, `rm_dark_T-e.png`). That is excellent.

## Lessons, watched and performed

I watched all six lessons, then performed lessons 1 to 5 with real pointer strokes in five styles: clean (5 mm, ±6° drift), short (3.6 mm flicks, ±12° drift on both legs), sloppy (4 mm, ±15° drift, rounded corners), hesitant (500 ms rest before moving and another 500 ms in the middle of the stroke), and a 500 ms pause at the corner of every curl. I repeated the sloppy run at phone size, and I started lesson 3 from the phone sheet and followed the in-phone lesson card (`pl_mobile_lesson3_try.png`).

Every lesson completed in every style, with one exception in two runs: in lesson 2 a sloppy flick toward "in" (up-left on I) drifting 15° toward the horizontal typed "?" (`les_sloppy_flicks2.png`, `les_sloppy_m_flicks2.png`). On the desktop the lesson then said "That was a different stroke. Tap the corner key to take it back", which is exactly right. On the phone it said nothing at all (defect 2 below).

A recognition matrix on the T key (`matrix.mjs`) shows where that miss comes from. Flicks of 3.0 mm are taps, which is the 20 pt boundary inherited from the current keyboard. From 3.3 mm every cardinal direction is read correctly with ±15° drift. Diagonals aimed at their corner labels are read correctly with 15° drift toward the vertical but flip to the horizontal neighbour with 15° drift toward the horizontal, at every length from 3.3 to 4 mm (defect 4). Curls are very forgiving: second legs of 2.2 to 4 mm, rounded corners, a 30° error in the turn and a 500 ms pause at the corner all work, and only a rounded 2.2 mm curl with a 30° error falls back to the plain flick. Out-and-back strokes need a return of at least about 2.5 mm.

Lesson 6 (terminal) plays correctly. Its blurb, "g, c and a pull on the space bar is a commit with the caret inside the quotes", does not parse for a newcomer.

## Eight messages I would really send

I typed these with real pointer strokes at ±7° drift and 4.5 mm flicks, as a week-one user would: flick words that are visible on the keys, spell everything else, take a grey completion when one is offered, and use the curls I had met in the lessons. All eight arrived in the thread exactly as intended, except message 6, which has a stray space. Screens are `msgN_before_send*.png`.

1. "Hey Priya, are you free on Friday?" Thirty strokes. "Priya" and "Friday" are spelled; no completion was offered for "Frid", although nothing else in the dictionary starts that way.
2. "Meet me at 7:45 by the station." A round trip to the number page (corner up-left, 7, the colon on 8, 4, 5, space, corner up-right). "at 7:45" is correctly spaced, which round one could not do.
3. "Did you get my message about the keys?" "message" is spelled in full: the shorthand "msg" is the only way to complete it, and spelling "mes…" never offers it.
4. "I don't think I'll make it, it's been a long day and I'm tired." Forty-one strokes; "don't", "I'll", "been", "long", "day" and "tired" are spelled because their strokes are curls a week-one user does not know yet. Correct.
5. "That was extraordinarily bureaucratic." Thirty-three strokes. "was" is spelled because it is the back curl of "what". Spelling "extrao" offers "extraordinary", which is not the word I was writing; I ignored it.
6. 'She said "not today" so here's the plan: pizza.' Each quote and the colon cost three strokes (corner to the number page, the mark, corner back). The result was 'She said " not today"…': the word flicked after the opening quote arrived with a space in front of it (defect 6). "here" plus the space-bar flick down-right gave "here's", which is lovely.
7. "I'll be there around six." I first wrote "I'll be there at six", then slid the caret back along the space bar until it sat after "at" (69 px of travel for four characters), flicked the corner key left to delete the word, curled "around", slid back to the end and typed the period. The spacing came out perfect ("there around six"), which is a real achievement. The slide is about 10 to 12 px per character after a dead zone of roughly 25 px, and while it runs the space bar's endings map unfolds over the keys and stays there (`slide_mid.png`).
8. "Thanks for dinner. It was lovely to see you both!" Thirty-six strokes for forty-nine characters. "Thanks" is a curl I knew from lesson 3 but the week-one plan spelled it.

Recovery tools all worked as described. A tap on the corner key took back a whole stroke; a flick right cycled a misread curl through its siblings (Time, Take, That, That's, Time) and turned a plain "You" into "You're"; holding the corner key and dragging left deleted one character every 12 px, with a red ratchet under the finger (`fix_dragdelete_mid.png`, `fix_change1.png`). One irritation: while the drag-delete runs, the corner key's map stays open over the R and S keys for its whole length.

## Round-one defects: status

| # | Round-one defect | Status | What I ran |
| --- | --- | --- | --- |
| 1 | Numbers glue to a flicked word ("at3:30") | Fixed | "Meet me at 7:45", "at 10:30", "is $20 now" all spaced correctly (`msgs2.mjs`, `syms.mjs`) |
| 2 | Capitals lost after number-page punctuation | Fixed | "around 7." then the "want" curl gives "7. Want"; "ok" plus a period on the abc page plus "it" gives "Ok. It" (`r1a.mjs`) |
| 3 | Aborted flick sends; corner key has no guide | Fixed | Up 30 px, 400 ms hesitation, back to centre: nothing sent. Resting shows a six-cell map, and send lights green (`k_corner_steno.png`, `mo_send_zoom.png`) |
| 4 | Record cannot capture a free curl and silently overrides | Fixed | Recorded I down-left plus a right curl as "I'd love to"; overriding "the" took a second press with a clear warning; all of it survived a reload (`rec.mjs`). Copy nits remain (defect 20) |
| 5 | Horizontal flicks much less forgiving | Fixed for cardinals | East works from 3.3 mm with ±15° drift. The physical-angle change created a new diagonal asymmetry (defect 4) |
| 6 | Drag-delete removes a word every 14 px | Fixed | One character per 12 px; ratchet now on the corner key (`fix.mjs`) |
| 7 | Editing inside a word inserts a space | Fixed | Caret after "ar", tap e gives "are" with no space |
| 8 | Coach chip late, stale, crashes | Fixed | Chip "you · one flick" appears right after spelling "you" and space; tapping it demonstrates without typing; no console errors (`mo_ghost_coach_sheet.png`) |
| 9 | Guide flashes on every tap | Fixed | Five 60 ms taps 110 ms apart show no card; the map unfolds after about 330 ms of rest (`mo_taps_zoom.png`, `mo_rest_zoom.png`) |
| 10 | Guide clipped at the screen edge; chips overlap | Partly | No horizontal clipping and chips no longer overlap each other, but chips are now clipped at the top edge, sit under the thumb, and cover map labels (defects 1, 8, 9) |
| 11 | Phone lessons unusable; page scrolls sideways | Partly | Sheet plus in-phone lesson card works and `scrollWidth` is 393; but the lesson status is invisible on phones (defect 2) and the narrow layout overflows at 820×600 (defect 7) |
| 12 | Shorthand pack rewrites "ty", "rn" by default | Fixed | "ty" plus space stays "Ty"; "idk" plus a pull gives "I don't know" |
| 13 | Ribbon shows completion fragments | Partly | No fragments, but after a completion the chip and the pop say "finish" rather than the word (defect 11) |
| 14 | Lessons do not say when you went wrong | Partly | Desktop says "That was a different stroke. Tap the corner key to take it back." Phone shows only a red word (defect 2) |
| 15 | Two spelled words run together | Not fixed (by design) | "Jonas" then "when" still gives "Jonaswhen". The rule card now says tapping space "is always safe", which is the right lesson |
| 16 | Corner glyphs too faint | Fixed | 8.0:1 in dark and 7.0:1 in light at 11 px (`legib.mjs`). They are still ambiguous glyphs |
| 17 | Key labels collide; long custom labels overlap | Partly | Built-in labels have 3.7 to 5.7 px gutters and read as phrases; custom labels still overlap (defect 5) |
| 18 | Page turns snap the bottom row and pager | Not fixed | Bottom row swaps in one frame at release; pager thumb moves after release (`mo_strip_sheet.png`, frames 21 to 25) |
| 19 | Release frames cluttered; pops over pager and composer | Partly | Pops stay low, but card, lit cell and pop still stack for about 80 ms, the space bar shows two "finish" pills, and a pop can be clipped at the screen edge |
| 20 | Copy assumes MessagEase literacy | Partly | Rules rewritten and much clearer; remaining problems in defect 20 |
| 21 | Watch wipes the composer; bubbles jump; no space label | Partly | Space label added. Watch still wipes the draft, the rule-card demo now does too, and undo cannot restore it (defect 3). The old bubble still jumps about 20 px in two frames |

## Defects found now, most severe first

### 1. The guide hides curls at the top of the keyboard

Sixteen curl chips are pushed above the keyboard's overlay by the overlap-avoidance step and clipped. Six are completely invisible: "knew" (H up-right), "happened" (H up-left), "people" (O up-right), "quite" (O up-left), "many" (R up-right) and "must" (R up-left). Six are cut in half horizontally: "always" and "actually" on A, "let" and "next" on N, "its" and "interested" on I. Four more are partly cut ("house", "his", "room", "miss"). Reproduce at 393×852: press O, flick 5 mm up-right toward "p", pause 450 ms; the guide shows "problem" and "please" and no third curl, although Look up lists "please · people · problem". `clip.mjs` measures each chip against the overlay. Screenshots: `z_A-nw.png` (half of "actually"), `z_O-ne.png` (no "people"), `m_guide1.png`. The cause is that `layoutCurls` clamps a chip to the ribbon and then steps it up by 29 px to avoid the lit cell, with no second clamp. This matters more than any other defect because the guide is the product's teacher, and it hides choices exactly on the keys a thumb uses most.

### 2. On a phone the lesson card never speaks

The lesson card's status line has class `status`, which is also the phone status bar's class, and `body.narrow .status { visibility: hidden }` hides both. At phone size the card therefore never says "Your turn", never says "Done in 8 strokes. Letter by letter it is 33", and never says "That was a different stroke. Tap the corner key to take it back"; a wrong stroke shows only as a red word. Reproduce: 393×852, Learn & set up, Try it yourself on lesson 2, flick "?" instead of "in". Computed style of `#lessonStatus`: text present, `visibility: hidden`. Screenshot: `m_les_mobile.png` (left: finished lesson with no "Done"; right: the red word with no hint). This silently undoes round-one fix 14 on the device the product is for.

### 3. Demonstrations destroy the user's draft, beyond undo

Type "I think you are right", open the sheet and tap the glyph on the first rule card ("Show me on the keyboard"): the composer now reads "The ". Watch on a lesson does the same, and twelve taps on the corner key leave an empty field rather than bringing the draft back. Screenshots: `draft_after_rule_demo.png`, `draft_after_watch.png`. The coach chip's demonstration, by contrast, types nothing, which shows the right behaviour already exists. In a real settings app the demo would use its own field; here the demo field is the user's message.

### 4. Diagonal flicks aimed at their labels have fourteen degrees of slack on one side

On a 94 by 70 pt key the corner labels sit about 37° from the horizontal, but the sectors are 45° wide and centred on 45°. A thumb that aims at a corner label is therefore 8° from the sector centre before it drifts at all: it has about 14° of slack toward the horizontal and 31° toward the vertical. Measured on T with real strokes at 3.3, 3.6 and 4.0 mm: aiming at the up-right label with 15° of downward drift typed "you" instead of "y", aiming at the down-right label with 15° of upward drift typed "you" instead of "your", and the same happened on the left side with "that" (`matrix.mjs`). In the sloppy lesson runs this is the one miss ("in" became "?"). Either put the diagonal labels on the 45° rays, or let the diagonal sectors follow the key's aspect ratio (which is what the Swift classifier's aspect correction did, for the diagonals only).

### 5. Long custom labels overlap their neighbours on the key face

Add "Hello there" on H up, "unfortunately" on T up, "see you soon" on S up-right and "appreciate" on A up-left. The key face shows "her Hello thereknow", "think unfortunately" running over "y", "fromsee you soon" and "appreciatea" (`longlabels.png`). The labels are shrunk to 10.5 px and shifted, but not fitted to their slot. Built-in labels are tight too: the gaps between "from" and "some", "have" and "know", "right" and "more", "her" and "have" measure 3.7 to 5.2 px at 12 px type, which is a word space, so they read as phrases.

### 6. An opening quote typed from another page gets a space after it

Write "She said", flick the corner key up-left, flick 8 up-left for the double quote, flick the corner key up-right and flick "not". The field reads 'She said " not'. A parenthesis behaves correctly ("I am (not sure)"), and so do "@maya" and "$20", so this is specific to the ambiguous straight quote. A quote preceded by a space should be treated as opening. Screenshot: `msg6_before_send.png`.

### 7. The narrow layout breaks at landscape-tablet and small-window sizes

Below roughly 900 px wide the page switches to its phone layout and scales the phone to the window width with no height cap. At 820×600 the keyboard is 778 px tall in a 600 px window, only the top row is visible, and a flick on T types nothing. At 700×900 the thread is pushed out of view above the composer. Screenshots: `pl_resize_820x600.png`, `pl_resize_700x900.png`. The current keyboard's own spec caps height at the larger of the screen height minus 120 pt and 70 % of it.

### 8. Back-curl chips sit under the thumb

For a north flick on a lower key the back curl is placed where the finger already is. On H up ("have") the "has" chip and on S up ("from") the "feeling" chip lie on the touch point 32 px above the key centre, so a real thumb hides them. Screenshot: `m_guide2.png` (first and third panels). R down-left puts "meeting" on the R key face beside the finger in the same way.

### 9. Curl chips land far from where the finger goes, and cover the map's labels

On T down ("to") the clockwise curl "tomorrow" goes left, but because the lit cell is near the screen edge the chip is pushed two rows up to the card's top-left corner, far from the path the thumb must draw (`mo_hook_zoom.png`). Chips are also laid over map cells without hiding them, so fragments show beside the chip: "I'll" over "in" reads "I'lln", "I don't" over "it's" shows ghost text (`crop_w1_f001_00491.png`), and "find" and "friends" bracket a half-covered "sure" in light mode (`hold_always_light_S-nw.png`). `guideall.mjs` counts 137 partial overlaps of a chip on a map label across the 72 key directions (many are on dimmed labels and barely visible, but the fragments are what make the card look busy).

### 10. Page turns still snap the bottom row and the pager

Drag the strip above the keys 200 px to the left. The 3×3 grid slides with the finger, but the space bar keeps its steno endings and the corner key its steno labels until release, when both swap in a single frame while the grid is still settling; the pager thumb starts moving only after release (`mo_strip_sheet.png`, frames 21 to 25). The two-finger swipe does the same, and also leaves the first finger's key ("4") drawn as pressed for the whole swipe (`mo_twofinger_sheet.png`, frames 1 to 21).

### 11. Taking a completion celebrates "finish", twice

Spell "restau" and pull the space bar down. The lit cell says "finish", a "finish" pop rises from it while the lit cell fades, so two identical blue "finish" pills stand on the T key for about 70 ms, and afterwards the strip shows a "finish" chip (`mo_complete_zoom2.png`, frames 7 to 11; `r1_ribbon_after_completion.png`). The moment the user is rewarded for should show "restaurant". The offer chip before the pull is excellent ("Appointm → appointment", `r1_offer_appointm.png`), although it shows the expansion in lower case when the result will be capitalised.

### 12. Maps stay open during slides

Rest on the space bar and then slide the caret, or rest on the corner key and then drag to delete: the endings map, or the corner map, unfolds after 300 ms and stays over the keys for the whole slide, although nothing on it applies to a slide. On the space bar the ratchet strip is also drawn over the "finish" label (`slide_mid.png`, `fix_dragdelete_mid.png`). A slide should dismiss the map as soon as it is recognised.

### 13. Switching app context discards the draft

Spell "Resta" in Messages, tap Terminal, tap Messages: the field is empty (`pagelvl.mjs`). Each context keeping its own field is right; losing it on the way back is not. Reloading the page also drops an active lesson and its text, which is acceptable for a demo.

### 14. Completions are sparse and the copy promises more

The rule card says "When what you have spelled can only be one word, the rest appears in grey". In practice offers come from a fixed table. Spelling "message", "friday", "dinner", "tonight", "weekend", "birthday", "lovely" or "station" never offers anything at any prefix, while "restau", "toge", "prob", "def", "appointm" and "chocol" do, and "extrao" offers "extraordinary" to someone writing "extraordinarily" (`offers.mjs`). A week-one user cannot predict when the grey will appear, so they cannot learn to look for it.

### 15. Look up fails on phrases and times

The placeholder invites "a word, a phrase or a command". "see you tomorrow" answers "Nothing in the dictionaries messages uses types exactly that. Spell it", although each of its three words has a stroke; "7:45" gets the same answer instead of pointing at the number page (`lookup.mjs`).

### 16. Rollover commits in release order

With two thumbs, put one on T, then one on H, lift H, then lift T: the field reads "Ht" (`rapid.mjs`). Stock iOS commits the first key when the second touch lands, which gives "th". This may match the current Wurstfinger engine, which binds fingers to keys and commits on lift, but a word keyboard invites faster two-thumb typing and will surface it.

### 17. The corner key lost functions the column had

The old utility column carried the globe and copy, cut and paste on the 123 key (`ref_keyboard-lower-dark.png`). The corner key has none of them, while Settings says it "holds what the right-hand column used to hold". The globe matters on home-button iPhones, where the system does not draw one.

### 18. Smaller polish items

The "space" label is 2.2:1 in light and 3.0:1 in dark. A coach chip such as "no word to end" stays on the strip across page switches (`k_numeric.png`). On send the previous bubble moves up about 20 px over two frames rather than gliding (`mo_send_zoom.png`, frames 20 to 23), and the send pop is blue although its lit cell was green. The commit pop for a left-column word can be clipped at the screen edge ("hat" for "that" in `crop_w1_f015_06198.png`). Terminal key faces draw the control keys in teal and the guide draws the same keys in blue.

### 19. The panel sheet on a phone is top-heavy

On a 393 pt screen the title, the three-line lede and the wrapped tabs take about 40 % of the sheet before any content, and the lesson card's word rows wrap with an orphaned period on its own line and large empty space beneath (`c08_mob_sheet.png`, `pl_mobile_lesson3_try.png`).

### 20. Copy

The lede's "where they always were" assumes the reader knows the current keyboard. The rule that words sit on "the key of its first letter" needs "the key where that letter lives" to explain "want" on e. "finish" on the space bar should say what it finishes. The lesson 6 blurb does not parse. Record's notes start in lower case and run on ("flick up on T now types the (from English). Adding it here replaces that."; "spell bday, then pull the space bar down now types birthday"). The panel tab "Numbers" holds the evaluation, which a newcomer will mistake for the number keyboard.

## What works, for balance

The recogniser is the best part of the engineering: every lesson completed with 3.6 mm flicks, ±15° drift, rounded curls and half-second hesitations, and curls survive a 30° error in the turn. The guide is the best part of the design: it stays out of the way on taps, unfolds on a rest, lights exactly what a release will type, and shows the curls on a pause. The paper-tape strip with its stroke glyphs, the offer chip, the coach chip whose demonstration types nothing, and the wrong-stroke hint on desktop make the keyboard teach itself. Endings and the change key are delightful in use ("here" to "here's", "You" to "You're" in one flick). Mid-sentence editing now spaces itself correctly. Record, override protection and persistence work. There were no console errors in any run. The "Words on the keys: Hidden" face is calm and handsome (`hidden_words_light.png`). The Numbers tab remains unusually honest.

## Design-level objections that no bug fix would cure

**A week-one user still spells four words in ten, with no help.** In my eight messages roughly 40 % of words were spelled letter by letter, there is no typo tolerance and no prediction, and completions come from a small table. Determinism is a principled choice, but a person who texts all day is giving up autocorrect and the suggestion bar to adopt this. I would add a deterministic suggestion row in the strip while spelling (the dictionary's words that start with the letters so far, ranked by the corpus counts the theory already has), inserted only on a tap or the pull. That keeps "nothing is changed behind your back" and closes most of the gap.

**The key face is a word cloud.** Up to eight blue words of identical size, weight and colour per key, with word-space gutters, make the face read as phrases rather than a map. I would give the four cardinal words full weight and the diagonals a lighter weight, fix a slot per label with a minimum gutter and fit custom labels to it, and make the hidden-words face the default for any key the user has used a few dozen times, since the guide shows every word on a rest.

**The guide needs a layout model, not a clamp.** Curl chips are placed near the lit cell, clamped, then stepped away from collisions, so at the edges they drift far from the finger's path, under the thumb, over map labels or out of the overlay. I would place curls on a fixed ring around the lit cell, let the overlay extend over the composer's lower edge when needed (a chip may cover the strip, never the line being typed), hide the map cells a chip lands on, and never place a chip within a thumb radius of the touch point.

**Marks outside the six cost three strokes and a page round trip.** Quotes, colons, parentheses, digits and "@" each need corner, mark, corner. For texting, the colon and the quotes at least deserve a place on the steno page, for example as curls of the period and the apostrophe, and a held corner flick could mean "one character from the other page, then come back".

**The corner key is still overloaded and partly illegible.** It now has a guide and full-contrast glyphs, but seven functions in 11 px glyphs on one key, two of them ambiguous, is a lot for the one key that also sends. I would draw labels instead of the two ambiguous glyphs and restore cut, copy and paste somewhere reachable.

**The demo surface is the user's message.** Every demonstration should play in a sandbox (a temporary field, or a snapshot that is restored afterwards), so that learning never costs the user what they were writing.

## Changes that would most raise my score, in priority order

1. Fix the guide's chip layout so no curl is ever clipped, hidden under the thumb or placed off its path, and so chips hide the map cells they cover (defects 1, 8, 9).
2. Rename the lesson card's status class so phone lessons say "Your turn", "Done" and the wrong-stroke hint again (defect 2).
3. Run every demonstration in a sandbox, or snapshot and restore the composer, and keep each context's draft across switches (defects 3, 13).
4. Put the diagonal labels on the 45° rays or widen the diagonal sectors to match the key's aspect ratio (defect 4).
5. Calm and fit the key face: weight hierarchy, fixed label slots with real gutters, fitted custom labels (defect 5).
6. Treat a quote after a space as opening, and consider putting the colon and quotes on the steno page (defect 6).
7. Make the completion moment show the word, with one pop, and dismiss maps when a slide starts (defects 11, 12).
8. Animate the bottom row and pager with the page turn, cancel the press highlight on a two-finger swipe, and cap the narrow layout's height (defects 7, 10).
9. Add a deterministic suggestion row while spelling and make the copy about completions match what they do (defect 14 and the first design objection).
10. Fix the copy list, Look up for phrases and times, the corner key's ambiguous glyphs and missing clipboard and globe, and the small polish items (defects 15 to 20).

If items 1 to 8 were done well, I would score the prototype about 8.0 overall. With items 9 and 10 as well, and the key-face and guide-layout objections addressed rather than patched, I would expect about 8.6 to 8.8. Getting past 9 would, in my view, also need evidence from real thumbs on a real phone: hook and diagonal accuracy, and whether week-one users adopt word strokes at all.
