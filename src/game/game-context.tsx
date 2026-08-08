import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import init, { Game } from "pkg/overseer";
import type { BuildingGroupInstance, InventoryEntry, ProductionChartSeries } from "pkg/overseer";
import gameData from "@/game/game-data.json";

// Simulation cadence, decoupled from how often the UI snapshot is refreshed.
const TICK_MS = 16;
// UI snapshot refresh cadence; throttled below tick rate to limit re-renders.
const RENDER_MS = 40;
// Exposed so components (e.g. ProgressBar) can sync CSS transitions to the snapshot cadence.
export const UI_SNAPSHOT_INTERVAL_MS = RENDER_MS;
// Matches the 60-entry rolling window the production charts render (1 sample/sec).
const SAMPLE_MS = 1000;

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
      const game = new Game(gameData);
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
    }, TICK_MS);

    const sampleIntervalId = window.setInterval(() => {
      gameRef.current?.sampleResourceFlowHistory();
    }, SAMPLE_MS);

    const renderIntervalId = window.setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
      setSnapshot(readSnapshot(game));
    }, RENDER_MS);

    return () => {
      window.clearInterval(tickIntervalId);
      window.clearInterval(sampleIntervalId);
      window.clearInterval(renderIntervalId);
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
