// The board: an 11x18 grid of settled cells. The top three rows are reserve
// rows that blocks spawn just below. The falling block isn't stored here; the
// game keeps it separately and only settles it into the board on drop.

export const COLS = 11;
export const ROWS = 18;
export const RESERVE_ROWS = 3;

const emptyRow = () => Array(COLS).fill(null);

export const emptyBoard = () => Array.from({ length: ROWS }, emptyRow);

const inBounds = ({ x, y }) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

export const fits = (board, cells) =>
  cells.every((c) => inBounds(c) && board[c.y][c.x] === null);

// Lowest position the block can fall to from where it is.
export const landing = (board, block) => {
  let dy = 0;
  while (fits(board, block.cells.map(({ x, y }) => ({ x, y: y + dy + 1 })))) dy++;
  return { ...block, cells: block.cells.map(({ x, y }) => ({ x, y: y + dy })) };
};

export const place = (board, block) => {
  const next = board.map((row) => row.slice());
  for (const { x, y } of block.cells) {
    next[y][x] = { type: block.type, id: block.id, level: block.level, heavy: block.heavy };
  }
  return next;
};

export const fullRows = (board) =>
  board.flatMap((row, y) => (row.every((cell) => cell !== null) ? [y] : []));

// Remove the given rows and drop everything above them down.
export const clearRows = (board, rows) => [
  ...rows.map(emptyRow),
  ...board.filter((_, y) => !rows.includes(y)),
];

// Height of each column's tallest settled cell (0 for an empty column).
export const columnHeights = (board) =>
  Array.from({ length: COLS }, (_, x) => {
    const top = board.findIndex((row) => row[x] !== null);
    return top === -1 ? 0 : ROWS - top;
  });
