import type { ProcessInstance } from "pkg/overseer";
import { Separator } from "@/components/ui/separator";
import {
  ArrowBigRight as ProcessIcon,
  Infinity as InfinityIcon,
  Zap as PowerIcon,
  Clock as DurationIcon,
  SquareArrowRightEnter as InputIcon,
  SquareArrowRightExit as OutputIcon,
} from "lucide-react"

export interface ProcessCardProps {
  process: ProcessInstance
}

export function ProcessCard({
  process
}: ProcessCardProps) {
  return (
    <div className="flex w-full text-muted-foreground border rounded-md">
      <div className="flex-1 flex flex-col justify-start items-start p-2 overflow-x-auto">
        {process.inputs.length > 0 && (
          process.inputs.map((input) => (
            (input.amount > 0) ? (
              <div key={input.resource} className="flex items-center gap-1 whitespace-nowrap">
                <InputIcon size={13} />
                {input.amount} {input.resource}
              </div>
            ) : (
              <div key={input.resource} className="flex items-center gap-1 whitespace-nowrap">
                <InfinityIcon size={13} />
                {input.resource}
              </div>
            )
          ))
        )}
        {process.powerConsumption > 0 && (
          <div className="flex items-center gap-1">
            <PowerIcon size={13} />
            {process.powerConsumption} MW
          </div>
        )}
      </div>
      <Separator orientation="vertical" className="my-2" />
      <div className="flex flex-col justify-start items-center p-2 w-fit">
        <div className="flex items-center select-none">
          &nbsp;
          <ProcessIcon size={13} />
          &nbsp;
        </div>
        {process.duration > 0 && (
          <div className="flex items-center gap-1">
            <DurationIcon size={13} />
            {process.duration.toFixed(1)}s
          </div>
        )}
      </div>
      <Separator orientation="vertical" className="my-2" />
      <div className="flex-1 flex flex-col justify-start text-foreground items-start p-2 overflow-x-auto">
        {process.outputs.length > 0 && (
          process.outputs.map((output) => (
            (output.amount > 0) ? (
              <div key={output.resource} className="flex items-center gap-1 whitespace-nowrap">
                <OutputIcon size={13} />
                {output.amount} {output.resource}
              </div>
            ) : (
              <div key={output.resource} className="flex items-center gap-1 whitespace-nowrap">
                <InfinityIcon size={13} />
                {output.resource}
              </div>
            )
          ))
        )}
        {process.powerGeneration > 0 && (
          <div className="flex items-center gap-1">
            <PowerIcon size={13} />
            {process.powerGeneration} MW
          </div>
        )}
      </div>
    </div>
  );
}