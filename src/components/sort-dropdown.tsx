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
  ListSortDescending as SortIcon,
} from "lucide-react";

export interface SortDropdownProps<T extends string> {
  sort: T;
  setSort: (sort: T) => void;
  sortOptions: Map<T, { label: string; icon: React.JSX.Element, sortFn: (a: any, b: any) => number }>;
}

export function SortDropdown<T extends string>({
  sort,
  setSort,
  sortOptions,
}: SortDropdownProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <SortIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            {Array.from(sortOptions, ([value, { label, icon }]) => (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                {icon}
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}