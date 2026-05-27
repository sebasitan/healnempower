import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISO, type JournalEntry } from "@/lib/store";

export function GratitudeCard({
  journal,
  onSave,
}: {
  journal: JournalEntry[];
  onSave: (entry: JournalEntry) => void;
}) {
  const today = todayISO();
  const existing = journal.find((j) => j.date === today);
  const [items, setItems] = useState<string[]>(existing?.items ?? ["", "", ""]);

  const setAt = (i: number, v: string) => setItems((p) => p.map((x, k) => (k === i ? v : x)));

  const save = () => {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (!cleaned.length) return;
    onSave({ id: today, date: today, items: cleaned });
  };

  const saved = !!existing && existing.items.join("|") === items.filter(Boolean).join("|");

  return (
    <div className="glass rounded-3xl p-6 shadow-card">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-gold" /> Gratitude
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Three things fueling you today</p>
        </div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">+15 pts</span>
      </div>

      <div className="space-y-2.5">
        {items.map((v, i) => (
          <div key={i} className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-gradient-primary text-primary-foreground text-[11px] font-bold grid place-items-center">
              {i + 1}
            </span>
            <Input
              value={v}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={
                ["My coach pushing me hard…", "A teammate who has my back…", "My body feeling strong…"][i]
              }
              className="pl-12 h-11 bg-background/40 border-border focus-visible:ring-primary"
            />
            {v && (
              <button
                onClick={() => setAt(i, "")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-5">
        <p className="text-xs text-muted-foreground">
          {existing ? "Saved today — keep adding" : "Lock in your three"}
        </p>
        <Button
          onClick={save}
          className="bg-gradient-primary hover:opacity-95 shadow-glow rounded-full"
        >
          <Plus className="size-4" />
          {saved ? "Saved" : "Save Entry"}
        </Button>
      </div>
    </div>
  );
}
