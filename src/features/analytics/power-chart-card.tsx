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
  Zap as PowerIcon,
  ChevronsDown as MaximumConsumptionIcon,
  ChevronsUp as MaximumGenerationIcon,
  ChevronsUpDown as NetMaximumPowerIcon,
  ChevronDown as CurrentConsumptionIcon,
  ChevronUp as CurrentGenerationIcon,
  ChevronsDownUp as NetCurrentPowerIcon,
} from "lucide-react";
import { SAMPLE_INTERVAL_MS } from "@/game/game-context.tsx";

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
    label: "Net Maximum Power",
    color: "oklch(0.72 0.14 285)",
  },
  currentConsumption: {
    label: "Current Consumption",
    color: "oklch(0.62 0.19 25)",
  },
  currentGeneration: {
    label: "Current Generation",
    color: "oklch(0.70 0.16 153)",
  },
  netCurrentPower: {
    label: "Net Current Power",
    color: "oklch(0.62 0.19 285)",
  },
} satisfies ChartConfig;

const isEffectivelyZero = (value: number) => Math.abs(value) < 1e-9;

const unsignedFormat = (number: number) => number.toLocaleString(undefined, {
  maximumFractionDigits: 2,
  signDisplay: "never",
})

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

  const showMaximumConsumption = !isEffectivelyZero(series.averageMaximumConsumption) || series.points.some((point) => !isEffectivelyZero(point.maximumConsumption));
  const showMaximumGeneration = !isEffectivelyZero(series.averageMaximumGeneration) || series.points.some((point) => !isEffectivelyZero(point.maximumGeneration));
  const showCurrentConsumption = !isEffectivelyZero(series.averageCurrentConsumption) || series.points.some((point) => !isEffectivelyZero(point.currentConsumption));
  const showCurrentGeneration = !isEffectivelyZero(series.averageCurrentGeneration) || series.points.some((point) => !isEffectivelyZero(point.currentGeneration));
  const showNetMaximumPower = !isEffectivelyZero(series.averageNetMaximumPower) || series.points.some((point) => !isEffectivelyZero(point.netMaximumPower));
  const showNetCurrentPower = !isEffectivelyZero(series.averageNetCurrentPower) || series.points.some((point) => !isEffectivelyZero(point.netCurrentPower));

  return (
    <div className="flex flex-col gap-1 border rounded-md p-3" {...props}>
      <span className="flex items-center gap-1 font-medium">
        {series.name}
      </span>
      <div className="grid grid-cols-3 gap-1 text-muted-foreground">
        {showNetCurrentPower && (
          <span className="flex justify-start items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-0">
              <NetCurrentPowerIcon size={16} />
              <PowerIcon size={16} />
            </span>
            {unsignedFormat(series.averageNetCurrentPower)} MW
          </span>
        )}
        {showCurrentGeneration && (
          <span className="flex justify-start items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-0">
              <CurrentGenerationIcon size={16} />
              <PowerIcon size={16} />
            </span>
            {unsignedFormat(series.averageCurrentGeneration)} MW
          </span>
        )}
        {showCurrentConsumption && (
          <span className="flex justify-start items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-0">
              <CurrentConsumptionIcon size={16} />
              <PowerIcon size={16} />
            </span>
            {unsignedFormat(series.averageCurrentConsumption)} MW
          </span>
        )}
        {showNetMaximumPower && (
          <span className="flex justify-start items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-0">
              <NetMaximumPowerIcon size={16} />
              <PowerIcon size={16} />
            </span>
            {unsignedFormat(series.averageNetMaximumPower)} MW
          </span>
        )}
        {showMaximumGeneration && (
          <span className="flex justify-start items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-0">
              <MaximumGenerationIcon size={16} />
              <PowerIcon size={16} />
            </span>
            {unsignedFormat(series.averageMaximumGeneration)} MW
          </span>
        )}
        {showMaximumConsumption && (
          <span className="flex justify-start items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-0">
              <MaximumConsumptionIcon size={16} />
              <PowerIcon size={16} />
            </span>
            {unsignedFormat(series.averageMaximumConsumption)} MW
          </span>
        )}
      </div>
      <ChartContainer config={config} className="h-30 w-full">
        <LineChart
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
          {showMaximumConsumption && (
            <Line
              dataKey="maximumConsumption"
              type="stepAfter"
              stroke={config.maximumConsumption.color}
              strokeWidth={2}
              dot={false}
              animationDuration={SAMPLE_INTERVAL_MS}
              animationMatchBy={matchByDataKey("timestamp")}
              animationEasing="linear"
            />
          )}
          {showMaximumGeneration && (
            <Line
              dataKey="maximumGeneration"
              type="stepAfter"
              stroke={config.maximumGeneration.color}
              strokeWidth={2}
              dot={false}
              animationDuration={SAMPLE_INTERVAL_MS}
              animationMatchBy={matchByDataKey("timestamp")}
              animationEasing="linear"
            />
          )}
          {showCurrentConsumption && (
            <Line
              dataKey="currentConsumption"
              type="stepAfter"
              stroke={config.currentConsumption.color}
              strokeWidth={2}
              dot={false}
              animationDuration={SAMPLE_INTERVAL_MS}
              animationMatchBy={matchByDataKey("timestamp")}
              animationEasing="linear"
            />
          )}
          {showCurrentGeneration && (
            <Line
              dataKey="currentGeneration"
              type="stepAfter"
              stroke={config.currentGeneration.color}
              strokeWidth={2}
              dot={false}
              animationDuration={SAMPLE_INTERVAL_MS}
              animationMatchBy={matchByDataKey("timestamp")}
              animationEasing="linear"
            />
          )}
          {showNetMaximumPower && (
            <Line
              dataKey="netMaximumPower"
              type="stepAfter"
              stroke={config.netMaximumPower.color}
              strokeWidth={2}
              dot={false}
              animationDuration={SAMPLE_INTERVAL_MS}
              animationMatchBy={matchByDataKey("timestamp")}
              animationEasing="linear"
            />
          )}
          {showNetCurrentPower && (
            <Line
              dataKey="netCurrentPower"
              type="stepAfter"
              stroke={config.netCurrentPower.color}
              strokeWidth={2}
              dot={false}
              animationDuration={SAMPLE_INTERVAL_MS}
              animationMatchBy={matchByDataKey("timestamp")}
              animationEasing="linear"
            />
          )}
        </LineChart>
      </ChartContainer>
    </div>
  );
}