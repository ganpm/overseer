import { useState } from "react";
import { CartesianGrid, Bar, BarChart, XAxis, YAxis, ReferenceLine } from "recharts";
import { useGame } from "@/game/game-context.tsx";
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
  ChartNoAxesCombined as RateIcon,
  Search,
  MoveUp as DescendingIcon,
  MoveDown as AscendingIcon,
} from "lucide-react";
import {
  SortDropdown,
} from "@/components/sort-dropdown";
import { filterAndSort } from "@/lib/filter-sort";
import type { ProductionChartSeries } from "pkg/overseer";

export const description = "Produced and consumed amounts per second over the last minute"

const toLocaleString = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 2 })

const isEffectivelyZero = (value: number) => Math.abs(value) < 1e-9;

const hasAnyFlowInHistory = (series: { points: { produced: number; consumed: number }[] }) =>
  series.points.some((point) => !isEffectivelyZero(point.produced) || !isEffectivelyZero(point.consumed));

export function ProductionView() {
  const { snapshot } = useGame()
  const chartSeries = snapshot.productionChartData.filter((series) =>
    !isEffectivelyZero(series.current_amount)
    || !isEffectivelyZero(series.average_rate)
    || hasAnyFlowInHistory(series)
  );

  const [searchQuery, setSearchQuery] = useState("");

  type SortOptions = "name-ascending" | "name-descending" | "amount-ascending" | "amount-descending";

  const sortOptions = new Map<SortOptions, { label: string; icon: React.JSX.Element; sortFn: (a: ProductionChartSeries, b: ProductionChartSeries) => number }>([
    ["name-ascending", { label: "Name", icon: <AscendingIcon />, sortFn: (a, b) => a.resource_name.localeCompare(b.resource_name) }],
    ["name-descending", { label: "Name", icon: <DescendingIcon />, sortFn: (a, b) => b.resource_name.localeCompare(a.resource_name) }],
    ["amount-ascending", { label: "Amount", icon: <AscendingIcon />, sortFn: (a, b) => a.current_amount - b.current_amount }],
    ["amount-descending", { label: "Amount", icon: <DescendingIcon />, sortFn: (a, b) => b.current_amount - a.current_amount }],
  ]);

  const [sortOption, setSortOption] = useState<SortOptions>("name-ascending");

  const queriedCharts = filterAndSort(chartSeries, {
    query: searchQuery,
    filters: [
      (series) => series.resource_name,
    ],
    sortFn: (a, b) => sortOptions.get(sortOption)?.sortFn(a, b) ?? 0,
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
    <div className="mx-4 mt-4 space-y-2 pb-16">
      <Card>
        <CardHeader>
          <CardTitle>Production Throughput Dashboard</CardTitle>
          <CardDescription>
            Each chart shows produced and consumed amounts per second for the last 60 seconds.
          </CardDescription>
        </CardHeader>
      </Card>
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
          <InputGroupAddon align="inline-end">{queriedCharts.length} results</InputGroupAddon>
        </InputGroup>
        <SortDropdown
          sort={sortOption}
          setSort={setSortOption}
          sortOptions={sortOptions}
        />
      </div>
      {chartSeries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No flow data yet. Start production to populate charts.
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
            const averageRateValue = series.average_rate;
            const averageRateString = toLocaleString(averageRateValue);
            const trendIcon = averageRateValue > 0 ? <TrendingUp /> : averageRateValue < 0 ? <TrendingDown /> : <TrendingNeutral />;

            return (
              <Card key={resourceName}>
                <CardHeader>
                  <CardTitle className="flex gap-1">{resourceName} {trendIcon}

                  </CardTitle>
                  <CardDescription>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {currentAmountString}
                      </span>
                      <span className="flex items-center gap-1">
                        <RateIcon size={14} />
                        {averageRateString}/s
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
