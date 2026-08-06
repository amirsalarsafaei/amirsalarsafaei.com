"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type GameId = "snake" | "whackAGopher";

type Scores = Partial<Record<GameId, number>>;

const STORAGE_KEY = "playground.gameStats.v1";

const GAME_LABELS: Record<GameId, string> = {
  snake: "Snake",
  whackAGopher: "Whack-a-Gopher",
};

type LaunchTarget = "snake" | null;

interface GameStatsContextValue {
  bestScores: Scores;
  submitScore: (game: GameId, score: number) => boolean;
  label: (game: GameId) => string;
  launch: LaunchTarget;
  setLaunch: (target: LaunchTarget) => void;
}

const GameStatsContext = createContext<GameStatsContextValue | null>(null);

function loadScores(): Scores {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Scores) : {};
  } catch {
    return {};
  }
}

export function GameStatsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bestScores, setBestScores] = useState<Scores>({});
  const [launch, setLaunch] = useState<LaunchTarget>(null);

  useEffect(() => {
    setBestScores(loadScores());
  }, []);

  const submitScore = useCallback((game: GameId, score: number) => {
    let improved = false;
    setBestScores((prev) => {
      const best = prev[game] ?? 0;
      if (score <= best) return prev;
      improved = true;
      const next = { ...prev, [game]: score };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage disabled — silent, the in-memory value still updates.
      }
      return next;
    });
    return improved;
  }, []);

  const value = useMemo<GameStatsContextValue>(
    () => ({
      bestScores,
      submitScore,
      label: (game) => GAME_LABELS[game],
      launch,
      setLaunch,
    }),
    [bestScores, submitScore, launch],
  );

  return (
    <GameStatsContext.Provider value={value}>
      {children}
    </GameStatsContext.Provider>
  );
}

export function useGameStats() {
  const ctx = useContext(GameStatsContext);
  if (!ctx) {
    throw new Error("useGameStats must be used inside GameStatsProvider");
  }
  return ctx;
}
