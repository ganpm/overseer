import type { PowerChartData } from "pkg/overseer";
import { ColoredBadge } from "@/components/colored-badge";
import {
  CartesianGrid,
  Line,
  LineChart,
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
  Zap as PowerIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_INTERVAL_MS } from "@/context/game";

const config = {
  maximumPowerConsumption: {
    label: "Maximum Power Consumption",
    color: "var(--error-foreground)",
  },
  maximumPowerProduction: {
    label: "Maximum Power Production",
    color: "var(--healthy-foreground)",
  },
  currentPowerConsumption: {
    label: "Current PowerConsumption",
    color: "var(--error-foreground)",
  },
  currentPowerProduction: {
    label: "Current Power Production",
    color: "var(--healthy-foreground)",
  },
} satisfies ChartConfig;


const unsignedFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "never",
});

const signedFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});


const getGridStatus = (production: number, consumption: number): { label: string; variant: "offline" | "error" | "warning" | "healthy" } => {
  if (consumption === 0) return { label: "No Demand", variant: "offline" };
  if (production === 0) return { label: "Blackout", variant: "error" };
  if (production < consumption) return { label: "Brownout", variant: "warning" };
  return { label: "Stable", variant: "healthy" };
};

export interface PowerChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  series: PowerChartData;
}

export function PowerChartCard({
  series,
  ...props
}: PowerChartCardProps) {
  const {
    maximumPowerConsumption,
    maximumPowerProduction,
    maximumNetPower,
    currentPowerConsumption,
    currentPowerProduction,
    currentNetPower,
    averagePowerConsumption,
    averagePowerProduction,
    averageNetPower,
    points,
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

  const gridStatus = getGridStatus(Math.abs(averagePowerProduction), Math.abs(averagePowerConsumption));

  return (
    <div className="flex flex-col gap-2 bg-card shadow-md border border-border rounded-md p-3" {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <PowerIcon size={14} />
          <span className="font-medium">
            Main Power Grid
          </span>
        </div>
        <ColoredBadge variant={gridStatus.variant}>
          {gridStatus.label}
        </ColoredBadge>
      </div>
      <ChartContainer config={config} className="h-30 w-full bg-muted">
        <LineChart
          data={points}
          responsive={true}
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid />
          <YAxis
            type="number"
            unit=" MW"
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
          <Line
            name="Maximum Power Consumption"
            unit=" MW"
            dataKey="maximumPowerConsumption"
            type="stepAfter"
            stroke="var(--color-maximumPowerConsumption)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Line
            name="Maximum Power Production"
            unit=" MW"
            dataKey="maximumPowerProduction"
            type="stepAfter"
            stroke="var(--color-maximumPowerProduction)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Line
            name="Current Power Consumption"
            unit=" MW"
            dataKey="currentPowerConsumption"
            type="stepAfter"
            stroke="var(--color-currentPowerConsumption)"
            strokeWidth={2}
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Line
            name="Current Power Production"
            unit=" MW"
            dataKey="currentPowerProduction"
            type="stepAfter"
            stroke="var(--color-currentPowerProduction)"
            strokeWidth={2}
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <ChartTooltip
            content={<ChartTooltipContent className="w-40" hideLabel />}
          />
        </LineChart>
      </ChartContainer>
      <Separator />
      <div className="grid grid-cols-[max-content_repeat(3,1fr)] gap-x-3 gap-y-2">

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
        <div className="flex border-b border-border items-center justify-center">
          <span className="text-muted-foreground text-xs">
            Maximum
          </span>
        </div>

        <div className="flex border-b border-border items-center justify-start">
          <span className="text-muted-foreground text-xs">
            Production
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className="font-medium">
            {unsignedFormatter.format(currentPowerProduction)} MW
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span>
            {unsignedFormatter.format(averagePowerProduction)} MW
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span>
            {unsignedFormatter.format(maximumPowerProduction)} MW
          </span>
        </div>

        <div className="flex border-b border-border items-center justify-start">
          <span className="text-muted-foreground text-xs">
            Consumption
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span className="font-medium">
            {unsignedFormatter.format(currentPowerConsumption)} MW
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span>
            {unsignedFormatter.format(averagePowerConsumption)} MW
          </span>
        </div>
        <div className="flex border-b border-border items-center justify-end">
          <span>
            {unsignedFormatter.format(maximumPowerConsumption)} MW
          </span>
        </div>

        <div className="flex border-b border-border items-center justify-start">
          <span className="text-muted-foreground text-xs">
            Net power
          </span>
        </div>
        <div className={cn(
          "flex border-b border-border items-center justify-end",
           currentNetPower < 0 ? "text-(--error-foreground)" : currentNetPower > 0 ? "text-(--healthy-foreground)" : "text-foreground"
        )}>
          <span className="font-medium">
            {signedFormatter.format(currentNetPower)} MW
          </span>
        </div>
        <div className={cn(
          "flex border-b border-border items-center justify-end",
          averageNetPower < 0 ? "text-(--error-foreground)" : averageNetPower > 0 ? "text-(--healthy-foreground)" : "text-foreground"
        )}>
          <span>
            {signedFormatter.format(averageNetPower)} MW
          </span>
        </div>
        <div className={cn(
          "flex border-b border-border items-center justify-end",
          maximumNetPower < 0 ? "text-(--error-foreground)" : maximumNetPower > 0 ? "text-(--healthy-foreground)" : "text-foreground"
        )}>
          <span>
            {signedFormatter.format(maximumNetPower)} MW
          </span>
        </div>

      </div>
    </div>
  );
}