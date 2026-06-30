import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { hasAccess } from "@/lib/access-code";
import { isMemberDisabled } from "@/lib/member-status";
import { toast } from "sonner";
import {
  CalendarDays,
  TicketPercent,
  BadgeCheck,
  User as UserIcon,
  Loader2,
  Heart,
  LayoutDashboard,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const TABS = [
  { to: "/app/events", label: "Events", icon: CalendarDays },
  { to: "/app/vouchers", label: "Vouchers", icon: TicketPercent },
  { to: "/app/my-vouchers", label: "Mine", icon: BadgeCheck },
  { to: "/app/contact", label: "Contact", icon: Phone },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
] as const;

function AppLayout() {
  const { session, loading, user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!hasAccess()) {
      navigate({ to: "/access-code" });
      return;
    }
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [session, loading, navigate]);

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

  if (loading || !session) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background md:bg-muted/30 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-72 md:min-h-dvh bg-background border-r border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-md shadow-primary/20">
              <Heart className="size-5 fill-current" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-primary font-semibold leading-none">
                Members
              </p>
              <h1 className="text-base font-bold leading-tight mt-1">
                So Love Krugersdorp
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((tab) => {
            const active = location.pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 mt-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-dashed border-border"
            >
              <LayoutDashboard className="size-4" />
              Admin portal
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2">
            <div className="size-9 rounded-full bg-muted grid place-items-center text-muted-foreground">
              <UserIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user?.email}</p>
              <p className="text-[11px] text-muted-foreground">Active member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main
        className="flex-1 mx-auto w-full max-w-xl md:max-w-6xl px-5 md:px-10 pt-6 md:pt-10 pb-28 md:pb-12"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)",
        }}
      >
        <Outlet />
      </main>

      {/* Mobile floating pill nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <ul
          className={cn(
            "pointer-events-auto mx-auto max-w-sm grid items-center rounded-full border border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)] px-2 py-2",
            isAdmin ? "grid-cols-6" : "grid-cols-5",
          )}
        >
          {TABS.map((tab) => {
            const active = location.pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <li key={tab.to} className="flex justify-center">
                <Link
                  to={tab.to}
                  aria-label={tab.label}
                  className={cn(
                    "grid place-items-center size-11 rounded-full transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                </Link>
              </li>
            );
          })}
          {isAdmin && (
            <li className="flex justify-center">
              <Link
                to="/admin"
                aria-label="Admin"
                className={cn(
                  "grid place-items-center size-11 rounded-full transition-colors",
                  location.pathname.startsWith("/admin")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutDashboard className="size-5" />
              </Link>
            </li>
          )}
        </ul>
      </nav>

    </div>
  );
}
