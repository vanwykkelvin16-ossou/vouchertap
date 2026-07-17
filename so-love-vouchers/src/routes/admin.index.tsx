import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CalendarDays, Ticket, Receipt, Users, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  useRealtimeInvalidate("vouchers", [["admin-stats"]]);
  useRealtimeInvalidate("events", [["admin-stats"]]);
  useRealtimeInvalidate("voucher_claims", [["admin-stats"]]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const [events, vouchers, claimsToday, redeemedToday, members] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase
          .from("vouchers")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("voucher_claims")
          .select("id", { count: "exact", head: true })
          .gte("claimed_at", startOfToday.toISOString()),
        supabase
          .from("voucher_claims")
          .select("id", { count: "exact", head: true })
          .gte("redeemed_at", startOfToday.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        events: events.count ?? 0,
        vouchers: vouchers.count ?? 0,
        claimsToday: claimsToday.count ?? 0,
        redeemedToday: redeemedToday.count ?? 0,
        members: members.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const today = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Admin</p>
          <h1
            className="text-3xl md:text-4xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {today} · live overview, updates in real-time.
          </p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border/60 rounded-full px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </header>

      {isLoading || !data ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              Today
            </h2>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Stat icon={Ticket} label="Vouchers claimed" value={data.claimsToday} highlight />
              <Stat icon={Receipt} label="Vouchers redeemed" value={data.redeemedToday} highlight />
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              Overall
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <Stat icon={Ticket} label="Active vouchers" value={data.vouchers} />
              <Stat icon={CalendarDays} label="Events" value={data.events} />
              <Stat icon={Users} label="Customers" value={data.members} />
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              Quick actions
            </h2>
            <div className="flex flex-wrap gap-2">
              <QuickLink to="/admin/vouchers" label="New voucher" />
              <QuickLink to="/admin/events" label="New event" />
              <QuickLink to="/admin/redemptions" label="View redemptions" />
              <QuickLink to="/admin/members" label="Customers" />
            </div>
          </section>

          <Card className="rounded-2xl shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.02] p-5 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Everything you publish here — events, vouchers, shop items and contact info — goes
              live in every member's app{" "}
              <span className="font-semibold text-foreground">instantly</span>, with automatic push
              notifications for new events and vouchers.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function QuickLink({
  to,
  label,
}: {
  to: "/admin/vouchers" | "/admin/events" | "/admin/redemptions" | "/admin/members";
  label: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all"
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`rounded-2xl shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.02] p-5 relative overflow-hidden transition-all hover:shadow-xl hover:shadow-black/[0.07] ${
        highlight ? "border-primary/25" : "border-border/60"
      }`}
    >
      {highlight && <div className="absolute inset-y-0 left-0 w-1 bg-primary" />}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold truncate">
          {label}
        </span>
        <span className="grid place-items-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="size-3.5" />
        </span>
      </div>
      <p
        className="text-4xl font-bold mt-3 tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
        data-numeric
      >
        {value}
      </p>
    </Card>
  );
}
