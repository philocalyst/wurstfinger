# Steno mode, round 1: UX and visual design review

Reviewer stance: two hats. The first is a person who texts all day on a stock phone keyboard, has never used MessagEase or stenography, and was handed the demo with no explanation. The second is a senior interaction and visual designer who has shipped mobile keyboards. Everything below was driven with real pointer events through Playwright (mouse down, move, up along thumb-like paths, including short, drifting, rounded and hesitating strokes), plus CDP screencasts for motion at roughly 12 to 25 ms per frame. All screenshots referenced here live under
`scratch/review/ux/shots/`
and are named relative to that folder. The scratch scripts that produced them sit in the sibling `pw/` folder (`t1.mjs` to `t42.mjs`, `msg.mjs`, `uxlib.mjs`).

## Scores

| Dimension | Score |
| --- | --- |
| Novelty | 7.5 |
| Wonderful and intuitive to use | 5.5 |
| End-to-end useful for real texting | 5.5 |
| Without fault (correctness and polish) | 4.0 |
| Communicative guidance | 6.5 |
| Visual design | 6.0 |
| Motion and feedback | 6.0 |
| **Overall** | **5.7** |

The concept is promising and several pieces are genuinely good: the live guide that lights the target and shows the reachable curls, the ribbon's "prob → probably" preview with grey ghost text in the composer, endings that respect spelling (run plus -ing gives running, resc plus -ed gives rescheduled), undo that reverts an expansion and lets the next space keep the literal text, and a Look up tool that answers "how do I write this" in plain words. The recogniser is solid for well-aimed strokes: across 124 word strokes from four sentences, my synthetic thumb with ±10° drift and 85 % length made no errors, and all six lessons completed with real pointer strokes on three random seeds each. But the demo is a long way from the owner's 9.2 bar. It has real-texting correctness bugs (numbers glue to words, capitals are lost, the send key fires on an aborted flick), a feature that silently overwrites a core word (Record), a crash in the coaching chip, consistent clipping and overlap in the guide, a phone-size page on which the lessons cannot be used, and a key face that is busier than it needs to be. I would not ship this under my name yet.

## First contact, cold (desktop and phone, dark and light)

Screens: `01-desktop-dark.png`, `02-mobile-dark.png`, `03-desktop-light.png`, `04-mobile-light.png`, compared with the current keyboard in `docs/images/keyboard-lower-dark.webp` and `keyboard-lower-light.webp`.

Within the first minute, from the screen alone, I understood that this is a keyboard where each key carries a big letter and a ring of smaller things, that the blue things are words, and that "abc / steno / 123" switches between three keyboards. I guessed from position that the wide bottom key is the space bar, although it has no label at all, only "-ed -s -ing 's -ly -er" in its corners. I did not understand how to type a small grey letter such as "q" or "v", because nothing on screen or in the lede says that a flick toward a small letter types it; the first rule card says "Letters and the six everyday marks keep their directions", which only makes sense to someone who already knows MessagEase. I did not understand the corner key at all: seven glyphs (123, return, abc, tab-like arrow, backspace, globe, chevron) are packed into one key, and five of them are drawn at about 2:1 to 2.8:1 contrast. The lede's "directions that used to be empty" refers to a previous state the cold user has never seen.

Once I pressed a key, things improved a lot: the guide card appears immediately above the finger, and moving toward a word lights it in blue with its curl relatives beside it (`20-flick-f3-40px.png`). That moment is the best part of the experience and is what would make me keep trying. Tapping "h" and "i" typed "Hi", auto-capitalised, with a dotted underline showing the word in progress (`10-after-tap-hi.png`).

The light theme is faithful to the current keyboard's palette, and the blue word labels pass contrast (5.0:1 light, 9.0:1 dark, 12 px bold). Key faces against the keyboard background are 1.12:1 in light, which matches iOS and the existing app, so I do not count it as a defect.

## Defects, most severe first

Each entry has a reproduction and a screenshot. "Flick" below always means real pointer events.

### 1. Numbers typed after a flicked word glue onto it ("at3:30")

Flick "at" on A (up-left), switch to 123 by the pager or the corner key, tap 3, flick ":" and type 30. The field reads "Thurs at3:30," instead of "at 3:30,". Flick words leave their space pending until the next word, and literal input on the number page never supplies it. This hits one of the commonest patterns in real texting ("at 8", "in 5 min", "on the 3rd"). Screenshot: `m5-end.png`.

### 2. Sentence capitalisation is lost after punctuation typed on the number page

Type "Hey Maya, yes I'll be there around ", switch to 123, tap 8, flick "." (down on 8), switch back to steno and flick "want" (up on E, curl right). The result is "around 8. want" with a lower-case "want". Setting the same text programmatically and flicking "want" gives "8. Want", so the bug is that number-page input does not update the translator's sentence state. Screenshot: `m1-end.png`.

