import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCountdown, formatCountdown } from "@/hooks/use-countdown";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

/**
 * Shared ticket language for the voucher workflow (browse → claim → redeem).
 * Every voucher surface is built from the same three parts: a punched ticket
 * block, a perforated tear line, and one countdown scale with three urgency
 * steps. Keeping them here means the three screens can't drift apart.
 */

export type ClaimStatus = "active" | "redeemed" | "expired";
export type Urgency = "calm" | "soon" | "urgent";

const HOUR = 3600;

export function urgencyOf(totalSec: number): Urgency {
  if (totalSec <= HOUR) return "urgent";
  if (totalSec <= 6 * HOUR) return "soon";
  return "calm";
}

/** Text/accent colour per urgency step — one scale, used everywhere. */
export const urgencyText: Record<Urgency, string> = {
  calm: "text-foreground",
  soon: "text-amber-600 dark:text-amber-400",
  urgent: "text-primary",
};

const urgencyChip: Record<Urgency, string> = {
  calm: "bg-foreground/[0.06] text-foreground",
  soon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  urgent: "bg-primary/12 text-primary",
};

const urgencyBar: Record<Urgency, string> = {
  calm: "bg-foreground/70",
  soon: "bg-amber-500",
  urgent: "bg-primary",
};

/** Short, human reference printed on every ticket. */
export function serialOf(id: string, suffix?: string) {
  const head = id.slice(0, 4).toUpperCase();
  return suffix ? `SLK-${head}-${suffix}` : `SLK-${head}`;
}

/**
 * A card with two semicircular notches punched out of its sides. `notchY`
 * places the punch (and the tear line you pair it with) — a percentage or any
 * CSS length, e.g. `calc(100% - 76px)` to sit a fixed distance off the bottom.
 */
export function TicketBlock({
  children,
  className,
  innerClassName,
  notchY = "50%",
  notch,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  notchY?: string;
  notch?: string;
}) {
  return (
    <div className={cn("slk-ticket-shadow group h-full", className)}>
      <div
        className={cn(
          "slk-punch relative flex h-full flex-col rounded-3xl bg-card",
          innerClassName,
        )}
        style={
          { "--notch-y": notchY, ...(notch ? { "--notch": notch } : {}) } as React.CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

/** The dashed rule that lines up with a `TicketBlock`'s notches. */
export function Perforation({ className }: { className?: string }) {
  return <div className={cn("slk-perf mx-4", className)} aria-hidden="true" />;
}

/** Compact live countdown, coloured by urgency. */
export function CountdownChip({
  expiresAt,
  className,
  icon = true,
}: {
  expiresAt: string;
  className?: string;
  icon?: boolean;
}) {
  const cd = useCountdown(expiresAt);
  const level = urgencyOf(cd.totalSec);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums",
        urgencyChip[level],
        className,
      )}
    >
      {icon && <Clock className={cn("size-3", level === "urgent" && "slk-urgent")} />}
      {formatCountdown(cd)}
    </span>
  );
}

/** Thin bar showing how much of the claim window is left. */
export function WindowBar({
  claimedAt,
  expiresAt,
  className,
}: {
  claimedAt: string;
  expiresAt: string;
  className?: string;
}) {
  const cd = useCountdown(expiresAt);
  const total = Math.max(1, new Date(expiresAt).getTime() - new Date(claimedAt).getTime());
  const pct = Math.min(100, Math.max(0, (cd.diff / total) * 100));
  const level = urgencyOf(cd.totalSec);

  // The width depends on the current clock, which differs between the server
  // render and hydration. Start full on both, then settle on the first tick.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-foreground/[0.08]", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={mounted ? Math.round(pct) : 100}
      aria-label="Time left to redeem"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-1000 ease-linear",
          urgencyBar[level],
        )}
        style={{ width: mounted ? `${pct}%` : "100%" }}
      />
    </div>
  );
}

/** Status pill for a claimed voucher: live countdown, Used, or Expired. */
export function StatusPill({
  status,
  expiresAt,
  className,
}: {
  status: ClaimStatus;
  expiresAt: string;
  className?: string;
}) {
  if (status === "redeemed") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <CheckCircle2 className="size-3" /> Used
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground",
          className,
        )}
      >
        <XCircle className="size-3" /> Expired
      </span>
    );
  }
  return <CountdownChip expiresAt={expiresAt} className={className} />;
}

/** Big split-flap style clock used on the voucher detail ticket. */
export function CountdownDisplay({ expiresAt }: { expiresAt: string }) {
  const cd = useCountdown(expiresAt);
  const level = urgencyOf(cd.totalSec);
  const units = cd.days
    ? ([
        [cd.days, "days"],
        [cd.hours, "hrs"],
        [cd.minutes, "min"],
      ] as const)
    : ([
        [cd.hours, "hrs"],
        [cd.minutes, "min"],
        [cd.seconds, "sec"],
      ] as const);

  return (
    <div className="flex items-stretch gap-2">
      {units.map(([value, label]) => (
        <div
          key={label}
          className="flex-1 rounded-2xl bg-foreground/[0.04] px-2 py-3 text-center dark:bg-foreground/[0.06]"
        >
          <p
            className={cn(
              "font-serial text-2xl font-bold tabular-nums leading-none",
              urgencyText[level],
              level === "urgent" && label === "sec" && "slk-urgent",
            )}
          >
            {String(value).padStart(2, "0")}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Placeholder ticket used while a list loads. */
export function TicketSkeleton({ variant = "card" }: { variant?: "card" | "row" }) {
  if (variant === "row") {
    return (
      <TicketBlock notchY="calc(100% - 30px)">
        <div className="flex gap-4 p-4">
          <div className="size-16 shrink-0 animate-pulse rounded-2xl bg-foreground/[0.07]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-foreground/[0.07]" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-foreground/[0.05]" />
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="h-1 w-full animate-pulse rounded-full bg-foreground/[0.06]" />
        </div>
      </TicketBlock>
    );
  }
  return (
    <TicketBlock notchY="calc(100% - 92px)">
      <div className="aspect-[4/3] animate-pulse rounded-t-3xl bg-foreground/[0.07]" />
      <div className="space-y-2.5 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-foreground/[0.07]" />
        <div className="h-3 w-full animate-pulse rounded-full bg-foreground/[0.05]" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-foreground/[0.05]" />
      </div>
      <div className="mt-auto p-5 pt-0">
        <div className="h-11 w-full animate-pulse rounded-full bg-foreground/[0.06]" />
      </div>
    </TicketBlock>
  );
}
