import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDownWideNarrow as DescendingIcon,
  ArrowUpNarrowWide as AscendingIcon,
  ListFilter as SortIcon,
} from "lucide-react";

export type SortDirection = "ascending" | "descending";

export interface SortState<T> {
  field: keyof T & string;
  direction: SortDirection;
}

export interface SortConfig<T> {
  label: string;
  sortFn: (a: T, b: T) => number;
}

export const sortDirectionMult: Record<SortDirection, number> = {
  ascending: 1,
  descending: -1,
};

export type SortConfigMap<T> = Map<keyof T & string, SortConfig<T>>;

export interface SortControllerProps<T> {
  sortState: SortState<T>;
  onChange: (next: SortState<T>) => void;
  config: SortConfigMap<T>;
}

export function SortController<T>({
  sortState,
  onChange,
  config,
}: SortControllerProps<T>) {

  const sortDirectionIcon: Record<SortDirection, React.JSX.Element> = {
    ascending: <AscendingIcon />,
    descending: <DescendingIcon />,
  };

  const toggleDirection: Record<SortDirection, SortDirection> = {
    ascending: "descending",
    descending: "ascending",
  };

  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        onClick={() => {
          onChange({
            ...sortState,
            direction: toggleDirection[sortState.direction],
          })
        }}
      >
        {sortDirectionIcon[sortState.direction]}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          <SortIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortState.field} onValueChange={(e) => {
              onChange({
                field: e as keyof T & string,
                direction: sortState.direction,
              })
            }}>
              {Array.from(config, ([value, { label }]) => (
                <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}