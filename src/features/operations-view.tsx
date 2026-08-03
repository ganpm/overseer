import { useState } from "react";
import { useGame } from "@/game/game-context.tsx";
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
import { ProgressBar } from "@/components/progress-bar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  type SortOption,
  SortDropdown,
  sortFunction,
} from "@/components/sort-dropdown";
import {
  Plus,
  Minus,
  Zap as Power,
  PackageMinus as Consumed,
  PackagePlus as Produced,
  Timer as CycleTime,
  TrendingUp as Efficiency,
  Search,
  Hammer as Build,
} from "lucide-react";
import { matchesSearch } from "@/lib/matches-search"

export const OperationsView = () => {
  const { game, snapshot, actions } = useGame();
  const processProgressKey = (buildingName: string, processName: string) => `${buildingName}::${processName}`;
  const catalog = game.get_catalog();
  const availableGenerators = catalog.buildings.filter((building) =>
    building.available_processes.some((processName) => {
      const process = game.get_process(processName);
      return process.power_generation > 0;
    })
  );
  const availableProducers = catalog.buildings.filter((building) =>
    building.available_processes.some((processName) => {
      const process = game.get_process(processName);
      return process.power_consumption > 0;
    })
  );
  const constructedBuildings = Array.from(snapshot.buildings.entries()).filter(([_, count]) => count > 0);
  const constructedGenerators = constructedBuildings.filter(([[_buildingName, processName], _count]) => {
    const process = game.get_process(processName);
    return process.power_generation > 0;
  });
  const constructedProducers = constructedBuildings.filter(([[_buildingName, processName], _count]) => {
    const process = game.get_process(processName);
    return process.power_consumption > 0;
  });
  const inventory = Array.from(snapshot.inventory.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const [searchQueryPower, setSearchQueryPower] = useState("");
  const [searchQueryProd, setSearchQueryProd] = useState("");
  const [searchQueryInventory, setSearchQueryInventory] = useState("");

  const [sortOptionPower, setSortOptionPower] = useState<SortOption>("name-ascending");
  const applySortOptionPower = (newSortOption: SortOption) => {
    setSortOptionPower(newSortOption);
  }
  const [sortOptionProd, setSortOptionProd] = useState<SortOption>("name-ascending");
  const applySortOptionProd = (newSortOption: SortOption) => {
    setSortOptionProd(newSortOption);
  }
  const [sortOptionInventory, setSortOptionInventory] = useState<SortOption>("name-ascending");
  const applySortOptionInventory = (newSortOption: SortOption) => {
    setSortOptionInventory(newSortOption);
  }

  const filteredGenerators = constructedGenerators.filter(([[buildingName, processName], _count]) => {
    const query = searchQueryPower.trim().toLowerCase();
    if (!query) return true;
    const process = game.get_process(processName);
    return buildingName.toLowerCase().includes(query)
      || matchesSearch(process, query, [
        (u) => u.name,
        (u) => u.inputs.map((input) => input.resource).join(" "),
        (u) => u.outputs.map((output) => output.resource).join(" "),
      ]);
  });
  const filteredProducers = constructedProducers.filter(([[buildingName, processName], _count]) => {
    const query = searchQueryPower.trim().toLowerCase();
    if (!query) return true;
    const process = game.get_process(processName);
    return buildingName.toLowerCase().includes(query)
      || matchesSearch(process, query, [
        (u) => u.name,
        (u) => u.inputs.map((input) => input.resource).join(" "),
        (u) => u.outputs.map((output) => output.resource).join(" "),
      ])
  });
  const filteredInventory = inventory.filter(([resourceName, _amount]) => {
    const query = searchQueryInventory.trim().toLowerCase();
    if (!query) return true;
    return resourceName.toLowerCase().includes(query);
  });

  const sortedGenerators = [...filteredGenerators].sort(([[aBuilding, _aProcess], aCount], [[bBuilding, _bProcess], bCount]) => sortFunction([aBuilding, aCount], [bBuilding, bCount], sortOptionPower));
  const sortedProducers = [...filteredProducers].sort(([[aBuilding, _aProcess], aCount], [[bBuilding, _bProcess], bCount]) => sortFunction([aBuilding, aCount], [bBuilding, bCount], sortOptionProd));
  const sortedInventory = [...filteredInventory].sort((a, b) => sortFunction(a, b, sortOptionInventory));

  return (
    <div className="flex flex-col mt-4 mb-10 mx-4">
      <Accordion multiple defaultValue={["power-generators", "production-buildings", "inventory"]}>
        <AccordionItem value="power-generators">
          <AccordionTrigger>Power Generators</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button />}>
                    <Build /> Build
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Power Generators</DropdownMenuLabel>
                      {availableGenerators.map(
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
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search..."
                    value={searchQueryPower}
                    onChange={(e) => setSearchQueryPower(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">{sortedGenerators.length} results</InputGroupAddon>
                </InputGroup>
                <SortDropdown sort={sortOptionPower} setSort={applySortOptionPower} />
              </div>
              {constructedGenerators.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No power generators built.
                </p>
              ) : sortedGenerators.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No power generators match the search query.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedGenerators.map(([[buildingName, processName], count]) => {
                    const process = game.get_process(processName);
                    const progress = snapshot.processProgress.get(processProgressKey(buildingName, processName));
                    const activeCount = progress?.active_count ?? count;
                    const totalCount = progress?.total_count ?? count;
                    const running = activeCount > 0;
                    return (
                      <Item variant="outline" key={`${buildingName}-${processName}`}>
                        <ItemContent>
                          <ItemTitle className="flex flex-col items-start">
                            <span>{buildingName} &times; {count}</span>
                            <span className="text-xs text-muted-foreground">{processName}</span>
                          </ItemTitle>
                          <ProgressBar mode="continuous" value={100} active={running} />
                          <ItemDescription className="flex flex-col">
                            {process.power_generation > 0 && (
                              <span>
                                <Power size={14} className="inline-block" /> +{process.power_generation * count} MW
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Efficiency size={16} /> {running ? "Online" : "Offline"} ({activeCount}/{totalCount} running)
                            </span>
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
                            onClick={() => actions.removeBuilding(buildingName, processName, 1)}
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
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="production-buildings">
          <AccordionTrigger>Production Buildings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button />}>
                    <Build /> Build
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Production Buildings</DropdownMenuLabel>
                      {availableProducers.map(
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
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search..."
                    value={searchQueryProd}
                    onChange={(e) => setSearchQueryProd(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">{sortedProducers.length} results</InputGroupAddon>
                </InputGroup>
                <SortDropdown sort={sortOptionProd} setSort={applySortOptionProd} />
              </div>
              {constructedProducers.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No production buildings built.
                </p>
              ) : sortedProducers.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No production buildings match the search query.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedProducers.map(([[buildingName, processName], count]) => {
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
                          <ProgressBar value={progressPercent} />
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
                            onClick={() => actions.removeBuilding(buildingName, processName, 1)}
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
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="inventory">
          <AccordionTrigger>Inventory</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex gap-1">
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search..."
                    value={searchQueryInventory}
                    onChange={(e) => setSearchQueryInventory(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">{sortedInventory.length} results</InputGroupAddon>
                </InputGroup>
                <SortDropdown sort={sortOptionInventory} setSort={applySortOptionInventory} />
              </div>
              {inventory.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  Inventory is empty.
                </p>
              ) : sortedInventory.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  Nothing in inventory matches the search query.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedInventory.map(([resourceName, amount]) => (
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};