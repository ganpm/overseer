import { useState } from "react";
import type { Game } from "pkg/overseer";
import type { GameSnapshot } from "@/game/game-context.tsx";
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
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
  SortController,
  type SortState,
  type SortConfig,
  selectSortFn,
} from "@/components/sort-controller";
import {
  Plus,
  Minus,
  Zap as Power,
  PackageMinus as Consumed,
  PackagePlus as Produced,
  Timer as CycleTime,
  Activity,
  Gauge as Efficiency,
  ShieldCheck as Active,
  ShieldMinus as Idle,
  TriangleAlert as Warning,
  Search,
  Hammer as Build,
} from "lucide-react";
import { filterAndSort } from "@/lib/filter-sort";
import type { BuildingGroupInstance, InventoryEntry } from "pkg/overseer";

export interface ProductionOverviewProps {
  game: Game,
  snapshot: GameSnapshot,
}

export const ProductionOverview = ({
  game,
  snapshot,
}: ProductionOverviewProps) => {
  const availableGenerators = Object.values(game.data.buildings).filter((building) =>
    building.availableProcesses.some((processName) => {
      const process = game.data.processes[processName];
      return process.powerGeneration > 0;
    })
  );
  const availableProducers = Object.values(game.data.buildings).filter((building) =>
    building.availableProcesses.some((processName) => {
      const process = game.data.processes[processName];
      return process.powerConsumption > 0;
    })
  );
  const constructedBuildings = snapshot.buildings.filter((building) => building.totalCount > 0);
  const constructedGenerators = constructedBuildings.filter((building) => building.process.powerGeneration > 0);
  const constructedProducers = constructedBuildings.filter((building) => building.process.powerConsumption > 0);
  const rawInventory = [...snapshot.inventory];

  const [searchQueryGenerator, setSearchQueryGenerator] = useState("");
  const [searchQueryProducer, setSearchQueryProducer] = useState("");
  const [searchQueryInventory, setSearchQueryInventory] = useState("");

  const [sortStateGenerator, setSortStateGenerator] = useState<SortState<BuildingGroupInstance>>({
    field: "buildingName",
    direction: "ascending",
  });

  const sortConfigGenerator: SortConfig<BuildingGroupInstance> = {
    "buildingName": {
      label: "Type",
      sortFn: (a, b) => a.buildingName.localeCompare(b.buildingName),
    },
    "totalCount": {
      label: "Count",
      sortFn: (a, b) => a.totalCount - b.totalCount,
    },
    "process": {
      label: "Process",
      sortFn: (a, b) => a.process.processName.localeCompare(b.process.processName),
    },
  };

  const [sortStateProducer, setSortStateProducer] = useState<SortState<BuildingGroupInstance>>({
    field: "buildingName",
    direction: "ascending",
  });

  const sortConfigProducer: SortConfig<BuildingGroupInstance> = {
    "buildingName": {
      label: "Type",
      sortFn: (a, b) => a.buildingName.localeCompare(b.buildingName),
    },
    "totalCount": {
      label: "Count",
      sortFn: (a, b) => a.totalCount - b.totalCount,
    },
    "process": {
      label: "Process",
      sortFn: (a, b) => a.process.processName.localeCompare(b.process.processName),
    },
  };

  const [sortStateInventory, setSortStateInventory] = useState<SortState<InventoryEntry>>({
    field: "resource",
    direction: "ascending",
  });

  const sortConfigInventory: SortConfig<InventoryEntry> = {
    "resource": {
      label: "Name",
      sortFn: (a, b) => a.resource.localeCompare(b.resource),
    },
    "amount": {
      label: "Amount",
      sortFn: (a, b) => a.amount - b.amount,
    },
  };

  const generators = filterAndSort(constructedGenerators, {
    query: searchQueryGenerator,
    filters: [
      (building) => building.buildingName,
      (building) => building.process.processName,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: selectSortFn(sortConfigGenerator, sortStateGenerator),
  });

  const producers = filterAndSort(constructedProducers, {
    query: searchQueryProducer,
    filters: [
      (building) => building.buildingName,
      (building) => building.process.processName,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: selectSortFn(sortConfigProducer, sortStateProducer),
  });

  const inventory = filterAndSort(rawInventory, {
    query: searchQueryInventory,
    filters: [
      (entry) => entry.resource,
    ],
    sortFn: selectSortFn(sortConfigInventory, sortStateInventory),
  });

  return (
    <div className="flex flex-col gap-2 mt-4 mx-4 mb-16">
      <span className="font-heading text-base font-medium">
        Production
      </span>
      <Separator />
      <Accordion multiple defaultValue={["power-generators", "production-buildings", "inventory"]}>
        <AccordionItem value="power-generators">
          <AccordionTrigger>Power Generators ({constructedGenerators.length})</AccordionTrigger>
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
                                {building.availableProcesses.map(
                                  (process) => (
                                    <DropdownMenuItem
                                      key={process}
                                      onClick={() => game.addBuilding(building.name, process, 1)}
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
                    value={searchQueryGenerator}
                    onChange={(e) => setSearchQueryGenerator(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  {searchQueryGenerator.trim() !== "" && (
                    <InputGroupAddon align="inline-end">{generators.length} results</InputGroupAddon>
                  )}
                </InputGroup>
                <SortController
                  sortState={sortStateGenerator}
                  onChange={setSortStateGenerator}
                  config={sortConfigGenerator}
                />
              </div>
              {constructedGenerators.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No power generators built.
                </p>
              ) : generators.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No power generators match the search query.
                </p>
              ) : (
                <div className="space-y-2">
                  {generators.map(({ buildingName, process, totalCount, activeCount, idleCount }) => {
                    const isResourceProducer = process.outputs.length > 0;
                    const isResourceConsumer = process.inputs.length > 0;
                    const isPowerGenerator = process.powerGeneration > 0;
                    const isPowerConsumer = process.powerConsumption > 0;
                    const utilization = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
                    const efficiency = process.efficiencyPercent;
                    return (
                      <Item variant="outline" key={`${buildingName}-${process.processName}`} className="items-start">
                        <ItemContent>
                          <ItemTitle className="flex flex-col items-start">
                            <span>{buildingName} &times; {totalCount}</span>
                            <span className="text-xs text-muted-foreground">{process.processName}</span>
                          </ItemTitle>
                          <ProgressBar
                            mode={(process.duration > 0) ? "progress" : "continuous"}
                            value={(process.duration > 0) ? 100 * (process.duration - process.remainingSeconds)/process.duration : 100}
                            duration={100*process.duration/process.efficiencyPercent}
                            active={activeCount > 0}
                          />
                          <ItemDescription className="flex flex-col">
                            {isResourceConsumer && (
                              <span className="flex items-center gap-1">
                                <Consumed size={16} className="inline-block" />
                                {process.inputs.map((input) => `-${input.amount * totalCount} ${input.resource}`).join(", ")}
                              </span>
                            )}
                            {isResourceProducer && (
                              <span className="flex items-center gap-1">
                                <Produced size={16} className="inline-block" />
                                {process.outputs.map((output) => `+${output.amount * totalCount} ${output.resource}`).join(", ")}
                              </span>
                            )}
                            {(isResourceProducer || isResourceConsumer) && (
                              <span className="flex items-center gap-1">
                                <CycleTime size={16} className="inline-block" /> {process.duration}s
                              </span>
                            )}
                            {isPowerGenerator && (
                              <span className="flex items-center gap-1">
                                <Power size={16} className="inline-block" />
                                +{process.powerGeneration * totalCount} MW
                              </span>
                            )}
                            {isPowerConsumer && (
                              <span className="flex items-center gap-1">
                                <Power size={16} className="inline-block" />
                                -{process.powerConsumption * totalCount} MW
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Efficiency size={16} />
                              {efficiency.toFixed(0)}% Efficiency
                              {efficiency < 100 && (
                                <Warning size={16} className="text-warning" />
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity size={16} />{utilization.toFixed(0)}% Utilization
                              {utilization < 100 && (
                                <Warning size={16} className="text-warning" />
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Active size={16} /> {activeCount}/{totalCount} Active
                              <Idle size={16} /> {idleCount}/{totalCount} Idle
                            </span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className="gap-1">
                          <Button
                            variant="outline"
                            onClick={() => game.addBuilding(buildingName, process.processName, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => game.addBuilding(buildingName, process.processName, -1)}
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
          <AccordionTrigger>Production Buildings ({constructedProducers.length})</AccordionTrigger>
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
                                {building.availableProcesses.map(
                                  (process) => (
                                    <DropdownMenuItem
                                      key={process}
                                      onClick={() => game.addBuilding(building.name, process, 1)}
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
                    value={searchQueryProducer}
                    onChange={(e) => setSearchQueryProducer(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  {searchQueryProducer.trim() !== "" && (
                    <InputGroupAddon align="inline-end">{producers.length} results</InputGroupAddon>
                  )}
                </InputGroup>
                <SortController
                  sortState={sortStateProducer}
                  onChange={setSortStateProducer}
                  config={sortConfigProducer}
                />
              </div>
              {constructedProducers.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No production buildings built.
                </p>
              ) : producers.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  No production buildings match the search query.
                </p>
              ) : (
                <div className="space-y-2">
                  {producers.map(({ buildingName, process, totalCount, activeCount, idleCount }) => {
                    const isResourceProducer = process.outputs.length > 0;
                    const isResourceConsumer = process.inputs.length > 0;
                    const isPowerGenerator = process.powerGeneration > 0;
                    const isPowerConsumer = process.powerConsumption > 0;
                    const utilization = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
                    const efficiency = process.efficiencyPercent;
                    return (
                      <Item variant="outline" key={`${buildingName}-${process.processName}`} className="items-start">
                        <ItemContent>
                          <ItemTitle className="flex flex-col items-start">
                            <span>{buildingName} &times; {totalCount}</span>
                            <span className="text-xs text-muted-foreground">{process.processName}</span>
                          </ItemTitle>
                          <ProgressBar
                            mode={(process.duration > 0) ? "progress" : "continuous"}
                            value={(process.duration > 0) ? 100 * (process.duration - process.remainingSeconds)/process.duration : 100}
                            duration={100*process.duration/process.efficiencyPercent}
                            active={activeCount > 0}
                          />
                          <ItemDescription className="flex flex-col">
                            {isResourceConsumer && (
                              <span className="flex items-center gap-1">
                                <Consumed size={16} className="inline-block" />
                                {process.inputs.map((input) => `-${input.amount * totalCount} ${input.resource}`).join(", ")}
                              </span>
                            )}
                            {isResourceProducer && (
                              <span className="flex items-center gap-1">
                                <Produced size={16} className="inline-block" />
                                {process.outputs.map((output) => `+${output.amount * totalCount} ${output.resource}`).join(", ")}
                              </span>
                            )}
                            {(isResourceProducer || isResourceConsumer) && (
                              <span className="flex items-center gap-1">
                                <CycleTime size={16} className="inline-block" /> {process.duration}s
                              </span>
                            )}
                            {isPowerGenerator && (
                              <span className="flex items-center gap-1">
                                <Power size={16} className="inline-block" />
                                +{process.powerGeneration * totalCount} MW
                              </span>
                            )}
                            {isPowerConsumer && (
                              <span className="flex items-center gap-1">
                                <Power size={16} className="inline-block" />
                                -{process.powerConsumption * totalCount} MW
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Efficiency size={16} />
                              {efficiency.toFixed(0)}% Efficiency
                              {efficiency < 100 && (
                                <Warning size={16} />
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity size={16} />{utilization.toFixed(0)}% Utilization
                              {utilization < 100 && (
                                <Warning size={16} className="text-warning" />
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Active size={16} /> {activeCount}/{totalCount} Active
                              <Idle size={16} /> {idleCount}/{totalCount} Idle
                            </span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions className="gap-1">
                          <Button
                            variant="outline"
                            onClick={() => game.addBuilding(buildingName, process.processName, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => game.addBuilding(buildingName, process.processName, -1)}
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
          <AccordionTrigger>Inventory ({inventory.length})</AccordionTrigger>
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
                  {searchQueryInventory.trim() !== "" && (
                    <InputGroupAddon align="inline-end">{inventory.length} results</InputGroupAddon>
                  )}
                </InputGroup>
                <SortController
                  sortState={sortStateInventory}
                  onChange={setSortStateInventory}
                  config={sortConfigInventory}
                />
              </div>
              {inventory.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  Inventory is empty.
                </p>
              ) : inventory.length === 0 ? (
                <p className="flex justify-center text-muted-foreground my-5">
                  Nothing in inventory matches the search query.
                </p>
              ) : (
                <div className="space-y-2">
                  {inventory.map(({ resource, amount }) =>
                    <Item variant="outline" key={resource}>
                      <ItemContent>
                        <ItemTitle>{resource}</ItemTitle>
                      </ItemContent>
                      <ItemActions>
                        <span>{amount}</span>
                      </ItemActions>
                    </Item>
                  )}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};