import type { PowerChartData } from "pkg/overseer";
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
import {
  Zap as PowerIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_INTERVAL_MS } from "@/context/game";

const config = {
  maximumConsumption: {
    label: "Maximum Consumption",
    color: "oklch(0.72 0.14 25)",
  },
  maximumGeneration: {
    label: "Maximum Generation",
    color: "oklch(0.80 0.12 153)",
  },
  netMaximumPower: {
    label: "Maximum Net Power",
    color: "oklch(0.72 0.14 285)",
  },
  currentConsumption: {
    label: "Consumption",
    color: "oklch(0.62 0.19 25)",
  },
  currentGeneration: {
    label: "Generation",
    color: "oklch(0.70 0.16 153)",
  },
  netCurrentPower: {
    label: "Net Power",
    color: "oklch(0.62 0.19 285)",
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

interface GridStatusProps {
  production: number;
  consumption: number;
}

function GridStatus({ production, consumption }: GridStatusProps) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-xs",
      consumption === 0 ?
        "text-muted-foreground bg-muted" :
      production === 0 ?
        "text-red-800 bg-red-100" :
      production < consumption ?
        "text-yellow-800 bg-yellow-100" :
        "text-green-800 bg-green-100"
    )}
    >
      {consumption === 0 ?
        "No Demand" :
      production === 0 ?
        "Blackout" :
      production < consumption ?
        "Brownout" :
        "Stable"}
    </span>
  );
}

export interface PowerChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  series: PowerChartData;
}

export function PowerChartCard({
  series,
  ...props
}: PowerChartCardProps) {
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

  const currentProduction = unsignedFormatter.format(series.averageCurrentGeneration);
  const currentConsumption = unsignedFormatter.format(series.averageCurrentConsumption);
  const netCurrentPower = signedFormatter.format(series.averageNetCurrentPower);
  const maximumConsumption = unsignedFormatter.format(series.averageMaximumConsumption);
  const maximumProduction = unsignedFormatter.format(series.averageMaximumGeneration);
  const netMaximumPower = signedFormatter.format(series.averageNetMaximumPower);

  return (
    <div className="flex flex-col gap-2 bg-card border rounded-md p-3" {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <PowerIcon size={14} />
          <span className="font-medium">
            Main Power Grid
          </span>
        </div>
        <div className="flex items-center">
          <GridStatus
            production={Math.abs(series.averageCurrentGeneration)}
            consumption={Math.abs(series.averageCurrentConsumption)}
          />
        </div>
      </div>
      <ChartContainer config={config} className="h-30 w-full bg-muted">
        <LineChart
          data={series.points}
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
            name="Maximum Consumption"
            unit=" MW"
            dataKey="maximumConsumption"
            type="stepAfter"
            stroke={config.maximumConsumption.color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Line
            name="Maximum Generation"
            unit=" MW"
            dataKey="maximumGeneration"
            type="stepAfter"
            stroke={config.maximumGeneration.color}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Line
            name="Current Consumption"
            unit=" MW"
            dataKey="currentConsumption"
            type="stepAfter"
            stroke={config.currentConsumption.color}
            strokeWidth={2}
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <Line
            name="Current Generation"
            unit=" MW"
            dataKey="currentGeneration"
            type="stepAfter"
            stroke={config.currentGeneration.color}
            strokeWidth={2}
            dot={false}
            animationDuration={SAMPLE_INTERVAL_MS}
            animationMatchBy={matchByDataKey("timestamp")}
            animationEasing="linear"
          />
          <ChartTooltip
            content={<ChartTooltipContent className="w-40" />}
          />
        </LineChart>
      </ChartContainer>
      <div className="grid grid-cols-[1fr_auto_auto] gap-3">

        <div className="flex border-b">
          <span>
            &nbsp;
          </span>
        </div>
        <div className="flex border-b items-center justify-center">
          <span className="text-muted-foreground text-xs">
            Current
          </span>
        </div>
        <div className="flex border-b items-center justify-center">
          <span className="text-muted-foreground text-xs">
            Theoretical max
          </span>
        </div>

        <div className="flex border-b items-center justify-start">
          <span className="text-muted-foreground">
            Production
          </span>
        </div>
        <div className="flex border-b items-center justify-end">
          <span className="font-medium">
            {currentProduction} MW
          </span>
        </div>
        <div className="flex border-b items-center justify-end">
          <span>
            {maximumProduction} MW
          </span>
        </div>

        <div className="flex border-b items-center justify-start">
          <span className="text-muted-foreground">
            Consumption
          </span>
        </div>
        <div className="flex border-b items-center justify-end">
          <span className="font-medium">
            {currentConsumption} MW
          </span>
        </div>
        <div className="flex border-b items-center justify-end">
          <span>
            {maximumConsumption} MW
          </span>
        </div>

        <div className="flex border-b items-center justify-start">
          <span className="text-muted-foreground">
            Net power
          </span>
        </div>
        <div className={cn(
          "flex border-b items-center justify-end",
          series.averageNetCurrentPower < 0 ? "text-red-800" : "text-green-800"
        )}>
          <span className="font-medium">
            {netCurrentPower} MW
          </span>
        </div>
        <div className={cn(
          "flex border-b items-center justify-end",
          series.averageNetMaximumPower < 0 ? "text-red-800" : "text-green-800"
        )}>
          <span>
            {netMaximumPower} MW
          </span>
        </div>

      </div>
    </div>
  );
}