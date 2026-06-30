import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Mail,
  Phone,
  Users,
  Clock,
  Eye,
  UserCircle2,
  CheckCircle2,

} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/contact")({
  component: AdminContactPage,
});

type ContactInfo = {
  id: string;
  general_email: string | null;
  contacts: { name: string; phone: string }[];
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
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>(
    [],
  );

  useEffect(() => {
    if (data) {
      setEmail(data.general_email ?? "");
      setContacts(data.contacts ?? []);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) {
        const { error } = await supabase.from("contact_info").insert({
          general_email: email || null,
          contacts: contacts as any,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contact_info")
          .update({
            general_email: email || null,
            contacts: contacts as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Contact info updated - live for all members");
      qc.invalidateQueries({ queryKey: ["admin-contact-info"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const validContacts = contacts.filter(
    (c) => c.name.trim() || c.phone.trim(),
  );

  const isDirty = useMemo(() => {
    const origEmail = data?.general_email ?? "";
    const origContacts = JSON.stringify(data?.contacts ?? []);
    return (
      email !== origEmail || JSON.stringify(contacts) !== origContacts
    );
  }, [email, contacts, data]);

  const lastUpdated = data?.updated_at
    ? new Date(data.updated_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Admin / Settings
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2 tracking-tight">
            Contact info
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Manage how members reach the SLKD team. Changes sync instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-muted-foreground">
            Live - last edit {lastUpdated}
          </span>
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
          {/* LEFT: editor */}
          <div className="space-y-8">
            {/* General email section */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-foreground text-background grid place-items-center">
                  <Mail className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-tight">
                    General email
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Shown under "For more information".
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <Label
                  htmlFor="general-email"
                  className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
                >
                  Email address
                </Label>
                <Input
                  id="general-email"
                  type="email"
                  placeholder="info@slkd.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-11 text-base border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground bg-transparent shadow-none"
                />
              </div>
            </section>

            {/* People section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-foreground text-background grid place-items-center shrink-0">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-tight">
                      People to contact
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {validContacts.length}{" "}
                      {validContacts.length === 1 ? "person" : "people"} listed
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setContacts([...contacts, { name: "", phone: "" }])
                  }
                  className="rounded-full"
                >
                  <Plus className="size-4 mr-1.5" /> Add person
                </Button>
              </div>

              {contacts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                  <div className="size-12 mx-auto rounded-full bg-background border border-border grid place-items-center mb-4">
                    <UserCircle2 className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No contacts yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-xs mx-auto">
                    Add the people members should reach out to with questions.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setContacts([{ name: "", phone: "" }])}
                  >
                    <Plus className="size-4 mr-1.5" /> Add first contact
                  </Button>
                </div>
              ) : (
                <ul className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {contacts.map((c, i) => (
                    <li
                      key={i}
                      className="group p-4 sm:p-5 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_1fr_auto] gap-3 sm:gap-4 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="size-10 rounded-full bg-muted grid place-items-center text-muted-foreground font-semibold text-sm shrink-0">
                        {c.name.trim()
                          ? c.name.trim().charAt(0).toUpperCase()
                          : i + 1}
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Name
                        </Label>
                        <Input
                          value={c.name}
                          placeholder="Debbie Yeates"
                          onChange={(e) => {
                            const next = [...contacts];
                            next[i] = { ...next[i], name: e.target.value };
                            setContacts(next);
                          }}
                          className="mt-1 h-9 border-0 border-b border-transparent group-hover:border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground bg-transparent shadow-none"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Phone
                        </Label>
                        <Input
                          value={c.phone}
                          placeholder="072 323 4300"
                          onChange={(e) => {
                            const next = [...contacts];
                            next[i] = { ...next[i], phone: e.target.value };
                            setContacts(next);
                          }}
                          className="mt-1 h-9 border-0 border-b border-transparent group-hover:border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground bg-transparent shadow-none"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full size-9 shrink-0"
                        onClick={() =>
                          setContacts(contacts.filter((_, j) => j !== i))
                        }
                        aria-label="Remove contact"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT: preview */}
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Eye className="size-3.5 text-muted-foreground" />
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Member preview
              </h3>
            </div>

            {/* Phone frame */}
            <div className="rounded-[2rem] border border-border bg-gradient-to-b from-muted/40 to-background p-3 shadow-sm">
              <div className="rounded-[1.5rem] bg-background border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider">
                    9:41
                  </span>
                  <div className="flex gap-1">
                    <div className="size-1.5 rounded-full bg-foreground/40" />
                    <div className="size-1.5 rounded-full bg-foreground/40" />
                    <div className="size-1.5 rounded-full bg-foreground/40" />
                  </div>
                </div>

                <div className="p-5 space-y-5 min-h-[420px]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                      Contact us
                    </p>
                    <h4 className="text-xl font-bold mt-1 tracking-tight">
                      Get in touch
                    </h4>
                  </div>

                  {validContacts.length > 0 ? (
                    <div className="space-y-2">
                      {validContacts.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-9 rounded-full bg-foreground text-background grid place-items-center text-xs font-semibold shrink-0">
                              {c.name.trim()
                                ? c.name.trim().charAt(0).toUpperCase()
                                : "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate leading-tight">
                                {c.name || "(no name)"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {c.phone || "(no number)"}
                              </p>
                            </div>
                          </div>
                          <div className="size-8 rounded-full bg-green-500/10 text-green-600 dark:text-green-500 grid place-items-center shrink-0">
                            <Phone className="size-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {email && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                        For more information
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1.5 break-all flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        {email}
                      </p>
                    </div>
                  )}

                  {validContacts.length === 0 && !email && (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      Nothing to show yet -
                      <br />
                      add an email or a contact.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Sticky save bar */}
      {!isLoading && (
        <div
          className={cn(
            "sticky bottom-4 z-10 transition-all",
            isDirty ? "opacity-100 translate-y-0" : "opacity-80",
          )}
        >
          <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-md shadow-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isDirty ? (
                <>
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      Unsaved changes
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      Save to push live to every member.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      All changes saved
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block flex items-center gap-1">
                      <Clock className="size-3 inline" /> {lastUpdated}
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button
              size="default"
              onClick={() => save.mutate()}
              disabled={save.isPending || !isDirty}
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
