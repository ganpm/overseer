import { useGame } from "@/game/game-context.tsx";
import {
  Menubar,
  MenubarMenu,
  MenubarItem,
} from "@/components/ui/menubar";
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import {
  Rewind as Slowest,
  SkipBack as Slow,
  Pause,
  SkipForward as Fast,
  FastForward as Fastest,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

export const App = () => {
  const { game, snapshot, actions } = useGame();
  const buildingRows = Array.from(snapshot.buildings.entries());
  const inventoryRows = Array.from(snapshot.inventory.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

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
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Add Building
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              {game.get_catalog().buildings.map(
                (building) => (
                  <DropdownMenuSub key={building.name}>
                    <DropdownMenuSubTrigger>
                      {building.name}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuLabel>
                          {building.name} Processes
                        </DropdownMenuLabel>
                        {building.available_processes.map(
                          (process) => (
                            <DropdownMenuItem
                              key={process}
                              onClick={() => actions.addBuilding(building.name, process, 1)}
                            >
                              {process}
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                )
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mt-4 w-full max-w-2xl">
          <h2 className="mb-2 text-sm font-semibold">Buildings</h2>
          {buildingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buildings yet.</p>
          ) : (
            <>
              {buildingRows.filter(([_, count]) => count > 0).map(([[buildingName, processName], count]) => (
                <Item variant="outline" key={`${buildingName}-${processName}`}>
                  <ItemContent>
                    <ItemTitle>
                      {buildingName} &times; {count}
                    </ItemTitle>
                    <ItemDescription>
                      {processName}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => actions.addBuilding(buildingName, processName, 1)}
                    >
                      <Plus />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => actions.addBuilding(buildingName, processName, -1)}
                    >
                      <Minus />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 w-full max-w-2xl">
          <h2 className="mb-2 text-sm font-semibold">Inventory</h2>
          {inventoryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inventory is empty.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {inventoryRows.map(([resourceName, amount]) => (
                <li key={resourceName}>
                  {resourceName}: {amount.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};