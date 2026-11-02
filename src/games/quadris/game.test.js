import { describe, expect, it } from "vitest";
import { createBlock, translate } from "./blocks";
import { COLS, emptyBoard } from "./board";
import { applyCommand, newGame } from "./game";
import { SEQUENCE } from "./levels";

const run = (state, ...commands) =>
  commands.reduce((s, c) => (Array.isArray(c) ? applyCommand(s, ...c) : applyCommand(s, c)), state);

const xs = (block) => block.cells.map((c) => c.x).sort((a, b) => a - b);
const ys = (block) => block.cells.map((c) => c.y).sort((a, b) => a - b);

// A board whose bottom rows are full except for the listed columns.
const boardWithRows = (rows) => {
  const board = emptyBoard();
  for (const [y, gaps, level = 0, id = 900 + y] of rows) {
    for (let x = 0; x < COLS; x++) {
      if (!gaps.includes(x)) board[y][x] = { type: "T", id, level, heavy: false };
    }
  }
  return board;
};

// A game at some level with a chosen board and current block.
const setup = ({ level = 0, board = emptyBoard(), current, ...rest } = {}) => {
  const g = newGame({ level, seed: 42 });
  return { ...g, board, current: current ?? g.current, ...rest };
};

describe("newGame", () => {
  it("starts at level 0 with the sequence's first two blocks", () => {
    const g = newGame();
    expect(g).toMatchObject({ level: 0, score: 0, hold: null, over: false });
    expect(g.current.type).toBe(SEQUENCE[0]);
    expect(g.next.type).toBe(SEQUENCE[1]);
  });

  it("is reproducible for a seed", () => {
    expect(newGame({ level: 2, seed: 9 })).toEqual(newGame({ level: 2, seed: 9 }));
  });
});

describe("moving", () => {
  it("moves left, right and down, but not through walls", () => {
    let g = newGame(); // I block at x 0-3, row 3
    g = run(g, "left");
    expect(xs(g.current)).toEqual([0, 1, 2, 3]);
    g = run(g, "right", "down");
    expect(xs(g.current)).toEqual([1, 2, 3, 4]);
    expect(ys(g.current)).toEqual([4, 4, 4, 4]);
    g = run(g, ["right", 50]);
    expect(xs(g.current)).toEqual([7, 8, 9, 10]);
  });

  it("doesn't rotate into a wall", () => {
    // A vertical I against the right wall has no room to lie down.
    let g = run(newGame(), "clockwise", ["right", 20]);
    expect(xs(g.current)).toEqual([10, 10, 10, 10]);
    expect(run(g, "clockwise").current).toEqual(g.current);
  });

  it("repeats commands with a multiplier, wrapping rotations", () => {
    const g = newGame();
    expect(run(g, ["clockwise", 4]).current.cells).toEqual(g.current.cells);
    expect(xs(run(g, ["right", 3]).current)).toEqual([3, 4, 5, 6]);
  });

  it("makes heavy blocks fall one row after each move, once per command", () => {
    const heavy = { ...createBlock("O", { id: 1, level: 3, heavy: true }) };
    let g = setup({ level: 3, current: heavy });
    g = run(g, "left");
    expect(ys(g.current)).toEqual([4, 4, 5, 5]);
    g = run(g, ["right", 3]); // a multiplied command only adds one heavy fall
    expect(ys(g.current)).toEqual([5, 5, 6, 6]);
    g = run(g, "down"); // down, then the heavy fall
    expect(ys(g.current)).toEqual([7, 7, 8, 8]);
  });

  it("doesn't make light blocks fall", () => {
    const g = run(newGame(), "left", "right", "clockwise");
    expect(Math.max(...ys(g.current))).toBe(3);
  });
});

describe("drop", () => {
  it("lands the block, brings in the next one, and generates a new next", () => {
    let g = newGame();
    const { next } = g;
    g = run(g, "drop");
    expect(g.board[17].filter(Boolean)).toHaveLength(4);
    expect(g.current).toEqual(next);
    expect(g.next.type).toBe(SEQUENCE[2]);
  });

  it("scores (level + lines)^2 for cleared lines, plus each block cleared away", () => {
    // Bottom row full except columns 0-3 (one level-0 filler block); an I fills it.
    const g = run(setup({ level: 2, board: boardWithRows([[17, [0, 1, 2, 3]]]) }), "I", "drop");
    // (2 + 1)^2 for the line, (0 + 1)^2 for the filler, (2 + 1)^2 for the I.
    expect(g.score).toBe(9 + 1 + 9);
    expect(g.board[17].every((c) => c === null)).toBe(true);
  });

  it("scores multiple lines together", () => {
    // Two bottom rows missing column 0; a vertical I fills both, leaving two
    // of its own cells behind.
    const board = boardWithRows([
      [16, [0]],
      [17, [0]],
    ]);
    const g = run(setup({ level: 1, board }), "I", "clockwise", "drop");
    // (1 + 2)^2 for two lines, plus 1 for each filler row's block; the I
    // keeps two cells, so it earns nothing yet.
    expect(g.score).toBe(9 + 1 + 1);
    expect(g.board[17][0]).not.toBeNull();
    expect(g.board[16][0]).not.toBeNull();
  });

  it("adds (level generated + 1)^2 for each block cleared away completely", () => {
    // A row built from one level-3 block (id 7) missing columns 0-3.
    const board = boardWithRows([[17, [0, 1, 2, 3], 3, 7]]);
    const g = run(setup({ level: 0, board }), "I", "drop");
    // (0 + 1)^2 for the line, (3 + 1)^2 for block 7, (0 + 1)^2 for the I itself.
    expect(g.score).toBe(1 + 16 + 1);
  });

  it("ends the game when the next block has nowhere to spawn", () => {
    const board = boardWithRows([[4, [10]]]); // blocks the spawn rows
    const g = run(setup({ board, current: translate(createBlock("O", { id: 1, level: 0 }), 9, -3) }), "drop");
    expect(g.over).toBe(true);
    expect(run(g, "left")).toBe(g); // nothing works once it's over
  });
});

