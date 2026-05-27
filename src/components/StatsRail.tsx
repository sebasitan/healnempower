import { Flame, Trophy, Target } from "lucide-react";

export function StatsRail({
  streak,
  points,
  mood,
}: {
  streak: number;
  points: number;
  mood: number | null;
}) {
  const nextMilestone = streak < 7 ? 7 : streak < 30 ? 30 : streak < 100 ? 100 : streak + 50;
  const pct = Math.min(100, Math.round((streak / nextMilestone) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Stat
        Icon={Flame}
        accent="var(--pink)"
        label="Streak"
        value={`${streak} days`}
        sub={`${nextMilestone - streak} to ${nextMilestone}-day badge`}
        progress={pct}
      />
      <Stat
        Icon={Trophy}
        accent="var(--gold)"
        label="Mind Points"
        value={points.toLocaleString()}
        sub={tier(points)}
        gold
      />
      <Stat
        Icon={Target}
        accent="var(--purple)"
        label="Today's Mood"
        value={mood ? ["—", "Drained", "Off", "Steady", "Sharp", "Locked-in"][mood] : "Not set"}
        sub={mood ? "Logged for today" : "Check in above"}
      />
    </div>
  );
}

function tier(p: number) {
  if (p < 100) return "Rookie · Tier I";
  if (p < 300) return "Starter · Tier II";
  if (p < 700) return "Captain · Tier III";
  if (p < 1500) return "Elite · Tier IV";
  return "Legend · Tier V";
}

function Stat({
  Icon,
  label,
  value,
  sub,
  accent,
  progress,
  gold,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: string;
  progress?: number;
  gold?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-5 shadow-card ${gold ? "ring-gold" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="size-8 rounded-lg grid place-items-center"
          style={{ background: `${accent}`, opacity: 0.95 }}
        >
          <Icon className="size-4 text-background" />
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className={`text-3xl font-display font-bold tabular-nums ${gold ? "text-gradient-gold" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-background/60 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
