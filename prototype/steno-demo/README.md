# Steno mode demo

A browser prototype of the steno mode described in [`docs/steno/DESIGN.md`](../../docs/steno/DESIGN.md).
It has no dependencies beyond Node 20.

```bash
node serve.mjs            # http://127.0.0.1:5273/
HOST=0.0.0.0 node serve.mjs   # on every address, to open it from a phone or another machine
```

Drag on the keyboard with a mouse, or use thumbs on a touch screen. The panel beside the phone has
lessons, a lookup tool, the dictionaries, the evaluation and the settings.

## Layout

| Path | What it is |
| --- | --- |
| `src/layout.js` | Keys, directions, the letter and number layouts, which directions are free |
| `src/theory.generated.js` | The English theory, generated |
| `src/engine.js` | The translator: strokes in, text out |
| `src/packs.js` | Dictionaries and their format |
| `src/orthography.js` | Endings and their spelling rules |
| `src/recognizer.js` | Finger path to stroke |
| `src/planner.js`, `src/script.js` | How a word, and a sentence, is written |
| `src/robot.js` | The synthetic finger |
| `src/ui/` | The demo itself |
| `tools/` | Corpus statistics, theory generation, evaluation, robustness |
| `test/` | Translator tests and the held-out round trip |

## Regenerating

The corpora are not committed. `tools/corpus.mjs` names the three it expects under `data/raw/`
(Cornell Movie-Dialogs, DailyDialog and the NUS SMS Corpus) and writes `data/build/`.

```bash
node tools/corpus.mjs     # word and phrase statistics, and the held-out tenth
node tools/theory.mjs     # src/theory.generated.js
node tools/report.mjs     # src/eval.generated.js, from evaluate.mjs and robustness.mjs
npm test
```
