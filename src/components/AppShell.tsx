import { Link, useLocation } from "@tanstack/react-router";
import { Flame, Sparkles, Trophy, LogOut, Users } from "lucide-react";
import { useMindset } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, hydrated, isAuthed, isAdmin, signOut, email } = useMindset();
  const loc = useLocation();

  const links = [
    { to: "/", label: "Today" },
    { to: "/reflect", label: "Weekly Reflection" },
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold tracking-tight">MindReps</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Athlete Mindset</div>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 p-1 rounded-full glass">
            {links.map((l) => {
              const active = loc.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-4 py-1.5 text-sm rounded-full transition-all ${
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/coach"
                className={`px-4 py-1.5 text-sm rounded-full transition-all flex items-center gap-1.5 ${
                  loc.pathname === "/coach"
                    ? "bg-gradient-gold text-gold-foreground shadow-gold"
                    : "text-gold hover:opacity-80"
                }`}
              >
                <Users className="size-3.5" />
                Coach
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
              <Flame className="size-4 text-pink" />
              <span className="text-sm font-semibold tabular-nums">
                {hydrated ? state.streak : 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass ring-gold">
              <Trophy className="size-4 text-gold" />
              <span className="text-sm font-semibold tabular-nums text-gold">
                {hydrated ? state.points : 0}
              </span>
            </div>
            {isAuthed && (
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="rounded-full"
                title={email ?? "Sign out"}
              >
                <LogOut className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>

      <footer className="max-w-6xl mx-auto px-5 py-10 text-center text-xs text-muted-foreground">
        Train the mind. Win the moment.
      </footer>
    </div>
  );
}
