import { Slider } from "@/components/ui/slider";
import { Shield } from "lucide-react";

export function ConfidenceCard({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const label =
    value < 25 ? "Building" : value < 50 ? "Warming up" : value < 75 ? "Dialed in" : "Unshakable";

  return (
    <div className="glass rounded-3xl p-6 shadow-card relative overflow-hidden">
      <div
        className="absolute -top-20 -right-20 size-56 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div className="flex items-center justify-between mb-2 relative">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-pink" />
          <h2 className="text-lg font-display font-semibold">Confidence</h2>
        </div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Today</span>
      </div>

      <div className="relative mt-6 mb-3">
        <div className="flex items-end gap-3">
          <div className="text-6xl font-display font-bold text-gradient-primary tabular-nums leading-none">
            {value}
          </div>
          <div className="text-sm text-muted-foreground pb-2">/ 100 · {label}</div>
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        className="mt-4"
      />
      <div className="flex justify-between mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Low</span>
        <span>Peak</span>
      </div>
    </div>
  );
}
