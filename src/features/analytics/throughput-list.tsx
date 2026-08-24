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
import { ThroughputChartCard } from "@/features/analytics/throughput-chart-card";
import type { ThroughputChartData } from "pkg/overseer";

export interface ThroughputListProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortStateCharts: SortState<ThroughputChartData>;
  setSortStateCharts: (next: SortState<ThroughputChartData>) => void;
  sortConfigCharts: SortConfig<ThroughputChartData>;
  queriedCharts: ThroughputChartData[];
  chartData: ThroughputChartData[];
}

export function ThroughputList({
  searchQuery,
  setSearchQuery,
  sortStateCharts,
  setSortStateCharts,
  sortConfigCharts,
  queriedCharts,
  chartData,
}: ThroughputListProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
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
          No flow data yet. Start production to populate charts.
        </p>
      ) : queriedCharts.length === 0 ? (
        <p className="flex justify-center text-muted-foreground my-5">
          No charts match the search query.
        </p>
      ) : (
        <div className="flex flex-col space-y-2">
          {queriedCharts.map((series) =>
            <ThroughputChartCard key={series.resourceName} series={series} />
          )}
        </div>
      )}
    </div>
  );
}