import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

import init, * as wasm from "../../pkg/overseer.js";
import gameData from "@/game/game-data.json";

import { Spinner } from "@/components/ui/spinner.js";

interface GameSnapshot {
  inventory: wasm.InventoryEntry[];
  buildings: wasm.BuildingGroupInstance[];
  productionChartData: wasm.ProductionChartSeries[];
}

interface GameContextValue {
  game: wasm.Game;
  snapshot: GameSnapshot;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
}

const FADE_MS = 500;
const FIXED_STEP_SECONDS = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
export const UI_SNAPSHOT_INTERVAL_MS = 40;
const FLOW_SAMPLE_INTERVAL_MS = 1_000;


function hasAnyActiveProcesses(buildings: wasm.BuildingGroupInstance[]) {
  for (const building of buildings) {
    if (building.active_count > 0) {
      return true;
    }
  }

  return false;
}

export function GameProvider({ children }: GameProviderProps) {
  const [gameContextValue, setGameContextValue] = useState<GameContextValue | null>(null);

  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastFlowSampleTsRef = useRef<number | null>(null);
  const lastSnapshotPublishTsRef = useRef<number | null>(null);
  const hasActiveProcessesRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function loadGame() {
      await init();

      if (disposed) {
        return;
      }

      const game = new wasm.Game(gameData);

      const readSnapshot = (shouldSampleFlow = false): GameSnapshot => {
        const inventory = game.inventory;
        const buildings = game.buildings;

        if (shouldSampleFlow) {
          game.sampleResourceFlowHistory();
        }

        const productionChartData = game.getProductionChartSeries();

        return {
          inventory,
          buildings,
          productionChartData,
        };
      };

      const refreshSnapshot = (options?: { force?: boolean }) => {
        if (disposed) {
          return;
        }

        const now = Date.now();
        const shouldPublishSnapshot =
          options?.force
          || lastSnapshotPublishTsRef.current === null
          || now - lastSnapshotPublishTsRef.current >= UI_SNAPSHOT_INTERVAL_MS;
        const shouldSampleFlow =
          hasActiveProcessesRef.current
          && (
            lastFlowSampleTsRef.current === null
            || now - lastFlowSampleTsRef.current >= FLOW_SAMPLE_INTERVAL_MS
          );

        if (!shouldPublishSnapshot && !shouldSampleFlow) {
          return;
        }

        if (shouldSampleFlow) {
          lastFlowSampleTsRef.current = now;
        }

        if (shouldPublishSnapshot) {
          lastSnapshotPublishTsRef.current = now;
        }

        const nextSnapshot = readSnapshot(shouldSampleFlow);
        hasActiveProcessesRef.current = hasAnyActiveProcesses(nextSnapshot.buildings);

        setGameContextValue((currentValue) => {
          if (!currentValue) {
            return currentValue;
          }

          return {
            ...currentValue,
            snapshot: nextSnapshot,
          };
        });
      };

      const initialSnapshot = readSnapshot(true);
      hasActiveProcessesRef.current = hasAnyActiveProcesses(initialSnapshot.buildings);

      setGameContextValue({
        game,
        snapshot: initialSnapshot,
      });
      lastFlowSampleTsRef.current = Date.now();
      lastSnapshotPublishTsRef.current = Date.now();

      const frame = (timestamp: number) => {
        if (disposed) {
          return;
        }

        if (lastFrameTsRef.current === null) {
          lastFrameTsRef.current = timestamp;
          rafRef.current = window.requestAnimationFrame(frame);
          return;
        }

        const elapsedSeconds = Math.min((timestamp - lastFrameTsRef.current) / 1000, 0.25);
        lastFrameTsRef.current = timestamp;
        accumulatorRef.current += elapsedSeconds;

        let anySimulationChange = false;
        let stepCount = 0;

        while (accumulatorRef.current >= FIXED_STEP_SECONDS && stepCount < MAX_STEPS_PER_FRAME) {
          if (game.tick(FIXED_STEP_SECONDS)) {
            anySimulationChange = true;
          }

          accumulatorRef.current -= FIXED_STEP_SECONDS;
          stepCount += 1;
        }

        if (stepCount >= MAX_STEPS_PER_FRAME && accumulatorRef.current >= FIXED_STEP_SECONDS) {
          accumulatorRef.current = accumulatorRef.current % FIXED_STEP_SECONDS;
        }

        if (anySimulationChange || hasActiveProcessesRef.current) {
          refreshSnapshot();
        }

        rafRef.current = window.requestAnimationFrame(frame);
      };

      rafRef.current = window.requestAnimationFrame(frame);

      setLoaderVisible(false);
      fadeTimerRef.current = window.setTimeout(() => {
        if (disposed) {
          return;
        }

        setLoaderMounted(false);
      }, FADE_MS);
    }

    loadGame();

    return () => {
      disposed = true;

      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      lastFrameTsRef.current = null;
      accumulatorRef.current = 0;
      lastFlowSampleTsRef.current = null;
      lastSnapshotPublishTsRef.current = null;
      hasActiveProcessesRef.current = false;
    };
  }, []);

  return (
    <>
      {gameContextValue && (
        <GameContext.Provider value={gameContextValue}>
          {children}
        </GameContext.Provider>
      )}

      {loaderMounted && (
        <div
          className={[
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-background transition-opacity duration-500",
            loaderVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <Spinner className="size-8" />
        </div>
      )}
    </>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
