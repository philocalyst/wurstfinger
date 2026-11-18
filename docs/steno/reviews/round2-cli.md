# Round 2 review: steno mode for command lines and configuration

Reviewer persona: someone who SSHes from a phone every day (Blink, Termius, a-Shell), types git,
kubectl and docker on glass, keeps their own Plover and text-expansion dictionaries, and wants to
make a keyboard theirs within ten minutes. I judged the design document, the prototype source and
the live demo afresh. I re-ran every reproduction from the first round rather than taking the
designer's word that it was addressed, and I looked for what the rework introduced.

## Scores

| Criterion | Score |
| --- | --- |
| Novelty | 6.5 |
| Wonderful and intuitive to use (in a terminal) | 6.0 |
| End-to-end useful (for command lines) | 6.0 |
| Without fault (correctness and polish) | 5.5 |
| Easy to configure | 6.5 |
| Power and expressiveness of the dictionary system | 5.5 |
| **Overall** | **6.0** |

The owner's bar is 9.2, and this is still well short of it for command-line use, although it is a
very different thing from the first round. The big structural fixes the first round asked for have
been made, and they work: the terminal stack has no English in it, the alphabet and every symbol
now sit in a "Letters and symbols" pack at the bottom of every stack, spelled entries expand only
when asked, and Record now captures the curl you actually drew. I typed thirty-one real command
lines, fourteen of them with real pointer events, and every one came out byte for byte right when
I used the strokes the way the pack intends. That is why the scores rose by about two points.

They did not rise further because the terminal is now essentially the old letter keyboard plus
about forty symbol curls, fifty abbreviations and five terminal keys, saving about fifteen percent
of strokes on my lines. Meanwhile the new configuration model has faults that silently wreck the
other context, and the five space-bar endings that a learner automates in Messages are Ctrl-C, Up,
Tab, Escape and Ctrl-R in the terminal, so the prose habit fires destructive keys in the middle of
a commit message. I would not switch to it as it stands, and I would not yet recommend it to other
terminal people.

## How I tested

`npm test` passes 36 of 36, including the held-out round trip (3,034 messages) and a new shell test
that types nineteen lines exactly. I drove the demo at http://127.0.0.1:5273/ with Playwright: real
mouse drags through the recogniser for fourteen command lines, the terminal keys, the habit cases
and every Dictionaries-tab interaction, and the page's own `wf.engine` for the other seventeen
lines. I also ran the same `Engine` in Node to probe edge cases. Scripts and screenshots are in
`scratch/review2/cli/`
(`lines.mjs` holds the stroke plans, `b*.mjs` the browser runs, `probe*.mjs` the Node probes, and
`shots/` the screenshots named below).

## The first round's defects, one by one

