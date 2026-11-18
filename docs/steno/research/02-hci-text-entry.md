# 02 HCI text-entry evidence for a stenography mode on a 3×3 thumb keyboard

*Compiled 2026-11-17 from primary sources where they could be retrieved; every number carries a source and an evidence tag.*

This document collects what the human-computer interaction literature measured about mobile text entry, gesture vocabularies, thumb motor performance and predictive entry.
It then derives constraints for Wurstfinger's planned steno mode: whole words or word chunks per gesture, deterministic dictionary lookup, and an on-keyboard guide that teaches the gestures during use.
It does not choose a steno theory; it constrains the input primitive (tap, flick, glide, two-thumb chord, or sequences of these).

Evidence tags used throughout:

- **[read]**: the full text (or the relevant section) of the primary source was retrieved and read for this report.
- **[abs]**: only the abstract, an official summary page or the publisher's record was read.
- **[sec]**: the number comes from a later paper or a review that cites the original; the original was not retrieved.
- **[comm]**: a vendor claim, a press report or a community post. These are not controlled measurements and are labelled as such wherever they appear.
- **[calc]**: computed for this report from the project's own corpus or geometry (procedure in the appendix).

Geometry used below comes from `03-current-keyboard-spec.md`: on a default portrait iPhone, a letter key is 57.75 pt square with a 62.75 pt pitch, so the 3×3 letter block is about 183 pt across.
An iOS point is roughly 0.156 mm on 326 ppi (@2x) devices and 0.166 mm on 460 ppi (@3x) devices, so a key is about 9.0 to 9.6 mm, the pitch about 9.8 to 10.4 mm, and the whole letter block about 29 to 30 mm.
The tap/flick boundary (`swipeLength`) is 19.9 pt, about 3.2 mm.
The existing touch guide unfolds the full 3×3 map after the finger rests for 0.35 s, and the opt-in long swipe fires at 1.5 key sizes (86.6 pt).

## Summary for the decision

1. **The bar to clear.** In 37,370 volunteers, mobile typing averaged 36.2 WPM with 2.3 % uncorrected errors; two-thumb typists averaged 38.0 WPM and right-thumb-only typists 30.2 WPM (Palin et al. 2019) [read]. MessagEase's own game reported a mean of 32.7 WPM (SD 12.0) across posted scores and an 87 WPM champion [comm]. A Fitts-style model of Wurstfinger's letter mode predicts about 46 WPM for a one-thumb expert [calc].
2. **Prediction is not free, and neither is abbreviation.** Word-prediction use correlated negatively with speed (r = −0.18) while autocorrection correlated positively (r = 0.24) (Palin et al. 2019) [read]. More assertive suggestions saved keystrokes but slowed people down (Quinn & Zhai 2016) [abs]. Verifying a predicted word cost novices about 1.1 s per check (Pavlovych & Stuerzlinger 2004) [read]. But abbreviated sentence input, which is the closest analogue to briefs, reached 9.6 WPM against 9.9 WPM for full words after practice (Adhikary et al. 2021) [abs]. Determinism removes the verification cost; it does not by itself create a speed gain.
3. **How people move from novice to expert.** The best-supported pattern is a guide that appears only after a short hesitation (250 ms in OctoPocus, 1/3 s in marking menus, 0.5 s in M3) and whose novice action is the same movement as the expert gesture. Always-visible tracing guides improve performance during training and hurt retention (Anderson & Bischof 2013) [read]. People learned about 12 to 15 new gestures per short practice session (Zhai & Kristensson 2012; Zheng et al. 2018) [read]. Recall dips after lay-offs (Kurtenbach & Buxton 1994) [read], and rehearsal alone does not make people switch (Gutwin et al. 2015) [abs].
4. **Gesture limits.** Eight directions at depth two is the reliable zone: under 10 % errors with a stylus (Kurtenbach & Buxton 1993) [read] and 2.9 % errors with a finger or thumb on a phone using 19 mm grid tiles (Zheng et al. 2018) [read]. Depth three costs 9 % (finger, M3) to 17 % (stylus, compound marks). Sequences of separate simple marks stay at about 93 % accuracy regardless of depth and footprint, while compound zig-zag marks lose accuracy at a 32 mm footprint (Zhao & Balakrishnan 2004) [read]. Our letter block is about 30 mm with keys at the 9.2 to 9.6 mm thumb minimum (Parhi et al. 2006) [abs], so thumb glide accuracy on Wurstfinger's grid is unknown and must be measured before anything else.
5. **Spelling by gliding does not fit our constraints.** Only 20.9 % of word tokens consist solely of the nine tap letters, and only 10.5 % can be glided as a simple path of adjacent keys [calc]. Gliding through each letter's key, T9 style, gives a path that a more frequent word already owns for 15.0 % of tokens and for 23 of the top 200 words [calc]. Briefs therefore have to be memorised codes, and the vocabulary is bounded by learning, not by geometry.
6. **The payoff is modest and fragile.** Under a stated model, 200 briefs chosen by benefit raise one-thumb expert speed from 45.8 to 50.1 to 52.2 WPM, and 1,000 briefs to 56.7 to 61.8 WPM [calc]. A 300 ms recall hesitation cancels a small inventory. Briefs for one- and two-letter words are slower than tapping them. The robust gain is effort (about 21 % fewer gestures with 200 briefs) and a higher ceiling for committed users.
7. **Recommendation.** Use short single-touch corner strokes as the brief primitive: start on a key, move in one direction, turn by at least 90°, lift. Recognise them by the direction sequence relative to the start key, draw and teach them as paths over the keys, insert the space automatically, and leave taps and flicks untouched for letter-by-letter fallback. Prototype first with dictionary-translated sequences of ordinary gestures, which needs no engine change. Treat two-thumb chords as an optional later layer and unordered key sets only as an error-tolerance alias. The details, the strongest counter-argument and the novelty assessment are in §6.

## 1. Baselines

### 1.1 Measured mobile typing

| Source | Setting | Speed | Errors | Tag |
| --- | --- | --- | --- | --- |
| Palin et al. 2019 | 37,370 volunteers, own phones, web transcription task | 36.17 WPM (SD 13.22); 75 % below 43.98; fastest over 80 | 2.34 % uncorrected (SD 2.08); KSPC 1.18; 1.89 backspaces per sentence | [read] |
| Palin et al. 2019, by posture | self-reported | two thumbs 38.0; right thumb 30.2; left thumb 30.8; right index 26.7 | n/a | [read] |
| Palin et al. 2019, by intelligent text entry | inferred from input events | autocorrect only 43.4; none 34.8; prediction only 32.8; gesture only 32.2 (small group) | about 2.2 to 2.4 % in all groups | [read] |
| Azenkot & Zhai 2012 (cited by Palin) | lab | two thumbs 50.03, one thumb 36.34, index finger 33.78 | n/a | [sec] |
| Jiang et al. 2020 | 30 participants, eye tracking, no correction aids reported | two fingers 39.33, one finger 27.19 | gaze on the keyboard 60 % (two fingers) and 70 % (one finger) of the trial | [read] |
| Reyal et al. 2015, lab | 12 participants, 5 sessions each, Google keyboard | tap typing 29.1 to 32.8; gesture typing 25.4 to 30.6 | character error rate 1.1 % (tap) versus 2.0 to 2.3 % (gesture) | [read] |
| Reyal et al. 2015, in the wild | experience sampling over 4 weeks, own phones | tap 30.1 to 31.1; gesture 33.6 to 39.1 | 1.6 to 2.4 % (tap) versus 3.3 to 4.1 % (gesture) | [read] |
| Kristensson & Vertanen 2014 | composition with an "inviscid" method | 67 WPM, the rate at which creativity rather than the method limits | n/a | [abs] |

Palin et al. found that 74 % of participants typed with two thumbs, and that among people who used intelligent text entry, 8 % of words were autocorrected, 10 % were picked from the prediction list and 22 % were gestured [read].
The inviscid estimate matters for us: a text entry method faster than about 67 WPM no longer speeds up composition for the average person, only transcription.

### 1.2 Gesture typing (SHARK, ShapeWriter, Swype, Gboard glide)

The word-gesture keyboard was introduced as "shorthand aided rapid keyboarding" on a stylus keyboard (Zhai & Kristensson 2003) and made large-vocabulary by SHARK² (Kristensson & Zhai 2004).
The CACM review (Zhai & Kristensson 2012) [read] reports, for novices on a QWERTY layout, 15, 20 and 25 WPM after 5, 20 and 40 minutes at a 1.1 % error rate, with the fastest participants above 40 WPM after 40 minutes.
Ten participants who practised five fixed phrases for 15 minutes reached an error-free peak of 57.5 WPM on average, and the best reached 99 WPM.
The same review argues the speed case in stenographic terms: one continuous movement per word avoids repeated lifts and inserts the space for free, and with English words averaging 4.7 letters, one keystroke in 5.7 is a space.
Its central behavioural claim is a shift from visually guided letter-to-letter tracing to recall-driven open-loop gesturing, helped by the fact that a word's movement pattern is always the same.

In use, gesture typing was faster than tap typing in the wild but not in the lab, and always more error-prone (Reyal et al. 2015) [read].
Out-of-vocabulary words were singled out as the major error source.
On QWERTY, 6.4 % of the words in a 40,000-word lexicon have another word with an identical ideal gesture, and gesture typing's error rate is 5 to 10 % higher than touch typing's (Smith, Bi & Zhai 2015, citing Bi et al.) [read].
Commercially, the paradigm shipped as ShapeWriter, SlideIT, Swype and Nuance's T9 Trace (Zhai & Kristensson 2012) [read], and later as gesture typing in the major platform keyboards.
Microsoft's Word Flow, a shape-writing keyboard, set a Guinness record for the fastest touchscreen text message in 2014 (18.43 to 18.44 s, reported as about 84 WPM), which the Fleksy keyboard beat shortly after with 18.19 s [comm].

### 1.3 MessagEase and Thumb-Key

No controlled long-term study of the touchscreen MessagEase was found.
What exists:

