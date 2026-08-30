import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import init, { Game } from "pkg/overseer";
import gameData from "@/game/game-data.json";
import { validateGameData } from "@/game/game-data.schema";
import { GameStore } from "@/game/game-store";
import { Spinner } from "@/components/ui/spinner";


// Simulation tick interval in milliseconds
export const TICK_INTERVAL_MS = 50;

// 
export const SAMPLE_INTERVAL_MS = 1000; // 1 second
export const SAMPLE_LENGTH = 30;
export const LOAD_FADE_MS = 400;

const GameStoreContext = createContext<GameStore | null>(null);

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

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<GameStore | null>(null);
  const [initErrorMessage, setInitErrorMessage] = useState<string | null>(null);
  
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void init()
      .then(() => {
        if (cancelled) return;
        const validatedGameData = validateGameData(gameData);
        const game = new Game(validatedGameData, SAMPLE_LENGTH, SAMPLE_INTERVAL_MS);
        const now = performance.now();
        game.sampleThroughputData(now);
        game.samplePowerData(now);
        setStore(new GameStore(game));

      })
      .catch((error: unknown) => {
        if (!cancelled) setInitErrorMessage(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!store) return;
    setPause(store.getPause());
    return store.subscribe(() => setPause(store.getPause()));
  }, [store]);

  useEffect(() => {
    if (!store || pause) return;

    // Set up the game tick interval
    let lastTick = performance.now();
    let tickAccumulatorMs = 0;
    const tickIntervalId = window.setInterval(() => {
      const now = performance.now();
      tickAccumulatorMs += now - lastTick;
      lastTick = now;
      while (tickAccumulatorMs >= TICK_INTERVAL_MS) {
        store.tick(TICK_INTERVAL_MS);
        tickAccumulatorMs -= TICK_INTERVAL_MS;
      }
    }, TICK_INTERVAL_MS);

    // Set up the sample interval
    // Sampling also refreshes the chart data
    let lastSample = performance.now();
    let sampleAccumulatorMs = 0;
    const sampleIntervalId = window.setInterval(() => {
      const now = performance.now();
      sampleAccumulatorMs += now - lastSample;
      lastSample = now;
      if (sampleAccumulatorMs >= SAMPLE_INTERVAL_MS) {
        store.sample(now);
        sampleAccumulatorMs -= SAMPLE_INTERVAL_MS;
      }
    }, SAMPLE_INTERVAL_MS);

    return () => {
      window.clearInterval(tickIntervalId);
      window.clearInterval(sampleIntervalId);
    };
  }, [store, pause]);

  useEffect(() => {
    if (!store) return;
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
  }, [store]);

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

  if (!store) {
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
    <GameStoreContext.Provider value={store}>
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
    </GameStoreContext.Provider>
  );
};

export const useGameStore = (): GameStore => {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error("useGame must be used within a GameProvider");
  return store;
};