import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { CartesianGrid, Bar, BarChart, XAxis, YAxis, ReferenceLine } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Package,
  TrendingUp,
  TrendingDown,
  MoveRight as TrendingNeutral,
  Clock as RateIcon,
  ClockArrowUp as RateUpIcon,
  ClockArrowDown as RateDownIcon,
  Search,
} from "lucide-react";
import {
  SortController,
  type SortState,
  type SortConfigMap,
  sortDirectionMult,
} from "@/components/sort-controller";
import { filterAndSort } from "@/lib/filter-sort";
import type { ProductionChartSeries } from "pkg/overseer";


const toLocaleString = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 2 })

const isEffectivelyZero = (value: number) => Math.abs(value) < 1e-9;

const hasAnyFlowInHistory = (series: ProductionChartSeries) =>
  series.points.some((point) => !isEffectivelyZero(point.produced) || !isEffectivelyZero(point.consumed));

export interface ProductionViewProps {
  chartData: ProductionChartSeries[];
}

export function ProductionView({
  chartData,
}: ProductionViewProps) {
  const chartSeries = chartData.filter((series) =>
    !isEffectivelyZero(series.current_amount)
    || !isEffectivelyZero(series.average_rate)
    || hasAnyFlowInHistory(series)
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [sortStateCharts, setSortStateCharts] = useState<SortState<ProductionChartSeries>>({
    field: "resource_name",
    direction: "ascending",
  });
  
  const sortConfigCharts: SortConfigMap<ProductionChartSeries> = new Map([
    ["resource_name", {
      label: "Resource",
      sortFn: (a, b) => a.resource_name.localeCompare(b.resource_name),
    }],
    ["current_amount", {
      label: "Amount",
      sortFn: (a, b) => a.current_amount - b.current_amount,
    }],
    ["average_rate", {
      label: "Average Rate",
      sortFn: (a, b) => a.average_rate - b.average_rate,
    }],
  ]);

  const queriedCharts = filterAndSort(chartSeries, {
    query: searchQuery,
    filters: [
      (series) => series.resource_name,
    ],
    sortFn: (a, b) => (sortConfigCharts.get(sortStateCharts.field)?.sortFn(a, b) ?? 0) * sortDirectionMult[sortStateCharts.direction]
  });

  const config = {
    produced: {
      label: "Produced",
      color: "oklch(0.70 0.16 153)",
    },
    consumed: {
      label: "Consumed",
      color: "oklch(0.62 0.19 25)",
    },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col gap-2 mx-4 mt-4 mb-16">
      <span className="font-heading text-base font-medium">
        Production
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
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            
          </CardContent>
        </Card>
      ) : queriedCharts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No charts match the search query.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col space-y-2">
          {queriedCharts
            .map((series) => {
            const resourceName = series.resource_name;

            const currentAmountString = toLocaleString(series.current_amount);
            const averageRateString = toLocaleString(series.average_rate);
            const averageProductionString = toLocaleString(series.average_production);
            const averageConsumptionString = toLocaleString(series.average_consumption);
            const trendIcon = series.average_rate > 0 ? <TrendingUp /> : series.average_rate < 0 ? <TrendingDown /> : <TrendingNeutral />;

            return (
              <Card key={resourceName}>
                <CardHeader>
                  <CardTitle className="flex gap-1">{resourceName} {trendIcon}

                  </CardTitle>
                  <CardDescription>
                    <div className="flex gap-2">
                      <span className="flex flex-1 justify-start items-center gap-1">
                        <Package size={14} />
                        {currentAmountString}
                      </span>
                      <span className="flex flex-1 justify-start items-center gap-1">
                        <RateIcon size={14} />
                        {averageRateString}/s
                      </span>
                      <span className="flex flex-1 justify-start items-center gap-1">
                        <RateUpIcon size={14} />
                        {averageProductionString}/s
                      </span>
                      <span className="flex flex-1 justify-start items-center gap-1">
                        <RateDownIcon size={14} />
                        {averageConsumptionString}/s
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={config} className="h-30 w-full">
                    <BarChart
                      data={series.points}
                      stackOffset="sign"
                    >
                      <CartesianGrid />
                      <YAxis
                        width="auto"
                        tickLine={true}
                        axisLine={false}
                        niceTicks="snap125"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={true}
                        axisLine={false}
                        //ticks={["-60s", "-45s", "-30s", "-15s", "0s"]}
                        niceTicks="snap125"
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent className="w-40" />}
                      />
                      <ReferenceLine y={0} stroke="var(--color-border)" />
                      <Bar
                        dataKey="consumed"
                        stackId="a"
                        isAnimationActive={false}
                        fill="var(--color-consumed)"
                      />
                      <Bar
                        dataKey="produced"
                        stackId="a"
                        isAnimationActive={false}
                        fill="var(--color-produced)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
