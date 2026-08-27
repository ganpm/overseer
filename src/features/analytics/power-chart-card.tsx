import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { SAMPLE_INTERVAL_MS } from "@/game/game-context.tsx";

interface Field {
  key: keyof PowerChartData;
  label: string;
  icon: React.ReactNode;
  value: number;
  checked: boolean;
  setChecked: () => void;
}

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


const unsignedFormat = (number: number) => number.toLocaleString(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
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

  const [showMaximumConsumption, setShowMaximumConsumption] = useState<boolean>(false);
  const [showMaximumGeneration, setShowMaximumGeneration] = useState<boolean>(false);
  const [showNetMaximumPower, setShowNetMaximumPower] = useState<boolean>(false);
  const [showCurrentConsumption, setShowCurrentConsumption] = useState<boolean>(true);
  const [showCurrentGeneration, setShowCurrentGeneration] = useState<boolean>(true);
  const [showNetCurrentPower, setShowNetCurrentPower] = useState<boolean>(true);

  const fields: Field[] = [
    {
      key: "averageCurrentConsumption",
      label: "Consumption",
      icon: <CurrentConsumptionIcon size={16} />,
      value: series.averageCurrentConsumption,
      checked: showCurrentConsumption,
      setChecked: () => setShowCurrentConsumption((prev) => !prev),
    },
    {
      key: "averageCurrentGeneration",
      label: "Generation",
      icon: <CurrentGenerationIcon size={16} />,
      value: series.averageCurrentGeneration,
      checked: showCurrentGeneration,
      setChecked: () => setShowCurrentGeneration((prev) => !prev),
    },
    {
      key: "averageNetCurrentPower",
      label: "Net Power",
      icon: <NetCurrentPowerIcon size={16} />,
      value: series.averageNetCurrentPower,
      checked: showNetCurrentPower,
      setChecked: () => setShowNetCurrentPower((prev) => !prev),
    },
    {
      key: "averageMaximumConsumption",
      label: "Max Consumption",
      icon: <MaximumConsumptionIcon size={16} />,
      value: series.averageMaximumConsumption,
      checked: showMaximumConsumption,
      setChecked: () => setShowMaximumConsumption((prev) => !prev),
    },
    {
      key: "averageMaximumGeneration",
      label: "Max Generation",
      icon: <MaximumGenerationIcon size={16} />,
      value: series.averageMaximumGeneration,
      checked: showMaximumGeneration,
      setChecked: () => setShowMaximumGeneration((prev) => !prev)
    },
    {
      key: "averageNetMaximumPower",
      label: "Net Max Power",
      icon: <NetMaximumPowerIcon size={16} />,
      value: series.averageNetMaximumPower,
      checked: showNetMaximumPower,
      setChecked: () => setShowNetMaximumPower((prev) => !prev)
    },
  ];

  return (
    <div className="flex flex-col gap-3 border rounded-md p-3" {...props}>
      <div className="flex flex-col gap-1">
        {fields.map(({ key, label, icon, value, checked, setChecked}) => (
          <div
            key={key}
            className={cn(
              "flex cursor-pointer",
              checked ? "text-foreground" : "text-muted-foreground",
              checked ? "hover:text-muted-foreground" : "hover:text-foreground"
            )}
            onClick={setChecked}
          >
            <div className="flex-1 flex items-center gap-2">
              <span className="flex items-center gap-0">
                {icon}
                <PowerIcon size={16} />
              </span>
              {label}
            </div>
            <div className="flex-1 flex justify-end items-center mr-5">
              {unsignedFormat(value)} MW
            </div>
          </div>
        ))}
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