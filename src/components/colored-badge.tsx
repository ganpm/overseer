import { cn } from "@/lib/utils";

export interface ColoredBadgeProps {
  children: React.ReactNode;
  variant: "healthy" | "warning" | "error" | "offline",
  className?: string;
}

export function ColoredBadge({
  children,
  variant,
  className,
}: ColoredBadgeProps) {

  return (
    <span
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-md",
        variant,
        className
      )}
    >
      {children}
    </span>
  );
}