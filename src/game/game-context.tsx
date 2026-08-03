import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

import init, * as game from "../../pkg/overseer.js";
import gameData from "@/game/game-data.json";

import { Spinner } from "@/components/ui/spinner.js";

type GameExports = typeof game;
type Inventory = Map<string, number>;
type Buildings = Map<readonly [string, string], number>;

interface Resource {
  name: string;
}

interface ResourceAmount {
  resource: string;
  amount: number;
}

interface Process {
  name: string;
  duration: number;
  power_consumption: number;
  power_generation: number;
  inputs: { resource: string; amount: number }[];
  outputs: { resource: string; amount: number }[];
}

interface ProcessProgress {
  active_count: number;
  total_count: number;
  pending_count: number;
  duration_seconds: number;
  remaining_seconds: number;
  progress_percent: number;
  efficiency_percent: number;
}

interface ProductionChartPoint {
  label: string;
  produced: number;
  consumed: number;
}

interface ProductionChartSeries {
  resource_name: string;
  current_amount: number;
  average_rate: number;
  points: ProductionChartPoint[];
}

interface Building {
  name: string;
  available_processes: string[];
  cost: ResourceAmount[];
}

interface Catalog {
  resources: Resource[];
  processes: Process[];
  buildings: Building[];
}

type GameInstance = Omit<InstanceType<typeof game.Game>, "get_inventory" | "get_buildings" | "get_process" | "tick" | "get_catalog" | "sample_resource_flow_history" | "get_production_chart_data"> & {
  get_inventory(): Inventory;
  get_buildings(): Buildings;
  get_process(process_name: string): Process;
  get_process_progress(building_name: string, process_name: string): ProcessProgress;
  get_catalog(): Catalog;
  sample_resource_flow_history(): void;
  get_production_chart_data(): ProductionChartSeries[];
  tick(delta_seconds: number): boolean;
};

interface GameSnapshot {
  inventory: Inventory;
  buildings: Buildings;
  processProgress: Map<string, ProcessProgress>;
  productionChartData: ProductionChartSeries[];
}

interface GameActions {
  addResource(resourceName: string, amount: number): void;
  addBuilding(buildingName: string, processName: string, count: number): void;
  removeBuilding(buildingName: string, processName: string, count: number): void;
}

interface GameContextValue {
  wasm: GameExports;
  game: GameInstance;
  snapshot: GameSnapshot;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
}

const FADE_MS = 500;
const FIXED_STEP_SECONDS = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
const UI_SNAPSHOT_INTERVAL_MS = 100;
const FLOW_SAMPLE_INTERVAL_MS = 1_000;

function toProcessProgressKey(buildingName: string, processName: string) {
  return `${buildingName}::${processName}`;
}

function hasAnyActiveProcesses(processProgress: Map<string, ProcessProgress>) {
  for (const progress of processProgress.values()) {
    if (progress.active_count > 0) {
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

      const engine = new game.Game() as GameInstance;
      engine.load_catalog(gameData);

      const readSnapshot = (shouldSampleFlow = false): GameSnapshot => {
        const inventory = engine.get_inventory() as Inventory;
        const buildings = engine.get_buildings() as Buildings;
        const processProgress = new Map(
          Array.from(buildings.entries()).map(([[buildingName, processName], _count]) => [
            toProcessProgressKey(buildingName, processName),
            engine.get_process_progress(buildingName, processName),
          ])
        );

        if (shouldSampleFlow) {
          engine.sample_resource_flow_history();
        }

        const productionChartData = engine.get_production_chart_data() as ProductionChartSeries[];

        return {
          inventory,
          buildings,
          processProgress,
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
        hasActiveProcessesRef.current = hasAnyActiveProcesses(nextSnapshot.processProgress);

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
      hasActiveProcessesRef.current = hasAnyActiveProcesses(initialSnapshot.processProgress);

      setGameContextValue({
        wasm: game,
        game: engine as GameInstance,
        snapshot: initialSnapshot,
        actions: {
          addResource(resourceName, amount) {
            engine.add_resource(resourceName, amount);
            refreshSnapshot({ force: true });
          },
          addBuilding(buildingName, processName, count) {
            engine.add_building(buildingName, processName, count);
            refreshSnapshot({ force: true });
          },
          removeBuilding(buildingName, processName, count) {
            engine.remove_building(buildingName, processName, count);
            refreshSnapshot({ force: true });
          },
        },
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
          if (engine.tick(FIXED_STEP_SECONDS)) {
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
