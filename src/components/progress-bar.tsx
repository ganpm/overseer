import { useEffect, useRef, useState } from "react";

interface ContinuousProgressBarProps {
  active: boolean;
}

function ContinuousProgressBar({
  active
}: ContinuousProgressBarProps) {
  return (
    <div
      className={[
        "h-full transition-opacity progress-continuous",
        active ? "opacity-100" : "opacity-55",
      ].join(" ")}
      style={{
        width: "100%",
        animationPlayState: active ? "running" : "paused",
      }}
    />
  );
}

interface ProgressProgressBarProps {
  value: number;
  duration: number;
  active: boolean;
}

function ProgressProgressBar({
  value,
  duration,
  active
}: ProgressProgressBarProps) {
  const previousValue = useRef(value);
  const [animationKey, setAnimationKey] = useState(0);

  // Detect progress reset
  useEffect(() => {
    if (value < previousValue.current) {
      setAnimationKey((prev) => prev + 1);
    }
    previousValue.current = value;
  }, [value]);

  return (
    <>
      <div
        key={animationKey}
        className={[
          "h-full origin-left transition-opacity bg-primary",
          active ? "opacity-100" : "opacity-55",
        ].join(" ")}
        style={{
          width: "100%",
          animation: `progress ${duration}s linear forwards`,
          animationPlayState: active ? "running" : "paused",
        }}
      />
      <style>
        {`
          @keyframes progress {
            from {
              transform: scaleX(0);
            }
            to {
              transform: scaleX(1);
            }
          }
        `}
      </style>
    </>
  );
}

export interface ProgressBarProps {
  value: number;
  duration: number;
  active: boolean;
  mode: "progress" | "continuous";
}

export function ProgressBar({
  value,
  duration,
  mode = "progress",
  active = true,
}: ProgressBarProps) {
  const isContinuous = mode === "continuous";
  return (
    <div className="relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted">
      {isContinuous ? (
        <ContinuousProgressBar active={active} />
      ) : (
        <ProgressProgressBar value={value} duration={duration} active={active} />
      )}
    </div>
  );
}