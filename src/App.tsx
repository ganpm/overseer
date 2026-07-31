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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import {
  Rewind as Slowest,
  SkipBack as Slow,
  Pause,
  SkipForward as Fast,
  FastForward as Fastest,
  Plus,
  Minus,
  Zap as Power,
  PackageMinus as Consumed,
  PackagePlus as Produced,
  Timer as CycleTime,
  TrendingUp as Efficiency,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

export const App = () => {
  const { game, snapshot, actions } = useGame();
  const processProgressKey = (buildingName: string, processName: string) => `${buildingName}::${processName}`;
  const catalog = game.get_catalog();
  const available_generators = catalog.buildings.filter((building) =>
    building.available_processes.some((processName) => {
      const process = game.get_process(processName);
      return process.power_generation > 0;
    })
  );
  const available_consumers = catalog.buildings.filter((building) =>
    building.available_processes.some((processName) => {
      const process = game.get_process(processName);
      return process.power_consumption > 0;
    })
  );
  const constructed_buildings = Array.from(snapshot.buildings.entries()).filter(([_, count]) => count > 0);
  const constructed_generators = constructed_buildings.filter(([[_buildingName, processName], _count]) => {
    const process = game.get_process(processName);
    return process.power_generation > 0;
  });
  const constructed_consumers = constructed_buildings.filter(([[_buildingName, processName], _count]) => {
    const process = game.get_process(processName);
    return process.power_consumption > 0;
  });
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
          <DropdownMenuTrigger render={<Button />}>
            Construct Building
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Power Generators</DropdownMenuLabel>
              {available_generators.map(
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
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Production Buildings</DropdownMenuLabel>
              {available_consumers.map(
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
          <h2 className="mb-2 text-sm font-semibold">Power Generators</h2>
          {constructed_generators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No power generators yet.</p>
          ) : (
            <div className="space-y-2">
              {constructed_generators.map(([[buildingName, processName], count]) => {
                const process = game.get_process(processName);
                return (
                  <Item variant="outline" key={`${buildingName}-${processName}`}>
                    <ItemContent>
                      <ItemTitle className="flex flex-col items-start">
                        <span>{buildingName} &times; {count}</span>
                        <span className="text-xs text-muted-foreground">{processName}</span>
                      </ItemTitle>
                      <Progress value={100} />
                      <ItemDescription className="flex flex-col">
                        {process.power_generation > 0 && (
                          <span>
                            <Power size={14} className="inline-block" /> +{process.power_generation * count} MW
                          </span>
                        )}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="outline"
                        onClick={() => actions.addBuilding(buildingName, processName, 1)}
                      >
                        <Plus />
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => actions.addBuilding(buildingName, processName, -1)}
                      >
                        <Minus />
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 w-full max-w-2xl">
          <h2 className="mb-2 text-sm font-semibold">Production Buildings</h2>
          {constructed_consumers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No production buildings yet.</p>
          ) : (
            <div className="space-y-2">
              {constructed_consumers.map(([[buildingName, processName], count]) => {
                const process = game.get_process(processName);
                const progress = snapshot.processProgress.get(processProgressKey(buildingName, processName));
                const progressPercent = progress?.progress_percent ?? 0;
                const activeCount = progress?.active_count ?? 0;
                const totalCount = progress?.total_count ?? count;
                const efficiencyPercent = Math.round(progress?.efficiency_percent ?? 100);
                return (
                  <Item variant="outline" key={`${buildingName}-${processName}`}>
                    <ItemContent>
                      <ItemTitle className="flex flex-col items-start">
                        <span>{buildingName} &times; {count}</span>
                        <span className="text-xs text-muted-foreground">{processName}</span>
                      </ItemTitle>
                      <Progress value={progressPercent} />
                      <ItemDescription className="flex flex-col">
                        {process.inputs.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Consumed size={16} className="inline-block" />
                            {process.inputs.map((input) => `-${input.amount * count} ${input.resource}`).join(", ")}
                          </span>
                        )}
                        {process.outputs.length > 0 && (
                          process.outputs.map((output) => (
                            <span key={`${buildingName}-${processName}-${output.resource}`} className="flex items-center gap-1">
                              <Produced size={16} className="inline-block" /> +{output.amount * count} {output.resource}
                            </span>
                          ))
                        )}
                        {process.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <CycleTime size={16} className="inline-block" /> {process.duration}s
                          </span>
                        )}
                        {process.power_consumption > 0 && (
                          <span className="flex items-center gap-1">
                            <Power size={16} className="inline-block" /> -{process.power_consumption * count} MW
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Efficiency size={16} /> {efficiencyPercent}% efficiency ({activeCount}/{totalCount} running)
                        </span>
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        size="sm"
                        variant="outline"
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
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 w-full max-w-2xl">
          <h2 className="mb-2 text-sm font-semibold">Inventory</h2>
          {inventoryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inventory is empty.</p>
          ) : (
            <div className="space-y-2">
              {inventoryRows.map(([resourceName, amount]) => (
                <Item variant="outline" key={resourceName}>
                  <ItemContent>
                    <ItemTitle>{resourceName}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <span>{amount}</span>
                  </ItemActions>
                </Item>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};