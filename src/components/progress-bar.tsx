import { useEffect, useRef } from "react";
import { TICK_INTERVAL_MS } from "@/context/game";
import { usePause } from "@/hooks/game";

interface ContinuousProgressBarProps {
  active: boolean;
}

function ContinuousProgressBar({
  active
}: ContinuousProgressBarProps) {
  const [pause, _setPause] = usePause();

  return (
    <div
      className={[
        "h-full transition-opacity progress-continuous",
        active ? "opacity-100" : "opacity-55",
      ].join(" ")}
      style={{
        width: "100%",
        animationPlayState: active && !pause ? "running" : "paused",
      }}
    />
  );
}

interface DiscreteProgressBarProps {
  value: number;
  active: boolean;
}

// Drives the fill directly from `value`, animating the transition between ticks instead of relying on keyframes.
function DiscreteProgressBar({
  value,
  active,
}: DiscreteProgressBarProps) {
  const previous = useRef(0);

  useEffect(() => {
    previous.current = value;
  }, [value]);

  const fraction = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={[
        "h-full origin-left transition-opacity bg-primary",
        active ? "opacity-100" : "opacity-55",
      ].join(" ")}
      style={{
        width: `${fraction}%`,
        transition: value >= previous.current ? `width ${TICK_INTERVAL_MS}ms linear` : "none",
      }}
    />
  );
}

export interface ProgressBarProps {
  value: number;
  active: boolean;
  mode: "progress" | "continuous";
}

export function ProgressBar({
  value,
  mode = "progress",
  active = true,
}: ProgressBarProps) {
  const isContinuous = mode === "continuous";
  return (
    <div className="relative flex h-1 mb-1 w-full items-center overflow-x-hidden rounded-full bg-muted">
      {isContinuous ? (
        <ContinuousProgressBar active={active} />
      ) : (
        //<ProgressProgressBar value={value} duration={duration} active={active} />
        <DiscreteProgressBar value={value} active={active} />
      )}
    </div>
  );
}