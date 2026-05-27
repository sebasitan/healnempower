import { useMemo } from "react";
import { Sparkles, TrendingUp, TrendingDown, Target } from "lucide-react";
import type { DayLog } from "@/lib/store";

type Metric = "mood" | "confidence";

function normalize(log: DayLog, key: Metric): number | null {
  const v = log[key];
  if (v == null) return null;
  if (key === "mood") return ((v - 1) / 4) * 100;
  return v;
}

function splitWeeks(history: DayLog[]) {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const thisWeek: DayLog[] = [];
  const lastWeek: DayLog[] = [];
  const map = new Map(history.map((h) => [h.date, h]));
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const entry = map.get(iso(d));
    if (!entry) continue;
    if (i < 7) thisWeek.push(entry);
    else lastWeek.push(entry);
  }
  return { thisWeek, lastWeek };
}

function avg(logs: DayLog[], key: Metric): number | null {
  const vals = logs.map((l) => normalize(l, key)).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

interface Insight {
  metric: Metric;
  current: number;
  previous: number | null;
  delta: number | null;
}

function buildInsights(history: DayLog[]): {
  insights: Insight[];
  focus: { title: string; body: string; tag: string };
  loggedThisWeek: number;
} {
  const { thisWeek, lastWeek } = splitWeeks(history);
  const insights: Insight[] = (["mood", "confidence"] as Metric[]).map((m) => {
    const cur = avg(thisWeek, m);
    const prev = avg(lastWeek, m);
    return {
      metric: m,
      current: cur ?? 0,
      previous: prev,
      delta: cur != null && prev != null ? cur - prev : null,
    };
  });

  // Determine focus: biggest negative change wins, else lowest current, else consistency
  const mood = insights[0];
  const conf = insights[1];

  let focus = {
    tag: "Build the habit",
    title: "Stack 3 check-ins this week",
    body: "Consistency beats intensity. Log mood + confidence on 3 days to unlock a clear trend.",
  };

  const loggedThisWeek = thisWeek.length;

  if (loggedThisWeek >= 2) {
    const drops = insights.filter((i) => i.delta != null && i.delta < -5);
    if (drops.length) {
      const worst = drops.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0];
      if (worst.metric === "confidence") {
        focus = {
          tag: "Confidence rep",
          title: "Run a 2-minute highlight reel",
          body: "Before your next session, replay 3 plays where you felt unstoppable. Confidence is a memory you train.",
        };
      } else {
        focus = {
          tag: "Mood reset",
          title: "Protect your pre-game energy",
          body: "Mood is dipping. Add a 5-min walk + music ritual before training to reset your nervous system.",
        };
      }
    } else if (conf.current < 55) {
      focus = {
        tag: "Confidence rep",
        title: "Set one tiny win today",
        body: "Pick a single skill rep you know you can win. Stack the proof — confidence follows evidence.",
      };
    } else if (mood.current < 55) {
      focus = {
        tag: "Mood lift",
        title: "Name 3 wins out loud",
        body: "Speak 3 things that went right today. Athletes who narrate wins recover faster mentally.",
      };
    } else {
      const top = insights
        .filter((i) => i.delta != null)
        .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
      focus = {
        tag: "Stay locked in",
        title: top?.metric === "mood" ? "Bottle this mood" : "Press your confidence edge",
        body: "You're trending up. Write down what's working this week so you can repeat it next week.",
      };
    }
  }

  return { insights, focus, loggedThisWeek };
}

export function InsightsCard({ history }: { history: DayLog[] }) {
  const { insights, focus, loggedThisWeek } = useMemo(() => buildInsights(history), [history]);

  return (
    <div className="glass rounded-3xl p-6 shadow-card relative overflow-hidden">
      <div
        className="absolute -top-20 -right-16 size-56 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-gold)" }}
      />
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-gold" />
          <h2 className="text-lg font-display font-semibold">Weekly Coaching Insights</h2>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {loggedThisWeek} day{loggedThisWeek === 1 ? "" : "s"} this week
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-5 relative">
        {insights.map((i) => (
          <DeltaTile key={i.metric} insight={i} />
        ))}
      </div>

      <div className="rounded-2xl p-4 relative border border-border/60 bg-background/40">
        <div className="flex items-center gap-2 mb-1.5">
          <Target className="size-3.5 text-gold" />
          <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">
            {focus.tag}
          </span>
        </div>
        <h3 className="font-display font-semibold text-base mb-1">{focus.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{focus.body}</p>
      </div>
    </div>
  );
}

function DeltaTile({ insight }: { insight: Insight }) {
  const { metric, current, delta } = insight;
  const label = metric === "mood" ? "Mood" : "Confidence";
  const up = (delta ?? 0) >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const deltaText =
    delta == null
      ? "No prior week"
      : `${up ? "+" : ""}${Math.round(delta)} vs last week`;
  const deltaColor =
    delta == null
      ? "text-muted-foreground"
      : up
        ? "text-emerald-400"
        : "text-pink";

  return (
    <div className="rounded-2xl border border-border bg-background/30 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-3.5 ${deltaColor}`} />
      </div>
      <div className="text-2xl font-display font-bold tabular-nums">
        {Math.round(current)}
        <span className="text-xs text-muted-foreground ml-0.5">/100</span>
      </div>
      <div className={`text-[11px] mt-0.5 ${deltaColor}`}>{deltaText}</div>
    </div>
  );
}
