import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminResourceCard } from "@/components/admin/admin-resource-card";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import {
  AdminFormSection,
  AdminFormDivider,
  AdminField,
  AdminDatetimeField,
  AdminStatusToggle,
  AdminFormNotice,
} from "@/components/admin/admin-form";
import { Plus, Loader2, Ticket, Clock } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { broadcastPush } from "@/lib/push.functions";
import type { Database } from "@/integrations/supabase/types";

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
};

type EditState = Partial<VoucherRow> & {
  __open: boolean;
  available_from_date?: string;
  available_from_time?: string;
  available_until_date?: string;
  available_until_time?: string;
};

type VoucherPayload = Database["public"]["Tables"]["vouchers"]["Insert"];

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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function AdminVouchersPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("vouchers", [["admin-vouchers"]]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<VoucherRow | null>(null);
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.business_name?.toLowerCase().includes(q) ||
        v.value_text?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: async (e: EditState) => {
      const fromStr = combineDatetime(e.available_from_date ?? "", e.available_from_time ?? "");
      const untilStr = combineDatetime(e.available_until_date ?? "", e.available_until_time ?? "");
      const payload: VoucherPayload = {
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
        } catch (error: unknown) {
          toast.error(`Notification not sent: ${errorMessage(error, "unknown error")}`);
        }
      }
    },
    onSuccess: () => {
      toast.success("Voucher saved");
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setEdit(null);
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed to save")),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vouchers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voucher deleted");
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setDeleting(null);
    },
    onError: (error: unknown) => toast.error(errorMessage(error, "Failed to delete")),
  });

  const openCreate = () => setEdit(empty);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vouchers"
        description="Create member vouchers with offer details, availability windows, and business branding."
        count={data?.length}
        countLabel={data?.length === 1 ? "voucher" : "vouchers"}
        action={{ label: "New voucher", icon: Plus, onClick: openCreate }}
      />

      {!isLoading && data && data.length > 0 && (
        <AdminSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title, business, or offer…"
        />
      )}

      {isLoading ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <AdminEmptyState
          icon={Ticket}
          title="No vouchers yet"
          description="Create your first voucher to make it available to members. Add the business logo, offer value, and claim window."
          action={{ label: "Create first voucher", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={Ticket}
          title="No matching vouchers"
          description={`Nothing matches "${search}". Try a different search term.`}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((v) => (
            <li key={v.id}>
              <AdminResourceCard
                title={v.title}
                subtitle={v.business_name ?? undefined}
                imageUrl={v.image_url}
                fallbackIcon={Ticket}
                badges={[
                  ...(v.value_text ? [{ label: v.value_text, variant: "default" as const }] : []),
                  ...(!v.is_active ? [{ label: "Inactive", variant: "secondary" as const }] : []),
                ]}
                meta={
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3 shrink-0" />
                    {v.claim_window_hours}h to redeem · from{" "}
                    {new Date(v.available_from).toLocaleDateString()}
                  </span>
                }
                onEdit={() => {
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
                onDelete={() => setDeleting(v)}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl">
              {edit?.id ? "Edit voucher" : "New voucher"}
            </DialogTitle>
            <DialogDescription>
              {edit?.id
                ? "Update voucher details. Changes go live for all members immediately."
                : "Set up the offer, business info, and availability. Members can claim once active."}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="px-6 py-5 space-y-6">
              <AdminFormSection
                title="Business"
                description="Shown on the voucher card and redemption screen."
              >
                <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start rounded-xl border bg-muted/20 p-4">
                  <ImageUploader
                    value={edit.business_logo_url}
                    onChange={(url) => setEdit({ ...edit, business_logo_url: url })}
                    folder="business-logos"
                    shape="circle"
                    label="Upload logo"
                  />
                  <AdminField label="Business name">
                    <Input
                      placeholder="e.g. Bella Vista Cafe"
                      value={edit.business_name ?? ""}
                      onChange={(e) => setEdit({ ...edit, business_name: e.target.value })}
                    />
                  </AdminField>
                  <AdminField label="Phone">
                    <Input
                      type="tel"
                      placeholder="e.g. 011 123 4567"
                      value={edit.business_phone ?? ""}
                      onChange={(e) => setEdit({ ...edit, business_phone: e.target.value })}
                    />
                  </AdminField>
                  <AdminField label="Address">
                    <Input
                      placeholder="e.g. 12 Main Rd, Krugersdorp"
                      value={edit.business_address ?? ""}
                      onChange={(e) => setEdit({ ...edit, business_address: e.target.value })}
                    />
                  </AdminField>
                </div>
              </AdminFormSection>

              <AdminFormDivider />

              <AdminFormSection title="Offer details">
                <AdminField label="Cover image">
                  <ImageUploader
                    value={edit.image_url}
                    onChange={(url) => setEdit({ ...edit, image_url: url })}
                    folder="vouchers"
                    label="Upload voucher image"
                  />
                </AdminField>
                <AdminField label="Title" required>
                  <Input
                    placeholder="e.g. Free coffee with any breakfast"
                    value={edit.title ?? ""}
                    onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Value / offer text">
                  <Input
                    placeholder="e.g. R50 off · Free coffee · 20% off"
                    value={edit.value_text ?? ""}
                    onChange={(e) => setEdit({ ...edit, value_text: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Description">
                  <Textarea
                    rows={3}
                    placeholder="Short summary members see before claiming"
                    value={edit.description ?? ""}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Terms & conditions">
                  <Textarea
                    rows={2}
                    placeholder="Any restrictions or fine print"
                    value={edit.terms ?? ""}
                    onChange={(e) => setEdit({ ...edit, terms: e.target.value })}
                  />
                </AdminField>
              </AdminFormSection>

              <AdminFormDivider />

              <AdminFormSection
                title="Availability"
                description="Control when members can claim and how long they have to redeem."
              >
                <AdminField
                  label="Claim window (hours)"
                  hint="Time the member has to redeem after claiming. Default is 48 hours."
                >
                  <Input
                    type="number"
                    min={1}
                    value={edit.claim_window_hours ?? 48}
                    onChange={(e) =>
                      setEdit({ ...edit, claim_window_hours: Number(e.target.value) })
                    }
                  />
                </AdminField>
                <AdminDatetimeField
                  label="Available from"
                  date={edit.available_from_date ?? ""}
                  time={edit.available_from_time ?? ""}
                  onDateChange={(v) => setEdit({ ...edit, available_from_date: v })}
                  onTimeChange={(v) => setEdit({ ...edit, available_from_time: v })}
                />
                <AdminDatetimeField
                  label="Available until"
                  date={edit.available_until_date ?? ""}
                  time={edit.available_until_time ?? ""}
                  onDateChange={(v) => setEdit({ ...edit, available_until_date: v })}
                  onTimeChange={(v) => setEdit({ ...edit, available_until_time: v })}
                />
              </AdminFormSection>

              <AdminFormDivider />

              <AdminStatusToggle
                id="active"
                label="Active"
                description="Inactive vouchers are hidden from the member app."
                checked={edit.is_active ?? true}
                onCheckedChange={(v) => setEdit({ ...edit, is_active: v })}
              />

              {!edit.id && (
                <AdminFormNotice>
                  A push notification is sent automatically to opted-in members when you create a
                  new active voucher.
                </AdminFormNotice>
              )}
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => edit && save.mutate(edit)} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save voucher"}
            </Button>
          </DialogFooter>
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
