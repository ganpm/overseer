import { cn } from "@/lib/utils";
import type { BuildingGroupInstance, ResourceAmount } from "pkg/overseer";
import { Button } from "@/components/ui/button";
import {
  Plus as PlusIcon,
  Minus as MinusIcon,
  CircleSmall as StatusIcon,
  PowerOff as DisabledIcon,
  Zap as PowerIcon,
  ZapOff as UnpoweredIcon,
  TriangleAlert as AlertIcon,
  ChevronUp as UpIcon,
  ChevronDown as DownIcon,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { ProcessCard } from "@/features/production/process-card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const status = {
  on: "var(--color-green-500)", // #22C55E
  stopped: "var(--color-red-500)", // #EF4444
  warning: "var(--color-yellow-500)", // #F59E0B
  off: "var(--color-gray-400)", // #9CA3AF
};

const getStatusColor = (active: boolean, efficient: boolean, enabled: boolean) => {
  if (!enabled) return status.off;
  if (!active) return status.stopped;
  if (!efficient) return status.warning;
  return status.on;
};

const powerFmt = (number: number) => number.toLocaleString(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: "never",
})

const speedFmt = (number: number) => number.toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  signDisplay: "never",
})

const getSpeedColor = (speed:number): { fg: string, bg: string } => {
  if (speed >= 100) return { fg: "text-green-800", bg: "bg-green-100" };
  if (speed > 0) return { fg: "text-yellow-800", bg: "bg-yellow-100" };
  return { fg: "text-muted-foreground", bg: "bg-muted" };
};

const canStart = (inputBuffer: Record<string, number>, inputs: ResourceAmount[]) => {
  return inputs.every(({ resource, amount }) => (inputBuffer[resource] ?? 0) >= amount);
};

export interface BuildingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  buildingGroup: BuildingGroupInstance;
  increaseCount: () => void;
  decreaseCount: () => void;
  setEnabled: () => void;
}

export function BuildingCard({
  buildingGroup,
  increaseCount,
  decreaseCount,
  setEnabled,
  ...props
}: BuildingCardProps) {
  const { name, totalCount, activeCount, process, enabled, inputBuffer } = buildingGroup;
  const consumesPower = process.powerConsumption > 0;
  const efficiency = consumesPower ? process.powerAllocated / process.powerConsumption : 1.0;
  const isActive = activeCount > 0;
  const isEfficient = efficiency >= 1.0;
  const isEnabled = enabled;
  const statusColor = getStatusColor(isActive, isEfficient, isEnabled);
  //const noInput = isPowered && isEnabled && !isActive;
  const noInput = !canStart(inputBuffer, process.inputs) && !isActive && isEnabled;

  const netActivePower = (process.powerGeneration - process.powerConsumption) * activeCount;
  const netTotalPower = (process.powerGeneration - process.powerConsumption) * totalCount;

  const noPower = consumesPower ? process.powerAllocated === 0.0 && isEnabled : false;
  const lowPower = consumesPower ? process.powerAllocated > 0.0 && process.powerAllocated < process.powerConsumption && isEnabled : false;

  const speed = isEnabled ? efficiency * 100 : 0;
  const speedColor = getSpeedColor(speed);

  return (
    <div className="flex flex-col gap-2 shadow-md border border-border rounded-md p-3 w-full bg-card" {...props}>
      <div className="flex justify-between">
        <div className="flex items-center gap-1">
          <StatusIcon size="14" fill={statusColor} stroke={statusColor} />
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-muted-foreground">
            {activeCount} / {totalCount} Active
          </span>
        </div>
      </div>
      <ProgressBar
        value={(process.duration > 0) ? process.elapsed/(process.duration * 1000) * 100 : 100}
        mode={(process.duration > 0) ? "progress" : "continuous"}
        active={activeCount > 0 && buildingGroup.enabled}
      />
      <ProcessCard process={process} />
      <div className="flex items-center justify-between">
        {netTotalPower !== 0.0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary">
            <span className="flex gap-0">
              {netActivePower >= 0 ? <UpIcon size={10} /> : <DownIcon size={10} />}
            </span>
            <span className="font-medium">
              {powerFmt(netActivePower)} MW
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {powerFmt(netTotalPower)} MW
            </span>
          </div>
        )}
        <div>
          <span
            className={cn(
              "text-muted-foreground w-10 px-2 py-0.5 rounded-md",
              speedColor.bg,
              speedColor.fg,
            )}
          >
            {speedFmt(speed)}% speed
          </span>
        </div>
      </div>
      <div className="flex min-h-5 gap-2 items-center">
        {!enabled && (
          <div className="flex items-center gap-1">
            <DisabledIcon size={13} stroke={status.off} />
            <span className="text-muted-foreground">Offline</span>
          </div>
        )}
        {lowPower && (
          <div className="flex items-center gap-1">
            <PowerIcon size={13} stroke={status.warning} />
            <span className="text-muted-foreground">Low power</span>
          </div>
        )}
        {noPower && (
          <div className="flex items-center gap-1">
            <UnpoweredIcon size={13} stroke={status.stopped} />
            <span className="text-muted-foreground">No power</span>
          </div>
        )}
        {noInput && (
          <div className="flex items-center gap-1">
            <AlertIcon size={13} stroke={status.stopped} />
            <span className="text-muted-foreground">Not enough resources</span>
          </div>
        )}
      </div>
      <Separator />
      <div className="flex justify-between" >
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={setEnabled}
            id={`switch-${name}-${process.name}`}
            className="cursor-pointer data-checked:bg-green-500"
          />
          <label
            htmlFor={`switch-${name}-${process.name}`}
            className={cn(
              "text-sm cursor-pointer select-none",
              isEnabled ? "" : "text-muted-foreground"
            )}
          >
            {isEnabled ? "On" : "Off"}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={decreaseCount}>
            <MinusIcon size={16} />
          </Button>
          <span className="text-xs">{totalCount}</span>
          <Button variant="outline" size="sm" onClick={increaseCount}>
            <PlusIcon size={16} />  
          </Button>
        </div>
      </div>
    </div>
  );
}