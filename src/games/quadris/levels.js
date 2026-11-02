// Levels are strategies for generating the next block, mirroring the
// original LevelZero..LevelFive classes. Randomness comes from a seeded
// generator carried in the game state, so games are reproducible.

// Level 0 cycles through a fixed sequence (the original's sequence.txt).
export const SEQUENCE = ["I", "J", "O", "S", "Z", "T", "L"];

// mulberry32: returns [a number in [0, 1), the next seed].
export const random = (seed) => {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
};

const sequence = () => (gen) => ({
  type: SEQUENCE[gen.sequenceIndex % SEQUENCE.length],
  gen: { ...gen, sequenceIndex: gen.sequenceIndex + 1 },
});

// Each letter in the bag is one equally likely outcome, so repeats set the odds.
const bag = (letters) => (gen) => {
  const [r, seed] = random(gen.seed);
  return { type: letters[Math.floor(r * letters.length)], gen: { ...gen, seed } };
};

export const LEVELS = [
  { number: 0, heavy: false, starColumns: [], next: sequence() },
  // S and Z 1/12 each, the rest 1/6.
  { number: 1, heavy: false, starColumns: [], next: bag("SZIIJJLLOOTT") },
  // All seven equally likely.
  { number: 2, heavy: false, starColumns: [], next: bag("SZIJLOT") },
  // S and Z 2/9 each, the rest 1/9; blocks are heavy.
  { number: 3, heavy: true, starColumns: [], next: bag("SSZZIJLOT") },
  // As level 3, plus a star block down the centre every 5 drops without a clear.
  { number: 4, heavy: true, starColumns: [5], next: bag("SSZZIJLOT") },
  // Bonus level: star blocks down every other column instead.
  { number: 5, heavy: true, starColumns: [0, 2, 4, 6, 8, 10], next: bag("SSZZIJLOT") },
];

export const MAX_LEVEL = LEVELS.length - 1;

// Drops in a row without clearing a line before star blocks fall.
export const STAR_INTERVAL = 5;
