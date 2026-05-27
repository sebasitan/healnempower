import { Quote } from "lucide-react";
import { affirmationOfDay } from "@/lib/affirmations";

export function AffirmationCard() {
  const text = affirmationOfDay();
  return (
    <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 bg-gradient-hero shadow-card">
      <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
           style={{ background: "radial-gradient(circle at 70% 30%, oklch(0.95 0.12 90 / 0.6), transparent 55%)" }} />
      <div className="absolute -bottom-10 -left-10 size-48 rounded-full bg-gold/30 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold">
            Daily Affirmation
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
        </div>
        <Quote className="size-8 text-gold/80 mb-3" />
        <p className="text-2xl sm:text-3xl font-display font-semibold leading-tight text-primary-foreground">
          {text}
        </p>
        <p className="mt-5 text-sm text-primary-foreground/70">
          Read it. Breathe it. Walk into the day with it.
        </p>
      </div>
    </div>
  );
}
