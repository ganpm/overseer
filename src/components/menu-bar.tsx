import { cn } from "@/lib/utils";
import {
  Pause as PauseIcon,
  Play as PlayIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}

export function MenuBar({
  title,
  className,
  ...props
}: MenuBarProps) {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className={cn([
        "text-foreground text-base font-medium",
        "flex items-center",
        className
      ])}
      {...props}
    >
      <span className="flex-1 flex items-center justify-start">{title}</span>
      <div className="flex-1 flex items-center justify-end">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {paused && ("Paused")}
          <Button variant="outline" onClick={() => setPaused((prev) => !prev)}>
            {paused ? (
              <PauseIcon fill="#000" stroke="#000" />
            ) : (
              <PlayIcon fill="#000" stroke="#000" />
            )}
          </Button>
        </span>
      </div>
    </div>
  );
}