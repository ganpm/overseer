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
} from "lucide-react";

export const description = "Produced and consumed amounts per second over the last minute"

const toLocaleString = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 2 })

export function ProductionView() {
  const { snapshot } = useGame()
  const chartSeries = snapshot.productionChartData.filter((series => series.average_rate !== 0))

  const [searchQuery, setSearchQuery] = useState("");

  const queriedCharts = searchQuery.trim() === ""
    ? chartSeries
    : chartSeries.filter((series) =>
        series.resource_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

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
            const resourceName = series.resource_name

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