describe("star blocks", () => {
  // Stack O blocks against the right wall: never completes a line.
  const dropTimes = (g, n) => {
    for (let i = 0; i < n; i++) g = run(g, "O", ["right", 20], "drop");
    return g;
  };
  const stars = (board) => board.flat().filter((c) => c?.type === "*");

  it("drops a star down the centre after 5 drops without a clear at level 4", () => {
    const g4 = setup({ level: 4 });
    expect(stars(dropTimes(g4, 4).board)).toHaveLength(0);
    const after = dropTimes(g4, 5);
    expect(stars(after.board)).toHaveLength(1);
    expect(after.board[17][5]).toMatchObject({ type: "*", heavy: true });
  });

  it("drops stars down every other column at level 5", () => {
    expect(stars(dropTimes(setup({ level: 5 }), 5).board)).toHaveLength(6);
  });

  it("never drops stars below level 4", () => {
    expect(stars(dropTimes(setup({ level: 3 }), 10).board)).toHaveLength(0);
  });

  it("resets the count when a line is cleared", () => {
    let g = dropTimes(setup({ level: 4 }), 4);
    expect(g.dropsWithoutClear).toBe(4);
    g = { ...g, board: boardWithRows([[17, [0, 1, 2, 3]]]) };
    g = run(g, "I", "drop");
    expect(g.dropsWithoutClear).toBe(0);
  });
});

describe("hold", () => {
  it("first hold stashes the block and brings in the next one", () => {
    const g = newGame();
    const held = run(g, "right", "hold");
    expect(held.hold.type).toBe(g.current.type);
    expect(held.hold.cells).toEqual(g.current.cells); // back at spawn
    expect(held.current).toEqual(g.next);
  });

  it("only works once per drop, then swaps after the next drop", () => {
    let g = run(newGame(), "hold");
    expect(run(g, "hold")).toEqual(g);
    const before = g;
    g = run(g, "drop", "hold");
    expect(g.current.type).toBe(before.hold.type);
    expect(g.hold.type).toBe(before.next.type);
  });
});

describe("levels", () => {
  it("levels up to 5 and down to 0, and no further", () => {
    expect(run(newGame(), ["levelup", 10]).level).toBe(5);
    expect(run(newGame({ level: 3 }), ["leveldown", 10]).level).toBe(0);
  });

  it("restarts level 0's sequence when you come back to it", () => {
    const g = run(newGame(), "drop", "drop", "levelup", "leveldown");
    expect(g.sequenceIndex).toBe(0);
  });

  it("new blocks are generated by the new level", () => {
    let g = run(newGame(), ["levelup", 3]); // level 3: heavy blocks
    g = run(g, "drop", "drop");
    expect(g.next.heavy).toBe(true);
    expect(g.next.level).toBe(3);
  });
});

describe("hint, play, restart", () => {
  it("shows a hint until the next command", () => {
    const board = boardWithRows([[17, [0, 1, 2, 3]]]);
    let g = run(setup({ board }), "I", "hint");
    expect(ys({ cells: g.hint })).toEqual([17, 17, 17, 17]);
    g = run(g, "left");
    expect(g.hint).toBeNull();
  });

  it("play drops the block where the hint says", () => {
    const board = boardWithRows([[17, [0, 1, 2, 3]]]);
    const g = run(setup({ board }), "I", "play");
    expect(g.score).toBeGreaterThan(0);
  });

  it("restart keeps the level and wipes everything else", () => {
    const g = run(newGame({ level: 2 }), "drop", "drop", "restart");
    expect(g.level).toBe(2);
    expect(g.score).toBe(0);
    expect(g.board.flat().every((c) => c === null)).toBe(true);
  });

  it("restart works after game over", () => {
    expect(run({ ...newGame(), over: true }, "restart").over).toBe(false);
  });
});

describe("the AI", () => {
  it("lasts 300+ drops on average at level 1, scoring as it goes", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = seeds.map((seed) => {
      let g = newGame({ level: 1, seed });
      let drops = 0;
      while (!g.over && drops < 1000) {
        g = applyCommand(g, "play");
        drops++;
      }
      return { drops, score: g.score };
    });
    const average = results.reduce((sum, r) => sum + r.drops, 0) / seeds.length;
    expect(average).toBeGreaterThan(300);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });
});