| Source | What was measured | Result | Tag |
| --- | --- | --- | --- |
| Scully-Allison et al. (about 2017), University of Nevada, Reno | first exposure, 8 participants, Android | 1,482 ms per character (about 8 WPM) and 35.75 % errors per line, against 255 ms for QWERTY and 376 ms for Minuum | [read] |
| Tampere University thesis, "Beginners Performance with MessagEase and QWERTY" | 10 participants, 3 sessions | 7.43 WPM in session 1 and 10.96 WPM in session 3; QWERTY about 17 WPM; error rates not significantly different | [sec] (repository blocked automated access; numbers from the search index summary) |
| MacKenzie 2002 | keystrokes per character of the original 12-key keypad MessagEase | KSPC 1.8210, because every letter took two key presses on that keypad version | [read] |
| MessagEase game statistics, quoted by the developer in 2014 | self-selected posted scores | mean 32.7 WPM, SD 12.0; leaderboard entries required at least 40 WPM | [comm] |
| Developer (App Store listing) | champion | 87 WPM | [comm] |
| Colemak forum users, 2014 | personal reports | 22 WPM (learning), 35 to 45 WPM, 63 WPM one thumb and 78 WPM two thumbs in the game, "88 WPM without word prediction" | [comm] |
| Thumb-Key community thread (Lemmy) | personal reports | about 13 WPM just after switching; 38 WPM one-handed versus 27 on QWERTY; 40 to 44 WPM; 70 WPM in a 30 s Monkeytype test with letters hidden; 75 WPM; 101.98 WPM in a 30 s test on a split layout | [comm] |

The touchscreen MessagEase types every letter with one gesture, so its gestures per character are 1.0 before capitals and corrections, unlike the keypad version MacKenzie modelled.
The pattern in these numbers is the familiar one for non-QWERTY layouts: a deep initial dip (8 to 11 WPM in early sessions), then a long tail of enthusiasts who report 60 to 100 WPM in short tests.
None of the community numbers control for text, test length or error handling.

### 1.4 Japanese flick input

Flick input puts the gojūon syllabary on twelve keys: each key holds one consonant row, a tap types the row's "a" syllable, and flicking left, up, right or down types the "i", "u", "e" or "o" syllable.
PonDeFlick's authors describe it as systematically assigning more than fifty kana to twelve keys (Akamine et al. 2024) [abs], and a 2021 paper cites a statistic that 80 % of young Japanese use flick input on smartphones (Yokoyama et al. 2021) [read].

No peer-reviewed smartphone speed for ordinary sighted flick input was found in the time available; the numbers that exist are for variants:

- No-look Flick, a one-handed eyes-free variant using two relative flicks per kana (consonant, then vowel) on a 2×2 grid, reached 51.2 characters per minute with 0.6 % errors in the 10th session and 33.9 cpm with 4.8 % errors fully eyes-free in the 11th; participants could flick eyes-free on the 2×2 grid with 96.1 % accuracy (Fukatsu, Shizuki & Tanaka 2013) [abs].
- On game controllers, flick users of JoyFlick reached 60.1 cpm against 39.2 cpm for the standard syllabary keyboard after a week (Yokoyama et al., INTERACT 2021) [abs].
- On a smartwatch, PonDeFlick reached 57.7 cpm over ten days (Akamine et al. 2024) [abs].
- Among 33 students, the fastest and slowest flick typists differed about threefold in cpm, and cpm correlated with flick movement time at r = −0.75 (IPSJ conference paper, Japanese) [sec].

Why the design works is an analysis rather than a measured result, but each part has support elsewhere in this report.
The code has two orthogonal factors (row by key, vowel by direction), and the direction meaning is identical on every key, which is the consistent mapping that automaticity requires (Schneider & Shiffrin 1977).
The novice fallback (toggle input, repeatedly tapping the same key) starts on the same key as the expert flick, so the novice path rehearses the expert's first movement.
Wagner, Lecolinet & Selker (2014) [abs] found the same principle for chords: categorised chord-to-command mappings were retained more accurately over a week than random ones.

### 1.5 Multitap and T9

| Source | Method | Novice | Expert | Tag |
| --- | --- | --- | --- | --- |
| James & Reischel 2001 (as tabulated by Pavlovych & Stuerzlinger 2004) | multitap, Nokia keypad | 7.98 WPM | 7.93 WPM (5.33 newspaper text, 10.53 chat) | [sec] |
| same | T9 | 9.09 WPM | 20.36 WPM (15.05 newspaper, 25.68 chat) | [sec] |
| Silfverberg, MacKenzie & Korhonen 2000 | model for experts | n/a | multitap about 21 to 27 WPM; T9 41 WPM one thumb to 46 WPM two index fingers, falling to 35 WPM if each NEXT press costs 500 ms | [read] |

The gap between the T9 model (41 WPM) and expert measurements (20 WPM) is the cost of checking what the disambiguator produced, which Pavlovych & Stuerzlinger measured directly (see §5).
James & Reischel also noted that a typical SMS user then sent about 20 messages a month, which made true expertise rare (as reported by Pavlovych & Stuerzlinger 2004) [read].

### 1.6 What suggestions and prediction cost

Quinn & Zhai (2016) [abs] varied how assertively suggestions were shown (always, never, or above a probability threshold).
More assertive suggestions reduced keyboard actions and were preferred, but the cost of attending to and using them made average entry slower.
Arnold, Gajos & Kalai (2016) [read] extended the suggestion bar to multi-word phrases accepted by repeated taps.
Participants accepted more of the suggested words in the phrase condition (45 % against 28 %), inserted phrases with 0.8 s between same-slot taps against 1.1 s, and yet typed no faster overall (20.0 against 20.9 WPM, not significant); phrase suggestions also changed what people wrote.
PhraseFlow, which re-decodes earlier words from later taps, first made people slower than Gboard (43.5 against 52.3 WPM) because of the attention its changing text demanded; a redesign closed the gap to 63.4 against 63.8 WPM (Zhang & Zhai 2021) [read].
Banovic et al. (2019) [abs] modelled expert typing with autocorrect and concluded that typists' aversion to errors imposes its own ceiling, which lowers the value of even very accurate autocorrection.

### 1.7 What the baselines mean for us

A steno mode is competing with two different baselines.
For the median user, the baseline is 30 to 38 WPM tap typing with autocorrect.
For a committed Wurstfinger user, the baseline is MessagEase letter entry, where community reports reach 60 to 100 WPM in short tests and our model predicts about 46 WPM for one thumb.
Whatever the brief primitive is, it must beat letter entry for the words it replaces, after recall time, or it slows the expert down.

## 2. Marking menus and the novice-to-expert transition

### 2.1 Marking menus: rehearsal and the delayed menu

