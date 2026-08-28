import type { BuildingGroupInstance } from "pkg/overseer";
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

interface AvailableBuilding {
  name: string;
  processOptions: string[];
}

export interface BuildingListProps {
  availableBuildings: AvailableBuilding[];
  builtBuildings: BuildingGroupInstance[];
  filteredBuildings: BuildingGroupInstance[];
  sectionLabel: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortState: SortState<BuildingGroupInstance>;
  onSortStateChange: (next: SortState<BuildingGroupInstance>) => void;
  sortConfig: SortConfig<BuildingGroupInstance>;
  onBuild: (buildingName: string, processName: string) => void;
  onChangeCount: (buildingName: string, processName: string, delta: number) => void;
  emptyBuiltMessage: string;
  emptySearchMessage: string;
}

export function BuildingList({
  availableBuildings,
  builtBuildings,
  filteredBuildings,
  sectionLabel,
  searchQuery,
  onSearchQueryChange,
  sortState,
  onSortStateChange,
  sortConfig,
  onBuild,
  onChangeCount,
  emptyBuiltMessage,
  emptySearchMessage,
}: BuildingListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Build /> Build
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{sectionLabel}</DropdownMenuLabel>
              {availableBuildings.map((building) => (
                <DropdownMenuSub key={building.name}>
                  <DropdownMenuSubTrigger>
                    {building.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel>
                        {building.name} Processes
                      </DropdownMenuLabel>
                      {building.processOptions.map((processName) => (
                        <DropdownMenuItem
                          key={processName}
                          onClick={() => onBuild(building.name, processName)}
                        >
                          {processName}
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
        <div className="flex flex-col gap-2">
          {filteredBuildings.map((buildingGroup) => (
            <BuildingCard
              key={`${buildingGroup.name}-${buildingGroup.process.name}`}
              buildingGroup={buildingGroup}
              increaseCount={() => onChangeCount(buildingGroup.name, buildingGroup.process.name, 1)}
              decreaseCount={() => onChangeCount(buildingGroup.name, buildingGroup.process.name, -1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
