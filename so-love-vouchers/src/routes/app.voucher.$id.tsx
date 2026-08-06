import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/smart-image";
import {
  CountdownDisplay,
  Perforation,
  TicketBlock,
  WindowBar,
  serialOf,
  urgencyOf,
  urgencyText,
  type ClaimStatus,
} from "@/components/voucher-kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Clock,
  Loader2,
  CheckCircle2,
  Store,
  MapPin,
  Phone,
  ShieldCheck,
  TimerOff,
} from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/voucher/$id")({
  component: VoucherDetailPage,
});

type ClaimDetail = {
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
    terms: string | null;
    business_name: string | null;
    business_logo_url: string | null;
    business_phone: string | null;
    business_address: string | null;
    image_url: string | null;
  } | null;
};

/** Hero band height — the punched notches sit exactly on its lower edge. */
const HERO_H = 184;

function VoucherDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Anti-share: blur the voucher when the tab loses focus
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_claims")
        .select(
          "id, voucher_id, claimed_at, expires_at, redeemed_at, vouchers (id, title, description, value_text, terms, business_name, business_logo_url, business_phone, business_address, image_url)",
        )
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ClaimDetail | null;
    },
    enabled: !!user?.id,
  });

  const cd = useCountdown(claim?.expires_at);
  const redeemed = !!claim?.redeemed_at;
  const expired = cd.expired && !redeemed;
  const active = !!claim && !redeemed && !expired;

  const redeem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_voucher_claim", {
        _claim_id: id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Voucher redeemed");
      qc.invalidateQueries({ queryKey: ["claim", id] });
      qc.invalidateQueries({ queryKey: ["my-vouchers"] });
    },
    onError: (e) => {
      const msg = e.message ?? "";
      if (msg.includes("voucher_not_redeemable")) {
        toast.error(
          "This voucher can't be redeemed - it may have already been used or has expired.",
        );
      } else {
        toast.error("Could not redeem voucher. Please try again.");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <BackButton />
        <TicketBlock notchY={`${HERO_H}px`}>
          <div
            className="animate-pulse rounded-t-3xl bg-foreground/[0.07]"
            style={{ height: HERO_H }}
          />
          <Perforation />
          <div className="space-y-3 p-6">
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-foreground/[0.06]" />
            <div className="h-20 w-full animate-pulse rounded-2xl bg-foreground/[0.05]" />
          </div>
        </TicketBlock>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="space-y-5">
        <BackButton />
        <TicketBlock notchY="50%" className="mx-auto max-w-md">
          <div className="px-8 pb-6 pt-10 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <TimerOff className="size-7" />
            </div>
            <p className="mt-4 text-lg font-bold">Voucher not found</p>
          </div>
          <Perforation />
          <p className="px-8 pb-10 pt-6 text-center text-sm text-muted-foreground">
            It may have been removed, or it doesn't belong to your account.
          </p>
        </TicketBlock>
      </div>
    );
  }

  const status: ClaimStatus = redeemed ? "redeemed" : expired ? "expired" : "active";

  return (
    <div className="space-y-5">
      <BackButton />

      <div
        className={cn(
          "relative select-none no-select transition-[filter] duration-300",
          hidden && "blur-2xl",
        )}
        onContextMenu={(e) => e.preventDefault()}
      >
        <VoucherFace claim={claim} status={status} />
      </div>

      {/* Redeem CTA — pinned above the mobile nav while the ticket scrolls. */}
      {active && (
        <div className="sticky bottom-24 z-30 md:bottom-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="lg"
                className="h-14 w-full rounded-full text-base font-bold shadow-xl shadow-primary/25 transition-transform active:scale-[0.99]"
              >
                <ShieldCheck className="size-5" />
                Redeem now
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Redeem in front of staff?</AlertDialogTitle>
                <AlertDialogDescription>
                  Only tap "Confirm" when a staff member is present. This will mark the voucher as
                  used and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    redeem.mutate();
                  }}
                  disabled={redeem.isPending}
                >
                  {redeem.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Confirm redeem"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Staff must watch you tap redeem.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The voucher itself: hero band, punched perforation, then the stub carrying
 * the live window / expiry notice / redeemed receipt.
 */
function VoucherFace({ claim, status }: { claim: ClaimDetail; status: ClaimStatus }) {
  const v = claim.vouchers;
  const ref = claim.id.slice(-4).toUpperCase();
  const cd = useCountdown(claim.expires_at);
  const level = urgencyOf(cd.totalSec);

  return (
    <TicketBlock notchY={`${HERO_H}px`}>
      {/* Hero band: artwork when there is one, brand gradient otherwise. */}
      <div className="relative overflow-hidden rounded-t-3xl bg-primary" style={{ height: HERO_H }}>
        {v?.image_url ? (
          <SmartImage src={v.image_url} alt="" wrapperClassName="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/70" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82),rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.05)_100%)]" />

        {v?.value_text && (
          <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-neutral-900 shadow-lg">
            {v.value_text}
          </span>
        )}

        <div className="absolute inset-x-5 bottom-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-white/70">
              {v?.business_logo_url ? (
                <img src={v.business_logo_url} alt="" className="size-full object-cover" />
              ) : (
                <Store className="size-4 text-primary" />
              )}
            </div>
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
              {v?.business_name ?? "So Love Krugersdorp"}
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white drop-shadow">
            {v?.title}
          </h1>
        </div>
      </div>

      <Perforation />

      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serial text-[11px] text-muted-foreground">
            Nº {serialOf(claim.id, ref)}
          </p>
          <p className="font-serial text-[11px] text-muted-foreground">
            {new Date(claim.claimed_at).toLocaleDateString("en-ZA", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {v?.description && (
          <p className="text-sm leading-relaxed text-foreground/80">{v.description}</p>
        )}

        {status === "active" && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Clock className={cn("size-3.5", urgencyText[level])} />
                Expires in
              </p>
              <p className={cn("text-[11px] font-semibold", urgencyText[level])}>
                {level === "urgent"
                  ? "Last hour"
                  : level === "soon"
                    ? "Closing soon"
                    : "Plenty of time"}
              </p>
            </div>
            <CountdownDisplay expiresAt={claim.expires_at} />
            <WindowBar claimedAt={claim.claimed_at} expiresAt={claim.expires_at} className="mt-3" />
          </div>
        )}

        {status === "expired" && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <TimerOff className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Window closed
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                This voucher expired and can no longer be redeemed.
              </p>
            </div>
          </div>
        )}

        {status === "redeemed" && (
          <div className="space-y-4">
            <div className="flex justify-center py-1">
              <span className="slk-stamp animate-stamp text-xl text-primary md:text-2xl">
                Redeemed
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-emerald-600/25 bg-emerald-50 px-4 py-3.5 dark:bg-emerald-950/30">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                  Voucher redeemed
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  Thanks for visiting{v?.business_name ? ` ${v.business_name}` : ""}
                </p>
              </div>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              <DetailRow
                label="Used on"
                value={new Date(claim.redeemed_at!).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              <DetailRow
                label="Used at"
                value={new Date(claim.redeemed_at!).toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              {v?.business_name && <DetailRow label="Business" value={v.business_name} />}
              <DetailRow label="Reference" value={ref} mono />
            </div>
          </div>
        )}

        {(v?.business_address || v?.business_phone) && (
          <div className="space-y-2.5 border-t border-dashed pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Where to redeem
            </p>
            {v?.business_name && (
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Store className="size-3.5" />
                </span>
                <span className="text-sm font-medium">{v.business_name}</span>
              </div>
            )}
            {v?.business_address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  v.business_address,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2.5"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-3.5" />
                </span>
                <span className="text-sm font-medium group-hover:text-primary group-hover:underline">
                  {v.business_address}
                </span>
              </a>
            )}
            {v?.business_phone && (
              <a
                href={`tel:${v.business_phone.replace(/\s+/g, "")}`}
                className="group flex items-center gap-2.5"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="size-3.5" />
                </span>
                <span className="text-sm font-medium tabular-nums group-hover:text-primary group-hover:underline">
                  {v.business_phone}
                </span>
              </a>
            )}
          </div>
        )}

        {v?.terms && (
          <div className="border-t border-dashed pt-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Terms: </span>
              {v.terms}
            </p>
          </div>
        )}
      </div>
    </TicketBlock>
  );
}

function BackButton() {
  return (
    <Link
      to="/app/my-vouchers"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" /> Back
    </Link>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-sm font-semibold", mono && "font-mono tracking-wider")}>
        {value}
      </span>
    </div>
  );
}
