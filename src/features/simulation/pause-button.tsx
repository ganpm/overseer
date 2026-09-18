import { cn } from "@/lib/utils";
import {
  Pause as PauseIcon,
  Play as PlayIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePause } from "@/hooks/game";

export interface PauseButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function PauseButton({ className, ...props }: PauseButtonProps) {
  const [pause, togglePause] = usePause();
  return (
    <Button
      onClick={togglePause}
      className={cn(
        "flex items-center",
        className
      )}
      {...props}
    >
      {pause ? (
        <>
          <PauseIcon strokeWidth={3} />
          <span className="flex-1 flex justify-center">Paused</span>
        </>
      ) : (
        <>
          <PlayIcon strokeWidth={3} />
          <span className="flex-1 flex justify-center">Playing</span>
        </>
      )}
    </Button>
  );
}