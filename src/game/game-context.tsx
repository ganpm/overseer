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
type ResourceFlow = Map<string, ResourceFlowSample>;

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

interface ResourceFlowSample {
  produced: number;
  consumed: number;
}

interface ResourceFlowHistory {
  produced: number[];
  consumed: number[];
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

type GameInstance = Omit<InstanceType<typeof game.Game>, "get_inventory" | "get_buildings" | "get_process" | "tick" | "get_catalog" | "get_and_reset_resource_flow"> & {
  get_inventory(): Inventory;
  get_buildings(): Buildings;
  get_process(process_name: string): Process;
  get_process_progress(building_name: string, process_name: string): ProcessProgress;
  get_catalog(): Catalog;
  get_and_reset_resource_flow(): ResourceFlow;
  tick(delta_seconds: number): boolean;
};

interface GameSnapshot {
  inventory: Inventory;
  buildings: Buildings;
  processProgress: Map<string, ProcessProgress>;
  resourceFlowHistory: Map<string, ResourceFlowHistory>;
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
const FLOW_HISTORY_LENGTH = 60;
const FLOW_SAMPLE_INTERVAL_MS = 1_000;

function toProcessProgressKey(buildingName: string, processName: string) {
  return `${buildingName}::${processName}`;
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

  useEffect(() => {
    let disposed = false;

    async function loadGame() {
      await init();

      if (disposed) {
        return;
      }

      const engine = new game.Game() as GameInstance;
      engine.load_catalog(gameData);

      const catalogResourceNames = engine
        .get_catalog()
        .resources
        .map((resource) => resource.name);

      const createZeroFlowHistory = (): ResourceFlowHistory => ({
        produced: Array.from({ length: FLOW_HISTORY_LENGTH }, () => 0),
        consumed: Array.from({ length: FLOW_HISTORY_LENGTH }, () => 0),
      });

      const readSnapshot = (
        previousHistory?: Map<string, ResourceFlowHistory>,
        shouldSampleFlow = false
      ): GameSnapshot => {
        const inventory = engine.get_inventory() as Inventory;
        const buildings = engine.get_buildings() as Buildings;
        const processProgress = new Map(
          Array.from(buildings.entries()).map(([[buildingName, processName], _count]) => [
            toProcessProgressKey(buildingName, processName),
            engine.get_process_progress(buildingName, processName),
          ])
        );

        const sampledResourceFlow = shouldSampleFlow
          ? (engine.get_and_reset_resource_flow() as ResourceFlow)
          : new Map<string, ResourceFlowSample>();

        const trackedResourceNames = new Set<string>([
          ...catalogResourceNames,
          ...Array.from(previousHistory?.keys() ?? []),
          ...Array.from(inventory.keys()),
          ...Array.from(sampledResourceFlow.keys()),
        ]);

        const resourceFlowHistory = new Map<string, ResourceFlowHistory>();

        for (const resourceName of trackedResourceNames) {
          const previousSeries = previousHistory?.get(resourceName) ?? createZeroFlowHistory();
          const nextSeries: ResourceFlowHistory = {
            produced: [...previousSeries.produced],
            consumed: [...previousSeries.consumed],
          };

          if (shouldSampleFlow) {
            const sampledFlow = sampledResourceFlow.get(resourceName);
            nextSeries.produced.push(Number((sampledFlow?.produced ?? 0).toFixed(2)));
            nextSeries.consumed.push(Number((sampledFlow?.consumed ?? 0).toFixed(2)));
          }

          while (nextSeries.produced.length > FLOW_HISTORY_LENGTH) {
            nextSeries.produced.shift();
          }

          while (nextSeries.consumed.length > FLOW_HISTORY_LENGTH) {
            nextSeries.consumed.shift();
          }

          while (nextSeries.produced.length < FLOW_HISTORY_LENGTH) {
            nextSeries.produced.unshift(0);
          }

          while (nextSeries.consumed.length < FLOW_HISTORY_LENGTH) {
            nextSeries.consumed.unshift(0);
          }

          resourceFlowHistory.set(resourceName, nextSeries);
        }

        return {
          inventory,
          buildings,
          processProgress,
          resourceFlowHistory,
        };
      };

      const refreshSnapshot = () => {
        if (disposed) {
          return;
        }

        const now = Date.now();
        const shouldSampleFlow =
          lastFlowSampleTsRef.current === null
          || now - lastFlowSampleTsRef.current >= FLOW_SAMPLE_INTERVAL_MS;

        if (shouldSampleFlow) {
          lastFlowSampleTsRef.current = now;
        }

        setGameContextValue((currentValue) => {
          if (!currentValue) {
            return currentValue;
          }

          return {
            ...currentValue,
            snapshot: readSnapshot(currentValue.snapshot.resourceFlowHistory, shouldSampleFlow),
          };
        });
      };

      setGameContextValue({
        wasm: game,
        game: engine as GameInstance,
        snapshot: readSnapshot(undefined, true),
        actions: {
          addResource(resourceName, amount) {
            engine.add_resource(resourceName, amount);
            refreshSnapshot();
          },
          addBuilding(buildingName, processName, count) {
            engine.add_building(buildingName, processName, count);
            refreshSnapshot();
          },
          removeBuilding(buildingName, processName, count) {
            engine.remove_building(buildingName, processName, count);
            refreshSnapshot();
          },
        },
      });
      lastFlowSampleTsRef.current = Date.now();

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

        const now = Date.now();
        const shouldSampleFlow =
          lastFlowSampleTsRef.current === null
          || now - lastFlowSampleTsRef.current >= FLOW_SAMPLE_INTERVAL_MS;

        if (anySimulationChange || shouldSampleFlow) {
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