### 3. The send key fires on an aborted flick, and the corner key has no guide

With text in the composer, press the corner key, move up about 30 px toward the return glyph, hesitate, move back to the centre and lift. The message is sent. The classifier takes the farthest point, so returning to the start does not cancel, and on the corner key "north" is return, which in Messages is send. There is also no guide card on the corner key at all; the only feedback is the tiny target glyph turning blue on the key itself, which a real thumb covers (`101-corner-montage.png`). Sending is the one irreversible action on the keyboard and it is the least communicated.

### 4. Record cannot capture a free curl, and silently replaces a core word instead

Open Dictionaries, press Record, and draw a flick up-right on I finished with a curl to the right (a slot that is empty). The recorder fills in "I-ne", the plain flick for "if", because an undefined curl resolves to its flick before the recorder sees it. Type "I'd love to" and press Add: "if" now types "I'd love to" everywhere. The only warning is a faint line after the fact, "Added. It now overrides "if"." Recording a tap on E likewise yields "E", so a user can overwrite a letter. Screenshot: `97-record-added.png`. The same panel also says "Filter 1 entries".

### 5. Horizontal flicks are much less forgiving than vertical ones

Keys are now about 1.6 times wider than tall, and the recogniser divides horizontal travel by that aspect ratio before classifying. Two consequences, both measured with real strokes on T: a straight flick east needs roughly 36 to 40 px of travel before it stops being a tap (36 px gave "t" in one run and "you" in another), whereas north works from 22 px; and the east and west sectors are only about ±14.6° wide in physical angle, so an east flick drifting 15° upward reads as up-right. A thumb that arcs from level to 18° typed "Y" instead of "You", and the same arc on A typed "Very" instead of "-". Sideways curls on vertical flicks have the same penalty: a rounded right curl with 20 to 22 px of sideways travel fell back to "the", and it needed about 25 to 30 px to become "there". The guide does show the misread live (`108-east-drift-15deg-reads-y.png`), which helps, but the asymmetry is a design consequence of the wider keys that the recogniser should absorb.

### 6. "Drag left to keep deleting" deletes a whole word every 14 px

Type "I think you are right about that" with flicks, press the corner key, wait 200 ms and drag left slowly. At 30 px "that" is gone, at 44 px "about", at 58 px "right", at 72 px "you". People who know the current keyboard's character ratchet will lose whole words in a fraction of a second. The ratchet strip is also drawn on the space bar rather than under the finger, on top of the "-ly" label. Screenshot: `86-slide-delete-words.png`.

### 7. Editing inside a word inserts a space

With "I think you ar right" in the field, move the caret to just after "ar" with the space bar and tap "e". The result is "I think you ar e right". Flicking a word with the caret inside "right" gives "r theight". Fixing a missing letter, the most common correction in real texting, therefore requires leaving steno mode. Screenshot: `109-midword-fix-adds-space.png`.

### 8. The coaching chip is one stroke late, goes stale, and crashes when tapped

Spell "you" (y, o, u), tap space, then flick "are". The chip "you · one flick" appears only after the flick that follows, and after a later word it can still be showing a tip about an earlier one (after "Hey Maya," the chip still says "hey · flick and curl", `m1-maya.png`). Tapping the chip in that state throws `TypeError: Cannot read properties of null (reading 'parts')` and no demonstration plays (`104-coach-chip.png`). The cause is that the ribbon renders on the engine's emit, before `noteStroke` updates `state.coach`, so the chip shows the previous stroke's state.

### 9. The guide card flashes on every letter tap and never learns from taps

With the default "Fades" setting, tap t, h, e quickly (50 ms each, 120 ms apart). Each tap throws a full 3×3 card over the keys above for about 150 to 200 ms, and on the top row and the H key the card covers the composer and the text being typed (`seq-quick-taps-sheet.png`). Forty taps on O later the card still appears at full opacity 60 ms into the tap and `wf.kb.usage` is still empty, because only word strokes count as practice. A person who mostly spells, which is everyone in week one, sees a strobe on every keystroke indefinitely.

### 10. The guide is clipped at the screen edge and its curl chips overlap

For every key in the left column the card extends past the screen's left edge and is cut off, along with the curl chip on that side: "any" on A, "he's" and "help" on H, "time" on T, in both themes and at every scale (`50-montage-a.png`, `105-montage.png`, `107-after-resize-flick.png`). On diagonal flicks the back chip and the left chip collide: on "should" (S, down-right) the "same" chip covers "she's" (`50-montage-b.png`, `105-montage.png`). Chips also land on top of the pager ("yes" over "steno" in `108-east-drift-15deg-reads-y.png`) and of neighbouring keys' labels, and because the card is translucent the labels underneath bleed through it.

