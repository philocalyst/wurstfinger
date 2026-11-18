# Round 1 review: steno mode for command lines and configuration

Reviewer persona: someone who SSHes from a phone every day (Blink, Termius, a-Shell), types git,
kubectl and docker on glass, and keeps their own Plover and text-expansion dictionaries. I judged
the design document, the prototype source and the live demo, and I tried to make the keyboard mine
within ten minutes.

## Scores

| Criterion | Score |
| --- | --- |
| Novelty | 6.5 |
| Wonderful and intuitive to use (in a terminal) | 4.0 |
| End-to-end useful (for command lines) | 3.5 |
| Without fault (correctness and polish) | 2.5 |
| Easy to configure | 4.5 |
| Power and expressiveness of the dictionary system | 3.5 |
| **Overall** | **4.0** |

The owner's bar is 9.2. This is not close for command-line use, and I would not switch to it today
or recommend it to other terminal people. The architecture underneath is the right shape: a stack
of dictionaries, a canonical ASCII stroke notation, letter runs as outlines, a caret marker, one
undo per stroke, and a Record button. That is why the scores are not lower. But eleven of the
twenty-four real command lines I typed came out wrong on the first natural attempt, several of the
failures are silent rewrites of correct input, and the configuration flow I was promised (press
Record, make the stroke, type the text) corrupts a letter or a flag dash when I use it to add a new
curl.

## How I tested

`npm test` passes: 17 of 17, including the 2,437-message round trip. The shell coverage in
`test/engine.test.mjs` is four happy paths (`gc`, `ls -la`, `grep --color=auto ./src`, `git add .`),
so it says nothing about the cases below.

I typed with real pointer events in the browser (Playwright mouse drags through the recogniser) for
`git commit -m "Fix login bug"`, `ls -la ~/projects`, `git init`, `gs` followed by Return,
`chmod +x ~/bin/deploy_prod.sh`, `kubectl get pods -n kube-system`, `make build || echo` and
`head -n 20 file`, including the corner-key page switches to the abc and 123 pages. I ran all
twenty-four lines through `wf.engine` in the page (stroke, literal for abc and 123 page characters,
moveCaret for the space-bar slide) and through the same `Engine` in Node; both gave byte-identical
output. Scripts and screenshots are in
`scratch/review/cli/`
(the `shots/` folder holds the screenshots named below).

## 1. Twenty-four command lines in the Terminal context

"Strokes" counts every gesture including space-bar taps, caret slides, undos and page switches. A
page switch is one corner-key flick (up-right toggles steno and abc, up-left goes to 123). The last
column is the existing letter keyboard, roughly one gesture per character plus two switches per
digit run. Where the first attempt was wrong, the stroke count is for the cheapest sequence I found
that gives the exact line.

