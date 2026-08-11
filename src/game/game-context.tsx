import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import init, { Game } from "pkg/overseer";
import type { BuildingGroupInstance, InventoryEntry, ProductionChartSeries } from "pkg/overseer";
import gameData from "@/game/game-data.json";

// Simulation tick interval in milliseconds
const TICK_MS = 16.667; // 60 FPS

// 
const SAMPLE_INTERVAL = 1.0;
const SAMPLE_LENGTH = 30;

interface GameSnapshot {
  buildings: BuildingGroupInstance[];
  inventory: InventoryEntry[];
  productionChartData: ProductionChartSeries[];
}

interface GameContextValue {
  game: Game;
  snapshot: GameSnapshot;
}

const GameContext = createContext<GameContextValue | null>(null);

const readSnapshot = (game: Game): GameSnapshot => ({
  buildings: game.buildings,
  inventory: game.inventory,
  productionChartData: game.getProductionChartSeries(),
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const gameRef = useRef<Game | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void init().then(() => {
      if (cancelled) return;
      const game = new Game(gameData, SAMPLE_INTERVAL, SAMPLE_LENGTH);
      gameRef.current = game;
      setSnapshot(readSnapshot(game));
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    let lastTick = performance.now();
    const tickIntervalId = window.setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
      const now = performance.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;
      game.tick(deltaSeconds);
      setSnapshot(readSnapshot(game));
    }, TICK_MS);

    return () => {
      window.clearInterval(tickIntervalId);
    };
  }, [isReady]);

  if (!isReady || !snapshot || !gameRef.current) {
    return null;
  }

  return (
    <GameContext.Provider value={{ game: gameRef.current, snapshot }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
