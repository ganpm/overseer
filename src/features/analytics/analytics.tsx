import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  type SortState,
  type SortConfig,
  selectSortFn,
} from "@/components/sort-controller";
import { filterAndSort } from "@/lib/filter-sort";
import type {
  ThroughputChartData,
  PowerChartData,
} from "pkg/overseer";
import { ThroughputList } from "@/features/analytics/throughput-list";
import { PowerChartCard } from "@/features/analytics/power-chart-card";


const isEffectivelyZero = (value: number) => Math.abs(value) < 1e-9;

const hasAnyFlowInHistory = (series: ThroughputChartData) =>
  series.points.some((point) => !isEffectivelyZero(point.produced) || !isEffectivelyZero(point.consumed));

export interface AnalyticsOverviewProps {
  throughputChartData: ThroughputChartData[];
  powerChartData: PowerChartData;
}

export function AnalyticsOverview({
  throughputChartData,
  powerChartData,
}: AnalyticsOverviewProps) {
  const nonzeroThroughputChartData = throughputChartData.filter((series) =>
    !isEffectivelyZero(series.currentAmount)
    || !isEffectivelyZero(series.averageRate)
    || hasAnyFlowInHistory(series)
  );

  const [searchQueryThroughput, setSearchQueryThroughput] = useState("");
  const [sortStateThroughput, setSortStateThroughput] = useState<SortState<ThroughputChartData>>({
    field: "resourceName",
    direction: "ascending",
  });
  const sortConfigThroughput: SortConfig<ThroughputChartData> = {
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
  const queriedThroughputCharts = filterAndSort(nonzeroThroughputChartData, {
    query: searchQueryThroughput,
    filters: [
      (series) => series.resourceName,
    ],
    sortFn: selectSortFn(sortConfigThroughput, sortStateThroughput),
  });

  return (
    <Accordion multiple defaultValue={["throughput", "power"]}>
      <AccordionItem value="throughput">
        <AccordionTrigger>Throughput ({nonzeroThroughputChartData.length})</AccordionTrigger>
        <AccordionContent>
          <ThroughputList
            searchQuery={searchQueryThroughput}
            setSearchQuery={setSearchQueryThroughput}
            sortStateCharts={sortStateThroughput}
            setSortStateCharts={setSortStateThroughput}
            sortConfigCharts={sortConfigThroughput}
            queriedCharts={queriedThroughputCharts}
            chartData={nonzeroThroughputChartData}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="power">
        <AccordionTrigger>Power</AccordionTrigger>
        <AccordionContent>
          <PowerChartCard series={powerChartData} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
