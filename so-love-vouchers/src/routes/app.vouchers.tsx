import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TicketPercent, Loader2, Sparkles, Clock, Store, ChevronDown, FileText } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";

export const Route = createFileRoute("/app/vouchers")({
  component: VouchersPage,
});

type Voucher = {
  id: string;
  title: string;
  description: string | null;
  value_text: string | null;
  image_url: string | null;
  business_name: string | null;
  business_logo_url: string | null;
  claim_window_hours: number;
  terms: string | null;
};

function VouchersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  useRealtimeInvalidate("vouchers", [["vouchers", user?.id]]);
  const [confirming, setConfirming] = useState<null | {
    id: string;
    title: string;
    hours: number;
    terms: string | null;
  }>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vouchers", user?.id],
    queryFn: async () => {
      const [vouchersRes, claimsRes] = await Promise.all([
        supabase
          .from("vouchers")
          .select(
            "id, title, description, value_text, image_url, business_name, business_logo_url, claim_window_hours, terms",
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("voucher_claims").select("voucher_id").eq("user_id", user!.id),
      ]);
      if (vouchersRes.error) throw vouchersRes.error;
      if (claimsRes.error) throw claimsRes.error;
      const claimed = new Set(claimsRes.data.map((c) => c.voucher_id));
      return (vouchersRes.data as Voucher[]).filter((v) => !claimed.has(v.id));
    },
    enabled: !!user?.id,
  });

  const claim = useMutation({
    mutationFn: async (voucherId: string) => {
      const { data, error } = await supabase.rpc("claim_voucher", {
        _voucher_id: voucherId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (claim) => {
      toast.success("Voucher claimed!");
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["my-vouchers"] });
      setConfirming(null);
      navigate({ to: "/app/voucher/$id", params: { id: (claim as any).id } });
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Could not claim";
      if (msg.includes("voucher_claims_voucher_id_user_id_key") || msg.includes("already claimed")) {
        toast.error("You've already claimed this voucher.");
      } else if (msg.includes("voucher_not_available")) {
        toast.error("This voucher is no longer available.");
      } else if (msg.includes("voucher_expired")) {
        toast.error("This voucher has expired and can no longer be claimed.");
      } else {
        toast.error("Could not claim voucher. Please try again.");
      }
      setConfirming(null);
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">
            Members only
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mt-2 tracking-tight">
            Vouchers
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
            Tap to claim. Each voucher is one-per-member and tied to your account.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          {data?.length ?? 0} available
        </div>
      </header>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <TicketPercent className="size-8 mx-auto text-muted-foreground" />
          <p className="font-semibold mt-3">No vouchers available</p>
          <p className="text-sm text-muted-foreground mt-1">
            New vouchers drop regularly - check back soon.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.map((v) => (
            <li key={v.id}>
              <Card className="group relative overflow-hidden border-border/70 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                {/* Cover with overlay */}
                <div className="relative h-48 bg-gradient-to-br from-primary/15 via-primary/5 to-muted overflow-hidden">
                  {v.image_url ? (
                    <img
                      src={v.image_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="size-full grid place-items-center">
                      <TicketPercent className="size-12 text-primary/30" />
                    </div>
                  )}

                  {/* Dark gradient for text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                  {v.value_text && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-primary-foreground shadow-md font-bold">
                        <Sparkles className="size-3 mr-1" />
                        {v.value_text}
                      </Badge>
                    </div>
                  )}

                  {/* Logo + business name overlay inside the image */}
                  <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-3">
                    <div className="size-12 rounded-full bg-white ring-2 ring-white shadow-md flex-shrink-0 overflow-hidden">
                      {v.business_logo_url ? (
                        <img
                          src={v.business_logo_url}
                          alt={v.business_name ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center">
                          <Store className="size-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>



                    {v.business_name && (
                      <p className="text-sm font-semibold text-white drop-shadow-md tracking-wide truncate">
                        {v.business_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 pt-5 pb-5 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold leading-tight">
                      {v.title}
                    </h2>
                    {v.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {v.description}
                      </p>
                    )}
                  </div>

                  {/* Dashed divider */}
                  <div className="mt-4 mb-4 border-t border-dashed border-border" />

                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="size-3.5" />
                      {v.claim_window_hours}h to redeem
                    </span>
                    <Button
                      className="font-semibold gap-2 px-5 py-2.5 h-auto rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                      onClick={() =>
                        setConfirming({
                          id: v.id,
                          title: v.title,
                          hours: v.claim_window_hours,
                          terms: v.terms,
                        })
                      }
                    >
                      <Sparkles className="size-4" />
                      Claim
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Claim this voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              Once claimed, "{confirming?.title}" is yours and yours alone - you'll have{" "}
              {confirming?.hours} hours to redeem it in person at So Love Krugersdorp.
              This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirming?.terms && (
            <Collapsible className="border border-border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors [&[data-state=open]>svg:last-child]:rotate-180">
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Terms &amp; Conditions
                </span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border">
                {confirming.terms}
              </CollapsibleContent>
            </Collapsible>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirming) claim.mutate(confirming.id);
              }}
              disabled={claim.isPending}
            >
              {claim.isPending ? <Loader2 className="size-4 animate-spin" /> : "Yes, claim it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
