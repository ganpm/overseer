import type { BuildingGroupInstance } from "pkg/overseer";
import { Button } from "@/components/ui/button";
import {
  Plus as PlusIcon,
  Minus as MinusIcon,
  Power as PowerIcon,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { ProcessCard } from "@/features/production/process-card";


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
  const { name, totalCount, activeCount, idleCount, process, enabled } = buildingGroup;
  return (
    <div className="flex flex-col gap-3 border rounded-md p-3 w-full" {...props}>
      <div className="flex">
        <div className="flex-1 flex flex-col gap-1">
          <span>
            <span className="font-medium">{name} &times; {totalCount}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({activeCount} active, {idleCount} idle)
            </span>
          </span>
          <span className="font-medium text-xs text-muted-foreground">
            {process.name}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={setEnabled}>
            <PowerIcon size={16} color={enabled ? "#22C55E" : "#9CA3AF"} />
          </Button>
          <Button variant="outline" size="sm" onClick={increaseCount}>
            <PlusIcon size={16} />
          </Button>
          <Button variant="destructive" size="sm" onClick={decreaseCount}>
            <MinusIcon size={16} />
          </Button>
        </div>
      </div>
      <ProgressBar
        value={(process.duration > 0) ? process.elapsed/(process.duration * 1000) * 100 : 100}
        mode={(process.duration > 0) ? "progress" : "continuous"}
        active={activeCount > 0 && buildingGroup.enabled}
      />
      <ProcessCard process={process} />
    </div>
  );
}