import { describe, expect, it } from "vitest";
import { createBlock } from "./blocks";
import {
  COLS,
  ROWS,
  clearRows,
  columnHeights,
  emptyBoard,
  fits,
  fullRows,
  landing,
  place,
} from "./board";

const cell = (id = 99) => ({ type: "I", id, level: 0, heavy: false });

const fillRow = (board, y, except = []) => {
  const next = board.map((row) => row.slice());
  for (let x = 0; x < COLS; x++) if (!except.includes(x)) next[y][x] = cell();
  return next;
};

describe("board", () => {
  it("is 11 columns by 18 rows, all empty", () => {
    const board = emptyBoard();
    expect(board).toHaveLength(ROWS);
    expect(board.every((row) => row.length === COLS && row.every((c) => c === null))).toBe(true);
  });

  it("fits cells only inside the board and on empty squares", () => {
    const board = place(emptyBoard(), createBlock("O", { id: 1, level: 0 }));
    expect(fits(board, [{ x: 5, y: 5 }])).toBe(true);
    expect(fits(board, [{ x: 0, y: 3 }])).toBe(false); // taken by the O
    expect(fits(board, [{ x: -1, y: 5 }])).toBe(false);
    expect(fits(board, [{ x: COLS, y: 5 }])).toBe(false);
    expect(fits(board, [{ x: 5, y: -1 }])).toBe(false);
    expect(fits(board, [{ x: 5, y: ROWS }])).toBe(false);
  });

  it("lands a block on the floor, or on whatever is below it", () => {
    const o = createBlock("O", { id: 1, level: 0 });
    expect(landing(emptyBoard(), o).cells.map((c) => c.y).sort()).toEqual([16, 16, 17, 17]);
    const stacked = fillRow(emptyBoard(), 17);
    expect(landing(stacked, o).cells.map((c) => c.y).sort()).toEqual([15, 15, 16, 16]);
  });

  it("place records which block each cell came from", () => {
    const t = createBlock("T", { id: 4, level: 2, heavy: true });
    const board = place(emptyBoard(), t);
    expect(board[3][1]).toEqual({ type: "T", id: 4, level: 2, heavy: true });
  });

  it("finds full rows and clears them, shifting everything above down", () => {
    let board = fillRow(emptyBoard(), 17);
    board = fillRow(board, 16, [3]); // not full
    board = fillRow(board, 15);
    board[14][7] = cell(42);
    expect(fullRows(board)).toEqual([15, 17]);

    const cleared = clearRows(board, [15, 17]);
    expect(cleared).toHaveLength(ROWS);
    expect(fullRows(cleared)).toEqual([]);
    expect(cleared[16][7]).toEqual(cell(42)); // was on row 14, fell two rows
    expect(cleared[17][3]).toBeNull(); // the gap in old row 16 is now at the bottom
    expect(cleared[0].every((c) => c === null)).toBe(true);
  });

  it("measures column heights from the floor", () => {
    let board = fillRow(emptyBoard(), 17);
    board[10][2] = cell();
    const heights = columnHeights(board);
    expect(heights[2]).toBe(ROWS - 10);
    expect(heights[0]).toBe(1);
  });
});
