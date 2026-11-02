import { describe, expect, it } from "vitest";
import { createBlock } from "./blocks";
import { COLS, emptyBoard } from "./board";
import { bestPlacement, cost, placements } from "./hint";

const filled = (board, cells) => {
  const next = board.map((row) => row.slice());
  for (const [x, y] of cells) next[y][x] = { type: "T", id: 99, level: 0, heavy: false };
  return next;
};
const row = (y, gaps) =>
  Array.from({ length: COLS }, (_, x) => x).filter((x) => !gaps.includes(x)).map((x) => [x, y]);
const ys = (cells) => cells.map((c) => c.y).sort((a, b) => a - b);
const xs = (cells) => cells.map((c) => c.x).sort((a, b) => a - b);

describe("placements", () => {
  it("covers every column and rotation an I block can reach", () => {
    const spots = placements(emptyBoard(), createBlock("I", { id: 1, level: 0 }));
    // 8 horizontal positions + 11 vertical, each found once per orientation
    // (the I has two orientations, each visited twice).
    expect(spots.length).toBe(2 * (8 + 11));
    expect(spots.every((s) => Math.max(...s.cells.map((c) => c.y)) === 17)).toBe(true);
  });
});

describe("bestPlacement", () => {
  it("completes a line when it can", () => {
    const board = filled(emptyBoard(), row(17, [7, 8, 9, 10]));
    const best = bestPlacement(board, createBlock("I", { id: 1, level: 0 }));
    expect(ys(best.cells)).toEqual([17, 17, 17, 17]);
    expect(xs(best.cells)).toEqual([7, 8, 9, 10]);
  });

  it("drops a vertical I into a deep well", () => {
    const board = filled(emptyBoard(), [...row(17, [4]), ...row(16, [4]), ...row(15, [4]), ...row(14, [4])]);
    const best = bestPlacement(board, createBlock("I", { id: 1, level: 0 }));
    expect(xs(best.cells)).toEqual([4, 4, 4, 4]);
  });

  it("prefers not to leave holes", () => {
    // A single bump at column 0: laying an O over it would leave a hole.
    const board = filled(emptyBoard(), [[0, 17]]);
    const best = bestPlacement(board, createBlock("O", { id: 1, level: 0 }));
    expect(Math.min(...xs(best.cells))).toBeGreaterThan(0);
  });

  it("avoids covering where the next block spawns", () => {
    const o = createBlock("O", { id: 1, level: 0 });
    const next = createBlock("I", { id: 2, level: 0 }); // spawns at (0-3, 3)
    const onSpawn = { ...o, cells: o.cells }; // the O's own spawn overlaps it
    expect(cost(emptyBoard(), onSpawn, next)).toBeGreaterThan(cost(emptyBoard(), onSpawn));
  });

  it("returns null when the block doesn't fit where it is", () => {
    const board = filled(emptyBoard(), [...row(3, []), ...row(4, [])]);
    expect(bestPlacement(board, createBlock("O", { id: 1, level: 0 }))).toBeNull();
  });
});
