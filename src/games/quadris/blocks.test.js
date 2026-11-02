import { describe, expect, it } from "vitest";
import { SHAPES, TYPES, createBlock, resetBlock, rotate, translate } from "./blocks";

const cellsOf = (block) =>
  block.cells.map(({ x, y }) => `${x},${y}`).sort();
const block = (type) => createBlock(type, { id: 1, level: 0 });

describe("createBlock", () => {
  it("builds all seven blocks with four cells in the spawn rows", () => {
    for (const type of TYPES) {
      const b = block(type);
      expect(b.cells).toHaveLength(4);
      expect(b.cells.every(({ y }) => y === 3 || y === 4)).toBe(true);
      expect(Math.min(...b.cells.map(({ x }) => x))).toBe(0); // left-aligned
    }
  });

  it("builds the star block as a single cell in the centre of the top row", () => {
    expect(block("*").cells).toEqual([{ x: 5, y: 0 }]);
  });

  it("records the level generated at and whether it's heavy", () => {
    expect(createBlock("T", { id: 7, level: 3, heavy: true })).toMatchObject({
      type: "T",
      id: 7,
      level: 3,
      heavy: true,
    });
  });
});

describe("translate and resetBlock", () => {
  it("moves every cell, and reset puts it back at spawn", () => {
    const moved = translate(block("O"), 4, 6);
    expect(cellsOf(moved)).toEqual(["4,9", "4,10", "5,9", "5,10"].sort());
    expect(cellsOf(resetBlock(moved))).toEqual(cellsOf(block("O")));
  });
});

describe("rotate", () => {
  it("stands an I block up on its left end, and lays it back down", () => {
    const i = block("I");
    const up = rotate(i, true);
    expect(cellsOf(up)).toEqual(["0,0", "0,1", "0,2", "0,3"]);
    expect(cellsOf(rotate(up, false))).toEqual(cellsOf(i));
  });

  it("turns S upright, keeping the bounding box's lower-left corner fixed", () => {
    // S:  .SS      clockwise:  S.
    //     SS.                  SS
    //                          .S
    expect(cellsOf(rotate(block("S"), true))).toEqual(["0,2", "0,3", "1,3", "1,4"]);
  });

  it("turns T clockwise into a T pointing left", () => {
    // T:  TTT      clockwise:  .T
    //     .T.                  TT
    //                          .T
    expect(cellsOf(rotate(block("T"), true))).toEqual(["0,3", "1,2", "1,3", "1,4"]);
  });

  it("leaves O and the star block unchanged", () => {
    expect(cellsOf(rotate(block("O"), true))).toEqual(cellsOf(block("O")));
    expect(cellsOf(rotate(block("*"), false))).toEqual(cellsOf(block("*")));
  });

  it.each(Object.keys(SHAPES))("%s: four turns either way is a full circle", (type) => {
    let cw = block(type);
    let ccw = block(type);
    for (let i = 0; i < 4; i++) {
      cw = rotate(cw, true);
      ccw = rotate(ccw, false);
    }
    expect(cellsOf(cw)).toEqual(cellsOf(block(type)));
    expect(cellsOf(ccw)).toEqual(cellsOf(block(type)));
  });

  it.each(TYPES)("%s: clockwise then counterclockwise is a no-op", (type) => {
    expect(cellsOf(rotate(rotate(block(type), true), false))).toEqual(cellsOf(block(type)));
  });
});
