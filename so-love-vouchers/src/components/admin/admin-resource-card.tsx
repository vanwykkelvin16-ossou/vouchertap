import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AdminResourceCardProps = {
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  imageUrl?: string | null;
  imageShape?: "square" | "circle";
  fallbackIcon: LucideIcon;
  badges?: { label: string; variant?: "default" | "secondary" | "outline" }[];
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
};

export function AdminResourceCard({
  title,
  subtitle,
  meta,
  imageUrl,
  imageShape = "square",
  fallbackIcon: FallbackIcon,
  badges,
  onEdit,
  onDelete,
  className,
}: AdminResourceCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/80 bg-card transition-all duration-200 hover:border-primary/25 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-stretch gap-0 sm:gap-4">
        <div
          className={cn(
            "relative w-24 sm:w-28 shrink-0 bg-muted",
            imageShape === "circle" ? "m-3 sm:m-4" : "",
          )}
        >
          <div
            className={cn(
              "size-full overflow-hidden bg-muted",
              imageShape === "circle"
                ? "aspect-square rounded-full ring-2 ring-background"
                : "h-full min-h-[5.5rem] sm:min-h-[6.5rem] rounded-none sm:rounded-xl sm:m-0 sm:aspect-[4/3]",
            )}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full min-h-[5.5rem] place-items-center text-muted-foreground/70">
                <FallbackIcon className="size-6" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 min-w-0 flex-col justify-center gap-1.5 py-3 pr-3 sm:py-4 sm:pr-4">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold leading-snug truncate">{title}</h3>
            {badges?.map((b) => (
              <Badge
                key={b.label}
                variant={b.variant ?? "secondary"}
                className="text-[10px] font-medium"
              >
                {b.label}
              </Badge>
            ))}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
          )}
          {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        </div>

        <div className="flex flex-col justify-center gap-1 border-l border-border/60 px-2 sm:px-3 sm:opacity-80 sm:group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="size-9 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            aria-label="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