| # | Round-one defect | Status now | What I ran |
| --- | --- | --- | --- |
| 1 | Prose briefs rewrite shell tokens | Fixed | `git init`, `env \| grep`, `cd /var/log`, `vim .env`, `npm run dist`, `uniq -c` all come out as typed; the terminal stack is `commands, shell, letters`. |
| 2 | `-i` becomes `-I` | Fixed | `grep -i foo` and `ssh -i ~/.ssh/id_ed25519` are exact. |
| 3 | Letters cannot be had without English | Fixed | Letters live in their own locked pack. Turning English *on* in the terminal now makes words glue (`ls` plus the *the* flick gives `lsthe`), which is new but harmless because nobody needs to do it. |
| 4 | Shell briefs collide with literal tokens | Fixed | `main.py`, `ls -lt`, `tf`, `nm` stay as typed; briefs need the explicit down-pull on the space bar. |
| 5 | A character from the abc or 123 page puts a space before the next letter | Fixed | `my_file`, `user@host`, `nginx:1.25-alpine`, `k8s`, `id_ed25519` are exact. |
| 6 | Return does not finish the outline | Moot | Nothing expands without the explicit stroke, so `gs` then Return sends `gs` every time, deterministically. |
| 7 | No attached hyphen in Shell | Fixed | `kube-system`, `rev-parse`, `--show-toplevel`, `feature/steno-mode`. |
| 8 | Record captures the wrong stroke for an undefined curl; overrides silently | Mostly fixed | Drawing `N-e-cw` records `N-e-cw`; overriding `S-n-ccw`, `gst` or the letter `e` asks for a second press. Recording a multi-stroke outline is still impossible, because `btn.dataset.extend` is never set (`src/ui/panel.js:327`). |
| 9 | Braces cannot be escaped and are silently eaten | Fixed | `awk '\{print ${\|}\}'` types `awk '{print $1}'`; `awk '{print $1}'` unescaped and `echo {` are refused with a clear message. |
| 10 | Unsupported operators leak or vanish | Fixed (refused) | `{mode:snake}`, `{*+}`, `{#control(c)}` are refused at entry with a reason. They are still not implemented. |
| 11 | `>>`, `\|\|` and many symbols unreachable | Mostly fixed | Every ASCII symbol is on its old flick; `>>`, `\|\|`, Tab, Escape, Up, Ctrl-C and Ctrl-R are strokes. Digits still need the 123 page. |
| 12 | Only "My strokes" persists | Fixed | My commands, the Shell pack's edits and deletions, the stacks and the context all survive a reload (`26-after-reload-terminal.png`). A new problem replaced it: see current defect 11. |
| 13 | Apply JSON replaces and validates nothing | Partly fixed | Entries are validated and there is now "Add these" beside "Replace all". Merging still overwrites silently, Replace has no confirmation, and there is no file import or export. |
| 14 | The add form accepts outlines that never fire | Partly fixed | `k8s` now fires and `t-n`, `e.g`, `Hello World` are refused. Five-stroke outlines, `SP-e`, `SP-w`, `SP-n-cw` and `SP-circle` are still accepted and can never fire. |
| 15 | No per-context or user-created packs | Partly fixed | Messages and Terminal have their own stacks and their own user pack. There is still no way to create a pack or a third context, reorder packs, or set a pack's options, and adding to a pack that is off in the current context turns it on (current defect 3). |
| 16 | Prose punctuation wrong inside quotes | Moot | The terminal is literal: `Fix a, b` and `. ~/.bashrc` are exact. |
| 17 | Key faces advertise prose; Look up rejects non-letters | Partly fixed | The faces show the symbols, which is right. The curls still appear only mid-gesture, and their labels drop the spaces that make them different. Look up accepts commands but only by exact label. |
| 18 | Ribbon chips show a diff fragment | Not fixed, changed | After a brief the chip now says only "finish" (`30-ribbon-gpf.png`), not what was typed. |
| 19 | Leaving quotes with the caret slide wipes undo | Not fixed | `moveCaret` still calls `afterEdit`, which empties the history (`src/engine.js:199-215`); after the slide, undo deletes the closing quote. |
| 20 | Small things | Partly fixed | `autoCapitalizeLiteral` is gone. Multi-stroke entries still have no glyph in the list, and `git pull --rebase{#Return}` followed by a space still leaves a stray space after the newline. |

## 1. Thirty-one command lines in the Terminal context

"Strokes" counts every gesture: letters, symbols, curls, the space bar, the down-pull that expands a
brief, caret slides, and page switches (the number of switches is in brackets). The letter keyboard
column is one gesture per character plus two switches per run of digits. Lines 1 to 4, 6, 7, 11,
12, 13, 15, 18, 22, 27 and 31 were typed with real pointer events; the rest through `wf.engine` in
the page. All 31 came out exact.

| # | Command | Exact? | Strokes (switches) | Letter keyboard |
| --- | --- | --- | --- | --- |
| 1 | `git commit -m "Fix race in token refresh, don't retry on 401"` | yes | 49 (1) | 63 |
| 2 | `ls -la ~/projects/wurstfinger` | yes | 27 (0) | 29 |
| 3 | `grep -rn "TODO" src/ \| wc -l` | yes | 24 (0) | 28 |
| 4 | `cd ../..` | yes | 5 (0) | 8 |
| 5 | `export KUBECONFIG=~/.kube/config-prod` | yes | 37 (0) | 37 |
| 6 | `kubectl get pods -n kube-system -o wide` | yes | 25 (0) | 39 |
| 7 | `docker run -d -p 8080:80 --name web nginx:1.25-alpine` | yes | 50 (4) | 57 |
| 8 | `ssh -i ~/.ssh/id_ed25519 deploy@10.0.0.12 -p 2222` | yes | 51 (5) | 55 |
| 9 | `curl -sL https://get.example.com/install.sh \| bash -s -- --version=2.3.1` | yes | 63 (1) | 74 |
| 10 | `tar -xzf release_v2-final.tar.gz -C /tmp` | yes | 40 (2) | 42 |
| 11 | `echo "Hello World" > notes.txt && cat notes.txt` | yes | 42 (0) | 47 |
| 12 | `make build \|\| echo "build failed"` | yes | 31 (0) | 33 |
| 13 | `cd "$(git rev-parse --show-toplevel)"` | yes | 33 (0) | 37 |
| 14 | `find . -name "*.py" -mtime -7 -exec rm {} +` | yes | 32 (2) | 45 |
| 15 | `awk -F: '{print $1}' /etc/passwd \| sort \| uniq -c` | yes | 44 (2) | 51 |
| 16 | `NODE_ENV=production npm run build 2>&1 \| tee build.log` | yes | 43 (0) | 58 |
| 17 | `export PATH="${HOME}/bin:$PATH"` | yes | 29 (0) | 31 |
| 18 | `git push --force-with-lease origin feature/steno-mode` | yes | 30 (0) | 53 |
| 19 | `python3 -m venv .venv && source .venv/bin/activate` | yes | 48 (2) | 52 |
| 20 | `kubectl logs -f deploy/api --tail=100 -n prod` | yes | 39 (2) | 47 |
| 21 | `docker exec -it $(docker ps -q -f name=web) sh` | yes | 33 (0) | 46 |
| 22 | `git log --oneline -n 20 --author="Ada Lovelace"` | yes | 45 (2) | 49 |
| 23 | `sed -i 's/foo_bar/fooBar/g' src/*.ts` | yes | 35 (0) | 36 |
| 24 | `cat << 'EOF' > ~/.config/app.toml`, `port = 8080`, `EOF` (three lines) | yes | 45 (2) | 51 |
| 25 | `for f in *.log; do gzip "$f"; done` | yes | 34 (0) | 34 |
| 26 | `ssh-keygen -t ed25519 -C "me@example.com"` | yes | 40 (2) | 43 |
| 27 | `chmod +x ~/bin/deploy_prod.sh` | yes | 28 (0) | 29 |
| 28 | `ps aux \| grep -v grep \| grep node` | yes | 28 (0) | 33 |
| 29 | `git stash pop && git rebase -i HEAD~3` | yes | 34 (1) | 39 |
| 30 | `jq '.items[] \| {name: .metadata.name}'` | yes | 34 (0) | 38 |
| 31 | `git commit -m "Don't drop the cache, it's needed by CI"` | yes | 42 (0) | 55 |

