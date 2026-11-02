// Block factory: the seven quadris blocks plus the 1x1 star block, mirroring
// the original IBlock..ZBlock/StarBlock classes. Blocks spawn at the top-left
// of the board, in rows 3-4 just below the three reserve rows.

export const SHAPES = {
  I: [[0, 3], [1, 3], [2, 3], [3, 3]],
  J: [[0, 3], [0, 4], [1, 4], [2, 4]],
  L: [[2, 3], [0, 4], [1, 4], [2, 4]],
  O: [[0, 3], [1, 3], [0, 4], [1, 4]],
  S: [[1, 3], [2, 3], [0, 4], [1, 4]],
  Z: [[0, 3], [1, 3], [1, 4], [2, 4]],
  T: [[0, 3], [1, 3], [2, 3], [1, 4]],
  "*": [[5, 0]], // star block, dropped down the centre column
};

export const TYPES = ["I", "J", "L", "O", "S", "Z", "T"];

const spawnCells = (type) => SHAPES[type].map(([x, y]) => ({ x, y }));

// `level` is the level the block was generated at (it decides the bonus for
// clearing the whole block); heavy blocks fall a row after every move.
export const createBlock = (type, { id, level, heavy = false }) => ({
  type,
  id,
  level,
  heavy,
  cells: spawnCells(type),
});

// Back to the spawn position, e.g. when a block goes into hold.
export const resetBlock = (block) => ({ ...block, cells: spawnCells(block.type) });

export const translate = (block, dx, dy) => ({
  ...block,
  cells: block.cells.map(({ x, y }) => ({ x: x + dx, y: y + dy })),
});

// Rotate 90 degrees within the block's bounding box, keeping the box's
// lower-left corner fixed (y grows downward).
export const rotate = (block, clockwise) => {
  const xs = block.cells.map((c) => c.x);
  const ys = block.cells.map((c) => c.y);
  const left = Math.min(...xs);
  const bottom = Math.max(...ys);
  const width = Math.max(...xs) - left;
  const height = bottom - Math.min(...ys);

  const cells = block.cells.map(({ x, y }) => {
    const dx = x - left; // columns right of the corner
    const dy = bottom - y; // rows above the corner
    return clockwise
      ? { x: left + dy, y: bottom - (width - dx) }
      : { x: left + (height - dy), y: bottom - dx };
  });
  return { ...block, cells };
};