| # | Command | Right first time? | Strokes for the exact line | Letter keyboard |
| --- | --- | --- | --- | --- |
| 1 | `git commit -m "Fix login redirect when session expires"` | yes | 37 (0 switches) | 55 |
| 2 | `ls -la ~/projects/wurstfinger` | yes | 26 (0) | 29 |
| 3 | `grep -rn "TODO" src/ \| wc -l` | no: `src/\| wc -l` | 20 (0) | 28 |
| 4 | `cd ../..` | yes | 5 (0) | 8 |
| 5 | `export KUBECONFIG=~/.kube/config-prod` | no: `config -prod` | 37 (1) | 37 |
| 6 | `kubectl get pods -n kube-system -o wide` | no: `kube -system` | 27 (2) | 39 |
| 7 | `docker run -d -p 8080:80 --name web nginx:latest` | no: `nginx: latest` | 40 (3) | 52 |
| 8 | `ssh deploy@10.0.0.12 -p 2222` | yes | 31 (4) | 38 |
| 9 | `curl -sL https://example.com/install.sh \| bash` | yes | 41 (2) | 46 |
| 10 | `tar -xzf release_v2-final.tar.gz -C /tmp` | no: `release_v2- final` | 43 (4) | 42 |
| 11 | `echo "Hello World" > notes.txt && cat notes.txt` | yes | 41 (0) | 47 |
| 12 | `git log --oneline -n 20 --author="Ada Lovelace"` | yes | 43 (2) | 49 |
| 13 | `find . -name "*.py" -mtime -7 \| xargs rm -f` | yes | 32 (4) | 45 |
| 14 | `make build \|\| echo failed` | no: `make build \| \| echo` | 26 (2) | 25 |
| 15 | `cd $(git rev-parse --show-toplevel)` | no: `rev -parse --show -toplevel` | 38 (5) | 35 |
| 16 | `ps aux \| grep node \| head -5` | yes | 24 (1) | 30 |
| 17 | `rm -rf ./build && npm run build 2>&1 \| tee build.log` | yes | 33 (0) | 56 |
| 18 | `git push --force-with-lease origin feature/steno-mode` | no: `feature/steno -mode` | 30 (1) | 53 |
| 19 | `FOO=bar ./run.sh` | yes | 14 (0) | 16 |
| 20 | `chmod +x ~/bin/deploy_prod.sh` | no: `deploy_ product.sh` | 30 (3) | 29 |
| 21 | `python3 -m venv .venv && source .venv/bin/activate` | yes | 41 (0) | 52 |
| 22 | `sudo systemctl restart nginx` | yes | 26 (0) | 28 |
| 23 | `cat /etc/hosts \| sort \| uniq -c` | no: `unique -c` | 28 (0) | 31 |
| 24 | `git init && git add -A` | no: `git initial && gaa` | 15 (0) | 22 |

Thirteen of twenty-four were right first time. After workarounds the total is 728 strokes against
about 892 letter by letter, an 18 % saving, and nearly all of it comes from the git and npm
spelled briefs (lines 1, 17, 18, 21). Lines 5, 10, 14, 15 and 20 are no better or worse than the
keyboard the user already has, and they also cost three to five page switches. Across the
twenty-four lines I made 34 page switches.

What I had to do, in practice:

- The good parts really are good. `gc` then space gives `git commit -m ""` with the caret inside,
  and the message can use word flicks (`the`, `when`) with correct spacing; Return sends the whole
  line including the closing quote. `rmr`, `nr`, `gpf`, `crl`, `kgp` and the `./`, `../`, `~/`,
  `|`, `&&`, `--`, `=`, `2>&1` curls do exactly what they say, and short flags glue (`-la`, `-xzf`).
  Capital letters by out-and-back work for `-R`, `-C`, `-X` and `KUBECONFIG`.