### 11. At phone size the lessons cannot be used, and the page scrolls sideways

On a 393 px viewport the side panel stacks below the phone, so the lesson cards start about 800 px down and lesson 3 sits at about 2,000 px. Tapping Watch plays the demonstration on a keyboard that is 1,500 px above, out of view; the only visible change is words turning green in the card (`92-mobile-watch-tapped.png`). "Try it yourself" has the same problem in reverse: you cannot see the target words and the keyboard at once. The document is also 478 px wide on a 393 px screen because the off-screen keyboard pages (the 123 page sits to the right) are not clipped, so the page pans horizontally (`90-vp-mobile.png`; measured `scrollWidth` 478).

### 12. The texting-shorthand pack rewrites the user's own shorthand by default

Spell "ty" and tap space: "thank you". Likewise "rn" becomes "right now", "jk" "just kidding", "brb" "be right back", "tbh" "to be honest", "idk" "I don't know", "np", "ofc", "nvm", "cya", "pls", "thx", "sry", "bc", "def", "prob", "mins" and "hrs" (`80-idk-after-space.png`). People who type shorthand do it on purpose and it is part of their voice. Undo followed by space keeps the literal text, which is a nice touch, but nothing tells the user so. Look up contradicts the behaviour: it says "idk: Spelled letter by letter … No stroke is assigned".

### 13. The ribbon shows completion fragments instead of words

After a completion or an expansion the ribbon chip shows only the inserted tail: "intment" for appointment, "heduled" for rescheduled, "erful," for wonderful, "rtunately" for unfortunately, and "rent." for different (`m5-end.png`, `60-try-spell.png`). These read as garbage and undercut the "paper tape" idea.

### 14. Lessons do not say when you went wrong

Start "Try it yourself" on lesson 1, tap I, then flick "the" instead of "think". The card keeps highlighting "think" as next and says nothing; there is no mark on the wrong word and no hint that one tap on the corner key takes it back (`103-lesson-wrong-stroke.png`).

### 15. Two spelled words in a row run together

Spelling "Jonas" and then spelling "when" gives "Jonaswhen" (`m3-end.png`). I made this mistake naturally as a week-one user, because flicked words take care of their own space and the lessons stress "you never touch the space bar". Tapped spaces after flicked words are absorbed correctly ("The" + space + "you" is "The you"), so the safe habit is to tap space always, but nothing teaches that.

### 16. The corner key's secondary glyphs are too faint

Return, 123, abc, delete-word and globe are drawn at `rgba(60,60,67,.36)` on `#F2F2F7` in light (about 1.9:1) and `rgba(235,235,245,.34)` on `#1C1C1E` in dark (about 2.8:1), at roughly 9 to 10 pt on a phone. On the current keyboard return and 123 are full-strength keys of their own. Screenshot: `99-phone-corner-light-3x.png`.

### 17. Key-face labels collide

At true phone scale the top-row labels on the left keys almost touch and read as phrases: "about very", "have know", "right really", "from sorry" (`99-phone-keys-dark-3x.png`). Long custom words are not fitted at all and overlap their neighbours: "inI'd love to" on I, "Hello there" on top of "how", "unfortunately" on top of "think" (`106-long-custom-labels.png`).

### 18. Page turns snap the bottom row and the pager

Drag the strip above the keys to the left. Only the 3×3 grid slides; the space bar keeps showing steno endings and the pager thumb stays on "steno" until release, and at release the space bar and corner key labels swap in one frame while the grid is still sliding (`93-ribbon-drag-mid-120px.png`, `seq-ribbon-release-sheet.png`).

### 19. Release frames are cluttered

On release the fading guide card overlaps the rising commit pop and the keys above, so for one or two frames "the" sits on top of "at about very there need" (`21-release-f0.png`). Pops also rise over the pager and the composer ("?" over the field in `m1-end.png`, "-ly" over H in `m5-end.png`), whereas the current keyboard's spec clamps the pop inside the keyboard.

### 20. Copy problems

The four rules assume MessagEase literacy and never state the most basic action (flick toward a small letter to type it). "Right for is/are/am, left for not/will, back for have, then the words that begin the same way" is accurate but impenetrable until you have seen "that → that's". Look up says "Every word has exactly one" stroke while "different" takes five strokes; it means "one way to write it". The per-key list in Look up gives each word's curls as "away · almost" without saying which is right, left and back. The Settings say the corner key's drag "keeps deleting" without saying it deletes whole words. "On pause" wraps onto two lines in its segmented control. Screens: `30-panel-learn.png`, `95-tab-lookup.png`, `95-tab-settings.png`.

### 21. Smaller polish items

Watch and Try it yourself wipe whatever is in the composer without warning. On send, the existing bubbles jump up in a single frame while the new bubble fades in (`seq-send-sheet.png`). The space bar carries no "space" label or glyph.