The total is 1,140 strokes against 1,339 letter by letter, a 15 % saving. Almost all of it comes
from the spelled commands (`gc`, `gpf`, `kgp`, `dps`, `nr`, `dk`, `crl`) and a handful of curls (` | `,
` && `, ` 2>&1`, `../`, `$(…)`). Lines 2, 5, 10, 23, 25 and 27, which are ordinary tokens and paths,
save between zero and two strokes, because on the steno page in the terminal every character costs
exactly what it costs on the letter page. That is the right trade for correctness, and it is also
why the gain is modest.

The only characters that needed another page were digits, in fourteen of the thirty-one lines, for
28 switch gestures in all. That is a large improvement on the 34 switches over 24 lines in round
one, and the page round trip now joins the token cleanly. It is still the commonest interruption,
and seventeen flick directions in the terminal stack are unused (current defect 14).

What it felt like:

- **The good parts are real.** `gc` and a pull on the space bar gives `git commit -m ""` with the
  caret inside, and capitals, commas and apostrophes in the message are exact. `gpf`, `kgp` and `dps`
  are big wins. The `$` key's curls (`$(…)`, `${…}`, `$?`) and the slash's curls (`./`, `../`, `~/`)
  are the most genuinely clever thing here: a symbol's curls are the compounds a shell writes with
  that symbol, which I could guess before I looked.
- **The plans above only work because I read the Shell pack's JSON.** Ten of the forms carry spaces
  (` | `, ` && `, ` > `, ` >> `, ` < `, ` << `, ` -`, ` &`, ` |& `, ` 2>&1`) and the rest do not
  (`||`, `&`, `--`, `./`, `==`), and nineteen spelled commands end with a hidden trailing space
  (`dk`, `kc`, `nr`, `crl`, `ga` and others). The guide shows ` -` as `-`, ` | ` as `|`, and `&`, ` &`
  and `&` for three different strokes on the same key (`04-guide-S-n.png`, `05-guide-A-e.png`). With
  my habit of tapping space between tokens, 21 of the 31 lines come out with a double space
  somewhere (`ls  | wc -l`, `make  &&  echo`, `docker  ps`).
- **Quotes and brackets open in pairs but do not close by overtyping.** After the quote curl, typing
  `"` to close gives `echo "hi there""`, and after `$(` typing `)` gives `cd $(pwd))`. The only way
  past the closing character is a sideways slide on the space bar, which also discards the undo
  history.
- **Commit messages get no help at all.** There is no English in the terminal, so the prose inside
  `-m "…"` is spelled letter by letter, and line 1 saves only what `gc` saves. Worse, my steno
  muscle memory from Messages fires terminal keys there: `it` and a flick down-right on the space bar
  is *it's* in Messages and Ctrl-C in the terminal (`34-commit-its-ctrlc.png`).
- **Tab, history and Ctrl-C** are on the space bar and are easy to reach. In the demo they are
  inserted into the composed line as characters: Up then Return "runs" a command called `↑`, and
  Ctrl-C then Return runs `sleep 100^C` (`08-tab.png`, `09-up.png`, `10-ctrlc.png`). Section 6 says
  what this would mean on a device.