In a marking menu, pressing and waiting about 1/3 s pops up a radial menu under the pen; drawing the same movement without waiting selects the item directly (Kurtenbach & Buxton 1994) [read].
Because the novice selection and the expert mark are the same movement, novices "learn on the job", which Kurtenbach called rehearsal (Kurtenbach & Buxton 1993) [read].
In a real-work case study, two users made 3,013 and 1,945 selections; with experience, marks dominated (only 6.6 % of user A's selections used the menu), a mark was 3.5 times faster than a menu selection on average, and still 3.0 to 4.2 times faster after subtracting the 0.33 s delay (Kurtenbach & Buxton 1994) [read].
The transition was not one-way: after lay-offs, mark use dropped and users went back to the menu to refresh their memory, with smaller dips as experience grew.
Marks were faster even without the delay because the user waits for the menu (about 0.15 s to draw) and then reacts to it.

There is no strong direct experiment on the optimal delay.
The M3 authors state that they are not aware of strong and direct empirical studies of the 1/3 s delay, and justify it from memory research: the cost of waiting incentivises active retrieval, but too much cost discourages (Zheng et al. 2018) [read].
Observed choices: 1/3 s (marking menus), about 250 ms (OctoPocus), 0.5 s press-and-hold (M3), and 0.35 s in Wurstfinger's existing touch guide.

### 2.2 Breadth, depth, and simple versus compound marks

Kurtenbach & Buxton (1993) [read] measured hierarchic marking menus with a pen and a mouse in breadths 4, 8 and 12 at depths 1 to 4.
Errors stayed under 10 % for breadth 4 up to depth 4 and for breadth 8 up to depth 2; at breadth 8 and depth 3 or more, marking became error-prone even for experts.
The errors came from off-axis items, so frequent items belong on the up, down, left and right axes.
Breadth and depth traded evenly in the acceptable range: 64 items as 4×3 or as 8×2 took about the same time with about the same errors.
Response time grew linearly with depth, and the pen beat the mouse only once menus got large.
Earlier work they cite found that menus of 2, 4, 6, 8 and 12 items work well for single-level marks (Kurtenbach, Sellen & Buxton 1993).

Zhao & Balakrishnan (2004) [read] replaced the single zig-zag (compound mark) with a series of separate straight strokes (simple marks).
Overall accuracy was 93 % for simple marks against 80 % for compound marks, and simple marks stayed at about 93 % across compass4-2, compass4-3, compass8-2 and compass8-3, which raises the usable menu from about 112 items to 512.
Input footprint from 7.8″×8.8″ down to 1.25″×1.25″ (about 32 mm) made no difference to simple marks, while compound marks lost accuracy and speed at the smallest size.
With compound marks, on-axis marks were more accurate than off-axis ones; with simple marks, all direction combinations were equally accurate.
Between successive simple marks, participants paused 0.481 s on average (median 0.375 s, 95 % under 1.156 s, 99 % under 1.875 s), so the authors recommend a 1 to 2 s threshold for deciding that a new stroke continues the same command.
This was a stylus study with labels that named the compass directions, so it measures motor limits rather than memory.

### 2.3 Marking menus with fingers and thumbs on a phone (M3)

M3 Gesture Menu is the closest prior art to a gesture vocabulary on a 3×3 grid (Zheng, Bi, Li, Li & Zhai 2018) [read].
It is a 3×3 grid of 19 mm tiles on a Nexus 5X; the gesture starts on an activation tile and slides through a category tile to an item tile, and it is recognised by proportional shape matching adapted from SHARK².
Novices can tap through the menus, intermediates can trace the path over the displayed grid, and experts draw the shape without the display.

| Depth (capacity) | Total time | Error rate |
| --- | --- | --- |
| 1 (8 commands) | 564 ms | 0.35 % |
| 2 (64 commands) | 747 ms | 2.91 % |
| 3 (512 commands) | 999 ms | 8.85 % |

There was no effect of finger: half the participants used the right thumb and half the index finger.
For comparison at depth 3 with 512 items, the original compound-mark marking menu with a stylus took 2.3 s at 17 % error, and the multi-stroke menu 3.4 s at 7 %.
In the learning experiment, after three 10-minute sessions on three days, participants recalled 12.3 (M3) and 13.8 (marking menu) gestures, and needed on average 6.5 trials per command before first recalling it.
Eleven participants found M3's gestures easier to remember, ten found the marking menu's stroke orientations harder to memorise than shapes, and three who memorised marking-menu strokes as static shapes said this made the stroke order hard to retrieve.
The authors' cost-benefit estimate is that a command must then be used at least about 18.5 times in expert mode to repay the learning time, assuming 10 learning trials.

Two cautions carry over to us.
M3's tiles are about twice the linear size of Wurstfinger's keys, so the whole M3 grid is about 57 mm against our 30 mm.
And the experiment manipulated incentives (blocking until the expert technique was used), which the authors suspect real use would not provide.

### 2.4 Feedforward and guides

FlowMenu merged marking menus with Quikwriting-style text entry so that a command and its parameters could be entered in one stroke (Guimbretière & Winograd 2000) [abs].
A later comparison found FlowMenu and control menus significantly faster than Toolglass, and attributed the gain to merging command selection with direct manipulation (Guimbretière, Martin & Winograd 2005) [abs].

OctoPocus shows, after a hesitation of about 250 ms, the remaining path of every gesture that is still possible from the current point; as the user draws, unlikely paths thin and disappear (Bau & Mackay 2008) [read].
With a mouse and a difficult 16-gesture set, it was slightly faster than a help menu in novice trials (5.7 against 5.9 s), was used more often (40 % against 32 % of trials), and trials made without any help had fewer errors for gestures trained with it (4 % against 7 %; 4 % against 8 % across all training trials).
Adapted to a two-level, four-item marking menu, it also beat the hierarchic marking menu on input time.

Anderson & Bischof (2013) [read] tested four guide types with a pen using a retention-and-transfer design from motor learning (tests 15 minutes and about 24 hours after training, without guides).
Traceable guides, static or dynamic, gave the best performance during training and the worst retention and transfer.
Crib notes, and an adaptive guide that vanished progressively earlier in each trial (full length at first, half length midway, not at all at the end), gave lower errors at retention.
The authors explain this with the guidance hypothesis: guidance that is always present becomes part of the task.
Kurtenbach, Moran & Buxton's animated crib sheets are the older form of on-demand demonstration (as cited by Anderson & Bischof 2013).

Arpège taught multi-finger chords by guiding finger placement progressively; users could learn and retain a large chord vocabulary both with Arpège and with a cheat sheet (Ghomi et al. 2013) [abs], and an earlier report states Arpège took similar time with almost three times fewer errors [sec].

### 2.5 Strokes versus keys for memory

Appert & Zhai (2009) [read] compared stroke shortcuts with keyboard shortcuts for 14 frequently tested commands among 60, with a stylus.
Participants switched from menus to shortcuts more often with strokes (shortcuts used in 96 % against 88.5 % of trials), were faster, recalled more, and made fewer errors.
The advantage was cognitive: by about the 25th exposure, time and recall were indistinguishable.
On the second day, participants recalled about three times as many stroke shortcuts as keyboard shortcuts.

For word gestures, Zhai & Kristensson's experiment (reported in the 2012 review) [read] had participants practise on an unfamiliar layout with expanding rehearsal intervals for 40 minutes per session.
They learned on average 15 word gestures per session; after four sessions they produced about 49 words correctly at the first attempt (range 39 to 62) and about 59 with a second attempt.
The authors note that the 50 most common English words cover 40 to 50 % of word occurrences in common English; in the web corpus this project uses, they cover 28.2 % (see §6.1).

### 2.6 Why people do or do not switch

Cockburn, Gutwin, Scarr & Malacria (2014) [abs] review interfaces that support the move to expertise and note the persistent failure of users to adopt faster methods.
Scarr, Cockburn, Gutwin & Quinn (2011) [read] frame this as intramodal improvement (getting faster with one method) against intermodal switching (to a faster method), with a performance dip after switching that discourages it, and satisficing that keeps people on a good-enough method.
Their review reports Grossman et al.'s hotkey study: forcing hotkey use after each menu selection and audio feedback produced 72.8 % and 66.6 % hotkey selections, but participants used only a small vocabulary.
Testing the rehearsal hypothesis directly, Gutwin, Cockburn & Lafreniere (2015) [abs] found quick and sustained switching to expert selections in a game, but few regular expert users in a drawing program even after ten weeks and more than 1,800 selections; they conclude that rehearsal alone does not guarantee the switch.
Cockburn, Kristensson, Alexander & Zhai (2007) [abs] showed that deliberately adding effort to obtaining guidance ("frost brushing" that hides the guide until rubbed away) improved spatial learning of keypad locations and gesture shapes, and warned that the effort must be carefully parameterised.

### 2.7 Rules derived for guide behaviour

1. Make the novice action the expert action: a novice who follows the guide must perform the expert movement, so practice is rehearsal (Kurtenbach & Buxton 1993, 1994; Zhai & Kristensson 2012; Zheng et al. 2018).
2. Show the guide only after hesitation, in the 250 to 500 ms range, and treat the value as a tunable to test, because no direct experiment fixes it (Bau & Mackay 2008; Kurtenbach & Buxton 1994; Zheng et al. 2018). Wurstfinger's existing 0.35 s map delay already sits in this range.
3. Show what is still possible from here, not everything: the remaining continuations from the current point, thinning as the stroke disambiguates (OctoPocus).
4. Do not keep a full tracing template on screen; let it fade within and across trials, or show a crib on demand (Anderson & Bischof 2013).
5. Expose the brief after a word is typed letter by letter, calmly and without blocking; exposure and forced use are the techniques that moved users in hotkey studies (Grossman et al. 2007 via Scarr et al. 2011).
6. Keep the guide available forever, since recall fades after lay-offs (Kurtenbach & Buxton 1994).
7. Expect 10 to 15 new gestures per short deliberate session and roughly 6 to 10 exposures before first recall (Zhai & Kristensson 2012; Zheng et al. 2018); plan the curriculum by frequency and expected benefit, not alphabetically.
8. Keep breadth at 8 and depth at 2 for anything frequent; on-axis directions for the most frequent items (Kurtenbach & Buxton 1993; Zheng et al. 2018).
9. Prefer structured families over arbitrary codes (Wagner et al. 2014; the kana flick mapping).

Thumbs differ from styli in three ways that matter here.
They occlude the target and are less precise, which shows up as a U-shaped movement-time curve at very short distances (Oulasvirta et al. 2013) [read].
Their reachable area is limited by grip (§4.1).
But on a phone with large enough tiles, thumb and index finger performed the same for grid gestures, and better than the published stylus marking-menu numbers (Zheng et al. 2018) [read].

## 3. Prior art in stroke, continuous, abbreviation and chord entry

| System (year) | Mechanism | Measured speed | Fate and the likely reason | Tag |
| --- | --- | --- | --- | --- |
| Unistrokes (Goldberg & Richardson 1993) | one simplified stroke per letter | 4.1 WPM in session 1 to 15.8 WPM in session 20; correction rate 43 % to 16 % (Castellucci & MacKenzie 2008) | displaced by Graffiti and then by soft keyboards | [abs] |
| Graffiti (Palm, 1990s) | letter-like single strokes | 4.0 to 11.4 WPM over 20 sessions, correction rate about 26 % throughout (Castellucci & MacKenzie 2008); 7 to 10 WPM initially and over 20 WPM with practice in other studies (MacKenzie 2007) | easy to start, low ceiling; disappeared with the stylus | [abs] |
| T-Cube (Venolia & Neiberg 1994) | press on one of nine start targets, then flick in one of 8 directions of a pie menu; self-disclosing after a pause | not retrieved; the Newton package claimed common characters are memorised after about an hour | structurally the same tap-plus-flick design as MessagEase, a decade earlier; died with the Newton | [abs], [comm] |
| Quikwriting (Perlin 1998) | continuous stroke from a centre rest zone through 8 outer zones, never lifting | 4 WPM walk-up, 16 WPM after five hours; the inventor's "three times faster than Graffiti" claim was found exaggerated (Isokoski & Raisamo 2004, via MacKenzie 2007) | research only | [sec] |
| Cirrin (Mankoff & Abowd 1998) | word-level unistroke through letters arranged on a ring | not retrieved | research only | [abs] |
| FlowMenu (Guimbretière & Winograd 2000) | marking menu plus Quikwriting text entry in one stroke, for wall displays | see §2.4 | research only | [abs] |
| SHARK / ShapeWriter (Zhai & Kristensson 2003; Kristensson & Zhai 2004) | word shapes on a stylus keyboard, recognised by shape and location channels | §1.2: 25 WPM after 40 min; 57.5 WPM peak on practised phrases | survived as gesture typing in mainstream keyboards; it needs no up-front learning because every gesture is also a tracing of keys | [read] |
| EdgeWrite (Wobbrock, Myers & Kembel 2003) | letters as corner sequences inside a square template | 18 % more accurate than Graffiti for novices with no speed difference; motor-impaired users who could not use Graffiti could use EdgeWrite | survives in accessibility; corners and edges give physical stability | [abs] |
| ChordTap (Wigdor & Balakrishnan 2004) | 12-key letter group plus chord keys on the phone's back pressed concurrently | about 8.5 WPM novice, 16.1 WPM after about 160 min | needed hardware; feature phones vanished | [sec] |
| Twiddler (Lyons et al. 2004) | one-handed chord keyboard | 26.2 WPM after 400 min, against 19.8 WPM for multitap | niche wearable use; long training | [sec] |
| T9 Trace (Nuance, 2010) | glide across a QWERTY or 12-key touchscreen keypad, decoded with XT9 | no published numbers found | shipped by Samsung as "QuickType"; vanished with 12-key phones and Nuance's exit from keyboards | [comm] |
| 8pen (2010) | start in a quadrant, loop around the centre, end in a quadrant (4×2×4 codes) | no controlled study found | commercial app abandoned; an open-source descendant (8VIM) exists; reviewers found it slow | [comm] |
| KeyScretch (Costagliola, Fuccella & Di Capua 2011; Fuccella, De Rosa & Costagliola 2014) | soft keyboard whose keys have radial menus; compound strokes enter chunks longer than two characters | not retrieved | research; the closest prior art to compound strokes from a key that enter multi-letter chunks | [abs] |
| BrailleTouch (Southern et al. 2012) | six-key braille chords on a phone held facing away | expert blind users 23.2 WPM with 14.5 % errors | accessibility niche | [sec] |
| Perkinput (Azenkot et al. 2012) | braille chords on a touchscreen with finger detection | 17.56 WPM one-handed, 20.4 WPM on two devices, one expert, case study | accessibility niche | [sec] |
| Swipeboard (Chen, Grossman & Fitzmaurice 2014) | two swipes per letter on a smartwatch: region, then letter; designed for novice-to-expert transition | 19.58 WPM after under two hours, 15 % faster than the baseline | research | [abs] |
| Minuum (Whirlscape, 2013) | one-row compressed QWERTY with heavy decoding | first exposure 376 ms per character against 255 ms for QWERTY (Scully-Allison et al.) | commercial, niche | [read] |
| Word Flow (Microsoft, 2014) | shape writing on Windows Phone | 2014 Guinness record, about 84 WPM on a set phrase | platform ended | [comm] |
| PalmType (Wang et al. 2015) | QWERTY projected onto the palm for smart glasses | not retrieved; preferred by 92 % of participants | research | [abs] |
| BlindType (Lu et al. 2017) | eyes-free one-thumb tapping on an imagined QWERTY on a touchpad, decoded | about 21 to 23 WPM per a third-party table; their cursor baseline reached 7.66 WPM | research | [sec] |
| PhraseFlow (Zhang & Zhai 2021) | phrase-level decoding of taps | §1.6: 63.4 against 63.8 WPM after redesign | research | [read] |
| Phrase-gesture typing, PhraseSwipe (Xu, Meng, Bi & Yang 2022) | one swipe per short phrase, transformer decoder | reported 2.5 WPM faster than word-gesture typing (abstract snippet only) | research | [abs] |
| Compansion (Demasco & McCoy 1992) | user enters uninflected content words; the system generates the sentence | AAC system, no speed retrieved | AAC research | [abs] |
| Vowel-dropping abbreviation (Shieber & Nelken 2007) | drop non-initial vowels and doubled consonants; an n-gram transducer restores | 26.4 % fewer characters, 3.3 % residual word error | research | [abs] |
| Abbreviated sentence input (Adhikary, Berger & Vertanen 2021) | crowdworkers' own abbreviations decoded in context | 9.6 WPM abbreviated against 9.9 WPM for full words after practice; accurate even with a third of characters omitted | research | [abs] |
| Context-aware abbreviation expansion (Cai et al. 2022) | word initials expanded by a 64B-parameter LLM using conversation context | over 70 % of phrases up to 10 initials expanded exactly; keystroke savings up to about 77 %; one turn of context more than doubles accuracy | research toward AAC | [abs] |
| KWickChat (Shen et al. 2022) | bag of keywords plus dialogue context, GPT-2 generates the sentence | about 71 % keystroke savings at a 0.65 word-error threshold per an aggregator page | research toward AAC | [sec] |
| Touchscreen steno (Plover community projects) | stenotype chords on a tablet, sent to Plover | none | hobbyist; multi-finger, not thumb-based | [comm] |

The survivors share two properties: zero required up-front learning (tap keyboards, gesture typing) or a captive population for whom the alternative is far worse (EdgeWrite, BrailleTouch).
Every method that required learning a new code before it paid off stayed in research or in a niche, however good its expert numbers.
The abbreviation lineage shows a second pattern: large keystroke savings, small or no speed gains, because deciding how to abbreviate and checking the expansion costs attention.

## 4. Thumb biomechanics on glass

### 4.1 Reach and grip

Bergstrom-Lehtovirta & Oulasvirta (2014) [abs] model the functional area of the thumb (the part of the screen the holding hand's thumb can reach) from surface size, hand size and the position of the index finger behind the device; it is a curved region that shrinks on large phones.
In KALQ's grip study, the reachable sweep had a radius of about 58 mm and buttons of 9.9 mm were used (Oulasvirta et al. 2013) [read].
For two-handed thumb typing on a tablet, typing was slowest with the keyboard at the top, and a split layout reduced thumb reach and discomfort in landscape while costing speed (127 against 113 characters per minute) (Trudeau et al. 2013) [read].

### 4.2 Direction

Single-handed thumb tapping performed better for adduction-abduction movements than for flexion-extension movements, better in the "outward" direction (flexion or abduction at the CMC joint) than inward, and better on smaller phones (Trudeau et al. 2012) [abs].
For a right thumb, adduction-abduction is roughly the top-right to bottom-left diagonal, which earlier work also found easiest; this mapping to screen diagonals is our inference, not the paper's wording.
For pen strokes, the 45° and 225° lines were faster to draw but among the most error-prone, and horizontal and vertical lines were the most accurate; corner angles in the middle of the range (around 67.5°) were the most error-prone (Cao & Zhai 2007) [read].
Marking-menu errors concentrate on off-axis items (Kurtenbach & Buxton 1993) [read].
No published per-direction speed and accuracy table for thumb flicks on phones was found; `layout-science.md` already notes this gap, and Wurstfinger's own logs are the cheapest way to fill it.

### 4.3 Movement-time parameters

- Two-thumb tablet tapping, same-side taps: MT = 237.3 − 7.6·ID + 13.8·ID² ms for the dominant (right) thumb and 319.5 − 89.0·ID + 36.7·ID² ms for the left, with the quadratic term explained by occlusion at low ID (Oulasvirta et al. 2013) [read]. The dominant thumb was about 30 ms faster.
- Physical keypad, thumb: a = 176 ms, b = 64 ms/bit (Silfverberg et al. 2000, as cited by Pavlovych & Stuerzlinger 2004) [read].
- Pen strokes (CLC model): a straight line takes T = 68.8·L^0.469 ms (L in mm, R² = 0.998), a 30 mm line about 370 ms, arcs follow the power law of curvature, and a corner's net time contribution was under 40 ms at every angle, so corners are nearly free in time (Cao & Zhai 2007) [read].
- Goal crossing obeys Fitts' law with different constants and is faster than tapping targets of the same size when ID is below about 4 bits (Accot & Zhai, as summarised by Zhai & Kristensson 2012) [read].
- Steering-law constants for thumbs on phones were not found. A finger steering study suggests tunnels narrower than about 60 px are unusable, but its device scale was not checked [sec].

The CLC constants are for a stylus and were fitted on lines longer than our segments, so any thumb glide prediction from them is an extrapolation.

### 4.4 Two thumbs

Two-thumb typing is the fastest common posture (38.0 against 30.2 WPM, Palin et al. 2019) [read], and 74 % of Palin's participants used it, so a quarter did not.
In KALQ's modelling, alternating taps were faster than same-side taps only when the idle thumb had waited less than about 600 ms, because the idle thumb hovers toward its next key while the other presses; after longer waits there was a large penalty, which the authors attribute to forgetting where the idle thumb was (Oulasvirta et al. 2013) [read].
KALQ users reached 37 WPM with 5 % errors only after a 13 to 19 hour training programme (Oulasvirta et al. 2013) [read].
No measurement of two-thumb onset asynchrony for intended chords on a touchscreen was found.
This matters because fast two-thumb typing already produces overlapping touches (Wurstfinger has a 0.25 s rollover window to keep commit order), so "two touches overlap in time" cannot by itself mean "chord".
A preprint analysing ten-finger touchscreen typing found only 2.17 % of successive touch onsets within 100 ms [sec], which suggests an onset-synchrony criterion could separate chords from rollover, but that is not thumb data.

### 4.5 Target size, and what it means for our keys

Parhi, Karlson & Bederson (2006) [abs] recommend at least 9.2 mm for discrete and 9.6 mm for serial one-handed thumb targets; Park & Han (2010) [sec] found that the key size needed for high success depends on where the key is.
Wurstfinger's default keys (about 9.0 to 9.6 mm) sit at that floor for taps.
Flicks inside a key do not depend on hitting a target, which is part of why the 3×3 design works at this size.
A glide that must pass through or end in specific neighbour keys turns each key into a target again, and M3's good finger numbers came from tiles twice as large.

### 4.6 Pattern lock: what people draw on a 3×3 grid, and how often they fail

In a 21-day field study, 29 participants each entered an assigned five-stroke Android pattern once a day (von Zezschwitz, Dunphy & De Luca 2013) [read].
Pattern entry took 3,136 ms on average (range 1,257 to 6,184 ms), against 1,501 ms for four-digit PINs, and did not get significantly faster over three weeks (3,508 ms on day one, 3,021 ms at the end).
Pattern users failed in 16.6 % of sessions (15 % recovered within three attempts, 1.6 % not), against 0.8 % for PINs, and complexity did not change this significantly.
The common slips were geometric: trying to skip over a dot and touching it anyway, and missing a dot so the pattern came out too short.
These patterns were long and assigned rather than chosen, and the participants were not trying to type fast, so the numbers are an upper bound on failure for short practised paths, not a prediction.

When people choose patterns, they start at the top-left node 44 % of the time (Uellenbeck et al.: 43 %), prefer moving to nodes at Euclidean distance one, avoid the centre node, and 11.4 % draw letter shapes such as L, Z, O, S and U (Loge, Dürmuth & Rostad 2016, comparing with Uellenbeck et al. 2013) [read].

## 5. Deterministic versus predictive entry

KSPC (keystrokes per character) characterises a technique from its keystroke-level description and a language model before anyone builds it (MacKenzie 2002) [read].
MacKenzie's values range from 1.0 for QWERTY and 1.0072 for T9 to 2.0342 for multitap, and word prediction can push KSPC below 1 (0.50 to 0.81).
He warns that KSPC does not reveal the full picture for predictive methods, because the user must keep asking "did my keystroke produce the desired word?" and "is my intended word in the list?", and the reaction time is additive to each keystroke.

Pavlovych & Stuerzlinger (2004) [read] measured those costs with 12 mostly inexperienced participants.
A repeated press while counting presses took 272 ms; a repeated press that required checking the displayed letter took 411 ms; deciding that a displayed word was wrong and pressing NEXT took 1,088 ms the first time and 672 ms for each further press; and the pause before a letter averaged 1,285 ms.
Their extrapolation still showed about 200 ms of initial delay at the 30th session.

The large-sample evidence agrees in direction.
Autocorrection, which acts without the user looking, was associated with faster typing; selecting from the prediction list was associated with slower typing (Palin et al. 2019) [read].
Mobile typists keep their gaze on the keyboard 60 to 70 % of the time and glance at the text mainly to catch errors, and two-thumb typists detect and correct errors faster (Jiang et al. 2020) [read].
Any design that adds a reason to look at candidates competes with that limited glance budget.

Eyes-free use favours relative, deterministic codes.
No-look Flick reached 51.2 cpm with 0.6 % errors using two relative flicks per kana, and degraded to 33.9 cpm with 4.8 % errors when fully eyes-free (Fukatsu et al. 2013) [abs].
A Thumb-Key user reports 70 WPM with the letters hidden [comm].
BlindType needed a decoder because eyes-free absolute taps scatter across key boundaries (Lu et al. 2017) [abs].

The argument that experts prefer deterministic mappings rests mostly on mechanism rather than on preference surveys, and this report found no survey that measures it directly.
The mechanism is strong: automatic, open-loop performance develops only under consistent stimulus-response mapping (Schneider & Shiffrin 1977), and word-gesture keyboards themselves rely on a word always having the same movement (Zhai & Kristensson 2012) [read].
Kristensson (2009) [abs] lists five challenges for intelligent text entry: localisation, error correction, editor support, feedback and context of use; each one is harder when the system's output depends on hidden context.
Dunlop & Levine (2012) [abs] optimised touchscreen layouts jointly for Fitts-modelled speed, similarity to QWERTY and "tap interpretation clarity" for spell checking, and showed these goals trade off along a Pareto front; Smith, Bi & Zhai (2015) [read] did the same for gesture typing with a gesture-clarity metric (frequency-weighted distance from each word's ideal gesture to its nearest neighbour).
For a deterministic brief system the analogue of clarity is the minimum geometric distance between any two brief gestures, and it should be reported.

What determinism does not buy is speed by itself: abbreviated input matched but did not beat full-word input (Adhikary et al. 2021) [abs], and Banovic et al. (2019) [abs] show that error aversion limits experts even when the system is accurate.
Determinism removes the verification step; the time saved must still come from fewer or cheaper movements.

## 6. Design constraints, recommendation and novelty

### 6.1 Numbers computed for this project

All computations use the corpus `layout-science.md` already relies on (Norvig's `count_1w.txt`, web text, same sha256 prefix `51df159f`) and the English layout in `scripts/layout-science/messagease_layout.json`. Web text is not chat text, so coverage for messaging will be higher and the word ranking different.

**Coverage of the most frequent words** [calc]:

| Top N words | Share of word tokens |
| --- | --- |
| 9 | 15.9 % |
| 50 | 28.2 % |
| 100 | 33.6 % |
| 200 | 40.1 % |
| 300 | 44.5 % |
| 500 | 51.0 % |
| 1,000 | 60.3 % |
| 2,000 | 69.9 % |

**Gestures per character** (the KSPC analogue, counting one gesture per letter plus one for the space in letter mode, and one gesture with an automatic space per brief) [calc]: letter mode 1.000; briefs for the top 9 words 0.938, top 50 0.875, top 100 0.842, top 200 0.793, top 500 0.696, top 1,000 0.606, top 2,000 0.507.

**Capacity of glide codes on the 3×3 grid** with moves only between adjacent keys including diagonals (no pass-throughs) [calc]:

| Keys in the glide | Ordered paths | Distinct unordered key sets | All key sets, any adjacency |
| --- | --- | --- | --- |
| 2 | 40 | 20 | 36 |
| 3 | 160 | 48 | 84 |
| 4 | 496 | 77 | 126 |

With orthogonal moves only, the ordered counts drop to 24, 44 and 80.
Among the 160 three-key paths, 16 are straight, 32 turn by 45°, 48 by 90° and 64 by 135°; only 44 have two axis-aligned segments.

**Spelling by glide** [calc]: 20.9 % of tokens use only the nine tap letters (top examples: the, to, a, in, is, on, that, this, i, it, not, or, are, at, as); 10.5 % of tokens are simple adjacent-key paths, 5.1 % need a non-adjacent jump, 2.1 % revisit a key and 0.7 % have a doubled letter.
Gliding through the key of every letter (flick letters included, consecutive repeats of a key collapsed) gives a path already owned by a more frequent word for 15.0 % of tokens; 23 of the top 200 words collide, only 99 of the top 200 have paths of three keys or fewer, and 43.5 % of tokens have adjacent-only paths.

**A stated speed model** [calc].
Letter mode costs T_char = 262 ms per character: the right-thumb same-side tap fit of Oulasvirta et al. (2013) evaluated at 1.64 bits, Wurstfinger's mean index of difficulty per character from `layout-science.md`; this gives 12 / 0.262 = 45.8 WPM for a one-thumb expert.
A brief with two segments costs one acquisition (262 ms) plus CLC line times for a 10 mm orthogonal segment (202 ms) and a 14 mm diagonal segment (238 ms), 702 ms in total; a "thumb is 1.5 times slower than a pen" variant costs 922 ms.
For example, "the" as t→h→e takes 702 ms against 4 × 262 = 1,048 ms for tapping "the" and space, which is 68 against 46 WPM for that word.
At corpus level, with no recall time:

| Brief inventory | Brief cost 702 ms | Brief cost 922 ms |
| --- | --- | --- |
| top 50 by frequency | 48.0 WPM | 46.2 WPM |
| top 200 by frequency | 50.6 WPM | 47.7 WPM |
| top 500 by frequency | 54.7 WPM | 50.5 WPM |
| 200 chosen by benefit (frequency × time saved) | 52.2 WPM | 50.1 WPM |
| 1,000 chosen by benefit | 61.8 WPM | 56.7 WPM |

Adding a 300 ms recall hesitation to every brief brings the top-200 frequency inventory back to 46.7 WPM (702 ms) or 44.2 WPM (922 ms), at or below letter mode.
A brief for a one-letter word costs more than its two taps (702 against 524 ms), and for most two-letter words it saves almost nothing.
Every parameter here is borrowed from another device or effector, so the model ranks options; it does not predict absolute speeds.

### 6.2 Evidence-backed constraints

1. **Deterministic and context-free.** The same gesture always produces the same output, whatever came before. Geometric tolerance (direction sectors, distance thresholds, core zones) is acceptable; language-model reordering is not (§5: Schneider & Shiffrin 1977; MacKenzie 2002; Pavlovych & Stuerzlinger 2004; Quinn & Zhai 2016).
2. **Letter-by-letter fallback is untouched.** Taps and flicks keep typing letters exactly as in letter mode, so out-of-vocabulary words, names and code never need a mode switch (out-of-vocabulary errors were the main failure of gesture typing, Reyal et al. 2015).
3. **One thumb first.** Every brief must be executable by one thumb inside the functional area; two-thumb gestures can only be optional accelerators, because a quarter of typists do not use two thumbs (Palin et al. 2019; Bergstrom-Lehtovirta & Oulasvirta 2014).
4. **At most two segments for frequent briefs.** Depth two is the reliable zone (about 3 % errors with a finger on 19 mm tiles; under 10 % with a stylus); a third segment costs roughly 9 to 17 % errors (Kurtenbach & Buxton 1993; Zheng et al. 2018). Longer codes, if any, should be separate strokes with lifts, which are size-independent (Zhao & Balakrishnan 2004).
5. **No length-only distinctions.** A brief must not differ from a letter flick only by being longer. Wurstfinger's tap/flick boundary is 3.2 mm and a neighbouring key starts about 5 mm from a key centre, so a vigorous flick and a two-key straight glide overlap; a three-key straight glide also collides with the opt-in long swipe at 1.5 keys. Require a turn instead (§6.4).
6. **Turns of at least 90°, adjacent moves, no pass-throughs.** 45° turns and mid-range corner angles are the error-prone ones, axis-aligned lines are the most accurate, and skipping over a node was a leading slip in pattern locks (Cao & Zhai 2007; von Zezschwitz et al. 2013). Put the most frequent briefs on axis-aligned first segments (Kurtenbach & Buxton 1993).
7. **Order matters, with aliases only for safety.** Ordered codes give 160 three-key paths against 48 unordered sets and avoid anagram collisions; users remember shapes better than stroke orientations (Zheng et al. 2018). An unordered alias may be accepted only where it is unique, and only if testing shows order errors are common.
8. **Briefs are memorised dictionary codes, chosen by benefit.** Spelling-glides cover too little and collide too often (§6.1). Choose briefs by frequency times time saved, from a messaging corpus, and do not give one-letter words briefs.
9. **Grow the vocabulary at learning speed.** Introduce about 10 to 15 new briefs per short practice session with spaced repetition, expect 6 to 10 exposures before first recall, and a payback after roughly 20 expert uses (Zhai & Kristensson 2012; Zheng et al. 2018). A brief for a word the user types less than a few times a week will not repay its learning.
10. **Families over arbitrary codes.** Where possible give directions a consistent meaning across keys (for example, the same final turn for the same suffix), as kana flick input does for vowels (Wagner et al. 2014; Schneider & Shiffrin 1977).
11. **The guide follows §2.7.** Hesitation-triggered (250 to 500 ms, tunable), showing remaining continuations, fading rather than permanent, exposing a word's brief after it is typed in full, and always available.
12. **A brief error must cost one undo.** A recognition error replaces a whole word, so one backspace must remove a brief's entire output, and the target per-brief error rate should be at or below M3's 3 % at depth two, given that uncorrected character errors in ordinary typing are about 2.3 % (Palin et al. 2019).
13. **Key size is a design variable.** Our keys are at the thumb-tap floor and half M3's tile size; if glide accuracy is poor at 57.75 pt, steno mode may need a larger letter block, or briefs recognised by relative direction so the stroke can be drawn at any size (Zhao & Balakrishnan 2004).

### 6.3 Metrics we must report

- Entry rate in WPM with a word as five characters including spaces, and the error rates of Soukoreff & MacKenzie (2003): total, corrected and uncorrected.
- Gestures per character and lifts per word, against letter mode on the same text.
- Brief share: the percentage of words entered by brief, per session, which is the analogue of Kurtenbach & Buxton's mark-use percentage.
- Per-brief recognition accuracy and time, broken down by first direction and turn angle, and the minimum geometric distance between brief gestures (the clarity analogue of Smith, Bi & Zhai 2015).
- Recall rate and trials to first recall during learning (Zheng et al. 2018), and retention at 24 hours and one week with the guide disabled (Anderson & Bischof 2013; Wagner et al. 2014).
- Predicted WPM from a stated model with every parameter and its source listed, plus a sensitivity range, as in §6.1.
- Learning curves over at least five to ten sessions, and at least one in-the-wild phase, since lab and field results reversed for gesture typing (Reyal et al. 2015) and techniques can cross over after practice (Castellucci & MacKenzie 2008).
- Workload (NASA-TLX) and the same participants' speed in letter mode and on their usual keyboard as baselines.

### 6.4 Ranked recommendation among the candidate primitives

1. **Short single-touch corner strokes.** Start on a key, move in one of eight directions, turn by 90° or 135°, lift. Recognise the stroke by its direction sequence relative to the start key (so it can be drawn small and eyes-free), draw it in the guide as a path over neighbouring keys (so it is teachable and the novice traces the expert movement), commit on lift and insert the space automatically. This class is unused by Wurstfinger today: taps, straight flicks, 180° return swipes and circles are all distinct from it. Capacity is 9 keys × 8 first directions × 4 allowed turns = 288 codes before any are excluded for reach or reserved, which covers the top 200 to 300 words (40 to 45 % of tokens in web text). The evidence is depth-two marking menus (§2.2, §2.3), the speed of continuous movement and cheap corners (§4.3), the memorability of strokes (§2.5), and relative two-stroke flicks working eyes-free (No-look Flick).
2. **Sequences of ordinary gestures translated by a dictionary.** Briefs written as two or three ordinary taps or flicks followed by a commit (for example a space gesture), expanded deterministically. This needs no gesture-engine change (`03-current-keyboard-spec.md`, limitation 3), multi-stroke input is the most accurate form (Zhao & Balakrishnan 2004), and it lets the dictionary, the curriculum and the guide be tested before the recogniser exists. Its weakness is that it saves few movements, which is what abbreviation studies found (Adhikary et al. 2021).
3. **Two-thumb simultaneous chords.** Highest information per action and the stenotype's native form, committed on release so onset timing matters less. It ranks third because it excludes one-handed use, chord training is long (16 to 26 WPM after hours in ChordTap and Twiddler), and chords must be separated from ordinary two-thumb rollover, for which no thumb data exist. It is a candidate accelerator layer for two-thumb users after measurement.
4. **Single-tap briefs.** A tap must stay a letter, so the only form is "lone letter plus commit expands to a word" (for example t then space gives "the"). It covers 15.9 % of tokens with nine entries, but collides with the real one-letter words "a" and "I" and with deliberate abbreviations, and saves little time per §6.1. An opt-in at most.
5. **Unordered key-set glides.** One third the capacity of ordered paths at three keys, anagram collisions, and the thumb still moves in some order. Useful only as an alias that forgives an order error when the set is unique.
6. **Directional flicks as briefs.** All 72 flick slots already type letters and symbols; a new flick class would differ only by length, which constraint 5 rules out. A two-key straight glide is this case.

### 6.5 The strongest argument against the top choice

The best case against corner strokes is that the evidence comes from the wrong scale and the wrong task.
Compound marks lost accuracy at a 32 mm footprint even with a stylus (Zhao & Balakrishnan 2004), and our whole letter block is about 30 mm while the thumb is broader than any pen tip; M3's 2.9 % finger error was measured on tiles twice our size.
The gesture-learning studies measured 8 to 64 commands in isolation, whereas a brief vocabulary of 200 or more words is recalled in the middle of composing text, where attention is already scarce (Jiang et al. 2020; Quinn & Zhai 2016; Zhang & Zhai 2021).
The payoff under our own model is 9 to 14 % for 200 briefs and disappears with a 300 ms hesitation, and abbreviation methods have repeatedly saved keystrokes without saving time (Adhikary et al. 2021).
Even if recall were perfect, rehearsal does not guarantee that users switch (Gutwin et al. 2015), so many users might simply keep typing letters.
If this argument holds after the first measurements, the better primitive is the multi-stroke sequence (accuracy independent of size, no new recogniser) or, for two-thumb users, chords, and the honest product framing becomes effort reduction for enthusiasts rather than speed for everyone.

### 6.6 What would be new and what would be re-invention

Re-invention, with dates:

- Word-level shorthand gestures on a keyboard: SHARK (2003), ShapeWriter, Swype and their successors.
- Tap plus directional flick on a 3×3 arrangement of start targets: T-Cube (1994), then MessagEase and Swipeboard (2014).
- Gesture paths through a 3×3 grid as commands: M3 (2018), and Android pattern lock as a non-text precedent.
- Compound strokes from soft-keyboard keys that enter multi-character chunks: KeyScretch (2011, 2014).
- Hesitation-triggered radial guides and dynamic feedforward: marking menus (1993), OctoPocus (2008), and Wurstfinger's own 0.35 s touch guide.
- Glide entry on 9- and 12-key keypads: T9 Trace (2010), which was probabilistic.
- Abbreviation expansion: Compansion (1992) through LLM expansion (2022).
- Chording on touchscreens: BrailleTouch and Perkinput (2012), and tablet steno projects for Plover.
- Deterministic word lookup from chords: stenography itself.

Plausibly new, as far as this search reached:

- A deterministic, language-model-free word-brief vocabulary expressed as single-thumb corner strokes on a MessagEase letter grid, coexisting with unchanged letter taps and flicks, so steno mode can be the default without a mode switch for out-of-vocabulary words.
- An in-keyboard teacher that exposes each word's brief right after the word is typed letter by letter and guides the stroke only on hesitation, evaluated for retention and for adoption in the wild rather than only for lab speed.
- Measured accuracy and timing of thumb corner strokes, and of thumb chords against rollover, on a 9 to 10 mm 3×3 grid. No published data were found for either, and they would be a genuine contribution whichever way they come out.

Two checks are still owed before claiming novelty: whether MessagEase or Thumb-Key already ship word-level gestures (neither the app store text nor the community threads mentioned any), and whether KeyScretch's 2014 journal paper already covers word-level codes on a small grid.

### 6.7 What to measure first

1. Thumb corner-stroke accuracy and time on the current 57.75 pt grid and on a 1.5× grid, against straight-flick accuracy on the same keys, with direction and turn angle logged.
2. The amplitude distribution of real letter flicks, to confirm that corner strokes and flicks never overlap and to set thresholds.
3. Two-thumb touch-onset asynchrony in normal fast typing against deliberate chords, before any chord layer is designed.
4. A learning study with 10 to 15 briefs per session over at least five sessions, guide timing as a factor (250 against 500 ms), with 24-hour and one-week retention.
5. Brief share and speed in the wild over several weeks.

## Gaps and unverified items

- No peer-reviewed smartphone speed for ordinary Japanese flick input was retrieved; §1.4 relies on variants.
- No controlled long-term MessagEase or Thumb-Key study exists that this search found; expert numbers are community reports.
- Speeds for T-Cube, Cirrin, KeyScretch, 8pen, PalmType and T9 Trace were not retrieved.
- Steering-law constants for thumbs, per-direction thumb flick accuracy, and two-thumb chord synchrony were not found and should be measured.
- Several numbers are from secondary sources and are tagged [sec]; in particular the Tampere MessagEase thesis, James & Reischel's expert figures, ChordTap, Twiddler, BlindType and KWickChat.
- The speed model in §6.1 borrows tablet thumb-tapping and pen-stroke constants; its absolute numbers should not be quoted as predictions for Wurstfinger.

## References

- Accot, J. & Zhai, S. (1997). Beyond Fitts' law: models for trajectory-based HCI tasks. *Proc. CHI '97*. Cited here via Zhai & Kristensson (2012).
- Adhikary, J., Berger, J. & Vertanen, K. (2021). Accelerating text communication via abbreviated sentence input. *Proc. ACL-IJCNLP 2021*. <https://aclanthology.org/2021.acl-long.514>
- Akamine, K., Tsuchida, R., Kato, T. & Tamura, A. (2024). PonDeFlick: a Japanese text entry on smartwatch commonalizing flick operation with smartphone interface. *Proc. CHI 2024*. <https://doi.org/10.1145/3613904.3642569>
- Anderson, F. & Bischof, W. F. (2013). Learning and performance with gesture guides. *Proc. CHI 2013*, 1109–1118. <https://doi.org/10.1145/2470654.2466143>; author copy <https://webdocs.cs.ualberta.ca/~wfb/publications/C-2013-Anderson-CHI.pdf>
- Appert, C. & Zhai, S. (2009). Using strokes as command shortcuts: cognitive benefits and toolkit support. *Proc. CHI 2009*, 2289–2298. <https://doi.org/10.1145/1518701.1519052>; author copy <https://www.lri.fr/~appert/website/papers/StrokeShortcuts.pdf>
- Arnold, K. C., Gajos, K. Z. & Kalai, A. T. (2016). On suggesting phrases vs. predicting words for mobile text composition. *Proc. UIST 2016*. <https://www.eecs.harvard.edu/~kgajos/papers/2016/arnold16suggesting.pdf>
- Azenkot, S. & Zhai, S. (2012). Touch behavior with different postures on soft smartphone keyboards. *Proc. MobileHCI 2012*. Cited via Palin et al. (2019).
- Azenkot, S., Wobbrock, J. O., Prasain, S. & Ladner, R. E. (2012). Input finger detection for nonvisual touch screen text entry in Perkinput. *Proc. Graphics Interface 2012*. <https://faculty.washington.edu/wobbrock/pubs/gi-12.01.pdf>
- Banovic, N., Sethapakdi, T., Hari, Y., Dey, A. K. & Mankoff, J. (2019). The limits of expert text entry speed on mobile keyboards with autocorrect. *Proc. MobileHCI 2019*. <https://doi.org/10.1145/3338286.3340126>
- Bau, O. & Mackay, W. E. (2008). OctoPocus: a dynamic guide for learning gesture-based command sets. *Proc. UIST 2008*, 37–46. <https://www.lri.fr/~mbl/FundHCI/papers/Octopocus-UIST2008.pdf>
- Bergstrom-Lehtovirta, J. & Oulasvirta, A. (2014). Modeling the functional area of the thumb on mobile touchscreen surfaces. *Proc. CHI 2014*, 1991–2000. <https://doi.org/10.1145/2556288.2557354>
- Cai, S., Venugopalan, S., Tomanek, K., Narayanan, A., Morris, M. R. & Brenner, M. P. (2022). Context-aware abbreviation expansion using large language models. *Proc. NAACL 2022*. <https://arxiv.org/abs/2205.03767>
- Cao, X. & Zhai, S. (2007). Modeling human performance of pen stroke gestures. *Proc. CHI 2007*, 1495–1504. <https://doi.org/10.1145/1240624.1240850>; copy <https://www.lri.fr/~anab/teaching/evaluation/papers/clc.pdf>
- Castellucci, S. J. & MacKenzie, I. S. (2008). Graffiti vs. Unistrokes: an empirical comparison. *Proc. CHI 2008*, 305–308. <https://doi.org/10.1145/1357054.1357106>; author copy <https://www.yorku.ca/mack/chi2008-p305.pdf>
- Chen, X. A., Grossman, T. & Fitzmaurice, G. (2014). Swipeboard: a text entry technique for ultra-small interfaces that supports novice to expert transitions. *Proc. UIST 2014*. <https://doi.org/10.1145/2642918.2647354>
- Cockburn, A., Gutwin, C., Scarr, J. & Malacria, S. (2014). Supporting novice to expert transitions in user interfaces. *ACM Computing Surveys* 47(2), 31:1–31:36. <https://doi.org/10.1145/2659796>
- Cockburn, A., Kristensson, P. O., Alexander, J. & Zhai, S. (2007). Hard lessons: effort-inducing interfaces benefit spatial learning. *Proc. CHI 2007*, 1571–1580. <https://doi.org/10.1145/1240624.1240863>
- Costagliola, G., Fuccella, V. & Di Capua, M. (2011). Text entry with KeyScretch. *Proc. IUI 2011*, 277–286. Fuccella, V., De Rosa, M. & Costagliola, G. (2014). Novice and expert performance of KeyScretch: a gesture-based text entry method for touch-screens. *IEEE Trans. Human-Machine Systems* 44(4), 511–523. <https://doi.org/10.1109/THMS.2014.2314447>
- Demasco, P. W. & McCoy, K. F. (1992). Generating text from compressed input: an intelligent interface for people with severe motor impairments. *Communications of the ACM* 35(5), 68–78.
- Dunlop, M. & Levine, J. (2012). Multidimensional Pareto optimization of touchscreen keyboards for speed, familiarity and improved spell checking. *Proc. CHI 2012*, 2669–2678. <https://doi.org/10.1145/2207676.2208659>
- Fukatsu, Y., Shizuki, B. & Tanaka, J. (2013). No-look Flick: single-handed and eyes-free Japanese text input system on touch screens of mobile devices. *Proc. MobileHCI 2013*. <https://mobilehci2013.medien.ifi.lmu.de/program/388.php>
- Ghomi, E., Huot, S., Bau, O., Beaudouin-Lafon, M. & Mackay, W. E. (2013). Arpège: learning multitouch chord gestures vocabularies. *Proc. ITS 2013*, 209–218. <https://www.lri.fr/~mbl/Teach/SituatedComputing/2017/papers/DynamicGuides/its123-Arpege.pdf>
- Goldberg, D. & Richardson, C. (1993). Touch-typing with a stylus. *Proc. INTERCHI '93*.
- Grossman, T., Dragicevic, P. & Balakrishnan, R. (2007). Strategies for accelerating on-line learning of hotkeys. *Proc. CHI 2007*. Cited via Scarr et al. (2011).
- Guimbretière, F. & Winograd, T. (2000). FlowMenu: combining command, text, and data entry. *Proc. UIST 2000*, 213–216. <https://hci.stanford.edu/publications/paper.php?id=135>
- Guimbretière, F., Martin, A. & Winograd, T. (2005). Benefits of merging command selection and direct manipulation. *ACM TOCHI* 12(3), 460–476.
- Gutwin, C., Cockburn, A. & Lafreniere, B. (2015). Testing the rehearsal hypothesis with two FastTap interfaces. *Proc. Graphics Interface 2015*, 223–231. <https://doi.org/10.20380/GI2015.29>
- Isokoski, P. & Raisamo, R. (2004). Quikwriting as a multi-device text entry method. *Proc. NordiCHI 2004*. Cited via MacKenzie (2007).
- James, C. L. & Reischel, K. M. (2001). Text input for mobile devices: comparing model prediction to actual performance. *Proc. CHI 2001*, 365–371. <https://doi.org/10.1145/365024.365300>
- Jiang, X., Li, Y., Jokinen, J. P. P., Hirvola, V. B., Oulasvirta, A. & Ren, X. (2020). How we type: eye and finger movement strategies in mobile typing. *Proc. CHI 2020*. <https://userinterfaces.aalto.fi/how-we-type-mobile/resources/how_we_type_mobile.pdf>
- Kristensson, P. O. (2009). Five challenges for intelligent text entry methods. *AI Magazine* 30(4), 85–94. <https://aaai.org/ojs/index.php/aimagazine/article/view/2269>
- Kristensson, P. O. & Vertanen, K. (2014). The inviscid text entry rate and its application as a grand goal for mobile text entry. *Proc. MobileHCI 2014*, 335–338. <https://www.keithv.com/pub/inviscid/>
- Kristensson, P. O. & Zhai, S. (2004). SHARK²: a large vocabulary shorthand writing system for pen-based computers. *Proc. UIST 2004*.
- Kurtenbach, G. & Buxton, W. (1993). The limits of expert performance using hierarchic marking menus. *Proc. INTERCHI '93*, 482–487. <https://research.autodesk.com/app/uploads/2023/03/the-limits-of-expert.pdf_recyw5wL6ekPqcE4Q.pdf>
- Kurtenbach, G. & Buxton, W. (1994). User learning and performance with marking menus. *Proc. CHI '94*. <https://research.autodesk.com/app/uploads/2023/03/user-learning-and-performance.pdf_recFBbPwmG7SW9uDe.pdf>
- Kurtenbach, G., Sellen, A. & Buxton, W. (1993). An empirical evaluation of some articulatory and cognitive aspects of marking menus. *Human-Computer Interaction* 8(1). Cited via Kurtenbach & Buxton (1993).
- Kurtenbach, G., Moran, T. & Buxton, W. (1994). Contextual animation of gestural commands. Cited via Anderson & Bischof (2013).
- Loge, M., Dürmuth, M. & Rostad, L. (2016). On user choice for Android unlock patterns. *EuroUSEC 2016*. <https://www.ndss-symposium.org/wp-content/uploads/2017/09/01-on-user-choice-for-android-unlock-patterns.pdf>
- Lu, Y., Yu, C., Yi, X., Shi, Y. & Zhao, S. (2017). BlindType: eyes-free text entry on handheld touchpad by leveraging thumb's muscle memory. *Proc. ACM IMWUT* 1(2). <https://doi.org/10.1145/3090083>
- Lyons, K., Starner, T., Plaisted, D., Fusia, J., Lyons, A., Drew, A. & Looney, E. W. (2004). Twiddler typing: one-handed chording text entry for mobile phones. *Proc. CHI 2004*. Cited via a Georgia Tech follow-up.
- MacKenzie, I. S. (2002). KSPC (keystrokes per character) as a characteristic of text entry techniques. *Proc. Mobile HCI 2002*, LNCS 2411, 195–210. <https://www.yorku.ca/mack/hcimobile02.html>
- MacKenzie, I. S. (2007). Evaluation of text entry techniques. In MacKenzie & Tanaka-Ishii (eds.), *Text Entry Systems*, Morgan Kaufmann, 75–101. <https://www.yorku.ca/mack/chapter4.html>
- Mankoff, J. & Abowd, G. D. (1998). Cirrin: a word-level unistroke keyboard for pen input. *Proc. UIST '98*.
- Oulasvirta, A., Reichel, A., Li, W., Zhang, Y., Bachynskyi, M., Vertanen, K. & Kristensson, P. O. (2013). Improving two-thumb text entry on touchscreen devices. *Proc. CHI 2013*. <https://keithv.com/pub/twothumb/OulasvirtaEtAlCHI2013.pdf>
- Palin, K., Feit, A. M., Kim, S., Kristensson, P. O. & Oulasvirta, A. (2019). How do people type on mobile devices? Observations from a study with 37,000 volunteers. *Proc. MobileHCI 2019*. <https://doi.org/10.1145/3338286.3340120>; author copy <https://userinterfaces.aalto.fi/typing37k/resources/Mobile_typing_study.pdf>
- Parhi, P., Karlson, A. K. & Bederson, B. B. (2006). Target size study for one-handed thumb use on small touchscreen devices. *Proc. MobileHCI 2006*, 203–210. <https://doi.org/10.1145/1152215.1152260>
- Park, Y. S. & Han, S. H. (2010). Touch key design for one-handed thumb interaction with a mobile phone: effects of touch key size and touch key location. *International Journal of Industrial Ergonomics* 40(1). Cited via later work.
- Pavlovych, A. & Stuerzlinger, W. (2004). Model for non-expert text entry speed on 12-button phone keypads. *Proc. CHI 2004*. <https://hci.rwth-aachen.de/materials/conferences/CHI2004/1p351.pdf>
- Perlin, K. (1998). Quikwriting: continuous stylus-based text entry. *Proc. UIST '98*.
- Quinn, P. & Zhai, S. (2016). A cost-benefit study of text entry suggestion interaction. *Proc. CHI 2016*, 83–88. <https://doi.org/10.1145/2858036.2858305>
- Reyal, S., Zhai, S. & Kristensson, P. O. (2015). Performance and user experience of touchscreen and gesture keyboards in a lab setting and in the wild. *Proc. CHI 2015*, 679–688. <https://doi.org/10.1145/2702123.2702597>
- Scarr, J., Cockburn, A., Gutwin, C. & Quinn, P. (2011). Dips and ceilings: understanding and supporting transitions to expertise in user interfaces. *Proc. CHI 2011*. <https://csse.canterbury.ac.nz/andrew.cockburn/papers/blur.pdf>
- Schneider, W. & Shiffrin, R. M. (1977). Controlled and automatic human information processing: I. Detection, search, and attention. *Psychological Review* 84(1), 1–66.
- Scully-Allison, C. F., Parekh, H., Harris, F. C. Jr. & Dascalu, S. M. (about 2017). Analysis of user experience and performance at initial exposure to novel keyboard input methods. University of Nevada, Reno; venue not stated in the author copy. <https://www.cse.unr.edu/~cscully/pubs/csa_conf_1.pdf>
- Shen, J., Yang, B., Dudley, J. J. & Kristensson, P. O. (2022). KWickChat: a multi-turn dialogue system for AAC using context-aware sentence generation by bag-of-keywords. *Proc. IUI 2022*. <https://www.pokristensson.com/pubs/ShenEtAlIUI2022.pdf>
- Shieber, S. M. & Nelken, R. (2007). Abbreviated text input using language modeling. *Natural Language Engineering* 13(2), 165–183.
- Silfverberg, M., MacKenzie, I. S. & Korhonen, P. (2000). Predicting text entry speed on mobile phones. *Proc. CHI 2000*, 9–16. <https://doi.org/10.1145/332040.332044>
- Smith, B. A., Bi, X. & Zhai, S. (2015). Optimizing touchscreen keyboards for gesture typing. *Proc. CHI 2015*. <https://research.google.com/pubs/archive/43271.pdf>
- Soukoreff, R. W. & MacKenzie, I. S. (2003). Metrics for text entry research: an evaluation of MSD and KSPC, and a new unified error metric. *Proc. CHI 2003*.
- Southern, C., Clawson, J., Frey, B., Abowd, G. & Romero, M. (2012). An evaluation of BrailleTouch: mobile touchscreen text entry for the visually impaired. *Proc. MobileHCI 2012*. Cited via later work.
- Trudeau, M. B., Udtamadilok, T., Karlson, A. K. & Dennerlein, J. T. (2012). Thumb motor performance varies by movement orientation, direction, and device size during single-handed mobile phone use. *Human Factors* 54(1), 52–59. <https://stacks.cdc.gov/view/cdc/193322>
- Trudeau, M. B., Catalano, P. J., Jindrich, D. L. & Dennerlein, J. T. (2013). Tablet keyboard configuration affects performance, discomfort and task difficulty for thumb typing in a two-handed grip. *PLoS ONE* 8(6), e67525. <https://doi.org/10.1371/journal.pone.0067525>
- Uellenbeck, S., Dürmuth, M., Wolf, C. & Holz, T. (2013). Quantifying the security of graphical passwords: the case of Android unlock patterns. *Proc. CCS 2013*. Cited via Loge et al. (2016).
- Venolia, D. & Neiberg, F. (1994). T-Cube: a fast, self-disclosing pen-based alphabet. *Proc. CHI '94*, 265–270. <https://doi.org/10.1145/191666.191761>
- von Zezschwitz, E., Dunphy, P. & De Luca, A. (2013). Patterns in the wild: a field study of the usability of pattern and PIN-based authentication on mobile devices. *Proc. MobileHCI 2013*, 261–270. <https://www.medien.ifi.lmu.de/pubdb/publications/pub/zezschwitz2013mobilehci/zezschwitz2013mobilehci.pdf>
- Wagner, J., Lecolinet, E. & Selker, T. (2014). Multi-finger chords for hand-held tablets: recognizable and memorable. *Proc. CHI 2014*, 2883–2892. <https://hal.archives-ouvertes.fr/hal-01447407>
- Wang, C.-Y., Chu, W.-C., Chiu, P.-T., Hsiu, M.-C., Chiang, Y.-H. & Chen, M. Y. (2015). PalmType: using palms as keyboards for smart glasses. *Proc. MobileHCI 2015*. <https://doi.org/10.1145/2785830.2785886>
- Wigdor, D. & Balakrishnan, R. (2004). A comparison of consecutive and concurrent input text entry techniques for mobile phones. *Proc. CHI 2004*, 81–88. <https://doi.org/10.1145/985692.985703>
- Wobbrock, J. O., Myers, B. A. & Kembel, J. A. (2003). EdgeWrite: a stylus-based text entry method designed for high accuracy and stability of motion. *Proc. UIST 2003*, 61–70. <https://faculty.washington.edu/wobbrock/pubs/uist-03.pdf>
- Xu, Z., Meng, Y., Bi, X. & Yang, X.-D. (2022). Phrase-gesture typing on smartphones. *Proc. UIST 2022*. <https://cs.dartmouth.edu/~zheer/files/PhraseSwipe.pdf>
- Yokoyama, K., Takakura, R., Shizuki, B. & Kawaguchi, I. (2021). Text entry method based on flick input using two joysticks with push (JoyFlick). *Transactions of the Human Interface Society* 23(4), in Japanese; English version at INTERACT 2021. <https://www.iplab.cs.tsukuba.ac.jp/paper/journal/yokoyama_hi2021.pdf>
- Zhai, S. & Kristensson, P. O. (2003). Shorthand writing on stylus keyboard. *Proc. CHI 2003*, 97–104. <https://doi.org/10.1145/642611.642630>
- Zhai, S. & Kristensson, P. O. (2012). The word-gesture keyboard: reimagining keyboard interaction. *Communications of the ACM* 55(9), 91–101. <https://doi.org/10.1145/2330667.2330689>; copy <https://research.google.com/pubs/archive/39190.pdf>
- Zhang, M. R. & Zhai, S. (2021). PhraseFlow: designs and empirical studies of phrase-level input. *Proc. CHI 2021*. <https://drustz.github.io/assets/pdfs/phraseflow.pdf>
- Zhao, S. & Balakrishnan, R. (2004). Simple vs. compound mark hierarchical marking menus. *Proc. UIST 2004*, 33–42. <https://doi.org/10.1145/1029632.1029639>; author copy <https://www.dgp.toronto.edu/papers/szhao_UIST2004.pdf>
- Zheng, J., Bi, X., Li, K., Li, Y. & Zhai, S. (2018). M3 gesture menu: design and experimental analyses of marking menus for touchscreen mobile interaction. *Proc. CHI 2018*. <https://doi.org/10.1145/3173574.3173823>; copy <https://research.google.com/pubs/archive/46567.pdf>

Community, vendor and press sources:

- MessagEase Keyboard, Apple App Store listing (champion 87 WPM). <https://apps.apple.com/us/app/messagease-keyboard/id990325092>
- Colemak forum thread on MessagEase, 2014 (game statistics quoted from the developer; user speeds). <https://forum.colemak.com/post/15296/>
- Thumb-Key community thread, "What's your thumbkey wpm", Lemmy (mirror). <https://scribe.disroot.org/post/770279>
- Microsoft, "World's fastest texting with Word Flow", 2014. <https://blogs.windows.com/devices/2014/05/09/worlds-fastest-texting-word-flow/>
- Phone Scoop, "Nuance T9 Trace announced for touchphones", 2010. <https://www.phonescoop.com/articles/article.php?a=5698>
- Tampere University thesis, "Beginners Performance with MessagEase and QWERTY" (record only; access blocked for automated retrieval). <https://trepo.tuni.fi/handle/10024/84910>

## Appendix: how the computed numbers were produced

The corpus is Norvig's `count_1w.txt` (<https://norvig.com/ngrams/count_1w.txt>, 333,333 entries, sha256 beginning `51df159f`, the same file `layout-science.md` documents), sorted by count.
Coverage is the cumulative count of the top N words divided by the total count.
Gestures per character treat each token as its letters plus one space; a non-brief token costs one gesture per character, a brief token costs one gesture.
Grid capacities enumerate simple paths on the 3×3 grid in which consecutive keys differ by at most one row and one column (eight-neighbour adjacency), or by exactly one row or column for the orthogonal variant; unordered counts are the distinct key sets those paths visit.
Spelling statistics use the nine tap letters of the English layout (a n i / h o r / t e s); the key-path collision count maps every letter, including flick letters, to its key from `scripts/layout-science/messagease_layout.json`, collapses consecutive repeats of the same key, keeps alphabetic tokens only, and counts a token as colliding when a more frequent word already produced the same key sequence.
The speed model takes 262 ms per letter-mode character (the right-thumb fit of Oulasvirta et al. 2013 at 1.64 bits), adds 262 ms plus 202 ms plus 238 ms for a two-segment brief (CLC lines of 10 mm and 14.1 mm), and converts with WPM = 12 × characters per second.
Benefit-ranked inventories sort the top 50,000 words by count × ((letters + 1) × 262 ms − brief cost) and keep only positive gains.
