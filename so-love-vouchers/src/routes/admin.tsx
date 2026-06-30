import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  LayoutDashboard,
  CalendarDays,
  Coffee,
  Ticket,
  Receipt,
  Users,
  Phone,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isMemberDisabled } from "@/lib/member-status";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/breakfast", label: "Breakfast", icon: Coffee },
  { to: "/admin/vouchers", label: "Vouchers", icon: Ticket },
  { to: "/admin/redemptions", label: "Redemptions", icon: Receipt },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/contact", label: "Contact", icon: Phone },
];

function AdminLayout() {
  const { session, loading, user, signOut } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
      return;
    }
    if (!loading && !roleLoading && session && isAdmin === false) {
      navigate({ to: "/app/vouchers" });
    }
  }, [session, loading, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    isMemberDisabled(user.id)
      .then((disabled) => {
        if (cancelled || !disabled) return;
        toast.error("Your account has been disabled.");
        void signOut().then(() => navigate({ to: "/login" }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, signOut, navigate]);

  if (loading || roleLoading || !session || !isAdmin) {
    return (
      <div className="min-h-dvh grid place-items-center bg-muted/30">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPage = NAV.find((n) =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to),
  );

  return (
    <div className="min-h-dvh bg-[linear-gradient(160deg,hsl(var(--muted)/0.45)_0%,hsl(var(--background))_45%)] flex flex-col md:flex-row">
      <aside className="md:w-64 md:min-h-dvh md:sticky md:top-0 md:self-start bg-background/80 backdrop-blur-md border-b md:border-b-0 md:border-r border-border/80 flex md:flex-col shadow-sm">
        <div className="hidden md:block p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Admin portal
              </p>
              <h1 className="text-sm font-bold leading-tight truncate">So Love Krugersdorp</h1>
            </div>
          </div>
        </div>

        <div className="md:hidden px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Admin
            </p>
            <p className="text-sm font-semibold">{currentPage?.label ?? "Portal"}</p>
          </div>
          <Link
            to="/app/vouchers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            App
          </Link>
        </div>

        <nav className="flex-1 flex md:flex-col gap-0.5 p-2 overflow-x-auto md:overflow-x-visible">
          {NAV.map((n) => {
            const active = n.exact
              ? location.pathname === n.to
              : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                {active && (
                  <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary-foreground/40" />
                )}
                <Icon className="size-4 shrink-0" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block p-3 border-t border-border/60">
          <Link
            to="/app/vouchers"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to member app
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
