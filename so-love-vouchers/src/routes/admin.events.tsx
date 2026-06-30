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
import { Plus, Loader2, MapPin, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { broadcastPush } from "@/lib/push.functions";

export const Route = createFileRoute("/admin/events")({
  component: AdminEventsPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  is_published: boolean;
};

type EditState = Partial<EventRow> & {
  __open: boolean;
  starts_date?: string;
  starts_time?: string;
  ends_date?: string;
  ends_time?: string;
};

const empty: EditState = {
  __open: true,
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  image_url: null,
  is_published: true,
  starts_date: "",
  starts_time: "",
  ends_date: "",
  ends_time: "",
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

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminEventsPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("events", [["admin-events"]]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const [search, setSearch] = useState("");
  const sendPush = useServerFn(broadcastPush);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: async (e: EditState) => {
      if (!(e.title ?? "").trim()) throw new Error("Title is required");
      const startsAt = combineDatetime(e.starts_date ?? "", e.starts_time ?? "");
      if (!startsAt) throw new Error("Start date is required");
      const endsAt = combineDatetime(e.ends_date ?? "", e.ends_time ?? "");
      const payload = {
        title: (e.title ?? "").trim(),
        description: e.description || null,
        location: e.location || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        image_url: e.image_url ?? null,
        is_published: e.is_published ?? true,
      };
      const isNew = !e.id;
      if (e.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }

      if (isNew && payload.is_published) {
        const title = `New event: ${payload.title}`;
        const when = formatEventDate(payload.starts_at);
        const body = `${when}${payload.location ? ` · ${payload.location}` : ""}. Tap for details.`;
        try {
          const res = await sendPush({
            data: {
              title,
              body,
              category: "events",
              url: "/app/events",
              image: payload.image_url || undefined,
            },
          });
          toast.success(`Notification sent to ${res.sent} device${res.sent === 1 ? "" : "s"}`);
        } catch (err: any) {
          toast.error(`Notification not sent: ${err?.message ?? "unknown error"}`);
        }
      }
    },
    onSuccess: () => {
      toast.success("Event saved");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setEdit(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const openCreate = () => setEdit(empty);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Events"
        description="Create and manage community events. Published events appear in the member app instantly."
        count={data?.length}
        countLabel={data?.length === 1 ? "event" : "events"}
        action={{ label: "New event", icon: Plus, onClick: openCreate }}
      />

      {!isLoading && data && data.length > 0 && (
        <AdminSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search events by title, location, or description…"
        />
      )}

      {isLoading ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <AdminEmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event to show it in the member app. Add a cover image, date, and location to help members plan ahead."
          action={{ label: "Create first event", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={CalendarDays}
          title="No matching events"
          description={`Nothing matches "${search}". Try a different search term.`}
        />
      ) : (
        <ul className="grid gap-3">
          {filtered.map((ev) => (
            <li key={ev.id}>
              <AdminResourceCard
                title={ev.title}
                subtitle={ev.description ?? undefined}
                imageUrl={ev.image_url}
                fallbackIcon={CalendarDays}
                badges={
                  !ev.is_published ? [{ label: "Hidden", variant: "secondary" }] : undefined
                }
                meta={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3 shrink-0" />
                      {formatEventDate(ev.starts_at)}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                }
                onEdit={() => {
                  const s = toLocalInput(ev.starts_at);
                  const en = toLocalInput(ev.ends_at);
                  setEdit({
                    __open: true,
                    ...ev,
                    starts_date: s.date,
                    starts_time: s.time,
                    ends_date: en.date,
                    ends_time: en.time,
                  });
                }}
                onDelete={() => setDeleting(ev)}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl">
              {edit?.id ? "Edit event" : "New event"}
            </DialogTitle>
            <DialogDescription>
              {edit?.id
                ? "Update event details. Changes sync to all members immediately."
                : "Fill in the details below. Members will see this in the app once published."}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="px-6 py-5 space-y-6">
              <AdminFormSection title="Cover image" description="A strong image helps members notice your event.">
                <ImageUploader
                  value={edit.image_url}
                  onChange={(url) => setEdit({ ...edit, image_url: url })}
                  folder="events"
                  label="Upload event cover"
                />
              </AdminFormSection>

              <AdminFormDivider />

              <AdminFormSection title="Event details">
                <AdminField label="Title" required>
                  <Input
                    placeholder="e.g. Community networking evening"
                    value={edit.title ?? ""}
                    onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Description">
                  <Textarea
                    rows={3}
                    placeholder="What should members know about this event?"
                    value={edit.description ?? ""}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Location">
                  <Input
                    placeholder="Venue name or address"
                    value={edit.location ?? ""}
                    onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                  />
                </AdminField>
              </AdminFormSection>

              <AdminFormDivider />

              <AdminFormSection title="Schedule">
                <AdminDatetimeField
                  label="Starts at"
                  required
                  date={edit.starts_date ?? ""}
                  time={edit.starts_time ?? ""}
                  onDateChange={(v) => setEdit({ ...edit, starts_date: v })}
                  onTimeChange={(v) => setEdit({ ...edit, starts_time: v })}
                />
                <AdminDatetimeField
                  label="Ends at"
                  date={edit.ends_date ?? ""}
                  time={edit.ends_time ?? ""}
                  onDateChange={(v) => setEdit({ ...edit, ends_date: v })}
                  onTimeChange={(v) => setEdit({ ...edit, ends_time: v })}
                />
              </AdminFormSection>

              <AdminFormDivider />

              <AdminStatusToggle
                id="published"
                label="Published"
                description="Hidden events stay in admin only and won't appear in the app."
                checked={edit.is_published ?? true}
                onCheckedChange={(v) => setEdit({ ...edit, is_published: v })}
              />

              {!edit.id && (
                <AdminFormNotice>
                  A push notification is sent automatically to opted-in members when you create a
                  new published event.
                </AdminFormNotice>
              )}
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => edit && save.mutate(edit)} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be removed from all client apps immediately.
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
