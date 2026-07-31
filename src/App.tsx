import { useGame } from "@/game/game-context.tsx";
import {
  Menubar,
  MenubarMenu,
  MenubarItem,
} from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import {
  Rewind as Slowest,
  SkipBack as Slow,
  Pause,
  SkipForward as Fast,
  FastForward as Fastest,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

export const App = () => {
  const { game } = useGame();

  return (
    <div>
      <Menubar className="flex justify-end">
        <MenubarMenu>
          <MenubarItem className="cursor-pointer hover:bg-muted">
            <Slowest size={16} />
          </MenubarItem>
          <MenubarItem className="cursor-pointer hover:bg-muted">
            <Slow size={16} />
          </MenubarItem>
          <MenubarItem className="cursor-pointer hover:bg-muted">
            <Pause size={16} />
          </MenubarItem>
          <MenubarItem className="cursor-pointer hover:bg-muted">
            <Fast size={16} />
          </MenubarItem>
          <MenubarItem className="cursor-pointer hover:bg-muted">
            <Fastest size={16} />
          </MenubarItem>
        </MenubarMenu>
      </Menubar>
      <div
        className={cn(
          "flex flex-col items-start justify-center",
          "mx-5 my-2"
        )}
      >
        <Button onClick={() => console.log(game.get_catalog())}>
          Log Catalog
        </Button>
        <Button onClick={() => console.log(game.get_inventory())}>
          Log Current Inventory
        </Button>
        <Button onClick={() => console.log(game.get_buildings())}>
          Log Current Buildings
        </Button>
      </div>
    </div>
  );
};