import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BuildingGroupInstance, ResourceAmount } from "pkg/overseer";
import { Button } from "@/components/ui/button";
import {
  Plus as PlusIcon,
  Minus as MinusIcon,
  CircleSmall as StatusIcon,
  Gauge as SpeedIcon,
  PowerOff as DisabledIcon,
  Zap as PowerIcon,
  ZapOff as UnpoweredIcon,
  TriangleAlert as AlertIcon,
  ChevronUp as UpIcon,
  ChevronDown as DownIcon,
  EllipsisVertical as MoreOptionsIcon,
  Trash2 as TrashIcon,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { ColoredBadge } from "@/components/colored-badge";
import { ProcessCard } from "@/features/production/process-card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";

const status = {
  healthy: "var(--healthy-foreground)",
  error: "var(--error-foreground)",
  warning: "var(--warning-foreground)",
  offline: "var(--offline-foreground)",
};

const getStatusColor = (active: boolean, efficient: boolean, enabled: boolean) => {
  if (!enabled) return status.offline;
  if (!active) return status.error;
  if (!efficient) return status.warning;
  return status.healthy;
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

const getSpeedClass = (active: boolean, efficient: boolean, enabled: boolean) => {
  if (!enabled) return "offline";
  if (!active) return "error";
  if (!efficient) return "warning";
  return "healthy";
};

const canStart = (inputBuffer: Record<string, number>, inputs: ResourceAmount[]) => {
  return inputs.every(({ resource, amount }) => (inputBuffer[resource] ?? 0) >= amount);
};

export interface BuildingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  buildingGroup: BuildingGroupInstance;
  changeCount: (count: number) => void;
  setEnabled: () => void;
}

type DialogMode = "add" | "remove" | "removeAll" | null;

export function BuildingCard({
  buildingGroup,
  changeCount,
  setEnabled,
  ...props
}: BuildingCardProps) {
  const { name, totalCount, activeCount, process, enabled, inputBuffer } = buildingGroup;
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [quantity, setQuantity] = useState(1);

  const closeDialog = () => setDialogMode(null);
  const handleOpenChange = (value: React.SetStateAction<boolean>) => {
    const next = typeof value === "function" ? value(dialogMode !== null) : value;
    if (!next) closeDialog();
  };

  const openAdd = () => {
    setQuantity(1);
    setDialogMode("add");
  };
  const openRemove = () => {
    setQuantity(Math.min(1, totalCount));
    setDialogMode("remove");
  };
  const openRemoveAll = () => setDialogMode("removeAll");

  const confirmAdd = () => {
    changeCount(quantity);
    closeDialog();
  };
  const confirmRemove = () => {
    changeCount(-Math.min(quantity, totalCount));
    closeDialog();
  };
  const confirmRemoveAll = () => {
    changeCount(-totalCount);
    closeDialog();
  };

  const consumesPower = process.powerConsumption > 0;
  const efficiency = consumesPower ? process.powerAllocated / process.powerConsumption : 1.0;
  const isActive = activeCount > 0;
  const isEfficient = efficiency >= 1.0;
  const isEnabled = enabled;
  const statusColor = getStatusColor(isActive, isEfficient, isEnabled);
  //const noInput = isPowered && isEnabled && !isActive;
  const noInput = !canStart(inputBuffer, process.inputs) && !isActive && isEnabled;

  const netActivePower = process.powerAllocated * activeCount;
  const netPower = consumesPower ? process.powerConsumption : process.powerGeneration;
  const netTotalPower = netPower * totalCount;

  const noPower = consumesPower && isEnabled && process.powerAllocated === 0.0;
  const lowPower = consumesPower && isEnabled && process.powerAllocated > 0.0 && process.powerAllocated < process.powerConsumption;

  const speed = isEnabled ? efficiency * 100 : 0;
  const speedClass = getSpeedClass(isActive, isEfficient, isEnabled);

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
              {consumesPower ? <DownIcon size={10} /> : <UpIcon size={10} />}
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
        <ColoredBadge variant={speedClass}>
          <SpeedIcon size={14} />
          {speedFmt(speed)}%
        </ColoredBadge>
      </div>
      <div className="flex min-h-5 gap-2 items-center">
        {!enabled && (
          <div className="flex items-center gap-1">
            <DisabledIcon size={13} stroke={status.offline} />
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
            <UnpoweredIcon size={13} stroke={status.error} />
            <span className="text-muted-foreground">No power</span>
          </div>
        )}
        {noInput && (
          <div className="flex items-center gap-1">
            <AlertIcon size={13} stroke={status.error} />
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
            className="cursor-pointer data-checked:bg-(--healthy-foreground)"
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
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-3">
            {totalCount === 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={openRemoveAll}
                className="hover:border-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
              >
                <MinusIcon size={16} className="group-hover/button:hidden" />
                <TrashIcon size={16} className="hidden group-hover/button:block" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => changeCount(-1)}>
                <MinusIcon size={16} />
              </Button>
            )}
            <span className="text-xs">{totalCount}</span>
            <Button variant="outline" size="sm" onClick={() => changeCount(1)}>
              <PlusIcon size={16} />  
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <MoreOptionsIcon size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Options
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={openAdd}>
                  <PlusIcon />
                  Add...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openRemove} disabled={totalCount === 0}>
                  <MinusIcon />
                  Remove...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openRemoveAll} disabled={totalCount === 0} variant="destructive">
                  <TrashIcon />
                  Remove All
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialog */}
      <ResponsiveDialog
        isOpen={dialogMode !== null}
        setIsOpen={handleOpenChange}
        title={
          dialogMode === "add"
            ? `Add ${name}`
            : dialogMode === "remove"
              ? `Remove ${name}`
              : `Remove All ${name}`
        }
      >
        {(dialogMode === "add" || dialogMode === "remove") && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="quantity-input" className="text-sm text-muted-foreground">
                {dialogMode === "add" ? "Number to build" : "Number to remove"}
              </label>
              <Input
                id="quantity-input"
                type="number"
                min={1}
                max={dialogMode === "remove" ? totalCount : undefined}
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setQuantity(Number.isNaN(value) ? 1 : Math.max(1, value));
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={dialogMode === "add" ? confirmAdd : confirmRemove}>
                {dialogMode === "add" ? "Add" : "Remove"}
              </Button>
            </div>
          </div>
        )}
        {dialogMode === "removeAll" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Remove all {totalCount} {name} buildings? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRemoveAll}>
                Remove All
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}