## 2. Building my own dictionaries

Through the Dictionaries tab, with real clicks and typing in the inputs and real strokes for Record,
I added to My commands: `kgn` → `kubectl get nodes`; `dkx` → `docker exec -it {|} bash`; a recorded
free curl `N-e-cw` → ` 2>/dev/null`; the two-stroke outline `I-s/I-s` → ` == `; `fl` →
`for f in *; do {|}; done`; `shx` → `{^}.sh`; `cc` → `{#Control(c)}`; `wq` → `{#Escape}:wq{#Return}`;
`awkp` → `awk '\{print ${|}\}'`; `gst` → `git status -sb` over the Shell pack's `git stash`; a
recorded override of `S-n-ccw` with `{#Control(z)}`; and `k8s` → `kubernetes`. I also tried a
recorded override of the letter `e` (one press only), and these mistakes: `Hello World`, `t-n`,
`echo {`, `{#control(c)}`, `{mode:snake}`, an empty translation, a five-stroke outline, `a{|}b{|}c`,
`{*+}`, `a-b` and `SP-e`. In the JSON box I pasted a Plover-style chord key, a merge that redefined
`kgn` and added `gs`, and a trailing comma. Then I added `tfp` to the Shell pack, deleted the
shipped `gca`, turned Texting shorthand on in the terminal, and reloaded.

What worked, and worked well: every entry above that should fire did, including `dkx web` →
`docker exec -it web bash`, `awkp 1` → `awk '{print $1}'` and the recorded curl. The note under the
outline field says what the stroke currently types and where it comes from before you add it
("flick up on S, then curl left now types & (from Shell). Adding it here replaces that."), and an
override takes a second press. The error messages are plain and specific, and the JSON box names
the first bad entry and applies nothing. After the reload, My commands, the Shell edit, the deleted
`gca`, the Texting toggle and the Terminal context had all survived. On a phone-width screen Record
hides the sheet, takes the stroke and brings the sheet back (`33-mobile-after-record.png`). This is
a configuration flow I could make mine in ten minutes, which round one's was not.

What did not:

- From the terminal I opened My strokes, which was tagged "not used in the terminal", and added
  `tty` → `talk to you`. The add silently switched My strokes on in the terminal, at the top of the
  stack, so `tty` now expands there and every stroke I override for Messages now wins in the
  terminal too (`24-mine-from-terminal.png`).
- Turning the Shell pack on in Messages, which is exactly what I would do to get `gs` in a chat
  about a deploy, made the whole Messages stack literal: the word flicks for *I think you are right*
  then a full stop gave `Ithinkyouareright.`, and the space-bar endings became esc, ↑, ⇥, ^R and ^C
  (`28-messages-shell-on.png`).
- The five-stroke outline, `SP-e` (a caret slide, never a stroke) and the double caret were all
  accepted with "Added. Try the stroke." None of them can do what they say; the double caret
  silently uses the second.
- "Add these" replaced my `kgn` and reported "Added 3 entries", with no word that one entry was
  replaced or that `gs` now shadows the Shell pack. "Replace all with these" has no confirmation.
- The entries list shows ` 2>/dev/null` as `2>/dev/null` and ` == ` as `==`, because leading and
  trailing spaces are invisible in the list just as on the keys.
- `shx` → `{^}.sh` cannot attach to anything, because a spelled entry is always the whole run of
  letters: `make` then `shx` is one run, `makeshx`, with no entry.

Contexts after the reload were what I had set: Messages `mine, texting, english, letters`; Terminal
`commands, texting, shell, letters` (and with `mine` on top after the leak above).

## 3. The format, judged

**Expressive enough?** For a text expander, nearly. Plain text, one caret, glue, brace escapes, the
attach operators, Plover's camelCase idiom `{^}{-|}` (which now works), Return, Tab, Escape, the
arrows, Backspace and Ctrl with one character cover most of what I keep in espanso. What I still
cannot express and need: more than one placeholder with a "next field" stroke; casing and spacing
modes (`{mode:snake}`, `{mode:caps}`); repeat-last-stroke and the retro operators; a stroke that
switches a dictionary or a context; Alt or Meta, Home, End, forward Delete, Ctrl with an arrow; and
date or clipboard variables. Two of these matter daily on a terminal: a stroke to toggle prose for a
commit message, and tab stops for snippets such as `kubectl -n {} logs {} --tail={}`.

**Predictable?** Mostly, with two traps. Significant leading and trailing spaces are invisible
everywhere the UI shows a translation, and the key operators are implemented as terminal escape
sequences in every context: `(){#Left}` in My strokes types `()` followed by a literal `ESC [ D`
into a text message, because `Up`, `Down`, `Left` and `Right` map to escape strings
(`src/engine.js:31-33`, `415-425`).

