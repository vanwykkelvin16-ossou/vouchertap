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
} from "@/components/admin/admin-form";
import { Plus, Loader2, Mic2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/breakfast")({
  component: AdminBreakfastPage,
});

type MeetingRow = {
  id: string;
  meeting_date: string;
  speaker_name: string | null;
  speaker_title: string | null;
  speaker_bio: string | null;
  speaker_image_url: string | null;
  topic: string | null;
  is_published: boolean;
};

type EditState = Partial<MeetingRow> & {
  __open: boolean;
  meeting_date_date?: string;
  meeting_date_time?: string;
};

const empty: EditState = {
  __open: true,
  meeting_date: "",
  meeting_date_date: "",
  meeting_date_time: "",
  speaker_name: "",
  speaker_title: "",
  speaker_bio: "",
  speaker_image_url: null,
  topic: "",
  is_published: true,
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

function formatMeetingDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminBreakfastPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("breakfast_meetings", [["admin-breakfast"]]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<MeetingRow | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-breakfast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breakfast_meetings")
        .select("*")
        .order("meeting_date", { ascending: true });
      if (error) throw error;
      return data as MeetingRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (m) =>
        m.speaker_name?.toLowerCase().includes(q) ||
        m.topic?.toLowerCase().includes(q) ||
        m.speaker_title?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const save = useMutation({
    mutationFn: async (e: EditState) => {
      const meetingAt = combineDatetime(e.meeting_date_date ?? "", e.meeting_date_time ?? "");
      if (!meetingAt) throw new Error("Meeting date is required");
      const payload = {
        meeting_date: new Date(meetingAt).toISOString(),
        speaker_name: e.speaker_name || null,
        speaker_title: e.speaker_title || null,
        speaker_bio: e.speaker_bio || null,
        speaker_image_url: e.speaker_image_url ?? null,
        topic: e.topic || null,
        is_published: e.is_published ?? true,
      };
      if (e.id) {
        const { error } = await supabase
          .from("breakfast_meetings")
          .update(payload)
          .eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("breakfast_meetings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Meeting saved");
      qc.invalidateQueries({ queryKey: ["admin-breakfast"] });
      setEdit(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("breakfast_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meeting deleted");
      qc.invalidateQueries({ queryKey: ["admin-breakfast"] });
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const openCreate = () => setEdit(empty);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Breakfast Meetings"
        description="Upload the speaker for each bi-weekly Friday breakfast. Members see this on the booking page."
        count={data?.length}
        countLabel={data?.length === 1 ? "meeting" : "meetings"}
        action={{ label: "Add speaker", icon: Plus, onClick: openCreate }}
      />

      {!isLoading && data && data.length > 0 && (
        <AdminSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by speaker, topic, or role…"
        />
      )}

      {isLoading ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <AdminEmptyState
          icon={Mic2}
          title="No meetings yet"
          description="Add speaker info for an upcoming breakfast. Include a photo, topic, and meeting date."
          action={{ label: "Add first speaker", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={Mic2}
          title="No matching meetings"
          description={`Nothing matches "${search}". Try a different search term.`}
        />
      ) : (
        <ul className="grid gap-3">
          {filtered.map((m) => (
            <li key={m.id}>
              <AdminResourceCard
                title={m.speaker_name ?? "Speaker TBA"}
                subtitle={m.speaker_title ?? undefined}
                imageUrl={m.speaker_image_url}
                imageShape="circle"
                fallbackIcon={Mic2}
                badges={
                  !m.is_published ? [{ label: "Hidden", variant: "secondary" }] : undefined
                }
                meta={
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3 shrink-0" />
                      {formatMeetingDate(m.meeting_date)}
                    </span>
                    {m.topic && <p className="truncate">Topic: {m.topic}</p>}
                  </div>
                }
                onEdit={() => {
                  const dt = toLocalInput(m.meeting_date);
                  setEdit({
                    __open: true,
                    ...m,
                    meeting_date_date: dt.date,
                    meeting_date_time: dt.time,
                  });
                }}
                onDelete={() => setDeleting(m)}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl">
              {edit?.id ? "Edit speaker" : "Add speaker"}
            </DialogTitle>
            <DialogDescription>
              Appears on the breakfast booking page for all members once published.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="px-6 py-5 space-y-6">
              <AdminFormSection title="Speaker photo">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <ImageUploader
                    value={edit.speaker_image_url}
                    onChange={(url) => setEdit({ ...edit, speaker_image_url: url })}
                    folder="breakfast"
                    shape="circle"
                    label="Upload photo"
                  />
                </div>
              </AdminFormSection>

              <AdminFormDivider />

              <AdminFormSection title="Meeting details">
                <AdminDatetimeField
                  label="Meeting date and time"
                  required
                  date={edit.meeting_date_date ?? ""}
                  time={edit.meeting_date_time ?? ""}
                  onDateChange={(v) => setEdit({ ...edit, meeting_date_date: v })}
                  onTimeChange={(v) => setEdit({ ...edit, meeting_date_time: v })}
                />
                <AdminField label="Topic">
                  <Input
                    placeholder="What will the speaker talk about?"
                    value={edit.topic ?? ""}
                    onChange={(e) => setEdit({ ...edit, topic: e.target.value })}
                  />
                </AdminField>
              </AdminFormSection>

              <AdminFormDivider />

              <AdminFormSection title="Speaker info">
                <AdminField label="Speaker name">
                  <Input
                    placeholder="Full name"
                    value={edit.speaker_name ?? ""}
                    onChange={(e) => setEdit({ ...edit, speaker_name: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Speaker title / role">
                  <Input
                    placeholder="e.g. Founder of Acme Co."
                    value={edit.speaker_title ?? ""}
                    onChange={(e) => setEdit({ ...edit, speaker_title: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Speaker bio">
                  <Textarea
                    rows={4}
                    placeholder="A short bio members can read before booking"
                    value={edit.speaker_bio ?? ""}
                    onChange={(e) => setEdit({ ...edit, speaker_bio: e.target.value })}
                  />
                </AdminField>
              </AdminFormSection>

              <AdminFormDivider />

              <AdminStatusToggle
                id="published"
                label="Published"
                description="Hidden meetings won't appear on the booking page."
                checked={edit.is_published ?? true}
                onCheckedChange={(v) => setEdit({ ...edit, is_published: v })}
              />
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => edit && save.mutate(edit)} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the speaker info from the booking page.
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
