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
  AdminModal,
  ModalBody,
  FormSection,
  Field,
  DateTimeField,
  ToggleRow,
  ModalFooter,
  ConfirmDialog,
  InfoNote,
} from "@/components/admin/form-kit";
import { ImageUploader } from "@/components/image-uploader";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { Plus, Pencil, Trash2, Loader2, MapPin, CalendarDays, Bell } from "lucide-react";
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
  form_url: string | null;
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
  form_url: "",
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

/** Tidy a pasted form link: blank stays null, a bare domain gets https://. */
function normaliseFormUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    throw new Error("The form link isn't a valid URL");
  }
}

function AdminEventsPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("events", [["admin-events"]]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
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
        form_url: normaliseFormUrl(e.form_url),
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

      // Auto-send push notification when a new published event is created
      if (isNew && payload.is_published) {
        const title = `New event: ${payload.title}`;
        const when = new Date(payload.starts_at).toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
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
        } catch (err) {
          toast.error(
            `Notification not sent: ${err instanceof Error ? err.message : "unknown error"}`,
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setEdit(null);
    },
    onError: (e) => toast.error(e.message || "Failed to save"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setDeleting(null);
    },
    onError: (e) => toast.error(e.message || "Failed to delete"),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Admin</p>
          <h1 className="text-3xl font-bold mt-1">Events</h1>
        </div>
        <Button onClick={() => setEdit(empty)} className="rounded-full px-5 shadow-sm">
          <Plus className="size-4 mr-1.5" /> New event
        </Button>
      </header>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-10 text-center border-dashed bg-muted/25 rounded-2xl">
          <div className="size-12 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
            <CalendarDays className="size-6" />
          </div>
          <p className="font-semibold">No events yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first event to show it in the app.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-2.5">
          {data.map((ev) => (
            <li key={ev.id}>
              <Card className="group p-3.5 flex items-center gap-4 rounded-2xl border-border/70 shadow-sm transition-all hover:border-border hover:shadow-md">
                <div className="size-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center text-muted-foreground/50">
                      <CalendarDays className="size-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{ev.title}</h3>
                    {!ev.is_published && (
                      <Badge variant="secondary" className="text-[10px] rounded-full">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3" />
                      {new Date(ev.starts_at).toLocaleString()}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <MapPin className="size-3" />
                        {ev.location}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    aria-label={`Edit ${ev.title}`}
                    onClick={() => {
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
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Delete ${ev.title}`}
                    onClick={() => setDeleting(ev)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AdminModal
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        eyebrow="Events"
        icon={CalendarDays}
        title={edit?.id ? "Edit event" : "New event"}
        description="Changes appear in the app instantly for everyone."
        footer={
          <ModalFooter
            hint={
              edit?.id
                ? "Saving updates the live app instantly."
                : "Publishing sends it to every member's app."
            }
            onCancel={() => setEdit(null)}
            onSave={() => edit && save.mutate(edit)}
            saving={save.isPending}
            saveLabel={edit?.id ? "Save changes" : "Publish event"}
          />
        }
      >
        {edit && (
          <ModalBody>
            <FormSection
              title="Cover image"
              description="Shown at the top of the event in the member app. The whole image is kept — nothing is cropped."
            >
              <ImageUploader
                value={edit.image_url}
                onChange={(url) => setEdit({ ...edit, image_url: url })}
                folder="events"
                aspect="16 / 9"
                label="Add a cover image"
                hint="Landscape works best. JPG, PNG or WebP up to 5MB."
              />
            </FormSection>

            <FormSection title="Details">
              <Field label="Title" required>
                <Input
                  placeholder="e.g. Year-end celebration"
                  value={edit.title ?? ""}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  rows={3}
                  placeholder="What's happening, who it's for, what to expect..."
                  value={edit.description ?? ""}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <Input
                  placeholder="e.g. Bella Vista Wedding Venue"
                  value={edit.location ?? ""}
                  onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                />
              </Field>
              <Field
                label="Registration form link"
                hint="Paste a Jotform (or any form) link. Members see a Register button on the event — leave it empty and no button shows."
              >
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://form.jotform.com/..."
                  value={edit.form_url ?? ""}
                  onChange={(e) => setEdit({ ...edit, form_url: e.target.value })}
                />
              </Field>
            </FormSection>

            <FormSection title="Date &amp; time">
              <DateTimeField
                label="Starts at"
                required
                dateValue={edit.starts_date ?? ""}
                timeValue={edit.starts_time ?? ""}
                onDate={(v) => setEdit({ ...edit, starts_date: v })}
                onTime={(v) => setEdit({ ...edit, starts_time: v })}
              />
              <DateTimeField
                label="Ends at"
                hint="Optional — leave blank for an open-ended event."
                dateValue={edit.ends_date ?? ""}
                timeValue={edit.ends_time ?? ""}
                onDate={(v) => setEdit({ ...edit, ends_date: v })}
                onTime={(v) => setEdit({ ...edit, ends_time: v })}
              />
            </FormSection>

            <FormSection title="Visibility">
              <ToggleRow label="Published" description="Visible to all members in the app.">
                <Switch
                  id="published"
                  checked={edit.is_published ?? true}
                  onCheckedChange={(v) => setEdit({ ...edit, is_published: v })}
                />
              </ToggleRow>
              <InfoNote icon={Bell}>
                Creating a new published event sends a push notification to every opted-in member
                automatically.
              </InfoNote>
            </FormSection>
          </ModalBody>
        )}
      </AdminModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        icon={Trash2}
        title="Delete this event?"
        description={
          <>
            <span className="font-medium text-foreground">{deleting?.title}</span> will be removed
            from every member's app immediately. This can't be undone.
          </>
        }
        onConfirm={() => deleting && del.mutate(deleting.id)}
        loading={del.isPending}
        confirmLabel="Delete event"
      />
    </div>
  );
}