**Documented?** The header of `src/packs.js` and a paragraph in the panel are clear and accurate,
and DESIGN.md now says unknown operators are refused. There is still no reference a user could
read: nothing explains space handling in a literal stack, which outlines can fire, the four-stroke
limit, or what a key operator does in a non-terminal field.

**Safe?** Much safer than round one: the validator refuses unknown operators and unbalanced braces,
and overrides need confirming in the form. It is not safe across contexts, because packs carry
options that decide spacing for the whole stack below them (`src/packs.js:262-264`) and because the
add form changes stacks as a side effect.

**Importing Plover.** Not plausible as shipped. Plover outlines are chords and are refused, and
because validation stops at the first bad entry, pasting a Plover dictionary applies nothing. Many
real Plover translations are refused too: `{#control(c)}` and `{#Control_L(c)}` fail because only
the exact spelling `Control(x)` is accepted (`src/packs.js:41`), and modes and retro operators are
unsupported. A real importer would keep the translations, drop or queue the outlines for
reassignment, and report what it could not take.

**Importing a text expander.** Plausible for most of my espanso and iOS Text Replacement entries,
which is a real improvement: lowercase triggers with digits now work (`k8s`), a single caret works,
and braces escape. Triggers with punctuation (`;gs`, `:date`), capitals, non-ASCII letters or
underscores are refused by `^[a-z][a-z0-9']*$` (`src/packs.js:39`). There is no importer, and no
file import or export beyond copying the textarea.

**A third context.** A code editor with camelCase and snake_case would take code, not configuration:
a new entry in `DEFAULT_STACKS`, a new pack in `defaultPacks`, and changes to the two-button context
switch, `setContext` (which tests `context === 'terminal'`), the panel's context names and the
default open pack. A user cannot create a context or a pack. For the casing itself, the literal
stack already handles `foo_bar` (underscore is a flick) and `fooBar` (an out-and-back capital), so
what a code context really needs is overtyped closers, tab stops and a camelCase stroke, none of
which the format offers except the last.

## 4. The Shell pack, against how I work

The vocabulary is sensible and mostly follows oh-my-zsh: `gs`, `ga`, `gaa`, `gc`, `gco`, `gcb`, `gp`,
`gpf`, `gl`, `gd`, `gds`, `glg`, `gb`. `gst` is still `git stash` where oh-my-zsh has `git status`,
and `gca` is still `--amend` where oh-my-zsh has `--all`, which will trip anyone whose fingers know
omz. kubectl, docker and npm are thin (`kgp`, `kd`, `dps`, `nr`, `ni`) and tmux, systemctl and
journalctl are absent, but that is what My commands is for. The flag briefs (`vrb`, `frc`, `rcr`,
`qt`, `otp`, `dryr`) are as arbitrary as before, and the `--` curl followed by the word is what I
actually use. Note that the flag briefs include their dashes, so `--` then `frc` gives `----force`.

The symbol curls are the best part of the pack and the part I would recommend to other terminal
people. Two of them are wasted: `S-n-ccw` types `&`, exactly what its own flick types, and
`T-nw-cw` repeats `N-sw-back` (`~/`).

The key faces tell me less than they should. In the terminal the steno page shows the letter page's
symbols, which is honest and needs no relearning, and the space bar is labelled with its terminal
keys. But none of the forty curls appear on the faces or in the resting map (`07-guide-rest-S.png`),
only in the guide mid-gesture, and there their labels lose the spaces that distinguish them. Near
the left edge the guide is shifted sideways, so the `$` bubble is drawn below and to the right of
the key while the flick goes below and to the left (`35-guide-A-sw.png`).

What is in the way: the five space-bar endings are terminal keys (section 1 and current defect 2);
the most frequent terminal stroke, the down-pull that expands a brief, sits between Ctrl-C and
Ctrl-R, and the classifier gives the down-pull only the 28 degrees either side of vertical
(`src/recognizer.js:248-251`); and 23 strokes in the terminal stack type non-ASCII lookalikes, three
of them plain flicks next to common shell symbols (`…` beside `$`, `€` beside `=`, `°` beside `&`).

## 5. Two other uses the owner did not name

**Code identifiers in an editor (Textastic, Working Copy, vim in a-Shell).** The literal stack is
the right base: identifiers, underscores, capitals and symbols come out exactly, and English briefs
no longer mangle `init`, `env` or `proc`. What breaks is everything above characters. Auto-paired
brackets do not overtype, so `({|})` followed by `)` doubles the paren. There is one caret, so a
`for` or `func` snippet with several fields cannot be written. There is no case mode, so a
multi-word identifier is typed letter by letter. Comments and docstrings get no word flicks,
because spacing is per stack and English words in a literal stack glue together. And there is no
third context to hold any of this.

