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
type GameInstance = Omit<InstanceType<typeof game.Game>, "get_inventory" | "get_buildings"> & {
  get_inventory(): Inventory;
  get_buildings(): Buildings;
};

interface GameContextValue {
  wasm: GameExports;
  game: GameInstance;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
}

const FADE_MS = 500;

export function GameProvider({ children }: GameProviderProps) {
  const [gameContextValue, setGameContextValue] = useState<GameContextValue | null>(null);

  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadGame() {
      await init();

      const engine = new game.Game();
      engine.load_catalog(gameData);

      setGameContextValue({
        wasm: game,
        game: engine as GameInstance,
      });

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