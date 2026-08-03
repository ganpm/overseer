import { useEffect, useRef, useState } from "react";
import { UI_SNAPSHOT_INTERVAL_MS } from "@/game/game-context";

export interface ProgressBarProps {
  value: number;
  mode?: "progress" | "continuous";
  active?: boolean;
}

export function ProgressBar({
  value,
  mode = "progress",
  active = true,
}: ProgressBarProps) {
  const previous = useRef(value);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (value >= previous.current) {
      setAnimate(true);
    } else {
      setAnimate(false);
    }
    previous.current = value;
  }, [value]);

  const percentage = Math.min(Math.max(value, 0), 100);
  const isContinuous = mode === "continuous";
  const fillWidth = isContinuous ? 100 : percentage;

  return (
    <div
      className="relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted"
    >
      <div
        className={[
          "h-full transition-opacity",
          isContinuous
            ? "progress-continuous"
            : "bg-primary",
          active ? "opacity-100" : "opacity-55",
        ].join(" ")}
        style={{
          width: `${fillWidth}%`,
          transition: animate ? `width ${UI_SNAPSHOT_INTERVAL_MS}ms linear` : "none",
        }}
      >
      </div>
    </div>
  );
}