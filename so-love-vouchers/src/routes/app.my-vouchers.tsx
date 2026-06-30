import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Loader2, Clock, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { useCountdown, formatCountdown } from "@/hooks/use-countdown";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useState } from "react";

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

type FilterTab = "all" | "used" | "pending";

function MyVouchersPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterTab>("all");
  useRealtimeInvalidate("voucher_claims", [["my-vouchers", user?.id]]);
  const { data, isLoading } = useQuery({
    queryKey: ["my-vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_claims")
        .select("id, voucher_id, claimed_at, expires_at, redeemed_at, vouchers (id, title, description, value_text, image_url)")
        .eq("user_id", user!.id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ClaimRow[];
    },
    enabled: !!user?.id,
  });

  const filtered = data?.filter((c) => {
    const redeemed = !!c.redeemed_at;
    const expired = new Date(c.expires_at) < new Date() && !redeemed;
    if (filter === "used") return redeemed;
    if (filter === "pending") return !redeemed && !expired;
    return true;
  }) ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">
            Yours
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mt-2 tracking-tight">
            My vouchers
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
            Tap a voucher to redeem in front of staff.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <BadgeCheck className="size-4 text-primary" />
          {data?.length ?? 0} claimed
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "pending", "used"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab === "all" ? "All" : tab === "used" ? "Used" : "Pending"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <BadgeCheck className="size-8 mx-auto text-muted-foreground" />
          <p className="font-semibold mt-3">
            {filter === "used"
              ? "No used vouchers yet"
              : filter === "pending"
                ? "No pending vouchers"
                : "No claimed vouchers yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "used"
              ? "Redeemed vouchers will appear here."
              : "Browse the vouchers tab to claim one."}
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <ClaimCard claim={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClaimCard({ claim }: { claim: ClaimRow }) {
  const cd = useCountdown(claim.expires_at);
  const redeemed = !!claim.redeemed_at;
  const expired = cd.expired && !redeemed;
  const status = redeemed ? "redeemed" : expired ? "expired" : "active";

  const usedDate = claim.redeemed_at
    ? new Date(claim.redeemed_at).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Link
      to="/app/voucher/$id"
      params={{ id: claim.id }}
      disabled={redeemed || expired}
      className={status === "active" ? "" : "pointer-events-none"}
    >
      <Card
        className={`overflow-hidden border-border/70 shadow-sm transition ${
          status === "active"
            ? "hover:shadow-md hover:border-primary/50"
            : status === "expired"
              ? "opacity-60"
              : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row">
          {/* thumbnail */}
          <div className="w-full h-40 sm:w-24 sm:h-24 shrink-0 bg-muted overflow-hidden">
            {claim.vouchers?.image_url ? (
              <img
                src={claim.vouchers.image_url}
                alt={claim.vouchers?.title ?? ""}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BadgeCheck className="size-8 sm:size-6 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* content */}
          <div className="flex-1 min-w-0 p-4 sm:p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-snug truncate">
                  {claim.vouchers?.title ?? "Voucher"}
                </h3>
                {claim.vouchers?.value_text && (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {claim.vouchers.value_text}
                  </p>
                )}
              </div>
              {status === "redeemed" ? (
                <Badge className="bg-green-600 text-white hover:bg-green-600 shrink-0 text-[10px] px-1.5 py-0">
                  <CheckCircle2 className="size-3 mr-1" /> Used
                </Badge>
              ) : status === "expired" ? (
                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                  <XCircle className="size-3 mr-1" /> Expired
                </Badge>
              ) : (
                <Badge className="bg-primary text-primary-foreground hover:bg-primary shrink-0 text-[10px] px-1.5 py-0">
                  <Clock className="size-3 mr-1" /> {formatCountdown(cd)}
                </Badge>
              )}

            </div>

            <div className="mt-1">
              {status === "redeemed" && usedDate ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="size-3" />
                  <span>Used on {usedDate}</span>
                </div>
              ) : status === "expired" ? (
                <p className="text-[11px] text-muted-foreground">
                  Expired{" "}
                  {new Date(claim.expires_at).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Claimed{" "}
                  {new Date(claim.claimed_at).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
