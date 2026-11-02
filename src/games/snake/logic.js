// Snake rules, kept free of rendering so they're easy to reason about.
// A game is an immutable object; every function returns a new one.

export const SIZE = 20; // the board is SIZE x SIZE cells

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const opposite = (a, b) => a.x + b.x === 0 && a.y + b.y === 0;
const same = (a, b) => a.x === b.x && a.y === b.y;

export const placeFood = (snake, random = Math.random) => {
  const taken = new Set(snake.map((p) => p.y * SIZE + p.x));
  const free = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return null;
  const i = free[Math.floor(random() * free.length)];
  return { x: i % SIZE, y: Math.floor(i / SIZE) };
};

export const newGame = (random = Math.random) => {
  const mid = Math.floor(SIZE / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return {
    snake,
    dir: DIRS.right,
    queue: [], // turns pressed faster than the snake moves
    food: placeFood(snake, random),
    score: 0,
    over: false,
    won: false,
  };
};

// Queue up to two turns so quick presses (e.g. up then left) both register.
// Reversing straight into yourself is ignored.
export const turn = (game, dir) => {
  const last = game.queue.at(-1) ?? game.dir;
  if (game.over || game.queue.length >= 2 || same(dir, last) || opposite(dir, last)) {
    return game;
  }
  return { ...game, queue: [...game.queue, dir] };
};

export const step = (game, random = Math.random) => {
  if (game.over) return game;
  const [dir = game.dir, ...queue] = game.queue;
  const head = { x: game.snake[0].x + dir.x, y: game.snake[0].y + dir.y };
  const eating = game.food !== null && same(head, game.food);
  // The tail moves out of the way this step unless the snake is growing.
  const body = eating ? game.snake : game.snake.slice(0, -1);

  const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
  if (hitWall || body.some((p) => same(p, head))) {
    return { ...game, dir, queue, over: true };
  }

  const snake = [head, ...body];
  if (!eating) return { ...game, snake, dir, queue };

  const food = placeFood(snake, random);
  const won = food === null;
  return { ...game, snake, dir, queue, food, score: game.score + 1, over: won, won };
};

// Milliseconds per move: speeds up as you eat, up to a limit.
export const tickMs = (score) => Math.max(65, 140 - score * 3);
