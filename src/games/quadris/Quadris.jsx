import { useEffect, useReducer, useRef, useState } from "react";
import { COLS, RESERVE_ROWS } from "./board";
import { parseCommand } from "./commands";
import { applyCommand, newGame } from "./game";
import "../../styles/Quadris.scss";

const COLORS = {
  I: "#7fd8e8",
  J: "#8ea7f7",
  L: "#f6a965",
  O: "#ffd479",
  S: "#8fd694",
  T: "#b79cf2",
  Z: "#f48f9b",
  "*": "#c19a6b",
};
const NIGHT = "#2b2550";

const KEYS = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowUp: "clockwise",
  x: "clockwise",
  z: "counterclockwise",
  " ": "drop",
  c: "hold",
  h: "hint",
  p: "play",
  "]": "levelup",
  "=": "levelup",
  "[": "leveldown",
  "-": "leveldown",
  r: "restart",
};

const BUTTONS = [
  ["↺", "counterclockwise", "Rotate counterclockwise"],
  ["◀", "left", "Left"],
  ["▼", "down", "Down"],
  ["▶", "right", "Right"],
  ["↻", "clockwise", "Rotate clockwise"],
  ["Drop", "drop"],
  ["Hold", "hold"],
  ["Hint", "hint"],
  ["Play", "play", "Let the AI place this block"],
];

const BEST_KEY = "quadris-best";
const AUTO_MS = 250; // AI player speed

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

const saveBest = (score) => {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage can be unavailable (e.g. private browsing); the best score just won't persist.
  }
};

const initialSeed = (Math.random() * 2 ** 32) >>> 0;

// The game plus the best score seen, so restarting doesn't lose it.
const init = () => ({ game: newGame({ seed: initialSeed }), best: readBest() });
const reducer = ({ game, best }, { name, times = 1 }) => {
  const next = applyCommand(game, name, times);
  return { game: next, best: Math.max(best, next.score) };
};

const fitCanvas = (canvas) => {
  const w = Math.round(canvas.clientWidth * window.devicePixelRatio);
  const h = Math.round(canvas.clientHeight * window.devicePixelRatio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return canvas.getContext("2d");
};

const drawCell = (ctx, x, y, size, type, { heavy = false, ghost = false } = {}) => {
  const gap = size * 0.06;
  ctx.beginPath();
  ctx.roundRect(x * size + gap, y * size + gap, size - 2 * gap, size - 2 * gap, size * 0.18);
  if (ghost) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 253, 246, 0.75)";
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.setLineDash([size * 0.16, size * 0.1]);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillStyle = COLORS[type];
  ctx.fill();
  if (heavy) {
    // A little weight bar marks heavy blocks.
    ctx.fillStyle = "rgba(43, 37, 80, 0.45)";
    ctx.beginPath();
    ctx.roundRect(x * size + size * 0.25, y * size + size * 0.66, size * 0.5, size * 0.14, size * 0.07);
    ctx.fill();
  }
};

const drawBoard = (canvas, game) => {
  const ctx = fitCanvas(canvas);
  const size = canvas.width / COLS;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Reserve rows at the top.
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(0, 0, canvas.width, RESERVE_ROWS * size);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.setLineDash([size * 0.2, size * 0.2]);
  ctx.beginPath();
  ctx.moveTo(0, RESERVE_ROWS * size);
  ctx.lineTo(canvas.width, RESERVE_ROWS * size);
  ctx.stroke();
  ctx.setLineDash([]);

  game.board.forEach((row, y) =>
    row.forEach((cell, x) => cell && drawCell(ctx, x, y, size, cell.type, { heavy: cell.heavy })),
  );
  for (const { x, y } of game.hint ?? []) drawCell(ctx, x, y, size, null, { ghost: true });
  if (game.current && !game.over) {
    for (const { x, y } of game.current.cells) {
      drawCell(ctx, x, y, size, game.current.type, { heavy: game.current.heavy });
    }
  }
};

// Draw a block centred in a 4x2 preview.
const drawPreview = (canvas, block) => {
  const ctx = fitCanvas(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!block) return;
  const size = canvas.width / 4;
  const xs = block.cells.map((c) => c.x);
  const ys = block.cells.map((c) => c.y);
  const ox = (4 - (Math.max(...xs) - Math.min(...xs) + 1)) / 2 - Math.min(...xs);
  const oy = (2 - (Math.max(...ys) - Math.min(...ys) + 1)) / 2 - Math.min(...ys);
  for (const { x, y } of block.cells) drawCell(ctx, x + ox, y + oy, size, block.type, { heavy: block.heavy });
};

