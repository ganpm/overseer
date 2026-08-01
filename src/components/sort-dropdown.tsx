import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown as SortIcon,
  ArrowDownAZ as AscendingNameIcon,
  ArrowDownZA as DescendingNameIcon,
  ArrowDown01 as AscendingCountIcon,
  ArrowDown10 as DescendingCountIcon,
} from "lucide-react";

export type SortOption = "name-ascending" | "name-descending" | "count-ascending" | "count-descending";

export interface SortDropdownProps {
  sort: SortOption;
  setSort: (sort: SortOption) => void;
}

const sortIcons = {
  "name-ascending": <AscendingNameIcon />,
  "name-descending": <DescendingNameIcon />,
  "count-ascending": <AscendingCountIcon />,
  "count-descending": <DescendingCountIcon />,
};

const sortOptions = [
  { value: "name-ascending", label: "A-Z", icon: <AscendingNameIcon /> },
  { value: "name-descending", label: "Z-A", icon: <DescendingNameIcon /> },
  { value: "count-ascending", label: "0-1", icon: <AscendingCountIcon /> },
  { value: "count-descending", label: "1-0", icon: <DescendingCountIcon /> },
];

export function sortFunction(a: [string, number], b: [string, number], sortOption: SortOption) {
  const [aName, aCount] = a;
  const [bName, bCount] = b;
  switch (sortOption) {
    case "name-ascending":
      return aName.localeCompare(bName);
    case "name-descending":
      return bName.localeCompare(aName);
    case "count-ascending":
      return aCount - bCount;
    case "count-descending":
      return bCount - aCount;
    default:
      return 0;
  }
};

export function SortDropdown({
  sort,
  setSort
}: SortDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {sortIcons[sort] || <SortIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
                {option.icon}
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}