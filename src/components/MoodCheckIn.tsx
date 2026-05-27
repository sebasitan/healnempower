import { Heart, Smile, Meh, Frown, Zap } from "lucide-react";

const MOODS = [
  { v: 1, label: "Drained", Icon: Frown, color: "oklch(0.7 0.16 30)" },
  { v: 2, label: "Off", Icon: Meh, color: "oklch(0.75 0.14 60)" },
  { v: 3, label: "Steady", Icon: Smile, color: "oklch(0.78 0.14 110)" },
  { v: 4, label: "Sharp", Icon: Zap, color: "oklch(0.78 0.18 320)" },
  { v: 5, label: "Locked-in", Icon: Heart, color: "oklch(0.75 0.2 350)" },
];

export function MoodCheckIn({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="glass rounded-3xl p-6 shadow-card">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-lg font-display font-semibold">How's your mind today?</h2>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">+10 pts</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {MOODS.map(({ v, label, Icon, color }) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`group flex flex-col items-center gap-2 rounded-2xl p-3 sm:p-4 border transition-all ${
                active
                  ? "border-primary bg-primary/15 shadow-glow scale-[1.03]"
                  : "border-border hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span
                className="size-9 sm:size-11 rounded-xl grid place-items-center transition-transform group-hover:scale-110"
                style={{ background: `${color} / 0.18`, color }}
              >
                <Icon className="size-5" style={{ color }} />
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
