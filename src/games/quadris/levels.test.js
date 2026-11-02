import { describe, expect, it } from "vitest";
import { LEVELS, MAX_LEVEL, SEQUENCE, random } from "./levels";

// Draw n blocks from a level's strategy and count each type.
const draw = (level, n, seed = 1) => {
  const counts = {};
  let gen = { seed, sequenceIndex: 0 };
  const types = [];
  for (let i = 0; i < n; i++) {
    const out = LEVELS[level].next(gen);
    gen = out.gen;
    types.push(out.type);
    counts[out.type] = (counts[out.type] ?? 0) + 1;
  }
  return { counts, types };
};

const share = (counts, type, n) => (counts[type] ?? 0) / n;

describe("random", () => {
  it("is deterministic for a seed and stays in [0, 1)", () => {
    expect(random(123)).toEqual(random(123));
    let seed = 7;
    for (let i = 0; i < 1000; i++) {
      const [r, next] = random(seed);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
      seed = next;
    }
  });
});

describe("levels", () => {
  it("has levels 0 through 5", () => {
    expect(LEVELS.map((l) => l.number)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(MAX_LEVEL).toBe(5);
  });

  it("level 0 loops through the fixed sequence", () => {
    expect(draw(0, 9).types).toEqual([...SEQUENCE, ...SEQUENCE.slice(0, 2)]);
  });

  const N = 20000;
  it("level 1 makes S and Z 1/12 each and the rest 1/6", () => {
    const { counts } = draw(1, N);
    for (const t of "SZ") expect(share(counts, t, N)).toBeCloseTo(1 / 12, 1);
    for (const t of "IJLOT") expect(share(counts, t, N)).toBeCloseTo(1 / 6, 1);
  });

  it("level 2 makes all seven equally likely", () => {
    const { counts } = draw(2, N);
    for (const t of "IJLOSTZ") expect(share(counts, t, N)).toBeCloseTo(1 / 7, 1);
  });

  it.each([3, 4, 5])("level %i makes S and Z 2/9 each and the rest 1/9", (level) => {
    const { counts } = draw(level, N);
    for (const t of "SZ") expect(share(counts, t, N)).toBeCloseTo(2 / 9, 1);
    for (const t of "IJLOT") expect(share(counts, t, N)).toBeCloseTo(1 / 9, 1);
  });

  it("makes blocks heavy from level 3", () => {
    expect(LEVELS.map((l) => l.heavy)).toEqual([false, false, false, true, true, true]);
  });

  it("drops stars down the centre at level 4 and every other column at level 5", () => {
    expect(LEVELS[4].starColumns).toEqual([5]);
    expect(LEVELS[5].starColumns).toEqual([0, 2, 4, 6, 8, 10]);
    expect(LEVELS.slice(0, 4).every((l) => l.starColumns.length === 0)).toBe(true);
  });
});
