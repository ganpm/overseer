import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Fragment } from "react";
import {
  SortController,
  type SortState,
  type SortConfig,
} from "@/components/sort-controller";
import { Search } from "lucide-react";
import type { InventoryEntry } from "pkg/overseer";

export interface InventoryListProps {
  inventory: InventoryEntry[];
  searchQueryInventory: string;
  setSearchQueryInventory: (value: string) => void;
  sortStateInventory: SortState<InventoryEntry>;
  setSortStateInventory: (next: SortState<InventoryEntry>) => void;
  sortConfigInventory: SortConfig<InventoryEntry>;
}

export function InventoryList({
  inventory,
  searchQueryInventory,
  setSearchQueryInventory,
  sortStateInventory,
  setSortStateInventory,
  sortConfigInventory,
}: InventoryListProps) {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="flex gap-2">
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
        <div className="grid grid-cols-[1fr_auto] gap-3 bg-card shadow-md rounded-md border border-border p-3">
          <div className="flex border-b border-border items-center justify-start">
            <span className="text-muted-foreground text-xs">
              Resource
            </span>
          </div>
          <div className="flex border-b border-border items-center justify-center">
            <span className="text-muted-foreground text-xs">
              Amount
            </span>
          </div>
          {inventory.map(({ resource, amount }) => (
            <Fragment key={resource}>
              <div className="flex border-b border-border items-center justify-start">
                <span>
                  {resource}
                </span>
              </div>
              <div className="flex border-b border-border items-center justify-end">
                <span className="font-medium">
                  {amount}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}