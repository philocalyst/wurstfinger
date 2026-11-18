// The keyboard's measurements, in points, for a 393 pt wide phone.
//
// Three columns where there were four: the block is 316 pt wide, so a key is
// 94 by 70 pt (14.6 by 10.9 mm) against 57.75 pt square before. The space bar
// is two cells wide on every page and the bottom-right cell is the corner key.

import { KEY_POS } from './layout.js';

export const GEO = { block: 316, padX: 12, padTop: 4, padBottom: 10, gap: 5, cellH: 70 };
GEO.cellW = (GEO.block - 2 * GEO.padX - 2 * GEO.gap) / 3;
GEO.height = GEO.padTop + 4 * GEO.cellH + 3 * GEO.gap + GEO.padBottom;
GEO.gridHeight = GEO.padTop + 3 * GEO.cellH + 3 * GEO.gap;
export const POINTS_PER_MM = 163 / 25.4;

const rectOf = (col, row, span = 1) => ({
  x: GEO.padX + col * (GEO.cellW + GEO.gap), y: GEO.padTop + row * (GEO.cellH + GEO.gap),
  w: span * GEO.cellW + (span - 1) * GEO.gap, h: GEO.cellH,
});

/**
 * A key's rectangle. 'SPACE' is the whole space bar; 'SP' and 'SR' are its
 * left and right halves, which type different things when flicked; 'UT' is
 * the corner key.
 */
export const keyRect = key => key === 'SPACE' ? rectOf(0, 3, 2) : key === 'SP' ? rectOf(0, 3) : key === 'SR' ? rectOf(1, 3)
  : key === 'UT' ? rectOf(2, 3) : rectOf(KEY_POS[key].col, KEY_POS[key].row);
