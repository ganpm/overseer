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
  type ThroughputChartData,
} from "pkg/overseer";
import gameData from "@/game/game-data.json";
import { validateGameData } from "@/game/game-data.schema";
import { Spinner } from "@/components/ui/spinner";

// Simulation tick interval in milliseconds
export const TICK_INTERVAL_MS = 50;

// 
export const SAMPLE_INTERVAL_MS = 1000; // 1 second
export const SAMPLE_LENGTH = 30;
export const LOAD_FADE_MS = 400;

export interface GameSnapshot {
  buildings: BuildingGroupInstance[];
  inventory: InventoryEntry[];
}

export interface GameContextValue {
  game: Game;
  snapshot: GameSnapshot;
  chartData: ThroughputChartData[];
}

const GameContext = createContext<GameContextValue | null>(null);

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "issues" in error) {
    const issues = (error as { issues?: { message?: string; path?: (string | number)[] }[] }).issues;
    if (Array.isArray(issues) && issues.length > 0) {
      return issues
        .map((issue) => {
          const path = Array.isArray(issue.path) && issue.path.length > 0
            ? issue.path
                .map((segment) => (typeof segment === "number" ? `[${segment}]` : `.${segment}`))
                .join("")
                .replace(/^\./, "")
            : "root";
          return `${path}: ${issue.message ?? "Invalid value"}`;
        })
        .join("\n");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

const readSnapshot = (game: Game): GameSnapshot => ({
  buildings: game.buildings,
  inventory: game.inventory,
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const gameRef = useRef<Game | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [chartData, setChartData] = useState<ThroughputChartData[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [initErrorMessage, setInitErrorMessage] = useState<string | null>(null);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void init().then(() => {
      if (cancelled) return;
      try {
        const validatedGameData = validateGameData(gameData);
        const game = new Game(validatedGameData, SAMPLE_LENGTH, SAMPLE_INTERVAL_MS);
        gameRef.current = game;
        setSnapshot(readSnapshot(game));
        setIsReady(true);
      } catch (error) {
        if (cancelled) return;
        setInitErrorMessage(getErrorMessage(error));
      }
    }).catch((error: unknown) => {
      if (cancelled) return;
      setInitErrorMessage(getErrorMessage(error));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Set up the game tick interval
    let lastTick = performance.now();
    let tickAccumulatorMs = 0;
    const tickIntervalId = window.setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
  
      const now = performance.now();
      const tickDeltaMs = now - lastTick;
      lastTick = now;
      tickAccumulatorMs += tickDeltaMs;

      while (tickAccumulatorMs >= TICK_INTERVAL_MS) {
        game.tick(TICK_INTERVAL_MS);
        tickAccumulatorMs -= TICK_INTERVAL_MS;
      }

      setSnapshot(readSnapshot(game));
    }, TICK_INTERVAL_MS);

    // Set up the sample interval
    // Sampling also refreshes the chart data
    let lastSample = performance.now();
    let sampleAccumulatorMs = 0;
    const sampleIntervalId = window.setInterval(() => {
      const game = gameRef.current;
      if (!game) return;
      
      const now = performance.now();
      const sampleDeltaMs = now - lastSample;
      sampleAccumulatorMs += sampleDeltaMs;
      if (sampleAccumulatorMs >= SAMPLE_INTERVAL_MS) {
        game.sampleThroughputData(now);
        const chartData = game.getThroughputChartData();
        setChartData(chartData);
        sampleAccumulatorMs -= SAMPLE_INTERVAL_MS;
      }
    }, SAMPLE_INTERVAL_MS);

    return () => {
      window.clearInterval(tickIntervalId);
      window.clearInterval(sampleIntervalId);
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

  if (initErrorMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        <div className="max-w-2xl rounded-md border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <h2 className="font-heading text-base font-semibold">Game data validation failed</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{initErrorMessage}</p>
        </div>
      </div>
    );
  }

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
