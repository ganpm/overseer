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
  SortDropdown,
} from "@/components/sort-dropdown";
import type { SortOption } from "@/components/sort-dropdown";
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
import {
  ArrowDownAZ as AscendingNameIcon,
  ArrowDownZA as DescendingNameIcon,
  ArrowDown01 as AscendingCountIcon,
  ArrowDown10 as DescendingCountIcon,
} from "lucide-react";
import { filterAndSort } from "@/lib/filter-sort";

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

  type SortOptionsBuildings = "name-ascending" | "name-descending" | "count-ascending" | "count-descending";

  const sortOptionsBuildings: readonly SortOption<SortOptionsBuildings>[] = [
    { value: "name-ascending", label: "A-Z", icon: <AscendingNameIcon /> },
    { value: "name-descending", label: "Z-A", icon: <DescendingNameIcon /> },
    { value: "count-ascending", label: "0-1", icon: <AscendingCountIcon /> },
    { value: "count-descending", label: "1-0", icon: <DescendingCountIcon /> },
  ];

  type SortOptionsInventory = "name-ascending" | "name-descending" | "amount-ascending" | "amount-descending";

  const sortOptionsInventory: readonly SortOption<SortOptionsInventory>[] = [
    { value: "name-ascending", label: "A-Z", icon: <AscendingNameIcon /> },
    { value: "name-descending", label: "Z-A", icon: <DescendingNameIcon /> },
    { value: "amount-ascending", label: "0-1", icon: <AscendingCountIcon /> },
    { value: "amount-descending", label: "1-0", icon: <DescendingCountIcon /> },
  ]

  const [sortOptionGenerator, setSortOptionGenerator] = useState<SortOptionsBuildings>("name-ascending");
  const [sortOptionProducer, setSortOptionProducer] = useState<SortOptionsBuildings>("name-ascending");
  const [sortOptionInventory, setSortOptionInventory] = useState<SortOptionsInventory>("name-ascending");

  const generators = filterAndSort(constructedGenerators, {
    query: searchQueryGenerator,
    filters: [
      (building) => building.building_name,
      (building) => building.process.process_name,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: (a, b) => {
      switch (sortOptionGenerator) {
        case "name-ascending":
          return a.building_name.localeCompare(b.building_name);
        case "name-descending":
          return b.building_name.localeCompare(a.building_name);
        case "count-ascending":
          return a.total_count - b.total_count;
        case "count-descending":
          return b.total_count - a.total_count;
        default:
          return 0;
      }
    },
  });

  const producers = filterAndSort(constructedProducers, {
    query: searchQueryProducer,
    filters: [
      (building) => building.building_name,
      (building) => building.process.process_name,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: (a, b) => {
      switch (sortOptionProducer) {
        case "name-ascending":
          return a.building_name.localeCompare(b.building_name);
        case "name-descending":
          return b.building_name.localeCompare(a.building_name);
        case "count-ascending":
          return a.total_count - b.total_count;
        case "count-descending":
          return b.total_count - a.total_count;
        default:
          return 0;
      }
    },
  });

  const inventory = filterAndSort(rawInventory, {
    query: searchQueryInventory,
    filters: [
      (entry) => entry.resource,
    ],
    sortFn: (a, b) => {
      switch (sortOptionInventory) {
        case "name-ascending":
          return a.resource.localeCompare(b.resource);
        case "name-descending":
          return b.resource.localeCompare(a.resource);
        case "amount-ascending":
          return a.amount - b.amount;
        case "amount-descending":
          return b.amount - a.amount;
        default:
          return 0;
      }
    },
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
                <SortDropdown
                  sort={sortOptionGenerator}
                  setSort={setSortOptionGenerator}
                  sortOptions={sortOptionsBuildings}
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
                  {generators.map(({ building_name, active_count, process, total_count }) => 
                    <Item variant="outline" key={`${building_name}-${process.process_name}`}>
                      <ItemContent>
                        <ItemTitle className="flex flex-col items-start">
                          <span>{building_name} &times; {total_count}</span>
                          <span className="text-xs text-muted-foreground">{process.process_name}</span>
                        </ItemTitle>
                        <ProgressBar mode="continuous" value={100} active={active_count > 0} />
                        <ItemDescription className="flex flex-col">
                          {process.power_generation > 0 && (
                            <span className="flex items-center gap-1">
                              <Power size={16} className="inline-block" />
                              +{process.power_generation * total_count} MW
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Efficiency size={16} />
                            {active_count > 0 ? "Online" : "Offline"} ({active_count}/{total_count} running)
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
                  )}
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
                <SortDropdown
                  sort={sortOptionProducer}
                  setSort={setSortOptionProducer}
                  sortOptions={sortOptionsBuildings}
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
                  {producers.map(({building_name, active_count, process, total_count}) => {
                    return (
                      <Item variant="outline" key={`${building_name}-${process.process_name}`}>
                        <ItemContent>
                          <ItemTitle className="flex flex-col items-start">
                            <span>{building_name} &times; {total_count}</span>
                            <span className="text-xs text-muted-foreground">{process.process_name}</span>
                          </ItemTitle>
                          <ProgressBar value={process.progress_percent} />
                          <ItemDescription className="flex flex-col">
                            {process.inputs.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Consumed size={16} className="inline-block" />
                                {process.inputs.map((input) => `-${input.amount * total_count} ${input.resource}`).join(", ")}
                              </span>
                            )}
                            {process.outputs.length > 0 && (
                              process.outputs.map((output) => (
                                <span key={`${building_name}-${process.process_name}-${output.resource}`} className="flex items-center gap-1">
                                  <Produced size={16} className="inline-block" /> +{output.amount * total_count} {output.resource}
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
                                <Power size={16} className="inline-block" /> -{process.power_consumption * total_count} MW
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Efficiency size={16} /> {process.efficiency_percent}% efficiency ({active_count}/{total_count} running)
                            </span>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => game.addBuilding(building_name, process.process_name, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            size="sm"
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
                <SortDropdown
                  sort={sortOptionInventory}
                  setSort={setSortOptionInventory}
                  sortOptions={sortOptionsInventory}
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
                  {inventory.map(({ resource, amount}) => (
                    <Item variant="outline" key={resource}>
                      <ItemContent>
                        <ItemTitle>{resource}</ItemTitle>
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