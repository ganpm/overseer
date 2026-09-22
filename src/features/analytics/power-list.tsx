import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Search,
} from "lucide-react";
import {
  SortController,
  type SortState,
  type SortConfig,
} from "@/components/sort-controller";
import { PowerChartCard } from "@/features/analytics/power-chart-card";
import type { PowerChartData } from "pkg/overseer";


export interface PowerListProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortStateCharts: SortState<PowerChartData>;
  setSortStateCharts: (next: SortState<PowerChartData>) => void;
  sortConfigCharts: SortConfig<PowerChartData>;
  queriedCharts: PowerChartData[];
  chartData: PowerChartData[];
}

export function PowerList({
  searchQuery,
  setSearchQuery,
  sortStateCharts,
  setSortStateCharts,
  sortConfigCharts,
  queriedCharts,
  chartData,
}: PowerListProps) {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="flex gap-2">
        <InputGroup>
          <InputGroupInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          {searchQuery && (
            <InputGroupAddon align="inline-end">{queriedCharts.length} results</InputGroupAddon>
          )}
        </InputGroup>
        <SortController
          sortState={sortStateCharts}
          onChange={setSortStateCharts}
          config={sortConfigCharts}
        />
      </div>
      {chartData.length === 0 ? (
        <p className="flex justify-center text-muted-foreground my-5">
          No power data yet. Start production to populate charts.
        </p>
      ) : queriedCharts.length === 0 ? (
        <p className="flex justify-center text-muted-foreground my-5">
          No charts match the search query.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {queriedCharts.map((series) =>
            <PowerChartCard key={series.name} series={series} />
          )}
        </div>
      )}
    </div>
  );
}