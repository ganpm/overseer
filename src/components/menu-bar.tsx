import { cn } from "@/lib/utils";

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
      className={cn([
        "text-foreground text-base font-medium",
        "flex",
        className
      ])}
      {...props}
    >
      {title}
    </div>
  );
}