// How a word falls into the pieces a syllable is made of.
//
// Steno writes by structure: what starts the syllable, what its vowel is, and
// what ends it. This keyboard does the same with spelling. A word is a run of
// pieces, each a consonant cluster or a vowel group as it is spelled
// ("th·i·nk", "w·ea·th·er"), and every piece is one tap or flick. The pieces
// a keyboard knows are its chunks; anything else falls back to single letters.

export const isVowelLetter = c => 'aeiou'.includes(c);

/** Whether the letter at index i of a word acts as a vowel: a e i o u, and y when it is not starting a syllable. */
export function vowelAt(word, i) {
  const c = word[i];
  if (isVowelLetter(c)) return true;
  if (c !== 'y') return false;
  return i > 0 && !isVowelLetter(word[i + 1] || '');          // my, system, play: yes. yes, you, beyond: no
}

/**
 * What kind of piece a string of letters can be: 'C' for consonants only, 'V'
 * for a vowel group (which may end in the r, w, y or gh that colours it: er,
 * ow, ay, igh), or null for a mix that is not a piece of a syllable.
 */
export function pieceKind(s) {
  if (/^[bcdfghjklmnpqrstvwxz]+$/.test(s)) return 'C';
  if (/^[aeiou]+(r|w|y|gh)?$/.test(s) || s === 'y') return 'V';
  return null;
}

/**
 * Splits a word into the fewest pieces the given chunks allow, longest piece
 * first on a tie. `chunks` is a Set of strings; single characters are always
 * allowed.
 */
export function segment(word, chunks, longest = 4) {
  const n = word.length;
  const best = new Array(n + 1).fill(Infinity), take = new Array(n + 1).fill(1);
  best[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let l = Math.min(longest, n - i); l >= 1; l--) {
      if (l > 1 && !chunks.has(word.slice(i, i + l))) continue;
      if (1 + best[i + l] < best[i]) { best[i] = 1 + best[i + l]; take[i] = l; }
    }
  }
  const out = [];
  for (let i = 0; i < n; i += take[i]) out.push(word.slice(i, i + take[i]));
  return out;
}

/**
 * Where each piece of a segmented word sits in its syllable: 'onset' (a
 * consonant piece with a vowel after it), 'vowel', or 'coda' (a consonant
 * piece with no vowel straight after it).
 */
export function roles(word, pieces) {
  const out = [];
  let i = 0;
  for (const p of pieces) {
    const end = i + p.length;
    if (vowelAt(word, i) || pieceKind(p) === 'V') out.push('vowel');
    else out.push(end < word.length && vowelAt(word, end) ? 'onset' : 'coda');
    i = end;
  }
  return out;
}
