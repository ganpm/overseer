import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";

interface ToggleThemeButtonProps {
  className?: string;
}

export function ToggleThemeButton({ className }: ToggleThemeButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Switch
      className={cn(className)}
      size="md"
      checked={isDark}
      onCheckedChange={toggleTheme}
      thumbIcon={
        isDark ? (
          <Moon size="16" />
        ) : (
          <Sun size="16" />
        )
      }
    />
  );
}