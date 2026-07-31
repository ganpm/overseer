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

type GameInstance = Omit<InstanceType<typeof game.Game>, "get_inventory" | "get_buildings" | "get_process" | "tick" | "get_catalog"> & {
  get_inventory(): Inventory;
  get_buildings(): Buildings;
  get_process(process_name: string): Process;
  get_catalog(): Catalog;
  tick(delta_seconds: number): boolean;
};

interface GameSnapshot {
  inventory: Inventory;
  buildings: Buildings;
}

interface GameActions {
  addResource(resourceName: string, amount: number): void;
  addBuilding(buildingName: string, processName: string, count: number): void;
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

export function GameProvider({ children }: GameProviderProps) {
  const [gameContextValue, setGameContextValue] = useState<GameContextValue | null>(null);

  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  useEffect(() => {
    async function loadGame() {
      await init();

      const engine = new game.Game();
      engine.load_catalog(gameData);

      const readSnapshot = (): GameSnapshot => ({
        inventory: engine.get_inventory(),
        buildings: engine.get_buildings(),
      });

      const refreshSnapshot = () => {
        setGameContextValue((currentValue) => {
          if (!currentValue) {
            return currentValue;
          }

          return {
            ...currentValue,
            snapshot: readSnapshot(),
          };
        });
      };

      const actions: GameActions = {
        addResource(resourceName, amount) {
          engine.add_resource(resourceName, amount);
          refreshSnapshot();
        },
        addBuilding(buildingName, processName, count) {
          engine.add_building(buildingName, processName, count);
          refreshSnapshot();
        },
      };

      setGameContextValue({
        wasm: game,
        game: engine as GameInstance,
        snapshot: readSnapshot(),
        actions,
      });

      const frame = (timestamp: number) => {
        if (lastFrameTsRef.current === null) {
          lastFrameTsRef.current = timestamp;
          rafRef.current = window.requestAnimationFrame(frame);
          return;
        }

        const elapsedSeconds = Math.min((timestamp - lastFrameTsRef.current) / 1000, 0.25);
        lastFrameTsRef.current = timestamp;
        accumulatorRef.current += elapsedSeconds;

        let anyInventoryChange = false;
        let stepCount = 0;

        while (accumulatorRef.current >= FIXED_STEP_SECONDS && stepCount < MAX_STEPS_PER_FRAME) {
          if (engine.tick(FIXED_STEP_SECONDS)) {
            anyInventoryChange = true;
          }

          accumulatorRef.current -= FIXED_STEP_SECONDS;
          stepCount += 1;
        }

        if (stepCount >= MAX_STEPS_PER_FRAME && accumulatorRef.current >= FIXED_STEP_SECONDS) {
          accumulatorRef.current = accumulatorRef.current % FIXED_STEP_SECONDS;
        }

        if (anyInventoryChange) {
          refreshSnapshot();
        }

        rafRef.current = window.requestAnimationFrame(frame);
      };

      rafRef.current = window.requestAnimationFrame(frame);

      setLoaderVisible(false);
      fadeTimerRef.current = window.setTimeout(() => {
        setLoaderMounted(false);
      }, FADE_MS);
    }

    loadGame();

    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
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