**Medical or legal boilerplate in Messages or a notes app.** This now suits the system well.
Spelled entries expand only on the explicit stroke, so a clinical abbreviation that is also a word
(`sob`, `pt`) no longer collides with prose, and capitalisation at a sentence start is handled.
What breaks is that a template has several blanks and there is one caret with no way to jump to
the next; packs cannot be scoped to one app; a merge of a few thousand pasted entries reports
nothing about what it replaced; and the fixed two contexts mean the clinic pack is either on in all
of Messages or nowhere.

**Another language.** A German or French terminal user is fine in the terminal itself, which has
no language in it. The format is not: stroke outlines name keys by their English tap letters and
the Shell pack's curls hang off the English letter page's symbol positions (`A-sw` is `$` only on
that layout), so another layout silently moves every symbol curl. Spelled outlines are ASCII-only,
so `grüße` or `schöne` cannot be triggers. The English endings, contraction classes and
orthography tables remain English-only, as the design says.

## 6. What survives on a device

An iOS keyboard extension can insert text, delete backward, move the caret by a character offset,
and read a little context before and after the caret; it cannot see the host app, cannot send real
key events or modifiers, and cannot know what the host did with what it inserted. Against that:

- **Literal characters, symbols, the symbol curls and the 123 page** would survive, provided the
  steno middleware bypasses the existing compose step. On the current letter page `~`, `$`, `^` and
  `` ` `` are compose triggers that look at the character before the caret, so `` `date` `` typed
  there could compose the closing backtick onto the `e`. The prototype types them literally, which
  is right for a terminal, but the design should say so.
- **Spelled commands** survive at a readline prompt, but the letters are streamed to the PTY as they
  are typed and then deleted when the brief expands. Inside vim, less, htop or tmux copy mode those
  letters are commands. `wq` as a brief would type `w` and `q` in vim's normal mode before its
  Escape arrives. Marked text, where the host supports it, or stroke outlines instead of letter runs
  would avoid this.
- **The caret placed inside `""` by `{|}`, and the space-bar caret slide**, depend on the terminal
  honouring `adjustTextPosition`. If it does not, `gc` leaves the caret after the closing quote and
  the message is typed outside it. A terminal context could send `ESC [ D` instead.
- **Tab, Up, Escape, Ctrl-C and Ctrl-R** as inserted control characters plausibly reach the shell in
  apps that forward inserted text to the PTY byte for byte; nobody has checked. What certainly does
  not survive is the engine's model of the line after them. Completion inserts text the keyboard did
  not write, Up replaces the line, Ctrl-C clears it and Return runs it, yet the engine keeps its own
  copy and its undo history. Undo after Up would send three deletes into the recalled line; undo
  after `git pull --rebase{#Return}` would send deletes into the next prompt and retype `gpr`.
  Research §6.1.4 requires that undo never delete what the engine did not write.
- **Context detection** by field traits is weak for terminals: URL, email, username and code fields
  also ask for no capitals and no correction. The design says the user can switch by hand, but not
  how; there is no key or stroke for it on the keyboard.
- **Record in the containing app** needs the extension to report stroke ids to the app, since the
  app's text field only sees inserted text. That is solvable (an in-app copy of the keyboard view,
  or a shared container), but it is not designed. Where dictionaries live, whether Files and iCloud
  can reach them, and whether Full Access is needed are not addressed at all.

## Current defects, most severe first

1. **Turning the Shell pack on in Messages turns all of Messages literal.** In Messages, open
   Dictionaries and switch Shell on, then write the flicks for *I*, *think*, *you*, *are*, *right*
   and a full stop. Expected `I think you are right.`; actual `Ithinkyouareright.`, and the endings
   on the space bar are replaced by esc, ↑, ⇥, ^R and ^C (`28-messages-shell-on.png`). Cause: the
   highest pack that states an option decides it for the whole stack (`src/packs.js:262-264`), and
   Shell declares `spacing: 'literal'`.
2. **The prose ending gestures are destructive keys in the terminal.** In Terminal, `gc`, pull,
   `Make sure it`, flick the space bar down-right, ` fixed`. Expected *it's* (what the same flick
   gives in Messages); actual `git commit -m "Make sure it^C fixed"` (`34-commit-its-ctrlc.png`). The
   flick up for *-s* is Up, up-right for *-ing* is Tab, up-left for *-ed* is Escape, and down-left
   for *n't* is Ctrl-R (`src/packs.js:213`). On a device Ctrl-C aborts the line and Up replaces it.
