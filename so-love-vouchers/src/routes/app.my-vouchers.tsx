import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SmartImage } from "@/components/smart-image";
import {
  Perforation,
  StatusPill,
  TicketBlock,
  TicketSkeleton,
  WindowBar,
  serialOf,
  type ClaimStatus,
} from "@/components/voucher-kit";
import { BadgeCheck, ArrowRight, CalendarDays, Ticket } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/my-vouchers")({
  component: MyVouchersPage,
});

type ClaimRow = {
  id: string;
  voucher_id: string;
  claimed_at: string;
  expires_at: string;
  redeemed_at: string | null;
  vouchers: {
    id: string;
    title: string;
    description: string | null;
    value_text: string | null;
    image_url: string | null;
  } | null;
};

type FilterTab = "all" | "pending" | "used" | "expired";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Active" },
  { key: "used", label: "Used" },
  { key: "expired", label: "Expired" },
];

function statusOf(c: ClaimRow): ClaimStatus {
  if (c.redeemed_at) return "redeemed";
  return new Date(c.expires_at) < new Date() ? "expired" : "active";
}

function MyVouchersPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterTab>("all");
  useRealtimeInvalidate("voucher_claims", [["my-vouchers", user?.id]]);
  const { data, isLoading } = useQuery({
    queryKey: ["my-vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_claims")
        .select(
          "id, voucher_id, claimed_at, expires_at, redeemed_at, vouchers (id, title, description, value_text, image_url)",
        )
        .eq("user_id", user!.id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ClaimRow[];
    },
    enabled: !!user?.id,
  });

  const counts = {
    all: data?.length ?? 0,
    pending: data?.filter((c) => statusOf(c) === "active").length ?? 0,
    used: data?.filter((c) => statusOf(c) === "redeemed").length ?? 0,
    expired: data?.filter((c) => statusOf(c) === "expired").length ?? 0,
  };

  const filtered =
    data?.filter((c) => {
      const status = statusOf(c);
      if (filter === "used") return status === "redeemed";
      if (filter === "expired") return status === "expired";
      if (filter === "pending") return status === "active";
      return true;
    }) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <BadgeCheck className="size-3" />
            Yours
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.05]">
            My vouchers
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">
            Open a voucher at the counter and tap redeem in front of staff.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold md:self-auto">
          <Ticket className="size-4 text-primary" />
          {counts.pending} ready to use
        </div>
      </header>

      {/* Filters */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="slk-segment">
          {TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground/70",
                  )}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <TicketSkeleton variant="row" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map((c, i) => (
            <li
              key={c.id}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <ClaimTicket claim={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterTab }) {
  const copy = {
    all: {
      title: "No claimed vouchers yet",
      body: "Head to the Vouchers tab and claim your first one.",
    },
    pending: {
      title: "Nothing active right now",
      body: "Claim a voucher and it'll show up here with a live countdown.",
    },
    used: { title: "No used vouchers yet", body: "Redeemed vouchers stay here as your receipts." },
    expired: {
      title: "Nothing expired",
      body: "Vouchers you don't redeem in time will land here.",
    },
  }[filter];

  return (
    <TicketBlock notchY="50%" className="mx-auto max-w-md">
      <div className="px-8 pb-6 pt-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BadgeCheck className="size-7" />
        </div>
        <p className="mt-4 text-lg font-bold">{copy.title}</p>
      </div>
      <Perforation />
      <p className="px-8 pb-10 pt-6 text-center text-sm text-muted-foreground">{copy.body}</p>
    </TicketBlock>
  );
}

function ClaimTicket({ claim }: { claim: ClaimRow }) {
  // Live tick so a voucher flips from active to expired without a reload.
  const cd = useCountdown(claim.expires_at);
  const redeemed = !!claim.redeemed_at;
  const status: ClaimStatus = redeemed ? "redeemed" : cd.expired ? "expired" : "active";
  const dim = status === "expired";

  const body = (
    // Footer is a fixed 40px strip; the notches meet the perforation there.
    <TicketBlock
      notchY="calc(100% - 40px)"
      innerClassName={cn(dim && "opacity-65", status === "active" && "group-hover:bg-card")}
    >
      <div className="flex flex-1 gap-3.5 p-4">
        <SmartImage
          src={claim.vouchers?.image_url}
          alt=""
          wrapperClassName={cn("size-16 shrink-0 rounded-2xl", dim && "grayscale")}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight">
                {claim.vouchers?.title ?? "Voucher"}
              </h3>
              {claim.vouchers?.value_text && (
                <p className="mt-0.5 truncate text-xs font-semibold text-primary">
                  {claim.vouchers.value_text}
                </p>
              )}
            </div>
            <StatusPill status={status} expiresAt={claim.expires_at} className="shrink-0" />
          </div>

          {status === "active" && (
            <WindowBar
              claimedAt={claim.claimed_at}
              expiresAt={claim.expires_at}
              className="mt-auto"
            />
          )}
        </div>
      </div>

      <Perforation />

      <div className="flex h-10 items-center justify-between gap-2 px-4">
        <span className="truncate text-[11px] text-muted-foreground">
          {status === "redeemed" && claim.redeemed_at ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3" />
              Used {formatDay(claim.redeemed_at)}
            </span>
          ) : status === "expired" ? (
            <>Expired {formatDay(claim.expires_at)}</>
          ) : (
            <>Claimed {formatDay(claim.claimed_at)}</>
          )}
        </span>

        {status === "active" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            Open
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="font-serial text-[10px] text-muted-foreground/60">
            Nº {serialOf(claim.id)}
          </span>
        )}
      </div>
    </TicketBlock>
  );

  if (status !== "active") return body;

  return (
    <Link
      to="/app/voucher/$id"
      params={{ id: claim.id }}
      className="block transition-transform duration-300 ease-out hover:-translate-y-0.5"
    >
      {body}
    </Link>
  );
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}
