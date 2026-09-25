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
import { SAMPLE_INTERVAL_MS } from "@/context/game";

export interface ThroughputChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  series: ThroughputChartData;
}

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  signDisplay: "never",
});

const unsignedRateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "never",
});

const signedRateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "exceptZero",
});


const config = {
  produced: {
    label: "Produced",
    color: "var(--healthy-foreground)", //oklch(0.70 0.16 153)
  },
  consumed: {
    label: "Consumed",
    color: "var(--error-foreground)", //oklch(0.62 0.19 25)
  },
} satisfies ChartConfig;

export function ThroughputChartCard({
  series,
  ...props
}: ThroughputChartCardProps) {

  const {
    resourceName,
    currentAmount,
    currentProductionRate,
    currentConsumptionRate,
    currentNetRate,
    averageProductionRate,
    averageConsumptionRate,
    averageNetRate,
    points
  } = series;

  // Set domainMin to the 2nd point to hide the disappearing 1st point whenever the chart is updated.
  const domainMin = points[1]?.timestamp ?? 0;
  const domainMax = points[points.length - 1]?.timestamp ?? 0;

  
  const tickFormatter = (timestamp: number) => {
    const seconds = ((timestamp - domainMax) / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 0,
      signDisplay: "never",
    });
    const tick = seconds === "0" ? "Now" : `T-${seconds}s`;
    return tick;
  }

  return (
    <div className="flex flex-col gap-2 bg-card shadow-md border border-border rounded-md p-3" {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-medium">
            {resourceName}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-medium text-lg">
            {amountFormatter.format(currentAmount)}
          </span>
          <span className="text-muted-foreground size-sm">
            in storage
          </span>
        </div>
      </div>
      <ChartContainer config={config} className="h-30 w-full bg-muted">
        <AreaChart
          data={points}
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
            content={<ChartTooltipContent className="w-40" hideLabel />}
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
      <div className="grid grid-cols-[max-content_repeat(2,1fr)] gap-x-3 gap-y-1">

        <div className="flex border-b border-border">
          <span>
            &nbsp;
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-center">
          <span className="text-muted-foreground text-xs">
            Current
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-center">
          <span className="text-muted-foreground text-xs">
            Average
          </span>
        </div>

        <div className="flex border-b border-border items-center justify-start">
          <span className="text-muted-foreground text-xs">
            Production
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className="font-medium">
            {unsignedRateFormatter.format(currentProductionRate)} /s
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className="font-medium">
            {unsignedRateFormatter.format(averageProductionRate)} /s
          </span>
        </div>

        <div className="flex border-b border-border items-center justify-start">
          <span className="text-muted-foreground text-xs">
            Consumption
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className="font-medium">
            {unsignedRateFormatter.format(currentConsumptionRate)} /s
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className="font-medium">
            {unsignedRateFormatter.format(averageConsumptionRate)} /s
          </span>
        </div>

        <div className="flex border-b border-border items-center justify-start">
          <span className="text-muted-foreground text-xs">
            Net
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className={cn(
            "font-medium",
            currentNetRate > 0 ? "text-(--healthy-foreground)" : currentNetRate < 0 ? "text-(--error-foreground)" : "text-foreground"
          )}>
            {signedRateFormatter.format(currentNetRate)} /s
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className={cn(
            averageNetRate > 0 ? "text-(--healthy-foreground)" : averageNetRate < 0 ? "text-(--error-foreground)" : "text-foreground"
          )}>
            {signedRateFormatter.format(averageNetRate)} /s
          </span>
        </div>

      </div>
    </div>
  );
}