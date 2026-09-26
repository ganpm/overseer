import { useEffect, useRef } from "react";
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
  /** Current fill speed multiplier (e.g. power efficiency * cycle speed); 0 freezes the fill in place. */
  rate: number;
  durationMs: number;
}

// Drives the fill via the Web Animations API instead of a CSS width transition: `currentTime` is
// resynced to `value` every tick (a plain position sync, never an animated sweep, so cycle resets
// can't visibly rewind), while `playbackRate` lets the browser keep interpolating smoothly between
// ticks even as `rate` changes mid-cycle.
function DiscreteProgressBar({
  value,
  active,
  rate,
  durationMs,
}: DiscreteProgressBarProps) {
  const [pause, _setPause] = usePause();
  const elementRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || durationMs <= 0) return;

    let animation = animationRef.current;
    if (!animation) {
      animation = element.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: durationMs, easing: "linear", fill: "forwards" }
      );
      animationRef.current = animation;
    } else {
      animation.effect?.updateTiming({ duration: durationMs });
    }

    const isRunning = active && !pause && rate > 0;
    const fraction = Math.min(Math.max(value, 0), 100) / 100;
    animation.currentTime = fraction * durationMs;
    animation.playbackRate = isRunning ? rate : 0;
    if (isRunning) {
      animation.play();
    } else {
      animation.pause();
    }
  }, [value, active, rate, durationMs, pause]);

  useEffect(() => () => animationRef.current?.cancel(), []);

  return (
    <div
      ref={elementRef}
      className={[
        "h-full origin-left transition-opacity bg-primary",
        active ? "opacity-100" : "opacity-55",
      ].join(" ")}
      style={{ width: "100%", transform: `scaleX(${Math.min(Math.max(value, 0), 100) / 100})` }}
    />
  );
}

export interface ProgressBarProps {
  value: number;
  active: boolean;
  mode: "progress" | "continuous";
  /** Current fill speed multiplier for "progress" mode (e.g. power efficiency * cycle speed). */
  rate?: number;
  /** Total cycle duration in ms for "progress" mode. */
  durationMs?: number;
}

export function ProgressBar({
  value,
  mode = "progress",
  active = true,
  rate = 1,
  durationMs = 0,
}: ProgressBarProps) {
  const isContinuous = mode === "continuous";
  return (
    <div className="relative flex h-1 mb-1 w-full items-center overflow-x-hidden rounded-full bg-muted">
      {isContinuous ? (
        <ContinuousProgressBar active={active} />
      ) : (
        <DiscreteProgressBar value={value} active={active} rate={rate} durationMs={durationMs} />
      )}
    </div>
  );
}