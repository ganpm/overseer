import type { BuildingGroupInstance } from "pkg/overseer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plus as PlusIcon,
  Minus as MinusIcon,
  ArrowBigRight as ProcessIcon,
  Infinity as InfinityIcon,
  Zap as PowerIcon,
  Timer as DurationIcon,
  SquareArrowRightEnter as InputIcon,
  SquareArrowRightExit as OutputIcon,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";


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
  const { buildingName, totalCount, activeCount, idleCount, process } = buildingGroup;
  return (
    <div className="flex flex-col gap-3 border rounded-md p-3 w-full" {...props}>
      <div className="flex">
        <div className="flex flex-col flex-1 gap-1">
          <span>
            <span className="font-medium">{buildingName} &times; {totalCount}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({activeCount} active, {idleCount} idle)
            </span>
          </span>
          <span className="font-medium text-xs text-muted-foreground">
            {process.processName}
          </span>
        </div>
        <div className="flex flex-row gap-1">
          <Button variant="outline" size="sm" onClick={increaseCount}>
            <PlusIcon size={16} />
          </Button>
          <Button variant="destructive" size="sm" onClick={decreaseCount}>
            <MinusIcon size={16} />
          </Button>
        </div>
      </div>
      <ProgressBar
        value={(process.duration > 0) ? (1 - process.remainingSeconds/process.duration) * 100 : 100}
        duration={process.duration}
        mode={(process.duration > 0) ? "progress" : "continuous"}
        active={activeCount > 0}
      />
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 w-full text-muted-foreground">
          <div className="flex flex-col justify-start items-start flex-1 overflow-x-auto">
            {process.inputs.length > 0 && (
              process.inputs.map((input) => (
                (input.amount > 0) ? (
                  <div key={input.resource} className="inline-flex items-center gap-1 whitespace-nowrap">
                    <InputIcon size={16} className="inline-block" />
                    {input.amount} {input.resource}
                  </div>
                ) : (
                  <div key={input.resource} className="inline-flex items-center gap-1 whitespace-nowrap">
                    <InfinityIcon size={16} className="inline-block" />
                    {input.resource}
                  </div>
                )
              ))
            )}
            {process.powerConsumption > 0 && (
              <div className="inline-flex items-center gap-1">
                <PowerIcon size={16} className="inline-block" />
                {process.powerConsumption} MW
              </div>
            )}
          </div>
          <Separator orientation="vertical" />
          <div className="flex flex-col justify-start items-center w-12">
            <div className="inline-flex items-center select-none">
              &nbsp;
              <ProcessIcon size={16} className="inline-block" />
              &nbsp;
            </div>
            {process.duration > 0 && (
              <div className="inline-flex items-center">
                <DurationIcon size={16} className="inline-block" />
                {process.duration.toFixed(1)}s
              </div>
            )}
          </div>
          <Separator orientation="vertical" />
          <div className="flex flex-col justify-start items-start flex-1 overflow-x-auto">
            {process.outputs.length > 0 && (
              process.outputs.map((output) => (
                (output.amount > 0) ? (
                  <div key={output.resource} className="inline-flex items-center gap-1 whitespace-nowrap">
                    <OutputIcon size={16} className="inline-block" />
                    {output.amount} {output.resource}
                  </div>
                ) : (
                  <div key={output.resource} className="inline-flex items-center gap-1 whitespace-nowrap">
                    <InfinityIcon size={16} className="inline-block" />
                    {output.resource}
                  </div>
                )
              ))
            )}
            {process.powerGeneration > 0 && (
              <div className="inline-flex items-center gap-1">
                <PowerIcon size={16} className="inline-block" />
                {process.powerGeneration} MW
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}