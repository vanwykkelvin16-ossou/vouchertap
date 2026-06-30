import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Ticket,
  Receipt,
  Users,
  Loader2,
  ArrowRight,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { sendTestPush } from "@/lib/push.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const testPush = useServerFn(sendTestPush);
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

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Live overview of your app. Stats update in real time as members interact."
      />

      {isLoading || !data ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat icon={Ticket} label="Active vouchers" value={data.vouchers} accent="primary" />
            <Stat icon={CalendarDays} label="Events" value={data.events} accent="blue" />
            <Stat icon={Users} label="Members" value={data.members} accent="violet" />
            <Stat icon={Receipt} label="Claims today" value={data.claimsToday} accent="amber" />
            <Stat icon={Receipt} label="Redeemed today" value={data.redeemedToday} accent="emerald" />
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick actions
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <QuickAction
                to="/admin/events"
                icon={CalendarDays}
                label="New event"
                description="Schedule a community event"
              />
              <QuickAction
                to="/admin/vouchers"
                icon={Ticket}
                label="New voucher"
                description="Create a member offer"
              />
              <QuickAction
                to="/admin/breakfast"
                icon={Users}
                label="Add speaker"
                description="Update breakfast meeting"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Push notifications
            </h2>
            <Card className="p-4 border-border/80 space-y-3">
              <p className="text-sm text-muted-foreground">
                Enable notifications on your profile first, then send a test to this device.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await testPush({ data: {} });
                    if (res.sent > 0) {
                      toast.success("Test push sent — check your lock screen.");
                    } else if (res.errors.length > 0) {
                      toast.error(`Push failed: ${res.errors[0]}`);
                    } else {
                      toast.error("No subscription on this device. Enable notifications in Profile.");
                    }
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Test push failed");
                  }
                }}
              >
                <Bell className="size-4 mr-2" />
                Send test notification
              </Button>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: "primary" | "blue" | "violet" | "amber" | "emerald";
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Card className="p-5 border-border/80 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground leading-snug">{label}</span>
        <div className={cn("grid size-8 place-items-center rounded-lg", accentClasses[accent])}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="text-3xl font-bold mt-3 tracking-tight">{value}</p>
    </Card>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Card className="group overflow-hidden border-border/80 hover:border-primary/25 hover:shadow-md transition-all">
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-4 w-full justify-between group-hover:bg-muted/60">
          <Link to={to as any}>
            Go
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
