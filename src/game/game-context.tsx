import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import init, * as game from "../../pkg/overseer.js";
import gameData from "@/game/game-data.json";

import { Spinner } from "@/components/ui/spinner.js";

type GameExports = typeof game;
type GameInstance = InstanceType<typeof game.Game>;

interface GameContextValue {
  wasm: GameExports;
  game: GameInstance;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [gameContextValue, setGameContextValue] = useState<GameContextValue | null>(null);

  useEffect(() => {
    async function loadGame() {
      await init();

      const engine = new game.Game();
      engine.load_catalog(gameData);

      setGameContextValue({
        wasm: game,
        game: engine,
      });
    }
    loadGame();
  }, []);

  if (!gameContextValue) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="size-8" />
      </div> 
    );
  }

  return (
    <GameContext.Provider value={gameContextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}