3. **Adding an entry to a pack that is off in the current context turns it on, at the top.** In
   Terminal, open My strokes ("not used in the terminal"), add `tty` → `talk to you`. Expected the
   entry in My strokes for Messages only; actual the terminal stack becomes
   `mine, commands, shell, letters` and `tty` expands in the terminal (`src/ui/panel.js:348`). The
   override warning beside it also describes the current context's stack rather than the pack's
   own (`src/ui/panel.js:309`, `339`).
4. **The habit space doubles, and the spaces that matter are invisible.** `ls`, space, the pipe curl,
   `wc` gives `ls  | wc`; `make`, space, the `&&` curl gives `make  &&  echo`; `dk`, pull, space,
   `ps` gives `docker  ps`. Twenty-one of my thirty-one lines contain such a form. `labelOf` trims
   (`src/packs.js:111`), so ` -`, ` | `, ` > `, ` < ` and ` &` look exactly like the flicks they curl,
   and the spacing convention is inconsistent (` | ` and ` && ` spaced, `||` and `&` bare, ` 2>&1`
   leading only, ` -` but `--`) (`src/packs.js:201-206`).
5. **Paired quotes and brackets are not overtyped.** `echo`, space, quote curl, `hi there`, `"`.
   Expected `echo "hi there"`; actual `echo "hi there""` with the caret between the last two quotes.
   `cd`, space, `$(` curl, `pwd`, `)` gives `cd $(pwd))`. Leaving by the space-bar slide wipes the
   undo history, after which undo deletes the closing quote (`src/engine.js:199-215`).
6. **A spelled command will not expand after a single quote.** `bash -c `, the single-quote curl,
   `gs`, pull. Expected `bash -c 'git status'`; actual `bash -c 'gs'` and nothing happens. Typed
   `echo 'gs` behaves the same. Cause: `'` counts as part of the spelled run, which is right for
   *don't* and wrong in a shell (`src/engine.js:26-28`, `106`).
7. **Non-ASCII lookalikes on terminal strokes.** `echo `, a flick down on A (beside `$`), `HOME` gives
   `echo …HOME`; a flick down-right on I (beside `=`) gives `€`; up-right on S (beside `&`) gives `°`;
   out-and-back on `"`, `'`, `.` and `~` gives `“`, `”`, `…` and `˜`. There are 23 such strokes in
   the terminal stack, inherited from the letter page (`src/packs.js:132-139`, `src/layout.js:48`).
8. **Key operators are stored as text and undone as text.** Up then undo deletes three characters;
   `gpr` → `git pull --rebase{#Return}` then undo gives back `gpr`; in Messages, `(){#Left}` types
   `()` and a literal `ESC [ D` (`src/engine.js:31-33`, `415-425`). The demo then "sends" `↑` and
   `sleep 100^C` as commands (`src/ui/app.js:282-298`), so it cannot show what a terminal would do.
9. **The paper tape says "finish" after a brief.** `gpf`, pull: the chip reads "finish", not
   `git push --force-with-lease` (`30-ribbon-gpf.png`; the label is `labelOf('{=}')`,
   `src/engine.js:142`).
10. **JSON merge overwrites silently and Replace has no confirmation.** With `kgn` already defined,
    "Add these" with a new `kgn` and `gs` reports "Added 3 entries"; the old `kgn` is gone and `gs`
    now shadows Shell, neither mentioned. "Replace all with these" empties a pack in one click with
    no undo (`src/ui/panel.js:354-368`).
11. **Shipped packs are frozen on the first edit.** Any change stores every editable pack whole,
    Shell's 86 entries and Texting's included (`src/ui/app.js:54`), so a later improvement to the
    shipped Shell pack can never reach that user, and a deletion cannot be told from an addition.
12. **Outlines that can never fire are accepted.** `T-n/T-n/T-n/T-n/T-n` (the engine matches at most
    four, `src/engine.js:25`), `SP-e` and `SP-w` (caret slides, `src/ui/keyboard.js:349`), `SP-n-cw`
    and `SP-circle` (the space bar has no curls), all with "Added. Try the stroke.". `a{|}b{|}c` is
    accepted and the first caret ignored.
13. **A multi-stroke outline cannot be recorded.** The code that would extend the outline on a
    second Record tests `btn.dataset.extend`, which nothing sets (`src/ui/panel.js:327`).
14. **Digits still need the 123 page.** Fourteen of my lines needed it, for 28 switch gestures, while
    seventeen flick directions in the terminal stack are undefined (`A-w A-nw A-n A-ne N-ne I-e I-nw
    I-n H-s H-n R-s T-s T-sw T-n E-w S-se S-s`). The letter page's space on `S-se` is also dropped
    (`src/packs.js:136`).
15. **Look up matches only an exact label.** "git commit" and "$(" find nothing, and "-" and " -"
    both answer with the plain dash (`src/planner.js:84-91`).
