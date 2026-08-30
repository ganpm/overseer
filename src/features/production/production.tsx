import { useState } from "react";
import {
  useCatalog,
  useGameSnapshot,
} from "@/game/game-hooks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  type SortState,
  type SortConfig,
  selectSortFn,
} from "@/components/sort-controller";
import { filterAndSort } from "@/lib/filter-sort";
import type { BuildingGroupInstance, InventoryEntry } from "pkg/overseer";
import { BuildingList } from "@/features/production/building-list";
import { InventoryList } from "@/features/production/inventory-list";


export const ProductionOverview = () => {
  const catalog = useCatalog();
  const snapshot = useGameSnapshot();

  const availableGenerators = catalog.generationBuildings;
  const availableProducers = catalog.productionBuildings;
  const constructedBuildings = snapshot.buildings.filter((building) => building.totalCount > 0);
  const constructedGenerators = constructedBuildings.filter((building) => building.process.powerGeneration > 0);
  const constructedProducers = constructedBuildings.filter((building) => building.process.powerConsumption > 0);
  const rawInventory = [...snapshot.inventory];

  const [searchQueryGenerator, setSearchQueryGenerator] = useState("");
  const [searchQueryProducer, setSearchQueryProducer] = useState("");
  const [searchQueryInventory, setSearchQueryInventory] = useState("");

  const sortConfigBuildings: SortConfig<BuildingGroupInstance> = {
    "name": {
      label: "Type",
      sortFn: (a, b) => a.name.localeCompare(b.name),
    },
    "totalCount": {
      label: "Count",
      sortFn: (a, b) => a.totalCount - b.totalCount,
    },
    "process": {
      label: "Process",
      sortFn: (a, b) => a.process.name.localeCompare(b.process.name),
    },
  };

  const [sortStateGenerator, setSortStateGenerator] = useState<SortState<BuildingGroupInstance>>({
    field: "name",
    direction: "ascending",
  });

  const [sortStateProducer, setSortStateProducer] = useState<SortState<BuildingGroupInstance>>({
    field: "name",
    direction: "ascending",
  });

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
      (building) => building.name,
      (building) => building.process.name,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: selectSortFn(sortConfigBuildings, sortStateGenerator),
  });

  const producers = filterAndSort(constructedProducers, {
    query: searchQueryProducer,
    filters: [
      (building) => building.name,
      (building) => building.process.name,
      (building) => building.process.inputs.map((input) => input.resource).join(" "),
      (building) => building.process.outputs.map((output) => output.resource).join(" "),
    ],
    sortFn: selectSortFn(sortConfigBuildings, sortStateProducer),
  });

  const inventory = filterAndSort(rawInventory, {
    query: searchQueryInventory,
    filters: [
      (entry) => entry.resource,
    ],
    sortFn: selectSortFn(sortConfigInventory, sortStateInventory),
  });

  return (
    <Accordion multiple defaultValue={["power-generators", "production-buildings", "inventory"]}>
      <AccordionItem value="power-generators">
        <AccordionTrigger>Power Generators ({constructedGenerators.length})</AccordionTrigger>
        <AccordionContent>
          <BuildingList
            availableBuildings={availableGenerators}
            builtBuildings={constructedGenerators}
            filteredBuildings={generators}
            sectionLabel="Power Generators"
            searchQuery={searchQueryGenerator}
            onSearchQueryChange={setSearchQueryGenerator}
            sortState={sortStateGenerator}
            onSortStateChange={setSortStateGenerator}
            sortConfig={sortConfigBuildings}
            emptyBuiltMessage="No power generators built."
            emptySearchMessage="No power generators match the search query."
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="production-buildings">
        <AccordionTrigger>Production Buildings ({constructedProducers.length})</AccordionTrigger>
        <AccordionContent>
          <BuildingList
            availableBuildings={availableProducers}
            builtBuildings={constructedProducers}
            filteredBuildings={producers}
            sectionLabel="Production Buildings"
            searchQuery={searchQueryProducer}
            onSearchQueryChange={setSearchQueryProducer}
            sortState={sortStateProducer}
            onSortStateChange={setSortStateProducer}
            sortConfig={sortConfigBuildings}
            emptyBuiltMessage="No production buildings built."
            emptySearchMessage="No production buildings match the search query."
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="inventory">
        <AccordionTrigger>Inventory ({inventory.length})</AccordionTrigger>
        <AccordionContent>
          <InventoryList
            inventory={inventory}
            searchQueryInventory={searchQueryInventory}
            setSearchQueryInventory={setSearchQueryInventory}
            sortStateInventory={sortStateInventory}
            setSortStateInventory={setSortStateInventory}
            sortConfigInventory={sortConfigInventory}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};