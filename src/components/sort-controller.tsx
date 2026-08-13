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

export type SortConfig<T> = Partial<
  Record<
    keyof T & string,
    { label: string; sortFn: (a: T, b: T) => number }
  >
>;

export function selectSortFn<T>(
  sortConfig: SortConfig<T>,
  sortState: SortState<T>,
): ((a: T, b: T) => number) | undefined {
  const sortFn = sortConfig[sortState.field]?.sortFn;
  if (!sortFn) return undefined;
  return (a: T, b: T) => {
    const result = sortFn(a, b);
    return sortState.direction === "ascending" ? result : -result;
  };
}

export function entries<T extends object>(
  obj: T
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

export interface SortControllerProps<T> {
  sortState: SortState<T>;
  onChange: (next: SortState<T>) => void;
  config: SortConfig<T>;
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
              {entries(config).map(([value, option]) => (
                <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                  {option?.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}