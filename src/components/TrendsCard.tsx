import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import type { DayLog } from "@/lib/store";

function buildSeries(history: DayLog[], days: number) {
  const map = new Map(history.map((h) => [h.date, h]));
  const out: { date: string; label: string; mood: number | null; confidence: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const entry = map.get(iso);
    out.push({
      date: iso,
      label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      // scale mood (1-5) → 0-100 for shared axis
      mood: entry?.mood != null ? ((entry.mood - 1) / 4) * 100 : null,
      confidence: entry?.confidence ?? null,
    });
  }
  return out;
}

export function TrendsCard({ history }: { history: DayLog[] }) {
  const [range, setRange] = useState<7 | 14>(7);
  const data = useMemo(() => buildSeries(history, range), [history, range]);

  const logged = data.filter((d) => d.mood != null || d.confidence != null).length;

  const avg = (key: "mood" | "confidence") => {
    const vals = data.map((d) => d[key]).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };
  const moodAvg = avg("mood");
  const confAvg = avg("confidence");

  return (
    <div className="glass rounded-3xl p-6 shadow-card relative overflow-hidden">
      <div
        className="absolute -bottom-24 -left-16 size-64 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <LineChartIcon className="size-4 text-pink" />
          <h2 className="text-lg font-display font-semibold">Weekly Progress</h2>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full glass text-xs">
          {[7, 14].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as 7 | 14)}
              className={`px-3 py-1 rounded-full transition-all ${
                range === r
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5 relative">
        <Stat label="Days logged" value={`${logged}/${range}`} />
        <Stat label="Avg mood" value={moodAvg != null ? `${moodAvg}` : "—"} suffix="/100" />
        <Stat label="Avg confidence" value={confAvg != null ? `${confAvg}` : "—"} suffix="/100" />
      </div>

      <div className="h-56 -mx-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="moodStroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="oklch(0.85 0.16 90)" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 70)" />
              </linearGradient>
              <linearGradient id="confStroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="oklch(0.75 0.2 350)" />
                <stop offset="100%" stopColor="oklch(0.55 0.22 305)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="oklch(0.75 0.04 310)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={range === 14 ? 1 : 0}
            />
            <YAxis
              domain={[0, 100]}
              stroke="oklch(0.75 0.04 310)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(0.22 0.06 295)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "oklch(0.98 0.01 320)" }}
              formatter={(v: number, name: string) => [Math.round(v), name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="mood"
              name="Mood"
              stroke="url(#moodStroke)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "oklch(0.85 0.16 90)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="confidence"
              name="Confidence"
              stroke="url(#confStroke)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "oklch(0.75 0.2 350)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl font-display font-bold tabular-nums">
        {value}
        {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}