16. **Smaller things.** Multi-stroke entries have no glyph in the list; `gpr{#Return}` then a space
    leaves a stray space after the newline; the demo trims a leading space on send, which bash's
    `ignorespace` gives meaning to; `S-n-ccw` duplicates its own flick; a spelled command expands
    mid-token after `.`, `_`, `/` or `-` (`main.gs` then the pull gives `main.git status`); and the
    guide near the left edge is drawn displaced from the direction of the flick.

## Design-level objections that no bug fix would cure

**The terminal context gives up prose entirely, and its keys sit on prose's most automatic
gestures.** A terminal user types prose every day, in commit messages, PR titles over `gh`, and
chat clients in tmux. Today that prose is spelled letter by letter, and the gestures a learner has
automated for it are Ctrl-C, Up, Tab, Escape and Ctrl-R. I would move the terminal keys to gestures
with no prose meaning (the corner key has free directions, and the terminal stack has seventeen free
flicks), and give the terminal a prose span: inside a quoted argument, or after a toggle stroke,
the English pack with prose spacing applies until the closing quote.

**A literal stack leaves spacing to the user, and the user's habit is the prose one.** The design's
third promise is that tapping space after a word is harmless; in the terminal it is not. The
translator should own spaces in a shell too, with shell rules: a form that begins with a space
swallows the space before it, a form or command that ends with one swallows the next tap, closers
overtype, and the labels show the spaces (a visible `␣|␣` rather than `|`).

**Contexts and options are hard-coded, and options belong to packs.** There are two contexts in
code, six packs, no way to make a third of either, and spacing is decided by whichever pack in the
stack declares it. Contexts should be data (a name, a rule over field traits, a stack, its own
output options), packs should be user-creatable files with no options of their own, and a context
switch should be reachable from the keyboard, as research §6.4.6 requires.

**The engine's model of the line cannot survive a real terminal.** Anything the host interprets
(Tab, history, Ctrl-C, Return, the host's own echo) must end the engine's knowledge of the line:
reset its state and make undo a no-op across it. Letter-run briefs stream their letters to the host
before rewriting them, which a shell prompt tolerates and a full-screen program does not.

**Dictionaries need a home and an update model.** User edits should be an overlay on the shipped
packs, stored as files that Files, iCloud and a dotfiles repository can reach, with import and
export that merge and report. Recording from the containing app needs a channel from the extension
that the design does not have yet.

What is inherent to a browser prototype: how Blink, Termius and a-Shell treat inserted control
characters and caret moves, whether they support marked text, storage and Full Access, and how
thumbs actually perform. What the designer could fix now, in the prototype: every numbered defect
above, shell-aware spacing and overtyping, keys as undo barriers, moving the terminal keys,
digits on free terminal flicks, ASCII-only terminal strokes, options on contexts, user packs and
contexts as data, overlay storage, and a demo terminal that behaves like one (Up recalls the last
command, Ctrl-C clears the line, Tab completes from a fake directory), so that the model problem is
visible before anyone builds the Swift port.

## Changes that would most raise my score, in priority order

1. Move Ctrl-C, Up, Tab, Escape and Ctrl-R off the prose ending gestures, and let prose (English
   words, endings, prose spacing) apply inside a quoted argument or under a toggle stroke.
2. Give the terminal shell-aware spacing (swallow a doubled space before or after a spaced form),
   overtype closing quotes and brackets, and show significant spaces in every label.
3. Fix the cross-context faults: options belong to the context, adding to a pack never changes a
   stack without asking, and override warnings describe the contexts that pack is used in.
4. Treat host-interpreted keys as barriers that reset the engine, make the demo terminal behave
   like one, and test `gc`, Tab, Up, Ctrl-C and a brief inside vim in Blink and Termius on a device,
   publishing the result.
5. Put the digits on the free terminal flicks and remove non-ASCII lookalikes from the terminal
   stack.
6. Store user edits as an overlay on shipped packs, in files the user can reach; add file import and
   export, a merge report, a confirmation on Replace, an espanso and Text Replacement importer, and a
   Plover importer that keeps translations and queues outlines for reassignment.
7. Extend the format: several placeholders with a next-field stroke, casing modes, a dictionary or
   context switch stroke, Home, End, Delete and Alt, and Plover's key-name spellings.
8. Make contexts and packs user-creatable and orderable, with a keyboard-reachable switch.
9. Polish: the tape shows what a brief typed, the validator refuses outlines that cannot fire,
   Record can extend an outline, and Look up searches by substring.

If all of these were done and the device test passed in two terminal apps, I would give it about
8.6 overall: a keyboard I would use and recommend for phone terminals, held below 9 only by the
absence of any measurement of real thumbs making these curls.