## What works, for balance

The live guide is excellent once a stroke is underway: the target lights with exactly what will be typed, the curls appear where the finger would go, and a 500 ms hesitation at the corner still produces the curl. The ribbon's spelling chip ("prob → probably [space]") together with the grey ghost text in the composer is the clearest completion UI I have seen on a gesture keyboard (`102-spelling-prob.png`). Endings follow spelling rules and combine with completions. Undo is consistent: it takes back a whole stroke, reverts an expansion, and falls back to deleting a character when the caret is mid-text. The Numbers tab is unusually honest about what is modelled and what is measured. The ghost-finger demonstration is well paced (the card appears about 190 ms after Watch, the finger rests, then travels; `seq-watch-hooks-sheet.png`). The "Words on the keys: Hidden" view is calm and attractive (`99-words-hidden.png`).

## Design-level objections that no bug fix would cure

**The spacing model is asymmetric.** Flicked words own their space, spelled words do not, and literal input from the number page does not either. A user must remember how the previous word was produced to know whether to tap space. I would make the translator own the boundary uniformly: any word-ending stroke, number-page input or mode switch after a word should resolve the pending space, and the lessons should teach "tap space whenever you like, it is never doubled" rather than "you never touch the space bar".

**The key face carries too much at equal weight.** Each word key shows up to eight blue bold words plus grey letters, and every word has the same colour and weight, so the face reads as a word cloud rather than a map. I would show the four cardinal words at full weight and the diagonal words lighter, give each label a fixed slot with a minimum gutter, fit or truncate custom labels, and consider making the hidden-words face the default once a key has been used a few dozen times, since the guide already shows everything on press.

**The guide should be for strokes, not taps.** Show the card after a short movement threshold or a 120 to 150 ms rest rather than on touch-down, count letter taps toward "familiar", keep it inside the screen with the near-edge chips moved inward, and never let it cover the line being typed (place it beside the key for the top row, or shrink it).

**The corner key is overloaded and holds the one irreversible action.** Seven functions share one key, with faint labels, no guide, and a return/send that fires on an aborted flick. Either give return its own target again, or give the corner key the same guide as every other key and make return require a deliberate release away from the centre (a return to centre cancels).

**The recogniser should work in physical space on wide keys.** Normalising by a 1.6 aspect ratio makes horizontal flicks long and narrow. Classify direction in physical angle with equal sectors (or widen east and west), and scale the length threshold per axis by thumb physiology rather than key shape. The same applies to the sideways leg of curls.

**There is no typo tolerance for spelled words.** Determinism without a language model is a principled choice and the design says so, but a real texter will mistype letters, and in steno mode those typos persist where the stock keyboard would fix them. A deterministic near-miss suggestion in the ribbon, inserted only when tapped, would keep the principle and close much of the gap.

**Defaults should not rewrite the user's voice.** The shorthand pack is a good idea as an opt-in or as a ribbon suggestion, not as a silent default expansion of "ty", "rn" or "jk".

**The demo needs a phone-first layout.** At phone width the keyboard should stay pinned on screen while the lessons scroll beneath it (or the lesson strip should live above the phone's keyboard), so Watch and Try can be seen.

## Changes that would most raise my score, in priority order

1. Fix the real-texting correctness bugs: pending space and sentence capitalisation across the number page (#1, #2), mid-word editing (#7), and make return on the corner key cancel when the finger comes back (#3).
2. Give the corner key a guide and full-contrast labels, and make slide-delete work by characters (or by a clearly shown, slower word ratchet under the finger) (#3, #6, #16).
3. Make Record capture free curls and refuse, or ask before, overriding an existing word or a letter (#4).
4. Recognise horizontal flicks and sideways curls in physical space so that a natural thumb arc types "you", not "y" (#5).
5. Stop the guide flashing on taps, keep it fully on screen, and lay out curl chips so they never overlap each other or the pager (#9, #10).
6. Fix the coaching chip's timing and the crash on tap, and show whole words in the ribbon (#8, #13).
7. Make the shorthand pack opt-in or suggestion-only, document the undo-then-space escape, and make Look up aware of every pack (#12).
8. Rework the phone-size layout so lessons and keyboard are visible together, and clip the off-screen pages (#11).
9. Calm the key face: weight hierarchy between cardinal and diagonal words, fixed label slots with gutters, fitted custom labels, and a space glyph (#17, #21).
10. Rewrite the first-run copy for someone who has never seen MessagEase, teach "tap space whenever you like", and make lessons flag a wrong stroke and point at undo (#14, #15, #20).
11. Polish the motion: animate the bottom row and pager with the page turn, keep pops inside the keyboard, and scroll the thread smoothly on send (#18, #19, #21).
