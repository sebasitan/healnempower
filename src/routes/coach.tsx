import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMindset } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Download, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Coach Dashboard — MindReps" },
      { name: "description", content: "View all athletes' progress and reflections." },
    ],
  }),
  component: CoachPage,
});

interface AthleteRow {
  user_id: string;
  display_name: string | null;
  sport: string | null;
  streak: number;
  points: number;
  last_check_in: string | null;
  current_mood: number | null;
  current_confidence: number;
}

interface AthleteDetail {
  history: { date: string; mood: number | null; confidence: number | null }[];
  journal: { date: string; items: string[] }[];
  reflections: { week_of: string; wins: string; challenges: string; focus: string }[];
}

function CoachPage() {
  const { isAuthed, isAdmin, hydrated, authLoading } = useMindset();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AthleteRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AthleteDetail | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthed) {
      navigate({ to: "/auth" });
      return;
    }
  }, [authLoading, isAuthed, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [statsRes, profilesRes] = await Promise.all([
        supabase.from("user_stats").select("*"),
        supabase.from("profiles").select("id, display_name, sport"),
      ]);
      const profiles = new Map(
        (profilesRes.data ?? []).map((p) => [p.id, p]),
      );
      const merged: AthleteRow[] = (statsRes.data ?? []).map((s) => {
        const p = profiles.get(s.user_id);
        return {
          user_id: s.user_id,
          display_name: p?.display_name ?? null,
          sport: p?.sport ?? null,
          streak: s.streak,
          points: s.points,
          last_check_in: s.last_check_in,
          current_mood: s.current_mood,
          current_confidence: s.current_confidence,
        };
      });
      merged.sort((a, b) => b.points - a.points);
      setRows(merged);
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    (async () => {
      const [hRes, jRes, rRes] = await Promise.all([
        supabase
          .from("day_logs")
          .select("date, mood, confidence")
          .eq("user_id", selected)
          .order("date", { ascending: false })
          .limit(60),
        supabase
          .from("journal_entries")
          .select("date, items")
          .eq("user_id", selected)
          .order("date", { ascending: false })
          .limit(30),
        supabase
          .from("reflections")
          .select("week_of, wins, challenges, focus")
          .eq("user_id", selected)
          .order("week_of", { ascending: false })
          .limit(12),
      ]);
      setDetail({
        history: hRes.data ?? [],
        journal: jRes.data ?? [],
        reflections: rRes.data ?? [],
      });
    })();
  }, [selected]);

  const selectedRow = useMemo(
    () => rows?.find((r) => r.user_id === selected) ?? null,
    [rows, selected],
  );

  if (!hydrated) {
    return (
      <AppShell>
        <div className="h-[60vh] grid place-items-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="text-2xl font-display font-bold mb-2">Coach access only</h1>
          <p className="text-sm text-muted-foreground">
            This area is reserved for Coach Jayanthi. If you're an athlete, head back to your dashboard.
          </p>
        </div>
      </AppShell>
    );
  }

  const exportCsv = () => {
    if (!rows) return;
    const header = "Athlete,Sport,Streak,Points,Last Check-in,Current Mood,Current Confidence\n";
    const body = rows
      .map(
        (r) =>
          `"${r.display_name ?? ""}","${r.sport ?? ""}",${r.streak},${r.points},${r.last_check_in ?? ""},${r.current_mood ?? ""},${r.current_confidence}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindreps-athletes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <section className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-pink mb-2">Coach Dashboard</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">
            Your <span className="text-gradient-primary">Athletes</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {rows ? `${rows.length} athlete${rows.length === 1 ? "" : "s"} training` : "Loading…"}
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="rounded-full">
          <Download className="size-4" />
          Export CSV
        </Button>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6">
        <div className="glass rounded-3xl p-3 max-h-[70vh] overflow-y-auto">
          {rows?.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">
              No athletes have signed up yet.
            </div>
          )}
          {rows?.map((r) => (
            <button
              key={r.user_id}
              onClick={() => setSelected(r.user_id)}
              className={`w-full text-left rounded-2xl p-4 transition-all flex items-center gap-3 ${
                selected === r.user_id ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted/40"
              }`}
            >
              <div className="size-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-semibold">
                {(r.display_name ?? "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.display_name ?? "Unnamed athlete"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.sport ?? "Athlete"} · last active {r.last_check_in ?? "never"}
                </div>
              </div>
              <div className="flex flex-col items-end text-xs">
                <div className="flex items-center gap-1 text-pink">
                  <Flame className="size-3" />
                  {r.streak}
                </div>
                <div className="flex items-center gap-1 text-gold">
                  <Trophy className="size-3" />
                  {r.points}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 min-h-[60vh]">
          {!selected && (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Select an athlete to see their cumulative report.
            </div>
          )}
          {selected && selectedRow && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold">{selectedRow.display_name ?? "Athlete"}</h2>
                <p className="text-xs text-muted-foreground">
                  Streak {selectedRow.streak} · {selectedRow.points} mind points · current mood{" "}
                  {selectedRow.current_mood ?? "—"} / confidence {selectedRow.current_confidence}
                </p>
              </div>

              {detail && (
                <>
                  <Section title={`Mood & Confidence (last ${detail.history.length} days)`}>
                    {detail.history.length === 0 ? (
                      <Empty text="No daily check-ins yet." />
                    ) : (
                      <div className="space-y-1 text-sm">
                        {detail.history.slice(0, 14).map((h) => (
                          <div key={h.date} className="flex justify-between border-b border-border/40 py-1">
                            <span className="text-muted-foreground">{h.date}</span>
                            <span>
                              mood <b>{h.mood ?? "—"}</b> · conf <b>{h.confidence ?? "—"}</b>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section title="Recent Gratitude Journal">
                    {detail.journal.length === 0 ? (
                      <Empty text="No journal entries yet." />
                    ) : (
                      <ul className="space-y-3 text-sm">
                        {detail.journal.slice(0, 5).map((j) => (
                          <li key={j.date}>
                            <div className="text-xs text-muted-foreground mb-1">{j.date}</div>
                            <ul className="list-disc pl-5 space-y-0.5">
                              {j.items.map((it, i) => (
                                <li key={i}>{it}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <Section title="Weekly Reflections">
                    {detail.reflections.length === 0 ? (
                      <Empty text="No reflections yet." />
                    ) : (
                      <ul className="space-y-3 text-sm">
                        {detail.reflections.map((r) => (
                          <li key={r.week_of} className="rounded-xl bg-background/30 p-3">
                            <div className="text-xs uppercase tracking-widest text-pink mb-1">
                              Week of {r.week_of}
                            </div>
                            {r.focus && (
                              <div>
                                <b className="text-foreground">Focus:</b> {r.focus}
                              </div>
                            )}
                            {r.wins && (
                              <div className="text-muted-foreground mt-1">
                                <b className="text-foreground">Wins:</b> {r.wins}
                              </div>
                            )}
                            {r.challenges && (
                              <div className="text-muted-foreground mt-1">
                                <b className="text-foreground">Challenges:</b> {r.challenges}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground italic">{text}</div>;
}
