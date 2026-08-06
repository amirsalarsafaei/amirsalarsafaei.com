"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaTimes, FaChevronUp, FaChevronDown, FaChevronLeft, FaChevronRight } from "react-icons/fa";

import { useGameStats } from "./GameStats";
import "./snake-game.scss";

type Vec = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type Phase = "idle" | "playing" | "gameover";

const GRID = 20;
const TICK_MS_START = 130;
const TICK_MS_MIN = 60;
const SPEEDUP_EVERY = 5;

const DIRS: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function randomFood(snake: Vec[]): Vec {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  // Small board — try-until-free is fine.
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    if (!occupied.has(`${candidate.x},${candidate.y}`)) return candidate;
  }
}

const initialSnake = (): Vec[] => [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

export default function SnakeGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { bestScores, submitScore } = useGameStats();
  const best = bestScores.snake ?? 0;

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [newBest, setNewBest] = useState(false);

  const snakeRef = useRef<Vec[]>(initialSnake());
  const dirRef = useRef<Direction>("right");
  const nextDirRef = useRef<Direction>("right");
  const foodRef = useRef<Vec>({ x: 5, y: 10 });
  const tickMsRef = useRef(TICK_MS_START);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const resetGame = useCallback(() => {
    snakeRef.current = initialSnake();
    dirRef.current = "right";
    nextDirRef.current = "right";
    foodRef.current = randomFood(snakeRef.current);
    tickMsRef.current = TICK_MS_START;
    lastTickRef.current = 0;
    setScore(0);
    setNewBest(false);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const cell = size / GRID;

    ctx.fillStyle = "#0a0f0a";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(43, 188, 138, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
      ctx.stroke();
    }

    const food = foodRef.current;
    ctx.fillStyle = "#ff4d6d";
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const snake = snakeRef.current;
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      ctx.fillStyle = isHead ? "#4ae168" : `hsl(${140 - i * 3}, 60%, ${55 - Math.min(30, i * 1.2)}%)`;
      if (isHead) {
        ctx.shadowColor = "#4ae168";
        ctx.shadowBlur = 10;
      }
      ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
      if (isHead) ctx.shadowBlur = 0;
    }
  }, []);

  const step = useCallback(() => {
    const cur = snakeRef.current;
    const dir = nextDirRef.current;
    dirRef.current = dir;
    const head = cur[0];
    const nextHead = {
      x: head.x + DIRS[dir].x,
      y: head.y + DIRS[dir].y,
    };

    const hitWall =
      nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID;
    const hitSelf = cur.some((s) => s.x === nextHead.x && s.y === nextHead.y);
    if (hitWall || hitSelf) {
      setPhase("gameover");
      setScore((s) => {
        const improved = submitScore("snake", s);
        if (improved) setNewBest(true);
        return s;
      });
      return;
    }

    const ate = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
    const nextSnake = [nextHead, ...cur];
    if (!ate) nextSnake.pop();
    snakeRef.current = nextSnake;

    if (ate) {
      foodRef.current = randomFood(nextSnake);
      setScore((s) => {
        const next = s + 1;
        if (next % SPEEDUP_EVERY === 0) {
          tickMsRef.current = Math.max(TICK_MS_MIN, tickMsRef.current - 8);
        }
        return next;
      });
    }
  }, [submitScore]);

  useEffect(() => {
    if (phase !== "playing") {
      draw();
      return;
    }
    const loop = (t: number) => {
      if (t - lastTickRef.current >= tickMsRef.current) {
        lastTickRef.current = t;
        step();
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, step, draw]);

  const setDirection = useCallback((next: Direction) => {
    if (next === OPPOSITE[dirRef.current]) return;
    nextDirRef.current = next;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (phase === "idle" || phase === "gameover") {
        if (k === " " || k === "enter") {
          e.preventDefault();
          resetGame();
          setPhase("playing");
        }
        return;
      }
      if (k === "arrowup" || k === "w") {
        e.preventDefault();
        setDirection("up");
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        setDirection("down");
      } else if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        setDirection("left");
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        setDirection("right");
      } else if (k === "p") {
        e.preventDefault();
        setPhase("idle");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, resetGame, setDirection, onClose]);

  useEffect(() => {
    draw();
  }, [draw]);

  const start = () => {
    resetGame();
    setPhase("playing");
  };

  const statusLine = useMemo(() => {
    if (phase === "playing") return "← ↑ ↓ →  or  WASD  •  P to pause";
    if (phase === "gameover") return newBest ? "new best score!" : "game over";
    return "arrow keys / WASD to move";
  }, [phase, newBest]);

  return (
    <div className="snake-overlay" role="dialog" aria-label="Snake mini-game">
      <div className="snake-modal">
        <header className="snake-header">
          <div className="snake-title">
            <span className="snake-prompt">$</span>
            <span>./snake</span>
          </div>
          <div className="snake-scores">
            <span>score <b>{score}</b></span>
            <span className="best">best <b>{Math.max(best, score)}</b></span>
          </div>
          <button className="snake-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className="snake-stage">
          <canvas ref={canvasRef} width={480} height={480} />

          {phase !== "playing" && (
            <div className="snake-splash">
              <div className="snake-splash__title">
                {phase === "gameover" ? (newBest ? "NEW BEST!" : "GAME OVER") : "SNAKE"}
              </div>
              {phase === "gameover" && (
                <div className="snake-splash__stat">
                  score <b>{score}</b> · best <b>{Math.max(best, score)}</b>
                </div>
              )}
              <button className="snake-splash__cta" onClick={start}>
                {phase === "gameover" ? "play again" : "start"}
              </button>
              <div className="snake-splash__hint">space / enter</div>
            </div>
          )}
        </div>

        <div className="snake-footer">
          <span className="snake-status">{statusLine}</span>
          <div className="snake-dpad" aria-hidden={phase !== "playing"}>
            <button
              className="snake-dpad__btn snake-dpad__btn--up"
              onPointerDown={() => setDirection("up")}
              aria-label="Up"
            >
              <FaChevronUp />
            </button>
            <button
              className="snake-dpad__btn snake-dpad__btn--left"
              onPointerDown={() => setDirection("left")}
              aria-label="Left"
            >
              <FaChevronLeft />
            </button>
            <button
              className="snake-dpad__btn snake-dpad__btn--right"
              onPointerDown={() => setDirection("right")}
              aria-label="Right"
            >
              <FaChevronRight />
            </button>
            <button
              className="snake-dpad__btn snake-dpad__btn--down"
              onPointerDown={() => setDirection("down")}
              aria-label="Down"
            >
              <FaChevronDown />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
