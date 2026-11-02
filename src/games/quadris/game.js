// The game model, mirroring the original Game class. State is immutable:
// applyCommand(state, name, times) returns the next state, so the same
// commands drive the keyboard, the buttons, the text console, and the AI.
import { createBlock, resetBlock, rotate, translate } from "./blocks";
import { clearRows, emptyBoard, fits, fullRows, landing, place } from "./board";
import { bestPlacement } from "./hint";
import { LEVELS, MAX_LEVEL, STAR_INTERVAL } from "./levels";

// Generate the next block from the current level's strategy.
const generate = (state) => {
  const level = LEVELS[state.level];
  const { type, gen } = level.next({ seed: state.seed, sequenceIndex: state.sequenceIndex });
  const block = createBlock(type, { id: state.nextId, level: level.number, heavy: level.heavy });
  return [block, { ...state, ...gen, nextId: state.nextId + 1 }];
};

export const newGame = ({ level = 0, seed = 1 } = {}) => {
  let state = {
    board: emptyBoard(),
    level,
    score: 0,
    seed,
    sequenceIndex: 0,
    nextId: 1,
    current: null,
    next: null,
    hold: null,
    held: false, // hold can be used once per drop
    dropsWithoutClear: 0,
    hint: null,
    over: false,
  };
  let current, next;
  [current, state] = generate(state);
  [next, state] = generate(state);
  return { ...state, current, next };
};

const tryCurrent = (state, block) => (fits(state.board, block.cells) ? { ...state, current: block } : state);

const move = (state, dx, dy) => tryCurrent(state, translate(state.current, dx, dy));

// Settle a block into the board, clear full rows, and score them:
// (level + lines)^2, plus (level generated + 1)^2 for every block removed
// entirely.
const settle = (state, block) => {
  const placed = place(state.board, block);
  const rows = fullRows(placed);
  if (rows.length === 0) return [{ ...state, board: placed }, 0];

  const touched = new Map();
  for (const y of rows) for (const cell of placed[y]) touched.set(cell.id, cell.level);
  const board = clearRows(placed, rows);
  const remaining = new Set(board.flat().filter(Boolean).map((cell) => cell.id));

  let points = (state.level + rows.length) ** 2;
  for (const [id, level] of touched) if (!remaining.has(id)) points += (level + 1) ** 2;
  return [{ ...state, board, score: state.score + points }, rows.length];
};

// Level 4+: every STAR_INTERVAL drops without a clear, drop star blocks.
const dropStars = (state) => {
  let s = state;
  for (const x of LEVELS[s.level].starColumns) {
    const star = translate(
      createBlock("*", { id: s.nextId, level: s.level, heavy: true }),
      x - 5, // the star spawns in the centre column
      0,
    );
    s = { ...s, nextId: s.nextId + 1 };
    if (!fits(s.board, star.cells)) return { ...s, over: true };
    [s] = settle(s, landing(s.board, star));
  }
  return s;
};

const drop = (state) => {
  let [s, lines] = settle(state, landing(state.board, state.current));
  s = { ...s, held: false, dropsWithoutClear: lines > 0 ? 0 : s.dropsWithoutClear + 1 };

  if (lines === 0 && s.dropsWithoutClear % STAR_INTERVAL === 0) {
    s = dropStars(s);
    if (s.over) return s;
  }

  if (!fits(s.board, s.next.cells)) return { ...s, current: null, over: true };
  let next;
  [next, s] = generate({ ...s, current: s.next });
  return { ...s, next };
};

// The first hold stashes the current block and brings in the next one; after
// that it swaps with the held block. Either way it's once per drop.
const hold = (state) => {
  if (state.held) return state;
  let s = state;
  let incoming;
  let next = s.next;
  if (s.hold) {
    incoming = s.hold;
  } else {
    incoming = s.next;
    [next, s] = generate(s);
  }
  if (!fits(s.board, incoming.cells)) return { ...s, over: true };
  return { ...s, current: incoming, next, hold: resetBlock(state.current), held: true };
};

const setLevel = (state, level) => {
  const clamped = Math.min(MAX_LEVEL, Math.max(0, level));
  if (clamped === state.level) return state;
  // Level 0's sequence starts over whenever you come back to it.
  return { ...state, level: clamped, sequenceIndex: clamped === 0 ? 0 : state.sequenceIndex };
};

// Swap the current block for a specific type (the original's I/J/L/... test commands).
const replace = (state, type) => {
  const block = createBlock(type, { id: state.nextId, level: state.level });
  return fits(state.board, block.cells) ? { ...state, current: block, nextId: state.nextId + 1 } : state;
};

const play = (state) => {
  const best = bestPlacement(state.board, state.current, state.next);
  return best ? drop({ ...state, current: best }) : state;
};

const COMMANDS = {
  left: (s) => move(s, -1, 0),
  right: (s) => move(s, 1, 0),
  down: (s) => move(s, 0, 1),
  clockwise: (s) => tryCurrent(s, rotate(s.current, true)),
  counterclockwise: (s) => tryCurrent(s, rotate(s.current, false)),
  drop,
  levelup: (s) => setLevel(s, s.level + 1),
  leveldown: (s) => setLevel(s, s.level - 1),
  hold,
  hint: (s) => ({ ...s, hint: bestPlacement(s.board, s.current, s.next)?.cells ?? null }),
  play,
  restart: (s) => newGame({ level: s.level, seed: s.seed }),
  I: (s) => replace(s, "I"),
  J: (s) => replace(s, "J"),
  L: (s) => replace(s, "L"),
  O: (s) => replace(s, "O"),
  S: (s) => replace(s, "S"),
  Z: (s) => replace(s, "Z"),
  T: (s) => replace(s, "T"),
};

export const COMMAND_NAMES = Object.keys(COMMANDS);

// Commands after which a heavy block falls one row (once per command, even
// when multiplied, as in the original).
const HEAVY = new Set(["left", "right", "down", "clockwise", "counterclockwise"]);
const REPEATABLE = new Set([...HEAVY, "drop", "levelup", "leveldown"]);
const MAX_REPEAT = 1000;

export const applyCommand = (state, name, times = 1) => {
  const command = COMMANDS[name];
  if (!command) throw new Error(`Unknown command: ${name}`);
  if (state.over && name !== "restart") return state;

  const n = REPEATABLE.has(name) ? Math.min(times, MAX_REPEAT) : Math.min(times, 1);
  // Any command other than hint clears a shown hint.
  let s = name === "hint" ? state : { ...state, hint: null };
  for (let i = 0; i < n; i++) {
    s = command(s);
    if (s.over) break;
  }
  if (n > 0 && HEAVY.has(name) && !s.over && s.current.heavy) s = move(s, 0, 1);
  return s;
};
