import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminModal } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import {
  Receipt,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Download,
  Users,
} from "lucide-react";

/**
 * The redemption ledger for a single voucher: who claimed it, who actually
 * redeemed it and who let it lapse. Opened from the Vouchers list so an admin
 * can drill from "which offer" straight into "who used it" without leaving
 * the page or hand-filtering the global redemptions feed.
 */

export type VoucherRef = {
  id: string;
  title: string;
  value_text?: string | null;
  business_name?: string | null;
  image_url?: string | null;
};

type ClaimRow = {
  id: string;
  user_id: string;
  claimed_at: string;
  expires_at: string;
  redeemed_at: string | null;
  display_name: string | null;
  email: string | null;
};

type Status = "redeemed" | "active" | "expired";

const STATUS_TABS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "redeemed", label: "Redeemed" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
];

export function claimStatus(c: { redeemed_at: string | null; expires_at: string }): Status {
  if (c.redeemed_at) return "redeemed";
  return new Date(c.expires_at) < new Date() ? "expired" : "active";
}

export function StatusBadge({ status }: { status: Status }) {
  if (status === "redeemed")
    return (
      <Badge className="rounded-full bg-emerald-600 text-white hover:bg-emerald-600">
        <CheckCircle2 className="mr-1 size-3" /> Redeemed
      </Badge>
    );
  if (status === "active")
    return (
      <Badge variant="secondary" className="rounded-full">
        <Clock className="mr-1 size-3" /> Active
      </Badge>
    );
  return (
    <Badge variant="outline" className="rounded-full text-muted-foreground">
      <XCircle className="mr-1 size-3" /> Expired
    </Badge>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "primary" | "success" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card px-4 py-3",
        tone === "primary" && "border-primary/25 bg-primary/5",
        tone === "success" && "border-emerald-600/25 bg-emerald-600/5",
      )}
    >
      <p
        className={cn(
          "text-2xl font-bold leading-none tabular-nums",
          tone === "primary" && "text-primary",
          tone === "success" && "text-emerald-600",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function VoucherRedemptionsModal({
  voucher,
  open,
  onOpenChange,
}: {
  voucher: VoucherRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const voucherId = voucher?.id ?? null;

  useRealtimeInvalidate("voucher_claims", [["voucher-redemptions", voucherId ?? undefined]]);

  const { data, isLoading } = useQuery({
    queryKey: ["voucher-redemptions", voucherId ?? undefined],
    enabled: open && !!voucherId,
    queryFn: async () => {
      const { data: claims, error } = await supabase
        .from("voucher_claims")
        .select("id, user_id, claimed_at, expires_at, redeemed_at")
        .eq("voucher_id", voucherId!)
        .order("claimed_at", { ascending: false });
      if (error) throw error;

      const userIds = Array.from(new Set((claims ?? []).map((c) => c.user_id)));
      const profiles = userIds.length
        ? (await supabase.from("profiles").select("id, email, display_name").in("id", userIds)).data
        : [];
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (claims ?? []).map((c) => ({
        ...c,
        display_name: byId.get(c.user_id)?.display_name ?? null,
        email: byId.get(c.user_id)?.email ?? null,
      })) as ClaimRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    const redeemed = rows.filter((r) => claimStatus(r) === "redeemed").length;
    const active = rows.filter((r) => claimStatus(r) === "active").length;
    return {
      total: rows.length,
      redeemed,
      active,
      expired: rows.length - redeemed - active,
      rate: rows.length ? Math.round((redeemed / rows.length) * 100) : 0,
    };
  }, [data]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (tab !== "all" && claimStatus(r) !== tab) return false;
      if (!term) return true;
      return (
        (r.display_name ?? "").toLowerCase().includes(term) ||
        (r.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, tab, q]);

  return (
    <AdminModal
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setTab("all");
          setQ("");
        }
        onOpenChange(o);
      }}
      eyebrow="Redemptions"
      icon={Receipt}
      size="xl"
      title={voucher?.title ?? "Voucher"}
      description={
        voucher?.business_name
          ? `Every claim and redemption for this voucher at ${voucher.business_name}.`
          : "Every claim and redemption for this voucher."
      }
    >
      <div className="slk-scroll flex-1 space-y-5 overflow-y-auto px-6 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Claimed" value={stats.total} tone="primary" />
          <Stat label="Redeemed" value={stats.redeemed} tone="success" />
          <Stat label="Still active" value={stats.active} />
          <Stat label="Expired" value={stats.expired} tone="muted" />
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">Redemption rate</span>
            <span className="tabular-nums">{stats.rate}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/70">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="slk-segment">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  tab === t.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search member name or email"
              className="h-9 rounded-full pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => voucher && exportVoucherCsv(voucher, rows)}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
          >
            <Download className="size-3.5" /> CSV
          </button>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <p className="font-semibold">
              {stats.total === 0 ? "No one has claimed this yet" : "Nothing matches that filter"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total === 0
                ? "Claims appear here the moment a member takes this voucher."
                : "Try a different status or clear the search."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {rows.map((r) => {
              const status = claimStatus(r);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">
                    {(r.display_name ?? r.email ?? "?").slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.display_name ?? "Member"}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email ?? "—"}</p>
                  </div>
                  <div className="hidden text-right text-[11px] leading-tight text-muted-foreground sm:block">
                    <p>Claimed {new Date(r.claimed_at).toLocaleDateString()}</p>
                    <p>
                      {r.redeemed_at
                        ? `Redeemed ${new Date(r.redeemed_at).toLocaleDateString()}`
                        : `Expires ${new Date(r.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminModal>
  );
}

function exportVoucherCsv(voucher: VoucherRef, rows: ClaimRow[]) {
  const header = ["member_name", "member_email", "status", "claimed_at", "redeemed_at"];
  const body = rows.map((r) =>
    [r.display_name ?? "", r.email ?? "", claimStatus(r), r.claimed_at, r.redeemed_at ?? ""]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${voucher.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-redemptions.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
