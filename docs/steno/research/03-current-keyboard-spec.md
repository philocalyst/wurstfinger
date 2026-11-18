# 03 — The current keyboard, as an implementation spec

This document describes the keyboard on branch `steno-prototype` (cut from `engine`, head
`1500a42`) precisely enough to rebuild its look and behaviour in HTML, CSS and JavaScript without
running the Swift app. Every fact carries a `file:line` citation. Paths are shortened with two
prefixes: `K/` stands for `Sources/WurstfingerKit/Keyboard/` and `S/` for `Sources/WurstfingerKit/`.

Three kinds of statement appear, and they are marked so that they are not confused:

- **Source** facts are read directly from the cited line.
- **Computed** values are the source formula evaluated for a 393 pt wide portrait iPhone
  (393 × 852 pt screen, default settings, no completion row).
- **Derived** values are not in the repository: the numeric values of iOS system colours that the
  code only names (`Color.primary`, `.secondary`, `.accentColor`, the materials), the conversion of
  SwiftUI's `spring(duration:bounce:)` into stiffness and damping, and font substitutions. They are
  standard platform values, but they were not verified against a running device.

Contents: [1 Layout](#1-english-en_us-layout) · [2 Utility keys](#2-utility-keys) ·
[3 Arrangement and metrics](#3-arrangement-and-metrics) · [4 Visual style](#4-visual-style) ·
[5 Motion and feel](#5-motion-and-feel) · [6 Gesture recognition](#6-gesture-recognition) ·
[7 Accessory row and text replacement](#7-accessory-row-completions-text-replacement) ·
[8 Pipeline and extensibility](#8-pipeline-and-extensibility) · [9 Surprises](#9-surprises-and-traps-for-the-replica)

---

## 1. English (en_US) layout

### 1.1 How the layout is assembled

The English descriptor passes only the nine tap letters and seventeen swipe letters to the factory
(`K/Definition/Language/LanguageDefinitions.swift:53-83`). Everything else on the letter keys comes
from the shared table `CommonKeys.defaultSlotBindings`
(`K/Definition/Language/CommonKeys.swift:263-537`). The factory merges them per slot
(`K/Definition/Language/GridKeyboardFactory.swift:88-168`) with these rules:

- A language swipe letter replaces the shared binding on that gesture and gets an automatic
  return-swipe action that commits its uppercase form, provided uppercasing changes it
  (`GridKeyboardFactory.swift:103-117`).
- The tap binding commits the centre character and has no return action
  (`GridKeyboardFactory.swift:121-124`).
- Every letter key has `swipeMode: .eightWay`, `slideType: .none`, `style: .primary`
  (`GridKeyboardFactory.swift:163-166`).

The definition that results for English has eight modes: `main`, `shifted`, `capsLock`, `numeric`,
`emoji`, `emojiMore`, `control`, `alt` (`GridKeyboardFactory.swift:194-274`). There is **no
`symbols` mode**. The constant `ModeNames.symbols` exists
(`K/Definition/Language/KeyboardDefinition.swift:93`) but no factory builds a mode under that name;
"symbols" in this codebase is the *slot id of the 123 key* (`K/Definition/Layout/UtilitySlot.swift:16`).
Punctuation lives on the letter keys' swipes in every letter mode and again in the numeric mode.

### 1.2 Gesture semantics that the tables below rely on

- **Return swipe.** If the binding has a `returnAction`, a return swipe performs it; otherwise the
  return swipe falls back to the plain swipe action
  (`K/Runtime/Pipeline/ReturnSwipeResolver.swift:19-37`, chain order in
  `K/Runtime/Pipeline/CompiledMode.swift:165-172`).
- **Ghost keys.** A gesture the active mode leaves unbound (or binds behind a `swipeMode` that
  disallows it) falls through to the same key id in the **numeric** mode
  (`K/Runtime/Pipeline/GhostKeyResolver.swift:20-55`, fallback chosen in `CompiledMode.swift:373-383`).
  In English `main` this makes two undrawn swipes live: top-left ← types `≤` and top-right → types
  `≥` (numeric extras, `K/Definition/Language/NumericLayouts.swift:128-141`). It is also how a long
  press finds a key's digit (`GhostKeyResolver.swift:48-52`).
- **Circle.** Circles do not go through the resolver chain. In order: the key's own binding for
  that direction, else the uppercase of the tap letter, else the opposite direction's binding
  (`CompiledMode.swift:232-257`). On English letter keys both directions therefore type the capital
  letter. An Expert setting can change each direction to the key's digit or to "capitalize the word
  before the cursor"; the default is uppercase (`K/Settings/GestureBehaviours.swift:80-104`,
  `CompiledMode.swift:318-330`). A circle is always treated as handled and never falls back to a
  tap (`K/Runtime/Pipeline/KeyboardViewModel+Pipeline.swift:437-444`).
- **Long press.** Off by default (`GestureBehaviours.swift:34`). When set to *Digits*, a 0.7 s hold
  types the key's numeric-mode digit (space bar: `0`); when set to *Capitals*, it types the
  shifted mode's tap (`K/Runtime/Pipeline/CapitalsLongPressResolver.swift:33-50`,
  `CompiledMode.swift:302-308`). With the setting off no timer is armed at all
  (`K/Runtime/Input/TouchEngine.swift:286-289`).
- **Compose.** `compose(trigger)` looks at the character before the cursor. If a rule exists, that
  character is deleted and the composed character is committed; otherwise the trigger itself is
  typed. The grave key is the one exception: its trigger is `ˋ` (U+02CB) but it types `` ` ``
  (U+0060) when nothing composes (`K/Runtime/Pipeline/ComposeMiddleware.swift:54-83`). The rule
  tables are in `K/Definition/Compose/ComposeRuleSet+Global.swift` and `+Marks.swift`.
- **Cycle accents** (`🅒`). Replaces the previous character with the next entry of its accent
  cycle, or does nothing when the character has none (`ComposeMiddleware.swift:84-96`,
  `K/Runtime/Compose/ComposeEngine.swift:52-60`).

### 1.3 `main` mode, letter keys

JSON conventions: a gesture maps to `null` (unbound) or an object. `label` is what the hint draws.
`out` is the action; when omitted the key commits `label` as text. `ret` is the return-swipe
action; when omitted a return swipe does the same as the swipe. A string value is always committed
text; an object is an action (`{"compose": trigger}`, `{"act": name}`, `{"mode": name}`).
`circle` is what either circle direction commits. `ghost` lists the undrawn fall-throughs.
An empty `label` means nothing is drawn for that gesture.

```json
{
  "topLeft": {
    "tap": {"label": "a"},
    "swipeUpLeft":    {"label": "🅒", "out": {"act": "cycleAccents"}, "ret": {"act": "cycleAccents"}},
    "swipeUp":        null,
    "swipeUpRight":   {"label": "˘", "out": {"compose": "˘"}, "ret": "‚"},
    "swipeLeft":      null,
    "swipeRight":     {"label": "-", "ret": "÷"},
    "swipeDownLeft":  {"label": "$", "out": {"compose": "$"}, "ret": "¥"},
    "swipeDown":      {"label": "…", "ret": "•"},
    "swipeDownRight": {"label": "v", "ret": "V"},
    "circle": "A",
    "ghost": {"swipeLeft": "≤", "longPress": "1"}
  },
  "topCenter": {
    "tap": {"label": "n"},
    "swipeUpLeft":    {"label": "`", "out": {"compose": "ˋ"}, "ret": "‘"},
    "swipeUp":        {"label": "^", "out": {"compose": "^"}, "ret": {"compose": "ˇ"}},
    "swipeUpRight":   {"label": "´", "out": {"compose": "´"}, "ret": "’"},
    "swipeLeft":      {"label": "+", "ret": "×"},
    "swipeRight":     {"label": "!", "ret": "¡"},
    "swipeDownLeft":  {"label": "/", "ret": "–"},
    "swipeDown":      {"label": "l", "ret": "L"},
    "swipeDownRight": {"label": "\\", "ret": "—"},
    "circle": "N",
    "ghost": {"longPress": "2"}
  },
  "topRight": {
    "tap": {"label": "i"},
    "swipeUpLeft":    null,
    "swipeUp":        {"label": "↑", "out": {"act": "lineUp"}},
    "swipeUpRight":   {"label": "", "out": "\n", "ret": "\n"},
    "swipeLeft":      {"label": "?", "ret": "¿"},
    "swipeRight":     null,
    "swipeDownLeft":  {"label": "x", "ret": "X"},
    "swipeDown":      {"label": "=", "ret": "±"},
    "swipeDownRight": {"label": "€", "ret": "£"},
    "circle": "I",
    "ghost": {"swipeRight": "≥", "longPress": "3"}
  },
  "midLeft": {
    "tap": {"label": "h"},
    "swipeUpLeft":    {"label": "{", "ret": "}"},
    "swipeUp":        null,
    "swipeUpRight":   {"label": "%", "ret": "‰"},
    "swipeLeft":      {"label": "(", "ret": ")"},
    "swipeRight":     {"label": "k", "ret": "K"},
    "swipeDownLeft":  {"label": "[", "ret": "]"},
    "swipeDown":      {"label": "˛", "out": {"compose": "˛"}, "ret": {"compose": "¯"}},
    "swipeDownRight": {"label": "_", "ret": "¬"},
    "circle": "H",
    "ghost": {"longPress": "4"}
  },
  "center": {
    "tap": {"label": "o"},
    "swipeUpLeft":    {"label": "q", "ret": "Q"},
    "swipeUp":        {"label": "u", "ret": "U"},
    "swipeUpRight":   {"label": "p", "ret": "P"},
    "swipeLeft":      {"label": "c", "ret": "C"},
    "swipeRight":     {"label": "b", "ret": "B"},
    "swipeDownLeft":  {"label": "g", "ret": "G"},
    "swipeDown":      {"label": "d", "ret": "D"},
    "swipeDownRight": {"label": "j", "ret": "J"},
    "circle": "O",
    "ghost": {"longPress": "5"}
  },
  "midRight": {
    "tap": {"label": "r"},
    "swipeUpLeft":    {"label": "|", "ret": "¶"},
    "swipeUp":        {"label": "⇧", "out": {"mode": "shifted"}, "ret": {"act": "capitalizeWord"}},
    "swipeUpRight":   {"label": "}", "ret": "{"},
    "swipeLeft":      {"label": "m", "ret": "M"},
    "swipeRight":     {"label": ")", "ret": "("},
    "swipeDownLeft":  {"label": "@", "ret": "ª"},
    "swipeDown":      {"label": "", "out": {"mode": "main"}, "ret": {"act": "cycleWordCaseDown"}},
    "swipeDownRight": {"label": "]", "ret": "["},
    "circle": "R",
    "ghost": {"longPress": "6"}
  },
  "bottomLeft": {
    "tap": {"label": "t"},
    "swipeUpLeft":    {"label": "~", "out": {"compose": "~"}, "ret": "˜"},
    "swipeUp":        {"label": "¨", "out": {"compose": "¨"}, "ret": {"compose": "˝"}},
    "swipeUpRight":   {"label": "y", "ret": "Y"},
    "swipeLeft":      {"label": "<", "ret": "‹"},
    "swipeRight":     {"label": "*", "ret": "†"},
    "swipeDownLeft":  {"label": "ˇ", "out": {"compose": "ˇ"}, "ret": "«"},
    "swipeDown":      {"label": "¸", "out": {"compose": "¸"}, "ret": "»"},
    "swipeDownRight": {"label": "⇥", "out": "\t", "ret": "\t"},
    "circle": "T",
    "ghost": {"longPress": "7"}
  },
  "bottomCenter": {
    "tap": {"label": "e"},
    "swipeUpLeft":    {"label": "\"", "ret": "“"},
    "swipeUp":        {"label": "w", "ret": "W"},
    "swipeUpRight":   {"label": "'", "ret": "”"},
    "swipeLeft":      null,
    "swipeRight":     {"label": "z", "ret": "Z"},
    "swipeDownLeft":  {"label": ",", "ret": ","},
    "swipeDown":      {"label": ".", "ret": "…"},
    "swipeDownRight": {"label": ":", "ret": "„"},
    "circle": "E",
    "ghost": {"longPress": "8"}
  },
  "bottomRight": {
    "tap": {"label": "s"},
    "swipeUpLeft":    {"label": "f", "ret": "F"},
    "swipeUp":        {"label": "&", "ret": "§"},
    "swipeUpRight":   {"label": "°", "out": {"compose": "°"}, "ret": "º"},
    "swipeLeft":      {"label": "#", "ret": "£"},
    "swipeRight":     {"label": ">", "ret": "›"},
    "swipeDownLeft":  {"label": ";", "ret": ";"},
    "swipeDown":      {"label": "↓", "out": {"act": "lineDown"}},
    "swipeDownRight": {"label": "", "out": " ", "ret": " "},
    "circle": "S",
    "ghost": {"longPress": "9"}
  }
}
```

Sources per slot: letters `LanguageDefinitions.swift:62-81`; top-left `CommonKeys.swift:266-292`;
top-centre `296-325`; top-right `329-357`; mid-left `361-388`; centre has no shared bindings
(`390`); mid-right `394-438`; bottom-left `442-475`; bottom-centre `479-502`; bottom-right
`506-536`. The long-press digits assume the default phone numpad order
(`NumericLayouts.swift:40-57`, default in `K/Settings/KeyboardSettings.swift:502-505`).

Notes on individual bindings:

- `🅒` is U+1F152 (`CommonKeys.swift:268`). It is not an emoji by the code's own test
  (`K/Definition/Model/EmojiText.swift:26-34`), so it draws as an ordinary text hint.
- The mid-right ↓ binding exists in `main` only as an unlabelled carrier for its return swipe: its
  plain swipe switches to the mode that is already active (`GridKeyboardFactory.swift:239-250`).
  `cycleWordCaseDown` above stands for `cycleWordCase(ascending: false)`, which steps the word before
  the cursor UPPER → Title → lower (`K/Definition/Model/KeyAction.swift:110-113`).
- `capitalizeWord` stands for `capitalizeWord(uppercased: true)` (`CommonKeys.swift:406-410`).
- `lineUp` and `lineDown` have no return action (`CommonKeys.swift:353-356`, `532-535`).
- Top-right ↗ (newline) and bottom-right ↘ (space) have empty labels and draw no hint
  (`CommonKeys.swift:330-333`, `519-522`).

### 1.4 `shifted` and `capsLock`

Both are generated from the finished `main` mode (`GridKeyboardFactory.swift:211-237`):

- Every binding whose resolved category is `letter` and whose action is `commitText` has its label
  and text uppercased; return actions are kept as they are, so return swipes on letters still type
  capitals (`K/Definition/Language/KeyboardMode+Shifted.swift:52-68`). Punctuation is unchanged.
- `shifted` has `autoTransitions: [.letter: main]`, so one letter returns the keyboard to `main`.
  Its mid-right ↑ keeps the label `⇧` but switches to `capsLock`
  (`GridKeyboardFactory.swift:221-226`).
- `capsLock` has no auto-transition. Its mid-right ↑ is labelled `⇪` and switches to the mode it is
  already in (`GridKeyboardFactory.swift:232-237`).
- In both, mid-right ↓ shows `⇩` and switches to `main` (`CommonKeys.swift:425-429`).

Auto-capitalization engages `shifted` from `main` at the start of text and after `.`, `!`, `?`
followed by whitespace, if the user setting is on
(`KeyboardViewModel+Pipeline.swift:352-380`, `K/Definition/Model/AutoCapitalization.swift:60-81`).
The setting defaults to off in the snapshot (`K/Runtime/Gesture/GestureTuning.swift:88`).

### 1.5 `numeric` mode

Built by `NumericLayouts.buildMode` (`NumericLayouts.swift:214-285`): each slot starts from the
same shared punctuation, drops every `switchMode` binding (mid-right ⇧ and ⇩), adds `≤`/`≥`, adds a
circle binding, and sets the tap to a digit with category `digit`. Language letters are absent, so
their slots are empty. The mode never auto-transitions (`NumericLayouts.swift:283`).

```json
{
  "topLeft": {
    "tap": {"label": "1"},
    "swipeUpLeft":    {"label": "🅒", "out": {"act": "cycleAccents"}, "ret": {"act": "cycleAccents"}},
    "swipeUpRight":   {"label": "˘", "out": {"compose": "˘"}, "ret": "‚"},
    "swipeLeft":      {"label": "≤"},
    "swipeRight":     {"label": "-", "ret": "÷"},
    "swipeDownLeft":  {"label": "$", "out": {"compose": "$"}, "ret": "¥"},
    "swipeDown":      {"label": "…", "ret": "•"},
    "circle": "¹"
  },
  "topCenter": {
    "tap": {"label": "2"},
    "swipeUpLeft":    {"label": "`", "out": {"compose": "ˋ"}, "ret": "‘"},
    "swipeUp":        {"label": "^", "out": {"compose": "^"}, "ret": {"compose": "ˇ"}},
    "swipeUpRight":   {"label": "´", "out": {"compose": "´"}, "ret": "’"},
    "swipeLeft":      {"label": "+", "ret": "×"},
    "swipeRight":     {"label": "!", "ret": "¡"},
    "swipeDownLeft":  {"label": "/", "ret": "–"},
    "swipeDownRight": {"label": "\\", "ret": "—"},
    "circle": "²"
  },
  "topRight": {
    "tap": {"label": "3"},
    "swipeUp":        {"label": "↑", "out": {"act": "lineUp"}},
    "swipeUpRight":   {"label": "", "out": "\n", "ret": "\n"},
    "swipeLeft":      {"label": "?", "ret": "¿"},
    "swipeRight":     {"label": "≥"},
    "swipeDown":      {"label": "=", "ret": "±"},
    "swipeDownRight": {"label": "€", "ret": "£"},
    "circle": "³"
  },
  "midLeft": {
    "tap": {"label": "4"},
    "swipeUpLeft":    {"label": "{", "ret": "}"},
    "swipeUpRight":   {"label": "%", "ret": "‰"},
    "swipeLeft":      {"label": "(", "ret": ")"},
    "swipeDownLeft":  {"label": "[", "ret": "]"},
    "swipeDown":      {"label": "˛", "out": {"compose": "˛"}, "ret": {"compose": "¯"}},
    "swipeDownRight": {"label": "_", "ret": "¬"},
    "circle": "¼"
  },
  "center": {
    "tap": {"label": "5"},
    "circle": "a"
  },
  "midRight": {
    "tap": {"label": "6"},
    "swipeUpLeft":    {"label": "|", "ret": "¶"},
    "swipeUpRight":   {"label": "}", "ret": "{"},
    "swipeRight":     {"label": ")", "ret": "("},
    "swipeDownLeft":  {"label": "@", "ret": "ª"},
    "swipeDownRight": {"label": "]", "ret": "["},
    "circle": "ⁿ"
  },
  "bottomLeft": {
    "tap": {"label": "7"},
    "swipeUpLeft":    {"label": "~", "out": {"compose": "~"}, "ret": "˜"},
    "swipeUp":        {"label": "¨", "out": {"compose": "¨"}, "ret": {"compose": "˝"}},
    "swipeLeft":      {"label": "<", "ret": "‹"},
    "swipeRight":     {"label": "*", "ret": "†"},
    "swipeDownLeft":  {"label": "ˇ", "out": {"compose": "ˇ"}, "ret": "«"},
    "swipeDown":      {"label": "¸", "out": {"compose": "¸"}, "ret": "»"},
    "swipeDownRight": {"label": "⇥", "out": "\t", "ret": "\t"},
    "circle": "∫"
  },
  "bottomCenter": {
    "tap": {"label": "8"},
    "swipeUpLeft":    {"label": "\"", "ret": "“"},
    "swipeUpRight":   {"label": "'", "ret": "”"},
    "swipeDownLeft":  {"label": ",", "ret": ","},
    "swipeDown":      {"label": ".", "ret": "…"},
    "swipeDownRight": {"label": ":", "ret": "„"},
    "circle": "∏"
  },
  "bottomRight": {
    "tap": {"label": "9"},
    "swipeUp":        {"label": "&", "ret": "§"},
    "swipeUpRight":   {"label": "°", "out": {"compose": "°"}, "ret": "º"},
    "swipeLeft":      {"label": "#", "ret": "£"},
    "swipeRight":     {"label": ">", "ret": "›"},
    "swipeDownLeft":  {"label": ";", "ret": ";"},
    "swipeDown":      {"label": "↓", "out": {"act": "lineDown"}},
    "swipeDownRight": {"label": "", "out": " ", "ret": " "},
    "circle": "∑"
  },
  "zero": {
    "tap": {"label": "0"}
  }
}
```

Same conventions as §1.3; a gesture that is not listed is unbound. The punctuation bindings are
the very same objects as in `main`. `≤` and `≥` have no return action. The circle
symbols are the classic table remapped so they follow the digit rather than the slot
(`NumericLayouts.swift:147-210`); the centre key's circle is a deliberate lowercase `a`
(`NumericLayouts.swift:164-171`). The `zero` key has `swipeMode: .none` and only a tap
(`NumericLayouts.swift:93-111`). A "classic" 7-8-9 ordering exists as a user setting and swaps the
top and bottom digit rows (`NumericLayouts.swift:60-75`).

### 1.6 Other modes, for completeness

- `control` and `alt` are one-shot terminal modes entered from the 123 key (§2). Letters commit
  control codes (Ctrl) or `ESC` + character (Alt), every unbound swipe becomes inert, and the mode
  returns to `main` after one key (`K/Definition/Language/KeyboardMode+Terminal.swift:43-67`,
  `101-134`). The 123 key shows `⌃` or `⌥` and leaves the mode (`KeyboardMode+Terminal.swift:34-39`,
  `118-123`).
- `emoji` and `emojiMore` are two pages of nine emoji families with a "recent" key in the bottom
  row (`K/Definition/Language/EmojiLayouts.swift:10-37`). They are out of scope for the replica.

---

## 2. Utility keys

All five are defined in `CommonKeys.swift`. A utility key's `style` is `.utility`
(`K/Definition/Model/KeyDefinition+Factories.swift:27-30`); the space bar's is `.spacebar`.

| Key (slot id) | Centre glyph | Tap | Other gestures | Source |
| --- | --- | --- | --- | --- |
| `globe` | none (empty label) | inert (`.none`) | ← next system input method · ↓ dismiss keyboard · → next enabled language · ↑ previous enabled language. `swipeMode: .fourWayCross`, so diagonals do nothing. | `CommonKeys.swift:15-56` |
| `symbols` | `123` | switch to `numeric` | ↑ copy · ↗ cut · ↓ paste · ↘ emoji mode · ↙ mirror keyboard (move utility column to the other side) · ↖ Ctrl mode · ← Alt mode · circle (either way) cut all. → is unbound. | `CommonKeys.swift:118-133`, `162-185` |
| `delete` | `⌫` | delete backward | Slide key (`slideType: .delete`): see below. | `CommonKeys.swift:58-62` |
| `return` | `↵` | newline | ↖ line start (return swipe: document start) · ↘ line end (return swipe: document end) · ← delete word backward · → delete word forward. | `CommonKeys.swift:71-103` |
| `space` | none (blank key) | space | Slide key (`slideType: .moveCursor`): see below. Long press types `0` when long-press digits are on. | `CommonKeys.swift:191-224` |

The same bindings in the JSON conventions of §1.3 (`ret` is given only where a return swipe
differs from the swipe):

```json
{
  "globe": {
    "swipeMode": "fourWayCross",
    "tap":        {"label": "", "out": {"act": "none"}},
    "swipeLeft":  {"label": "", "icon": "globe", "out": {"act": "advanceToNextInputMode"}},
    "swipeDown":  {"label": "", "icon": "keyboard.chevron.compact.down", "out": {"act": "dismissKeyboard"}},
    "swipeRight": {"label": "<language code, if more than one language>", "out": {"act": "switchToNextLanguage"}},
    "swipeUp":    {"label": "", "out": {"act": "switchToPreviousLanguage"}}
  },
  "symbols": {
    "swipeMode": "eightWay",
    "tap":            {"label": "123", "out": {"mode": "numeric"}},
    "swipeUp":        {"label": "", "icon": "doc.on.doc", "out": {"act": "copy"}},
    "swipeUpRight":   {"label": "", "icon": "scissors", "out": {"act": "cut"}},
    "swipeDown":      {"label": "", "icon": "doc.on.clipboard", "out": {"act": "paste"}},
    "swipeDownRight": {"label": "😀", "out": {"mode": "emoji"}},
    "swipeDownLeft":  {"label": "", "out": {"act": "toggleUtilityColumnSide"}},
    "swipeUpLeft":    {"label": "", "out": {"mode": "control"}},
    "swipeLeft":      {"label": "", "out": {"mode": "alt"}},
    "circle":         {"act": "cutAll"}
  },
  "delete": {
    "slideType": "delete",
    "tap": {"label": "⌫", "icon": "delete.backward", "out": {"act": "deleteBackward"}}
  },
  "return": {
    "swipeMode": "eightWay",
    "tap":            {"label": "↵", "icon": "return", "out": {"act": "newline"}},
    "swipeUpLeft":    {"label": "", "out": {"act": "lineStart"}, "ret": {"act": "documentStart"}},
    "swipeDownRight": {"label": "", "out": {"act": "lineEnd"}, "ret": {"act": "documentEnd"}},
    "swipeLeft":      {"label": "", "out": {"act": "deleteWordBackward"}},
    "swipeRight":     {"label": "", "out": {"act": "deleteWordForward"}}
  },
  "space": {
    "slideType": "moveCursor",
    "blank": true,
    "tap":       {"label": "␣", "out": {"act": "space"}},
    "swipeDown": {"label": "", "out": {"act": "acceptCompletion"}},
    "longPress": {"label": "0", "out": "0"}
  }
}
```

In the numeric mode the `symbols` key is relabelled `abc`, switches back to `main`, and keeps only
the clipboard gestures (`NumericLayouts.swift:83-90`). "Cut all" is gated by an opt-in setting
(`K/Settings/KeyboardSettings.swift:70-73`).

**Hints drawn on utility keys.** Only bindings with a non-empty label or an action in the icon map
draw anything (`K/Runtime/View/KeyHintCanvas.swift:196-223`). The icon map is: next input method →
`globe`, dismiss → `keyboard.chevron.compact.down`, copy → `doc.on.doc`, paste →
`doc.on.clipboard`, cut → `scissors` (`K/Runtime/View/KeyView.swift:529-544`). So the visible faces
are:

- Globe key: a small globe icon at the left edge, a keyboard-dismiss icon at the bottom edge, and
  at the right edge the two-letter language code (for example `EN`) **only when more than one
  language is enabled** (`KeyHintCanvas.swift:205-206`, `K/KeyboardViewModel.swift:605-618`).
  Nothing in the centre.
- 123 key: `123` in the centre, copy icon top, scissors top-right, paste icon bottom, and a 😀
  emoji hint bottom-right (`CommonKeys.swift:141-144`). Mirror, Ctrl and Alt are unlabelled.
- Delete and return: the SF Symbols `delete.backward` and `return` in the centre
  (`KeyView.swift:272-276`), no hints.
- Space bar: completely blank (`KeyView.swift:428-430`).

### 2.1 Space bar slide

Thresholds (`K/Settings/KeyboardConstants.swift:221-251`): latch at 8 pt horizontal travel, 14 pt
per character step, 56 pt per word step, 30 pt for the up-swipe, 30 pt for the down-swipe, return
ratio 0.3. The state machine is `SlideGestureState` (§6.6).

- **Tap** (finger lifts within 8 pt of touch-down, never latched): space
  (`KeyboardViewModel+Pipeline.swift:615-616`).
- **Horizontal slide, continuous style (default)**: after latching, every 14 pt of travel moves
  the caret one grapheme in that direction. If the smoothed speed reaches 750 pt/s the slide steps
  by words every 56 pt instead, and returns to characters below 375 pt/s; a direction reversal
  resets to characters (`KeyboardViewModel+Pipeline.swift:581-598`, `669-699`;
  `K/Runtime/Gesture/SlideSpeed.swift:37-85`). At most 32 steps per update
  (`KeyboardViewModel+Pipeline.swift:702`).
- **Horizontal slide, discrete style (setting)**: nothing moves during the drag. On release, a
  peak of at least 14 pt moves one character, or one word if the finger came back to within 30 % of
  its peak (`KeyboardViewModel+Pipeline.swift:734-748`).
- **Swipe up** (peak ≥ 30 pt, slide never latched): toggles the extra-symbol hint labels. If the
  finger returned to within 30 % of the peak (a return swipe up), it instead toggles letter and
  standard-symbol labels together (`KeyboardViewModel+Pipeline.swift:617-646`,
  `K/Runtime/Gesture/SlideGestureState.swift:216-227`).
- **Swipe down** (peak ≥ 30 pt, finger still low at release): accepts the first word completion;
  does nothing when there is none (`SlideGestureState.swift:230-233`, `CommonKeys.swift:211-214`).

The space bar does not switch languages. Language switching is on the globe key only.

### 2.2 Delete key slide

Thresholds (`KeyboardConstants.swift:255-266`): latch at 28 pt horizontal travel, then one
character per 14 pt. Sliding left deletes backward, sliding right deletes forward
(`KeyboardViewModel+Pipeline.swift:799-831`). A release within 28 pt of the origin without latching
is a tap and deletes one character (`SlideGestureState.swift:237-238`). There is **no
hold-to-repeat**: holding the delete key still does nothing until the finger slides or lifts.
Word-sized deletion is on the return key's ← and → swipes.

---

## 3. Arrangement and metrics

### 3.1 Arrangements

An arrangement is a column count plus rows of placements; each placement names a key id and a
width and height multiplier (`K/Definition/Layout/GridArrangement.swift:13-21`,
`K/Definition/Layout/KeyPlacement.swift:12-29`). A solver turns it into cells with first-fit,
row-major placement (`K/Definition/Layout/GridLayoutSolver.swift:68-117`).

| Mode | Columns × rows | Rows, left to right | Source |
| --- | --- | --- | --- |
| Letter modes (`main`, `shifted`, `capsLock`, `control`, `alt`) | 4 × 4 | `topLeft topCenter topRight globe` / `midLeft center midRight symbols` / `bottomLeft bottomCenter bottomRight delete` / `space`×3 `return` | `K/Definition/Layout/StandardArrangements.swift:15-28` |
| `numeric` | 4 × 4 | same first three rows / `zero` `space`×2 `return` | `StandardArrangements.swift:61-74` |
| Utility-left variant | 4 × 4 | globe, symbols, delete, return move to the leading edge of their rows; everything else keeps its order | `StandardArrangements.swift:110-126` |

Landscape arrangements (5 × 3, with a two-row return key) are defined
(`StandardArrangements.swift:32-56`, `78-102`) but **never selected at runtime**: the view model
only ever asks for `portrait` or `portraitUtilityLeft`, on purpose, so keys keep their positions
when the device rotates (`K/KeyboardViewModel.swift:447-456`). Two optional layouts, both off by
default, change the column count: a fifth "numpad column" and a split layout for containers at
least 700 pt wide in landscape (`K/Settings/KeyboardLayoutPlan.swift:35-44`, `84-86`).

### 3.2 Constants

| Quantity | Value | Source |
| --- | --- | --- |
| Reference key height (font scaling baseline) | 54 pt | `KeyboardConstants.swift:17` |
| Key corner radius | 8 pt (plain rounded rectangle) | `KeyboardConstants.swift:21`, `K/Runtime/View/Feel/KeyPressSurface.swift:31` |
| Key spacing, horizontal and vertical | 5 pt (setting range 0–12) | `KeyboardConstants.swift:88-98` |
| Keyboard padding left and right | 12 pt each | `KeyboardConstants.swift:100` |
| Keyboard padding top / bottom | 4 pt / 10 pt | `KeyboardConstants.swift:102-104` |
| Completion row height, when shown | 40 pt | `KeyboardConstants.swift:108` |
| Default keyboard width wish | 270 pt on iPhone, 380 pt on iPad (range 90–600) | `K/KeyboardViewModel.swift:70-72`, `KeyboardSettings.swift:467-469` |
| Default key aspect ratio (width / height) | 1.0, square (range 1.0–1.62) | `K/KeyboardViewModel.swift:74`, `KeyboardSettings.swift:461-463` |
| Default horizontal position | 0.5, centred (0 = left, 1 = right) | `K/KeyboardViewModel.swift:75` |
| Utility column side | trailing (right) | `KeyboardSettings.swift:351` |

### 3.3 Formulas

All in `K/Settings/KeyboardLayoutMetrics.swift`:

```
horizontalChrome = 2·12 + spacing·(columns − 1)                      (:221-226)
verticalChrome   = 4 + 10 + spacing·(rows − 1)                       (:229-235)
width            = min(wishWidth, availableWidth)                    (:163)
cellWidth        = (width − horizontalChrome) / columns              (:166)
cellHeight       = cellWidth / aspectRatio                           (:167)
totalHeight      = cellHeight·rows + verticalChrome + accessoryHeight (:67-69)
fontScale        = cellHeight / 54                                   (:60-62)
height cap       = max(screenHeight − 120, 0.70·screenHeight)        (:76, :84, :187-190)
```

If the content is taller than the cap, both cell dimensions are scaled by the same factor
(`:192-205`). `availableWidth` is the container width capped by the screen's shortest side
(`KeyboardLayoutPlan.swift:87-88`, `K/KeyboardViewModel.swift:436-443`). The keyboard is drawn at
`width` and shifted horizontally by `(containerWidth − width) · (position − 0.5)`
(`K/Runtime/View/DataDrivenKeyboardRootView.swift:74-75`, `113-114`). The background fills the full
container width (`DataDrivenKeyboardRootView.swift:82-83`).

**Computed for a 393 pt wide portrait iPhone, default settings:**

| Quantity | Value |
| --- | --- |
| Keyboard block width | 270 pt, centred, leaving 61.5 pt of bare background on each side |
| Cell (key) size | (270 − 39) / 4 = **57.75 × 57.75 pt** |
| Total height | 4·57.75 + 29 = **260 pt** (300 pt with the completion row) |
| Height cap | max(732, 596.4) = 732 pt, so no clamping |
| Grid size inside the padding | 246 × 246 pt |
| Column x origins inside the 270 pt block | 12, 74.75, 137.5, 200.25 (pitch 62.75) |
| Row y origins inside the block | 4, 66.75, 129.5, 192.25 |
| Space bar (3 columns) | 183.25 × 57.75 pt at x = 12 |
| Numeric bottom row | `zero` 57.75 wide at x = 12, space 120.5 wide at x = 74.75, return at x = 200.25 |
| fontScale | 57.75 / 54 = 1.0694 |

### 3.4 Touch frames versus drawn keys

Each key's touch frame grows by half the spacing (2.5 pt) into every interior gap, and by nothing
at the grid's outer edges, so touch frames tile the grid with no dead strips
(`K/Runtime/View/KeyboardGridLayout.swift:65-126`). The drawn key is inset back by the same amount
(`K/Runtime/View/KeyboardGridView.swift:178-192`, `KeyView.swift:313`). The touch surface is an
overlay exactly the size of the grid (`KeyboardGridView.swift:137-147`), so the 12 pt side padding
and the bare background beside the block are not touch-active. Hit testing is
`column = clamp(floor((x + spacing/2) / (cellWidth + spacing)))`, likewise for rows
(`K/Runtime/Input/KeyHitMap.swift:129-148`).

### 3.5 Typography

All key text uses the system font in the **rounded** design (SF Pro Rounded on iOS)
(`KeyView.swift:83-98`). Derived: in CSS use `font-family: ui-rounded, "SF Pro Rounded", …` and a
rounded fallback such as Nunito on Linux; glyph widths will differ slightly from the device.

Size rule for every label: `min(clamp(base · fontScale, minimum, maximum), cellWidth · cellFraction)`
(`KeyView.swift:376-385`).

| Text | Base | Clamp | Cell cap | Weight | At 393 pt | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Centre label, letter keys (`.primary`) | 26 | 20–34 | 0.5 · cellWidth | semibold | **27.81 pt** | `KeyboardConstants.swift:46-50`, `69`; `KeyView.swift:83-93`, `357-370` |
| Centre label, utility keys (`123`, icons) | 22 | 20–34 | 0.5 | semibold | **23.53 pt** | `KeyboardConstants.swift:40` |
| Space bar label | 18 | 20–34 | 0.5 | — | not drawn | `KeyboardConstants.swift:37`, `KeyView.swift:428-430` |
| Hint, symbols | 14 | 10–22 | 0.3 · cellWidth | regular | **14.97 pt** | `KeyboardConstants.swift:54-58`, `74`; `KeyView.swift:95-96` |
| Hint, letters | 14 | 10–22 | 0.3 | medium | 14.97 pt | `KeyView.swift:97` |
| Hint, targeted | 14 | 10–22 | 0.3 | bold | 14.97 pt (× 1.5 scale) | `KeyView.swift:98` |
| Language code on globe | hint × 0.75 | | | semibold | 11.23 pt | `KeyView.swift:105` |
| Globe and dismiss icons | hint × 0.75 | | | medium | 11.23 pt | `KeyView.swift:106` |
| Copy, paste, cut icons | hint × 0.6 | | | regular | 8.98 pt | `KeyView.swift:107` |
| Emoji hint | 0.19 · min(cell side) | | | | 10.97 pt | `KeyView.swift:101`, `124` |
| Emoji centre | 0.28 · min(cell side) | | | | 16.17 pt | `KeyView.swift:102`, `125` |

A multi-character centre label such as `123` has `lineLimit(1)` and shrinks to at most half its
size instead of wrapping (`KeyView.swift:446-447`).

### 3.6 Hint placement inside a key

The eight hints sit at the eight compass positions of the **drawn** key rectangle
(`KeyView.swift:509-518`): ↖ top-left corner, ↑ top centre, ↗ top-right, ← left centre, → right
centre, ↙ bottom-left, ↓ bottom centre, ↘ bottom-right. The layout is pinned left-to-right and is
never mirrored (`KeyView.swift:335`).

Padding from the key edge is applied only on the edges the hint is aligned to
(`KeyView.swift:552-575`), and scales with the hint font:

```
hPad = 2   · hintSize / 10        (computed: 2.99 pt)     KeyView.swift:109-110
vPad = 0.5 · hintSize / 10        (computed: 0.75 pt)     KeyView.swift:111
```

The exact position of a hint's glyph box (its measured text box: advance width × line height, not
its ink) is (`KeyHintCanvas.swift:340-353`):

```
padded.w = glyph.w + pad.left + pad.right        padded.h = glyph.h + pad.top + pad.bottom
x = (key.w − padded.w) · ax + pad.left           y = (key.h − padded.h) · ay + pad.top
```

with `(ax, ay)` ∈ {0, 0.5, 1}² for the alignment, then snapped to the nearest device pixel
(`KeyHintCanvas.swift:376-378`). In CSS this is an absolutely positioned element with
`left: 2.99px` or `right: 2.99px` or centred, and `top: 0.75px` or `bottom: 0.75px` or centred,
with `line-height: normal`.

**Fitting.** A hint or centre label is scaled down only when its ink would overflow, never below
0.7, and anything at or above 0.98 is treated as 1 (`K/Runtime/View/HintFit.swift:47`, `131-133`).
A hint may occupy a third of the key less padding and half a 2.4 pt gap; it shrinks about the edge
it hangs from (`HintFit.swift:53`, `66-90`). The centre label gets half the key on each side less
whatever the hint on that side reaches plus the gap (`HintFit.swift:109-128`,
`KeyView.swift:466-497`). The sizes were chosen so that Latin letters need no scaling
(`HintFit.swift:16-22`); at 57.75 pt the side limit is 19.25 − 1.2 − 2.99 = 15.06 pt of reach and
the middle-column limit is 16.85 pt of ink width, so only unusually wide glyphs (`…`, `⇥`, `🅒`)
can be affected. Ink is measured with Core Text using the non-rounded system font
(`HintFit.swift:189-203`), which a browser cannot reproduce exactly; treat the scale as 1 for the
English replica unless a glyph visibly collides.

Hints are drawn in one `Canvas` per key in the fixed order ↑ ↓ ← → ↖ ↗ ↙ ↘
(`KeyView.swift:526`, `613`).

---

## 4. Visual style

### 4.1 The two keyboard styles

`KeyboardStyle` has `classic` and `liquidGlass` (`KeyboardSettings.swift:534-537`). **Classic is
the default** (`KeyView.swift:18`, `S/App/StyleSettingsView.swift:12`). Despite the name, the
liquid-glass style does not use an iOS 26 glass API: it fills keys with SwiftUI's `.bar` material
and a hairline border (`KeyPressSurface.swift:36-39`). Keys have **no shadow** in either style; the
only shadows in the keyboard are on the guide card (§5.5).

### 4.2 Colours

The code names system colours. The repository's macOS shim records their iOS values
(`S/Platform/SystemColors+macOS.swift:35-48`); the rest are derived platform values.

| Element | Code | Light | Dark | Source |
| --- | --- | --- | --- | --- |
| Keyboard background, classic | `systemBackground` | `#FFFFFF` | `#000000` | `DataDrivenKeyboardRootView.swift:137-138` |
| Keyboard background, glass | `systemBackground` at 2 % opacity over the host's backdrop | ≈ clear | ≈ clear | `DataDrivenKeyboardRootView.swift:139-148` |
| Key face, classic, idle | `secondarySystemBackground` | `#F2F2F7` | `#1C1C1E` | `KeyView.swift:394`, `402-404` |
| Key face, classic, pressed | `systemGray4` | `#D1D1D6` | `#3A3A3C` | `KeyView.swift:395` |
| Key face, glass, idle | `.bar` material + border `primary` 10 %, 0.5 pt | derived: translucent blur | derived | `KeyPressSurface.swift:37-39` |
| Key face, glass, pressed | adds `primary` at 16 % | | | `KeyPressSurface.swift:38` |
| Centre label | `Color.primary` | derived `#000000` | derived `#FFFFFF` | `KeyView.swift:604-606` |
| Centre label during a circle | `Color.accentColor` | derived `#007AFF` | derived `#0A84FF` | `KeyView.swift:605` |
| Letter hint | `primary` at 65 % | derived `rgba(0,0,0,.65)` | derived `rgba(255,255,255,.65)` | `KeyHintCanvas.swift:230` |
| Symbol hint | `secondary` at 55 % | derived `rgba(60,60,67,.33)` | derived `rgba(235,235,245,.33)` | `KeyHintCanvas.swift:230` |
| Globe and dismiss icons, language code | `primary` at 50 % | derived `rgba(0,0,0,.5)` | derived `rgba(255,255,255,.5)` | `KeyHintCanvas.swift:231-232` |
| Copy, paste, cut icons | `secondary` at 45 % | derived `rgba(60,60,67,.27)` | derived `rgba(235,235,245,.27)` | `KeyHintCanvas.swift:231` |
| Emoji hint | own colours, untinted | | | `KeyHintCanvas.swift:233`, `299-304` |
| Targeted hint | `Color.accentColor`, bold | derived `#007AFF` | derived `#0A84FF` | `KeyHintCanvas.swift:294-295` |

**Utility keys are not tinted differently.** `backgroundColor(for:active:)` ignores the key style
and returns the same idle and pressed fills for letter keys, utility keys and the space bar
(`KeyView.swift:402-404`). The accent colour asset is empty
(`Bundling/Assets.xcassets/AccentColor.colorset/Contents.json`), so the accent is the system
default blue. `Color.secondary` is derived as the iOS secondary label colour (60, 60, 67 at 60 % in
light, 235, 235, 245 at 60 % in dark); multiplying by the code's opacity gives the values above.

**Whether a hint counts as a letter** decides both its colour and weight and is
`label.first?.isLetter` (`KeyHintCanvas.swift:216-218`). In JavaScript the closest test is
`/^\p{Alphabetic}/u`. Expect one quirk: the caron hint `ˇ` (U+02C7, a modifier *letter*) should
style as a letter while the other accent hints style as symbols. This follows from Unicode
properties and was not verified on a device.

Suggested CSS approximations for the materials (derived): `.bar` ≈
`backdrop-filter: blur(20px) saturate(180%)` over `rgba(249,249,249,.78)` in light and
`rgba(30,30,30,.72)` in dark; `.regularMaterial` (guide card) is similar and slightly more opaque.

### 4.3 Label opacity states

| State | Effect | Source |
| --- | --- | --- |
| Finger heading for a swipe | Centre label drops to 35 % opacity; the targeted hint scales to 1.5 about its own corner or edge, turns accent and bold; all other hints drop to 30 % | `KeyView.swift:452`, `702-716`; `KeyHintCanvas.swift:35`, `270`, `359-367` |
| Finger drawing a circle | Centre label turns accent (full opacity); all hints drop to 30 % | `KeyView.swift:591-606`, `KeyHintCanvas.swift:43-53` |
| Language code on globe | Never emphasized | `KeyHintCanvas.swift:283` |

The bold switch happens at the half-way point of the emphasis animation
(`KeyHintCanvas.swift:294`); colour and scale interpolate.

### 4.4 Label visibility settings

Hints are classified as letter, standard symbol (`. , ! ? - + / = ( ) @ * " ' : ; & ° € %`), extra
symbol (everything else that is not a letter or digit), number, or functional
(`K/Definition/Model/LabelCategory.swift:40-79`). Three settings hide the first three classes
independently; digits, modifiers (`⇧ ⇩ 123`), the `🅒` key and emoji always show
(`LabelCategory.swift:84-95`). All labels show by default (`KeyView.swift:19-21`). Space-bar
up-swipes toggle them (§2.1).

### 4.5 The press light and the shaders

Three Metal shaders exist, each with a pure-gradient fallback that looks nearly the same
(`K/Runtime/View/Shaders/FeelShaderSource.swift:20-88`). They are compiled at runtime and tiered by
GPU; older devices and Reduce Transparency use the fallbacks (`docs/feel.md:355-389`).

**`feelKeySheen`** draws white light over a pressed key (`FeelShaderSource.swift:41-51`). With
`uv` the unit position in the key, `d` the offset from the touch point in units of the key's
shorter side, and `s` the strength:

```
alpha = clamp(s · (0.72·exp(−3.4·|d|²) + 0.30·(1 − smoothstep(0, 0.16, uv.y)) + 0.18·(1 − uv.y)), 0, 1)
```

That is a soft bloom at the touch point, a bright rim along the top 16 % of the key, and a faint
top-to-bottom lift. Strength `s` is 0.24 for classic light, 0.13 classic dark, 0.62 glass light,
0.34 glass dark (`KeyPressSurface.swift:74-81`). The fallback, which is the simplest thing to
reproduce in CSS, is two stacked backgrounds clipped to the key's rounded rectangle
(`KeyPressSurface.swift:95-107`):

```css
background:
  linear-gradient(to bottom, rgba(255,255,255, calc(S*0.32)) 0%, rgba(255,255,255, calc(S*0.06)) 22%),
  radial-gradient(ellipse 75% 75% at var(--tx) var(--ty), rgba(255,255,255, calc(S*0.72)), transparent);
```

The light exists only while the key is pressed and "Key Animations" is on
(`KeyPressSurface.swift:41-44`).

**`feelRipple`** is a one-wavelet refraction on pressed *glass* keys only: it displaces pixels by
at most 1.1 pt along a ring that travels 1.1 × the key's longer side in 0.46 s, fading
quadratically (`FeelShaderSource.swift:59-68`, `KeyPressSurface.swift:192-216`,
`K/Runtime/View/Feel/FeelMotion.swift:65-68`). Classic keys have none. It is too subtle to be
worth replicating; if wanted, an SVG `feDisplacementMap` could approximate it.

**`feelTrailInk`** shades the gesture trail (§5.6).

---

## 5. Motion and feel

### 5.1 The springs

Every spring is a `(duration, bounce)` pair passed to SwiftUI's `.spring(duration:bounce:)`
(`K/Runtime/View/KeyboardSpring.swift:20-51`). Derived conversion for a mass of 1:
`stiffness = (2π / duration)²`, `damping = 4π(1 − bounce) / duration`, damping ratio
`ζ = 1 − bounce`.

| Name | duration, bounce | stiffness | damping | ζ | ≈ settle time | Used for | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `track` | 0.18, 0.15 | 1218 | 59.3 | 0.85 | 135 ms | hint emphasis; lit guide cell moving between cells | `KeyboardSpring.swift:32` |
| `settle` | 0.24, 0.15 | 685 | 44.5 | 0.85 | 180 ms | key release | `KeyboardSpring.swift:34` |
| `land` | 0.20, 0.25 | 987 | 47.1 | 0.75 | 170 ms | lit guide cell appearing | `KeyboardSpring.swift:36` |
| `unfold` | 0.28, 0.15 | 504 | 38.1 | 0.85 | 210 ms | guide map reveal | `KeyboardSpring.swift:38` |
| `detent` | 0.14, 0.30 | 2014 | 62.8 | 0.70 | 130 ms | slide ratchet step | `KeyboardSpring.swift:40` |
| `follow` | 0.14, 0.08 | 2014 | 82.6 | 0.92 | 100 ms | geometry during continuous resize | `KeyboardSpring.swift:46` |
| `glide(d)` | d, 0 | (2π/d)² | 4π/d | 1 | ≈ 0.93·d | geometry change; d = 0.34 s or 0.20 s | `KeyboardSpring.swift:49-51` |

A JavaScript spring that matches, stepped per animation frame:

```js
function stepSpring(s, target, dt, k, c) {        // s = {x, v}
  const a = -k * (s.x - target) - c * s.v;        // mass 1
  s.v += a * dt; s.x += s.v * dt;                 // semi-implicit Euler; clamp dt to 1/60
}
```

CSS approximations (derived): the springs with ζ = 0.85 overshoot by under 1 %, so
`cubic-bezier(0.2, 0.9, 0.3, 1)` over the settle time is indistinguishable. `land` overshoots about
3 % and `detent` about 5 %; use `cubic-bezier(0.3, 1.3, 0.5, 1)` or a `linear()` spring easing if
the overshoot matters. Springs keep their velocity when retargeted, which CSS transitions do not;
use the JavaScript integrator for the lit guide cell and hint emphasis if rapid direction changes
should look right.

### 5.2 Key press and release

| Moment | What happens | Timing | Source |
| --- | --- | --- | --- |
| Touch-down | Fill switches to the pressed colour, the press light appears, and the whole key (cap, label, hints) scales to **0.965** anchored at the touch point | Instant, no animation | `KeyPressSurface.swift:46-53`, `155-156`; `FeelMotion.swift:53` |
| Release | Fill, light and scale return | `settle` spring | `FeelMotion.swift:47`, `KeyPressSurface.swift:52`, `156` |
| Release under Reduce Motion | Fill fades only, nothing moves | ease-out 0.14 s | `FeelMotion.swift:49` |
| "Key Animations" off | Fill changes instantly both ways; no light, no scale | — | `KeyPressSurface.swift:41`, `133`, `155` |

The touch point is the finger's landing position in unit coordinates of the key's touch frame
(`TouchEngine.swift:262-268`). A key stays pressed while any finger that landed on it is still down
(`TouchEngine.swift:616-627`).

### 5.3 Flick target lighting

While a finger moves, the engine reclassifies the path on every touch event and publishes the
gesture a release would produce; taps publish nothing (`TouchEngine.swift:435-468`). The key then
shows the states in §4.3, animated with `track` (`FeelMotion.swift:56`, `KeyView.swift:601`,
`637`). Updates are change-driven, so a steady flick redraws nothing after its direction settles.

### 5.4 Mode-switch transitions

- Labels cross-fade with **ease-in-out 0.16 s** and SwiftUI's interpolating content transition, so
  `a` appears to morph into `A` (`FeelMotion.swift:62`, `KeyPressSurface.swift:148-153`). In CSS a
  0.16 s opacity cross-fade is the faithful approximation.
- The hint layer of a key whose hint set changed fades in over the old one under the same curve
  (`KeyView.swift:627-640`).
- Keys keep their identity by slot id across modes, so nothing is rebuilt
  (`KeyboardGridView.swift:98-103`).
- If the key geometry is unchanged, nothing moves. Switching between a letter mode and `numeric`
  changes the space bar from three columns to two and adds the `zero` key; that reshape uses
  `glide(0.20)` (`K/Runtime/View/LayoutMotion.swift:48`, `111-112`). A change of metrics (rotation,
  a toggle) uses `glide(0.34)` (`LayoutMotion.swift:43`, `113-115`); changes less than 0.12 s apart
  use `follow` (`LayoutMotion.swift:51`, `109-110`); the first layout and Reduce Motion do not
  animate (`LayoutMotion.swift:101-105`).
- `shifted` returns to `main` after a letter through the pipeline's last middleware (§8.2).

### 5.5 The touch guide overlay

`TouchGuideOverlay` draws a small 3 × 3 card for the finger most recently put down on a **flick**
key; slide keys (space, delete) get none (`TouchEngine.swift:270-272`). It is always on, except in
sensitive fields such as passwords (`KeyboardGridView.swift:130-134`).

**Geometry** (`K/Runtime/View/TouchGuideOverlay.swift:242-268`):

- Cell size = `max(0.44 · min(touchFrame.w, touchFrame.h), 18)`; the card is 3 cells square.
  Computed: an interior key's touch frame is 62.75 pt, giving a 27.6 pt cell and an 82.8 pt card;
  an edge key's 60.25 pt frame gives 26.5 pt and 79.5 pt.
- Placement: centred above the key with a 4 pt gap when at least half a card fits above; otherwise
  beside the key on the side with more room. The centre is always clamped inside the grid bounds,
  so for second-row keys the card overlaps the key's top edge.
- Cell positions follow the gesture: ↖ is the top-left cell, tap the centre, and so on
  (`TouchGuideOverlay.swift:91-95`, `FeelMotion.swift:157-169`).

**What it shows and when:**

| Element | Appearance | When | Animation | Source |
| --- | --- | --- | --- | --- |
| Lit target cell | Accent-filled rounded square (radius 0.3 · cell), shadow black 20 % radius 4 y 1; white bold rounded text at 0.62 · cell; shows exactly what a release would type, including shift state and return-swipe output | As soon as a non-tap gesture is recognised | Appears with `land`, scaling from 0.55 anchored on the side facing the key, plus fade; moves between cells with `track`; its text swaps instantly | `TouchGuideOverlay.swift:129-142`, `170-196` |
| Return-swipe or circle marker | White 85 % ring, 2 pt, inset 3 pt inside the lit cell | Candidate is a return swipe or a circle | — | `TouchGuideOverlay.swift:176-182` |
| Full map | Card of `.regularMaterial`, radius 0.35 · cell, shadow black 18 % radius 6 y 2; each cell shows the key's own label for that gesture at 0.45 · cell, medium weight, `primary` 75 % | After the finger has rested **0.35 s** | `unfold` with that delay: opacity 0 → 1, scale 0.92 → 1 | `TouchGuideOverlay.swift:88`, `104-122`, `144-149`, `201-215`; `FeelMotion.swift:81-87` |
| Tap cell lit | The centre cell lights once the map is revealed and no direction is known | Resting finger | — | `TouchGuideOverlay.swift:154-166` |
| Removal | Whole card fades out | Finger lifts or a long press fires | ease-out 0.10 s | `TouchGuideOverlay.swift:47-51`, `FeelMotion.swift:85` |

During a circle the lit cell is the centre one (`TouchGuideOverlay.swift:154-159`).

### 5.6 The gesture trail overlay

Opt-in and **off by default** (`GestureTuning.swift:60`, `KeyboardSettings.swift:74-78`). When on,
it draws a dot under a press and a tapered ribbon behind a moving finger, in the grid's coordinate
space (`K/Runtime/View/GestureTrailOverlay.swift:28-43`).

| Property | Value | Source |
| --- | --- | --- |
| Head width | `clamp(0.16 · rowHeight, 5, 14)`; computed **9.24 pt** | `KeyboardConstants.swift:158-162`, `GestureTrailOverlay.swift:48-54` |
| Press dot diameter | 1.4 × head width; computed 12.9 pt | `KeyboardConstants.swift:170` |
| Sample spacing, capacity | a new sample every ≥ 4 pt, at most 64 | `KeyboardConstants.swift:137`, `142` |
| Visible window while down | samples younger than 0.55 s (the newest always stays) | `KeyboardConstants.swift:148`, `K/Runtime/Gesture/GestureTrail.swift:110-121` |
| Fade after release | linear to 0 over 0.35 s, shape frozen | `KeyboardConstants.swift:154`, `GestureTrail.swift:125-133` |
| Smoothing | uniform Catmull-Rom, 6 subdivisions per segment | `KeyboardConstants.swift:191`, `K/Runtime/View/GestureTrailGeometry.swift:65-86` |
| Taper | half-width = `(w/2) · progress^0.55`, progress running 0 → 1 over the first `3.5 · w` of path from the tail | `KeyboardConstants.swift:178`, `186`; `GestureTrailGeometry.swift:94-101`, `125` |
| Width by speed | multiplier `1 − 0.4 · smoothstep((v − 220) / 1280)`, v in pt/s smoothed with weight 0.55 on the previous value | `K/Runtime/View/Feel/GestureTrailInk.swift:29-45`, `57-76` |
| Colour | `Color.primary` (black in light, white in dark) at **38 %** opacity | `GestureTrailOverlay.swift:79-91`, `KeyboardConstants.swift:195` |
| Tail fade | opacity falls from full at the finger to 30 % of that at a distance of 9 head widths (computed 83 pt) | `GestureTrailInk.swift:37`, `188-209` |
| Head glow | a white-ish core under the finger with strength 0.45 in dark mode, 0 in light mode | `GestureTrailOverlay.swift:85`, `FeelShaderSource.swift:77-85` |
| Armed long swipe | accent colour at 62 % with glow 0.7 | `GestureTrailOverlay.swift:78-90`, `KeyboardConstants.swift:200` |

The shader's opacity profile is `opacity · (0.3 + 0.7 · t^0.8)` with `t = 1 − distance / span`;
the fallback is a radial gradient from full to 30 % (`FeelShaderSource.swift:77-85`,
`GestureTrailInk.swift:203-208`). The ribbon is one filled closed outline with a round cap at the
finger, so alpha does not accumulate where the path crosses itself
(`GestureTrailGeometry.swift:16-20`, `112-160`). On a canvas: build the outline polygon, fill it
with a radial gradient centred on the finger, and set `globalAlpha` to the fade.

### 5.7 Commit pop ("lift-off")

When a swipe, return swipe, circle, long press or long swipe commits visible text, a copy of the
lit guide bubble rises and fades from the cell the card lit (`K/KeyboardViewModel+Feel.swift:232-242`,
`K/Runtime/View/Feel/FeelOverlay.swift:76-81`). **Taps get no pop**, nor do spaces, deletions or
mode switches (`KeyboardViewModel+Feel.swift:188-201`, `233`).

- Look: accent rounded square the size of a guide cell (radius 0.3 · cell), white bold rounded
  text at 0.62 · cell (`FeelOverlay.swift:96-106`).
- Motion: over **0.30 s** with `cubic-bezier(0.2, 0.7, 0.3, 1)`, it rises `0.42 · cell` (clamped
  so it stays inside the keyboard), scales 1 → 1.16 and fades 1 → 0 (`FeelMotion.swift:92-96`,
  `FeelOverlay.swift:86-89`, `107-109`). Under Reduce Motion it only fades, ease-out 0.18 s
  (`FeelMotion.swift:98`).
- At most four pops are alive at once (`K/Runtime/Feel/KeyboardFeel.swift:320`).

### 5.8 Long-press ring and slide ratchet

- **Ring** (only when long press is enabled and the hold would type something): a 2 pt accent
  outline at 18 % around the key with a 2.25 pt accent stroke that fills clockwise from the top
  centre. It fades in (ease-out 0.12 s) after 0.22 s of rest, fills linearly until the 0.7 s fire,
  then flashes out with +8 % scale over 0.22 s; cancel fades in 0.10 s
  (`FeelOverlay.swift:157-191`, `FeelMotion.swift:103-107`, `K/Settings/HapticPatterns.swift:432`).
- **Ratchet** (during a space or delete slide): a strip of 15 capsules (2 × 6 pt, `primary` 30 %)
  at 7 pt pitch near the key's bottom edge, masked to fade at both ends, with a 3 × 10 pt centre
  mark tinted accent (cursor) or red (delete). Each caret step or deleted character jumps the strip
  one notch back and springs it forward with the `detent` spring; the strip fades in and out over
  0.18 s (`FeelOverlay.swift:250-299`, `FeelMotion.swift:114-115`).

### 5.9 Not visual, listed so nothing is missed

Haptics and key sounds are derived from the key's position and role and are documented in
`docs/feel.md:77-275`. They do not affect the replica's look. While a finger is active the app
requests 80–120 Hz rendering (`K/Runtime/Feel/FrameRateBoost.swift:25`, `68`).

---

## 6. Gesture recognition

### 6.1 Touch routing

One transparent native view covers the grid and forwards every finger, including coalesced
samples, to `TouchEngine` (`K/Runtime/Input/TouchSurface.swift:91-119`). On touch-down the engine
looks up the key under the point and **binds the finger to that key for its whole life**; fingers
are never re-targeted to another key (`TouchEngine.swift:244-257`). All later positions are
recorded as translations relative to the touch-down point (`TouchEngine.swift:799-802`). The key's
`slideType` chooses the state machine: `none` → flick classifier, otherwise the slide machine
(`TouchEngine.swift:795`). Up to ten fingers are tracked (`TouchEngine.swift:126`).

There is no keyboard-wide gesture recognizer of any kind.

### 6.2 Flick classification pipeline

The same function runs speculatively on every move and finally on release
(`K/Runtime/Gesture/KeyGestureRecognizer.swift:290-328`). Input: the translations, with `(0, 0)`
first (the ring buffer holds 120 samples and re-anchors the origin if it was evicted,
`KeyGestureRecognizer.swift:215-218`, `KeyboardConstants.swift:121`).

1. **Jitter filter.** Keep a point only if it is ≥ 3 pt from the last kept point; always keep the
   final point if it is ≥ 0.1 pt from the last kept one
   (`K/Runtime/Gesture/GesturePreprocessor.swift:112`, `277-303`).
2. **Outlier filter.** Drops samples more than 50 pt from the accepted path that no raw neighbour
   supports and that do not continue the established motion
   (`GesturePreprocessor.swift:113`, `358-406`). This guards against digitizer glitches and can be
   omitted in a browser.
3. **Spike filter.** Drops a lone sample that adds ≥ 20 pt of detour and whose neighbours run
   straight on within 40° (`GesturePreprocessor.swift:594-669`). Also omissible.
4. **Aspect normalisation.** Divide every x by the key's aspect ratio (width / height), so a wide
   key does not bias directions (`GesturePreprocessor.swift:694-699`). A key spanning several
   columns uses `cellAspect · columnSpan / rowSpan` (`KeyHitMap.swift:93`). On the default square
   1 × 1 keys this is a no-op.
5. **Savitzky–Golay smoothing.** If at least 5 points remain, convolve with
   `[−3, 12, 17, 12, −3] / 35`, clamping indices at the ends
   (`GesturePreprocessor.swift:713-751`, `762`).
6. **Features and verdict** (§6.3).

### 6.3 Features and decision rules

Let `P` be the processed path, `o = P[0]`, `n` its length.

| Feature | Definition | Source |
| --- | --- | --- |
| `pathLength` | sum of segment lengths | `K/Runtime/Gesture/GestureFeatureCalculations.swift:26-34` |
| `chord` | distance from first to last point | `GestureFeatureCalculations.swift:37-40` |
| `maxDisp`, `maxIndex` | largest distance from `o`, and the index where it occurs | `GestureFeatureCalculations.swift:87-114` |
| `progress` | `maxIndex / (n − 1)`; a sample-index fraction, not arc length | `GestureFeatureCalculations.swift:106` |
| `returnRatio` | `chord / pathLength` (1 for an empty path) | `GesturePreprocessor.swift:1148` |
| `keyScale` | `clamp(keyHeight / 58, 0.7, 1.6)`; computed 0.9957 | `GesturePreprocessor.swift:1005-1012` |
| `swipeLength` | `20 · keyScale`; computed **19.9 pt** | `GesturePreprocessor.swift:815`, `1015` |
| `peakTime` | seconds from touch-down to the sample that set the running maximum of raw displacement | `KeyGestureRecognizer.swift:99-104` |
| `samplesOut` | number of points at least `maxDisp / 2` from `o` | `GesturePreprocessor.swift:1099-1104` |

Decision order (`KeyGestureRecognizer.swift:380-404`):

1. **Circle**, if all of the following hold (`GesturePreprocessor.swift:1059-1079`, thresholds
   `:821-838`):
   - `pathLength > 2 · swipeLength` (computed 39.8 pt);
   - circularity `> 0.3`, where circularity = `1 − stddev(r) / mean(r)` for radii `r` measured from
     the centroid (`GestureFeatureCalculations.swift:293-318`);
   - `|angularSpan| > 255°`, the signed sum of angles swept around the centroid
     (`GestureFeatureCalculations.swift:120-132`);
   - turn consistency `> 0.8`: the share of turns sharper than 0.15 rad that go the majority way;
     paths of more than 16 points are first resampled at `max(pathLength / 24, 4 pt)` spacing
     (`GestureFeatureCalculations.swift:341-435`);
   - oriented compactness `> 0.45`: extent perpendicular to the farthest-point direction divided by
     extent along it (`GestureFeatureCalculations.swift:439-468`);
   - Kåsa circle-fit RMS residual `≤ 0.3` of the fitted radius, unless the path winds 540° or more
     (`GestureFeatureCalculations.swift:253-287`, `GesturePreprocessor.swift:1065`, `1108-1110`).

   Direction: `angularSpan > 0` is clockwise on screen (`GesturePreprocessor.swift:1081-1083`).
2. **Tap**, if `maxDisp < swipeLength` and the stroke is not a fast swipe
   (`GesturePreprocessor.swift:1044-1046`). A **fast swipe** rescues short quick flicks: it needs a
   known `peakTime > 0`, `maxDisp ≥ 12 · keyScale`, `maxDisp ≥ 100 · keyScale · peakTime` (an
   average outward speed of at least about 100 pt/s), and either `chord ≥ 0.6 · maxDisp` or a
   sustained out-and-back with `samplesOut ≥ 3` (`GesturePreprocessor.swift:816-817`, `1024-1041`).
3. Otherwise a **swipe**. It is a **return swipe** when `returnRatio < 0.5` and
   `0.2 ≤ progress ≤ 0.8` (`GesturePreprocessor.swift:822-824`, `1049-1057`).

**Direction.** The angle uses the `atan2(y, x)` convention with y pointing down, so 0° is right
and 90° is down. Each direction owns a 45° sector centred on it; a sector includes its lower
boundary (`KeyGestureRecognizer.swift:421-442`):

| Sector (degrees) | Gesture | Sector | Gesture |
| --- | --- | --- | --- |
| 337.5–360 and 0–22.5 | right | 157.5–202.5 | left |
| 22.5–67.5 | down-right | 202.5–247.5 | up-left |
| 67.5–112.5 | down | 247.5–292.5 | up |
| 112.5–157.5 | down-left | 292.5–337.5 | up-right |

The angle starts as the direction of the farthest point. When the path has at least three points
and the farthest point's index is at least 2, it is replaced by a **robust direction**: the average
of three unit vectors, namely the farthest point, the principal axis of the middle of the outward
leg (15 %–90 % of its arc length), and the chord from where the finger left a 5 pt settle radius to
the point 85 % of the way out (`KeyGestureRecognizer.swift:346-353`,
`GestureFeatureCalculations.swift:138-236`). This matters for hooked and return strokes.

**A key's `swipeMode` does not change classification.** The classifier always reports one of
eight directions; the resolver then drops a direction the key does not allow
(`K/Runtime/Pipeline/PrimaryResolver.swift:17-25`).

### 6.4 Scaling with key size

Only the tap/swipe boundary scales: `swipeLength`, the fast-swipe length and the fast-swipe speed
are multiplied by `keyScale` (reference key height 58 pt). The jitter threshold (3 pt), the slide
thresholds (8, 14, 28, 30, 56 pt), the long-press tolerance (10 pt) and the outlier distances are
absolute points. Long swipes are measured in key sizes. The Expert screen can change the
classification thresholds; the values here are the defaults used when expert mode is off
(`GesturePreprocessor.swift:146-147`, `875-884`).

### 6.5 Reference classifier in JavaScript

This is a transcription of the rules above with the two glitch filters left out. `raw` is the
list of `{x, y}` translations from the touch-down point, starting with `{x: 0, y: 0}` and ending
with the release position.

```js
const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const SECTORS = ['swipeRight','swipeDownRight','swipeDown','swipeDownLeft',
                 'swipeLeft','swipeUpLeft','swipeUp','swipeUpRight'];
const sector = a => SECTORS[Math.floor((((a * 180 / Math.PI) % 360 + 360) % 360 + 22.5) / 45) % 8];

function classify(raw, keyW, keyH, peakTime = 0) {
  // 1. jitter filter, 3. aspect normalisation, 4. Savitzky-Golay (window 5)
  let p = [raw[0]], last = raw[0];
  for (const q of raw.slice(1)) if (D(q, last) >= 3) { p.push(q); last = q; }
  if (D(raw.at(-1), last) >= 0.1) p.push(raw.at(-1));
  const aspect = keyW / keyH;
  p = p.map(q => ({ x: q.x / aspect, y: q.y }));
  if (p.length >= 5) {
    const k = [-3, 12, 17, 12, -3].map(v => v / 35), e = p.length - 1, src = p;
    p = src.map((_, i) => k.reduce((s, w, j) => {
      const q = src[Math.max(0, Math.min(e, i - 2 + j))];
      return { x: s.x + w * q.x, y: s.y + w * q.y };
    }, { x: 0, y: 0 }));
  }
  const n = p.length;
  if (n < 2) return { gesture: 'tap', isReturn: false };

  // features
  const o = p[0];
  let len = 0; for (let i = 1; i < n; i++) len += D(p[i - 1], p[i]);
  let maxD = 0, far = 0; p.forEach((q, i) => { const d = D(o, q); if (d > maxD) { maxD = d; far = i; } });
  const chord = D(o, p[n - 1]), progress = far / (n - 1), ratio = len > 0 ? chord / len : 1;
  const scale = Math.min(Math.max(keyH / 58, 0.7), 1.6), swipeLen = 20 * scale;
  const outBack = ratio < 0.5 && progress >= 0.2 && progress <= 0.8;
  const samplesOut = p.filter(q => D(q, o) >= maxD / 2).length;
  const fast = peakTime > 0 && (chord >= 0.6 * maxD || (samplesOut >= 3 && outBack))
            && maxD >= 12 * scale && maxD >= 100 * scale * peakTime;
  const farAngle = Math.atan2(p[far].y - o.y, p[far].x - o.x);

  // circle
  const c = { x: p.reduce((s, q) => s + q.x, 0) / n, y: p.reduce((s, q) => s + q.y, 0) / n };
  const turn = (a, b) => Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
  let span = 0;
  for (let i = 1; i < n; i++)
    span += turn({ x: p[i-1].x - c.x, y: p[i-1].y - c.y }, { x: p[i].x - c.x, y: p[i].y - c.y });
  const radii = p.map(q => D(q, c)), mean = radii.reduce((s, r) => s + r, 0) / n;
  const circularity = mean > 0
    ? Math.max(0, Math.min(1, 1 - Math.sqrt(radii.reduce((s, r) => s + (r - mean) ** 2, 0) / n) / mean)) : 0;
  if (len > 2 * swipeLen && circularity > 0.3 && Math.abs(span) > 255 * Math.PI / 180
      && turnConsistency(p, len) > 0.8 && compactness(p, farAngle) > 0.45
      && (Math.abs(span) >= 3 * Math.PI || circleFitResidual(p, c) <= 0.3))
    return { gesture: span > 0 ? 'circularClockwise' : 'circularCounterclockwise', isReturn: false };

  if (maxD < swipeLen && !fast) return { gesture: 'tap', isReturn: false };
  let angle = farAngle;                             // refined from the body of the stroke
  if (n >= 3 && far >= 2) { const r = robustDirection(p, far); if (r !== null) angle = r; }
  return { gesture: sector(angle), isReturn: outBack };
}

function turnConsistency(p, len) {
  let pts = p;
  if (p.length > 16) {                              // resample dense paths at equal arc steps
    const step = Math.max(len / 24, 4); pts = [p[0]]; let walked = 0;
    for (let i = 1; i < p.length; i++) {
      let from = p[i - 1], rem = D(from, p[i]);
      while (walked + rem >= step) {
        const t = (step - walked) / rem;
        from = { x: from.x + (p[i].x - from.x) * t, y: from.y + (p[i].y - from.y) * t };
        pts.push(from); rem = D(from, p[i]); walked = 0;
      }
      walked += rem;
    }
  }
  let cw = 0, ccw = 0, prev = null, corner = null;
  for (const q of pts) {
    if (corner && corner.x === q.x && corner.y === q.y) continue;
    if (prev && corner) {
      const a = { x: corner.x - prev.x, y: corner.y - prev.y }, b = { x: q.x - corner.x, y: q.y - corner.y };
      const t = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
      if (t > 0.15) ccw++; else if (t < -0.15) cw++;
    }
    prev = corner; corner = q;
  }
  return cw + ccw ? Math.max(cw, ccw) / (cw + ccw) : 1;
}

function compactness(p, angle) {                    // width / length along the farthest-point axis
  const ca = Math.cos(angle), sa = Math.sin(angle); let a0 = 0, a1 = 0, b0 = 0, b1 = 0;
  for (const q of p) {
    const dx = q.x - p[0].x, dy = q.y - p[0].y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    a0 = Math.min(a0, u); a1 = Math.max(a1, u); b0 = Math.min(b0, v); b1 = Math.max(b1, v);
  }
  return a1 > a0 ? (b1 - b0) / (a1 - a0) : 0;
}

function circleFitResidual(p, c) {                  // Kasa fit, RMS radial error / radius
  const n = p.length; if (n < 4) return 1;
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, bx = 0, by = 0, b1 = 0;
  for (const q of p) { const x = q.x - c.x, y = q.y - c.y, z = -(x * x + y * y);
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; bx += x * z; by += y * z; b1 += z; }
  const det = sxx * (syy * n - sy * sy) - sxy * (sxy * n - sy * sx) + sx * (sxy * sy - syy * sx);
  if (Math.abs(det) <= 1e-9) return 1;
  const d = (bx * (syy * n - sy * sy) - sxy * (by * n - sy * b1) + sx * (by * sy - syy * b1)) / det;
  const e = (sxx * (by * n - sy * b1) - bx * (sxy * n - sy * sx) + sx * (sxy * b1 - by * sx)) / det;
  const f = (sxx * (syy * b1 - sy * by) - sxy * (sxy * b1 - by * sx) + bx * (sxy * sy - syy * sx)) / det;
  const ox = -d / 2, oy = -e / 2, r2 = ox * ox + oy * oy - f; if (r2 <= 1e-9) return 1;
  const r = Math.sqrt(r2);
  return Math.sqrt(p.reduce((s, q) => s + (Math.hypot(q.x - c.x - ox, q.y - c.y - oy) - r) ** 2, 0) / n) / r;
}

function robustDirection(p, f) {                    // mean of three aim estimates over p[0..f]
  const o = p[0], far = p[f]; let total = 0;
  for (let i = 1; i <= f; i++) total += D(p[i - 1], p[i]);
  if (!(total > 0)) return null;
  const a1 = Math.atan2(far.y - o.y, far.x - o.x); let sx = Math.cos(a1), sy = Math.sin(a1);
  let w = 0, mx = 0, my = 0, mxx = 0, myy = 0, mxy = 0, walked = 0;
  for (let i = 1; i <= f; i++) {                    // principal axis of the 15%-90% cruise
    const a = p[i - 1], b = p[i], L = D(a, b);
    const t0 = L > 0 ? Math.min(Math.max((0.15 * total - walked) / L, 0), 1) : 0;
    const t1 = L > 0 ? Math.min(Math.max((0.90 * total - walked) / L, 0), 1) : 0;
    walked += L; if (t1 <= t0) continue;
    const P = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
    const Q = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 }, l = (t1 - t0) * L;
    w += l; mx += l * (P.x + Q.x) / 2; my += l * (P.y + Q.y) / 2;
    mxx += l * (P.x * P.x + P.x * Q.x + Q.x * Q.x) / 3; myy += l * (P.y * P.y + P.y * Q.y + Q.y * Q.y) / 3;
    mxy += l * (2 * P.x * P.y + P.x * Q.y + Q.x * P.y + 2 * Q.x * Q.y) / 6;
  }
  if (w > 0) {
    const cx = mx / w, cy = my / w;
    let th = 0.5 * Math.atan2(2 * (mxy / w - cx * cy), (mxx / w - cx * cx) - (myy / w - cy * cy));
    if (Math.cos(th) * (far.x - o.x) + Math.sin(th) * (far.y - o.y) < 0) th += Math.PI;
    sx += Math.cos(th); sy += Math.sin(th);
  }
  let s = 0; while (s < f - 1 && D(o, p[s + 1]) < 5) s++;          // leave the 5 pt settle
  let along = 0, end = far;
  for (let i = 1; i <= f; i++) {                    // point 85% of the way out
    const L = D(p[i - 1], p[i]);
    if (along + L >= 0.85 * total && L > 0) { const t = (0.85 * total - along) / L;
      end = { x: p[i-1].x + (p[i].x - p[i-1].x) * t, y: p[i-1].y + (p[i].y - p[i-1].y) * t }; break; }
    along += L;
  }
  const a3 = Math.atan2(end.y - p[s].y, end.x - p[s].x);
  return Math.atan2(sy + Math.sin(a3), sx + Math.cos(a3));
}
```

This transcription was run in Node on synthetic strokes (a tap, straight swipes, a slow and a
fast short flick, an out-and-back stroke, both circle directions, and the sector boundaries) and
gave the expected verdicts. It has not been compared sample for sample with the Swift classifier,
which cannot run on Linux; the repository's own fixtures for that are the gesture tests under
`Tests/WurstfingerKitTests` and the gesture lab in `Sources/WurstfingerScenarioKit/GestureLab.swift`.

To reproduce the live preview, call `classify` on the path so far for every pointer move, and
treat any non-tap result as the candidate. Track `peakTime` as the elapsed time at which the raw
`hypot(x, y)` last set a new maximum.

### 6.6 Slide keys (space and delete)

State per finger: `isSliding`, `lastX`, `upPeak` (most negative y), `downPeak` (largest y),
`maxDisplacement` (`SlideGestureState.swift:92-104`). Configuration: space bar latches at 8 pt and
has 30 pt up and down thresholds; delete latches at 28 pt and has no vertical gestures
(`SlideGestureState.swift:60-70`).

On each move with translation `(x, y)` (`SlideGestureState.swift:132-202`):

```
upCommitted   = hasUp   && −upPeak   ≥ 30
downCommitted = hasDown && downPeak ≥ 30
dominant      = (hasUp || hasDown) && |x| ≥ 30 && |x| > 2·|y|
if !isSliding && |x| ≥ latch && |x| > |y| && (!(upCommitted || downCommitted) || dominant):
    isSliding = true;  lastX = sign(x)·latch;  emit began
if isSliding && x ≠ lastX:
    emit changed(deltaX = x − lastX);  lastX = x
```

On release (`SlideGestureState.swift:206-239`), in this order: if sliding, `ended`; else if the
key has an up threshold and `−upPeak ≥ 30`, `swipeUp(isReturn: y ≥ 0.3 · upPeak)`; else if it has a
down threshold, `downPeak ≥ 30` and `y > 0.3 · downPeak`, `swipeDown`; else if
`hypot(x, y) < latch`, `tap`; otherwise nothing at all.

### 6.7 Long press, long swipe and rollover

- **Long press** (off by default): armed at touch-down for `0.7 s`
  (`KeyboardConstants.swift:210`, `TouchEngine.swift:286-289`). It is cancelled as soon as the
  finger's running maximum displacement exceeds 10 pt, so moving out and back still cancels it
  (`KeyboardConstants.swift:216`, `TouchEngine.swift:330-333`, `855-862`). When it fires and a
  binding resolves, the finger is consumed and its release types nothing; when no binding resolves,
  the touch keeps its normal behaviour on release (`TouchEngine.swift:488-517`, `361-366`).
- **Long swipe** (Expert, off by default): a plain swipe (not a return swipe) whose end point is at
  least 1.5 key sizes from the start, each axis measured in units of the key's own extent, fires a
  global per-direction action instead of the key's binding. Defaults: ↑ Escape, ↓ newline, ← delete
  word, → Tab, ↖ Shift-Tab, ↗ line start, ↘ line end, ↙ dismiss
  (`K/Runtime/Gesture/LongSwipeConfiguration.swift:87-120`, `180-185`). Computed: 86.6 pt on a
  default key.
- **Rollover order.** With several fingers down, a completed gesture waits for any earlier-pressed
  finger that is still undecided, for at most 0.25 s after that finger's touch-down, so text comes
  out in press order (`TouchEngine.swift:123`, `579-593`, `871-884`).

---

## 7. Accessory row, completions, text replacement

### 7.1 The row

The only row above the keys is the word-completion row. It is **off by default**
(`KeyboardSettings.swift:122-125`, `GestureTuning.swift:110`), and when off it has zero height.
When on, and the language has a dictionary and the field is not sensitive, it reserves 40 pt above
the grid; the keys do not shrink unless the height cap is hit
(`K/KeyboardViewModel+Completions.swift:44-55`, `DataDrivenKeyboardRootView.swift:87-90`,
`KeyboardLayoutMetrics.swift:183-185`).

- Content: up to three completions of the word before the cursor, fetched from the system spell
  checker (`UITextChecker`) plus up to two learned words, once at least two characters are typed
  (`K/Runtime/Completion/WordCompletions.swift:30-35`, `233-246`;
  `K/Runtime/Completion/CompletionSource.swift:81-89`). Lookups run on a timer after the keystroke,
  never inside it (`WordCompletions.swift:15-20`).
- Style: equal-width segments, 17 pt system font (not rounded), with the already-typed prefix in
  `secondary` regular weight and the remainder in `primary` semibold; 6 pt horizontal padding per
  segment; dividers 1 × 22 pt of `primary` at 16 % (22 % on glass); 12 pt side padding matching the
  keys (`K/Runtime/View/KeyboardAccessoryRow.swift:65-131`). Classic has no background; glass puts
  one `.bar` tile with an 8 pt radius behind the whole row (`KeyboardAccessoryRow.swift:103-110`).
- Press state: a rounded highlight (radius 8, inset 3 pt vertically and 2 pt horizontally) of
  `primary` at 10 % light / 16 % dark / 18 % glass, instant on press and easing out over 0.16 s
  (`KeyboardAccessoryRow.swift:145-162`). Candidates change without animation
  (`KeyboardAccessoryRow.swift:90-92`).

### 7.2 Accepting a completion

Tapping a segment, or swiping down on the space bar for the first one, completes the word
(`KeyboardAccessoryRow.swift:31-34`, `KeyboardViewModel+Completions.swift:90-102`). If the
suggestion extends what was typed (ignoring case), only the missing tail is inserted so the user's
own capitalisation is kept, and an all-caps prefix continues in capitals; otherwise the typed
prefix is deleted and the whole word inserted. A space is appended in both cases
(`K/Runtime/Completion/Completion.swift:66-80`, `WordCompletions.swift:317-335`). While that
automatic space is still before the cursor, a typed space is swallowed and a closing punctuation
mark (`. , ; : ! ? … ) ] } %` and CJK/Arabic equivalents) removes it first
(`K/Runtime/Pipeline/CompletionMiddleware.swift:30-63`).

### 7.3 Text replacement

Shortcuts are stored as a JSON array of `{"shortcut", "phrase"}` objects in the shared defaults
under `textReplacements`, with at most 500 entries, shortcuts of 1–32 characters without
whitespace and phrases of 1–1000 characters (`K/Settings/TextReplacement.swift:17-22`, `49-55`,
`104-110`). They are decoded once per settings change into an exact and a case-folded dictionary
(`TextReplacement.swift:74-93`).

`TextReplacementMiddleware` expands a shortcut when a boundary is committed: a space, a newline or
one of a fixed punctuation set. The run of non-whitespace characters before the cursor (also tried
without up to four leading punctuation characters) is looked up; on a match it is deleted, the
phrase is inserted, and the boundary then continues down the pipeline
(`K/Runtime/Pipeline/TextReplacementMiddleware.swift:53-60`, `97-140`). A case-insensitive match
carries the typed capitalisation over: `Gm` → `Good morning`, `GM` → `GOOD MORNING`
(`TextReplacement.swift:133-145`). If the very next action is a delete, the expansion is reverted
to the shortcut plus boundary (`TextReplacementMiddleware.swift:108-116`).

---

## 8. Pipeline and extensibility

### 8.1 From gesture to text

```
TouchSurface ─ raw touches ─▶ TouchEngine
   began:  hit map → key; press state, guide, touchDown haptic        (TouchEngine.swift:244-290)
   moved:  record sample; speculate → candidate + preview label       (:300-335, :435-468)
   ended:  classify → GestureClassification; queue in press order     (:352-408, :579-593)
        │  actions.gesture(key, classification)        or  actions.slide(key, phase)
        ▼
KeyboardViewModel.handleClassification                 (KeyboardViewModel+Pipeline.swift:413-432)
   long swipe?  → global action
   else performGesture(gesture, keyId, isReturn)       (:434-493)
        │  compiled table lookup: (slot, isReturn, gesture) → KeyBinding     (CompiledMode.swift:281-285)
        │  switchMode / language switch / mirror are handled here, outside the pipeline (:454-482)
        ▼
ActionPipeline.process(ActionContext{action, binding, mode})          (ActionPipeline.swift:19-33)
        ▼
TextInputTarget (UITextDocumentProxy in production)
```

**Resolver chain.** The policy is written as resolvers and compiled once per mode into flat
tables: plain gestures use `PrimaryResolver` then `GhostKeyResolver(numeric)`; return swipes put
`ReturnSwipeResolver` in front (`CompiledMode.swift:164-200`). Circles and the Capitals long press
have their own tables (`CompiledMode.swift:202-217`).

**Middlewares, in order** (`KeyboardViewModel+Pipeline.swift:139-323`): haptic confirmation →
completions → compose and accent cycling → sequential composition (Telex, and optionally a
per-definition combiner such as Hangul) → text replacement → advanced text (delete forward, word
case, clipboard, line and document movement, word deletion) → double-space period → text input →
emoji recents → view-controller actions (next input method, dismiss) → auto-capitalization → mode
transitions. A middleware may rewrite the action, forward it, or stop the chain
(`K/Runtime/Pipeline/ActionMiddleware.swift:18-48`).

**`KeyAction` cases** (`K/Definition/Model/KeyAction.swift:11-122`): `commitText`, `compose`,
`cycleAccents`, `switchMode`, `capitalizeWord`, `advanceToNextInputMode`, `dismissKeyboard`,
`switchToNextLanguage`, `switchToPreviousLanguage`, `toggleUtilityColumnSide`, `deleteBackward`,
`deleteForward`, `space`, `newline`, `moveCursor`, `copy`, `paste`, `cut`, `cutAll`, `tab`,
`backTab`, `escape`, `lineStart`, `lineEnd`, `documentStart`, `documentEnd`, `lineUp`, `lineDown`,
`deleteWordBackward`, `deleteWordForward`, `cycleWordCase`, `acceptCompletion`, `none`.
`GestureType` is a closed set of twelve: tap, eight swipes, two circles, long press
(`K/Definition/Model/GestureType.swift:11-35`).

### 8.2 Modes

A `KeyboardMode` is a name, a key pool, arrangements per context, and `autoTransitions` from a key
category to a mode name (`K/Definition/Language/KeyboardMode.swift:13-48`). A `KeyboardDefinition`
holds modes by name plus a default mode (`KeyboardDefinition.swift:11-34`). Modes are **built** in
`GridKeyboardFactory.layout` (§1.1), **compiled** by `CompiledDefinition` into per-mode tables
cached in the registry (`CompiledMode.swift:361-384`,
`KeyboardViewModel+Pipeline.swift:42-47`), and **switched** in two ways:

- A binding with `.switchMode(name)` calls `switchToMode` directly; a switch to the active mode or
  to a mode the definition lacks is ignored (`KeyboardViewModel+Pipeline.swift:454-461`,
  `528-538`).
- `ModeTransitionMiddleware` runs last and applies the active mode's `autoTransitions` for the
  category of what was just typed, which is how `shifted`, `control` and `alt` fall back to `main`
  after one letter (`K/Runtime/Pipeline/ModeTransitionMiddleware.swift:20-48`).

The keyboard resets to the default mode whenever it appears
(`KeyboardViewModel+Pipeline.swift:544-547`). Validation requires every `switchMode` target to
exist, every placed key to be in the pool, every row to sum to the column count, and a portrait
arrangement (`K/Definition/Model/ValidationError.swift:12-19`, `105-135`).

### 8.3 Languages

Languages are `LanguageDescriptor`s (id, title, locale, family, optional globe label, a lazy
builder) listed in `LanguageDefinitions.all`
(`K/Definition/Language/LanguageDescriptor.swift:21-82`,
`LanguageDefinitions+MessagEase.swift:740-750`). The user enables a subset. Switching is the globe
key's → swipe (next) and ↑ swipe (previous): the view model walks the enabled-language ring,
stores the new id and reloads the definition, which also resets the mode
(`K/KeyboardViewModel.swift:575-603`). With one enabled language the swipe does nothing. The globe
key's ← swipe hands over to the next *system* keyboard.

There is **no whole-keyboard swipe**. Every touch belongs to the key it landed on (§6.1). The
nearest thing is the opt-in long swipe, which fires the same global action from any key (§6.7).
The space bar's swipes are caret movement, label toggles and completion acceptance (§2.1), not
language switching.

### 8.4 Custom layouts

A custom layout is an authoring document smaller than a definition: the nine grid keys and what
each gesture types. It is turned into a full definition by the same `GridKeyboardFactory.layout`
call the shipped languages use (`K/Definition/Custom/CustomLayout+Definition.swift:24-61`).

```json
{
  "schemaVersion": 1,
  "id": "custom-1b4e28ba-2fa1-11d2-883f-0016d3cca427",
  "title": "My layout",
  "locale": "en_US",
  "basedOn": "en_US",
  "capitalization": true,
  "sharedSymbols": true,
  "keys": {
    "topLeft": { "tap": "a", "swipeUp": "ä", "swipeRight": { "text": "-", "return": "÷" } },
    "center":  { "tap": "o", "circularClockwise": "0", "swipeDown": "" }
  }
}
```

(`K/Definition/Custom/CustomLayoutCodec.swift:12-31`, wire struct `132-141`.) A gesture value is a
string or `{text, return}`; an empty string unbinds the gesture; omitted gestures inherit the
shared punctuation when `sharedSymbols` is true. Storage is one `<id>.json` file per layout in a
`CustomLayouts` directory of the app-group container, at most 16 layouts of at most 64 KB each
(`K/Definition/Custom/CustomLayoutStore.swift:10-29`, `65`; `CustomLayoutCodec.swift:51`).
Validation (`K/Definition/Custom/CustomLayout+Validation.swift:14-105`): id of 3–64 characters from
`a-z 0-9 . _ -` that is not a shipped id; non-empty title of at most 40 characters; a plausible
locale identifier; only the nine grid slot names; a non-empty tap on every slot; texts of at most 8
characters without control characters; a `return` only on a swipe that has text; and finally the
structural definition validation.

The format **cannot** express a different arrangement, extra modes, utility-key changes or
non-text actions. A steno keyboard cannot be delivered as a custom layout.

### 8.5 Assessment: where a "steno" mode would plug in

The request is a steno mode with its own dictionary, a three-column arrangement with no utility
column, one utility key at the bottom right, and a space bar that is always two columns wide.

**What fits the existing architecture without friction**

- *A mode with its own arrangement.* Arrangements are per mode, and the numeric mode already
  ships a different bottom row. A steno mode is
  `GridArrangement(columns: 3, rows: [[topLeft, topCenter, topRight], [midLeft, center, midRight],
  [bottomLeft, bottomCenter, bottomRight], [space ×2, <utility>]])`. The solver, grid layout, hit
  map, typography, guide card and press visuals are all driven by the solved cells and need no
  change (`GridLayoutSolver.swift:68-117`, `KeyHitMap.swift:68-118`).
- *Mode entry and exit.* Add a `ModeNames` constant and a `.switchMode` binding. The 123 key's →
  swipe is free (`CommonKeys.swift:135-140`), and validation will insist the target mode exists.
- *Dictionary translation as a middleware.* `ActionContext` carries the active mode name
  (`ActionMiddleware.swift:18-31`), so a steno middleware can stay inert outside its mode. Its
  nearest existing models are `TextReplacementMiddleware` (look back at the document context,
  delete, insert, undo on the next delete) and `SequentialCompositionMiddleware`, and it would be
  inserted in `rebuildPipeline` after composition and before text input
  (`KeyboardViewModel+Pipeline.swift:139-323`). Selecting it per definition has a precedent in
  `KeyboardDefinitionSettings.inputMethod` (`KeyboardDefinition.swift:112-162`).
- *Surfacing candidates.* The completion row takes any `CompletionSource`
  (`CompletionSource.swift:25-47`); a steno dictionary could feed it and reuse the row, the accept
  logic and the space-bar down-swipe.

**Where it will push against the current design**

1. *Key size changes with the column count.* The layout plan resolves the width wish against the
   mode's own column count (`KeyboardLayoutPlan.swift:89-99`, `wishColumns: base.columns`). A
   three-column mode at the 270 pt wish therefore gets cells of (270 − 34) / 3 = **78.67 pt**
   instead of 57.75 pt, and the keyboard grows from 260 pt to about 344 pt tall, animating on every
   mode switch. `KeyboardLayoutMetrics.resolve` already supports "keep the key size, change the
   width" through its `wishColumns` parameter (`KeyboardLayoutMetrics.swift:120-159`); stating the
   wish against four columns would give a 207.25 pt wide block with unchanged 57.75 pt keys. This
   is a product decision the prototype should make explicitly, because key size is the user's
   muscle memory.
2. *One key cannot be both a flick key and a slide key.* A key runs either the flick classifier or
   the slide state machine, chosen from `slideType` at touch-down (`TouchEngine.swift:795`). The
   delete key's progressive delete and the space bar's caret slide are slides. A single bottom-right
   utility key that carries delete, return, globe and 123 as flicks cannot also offer slide-delete
   unless the engine learns a hybrid. Likewise the space bar cannot carry eight flick bindings: its
   vertical gestures are hard-wired in `SlideGestureState`.
3. *Gestures are per finger and per key.* The gesture vocabulary is a closed twelve-case enum with
   a pinned table index (`CompiledMode.swift:89-104`), and each finger is classified alone on the
   key it landed on. Steno chords (several keys at once) or strokes that cross keys are not
   expressible as a `GestureType`. The engine does track all fingers and orders their commits
   (`TouchEngine.swift:145-153`, `579-593`), so chord detection has a natural home there, but it is
   new engine behaviour, not configuration. If "steno" here means a sequence of ordinary flicks
   translated by a dictionary, no engine change is needed.
4. *The factory is not reusable as is.* `GridKeyboardFactory.layout` hard-codes
   `StandardArrangements.grid3x3` and merges all five utility keys
   (`GridKeyboardFactory.swift:85`, `173-191`). A steno mode needs either a second factory or a
   hook in this one (`EmojiLayouts.sharedModes` at `GridKeyboardFactory.swift:209` is the existing
   pattern for bolting a mode onto every definition).
5. *Layout transforms assume the standard shape.* "Utility keys on left", the numpad column and
   the split all identify the utility region by the fixed id set `{globe, symbols, delete, return}`
   (`StandardArrangements.swift:110-112`, `GridArrangement.swift:69-72`, `96-109`). A steno
   arrangement must define what those settings mean for it, or opt out.
6. *Hints for utility actions.* Only five actions have hint icons (`KeyView.swift:529-544`); any
   other utility binding with an empty label draws nothing. A combined utility key needs labels or
   new icon mappings to be discoverable.
7. *A new `KeyAction` case is expensive.* It must be handled in the exhaustive switches of
   `inferredCategory`, `TextInputMiddleware.apply`, `previewGlyph` and the feel resolution
   (`K/Definition/Model/KeyCategory.swift:26-48`,
   `K/Runtime/Pipeline/TextInputMiddleware.swift:40-67`,
   `K/KeyboardViewModel+Input.swift:128-172`). Committing ordinary text and translating in a
   middleware avoids that.
8. *Memory.* The extension is written around a tight memory limit (comments throughout, for
   example `KeyboardConstants.swift:139-142`, `271-275`). The existing stores are small: 500
   replacement entries, 1500 learned words, 16 custom layouts. A steno dictionary of tens of
   thousands of entries needs lazy, off-touch-path loading, in the manner of the definition prewarm.

**Mode inside every language, or a language of its own?** Both are possible. As a mode it is
reachable by one gesture and shares the definition's locale and digits. As a separate
`LanguageDescriptor` (for example `en_US_steno` with `variantOf: "en_US"`) it joins the globe ring
and can own its settings, at the cost of a new `LayoutFamily` case
(`K/Definition/Language/LayoutFamily.swift:14-27`) and a language id that becomes a persisted
contract once shipped.

### 8.6 What the glossary constrains

From `docs/GLOSSARY.md` and `glossary.toml`, enforced in CI by `scripts/check_naming.py` and
SwiftLint (`docs/GLOSSARY.md:17-26`):

- A keyboard state is a **mode**, never a "layer", in identifiers and in prose
  (`docs/GLOSSARY.md:44-62`, `glossary.toml:196-203`). The suffix `…Mode` is reserved for keyboard
  state, so it is the right word for a steno mode and the wrong word for anything else about it
  (`docs/GLOSSARY.md:232`).
- **Swipe** means a directional gesture from the key centre; a held drag is a **slide**; the
  out-and-back gesture is always written **return swipe**, because "return" alone also means the
  Return key (`docs/GLOSSARY.md:64-73`, `188-197`). A steno chord or stroke needs its own term
  rather than borrowing one of these, and adding that term to `glossary.toml` is an ordinary pull
  request (`glossary.toml:24-25`).
- A slot name and a key id are the same string. New positions get names in `GridSlot` or
  `UtilitySlot`, and the variable for such a string is `keyId`, never `slotId`
  (`docs/GLOSSARY.md:75-89`). Key ids are also the UI tests' accessibility identifiers, a contract
  name (`docs/GLOSSARY.md:147`).
- Suffixes: `…Definition` for declarative data, `…Descriptor` for a lazy handle, `…Configuration`
  (never `…Config`) for injected parameters, `…Settings` for persisted user values, `…Metrics` for
  computed geometry, `…Style` for appearance only, `…Type` (never `…Kind`) for a closed set of
  behavioural variants, `…Resolver` and `…Middleware` for pipeline participants, `…Factory` and
  `…Registry` for building and caching; no `…Manager`, `…Helper` or `…Utils`
  (`docs/GLOSSARY.md:220-243`, `glossary.toml:205-223`).
- Verbs: `make…` for a pure factory (never `create…`), `build…` for assembling in place,
  `resolve…` for resolver lookups, `process…` for middleware entry points, `handle…` for view-model
  reactions to input (`docs/GLOSSARY.md:245-255`).
- A new classification enum must name its axis, because `KeyCategory` and `LabelCategory` already
  classify the same keys two ways; the 0–9 keys are "digits", not "numbers"
  (`docs/GLOSSARY.md:101-115`, `316`).
- Persisted names are contracts: `SettingsKey` raw values, language ids and `gesture.*` keys may
  only be renamed with the old string pinned; settings flags read as assertions
  (`isStenoEnabled`, not `enableSteno`) (`docs/GLOSSARY.md:125-139`, `261-265`). UI strings are
  string-catalog keys across 22 languages (`docs/GLOSSARY.md:146`).
- Tests are named as the assertion they make, without a `test` prefix
  (`docs/GLOSSARY.md:266-271`).

---

## 9. Surprises and traps for the replica

1. **The keyboard is not full width.** By default it is a 270 pt block centred in a 393 pt
   container, with square 57.75 pt keys and 61.5 pt of empty background on each side (§3.3).
2. **Utility keys look exactly like letter keys.** There is one idle fill and one pressed fill for
   every key (§4.2). The globe key has no centre glyph and the space bar is blank (§2).
3. **No key shadows, and "liquid glass" is a material fill with a hairline border** (§4.1).
4. **Classic is the default style; the trail, long press, long swipe, completion row and
   auto-capitalization are all off by default.** The guide card and key animations are on.
5. **There is no symbols mode.** Punctuation is on the letter keys' swipes; `123` opens digits with
   the same punctuation around them (§1.1, §1.5).
6. **Two swipes type characters that are not drawn**: top-left ← gives `≤` and top-right → gives
   `≥`, through the ghost-key fallback to the numeric mode (§1.2).
7. **Return swipes on letters type capitals**, and a circle on a letter key types its capital too.
   Shift is a swipe up on the `r` key; there is no shift key.
8. **Taps are instant and unanimated on the way in**; only the release springs. Taps never produce
   a lift-off pop (§5.2, §5.7).
9. **Delete does not auto-repeat when held.** Progressive delete is a horizontal slide on the
   delete key; word delete is a swipe on the return key (§2.2).
10. **Landscape arrangements exist in the data but are never used** (§3.1).
11. **Return-swipe detection depends on the sample index of the farthest point**, not on arc
    length (§6.3), so the replica's result will vary slightly with the pointer event rate. Feeding
    coalesced pointer events (`getCoalescedEvents()`) brings it closer to the device.
12. **Font metrics will differ.** The app measures ink with Core Text and draws SF Pro Rounded;
    neither is available on Linux, so hint positions will match to within about a point rather than
    exactly (§3.5, §3.6).
