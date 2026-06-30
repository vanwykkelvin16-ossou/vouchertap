import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Clock,
  Mic2,
  ArrowLeft,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import breakfastHero from "@/assets/breakfast-hero.jpg";


const RSVP_FORM_SRC =
  "https://link.dnasupersystems.com/widget/form/ReMBHhH8fEZoKbItzl02";
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
        .gte(
          "meeting_date",
          new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        )
        .order("meeting_date", { ascending: true });
      if (error) throw error;
      return data as Meeting[];
    },
  });

  const upcoming = useMemo(() => nextBiweeklyFridays(6), []);

  const schedule = useMemo(() => {
    return upcoming.map((date) => {
      const match = meetings?.find((m) =>
        sameDay(new Date(m.meeting_date), date),
      );
      return { date, meeting: match };
    });
  }, [upcoming, meetings]);

  const featured = schedule[0];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 pb-12">
      <div>
        <Link
          to="/app/events"
          className="inline-flex items-center gap-2 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to events
        </Link>
      </div>

      {/* Hero - clean white, modern */}
      <header className="overflow-hidden rounded-3xl bg-white border border-border shadow-sm">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img
            src={breakfastHero}
            alt="Breakfast meeting table"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="px-6 md:px-10 py-8 md:py-10 text-center space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">
            So Love Krugersdorp
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Breakfast Meeting
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Every second Friday morning. Connect, hear from inspiring speakers,
            and share a meal with the SLK community.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 bg-muted/60">
              <Clock className="size-3" /> {START_TIME}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 bg-muted/60">
              <MapPin className="size-3" /> {VENUE}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 bg-muted/60">
              <CalendarDays className="size-3" /> Every 2 weeks
            </Badge>
          </div>
        </div>
      </header>


      {/* Next meeting */}
      {isLoading ? (
        <Card className="p-8 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </Card>
      ) : featured ? (
        <Card className="overflow-hidden">
          <div className="bg-primary/5 px-5 py-3 border-b text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
              Next meeting
            </p>
            <p className="text-sm font-semibold mt-1">
              {featured.date.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              · {START_TIME}
            </p>
          </div>
          <div className="p-6">
            <SpeakerBlock meeting={featured.meeting} />
          </div>
        </Card>
      ) : null}

      {/* RSVP form */}
      <section className="space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10 text-primary mx-auto">
            <ClipboardList className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">
              RSVP
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Reserve your seat
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Fill in your details below and we'll save a spot for you at the table.
          </p>
        </div>

        <div className="relative rounded-3xl bg-white border border-border shadow-lg shadow-primary/5 overflow-hidden">
          {/* Decorative top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          <div className="p-1">
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
              style={{ width: "100%", minHeight: 1600, border: "none", background: "white", display: "block" }}
            />
          </div>
        </div>
      </section>


      {/* Upcoming dates */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">
          Upcoming dates
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {schedule.map(({ date, meeting }) => (
            <li key={date.toISOString()}>
              <Card className="p-4 flex items-center gap-3">
                <div className="size-12 rounded-md bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                  <div className="text-center leading-none">
                    <div className="text-[10px] uppercase font-semibold">
                      {date.toLocaleDateString(undefined, { month: "short" })}
                    </div>
                    <div className="text-lg font-bold mt-0.5">
                      {date.getDate()}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {date.toLocaleDateString(undefined, { weekday: "long" })}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {meeting?.speaker_name
                      ? meeting.speaker_name
                      : "Speaker TBA"}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SpeakerBlock({ meeting }: { meeting: Meeting | undefined }) {
  if (!meeting || (!meeting.speaker_name && !meeting.speaker_image_url)) {
    return (
      <div className="flex flex-col items-center text-center gap-3 text-muted-foreground py-2">
        <div className="size-14 rounded-full bg-muted grid place-items-center">
          <Mic2 className="size-5" />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            Speaker to be announced
          </p>
          <p className="text-xs mt-0.5">
            We'll share details closer to the date.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="size-32 rounded-full overflow-hidden bg-muted ring-2 ring-primary/20">
        {meeting.speaker_image_url ? (
          <img
            src={meeting.speaker_image_url}
            alt={meeting.speaker_name ?? ""}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="size-full grid place-items-center text-muted-foreground">
            <Mic2 className="size-6" />
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
          Featured speaker
        </p>
        <h3 className="text-xl font-bold leading-tight mt-1">
          {meeting.speaker_name}
        </h3>
        {meeting.speaker_title && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {meeting.speaker_title}
          </p>
        )}
        {meeting.topic && (
          <Badge variant="secondary" className="mt-2">
            {meeting.topic}
          </Badge>
        )}
      </div>
      {meeting.speaker_bio && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose">
          {meeting.speaker_bio}
        </p>
      )}
    </div>
  );
}