- Every character in this list needed the abc or 123 page: all digits, `_`, `$`, `(`, `)`, `@`,
  `:`, `*`, `+`, the second `|` of `||`, and an attached `-`. Not available in steno at all, and
  not used above: `;`, `&` alone, `#`, `%`, `\`, backtick, `[ ]`, `{ }`, `<`, `>>`, bare `~`, Tab,
  Escape, arrow up for history, Ctrl-C.
- A switch is one corner flick out and one back, and the whole face of the keyboard slides and
  changes. That would be tolerable for one character. It is not tolerable because of defect 5: once
  you type a character on another page, the next steno letter gets a space in front of it, so the
  rest of the token has to be finished on the abc page. In practice every token containing `_`,
  `:`, `@`, `$` or a digit followed by letters is typed on the old keyboard.

## 2. Building my own pack

Through the Dictionaries tab, with real clicks and typing, I added eighteen entries to "My
strokes": `kgn` → `kubectl get nodes`; `dkx` → `docker exec -it {|} bash`; the two-stroke outline
`T-n/T-e` → `terraform plan`; a recorded curl for an intra-word hyphen `{^}-{^}`; a recorded
override of the built-in "can" curl (`O-w-cw`) as `{^}_{^}`; a recorded curl for `{^}${^}`; `gst`
→ `git status -sb` overriding the Shell pack's `git stash`; `gs` → `git status --short` as a
deliberate conflict; identity entries `env`, `init` and `var` to stop the prose expansions;
`gpr` → `git pull --rebase{#Return}`; `awkp` → `awk '{print $1}'`; `fx` →
`find . -type f -exec {|} {} +`; `k8s` → `kubernetes`; `cc` → `{#control(c)}`; and `esc` →
`{#Escape}`.

What worked: `kgn`, `dkx` (the caret lands mid-line and `dkx web` gives `docker exec -it web bash`),
the two-stroke outline, the underscore curl (`my_file`), the identity entries (`env | grep` comes
out right), and the conflict report on the Shell pack ("3 entries here are overridden by a
dictionary above: A-e gs gst"). The add form is quick, and "It now overrides 'git stash'" is a
useful note. Screenshots: `10-packs-initial.png`, `12-packs-after-adds.png`,
`13-shell-pack-shadowed.png`.

What did not: Record captured `A-e` when I drew `A-e-back` and `E-e` (the letter z) when I drew
`E-e-cw`, so my hyphen replaced the flag dash (`ls -la` then typed `ls-la`) and my dollar replaced
z (`zip` typed `$ip`). The braces in the awk and find snippets vanished. `{#control(c)}` and
`{#Escape}` produced nothing and said nothing. `k8s` and the typo `t-n` were accepted although
they can never fire. The add form rejected `Hello World`, `T-x` and an empty outline, but the
JSON box accepted `"Hello World"`, `""` and `"T-q"` as keys, and Apply JSON replaced my eighteen
entries with the four I had pasted (`14-json-replaced.png`). A trailing comma and a non-string
value were rejected with clear messages.

After a reload, "My strokes" survived with all eighteen entries. The entry I had added to the
Shell pack, which the UI presents as editable, was gone; so were the pack toggles, and the demo
was back in the Messages context (`16-after-reload.png`). Switching English off in Terminal to get
rid of prose made every letter and even the space bar type nothing, while the keys still showed
their letters (`18-english-off-terminal.png`).

## 3. The format, judged

The canonical stroke notation (`T-n-cw`, `SP-ne`, `T-n/T-e`) is the best thing here: one ASCII
spelling per gesture, diffable, writable in a text editor. Letter runs as outlines make the pack
format look like a text expander, which is exactly what most people will want. The Plover-style
operators that are implemented (`{^}`, `{^x}`, `{x^}`, `{&x}`, `{-|}`, `{>}`, `{|}`,
`{#Return}`, `{#Tab}`, `{#Left}`, `{#Right}`) behave sensibly in the common cases.

It is not documented beyond a comment block in `src/packs.js` and one paragraph in the design, it
is not validated, and it is not safe in the sense of "what I wrote is what I get":

- There is no escape for literal braces, so anything with `{}` cannot be written (awk, `find -exec`,
  `xargs -I{}`, `${var}`, brace expansion, JSON, every C-family language).
- Unsupported Plover operators either print themselves (`{<}`, `{*-|}`, `{*+}`, `{mode:snake}`,
  `{=...}`, `{plover:...}`) or vanish (`{#control(c)}`, `{#Escape}`, `{#Up}`).
- Plover's camelCase idiom `{^}{-|}` gives `set Attribute`; it needs `{^}{-|}{^}` here, so Plover
  dictionaries would not behave the same even where the operators look identical.

What I cannot express and need: key chords (Ctrl-C, Ctrl-R, Ctrl-D), Escape, Tab completion from
steno, arrow keys, repeat last stroke, case modes (snake, camel, caps), digits that glue inside a
token, more than one placeholder, clipboard or date variables, a stroke that switches packs, and
per-context packs. The engine recognises `{#Tab}`, but nothing in steno mode is bound to it, and
the abc page's Tab flick (`T-se`) is "your" in steno.

Importing a Plover dictionary is plausible only for the translations: Plover outlines are steno
chords and mean nothing on this grid, so every outline would have to be reassigned by hand. A
text-expander import (espanso, iOS Text Replacement) is much more plausible, because trigger to
letter run is a direct mapping, but only for triggers that are lowercase letters (espanso's
`:trigger` and `;gs` conventions cannot be typed as a letter run), replacements without braces,
and one cursor marker. There is no import or export UI beyond copying the textarea, and Apply
replaces rather than merges.

## 4. The shipped Shell pack, against how I work

The git vocabulary is the right idea and mostly follows oh-my-zsh, which many of us have in our
fingers. Two entries contradict it: omz `gst` is `git status`, here it is `git stash`; omz `gca` is
`git commit --all`, here it is `--amend`. The best case for this pack is a server or container
where my dotfiles are not installed; on my own machine I already have `gs` and `k` as aliases, and
typing the alias is shorter than expanding it.

The disemvowelled flag briefs (`frc`, `vrb`, `rcr`, `otp`, `qt`, `dryr`) are arbitrary to
remember; the `--` curl followed by the spelled word is already correct and predictable, which is
what I would actually use. kubectl, docker compose, systemctl, journalctl, tmux, `2>/dev/null`,
`$(...)`, `$HOME`, `| less` and `sudo !!` are missing.

The strokes themselves are sensible in places (quotes on the apostrophe, `./` and `../` on the
period, `--` and `=` on the dash), but `/`, the commonest symbol in a shell line, is now a curl,
which the model in `src/model.js` prices at 702 ms against 300 ms for the flick it was on the old
keyboard (`N-sw`, which is "no" in steno). `_` and `$` were single flicks and are now three
strokes plus a spacing bug.

The key faces do not tell me what I will get. In Terminal, the keys still show 39 prose words and
the six endings, the marks look the same as in prose although they now attach on both sides, and
the twelve shell curls appear only in the guide mid-gesture (`20-hold-A-e-terminal.png` shows `=`
and `--` there, which is nice, but only once my thumb is already moving). Look up refuses "git
status" and "--force" ("Letters only, please"), so I cannot ask which stroke types a shell entry.

Prose gets in the way in four ways: 2,624 English briefs and the `i`→`I` rule expand real tokens;
the space-bar flicks are English endings (`git` plus a drifting space-bar flick up types `gits`);
every free direction is a prose word that an imprecise flick will type; and the commit message
inside quotes gets shell punctuation rather than prose punctuation (`Fix a, b` gives `Fix a,b`).

## 5. Two other uses the owner did not name

**Code identifiers in an editor (Textastic, Working Copy, a-Shell's vim).** This breaks first on
braces, because translations cannot contain them, so `{}`, `function() {|}`, JSON and struct
literals cannot be snippets. It breaks next on case: there is no snake or camel mode, Plover's
camelCase idiom does not work, and every hump is an out-and-back capital. The English briefs then
rewrite identifier fragments that are not words: `init`→initial, `env`→environment,
`func`→function, `obj`→object, `eval`→evaluation, `arg`→argue, `req`→request, `cur`→current,
`dele`→delete, `mem`→memory, `proc`→process, `var`→various. Digits inside identifiers (`utf8`,
`x86_64`, `sha256`) need the 123 page and then pick up a stray space. Indentation and
bracket pairing are not addressed.

**Medical or legal boilerplate.** This is the use the system suits best: letter-run abbreviations
expand to long phrases, sentence capitalisation is handled, `{#Return}` gives paragraphs, and the
caret marker can land at the one blank to fill. What breaks is that boilerplate usually has several
blanks (patient name, date, dose), and there is exactly one `{|}` with no way to jump to the next.
Packs cannot be scoped, so a clinical abbreviation pack also fires in personal messages, and a
clinical abbreviation that is an English word (`sob`) cannot be claimed without losing the word.
Importing a few thousand entries through Apply JSON gives no conflict report at all.

German or any other language would break on the contraction classes, the irregular tables, the
English endings on the space bar and the hard-coded `i`→`I` entries in `baseDictionary`; the
design already says this.

## Defects, most severe first

1. **Prose briefs rewrite correct shell tokens in the Terminal context.** In Terminal, spell
   `git`, space, `init`, space. Expected `git init `; actual `git initial `. Also `cd /var/log` →
   `cd /various/log`, `env | grep` → `environment | grep`, `vim .env ` → `vim .environment `,
   `uniq -c` → `unique -c`, `nginx.conf ` → `nginx.confirm `, `/opt` → `/option`, `/proc` →
   `/process`, `npm run dist ` → `distance`, `prod` → `product`, and among the 1,377 commands in
   this machine's `/usr/bin`: `awk`, `env`, `uniq`, `dir`, `expr`, `perf`, `shuf`, `tac`. Cause:
   the English pack stays enabled (`src/ui/app.js:283-284` only toggles Shell and Texting) and its
   briefs expand on any boundary (`src/engine.js:242-261`).
2. **`-i` becomes `-I`.** Spell `grep`, `A-e`, `i`, space. Expected `grep -i `; actual `grep -I `.
   Same for `ssh -i` and `npm i`. These are different flags with different meanings. Cause:
   `src/packs.js:61` (`i: 'I'`, `im: "I'm"`) is in the English pack.
3. **Letters cannot be had without English.** Switch the English pack off in Terminal and type
   `g i t` space. Expected `git `; actual nothing, four "no stroke here" chips, while the keys
   still show their letters. Cause: `alphabetEntries()` and `SP` live inside `baseDictionary`
   (`src/packs.js:54`). There is therefore no way to get letters plus Shell without prose.
4. **Shell's own briefs collide with literal tokens.** `main` `.` `py` space → `main.python3 `;
   `ls` `A-e` `lt` space → `ls -ls -lt `; `tf` (terraform) → `tail -f`; `nm`, `sd`, `mk` likewise.
   Cause: `src/packs.js:89-97`, plus defect 6.
5. **A character typed on the abc or 123 page puts a space before the next steno letter.** `my`,
   abc `_`, `file` → `my_ file`; abc `$`, `HOME` → `$ HOME`; `user`, `@`, `host` → `user@ host`;
   `nginx`, `:`, `latest` → `nginx: latest`; `k`, 123 `8`, `s` → `k8 s`; `sha`, `256`, `sum` →
   `sha256 sum`; with defect 1, `deploy`, `_`, `prod.sh` → `deploy_ product.sh`
   (`05-chmod-naive.png`). Cause: `literal()` clears `attachNext` (`src/engine.js:127`) and
   `needsSpace()` only exempts `( [ { < \n \t space /` (`src/engine.js:18, 263-266`).
6. **Return does not finish the outline being spelled, so the same letters do different things.**
   Spell `gs`, Return: the terminal receives `gs` although the ribbon says `gs → git status`.
   Spell `init`, Return: `init`; spell `init`, space: `initial`. Cause: `submit()` reads
   `engine.text` without a boundary (`src/ui/app.js:245-246`).
7. **No attached hyphen in Shell.** `kube`, `A-e`, `system` → `kube -system`. Expected
   `kube-system`. The same breaks `config-prod`, `rev-parse`, `--show-toplevel`,
   `feature/steno-mode` and `release_v2-final`; six of my twenty-four lines. Cause: Shell's `A-e`
   is `-{^}` (`src/packs.js:83`) and nothing replaces prose's `{^}-{^}`.
8. **Record captures the wrong stroke for any curl that is not yet defined, and saving it destroys
   a letter or mark.** Press Record and draw `A-e-back`: the outline field says `A-e`. Draw
   `E-e-cw`: it says `E-e`, the letter z. Saving `{^}-{^}` and `{^}${^}` then makes `ls -la` type
   `ls-la` and `zip` type `$ip`, with only "It now overrides '-'" as warning. Cause: the keyboard
   resolves an undefined hook to its flick (`src/ui/keyboard.js:328-330`) before the recording
   intercept (`src/ui/app.js:63-64`). Adding a new curl, the main promise of Record, is impossible.
9. **Braces cannot be escaped and are silently eaten; malformed braces mangle output.**
   `awk '{print $1}'` → `awk 'print $1'`; `find . -exec rm {} \;` → `find . -exec rm  ;`;
   `${HOME}` → `$HOME`; `\{x\}` → `\x\`; an unclosed `{^ing` after `echo` → `echoin`. Cause: the
   tokenizer in `src/engine.js:192-232` has no escape and no validation.
10. **Unsupported operators leak or vanish.** `{<}word` → `<word`, `{*-|}` → `*-|`, `{*+}` →
    `*+`, `{mode:snake}` → `mode:snake`, `{plover:add_translation}` → the text itself;
    `{#control(c)}`, `{#Escape}` and `{#Up}` → nothing (`src/engine.js:223-231, 319-330`).
    Plover's `{^}{-|}` gives `set Attribute`. Research §6.1.5 requires these to be reported.
11. **`>>`, `||` and many symbols are unreachable in steno.** `N-e-cw` twice → `| |`; `E-sw-cw`
    twice → `> >`. Digits, `_ $ ( ) @ : ; * # % \ \` [ ] { } + &` and bare `~`, plus Tab, Escape,
    history and Ctrl-C, all need another page, which with defect 5 means the rest of the token too.
12. **Only "My strokes" persists.** Add `tfp` to the Shell pack (the UI allows it), reload: gone.
    Pack toggles and the Terminal context are also lost (`src/ui/app.js:33-41`). Nothing says so.
13. **Apply JSON replaces the pack and validates nothing but value types.** Paste a one-entry
    object into the box of a pack with eighteen entries and press Apply: seventeen entries are
    gone. Keys `"Hello World"`, `""` and `"T-q"` are accepted; translation syntax is not checked
    (`src/ui/panel.js:251-262`). There is no file import, export or merge.
14. **The add form accepts outlines that can never fire.** `k8s` (digits arrive as literals, which
    end the letter run), `t-n` (a lowercase stroke typo, taken as letters), `e.g`, and outlines of
    five or more strokes (`MAX_OUTLINE_STROKES = 4`, `src/engine.js:21`); validation is
    `src/ui/panel.js:240`.
15. **No per-context packs and no user-created packs.** "My strokes" is global, so `T-n/T-e` →
    `terraform plan` also fires in Messages whenever I write "the you". I cannot make a "k8s" or
    "work" pack, reorder packs, or give a pack options; `setContext` overwrites my toggles
    (`src/ui/app.js:283-284`).
16. **Prose punctuation is wrong inside quoted strings and after a trailing slash.** In a `gc`
    message, `Fix a`, `E-sw`, `b` → `Fix a,b`; `. ~/.bashrc` typed as `E-s`, `I-w-cw` →
    `.~/.bashrc`; `src`, `I-w-ccw`, `N-e-cw` → `src/|` (the `/` curl leaves attach-next set).
17. **Terminal key faces advertise prose and hide the shell.** See section 4; and Look up rejects
    anything but letters (`src/ui/panel.js:151`), so shell entries cannot be looked up.
18. **Ribbon chips for expansions show a diff fragment.** `prod` then `.` shows the chip `uct.`;
    `dkx` shows `ocker exec -it bash` (`05-chmod-naive.png`, `15-keyboard-with-mine.png`). Cause:
    the chip uses `e.out`, the common-prefix diff from `record()` (`src/ui/app.js:156`,
    `src/engine.js:350-358`).
19. **Leaving quotes with the caret slide wipes the undo history**, so after `gc` the message can
    no longer be undone stroke by stroke (`src/engine.js:167-185`). A `{#Right}` stroke would keep
    it, but none is shipped.
20. **Small things.** `autoCapitalizeLiteral` is read but never set (`src/engine.js:125`). The
    multi-stroke entry `T-n/T-e` has no glyph in the list. The guide map is clipped at the screen's
    left edge (`20-hold-A-e-terminal.png`). `{#Return}` inside `gpr` followed by space leaves a
    stray space after the newline.

## Design-level objections that no bug fix would cure

**The Terminal context is a prose keyboard with a shell pack on top, and it should be the other
way round.** Steno mode buys its words by giving away the 48 symbol directions, which is a good
trade in a text message and a bad one in a shell, where symbols are a third of the characters.
The terminal profile should start from the letter keyboard the user already knows, with `/`, `_`,
`$`, `:`, `@`, `=` and the rest back on their flicks, and add only what pays in a shell: the
curls, the spelled command briefs, and gluing. That single change would remove defects 5, 7 and
11 and most of the page switching.

**The alphabet must not belong to the English dictionary.** Letters, marks, the space bar and
glue are the keyboard; English words and English briefs are vocabulary. They need to be separate
layers so a profile can have letters without prose (defects 1 to 3).

**Expansion on every boundary is right for prose and wrong for a shell.** English briefs are
chosen so that they are never words; shell tokens are mostly not words, so they collide. In a
shell profile, letter-run outlines should expand only on an explicit stroke (a dedicated
"expand" flick, or space-bar flick, distinct from the plain space), or Return should commit
exactly as space does and there should be a one-stroke "type this literally". Today the only
escape is noticing the rewrite and pressing undo.

**Packs need to be files with metadata, not four hard-coded objects.** A user pack needs a name,
an order, options (capitalisation, spacing), and a rule for when it is on (the field traits the
design already uses, such as keyboard type and autocapitalisation), plus a stroke to switch it.
It needs import and export that merges and reports conflicts, and a home the Files app and iCloud
can reach. The design document says nothing about where dictionaries live.

**The translation language needs a spec, an escape, a validator and an honest list of what iOS
cannot do.** Either implement Plover's semantics where the syntax is Plover's (camelCase, `{<}`,
`{*+}`, modes) or reject those operators visibly. Document key chords as unsupported if the
keyboard extension cannot send them.

**Nobody has checked this against a real terminal.** The demo composes into a local field and
sends the line on Return. Blink, Termius and a-Shell stream each character to the PTY as it is
inserted. Retroactive rewrites are delete-then-retype, which readline tolerates but a REPL or an
editor may not, and the `{|}` caret depends on the host honouring `adjustTextPosition`, which a
terminal may ignore or translate into arrow keys. Research §6.4.1 asks for testing in two terminal
apps; until then `gc` with the caret in the quotes is a demo feature, not a terminal feature.

## Changes that would most raise my score, in priority order

1. Split the alphabet from English, and make the Terminal profile letters plus symbols on their
   old flicks plus the shell curls, with no English words, briefs, endings or `i`→`I`.
2. Make characters from the abc and 123 pages glue inside a token, add an attached hyphen and
   gluing digits in steno, and bind Tab, `>>` and `||` to strokes.
3. Make letter-run expansion explicit in the shell profile and make Return commit the pending
   outline exactly as space does.
4. Fix Record for undefined curls, confirm before overriding a letter, mark or space-bar stroke,
   and allow recording a multi-stroke outline.
5. Give the translation language brace escapes, a validator that shows errors in the Dictionaries
   tab, visible rejection of unsupported operators, Plover-compatible camelCase, repeat, case
   modes, and several placeholders with a "next placeholder" stroke.
6. Turn packs into user-creatable, orderable, persisted files with options and context rules,
   with merge-on-import, export, and importers for Plover translations and iOS Text Replacement or
   espanso.
7. Show the shell on the key faces in Terminal and let Look up search by translation.
8. Test the rewrite and caret behaviour in Blink and Termius over SSH and publish the result.
