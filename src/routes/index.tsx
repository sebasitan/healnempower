import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMindset, type JournalEntry } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { AffirmationCard } from "@/components/AffirmationCard";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { ConfidenceCard } from "@/components/ConfidenceCard";
import { GratitudeCard } from "@/components/GratitudeCard";
import { StatsRail } from "@/components/StatsRail";
import { TrendsCard } from "@/components/TrendsCard";
import { InsightsCard } from "@/components/InsightsCard";
import { CoachChat } from "@/components/CoachChat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindReps — Daily Mindset Dashboard for Athletes" },
      {
        name: "description",
        content:
          "Train your mind like a champion. Daily mood, confidence, gratitude, affirmations, streaks and points for athletes 11–19.",
      },
      { property: "og:title", content: "MindReps — Athlete Mindset Dashboard" },
      {
        property: "og:description",
        content: "Daily mindset training for young athletes.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { state, hydrated, isAuthed, authLoading, actions } = useMindset();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthed) navigate({ to: "/auth" });
  }, [authLoading, isAuthed, navigate]);

  // After auth + data are ready, ensure embed/iframe scrolls to top of dashboard.
  useEffect(() => {
    if (!authLoading && isAuthed && hydrated && typeof window !== "undefined") {
      const scrollToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      scrollToTop();
      requestAnimationFrame(scrollToTop);
      window.setTimeout(scrollToTop, 100);
      window.setTimeout(scrollToTop, 300);
    }
  }, [authLoading, isAuthed, hydrated]);

  if (authLoading || !isAuthed || !hydrated) {
    return (
      <AppShell>
        <div className="h-[60vh] grid place-items-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const saveJournal = (entry: JournalEntry) => actions.saveJournal(entry);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning, athlete";
    if (h < 18) return "Lock in, athlete";
    return "Wind down strong";
  })();

  return (
    <AppShell>
      <section className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-pink mb-2">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight">
          {greeting}.
          <br />
          <span className="text-gradient-primary">Today is a rep for your mind.</span>
        </h1>
      </section>

      <div className="mb-8">
        <AffirmationCard />
      </div>

      <div className="mb-8">
        <StatsRail streak={state.streak} points={state.points} mood={state.mood} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <MoodCheckIn value={state.mood} onChange={actions.setMood} />
        <ConfidenceCard value={state.confidence} onChange={actions.setConfidence} />
      </div>

      <div className="mb-6">
        <TrendsCard history={state.history} />
      </div>

      <div className="mb-6">
        <InsightsCard history={state.history} />
      </div>

      <div className="mb-6">
        <GratitudeCard journal={state.journal} onSave={saveJournal} />
      </div>

      <div className="mb-6">
        <CoachChat />
      </div>
    </AppShell>
  );
}
