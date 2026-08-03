import * as React from "react";
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
} from "lucide-react";

export const description = "Produced and consumed amounts per second over the last minute"

const FLOW_HISTORY_LENGTH = 60

const toLocaleString = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 2 })
const averageRate = (produced: number[], consumed: number[]) => {
  const totalProduced = produced.reduce((sum, value) => sum + value, 0)
  const totalConsumed = consumed.reduce((sum, value) => sum + value, 0)
  return (totalProduced - totalConsumed) / FLOW_HISTORY_LENGTH
}

export function ProductionView() {
  const { snapshot } = useGame()

  const resourceEntries = React.useMemo(
    () => Array.from(snapshot.resourceFlowHistory.entries()).sort(([a], [b]) => a.localeCompare(b)),
    [snapshot.resourceFlowHistory]
  )

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

      {resourceEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No flow data yet. Start production to populate charts.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col space-y-2">
          {resourceEntries.map(([resourceName, flowSeries]) => {
            const currentAmount = snapshot.inventory.get(resourceName) ?? 0
            const chartData = flowSeries.produced.map((produced, seriesIndex) => ({
              label: `-${FLOW_HISTORY_LENGTH - 1 - seriesIndex}s`,
              produced,
              consumed: flowSeries.consumed[seriesIndex] ?? 0,
            }))

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

            const currentAmountString = toLocaleString(currentAmount);
            const averageRateValue = averageRate(flowSeries.produced, flowSeries.consumed);
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
                        <Package size={14} /> {currentAmountString}
                      </span>
                      <span className="flex items-center gap-1">
                        <RateIcon size={14} /> {averageRateString}/s
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={config} className="h-30 w-full">
                    <BarChart
                      data={chartData}
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
