import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Clock, Loader2, CheckCircle2, Store } from "lucide-react";
import { useCountdown, formatCountdown } from "@/hooks/use-countdown";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    image_url: string | null;
  } | null;
};

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
          "id, voucher_id, claimed_at, expires_at, redeemed_at, vouchers (id, title, description, value_text, terms, business_name, business_logo_url, image_url)"
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
    onError: (e: any) => {
      const msg = e?.message ?? "";
      if (msg.includes("voucher_not_redeemable")) {
        toast.error("This voucher can't be redeemed - it may have already been used or has expired.");
      } else {
        toast.error("Could not redeem voucher. Please try again.");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card className="p-8 text-center border-dashed">
          <p className="font-semibold">Voucher not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            It may have been removed or doesn't belong to your account.
          </p>
        </Card>
      </div>
    );
  }

  
  const refRef = (claim?.id ?? "").slice(-4).toUpperCase();

  return (
    <div className="space-y-5">
      <BackButton />

      <div
        className={`relative select-none no-select transition-[filter] duration-300 ${
          hidden ? "blur-2xl" : ""
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Card className="overflow-hidden border-border shadow-xl">
          {/* Header band with business logo */}
          <div className="bg-primary text-primary-foreground px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-full bg-primary-foreground/95 border-2 border-primary-foreground/30 shadow-md overflow-hidden grid place-items-center flex-shrink-0">
                {claim.vouchers?.business_logo_url ? (
                  <img
                    src={claim.vouchers.business_logo_url}
                    alt={claim.vouchers.business_name ?? ""}
                    className="size-full object-cover"
                  />
                ) : (
                  <Store className="size-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-widest opacity-80">
                  {claim.vouchers?.business_name ?? "So Love Krugersdorp"}
                </p>
                <h1 className="text-2xl font-bold leading-tight mt-0.5">
                  {claim.vouchers?.title}
                </h1>
                {claim.vouchers?.value_text && (
                  <p className="text-xl font-bold mt-1 opacity-95">
                    {claim.vouchers.value_text}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 relative">

            {claim.vouchers?.description && (
              <p className="text-sm text-foreground/80 relative">
                {claim.vouchers.description}
              </p>
            )}

            {/* Status (active / expired only) */}
            {!redeemed && (
              <div className="relative flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
                <div className="text-xs">
                  <p className="text-muted-foreground uppercase tracking-wider font-medium">
                    {expired ? "Expired" : "Expires in"}
                  </p>
                  <p className="font-bold text-base mt-0.5">
                    {formatCountdown(cd)}
                  </p>
                </div>
                <Clock className="size-5 text-primary" />
              </div>
            )}

            {redeemed && (
              <div className="relative space-y-4">
                {/* Redeemed banner */}
                <div className="rounded-2xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-600 text-white grid place-items-center flex-shrink-0">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-700 dark:text-emerald-400">
                        Voucher redeemed
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                        Thanks for visiting{claim.vouchers?.business_name ? ` ${claim.vouchers.business_name}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Redemption details */}
                <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
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
                  {claim.vouchers?.business_name && (
                    <DetailRow label="Business" value={claim.vouchers.business_name} />
                  )}
                  <DetailRow label="Reference" value={refRef} mono />
                </div>
              </div>
            )}

            {claim.vouchers?.terms && (
              <div className="relative pt-3 border-t border-dashed">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Terms: </span>
                  {claim.vouchers.terms}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Redeem CTA */}
      {active && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" className="w-full h-14 text-base font-bold">
              Redeem now
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Redeem in front of staff?</AlertDialogTitle>
              <AlertDialogDescription>
                Only tap "Confirm" when a staff member is present. This will mark the
                voucher as used and cannot be undone.
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
      )}
    </div>
  );
}

function BackButton() {
  return (
    <Link
      to="/app/my-vouchers"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back
    </Link>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <span className={`text-sm font-semibold text-foreground ${mono ? "font-mono tracking-wider" : ""}`}>
        {value}
      </span>
    </div>
  );
}
