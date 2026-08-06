import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";

export const Route = createFileRoute("/admin/contact")({
  component: AdminContactPage,
});

type ContactPerson = {
  name: string;
  phone: string;
  image_url?: string | null;
};

type ContactInfo = {
  id: string;
  general_email: string | null;
  contacts: ContactPerson[];
  updated_at?: string | null;
};

function AdminContactPage() {
  const qc = useQueryClient();
  useRealtimeInvalidate("contact_info", [["admin-contact-info"]]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_info")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ContactInfo | null;
    },
  });

  const [email, setEmail] = useState("");
  const [contacts, setContacts] = useState<ContactPerson[]>([]);

  useEffect(() => {
    if (data) {
      setEmail(data.general_email ?? "");
      setContacts(
        (data.contacts ?? []).map((c) => ({
          name: c.name ?? "",
          phone: c.phone ?? "",
          image_url: c.image_url ?? null,
        })),
      );
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = contacts
        .filter((c) => c.name.trim() || c.phone.trim())
        .map((c) => ({
          name: c.name.trim(),
          phone: c.phone.trim(),
          image_url: c.image_url || null,
        }));
      if (!data) {
        const { error } = await supabase.from("contact_info").insert({
          general_email: email || null,
          contacts: cleaned as Json,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contact_info")
          .update({
            general_email: email || null,
            contacts: cleaned as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Contact info updated - live for all members");
      qc.invalidateQueries({ queryKey: ["admin-contact-info"] });
      qc.invalidateQueries({ queryKey: ["contact-info"] });
    },
    onError: (e) => toast.error(e.message || "Failed to save"),
  });

  const isDirty = useMemo(() => {
    const origEmail = data?.general_email ?? "";
    const origContacts = JSON.stringify(data?.contacts ?? []);
    return email !== origEmail || JSON.stringify(contacts) !== origContacts;
  }, [email, contacts, data]);

  const lastUpdated = data?.updated_at
    ? new Date(data.updated_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="space-y-8">
      <header className="pb-6 border-b border-border">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contact info
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          How members reach the SLK team - shown in their Profile under "Get in touch".
        </p>
      </header>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* General email */}
          <section className="space-y-2">
            <Label htmlFor="general-email" className="text-sm font-semibold">
              General email
            </Label>
            <Input
              id="general-email"
              type="email"
              placeholder="info@slkd.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 max-w-md"
            />
          </section>

          {/* People */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">People to contact</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContacts([...contacts, { name: "", phone: "", image_url: null }])}
              >
                <Plus className="size-4 mr-1.5" /> Add person
              </Button>
            </div>

            {contacts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">No contacts yet.</p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setContacts([{ name: "", phone: "", image_url: null }])}
                >
                  <Plus className="size-4 mr-1.5" /> Add first contact
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <ImageUploader
                      value={c.image_url}
                      onChange={(url) => {
                        const next = [...contacts];
                        next[i] = { ...next[i], image_url: url };
                        setContacts(next);
                      }}
                      folder="contacts"
                      shape="circle"
                      compact
                      label="Photo"
                    />
                    <Input
                      value={c.name}
                      placeholder="Name"
                      onChange={(e) => {
                        const next = [...contacts];
                        next[i] = { ...next[i], name: e.target.value };
                        setContacts(next);
                      }}
                      className="h-10 flex-1 min-w-0"
                    />
                    <Input
                      value={c.phone}
                      placeholder="Phone"
                      onChange={(e) => {
                        const next = [...contacts];
                        next[i] = { ...next[i], phone: e.target.value };
                        setContacts(next);
                      }}
                      className="h-10 flex-1 min-w-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                      aria-label="Remove contact"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Save */}
      {!isLoading && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            {isDirty ? "Unsaved changes" : `Last updated ${lastUpdated}`}
          </p>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !isDirty}>
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
