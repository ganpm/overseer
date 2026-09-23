import type { BuildingGroupInstance } from "pkg/overseer";
import { useGameStore } from "@/context/game";
import { Button } from "@/components/ui/button";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  SortController,
  type SortState,
  type SortConfig,
} from "@/components/sort-controller";
import {
  Search,
  Hammer as Build,
} from "lucide-react";
import { BuildingCard } from "@/features/production/building-card";
import { ProcessCard } from "@/features/production/process-card";

interface AvailableBuilding {
  name: string;
  processOptions: string[];
}

export interface BuildingListProps {
  availableBuildings: AvailableBuilding[];
  builtBuildings: BuildingGroupInstance[];
  filteredBuildings: BuildingGroupInstance[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortState: SortState<BuildingGroupInstance>;
  onSortStateChange: (next: SortState<BuildingGroupInstance>) => void;
  sortConfig: SortConfig<BuildingGroupInstance>;
  emptyBuiltMessage: string;
  emptySearchMessage: string;
}

export function BuildingList({
  availableBuildings,
  builtBuildings,
  filteredBuildings,
  searchQuery,
  onSearchQueryChange,
  sortState,
  onSortStateChange,
  sortConfig,
  emptyBuiltMessage,
  emptySearchMessage,
}: BuildingListProps) {
  const store = useGameStore();

  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Build /> Build
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                Select Building
              </DropdownMenuLabel>
              {availableBuildings.map((building) => (
                <DropdownMenuSub key={building.name}>
                  <DropdownMenuSubTrigger>
                    {building.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-90">
                      <DropdownMenuLabel>
                        Select Process
                      </DropdownMenuLabel>
                      {building.processOptions.map((processName) => (
                        <DropdownMenuItem
                          key={processName}
                          onClick={() => store.mutate(game => game.addBuilding(building.name, processName, 1))}
                        >
                          <ProcessCard process={store.getGame().data.processes[processName]} />
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <InputGroup>
          <InputGroupInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          {searchQuery.trim() !== "" && (
            <InputGroupAddon align="inline-end">{filteredBuildings.length} results</InputGroupAddon>
          )}
        </InputGroup>
        <SortController
          sortState={sortState}
          onChange={onSortStateChange}
          config={sortConfig}
        />
      </div>
      {builtBuildings.length === 0 ? (
        <p className="flex justify-center text-muted-foreground my-5">
          {emptyBuiltMessage}
        </p>
      ) : filteredBuildings.length === 0 ? (
        <p className="flex justify-center text-muted-foreground my-5">
          {emptySearchMessage}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBuildings.map((buildingGroup) => (
            <BuildingCard
              key={`${buildingGroup.name}-${buildingGroup.process.name}`}
              buildingGroup={buildingGroup}
              increaseCount={() => store.mutate(game => game.addBuilding(buildingGroup.name, buildingGroup.process.name, 1))}
              decreaseCount={() => store.mutate(game => game.addBuilding(buildingGroup.name, buildingGroup.process.name, -1))}
              setEnabled={() => store.mutate(game => game.setBuildingEnabled(buildingGroup.name, buildingGroup.process.name, !buildingGroup.enabled))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
