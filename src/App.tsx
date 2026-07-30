import { useGame } from "@/game/game-context.tsx";

export const App = () => {
  const { game } = useGame();

  return (
    <div>
      <button onClick={() => console.log(game.get_catalog())}>Log Catalog</button>
    </div>
  );
};