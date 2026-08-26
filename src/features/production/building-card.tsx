import type { BuildingGroupInstance } from "pkg/overseer";
import { Button } from "@/components/ui/button";
import {
  Plus as PlusIcon,
  Minus as MinusIcon,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { ProcessCard } from "@/features/production/process-card";


export interface BuildingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  buildingGroup: BuildingGroupInstance;
  increaseCount: () => void;
  decreaseCount: () => void;
}

export function BuildingCard({
  buildingGroup,
  increaseCount,
  decreaseCount,
  ...props
}: BuildingCardProps) {
  const { name, totalCount, activeCount, idleCount, process } = buildingGroup;
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
          <Button variant="outline" size="sm" onClick={increaseCount}>
            <PlusIcon size={16} />
          </Button>
          <Button variant="destructive" size="sm" onClick={decreaseCount}>
            <MinusIcon size={16} />
          </Button>
        </div>
      </div>
      <ProgressBar
        value={(process.duration > 0) ? process.elapsed/process.duration * 100 : 100}
        duration={process.duration}
        mode={(process.duration > 0) ? "progress" : "continuous"}
        active={activeCount > 0}
      />
      <ProcessCard process={process} />
    </div>
  );
}