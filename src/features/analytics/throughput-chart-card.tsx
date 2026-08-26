import type { ThroughputChartData } from "pkg/overseer";
import {
  CartesianGrid,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  matchByDataKey,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Package as ResourceIcon,
  TrendingUp as IncreasingIcon,
  TrendingDown as DecreasingIcon,
  MoveRight as NeutralIcon,
  Hash as CountIcon,
  ChevronsUp as ProductionRateIcon,
  ChevronsDown as ConsumptionRateIcon,
  ChartNoAxesCombined as TotalRateIcon,
} from "lucide-react";
import { SAMPLE_INTERVAL_MS } from "@/game/game-context.tsx";

export interface ThroughputChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  series: ThroughputChartData;
}

const signedFormat = (number: number) => number.toLocaleString(undefined, {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
})

const unsignedFormat = (number: number) => number.toLocaleString(undefined, {
  maximumFractionDigits: 2,
  signDisplay: "never",
})


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

export function ThroughputChartCard({
  series,
  ...props
}: ThroughputChartCardProps) {
  const resourceName = series.resourceName;
  
  const currentAmountString = unsignedFormat(series.currentAmount);
  const averageRateString = signedFormat(series.averageRate);
  const averageProductionString = unsignedFormat(series.averageProduction);
  const averageConsumptionString = unsignedFormat(series.averageConsumption);

  // Set domainMin to the 2nd point to hide the disappearing 1st point whenever the chart is updated.
  const domainMin = series.points[1]?.timestamp ?? 0;
  const domainMax = series.points[series.points.length - 1]?.timestamp ?? 0;

  
  const tickFormatter = (timestamp: number) => {
    const seconds = ((timestamp - domainMax) / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 0,
      signDisplay: "never",
    });
    const tick = seconds === "0" ? "Now" : `T-${seconds}s`;
    return tick;
  }

  return (
    <div className="flex flex-col gap-1 border rounded-md p-3" {...props}>
      <span className="flex items-center gap-1 font-medium">
        {resourceName}
        {(series.averageRate > 0) ? (
          <IncreasingIcon size={20} />
        ): (series.averageRate < 0) ? (
          <DecreasingIcon size={20} />
        ): (
          <NeutralIcon size={20} />
        )}
      </span>
      <div className="flex gap-2 text-muted-foreground">
        <span className="flex-1 flex justify-start items-center gap-1 whitespace-nowrap">
          <span className="flex items-center gap-0">
            <CountIcon size={16} />
            <ResourceIcon size={16} />
          </span>
          {currentAmountString}
        </span>
        <span className="flex-1 flex justify-start items-center gap-1 whitespace-nowrap">
          <span className="flex items-center gap-0">
            <TotalRateIcon size={16} />
            <ResourceIcon size={16} />
          </span>
          {averageRateString}/s
        </span>
        <span className="flex-1 flex justify-start items-center gap-1 whitespace-nowrap">
          <span className="flex items-center gap-0">
            <ProductionRateIcon size={16} />
            <ResourceIcon size={16} />
          </span>
          {averageProductionString}/s
        </span>
        <span className="flex-1 flex justify-start items-center gap-1 whitespace-nowrap">
          <span className="flex items-center gap-0">
            <ConsumptionRateIcon size={16} />
            <ResourceIcon size={16} />
          </span>
          {averageConsumptionString}/s
        </span>
      </div>
      <ChartContainer config={config} className="h-30 w-full">
        <AreaChart
          data={series.points}
          responsive={true}
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid />
          <YAxis
            type="number"
            width="auto"
            tickLine={true}
            axisLine={true}
            niceTicks="adaptive"
          />
          <XAxis
            dataKey="timestamp"
            type="number"
            width="auto"
            tickLine={true}
            axisLine={true}
            niceTicks="adaptive"
            tickFormatter={tickFormatter}
            domain={[domainMin, domainMax]}
            allowDataOverflow={true}
          />
          <ChartTooltip
            content={<ChartTooltipContent className="w-40" />}
          />
          <Area
            dataKey="consumed"
            fill="var(--color-consumed)"
            fillOpacity={100}
            stroke="var(--color-consumed)"
            strokeOpacity={100}
            type="stepAfter"
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Area
            dataKey="produced"
            fill="var(--color-produced)"
            fillOpacity={100}
            stroke="var(--color-produced)"
            strokeOpacity={100}
            type="stepAfter"
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}