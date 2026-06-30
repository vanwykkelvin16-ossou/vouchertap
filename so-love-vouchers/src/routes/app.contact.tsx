import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Loader2, Heart } from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";

export const Route = createFileRoute("/app/contact")({
  component: ContactPage,
});

type ContactInfo = {
  id: string;
  general_email: string | null;
  contacts: { name: string; phone: string }[];
};

function ContactPage() {
  useRealtimeInvalidate("contact_info", [["contact-info"]]);

  const { data, isLoading } = useQuery({
    queryKey: ["contact-info"],
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

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Get in touch
        </p>
        <h1 className="text-3xl md:text-5xl font-bold mt-2 tracking-tight">
          Contact
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          We'd love to hear from you.
        </p>
      </header>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {data?.general_email && (
            <Card className="overflow-hidden">
              <div className="bg-primary/5 px-5 py-3 border-b">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
                  For more information
                </p>
              </div>
              <a
                href={`mailto:${data.general_email}`}
                className="flex items-center gap-4 p-5 hover:bg-muted/40 transition-colors"
              >
                <div className="size-12 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm shadow-primary/20">
                  <Mail className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Email
                  </p>
                  <p className="font-bold text-base mt-0.5 break-all">
                    {data.general_email}
                  </p>
                </div>
              </a>
            </Card>
          )}

          {data?.contacts && data.contacts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Speak to the team
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.contacts.map((c, i) => (
                  <a
                    key={i}
                    href={`tel:${c.phone.replace(/\s+/g, "")}`}
                    className="block"
                  >
                    <Card className="p-5 hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-primary/10 text-primary grid place-items-center">
                          <Phone className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-base leading-tight">
                            {c.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {c.phone}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}

          <Card className="p-6 text-center bg-muted/30 border-dashed">
            <div className="size-10 mx-auto rounded-full bg-primary text-primary-foreground grid place-items-center mb-3">
              <Heart className="size-5 fill-current" />
            </div>
            <p className="text-sm text-muted-foreground">
              So Love Krugersdorp - connecting community, every day.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
