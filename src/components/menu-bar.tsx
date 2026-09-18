import { cn } from "@/lib/utils";
import { PauseButton } from "@/features/simulation/pause-button";
import { ToggleThemeButton } from "@/features/theme/toggle-theme-button";




export interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}

export function MenuBar({
  title,
  className,
  ...props
}: MenuBarProps) {
  return (
    <div
      className={cn(
        "text-foreground text-base font-medium",
        "flex items-center justify-between",
        className
      )}
      {...props}
    >
      <span className="flex items-center justify-start">
        {title}
      </span>
      <div className="flex items-center justify-end gap-2">
        <ToggleThemeButton />
        <PauseButton className="w-23" />
      </div>
    </div>
  );
}