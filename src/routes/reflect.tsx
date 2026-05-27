import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMindset, type Reflection } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, CheckCircle2, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/reflect")({
  head: () => ({
    meta: [
      { title: "Weekly Reflection — MindReps" },
      {
        name: "description",
        content: "Review your week. Celebrate wins, name challenges, set focus for the next 7 days.",
      },
      { property: "og:title", content: "Weekly Reflection — MindReps" },
      { property: "og:description", content: "Reflect, refocus, repeat." },
    ],
  }),
  component: Reflect,
});

function startOfWeek() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function Reflect() {
  const { state, hydrated, isAuthed, authLoading, actions } = useMindset();
  const navigate = useNavigate();
  const week = useMemo(startOfWeek, []);
  const existing = state.reflections.find((r) => r.weekOf === week);

  const [wins, setWins] = useState(existing?.wins ?? "");
  const [challenges, setChallenges] = useState(existing?.challenges ?? "");
  const [focus, setFocus] = useState(existing?.focus ?? "");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthed) navigate({ to: "/auth" });
  }, [authLoading, isAuthed, navigate]);

  // Sync local form fields when reflections load from Supabase
  useEffect(() => {
    if (existing) {
      setWins(existing.wins);
      setChallenges(existing.challenges);
      setFocus(existing.focus);
    }
  }, [existing]);

  const save = async () => {
    const r: Reflection = { weekOf: week, wins, challenges, focus };
    await actions.saveReflection(r);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2200);
  };

  if (authLoading || !isAuthed || !hydrated) {
    return (
      <AppShell>
        <div className="h-[60vh] grid place-items-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-pink mb-2">
          <CalendarDays className="size-3.5" />
          Week of {new Date(week).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight">
          Weekly <span className="text-gradient-primary">Reflection</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Champions review tape. Spend 5 minutes reviewing your mind. Earn{" "}
          <span className="text-gold font-semibold">+50 mind points</span> for completing your week.
        </p>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Field
          title="Wins"
          subtitle="What went well — on and off the field?"
          tone="gold"
          value={wins}
          onChange={setWins}
          placeholder="Hit a PR in sprints. Stayed calm in the 4th quarter…"
        />
        <Field
          title="Challenges"
          subtitle="Where did you struggle? Be honest."
          tone="purple"
          value={challenges}
          onChange={setChallenges}
          placeholder="Got in my head during free throws. Lost focus after mistakes…"
        />
        <Field
          title="Next Week's Focus"
          subtitle="Pick ONE thing to lock in."
          tone="pink"
          value={focus}
          onChange={setFocus}
          placeholder="Reset breath after every mistake. Eyes up, chest up…"
        />
      </div>

      <div className="flex items-center justify-between mt-8 glass rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
            <Trophy className="size-5 text-gold-foreground" />
          </div>
          <div>
            <div className="font-display font-semibold">
              {existing ? "Update this week's reflection" : "Complete your weekly reflection"}
            </div>
            <div className="text-xs text-muted-foreground">
              {existing ? "Already logged — keep refining" : "Earn +50 mind points · build the streak"}
            </div>
          </div>
        </div>
        <Button onClick={save} className="bg-gradient-primary hover:opacity-95 shadow-glow rounded-full">
          {justSaved ? <><CheckCircle2 className="size-4" />Saved</> : "Save Reflection"}
        </Button>
      </div>

      {state.reflections.length > 1 && (
        <section className="mt-12">
          <h2 className="text-xl font-display font-semibold mb-4">Past Weeks</h2>
          <div className="space-y-3">
            {state.reflections
              .filter((r) => r.weekOf !== week)
              .slice(0, 6)
              .map((r) => (
                <div key={r.weekOf} className="glass rounded-2xl p-5">
                  <div className="text-xs uppercase tracking-widest text-pink mb-2">
                    Week of {new Date(r.weekOf).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                  </div>
                  {r.focus && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Focus: </span>
                      <span className="font-medium">{r.focus}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Field({
  title,
  subtitle,
  value,
  onChange,
  placeholder,
  tone,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  tone: "gold" | "purple" | "pink";
}) {
  const dot =
    tone === "gold" ? "bg-gold" : tone === "purple" ? "bg-purple" : "bg-pink";
  return (
    <div className="glass rounded-3xl p-6 shadow-card flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className={`size-2 rounded-full ${dot}`} />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-h-[180px] bg-background/40 border-border focus-visible:ring-primary resize-none"
      />
    </div>
  );
}