const Quadris = () => {
  const [{ game, best }, dispatch] = useReducer(reducer, undefined, init);
  const [auto, setAuto] = useState(false);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState("Type a command, like 3ri or dr.");
  const [frame, redraw] = useReducer((n) => n + 1, 0);
  const boardRef = useRef(null);
  const nextRef = useRef(null);
  const holdRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    drawBoard(boardRef.current, game);
    drawPreview(nextRef.current, game.next);
    drawPreview(holdRef.current, game.hold);
  }, [game, frame]);

  useEffect(() => {
    if (best > readBest()) saveBest(best);
  }, [best]);

  useEffect(() => {
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, []);

  // The AI player: keep playing until it loses or you take over.
  useEffect(() => {
    if (!auto || game.over) return;
    const timer = setTimeout(() => dispatch({ name: "play" }), AUTO_MS);
    return () => clearTimeout(timer);
  }, [auto, game]);

  const run = (name, times = 1) => {
    setAuto(false);
    dispatch({ name, times });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target === inputRef.current || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current.focus();
        return;
      }
      if (e.key === "a" || e.key === "A") {
        setAuto((on) => !on);
        return;
      }
      const name = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (!name) return;
      e.preventDefault();
      setAuto(false);
      dispatch({ name });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const parsed = parseCommand(command);
    // Like the original terminal, each line is consumed whether or not it worked.
    setCommand("");
    if (parsed.error) {
      setLog(parsed.error);
      return;
    }
    run(parsed.name, parsed.times);
    setLog(`> ${parsed.times === 1 ? "" : parsed.times}${parsed.name}`);
  };

  return (
    <div className="quadris-page">
      <header className="quadris-header">
        <h1>Quadris</h1>
        <p className="quip">Our CS247 project, ported from C++ to the moon. rip cs247 🪦</p>
      </header>

      <main className="quadris-main">
        <div className="quadris-board">
          <canvas ref={boardRef} aria-label="Quadris board" />
          {game.over && (
            <div className="quadris-overlay">
              <p className="overlay-title">Game over</p>
              <p>Score {game.score}</p>
              <button type="button" onClick={() => run("restart")}>
                Play again
              </button>
            </div>
          )}
        </div>

        <aside className="quadris-side">
          <div className="stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{game.level}</span>
            <span className="level-buttons">
              <button type="button" aria-label="Level down" onClick={() => run("leveldown")}>
                −
              </button>
              <button type="button" aria-label="Level up" onClick={() => run("levelup")}>
                +
              </button>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{game.score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Best</span>
            <span className="stat-value">{best}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Next</span>
            <canvas ref={nextRef} className="preview" aria-label="Next block" />
          </div>
          <div className="stat">
            <span className="stat-label">Hold</span>
            <canvas ref={holdRef} className="preview" aria-label="Held block" />
          </div>
          <button
            type="button"
            className={`ai-toggle ${auto ? "on" : ""}`}
            onClick={() => setAuto((on) => !on)}
          >
            {auto ? "AI playing…" : "Let the AI play"}
          </button>
        </aside>
      </main>

      <div className="quadris-controls">
        {BUTTONS.map(([label, name, aria]) => (
          <button key={name} type="button" aria-label={aria ?? label} onClick={() => run(name)}>
            {label}
          </button>
        ))}
      </div>

      <form className="quadris-console" onSubmit={submit}>
        <input
          ref={inputRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
          placeholder="command (press / to type)"
          aria-label="Command"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <output>{log}</output>
      </form>

      <details className="quadris-help">
        <summary>How to play</summary>
        <p>
          Blocks don&apos;t fall on their own: move them into place, then drop. Fill a row
          to clear it. Clearing scores (level + rows)², plus (level made + 1)² for every
          block you clear away completely.
        </p>
        <ul>
          <li>← → ↓ move, ↑ or X rotates clockwise, Z counterclockwise</li>
          <li>Space drops, C holds, H shows a hint, P lets the AI place this block</li>
          <li>A turns the AI player on and off, [ and ] change level, R restarts</li>
          <li>
            Level 3+ blocks are heavy and sink a row after every move. At level 4, a star
            block falls down the middle after every 5 drops without a clear; at level 5,
            down every other column.
          </li>
          <li>
            Or type commands like the original: any unique prefix works (<code>lef</code>,
            <code> cl</code>, <code>dr</code>), with a number to repeat (<code>3ri</code>).
            I, J, L, O, S, Z, T swap in that block.
          </li>
        </ul>
      </details>

      <p className="credit">
        Originally built in C++ by Tyler Pinto, Eric Feng and Yifei Zhang (2020).
      </p>

      <a className="back-link" href={`${import.meta.env.BASE_URL}games/`}>
        ← Arcade
      </a>
    </div>
  );
};

export default Quadris;
