import type { ThroughputChartData } from "pkg/overseer";
import { cn } from "@/lib/utils";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowUp as ProductionRateIcon,
  ArrowDown as ConsumptionRateIcon,
} from "lucide-react";
import { SAMPLE_INTERVAL_MS } from "@/game/game-context.tsx";

export interface ThroughputChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  series: ThroughputChartData;
}

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  signDisplay: "never",
});

const unsignedRateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  signDisplay: "never",
});

const signedRateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  signDisplay: "exceptZero",
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
} satisfies ChartConfig;

export function ThroughputChartCard({
  series,
  ...props
}: ThroughputChartCardProps) {
  const resourceName = series.resourceName;

  const amount = amountFormatter.format(series.currentAmount);
  const productionRate = unsignedRateFormatter.format(series.averageProduction);
  const consumptionRate = unsignedRateFormatter.format(series.averageConsumption);
  const netRate = signedRateFormatter.format(series.averageRate);

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
    <div className="flex flex-col gap-2 bg-card border rounded-md p-3" {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-medium">
            {resourceName}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-medium text-lg">
            {amount}
          </span>
          <span className="text-muted-foreground size-sm">
            in storage
          </span>
        </div>
      </div>
      <ChartContainer config={config} className="h-30 w-full bg-muted">
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
      <Separator />
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-1">
            <ProductionRateIcon size={13} className="text-green-800" />
            <span className="text-muted-foreground text-xs">
              Produced
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium pl-1">
              {productionRate}/s
            </span>
          </div>
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-1">
            <ConsumptionRateIcon size={13} className="text-red-800" />
            <span className="text-muted-foreground text-xs">
              Consumed
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium pl-1">
              {consumptionRate}/s
            </span>
          </div>
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">
              Net
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-medium pl-1",
              series.averageRate > 0 ? "text-green-800" : series.averageRate < 0 ? "text-red-800" : "text-foreground"
            )}>
              {netRate}/s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}