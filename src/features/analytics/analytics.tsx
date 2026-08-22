import { useState } from "react";
import { Separator } from "@/components/ui/separator";
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
  selectSortFn,
} from "@/components/sort-controller";
import { filterAndSort } from "@/lib/filter-sort";
import type { ProductionChartSeries } from "pkg/overseer";
import { ChartCard } from "@/features/analytics/chart-card";


const isEffectivelyZero = (value: number) => Math.abs(value) < 1e-9;

const hasAnyFlowInHistory = (series: ProductionChartSeries) =>
  series.points.some((point) => !isEffectivelyZero(point.produced) || !isEffectivelyZero(point.consumed));

export interface AnalyticsOverviewProps {
  chartData: ProductionChartSeries[];
}

export function AnalyticsOverview({
  chartData,
}: AnalyticsOverviewProps) {
  const chartSeries = chartData.filter((series) =>
    !isEffectivelyZero(series.currentAmount)
    || !isEffectivelyZero(series.averageRate)
    || hasAnyFlowInHistory(series)
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [sortStateCharts, setSortStateCharts] = useState<SortState<ProductionChartSeries>>({
    field: "resourceName",
    direction: "ascending",
  });
  
  const sortConfigCharts: SortConfig<ProductionChartSeries> = {
    "resourceName": {
      label: "Resource",
      sortFn: (a, b) => a.resourceName.localeCompare(b.resourceName),
    },
    "currentAmount": {
      label: "Amount",
      sortFn: (a, b) => a.currentAmount - b.currentAmount,
    },
    "averageRate": {
      label: "Average Rate",
      sortFn: (a, b) => a.averageRate - b.averageRate,
    },
  };

  const queriedCharts = filterAndSort(chartSeries, {
    query: searchQuery,
    filters: [
      (series) => series.resourceName,
    ],
    sortFn: selectSortFn(sortConfigCharts, sortStateCharts),
  });

  return (
    <div className="flex flex-col gap-2 mx-4 mt-4 mb-16">
      <span className="font-heading text-base font-medium">
        Analytics
      </span>
      <Separator />
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
      {chartSeries.length === 0 ? (
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
            <ChartCard key={series.resourceName} series={series} />
          )}
        </div>
      )}
    </div>
  )
}
