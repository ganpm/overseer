import type { ProductionChartSeries } from "pkg/overseer";
import {
  CartesianGrid,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ReferenceLine
} from "recharts";
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
} from "lucide-react";

export interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  series: ProductionChartSeries;
}

const toLocaleString = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 2 })

const config = {
  produced: {
    label: "Produced",
    color: "oklch(0.70 0.16 153)",
  },
  consumed: {
    label: "Consumed",
    color: "oklch(0.62 0.19 25)",
  },
} satisfies ChartConfig;

export function ChartCard({
  series,
  ...props
}: ChartCardProps) {
  const resourceName = series.resourceName;
  
  const currentAmountString = toLocaleString(series.currentAmount);
  const averageRateString = toLocaleString(series.averageRate);
  const averageProductionString = toLocaleString(series.averageProduction);
  const averageConsumptionString = toLocaleString(series.averageConsumption);

  return (
    <div className="flex flex-col gap-3 border rounded-md p-3" {...props}>
      <span className="flex items-center gap-1 font-medium">
        {resourceName}
        {(series.averageRate > 0) ? (
          <TrendingUp size={20} className="inline-block" />
        ): (series.averageRate < 0) ? (
          <TrendingDown size={20} className="inline-block" />
        ): (
          <TrendingNeutral size={20} className="inline-block" />
        )}
      </span>
      <div className="flex gap-2 text-muted-foreground">
        <span className="flex flex-1 justify-start items-center gap-1">
          <Package size={14} className="inline-block" />
          {currentAmountString}
        </span>
        <span className="flex flex-1 justify-start items-center gap-1">
          <RateIcon size={14} className="inline-block" />
          {averageRateString}/s
        </span>
        <span className="flex flex-1 justify-start items-center gap-1">
          <RateUpIcon size={14} className="inline-block" />
          {averageProductionString}/s
        </span>
        <span className="flex flex-1 justify-start items-center gap-1">
          <RateDownIcon size={14} className="inline-block" />
          {averageConsumptionString}/s
        </span>
      </div>
      <ChartContainer config={config} className="h-30 w-full">
        <BarChart data={series.points} stackOffset="sign">
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
    </div>
  );
}