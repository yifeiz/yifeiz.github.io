// The hint/AI player from the original's HintCost + Board::hint: try every
// rotation and column the block can reach, drop it, and score the result with
// a weighted cost. The weights are the originals, tuned by random search over
// ~500 weight sets x 20 seeded games.
import { rotate, translate } from "./blocks";
import { COLS, columnHeights, fits, fullRows, landing, place, ROWS } from "./board";

export const WEIGHTS = {
  holes: 8.67231,
  bumpiness: 0.762476,
  clearLines: 14.1628,
  height: 1.95593,
};

// Overlapping where the next block spawns (without clearing that row) loses.
const LOSING_COST = 10000;

// Empty cells directly beneath the placed block.
const countHoles = (board, cells) =>
  cells.reduce((holes, { x, y }) => {
    let below = y + 1;
    while (below < ROWS && board[below][x] === null) {
      holes++;
      below++;
    }
    return holes;
  }, 0);

const countBumpiness = (board) => {
  const heights = columnHeights(board);
  return heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0);
};

const countHeight = (cells) => cells.reduce((sum, { y }) => sum + (ROWS - 1 - y), 0);

export const cost = (board, block, next, weights = WEIGHTS) => {
  const after = place(board, block);
  const cleared = fullRows(after);
  const blocksNext =
    next?.cells.some(
      (n) => block.cells.some((c) => c.x === n.x && c.y === n.y) && !cleared.includes(n.y),
    ) ?? false;
  return (
    weights.holes * countHoles(after, block.cells) +
    weights.bumpiness * countBumpiness(after) +
    weights.height * countHeight(block.cells) -
    weights.clearLines * cleared.length +
    (blocksNext ? LOSING_COST : 0)
  );
};

// Every landing spot reachable by rotating in place, then sliding sideways.
export const placements = (board, block) => {
  if (!fits(board, block.cells)) return [];
  const spots = [];
  let turned = block;
  for (let r = 0; r < 4; r++) {
    if (r > 0) {
      turned = rotate(turned, true);
      if (!fits(board, turned.cells)) break;
    }
    spots.push(landing(board, turned));
    for (const dir of [-1, 1]) {
      let slid = turned;
      for (let i = 0; i < COLS; i++) {
        slid = translate(slid, dir, 0);
        if (!fits(board, slid.cells)) break;
        spots.push(landing(board, slid));
      }
    }
  }
  return spots;
};

// The lowest-cost placement for the current block, or null if it can't land.
export const bestPlacement = (board, block, next, weights = WEIGHTS) => {
  let best = null;
  let bestCost = Infinity;
  for (const spot of placements(board, block)) {
    const c = cost(board, spot, next, weights);
    if (c < bestCost) {
      bestCost = c;
      best = spot;
    }
  }
  return best;
};
