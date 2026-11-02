import { useEffect, useRef, useState } from "react";
import { DIRS, SIZE, newGame, step, tickMs, turn } from "./logic";
import "../../styles/Snake.scss";

const KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const COLORS = {
  board: "#2b2550",
  grid: "rgba(255, 255, 255, 0.04)",
  snake: "#e9e4f7",
  head: "#fffdf6",
  star: "#ffd479",
};

const BEST_KEY = "snake-best";
const SWIPE_MIN = 24; // px; shorter drags count as a tap

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

const draw = (ctx, game) => {
  const cell = ctx.canvas.width / SIZE;
  ctx.fillStyle = COLORS.board;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = COLORS.grid;
  for (let y = 0; y < SIZE; y++) {
    for (let x = (y % 2); x < SIZE; x += 2) ctx.fillRect(x * cell, y * cell, cell, cell);
  }

  if (game.food) {
    const cx = (game.food.x + 0.5) * cell;
    const cy = (game.food.y + 0.5) * cell;
    ctx.save();
    ctx.shadowColor = COLORS.star;
    ctx.shadowBlur = cell * 0.8;
    ctx.fillStyle = COLORS.star;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const gap = cell * 0.08;
  game.snake.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? COLORS.head : COLORS.snake;
    ctx.beginPath();
    ctx.roundRect(p.x * cell + gap, p.y * cell + gap, cell - 2 * gap, cell - 2 * gap, cell * 0.3);
    ctx.fill();
  });
};

const Snake = () => {
  const canvasRef = useRef(null);
  const gameRef = useRef(newGame());
  const statusRef = useRef("ready");
  const [status, setStatusState] = useState("ready"); // ready | playing | paused | over | won
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame;
    let last = null;
    let acc = 0;

    const setStatus = (s) => {
      statusRef.current = s;
      setStatusState(s);
    };

    const startOrToggle = () => {
      switch (statusRef.current) {
        case "playing":
          return setStatus("paused");
        case "over":
        case "won":
          gameRef.current = newGame();
          setScore(0);
          return setStatus("playing");
        default:
          return setStatus("playing");
      }
    };

    const steer = (name) => {
      if (statusRef.current === "over" || statusRef.current === "won") return;
      gameRef.current = turn(gameRef.current, DIRS[name]);
      if (statusRef.current !== "playing") setStatus("playing");
    };

    const resize = () => {
      const px = Math.round(canvas.clientWidth * window.devicePixelRatio);
      if (canvas.width !== px) canvas.width = canvas.height = px;
    };

    const loop = (now) => {
      const dt = last === null ? 0 : now - last;
      last = now;
      if (statusRef.current === "playing") {
        acc += dt;
        // At most one move per frame, so a stalled tab doesn't jump ahead.
        if (acc >= tickMs(gameRef.current.score)) {
          acc = 0;
          const before = gameRef.current.score;
          gameRef.current = step(gameRef.current);
          const g = gameRef.current;
          if (g.score !== before) setScore(g.score);
          if (g.over) {
            setStatus(g.won ? "won" : "over");
            if (g.score > readBest()) {
              saveBest(g.score);
              setBest(g.score);
            }
          }
        }
      } else {
        acc = 0;
      }
      draw(ctx, gameRef.current);
      frame = requestAnimationFrame(loop);
    };

    const onKey = (e) => {
      const name = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (name) {
        e.preventDefault();
        steer(name);
      } else if (e.key === " " || e.key === "Enter" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        startOrToggle();
      }
    };

    let swipe = null;
    const onDown = (e) => {
      swipe = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return startOrToggle();
      if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? "right" : "left");
      else steer(dy > 0 ? "down" : "up");
    };

    // Pause when the player switches away from the tab or window.
    const pause = () => {
      if (statusRef.current === "playing") setStatus("paused");
    };
    const pauseIfHidden = () => {
      if (document.hidden) pause();
    };

    resize();
    frame = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", pauseIfHidden);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", pauseIfHidden);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, []);

  const won = status === "won";
  const over = status === "over" || won;

  return (
    <div className="snake-page">
      <header className="snake-header">
        <h1>Snake</h1>
        <div className="scores">
          <span>Score {score}</span>
          <span>Best {best}</span>
        </div>
      </header>

      <div className="board">
        <canvas ref={canvasRef} aria-label="Snake game board" />
        {status !== "playing" && (
          <div className="overlay">
            {status === "ready" && (
              <>
                <p className="overlay-title">Eat the stars.</p>
                <p>Arrow keys, WASD, or swipe to steer.</p>
                <p>Press space or tap to start.</p>
              </>
            )}
            {status === "paused" && (
              <>
                <p className="overlay-title">Paused</p>
                <p>Press space or tap to keep going.</p>
              </>
            )}
            {over && (
              <>
                <p className="overlay-title">{won ? "You filled the sky!" : "Game over"}</p>
                <p>Score {score}</p>
                <p>Press space or tap to play again.</p>
              </>
            )}
          </div>
        )}
      </div>

      <a className="back-link" href={`${import.meta.env.BASE_URL}games/`}>
        ← Arcade
      </a>
    </div>
  );
};

export default Snake;
