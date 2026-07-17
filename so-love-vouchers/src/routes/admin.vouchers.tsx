import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ModalBody,
  FormSection,
  Field,
  FieldRow,
  DateTimeField,
  ToggleRow,
  ModalFooter,
} from "@/components/admin/form-kit";
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
import { ImageUploader } from "@/components/image-uploader";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { Plus, Pencil, Trash2, Loader2, Ticket, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { broadcastPush } from "@/lib/push.functions";

export const Route = createFileRoute("/admin/vouchers")({
  component: AdminVouchersPage,
});

type VoucherRow = {
  id: string;
  title: string;
  description: string | null;
  value_text: string | null;
  terms: string | null;
  image_url: string | null;
  business_name: string | null;
  business_logo_url: string | null;
  business_phone: string | null;
  business_address: string | null;
  claim_window_hours: number;
  available_from: string;
  available_until: string | null;
  is_active: boolean;
  is_recurring: boolean;
};

type EditState = Partial<VoucherRow> & {
  __open: boolean;
  available_from_date?: string;
  available_from_time?: string;
  available_until_date?: string;
  available_until_time?: string;
};

const empty: EditState = {
  __open: true,
  title: "",
  description: "",
  value_text: "",
  terms: "",
  image_url: null,
  business_name: "",
  business_logo_url: null,
  business_phone: "",
  business_address: "",
  claim_window_hours: 48,
  available_from: "",
  available_until: "",
  is_active: true,
  available_from_date: "",
  available_from_time: "",
  available_until_date: "",
  available_until_time: "",
};

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineDatetime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function AdminVouchersPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("vouchers", [["admin-vouchers"]]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<VoucherRow | null>(null);
  const sendPush = useServerFn(broadcastPush);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VoucherRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (e: EditState) => {
      const fromStr = combineDatetime(e.available_from_date ?? "", e.available_from_time ?? "");
      const untilStr = combineDatetime(e.available_until_date ?? "", e.available_until_time ?? "");
      const payload = {
        title: (e.title ?? "").trim(),
        description: e.description || null,
        value_text: e.value_text || null,
        terms: e.terms || null,
        image_url: e.image_url ?? null,
        business_name: e.business_name || null,
        business_logo_url: e.business_logo_url ?? null,
        business_phone: e.business_phone || null,
        business_address: e.business_address || null,
        claim_window_hours: Number(e.claim_window_hours) || 48,
        available_from: fromStr ? new Date(fromStr).toISOString() : new Date().toISOString(),
        available_until: untilStr ? new Date(untilStr).toISOString() : null,
        is_active: e.is_active ?? true,
        is_recurring: e.is_recurring ?? false,
      };
      if (!payload.title) throw new Error("Title is required");
      const isNew = !e.id;
      if (e.id) {
        const { error } = await supabase.from("vouchers").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vouchers").insert(payload);
        if (error) throw error;
      }

      // Auto-send push notification when a new active voucher is created
      if (isNew && payload.is_active) {
        const title = `New voucher: ${payload.title}`;
        const body = payload.value_text
          ? `${payload.value_text}${payload.business_name ? ` at ${payload.business_name}` : ""}. Tap to claim.`
          : "A new voucher is now available. Tap to claim.";
        try {
          const res = await sendPush({
            data: {
              title,
              body,
              category: "vouchers",
              url: "/app/vouchers",
              image: payload.image_url || undefined,
            },
          });
          toast.success(`Notification sent to ${res.sent} device${res.sent === 1 ? "" : "s"}`);
        } catch (err) {
          toast.error(
            `Notification not sent: ${err instanceof Error ? err.message : "unknown error"}`,
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setEdit(null);
    },
    onError: (e) => toast.error(e.message || "Failed to save"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vouchers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setDeleting(null);
    },
    onError: (e) => toast.error(e.message || "Failed to delete"),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Admin</p>
          <h1 className="text-3xl font-bold mt-1">Vouchers</h1>
        </div>
        <Button onClick={() => setEdit(empty)}>
          <Plus className="size-4 mr-1.5" /> New voucher
        </Button>
      </header>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="font-semibold">No vouchers yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first voucher to make it available to members.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {data.map((v) => (
            <li key={v.id}>
              <Card className="p-4 flex items-center gap-4">
                <div className="size-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  {v.image_url ? (
                    <img src={v.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center text-muted-foreground">
                      <Ticket className="size-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{v.title}</h3>
                    {!v.is_active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                    {v.value_text && (
                      <Badge className="text-[10px] bg-primary text-primary-foreground">
                        {v.value_text}
                      </Badge>
                    )}
                    {v.is_recurring && (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-primary/40 text-primary"
                      >
                        <Repeat className="size-3" /> Monthly
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {v.claim_window_hours}h to redeem · available from{" "}
                    {new Date(v.available_from).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const af = toLocalInput(v.available_from);
                      const au = toLocalInput(v.available_until);
                      setEdit({
                        __open: true,
                        ...v,
                        available_from_date: af.date,
                        available_from_time: af.time,
                        available_until_date: au.date,
                        available_until_time: au.time,
                      });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleting(v)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg sm:max-w-2xl lg:max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden rounded-3xl border-0 shadow-2xl shadow-black/20">
          <DialogHeader className="px-6 md:px-8 py-5 border-b border-border/60 bg-background/85 backdrop-blur-xl shrink-0 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Vouchers
            </p>
            <DialogTitle
              className="text-2xl tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {edit?.id ? "Edit voucher" : "New voucher"}
            </DialogTitle>
            <DialogDescription>Changes are pushed live to every member's app.</DialogDescription>
          </DialogHeader>
          {edit && (
            <ModalBody>
              <FormSection title="Business">
                <div className="grid grid-cols-[auto_1fr] gap-4 items-start p-4 rounded-xl bg-muted/30 border border-dashed">
                  <ImageUploader
                    value={edit.business_logo_url}
                    onChange={(url) => setEdit({ ...edit, business_logo_url: url })}
                    folder="business-logos"
                    shape="circle"
                    label="Business logo"
                  />
                  <Field
                    label="Business name"
                    hint="Appears on the voucher card and the redemption screen."
                  >
                    <Input
                      placeholder="e.g. Bella Vista Cafe"
                      value={edit.business_name ?? ""}
                      onChange={(e) => setEdit({ ...edit, business_name: e.target.value })}
                    />
                  </Field>
                </div>
                <FieldRow>
                  <Field label="Business tel" hint="Shown to the customer after they claim.">
                    <Input
                      type="tel"
                      placeholder="e.g. 011 000 0000"
                      className="tabular-nums"
                      value={edit.business_phone ?? ""}
                      onChange={(e) => setEdit({ ...edit, business_phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Address" hint="Where the customer redeems it.">
                    <Input
                      placeholder="e.g. 12 Main Rd, Krugersdorp"
                      value={edit.business_address ?? ""}
                      onChange={(e) => setEdit({ ...edit, business_address: e.target.value })}
                    />
                  </Field>
                </FieldRow>
              </FormSection>

              <FormSection title="The offer">
                <Field label="Cover image" hint="The whole image is shown — no cropping.">
                  <ImageUploader
                    value={edit.image_url}
                    onChange={(url) => setEdit({ ...edit, image_url: url })}
                    folder="vouchers"
                    fit="contain"
                  />
                </Field>
                <FieldRow>
                  <Field label="Title" required>
                    <Input
                      placeholder="e.g. Free coffee on us"
                      value={edit.title ?? ""}
                      onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                    />
                  </Field>
                  <Field label="Value / offer text">
                    <Input
                      placeholder="e.g. R50 off · Free coffee · 20% off"
                      value={edit.value_text ?? ""}
                      onChange={(e) => setEdit({ ...edit, value_text: e.target.value })}
                    />
                  </Field>
                </FieldRow>
                <Field label="Description">
                  <Textarea
                    rows={3}
                    placeholder="What the member gets and how to use it..."
                    value={edit.description ?? ""}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  />
                </Field>
                <Field label="Terms &amp; conditions">
                  <Textarea
                    rows={2}
                    placeholder="Any limits, exclusions or fine print..."
                    value={edit.terms ?? ""}
                    onChange={(e) => setEdit({ ...edit, terms: e.target.value })}
                  />
                </Field>
              </FormSection>

              <FormSection title="Availability">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label="Claim window (hours)"
                    hint="Time to redeem after claiming. Default 48h."
                  >
                    <Input
                      type="number"
                      min={1}
                      value={edit.claim_window_hours ?? 48}
                      onChange={(e) =>
                        setEdit({ ...edit, claim_window_hours: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <DateTimeField
                    label="Available from"
                    dateValue={edit.available_from_date ?? ""}
                    timeValue={edit.available_from_time ?? ""}
                    onDate={(v) => setEdit({ ...edit, available_from_date: v })}
                    onTime={(v) => setEdit({ ...edit, available_from_time: v })}
                  />
                  <DateTimeField
                    label="Available until"
                    dateValue={edit.available_until_date ?? ""}
                    timeValue={edit.available_until_time ?? ""}
                    onDate={(v) => setEdit({ ...edit, available_until_date: v })}
                    onTime={(v) => setEdit({ ...edit, available_until_time: v })}
                  />
                </div>

                <ToggleRow
                  label="Recurring monthly"
                  description="Re-opens for every member at the start of each month — even after they've used it. Perfect for a standing member benefit."
                >
                  <Switch
                    id="recurring"
                    checked={edit.is_recurring ?? false}
                    onCheckedChange={(v) => setEdit({ ...edit, is_recurring: v })}
                  />
                </ToggleRow>
                <ToggleRow label="Active" description="Visible and claimable in the member app.">
                  <Switch
                    id="active"
                    checked={edit.is_active ?? true}
                    onCheckedChange={(v) => setEdit({ ...edit, is_active: v })}
                  />
                </ToggleRow>
                <p className="text-[11px] text-muted-foreground italic">
                  A push notification is sent automatically to all opted-in members when you create
                  a new active voucher.
                </p>
              </FormSection>
            </ModalBody>
          )}
          <ModalFooter
            hint={
              edit?.id
                ? "Saving updates the live voucher instantly."
                : "Publishing makes it claimable right away."
            }
            onCancel={() => setEdit(null)}
            onSave={() => edit && save.mutate(edit)}
            saving={save.isPending}
            saveLabel={edit?.id ? "Save changes" : "Publish voucher"}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will disappear from the app. Existing member claims keep working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) del.mutate(deleting.id);
              }}
            >
              {del.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
