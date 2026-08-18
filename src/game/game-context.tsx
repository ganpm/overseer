import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import init, {
  Game,
  type BuildingGroupInstance,
  type InventoryEntry,
  type ProductionChartSeries,
} from "pkg/overseer";
import gameData from "@/game/game-data.json";
import { validateGameData } from "@/game/game-data.schema";
import { Spinner } from "@/components/ui/spinner";

// Simulation tick interval in milliseconds
const TICK_MS = 16.667; // 60 FPS
const MAX_CATCH_UP_TICKS = 5;

// 
const SAMPLE_INTERVAL = 1.0;
const SAMPLE_LENGTH = 30;
const LOAD_FADE_MS = 400;

export interface GameSnapshot {
  buildings: BuildingGroupInstance[];
  inventory: InventoryEntry[];
}

export interface GameContextValue {
  game: Game;
  snapshot: GameSnapshot;
  chartData: ProductionChartSeries[];
}

const GameContext = createContext<GameContextValue | null>(null);

const readSnapshot = (game: Game): GameSnapshot => ({
  buildings: game.buildings,
  inventory: game.inventory,
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const gameRef = useRef<Game | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [chartData, setChartData] = useState<ProductionChartSeries[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void init().then(() => {
      if (cancelled) return;
      const validatedGameData = validateGameData(gameData);
      const game = new Game(validatedGameData, SAMPLE_INTERVAL, SAMPLE_LENGTH);
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
    let accumulatorMs = 0;
    const tickIntervalId = window.setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
  
      const now = performance.now();
      const frameDeltaMs = Math.min(now - lastTick, TICK_MS * MAX_CATCH_UP_TICKS);
      lastTick = now;
      accumulatorMs += frameDeltaMs;

      let changed = false;
      let steps = 0;
      while (accumulatorMs >= TICK_MS && steps < MAX_CATCH_UP_TICKS) {
        changed = game.tick(TICK_MS / 1000) || changed;
        accumulatorMs -= TICK_MS;
        steps += 1;
      }

      setSnapshot(readSnapshot(game));
    }, TICK_MS);

    let lastChartRefresh = performance.now();
    const chartRefreshIntervalId = window.setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
      
      const now = performance.now();
      if (now - lastChartRefresh >= SAMPLE_INTERVAL * 1000) {
        lastChartRefresh = now;
        setChartData(game.getProductionChartSeries());
      }
    }, SAMPLE_INTERVAL * 1000);

    return () => {
      window.clearInterval(tickIntervalId);
      window.clearInterval(chartRefreshIntervalId);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    const frameId = window.requestAnimationFrame(() => {
      setIsContentVisible(true);
    });

    const hideLoaderTimeoutId = window.setTimeout(() => {
      setShowLoader(false);
    }, LOAD_FADE_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(hideLoaderTimeoutId);
    };
  }, [isReady]);

  if (!snapshot || !gameRef.current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground" aria-live="polite" aria-busy="true">
          <Spinner className="size-6" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <GameContext.Provider value={{ game: gameRef.current, snapshot, chartData }}>
      <div
        className={isContentVisible ? "opacity-100" : "opacity-0"}
        style={{ transition: `opacity ${LOAD_FADE_MS}ms ease` }}
      >
        {children}
      </div>
      {showLoader && (
        <div
          className={isContentVisible ? "fixed inset-0 z-50 flex items-center justify-center bg-background opacity-0" : "fixed inset-0 z-50 flex items-center justify-center bg-background opacity-100"}
          style={{ transition: `opacity ${LOAD_FADE_MS}ms ease` }}
        >
          <div className="flex items-center gap-2 text-muted-foreground" aria-live="polite" aria-busy="true">
            <Spinner className="size-6" />
            <span>Loading...</span>
          </div>
        </div>
      )}
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
