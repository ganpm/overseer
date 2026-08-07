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

interface CoreSnapshot {
  inventory: wasm.InventoryEntry[];
  buildings: wasm.BuildingGroupInstance[];
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

function getBuildingStateToken(buildings: wasm.BuildingGroupInstance[]) {
  const sorted = [...buildings].sort((a, b) => {
    const aKey = `${a.building_name}::${a.process.process_name}`;
    const bKey = `${b.building_name}::${b.process.process_name}`;
    return aKey.localeCompare(bKey);
  });

  return sorted
    .map(
      (building) => `${building.building_name}::${building.process.process_name}:${building.total_count}:${building.active_count}:${building.pending_count}`,
    )
    .join("|");
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
  const lastBuildingStateTokenRef = useRef("");

  useEffect(() => {
    let disposed = false;

    async function loadGame() {
      await init();

      if (disposed) {
        return;
      }

      const game = new wasm.Game(gameData);

      const readCoreSnapshot = (): CoreSnapshot => ({
        inventory: game.inventory,
        buildings: game.buildings,
      });

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

        if (shouldSampleFlow) {
          game.sampleResourceFlowHistory();
        }

        const coreSnapshot = readCoreSnapshot();
        const nextProductionChartData = shouldSampleFlow
          ? game.getProductionChartSeries()
          : null;

        hasActiveProcessesRef.current = hasAnyActiveProcesses(coreSnapshot.buildings);
        lastBuildingStateTokenRef.current = getBuildingStateToken(coreSnapshot.buildings);

        setGameContextValue((currentValue) => {
          if (!currentValue) {
            return currentValue;
          }

          return {
            ...currentValue,
            snapshot: {
              inventory: coreSnapshot.inventory,
              buildings: coreSnapshot.buildings,
              productionChartData: nextProductionChartData ?? currentValue.snapshot.productionChartData,
            },
          };
        });
      };

      game.sampleResourceFlowHistory();
      const initialCoreSnapshot = readCoreSnapshot();
      const initialSnapshot: GameSnapshot = {
        inventory: initialCoreSnapshot.inventory,
        buildings: initialCoreSnapshot.buildings,
        productionChartData: game.getProductionChartSeries(),
      };
      hasActiveProcessesRef.current = hasAnyActiveProcesses(initialCoreSnapshot.buildings);
      lastBuildingStateTokenRef.current = getBuildingStateToken(initialCoreSnapshot.buildings);

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
        } else {
          const buildingStateToken = getBuildingStateToken(game.buildings);
          if (buildingStateToken !== lastBuildingStateTokenRef.current) {
            refreshSnapshot({ force: true });
          }
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
      lastBuildingStateTokenRef.current = "";
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
