import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  count?: number;
  countLabel?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  count,
  countLabel = "items",
  action,
  className,
}: AdminPageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {count} {countLabel}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="shrink-0 shadow-sm">
          {ActionIcon && <ActionIcon className="size-4" />}
          {action.label}
        </Button>
      )}
    </header>
  );
}
