import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, Mic2, ArrowLeft, Loader2 } from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import breakfastHero from "@/assets/breakfast-hero.jpg";

const RSVP_FORM_SRC = "https://link.dnasupersystems.com/widget/form/ReMBHhH8fEZoKbItzl02";
const RSVP_EMBED_SCRIPT = "https://link.dnasupersystems.com/js/form_embed.js";
const VENUE = "Bella Vista Wedding Venue";
const START_TIME = "07:30";

export const Route = createFileRoute("/app/breakfast")({
  component: BreakfastPage,
});

type Meeting = {
  id: string;
  meeting_date: string;
  speaker_name: string | null;
  speaker_title: string | null;
  speaker_bio: string | null;
  speaker_image_url: string | null;
  topic: string | null;
};

function nextBiweeklyFridays(count = 6) {
  const now = new Date();
  const d = new Date(now);
  d.setHours(7, 30, 0, 0);
  const day = d.getDay();
  let diff = (5 - day + 7) % 7;
  if (diff === 0 && now.getTime() > d.getTime()) diff = 7;
  d.setDate(d.getDate() + diff);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 14);
  }
  return out;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysUntil(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function SectionHeading({ no, title }: { no: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <span className="font-serial text-xs text-primary font-semibold">{no}</span>
      <h2
        className="text-xl md:text-2xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      <div className="flex-1 border-t border-dashed border-border translate-y-[-3px]" />
    </div>
  );
}

function BreakfastPage() {
  useRealtimeInvalidate("breakfast_meetings", [["breakfast-meetings"]]);

  useEffect(() => {
    if (document.querySelector(`script[src="${RSVP_EMBED_SCRIPT}"]`)) return;
    const s = document.createElement("script");
    s.src = RSVP_EMBED_SCRIPT;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["breakfast-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breakfast_meetings")
        .select("*")
        .eq("is_published", true)
        .gte("meeting_date", new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString())
        .order("meeting_date", { ascending: true });
      if (error) throw error;
      return data as Meeting[];
    },
  });

  const upcoming = useMemo(() => nextBiweeklyFridays(6), []);

  const schedule = useMemo(() => {
    return upcoming.map((date) => {
      const match = meetings?.find((m) => sameDay(new Date(m.meeting_date), date));
      return { date, meeting: match };
    });
  }, [upcoming, meetings]);

  const featured = schedule[0];
  const inDays = featured ? daysUntil(featured.date) : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-12 pb-14">
      <div className="animate-rise">
        <Link
          to="/app/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to events
        </Link>
      </div>

      {/* Hero — editorial invitation */}
      <header className="relative overflow-hidden rounded-3xl animate-rise shadow-xl shadow-black/10">
        <div className="relative aspect-[4/5] sm:aspect-[16/11] md:aspect-[16/9] w-full">
          <img
            src={breakfastHero}
            alt="Breakfast meeting table"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-white">
            <p className="text-[11px] uppercase tracking-[0.3em] font-semibold text-white/80">
              So Love Krugersdorp presents
            </p>
            <h1
              className="mt-2 text-4xl md:text-6xl font-bold tracking-tight leading-[0.95]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The Breakfast
              <br />
              Meeting
            </h1>
            <p className="mt-3 max-w-md text-sm md:text-base text-white/85">
              Every second Friday. One table, one speaker, and the people building Krugersdorp —
              over breakfast.
            </p>

            {/* Serial info strip */}
            <div className="mt-5 inline-flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-2.5 font-serial text-[11px] md:text-xs uppercase">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> {START_TIME}
              </span>
              <span className="hidden sm:block h-3 w-px bg-white/30" />
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {VENUE}
              </span>
              <span className="hidden sm:block h-3 w-px bg-white/30" />
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Biweekly · Fridays
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 01 — Next meeting */}
      <section className="animate-rise" style={{ animationDelay: "80ms" }}>
        <SectionHeading no="01" title="Next meeting" />
        {isLoading ? (
          <Card className="p-10 grid place-items-center rounded-2xl">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </Card>
        ) : featured ? (
          <Card className="overflow-hidden rounded-2xl">
            <div className="grid md:grid-cols-[260px_1fr]">
              {/* Speaker visual */}
              <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[280px] bg-muted">
                {featured.meeting?.speaker_image_url ? (
                  <img
                    src={featured.meeting.speaker_image_url}
                    alt={featured.meeting.speaker_name ?? "Speaker"}
                    className="absolute inset-0 size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-muted-foreground/50">
                    <Mic2 className="size-10" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/95 text-foreground shadow font-serial text-[10px] uppercase">
                    {inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`}
                  </Badge>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 md:p-8 flex flex-col">
                <p className="font-serial text-[11px] text-primary uppercase">
                  {featured.date.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  · {START_TIME}
                </p>

                {featured.meeting?.speaker_name ? (
                  <>
                    <h3
                      className="mt-2 text-2xl md:text-3xl font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {featured.meeting.speaker_name}
                    </h3>
                    {featured.meeting.speaker_title && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {featured.meeting.speaker_title}
                      </p>
                    )}
                    {featured.meeting.topic && (
                      <p className="mt-4 text-base md:text-lg leading-snug font-medium border-l-2 border-primary pl-4">
                        "{featured.meeting.topic}"
                      </p>
                    )}
                    {featured.meeting.speaker_bio && (
                      <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-5">
                        {featured.meeting.speaker_bio}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3
                      className="mt-2 text-2xl md:text-3xl font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Speaker to be announced
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      We'll share the lineup closer to the date — your seat at the table is the same
                      either way.
                    </p>
                  </>
                )}

                <div className="mt-auto pt-6">
                  <div className="ticket-tear mb-5" aria-hidden="true" />
                  <a
                    href="#rsvp"
                    className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm px-7 py-3 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                  >
                    Reserve your seat
                  </a>
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </section>

      {/* 02 — RSVP */}
      <section id="rsvp" className="animate-rise scroll-mt-24" style={{ animationDelay: "140ms" }}>
        <SectionHeading no="02" title="Reserve your seat" />
        <p className="text-sm text-muted-foreground -mt-2 mb-5 max-w-md">
          Fill in your details and we'll set a place for you at the table.
        </p>
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <iframe
            src={RSVP_FORM_SRC}
            id="inline-ReMBHhH8fEZoKbItzl02"
            data-layout='{"id":"INLINE"}'
            data-trigger-type="alwaysShow"
            data-activation-type="alwaysActivated"
            data-deactivation-type="neverDeactivate"
            data-form-name="RSVP FORM"
            data-height="1450"
            data-layout-iframe-id="inline-ReMBHhH8fEZoKbItzl02"
            data-form-id="ReMBHhH8fEZoKbItzl02"
            title="RSVP FORM"
            style={{
              width: "100%",
              minHeight: 1600,
              border: "none",
              background: "white",
              display: "block",
            }}
          />
        </div>
      </section>

      {/* 03 — Upcoming dates */}
      <section className="animate-rise" style={{ animationDelay: "200ms" }}>
        <SectionHeading no="03" title="Upcoming dates" />
        <Card className="rounded-2xl overflow-hidden divide-y divide-dashed divide-border p-0">
          {schedule.map(({ date, meeting }, i) => (
            <div
              key={date.toISOString()}
              className={`flex items-center gap-4 px-5 py-4 ${i === 0 ? "bg-accent/40" : ""}`}
            >
              <div className="w-12 text-center shrink-0">
                <p className="font-serial text-[10px] uppercase text-primary">
                  {date.toLocaleDateString(undefined, { month: "short" })}
                </p>
                <p
                  className="text-2xl font-bold leading-none mt-0.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {date.getDate()}
                </p>
              </div>
              <div className="h-9 w-px bg-border" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {date.toLocaleDateString(undefined, { weekday: "long" })}
                  {i === 0 && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-bold">
                      Next up
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {meeting?.speaker_name ?? "Speaker to be announced"}
                </p>
              </div>
              <span className="font-serial text-[10px] text-muted-foreground/60 hidden sm:block">
                {START_TIME}
              </span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
