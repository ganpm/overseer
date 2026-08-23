import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/components/ui/item";
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
  );
}