import { describe, expect, it } from "vitest";
import { DIRS, SIZE, newGame, placeFood, step, tickMs, turn } from "./logic";

const at = (x, y) => ({ x, y });
const first = () => 0; // deterministic "random": always the first free cell

// A game with a custom board, defaulting to a star far away from the action.
const game = (overrides) => ({ ...newGame(first), food: at(15, 15), ...overrides });

const stepN = (g, n) => {
  for (let i = 0; i < n; i++) g = step(g, first);
  return g;
};

const allCells = () => {
  const cells = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) cells.push(at(x, y));
  return cells;
};

describe("newGame", () => {
  it("starts with a 3-long snake in the middle, heading right", () => {
    const g = newGame(first);
    expect(g.snake).toEqual([at(10, 10), at(9, 10), at(8, 10)]);
    expect(g.dir).toEqual(DIRS.right);
    expect(g).toMatchObject({ score: 0, over: false, won: false, queue: [] });
  });

  it("never places the star on the snake", () => {
    for (let i = 0; i < 50; i++) {
      const g = newGame(Math.random);
      expect(g.snake).not.toContainEqual(g.food);
    }
  });
});

describe("turn", () => {
  it("ignores reversing straight into yourself", () => {
    const g = newGame(first);
    expect(turn(g, DIRS.left)).toBe(g);
  });

  it("ignores turning the way you're already going", () => {
    const g = newGame(first);
    expect(turn(g, DIRS.right)).toBe(g);
  });

  it("queues up to two quick turns, judged against the last queued one", () => {
    let g = newGame(first);
    g = turn(g, DIRS.up);
    g = turn(g, DIRS.down); // reverse of the queued "up": ignored
    g = turn(g, DIRS.left);
    g = turn(g, DIRS.down); // queue is full: ignored
    expect(g.queue).toEqual([DIRS.up, DIRS.left]);
  });

  it("does nothing once the game is over", () => {
    const g = game({ over: true });
    expect(turn(g, DIRS.up)).toBe(g);
  });
});

describe("step", () => {
  it("moves one cell per step, keeping the same length", () => {
    const g = step(newGame(first), first);
    expect(g.snake).toEqual([at(11, 10), at(10, 10), at(9, 10)]);
  });

  it("applies queued turns one per step", () => {
    let g = turn(turn(newGame(first), DIRS.up), DIRS.left);
    g = step(g, first);
    expect(g.snake[0]).toEqual(at(10, 9));
    g = step(g, first);
    expect(g.snake[0]).toEqual(at(9, 9));
    expect(g.queue).toEqual([]);
    expect(g.dir).toEqual(DIRS.left);
  });

  it("ends the game on hitting a wall, and not before", () => {
    let g = stepN(game(), 9);
    expect(g.over).toBe(false);
    expect(g.snake[0]).toEqual(at(19, 10));
    g = step(g, first);
    expect(g.over).toBe(true);
  });

  it.each([
    ["top", at(5, 0), DIRS.up],
    ["bottom", at(5, SIZE - 1), DIRS.down],
    ["left", at(0, 5), DIRS.left],
  ])("ends the game on hitting the %s wall", (_, head, dir) => {
    const tail = at(head.x - dir.x, head.y - dir.y);
    expect(step(game({ snake: [head, tail], dir }), first).over).toBe(true);
  });

  it("eating a star grows the snake, scores a point, and moves the star", () => {
    const g = step(game({ snake: [at(5, 5), at(4, 5), at(3, 5)], food: at(6, 5) }), first);
    expect(g.score).toBe(1);
    expect(g.snake).toEqual([at(6, 5), at(5, 5), at(4, 5), at(3, 5)]);
    expect(g.snake).not.toContainEqual(g.food);
  });

  it("lets the head move into the cell the tail is leaving", () => {
    // A 2x2 loop: the head chases the tail around.
    const g = game({
      snake: [at(5, 5), at(5, 6), at(6, 6), at(6, 5)],
      dir: DIRS.up,
      queue: [DIRS.right],
    });
    const next = step(g, first);
    expect(next.over).toBe(false);
    expect(next.snake[0]).toEqual(at(6, 5));
  });

  it("ends the game on biting your own body", () => {
    const g = game({
      snake: [at(5, 5), at(5, 6), at(6, 6), at(6, 5), at(7, 5)],
      dir: DIRS.up,
      queue: [DIRS.right],
    });
    expect(step(g, first).over).toBe(true);
  });

  it("wins when the snake fills the whole board", () => {
    // Everything is snake except (1, 0), where the last star sits.
    const body = allCells().filter((p) => !(p.y === 0 && p.x < 2));
    const g = step(game({ snake: [at(0, 0), ...body], food: at(1, 0) }), first);
    expect(g).toMatchObject({ won: true, over: true, food: null });
    expect(g.snake).toHaveLength(SIZE * SIZE);
  });

  it("does nothing once the game is over", () => {
    const g = game({ over: true });
    expect(step(g, first)).toBe(g);
  });
});

describe("placeFood", () => {
  it("only ever picks a free cell", () => {
    const snake = allCells().slice(0, SIZE * SIZE - 1); // one free cell left
    for (const r of [0, 0.5, 0.999]) {
      expect(placeFood(snake, () => r)).toEqual(at(SIZE - 1, SIZE - 1));
    }
  });

  it("returns null when the board is full", () => {
    expect(placeFood(allCells(), first)).toBeNull();
  });
});

describe("tickMs", () => {
  it("starts at 140ms per move and gets 3ms faster per star", () => {
    expect(tickMs(0)).toBe(140);
    expect(tickMs(10)).toBe(110);
  });

  it("never gets faster than 65ms per move", () => {
    expect(tickMs(25)).toBe(65);
    expect(tickMs(1000)).toBe(65);
  });
});
