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
} from "lucide-react";

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
  icon: React.JSX.Element;
}

export interface SortDropdownProps<T extends string> {
  sort: T;
  setSort: (sort: T) => void;
  sortOptions: readonly SortOption<T>[];
}

export function SortDropdown<T extends string>({
  sort,
  setSort,
  sortOptions,
}: SortDropdownProps<T>) {
  const selectedOption = sortOptions.find((option) => option.value === sort);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {selectedOption?.icon ?? <SortIcon />}
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