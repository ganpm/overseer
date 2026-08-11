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
  SortController,
  type SortState,
  type SortConfigMap,
  sortDirectionMult,
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

export const OperationsView = () => {
  const { game, snapshot } = useGame();
  const availableGenerators = Object.values(game.data.buildings).filter((building) =>
    building.available_processes.some((processName) => {
      const process = game.data.processes[processName];
      return process.power_generation > 0;
    })
  );
  const availableProducers = Object.values(game.data.buildings).filter((building) =>
    building.available_processes.some((processName) => {
      const process = game.data.processes[processName];
      return process.power_consumption > 0;
    })
  );
  const constructedBuildings = snapshot.buildings.filter((building) => building.total_count > 0);
  const constructedGenerators = constructedBuildings.filter((building) => building.process.power_generation > 0);
  const constructedProducers = constructedBuildings.filter((building) => building.process.power_consumption > 0);
  const rawInventory = [...snapshot.inventory];

  const [searchQueryGenerator, setSearchQueryGenerator] = useState("");
  const [searchQueryProducer, setSearchQueryProducer] = useState("");
  const [searchQueryInventory, setSearchQueryInventory] = useState("");

  const [sortStateGenerator, setSortStateGenerator] = useState<SortState<BuildingGroupInstance>>({
    field: "building_name",
    direction: "ascending",
  });

  const sortConfigGenerator: SortConfigMap<BuildingGroupInstance> = new Map([
    ["building_name", {
      label: "Type",
      sortFn: (a, b) => a.building_name.localeCompare(b.building_name),
    }],
    ["total_count", {
      label: "Count",
      sortFn: (a, b) => a.total_count - b.total_count,
    }],
    ["process", {
      label: "Process",
      sortFn: (a, b) => a.process.process_name.localeCompare(b.process.process_name),
    }],
  ]);

  const [sortStateProducer, setSortStateProducer] = useState<SortState<BuildingGroupInstance>>({
    field: "building_name",
    direction: "ascending",
  });

  const sortConfigProducer: SortConfigMap<BuildingGroupInstance> = new Map([
    ["building_name", {
      label: "Type",
      sortFn: (a, b) => a.building_name.localeCompare(b.building_name),
    }],
    ["total_count", {
      label: "Count",
      sortFn: (a, b) => a.total_count - b.total_count,
    }],
    ["process", {
      label: "Process",
      sortFn: (a, b) => a.process.process_name.localeCompare(b.process.process_name),
    }],
  ]);

  const [sortStateInventory, setSortStateInventory] = useState<SortState<InventoryEntry>>({
    field: "resource",
    direction: "ascending",
  });

  const sortConfigInventory: SortConfigMap<InventoryEntry> = new Map([
    ["resource", {
      label: "Name",
      sortFn: (a, b) => a.resource.localeCompare(b.resource),
    }],
    ["amount", {
      label: "Amount",
      sortFn: (a, b) => a.amount - b.amount,
    }],
  ]);

  const generators = filterAndSort(constructedGenerators, {
    query: searchQueryGenerator,
    filters: [
      (building) => building.building_name,
      (building) => building.process.process_name,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: (a, b) => (sortConfigGenerator.get(sortStateGenerator.field)?.sortFn(a, b) ?? 0) * sortDirectionMult[sortStateGenerator.direction],
  });

  const producers = filterAndSort(constructedProducers, {
    query: searchQueryProducer,
    filters: [
      (building) => building.building_name,
      (building) => building.process.process_name,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: (a, b) => (sortConfigProducer.get(sortStateProducer.field)?.sortFn(a, b) ?? 0) * sortDirectionMult[sortStateProducer.direction],
  });

  const inventory = filterAndSort(rawInventory, {
    query: searchQueryInventory,
    filters: [
      (entry) => entry.resource,
    ],
    sortFn: (a, b) => (sortConfigInventory.get(sortStateInventory.field)?.sortFn(a, b) ?? 0) * sortDirectionMult[sortStateInventory.direction],
  });

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
                  <InputGroupAddon align="inline-end">{generators.length} results</InputGroupAddon>
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
                  {generators.map(({ building_name, process, total_count, active_count, idle_count }) => {
                    const isResourceProducer = process.outputs.length > 0;
                    const isResourceConsumer = process.inputs.length > 0;
                    const isPowerGenerator = process.power_generation > 0;
                    const isPowerConsumer = process.power_consumption > 0;
                    const utilization = total_count > 0 ? (active_count / total_count) * 100 : 0;
                    const efficiency = process.efficiency_percent;
                    return (
                      <Item variant="outline" key={`${building_name}-${process.process_name}`}>
                        <ItemContent>
                          <ItemTitle className="flex flex-col items-start">
                            <span>{building_name} &times; {total_count}</span>
                            <span className="text-xs text-muted-foreground">{process.process_name}</span>
                          </ItemTitle>
                          <ProgressBar
                            mode={(isResourceProducer || isResourceConsumer) ? "progress" : "continuous"}
                            value={(isResourceProducer || isResourceConsumer) ? process.progress_percent : 100}
                            duration={100*process.duration/process.efficiency_percent}
                            active={active_count > 0}
                          />
                          <ItemDescription className="flex flex-col">
                            {isResourceConsumer && (
                              <span className="flex items-center gap-1">
                                <Consumed size={16} className="inline-block" />
                                {process.inputs.map((input) => `-${input.amount * total_count} ${input.resource}`).join(", ")}
                              </span>
                            )}
                            {isResourceProducer && (
                              <span className="flex items-center gap-1">
                                <Produced size={16} className="inline-block" />
                                {process.outputs.map((output) => `+${output.amount * total_count} ${output.resource}`).join(", ")}
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
                                +{process.power_generation * total_count} MW
                              </span>
                            )}
                            {isPowerConsumer && (
                              <span className="flex items-center gap-1">
                                <Power size={16} className="inline-block" />
                                -{process.power_consumption * total_count} MW
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
                              <Active size={16} /> {active_count}/{total_count} Active
                              <Idle size={16} /> {idle_count}/{total_count} Idle
                            </span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            variant="outline"
                            onClick={() => game.addBuilding(building_name, process.process_name, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => game.addBuilding(building_name, process.process_name, -1)}
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
                  <InputGroupAddon align="inline-end">{producers.length} results</InputGroupAddon>
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
                  {producers.map(({ building_name, process, total_count, active_count, idle_count }) => {
                    const isResourceProducer = process.outputs.length > 0;
                    const isResourceConsumer = process.inputs.length > 0;
                    const isPowerGenerator = process.power_generation > 0;
                    const isPowerConsumer = process.power_consumption > 0;
                    const utilization = total_count > 0 ? (active_count / total_count) * 100 : 0;
                    const efficiency = process.efficiency_percent;
                    return (
                      <Item variant="outline" key={`${building_name}-${process.process_name}`}>
                        <ItemContent>
                          <ItemTitle className="flex flex-col items-start">
                            <span>{building_name} &times; {total_count}</span>
                            <span className="text-xs text-muted-foreground">{process.process_name}</span>
                          </ItemTitle>
                          <ProgressBar
                            mode={(isResourceProducer || isResourceConsumer) ? "progress" : "continuous"}
                            value={(isResourceProducer || isResourceConsumer) ? process.progress_percent : 100}
                            duration={100*process.duration/process.efficiency_percent}
                            active={active_count > 0}
                          />
                          <ItemDescription className="flex flex-col">
                            {isResourceConsumer && (
                              <span className="flex items-center gap-1">
                                <Consumed size={16} className="inline-block" />
                                {process.inputs.map((input) => `-${input.amount * total_count} ${input.resource}`).join(", ")}
                              </span>
                            )}
                            {isResourceProducer && (
                              <span className="flex items-center gap-1">
                                <Produced size={16} className="inline-block" />
                                {process.outputs.map((output) => `+${output.amount * total_count} ${output.resource}`).join(", ")}
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
                                +{process.power_generation * total_count} MW
                              </span>
                            )}
                            {isPowerConsumer && (
                              <span className="flex items-center gap-1">
                                <Power size={16} className="inline-block" />
                                -{process.power_consumption * total_count} MW
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
                              <Active size={16} /> {active_count}/{total_count} Active
                              <Idle size={16} /> {idle_count}/{total_count} Idle
                            </span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            variant="outline"
                            onClick={() => game.addBuilding(building_name, process.process_name, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => game.addBuilding(building_name, process.process_name, -1)}
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
                  <InputGroupAddon align="inline-end">{inventory.length} results</InputGroupAddon>
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