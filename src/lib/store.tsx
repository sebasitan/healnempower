// Supabase-backed mindset store. Persists per-athlete data across devices.
// Falls back to localStorage cache for instant paint on revisits.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface JournalEntry {
  id: string;
  date: string;
  items: string[];
}

export interface Reflection {
  weekOf: string;
  wins: string;
  challenges: string;
  focus: string;
}

export interface DayLog {
  date: string;
  mood: number | null;
  confidence: number | null;
}

export interface MindsetState {
  mood: number | null;
  confidence: number;
  journal: JournalEntry[];
  reflections: Reflection[];
  streak: number;
  points: number;
  lastCheckIn: string | null;
  history: DayLog[];
}

const initial: MindsetState = {
  mood: null,
  confidence: 70,
  journal: [],
  reflections: [],
  streak: 0,
  points: 0,
  lastCheckIn: null,
  history: [],
};

const CACHE_KEY = "mindreps:cache:v1";
const TAGMANGO_MARKER_KEY = "mindreps:tagmango-identity:v1";
const TAGMANGO_EMAIL_KEYS = ["email", "user_email", "member_email", "customer_email"];
const TAGMANGO_ID_KEYS = [
  "tagmango_identity",
  "tagmango_id",
  "tagmango_user_id",
  "tagmango_client_id",
  "client_id",
  "clientId",
  "member_id",
  "memberId",
  "user_id",
  "userId",
  "customer_id",
  "customerId",
  "id",
];

function firstQueryValue(params: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return "";
}

export function getTagmangoLaunchContext() {
  if (typeof window === "undefined") return { email: "", identity: "", authSearch: "" };
  const params = new URLSearchParams(window.location.search);
  const email = firstQueryValue(params, TAGMANGO_EMAIL_KEYS).toLowerCase();
  const identity = firstQueryValue(params, TAGMANGO_ID_KEYS) || email;
  const authParams = new URLSearchParams();
  if (email) authParams.set("email", email);
  if (identity) authParams.set("tagmango_identity", identity);
  if (identity) authParams.set("force_login", "1");
  return { email, identity, authSearch: authParams.toString() };
}

function storedTagmangoIdentity(userId: string) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${TAGMANGO_MARKER_KEY}:${userId}`);
}

export function rememberTagmangoLogin(userId: string) {
  if (typeof window === "undefined") return;
  const { identity } = getTagmangoLaunchContext();
  if (!identity) return;
  localStorage.setItem(`${TAGMANGO_MARKER_KEY}:${userId}`, identity);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

function loadCache(userId: string): MindsetState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as MindsetState) : null;
  } catch {
    return null;
  }
}
function saveCache(userId: string, s: MindsetState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CACHE_KEY}:${userId}`, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface MindsetActions {
  setMood: (v: number) => Promise<void>;
  setConfidence: (v: number) => Promise<void>;
  saveJournal: (entry: JournalEntry) => Promise<void>;
  saveReflection: (r: Reflection) => Promise<void>;
}

interface Ctx {
  state: MindsetState;
  hydrated: boolean;
  authLoading: boolean;
  isAuthed: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  actions: MindsetActions;
}

const MindsetContext = createContext<Ctx | null>(null);

export function MindsetProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [state, setState] = useState<MindsetState>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Auth session listener (set up before getSession per Supabase guidance)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setAuthLoading(false);
    });

    // If launched from Tagmango with an athlete identity/client id, never let a
    // previous browser session silently open the dashboard for a different client.
    (async () => {
      const { data } = await supabase.auth.getSession();
      let nextSession = data.session;
      if (typeof window !== "undefined") {
        const { email: urlEmail, identity, authSearch } = getTagmangoLaunchContext();
        const sessionEmail = (nextSession?.user.email || "").trim().toLowerCase();
        const sessionTagmangoIdentity = nextSession
          ? storedTagmangoIdentity(nextSession.user.id)
          : null;
        const mustAskLogin =
          !!identity &&
          (!!nextSession || !window.location.pathname.startsWith("/auth")) &&
          (!nextSession || sessionTagmangoIdentity !== identity || (!!urlEmail && sessionEmail !== urlEmail));

        if (mustAskLogin) {
          await supabase.auth.signOut();
          nextSession = null;
          if (!window.location.pathname.startsWith("/auth")) {
            window.location.replace(`/auth${authSearch ? `?${authSearch}` : ""}`);
            return;
          }
        }
      }
      setSession(nextSession);
      setAuthLoading(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? null;

  // Load athlete data when signed in
  useEffect(() => {
    if (!userId) {
      setState(initial);
      setHydrated(true);
      setIsAdmin(false);
      return;
    }

    // Instant paint from cache
    const cached = loadCache(userId);
    if (cached) {
      const today = todayISO();
      if (cached.lastCheckIn && cached.lastCheckIn !== today) cached.mood = null;
      setState(cached);
      setHydrated(true);
    } else {
      setHydrated(false);
    }

    let cancelled = false;
    (async () => {
      const [statsRes, journalRes, reflectionsRes, historyRes, rolesRes] =
        await Promise.all([
          supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
          supabase
            .from("journal_entries")
            .select("*")
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(60),
          supabase
            .from("reflections")
            .select("*")
            .eq("user_id", userId)
            .order("week_of", { ascending: false })
            .limit(26),
          supabase
            .from("day_logs")
            .select("*")
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(60),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);

      if (cancelled) return;

      const stats = statsRes.data;
      const today = todayISO();
      const merged: MindsetState = {
        mood:
          stats?.last_check_in === today ? stats?.current_mood ?? null : null,
        confidence: stats?.current_confidence ?? 70,
        streak: stats?.streak ?? 0,
        points: stats?.points ?? 0,
        lastCheckIn: stats?.last_check_in ?? null,
        journal: (journalRes.data ?? []).map((j) => ({
          id: j.id,
          date: j.date,
          items: j.items ?? [],
        })),
        reflections: (reflectionsRes.data ?? []).map((r) => ({
          weekOf: r.week_of,
          wins: r.wins,
          challenges: r.challenges,
          focus: r.focus,
        })),
        history: (historyRes.data ?? []).map((h) => ({
          date: h.date,
          mood: h.mood,
          confidence: h.confidence,
        })),
      };

      setState(merged);
      saveCache(userId, merged);
      setHydrated(true);
      setIsAdmin(!!rolesRes.data?.some((r) => r.role === "admin"));
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist cache on every state change
  useEffect(() => {
    if (hydrated && userId) saveCache(userId, state);
  }, [state, hydrated, userId]);

  const upsertDayLog = useCallback(
    async (uid: string, patch: { mood?: number | null; confidence?: number | null }) => {
      const today = todayISO();
      const existing = stateRef.current.history.find((h) => h.date === today);
      const merged: DayLog = {
        date: today,
        mood: patch.mood !== undefined ? patch.mood : existing?.mood ?? null,
        confidence:
          patch.confidence !== undefined ? patch.confidence : existing?.confidence ?? null,
      };
      setState((s) => ({
        ...s,
        history: [merged, ...s.history.filter((h) => h.date !== today)].slice(0, 60),
      }));
      await supabase
        .from("day_logs")
        .upsert(
          { user_id: uid, date: today, mood: merged.mood, confidence: merged.confidence },
          { onConflict: "user_id,date" },
        );
    },
    [],
  );

  const checkIn = useCallback(
    async (uid: string, extraPoints = 0) => {
      const today = todayISO();
      const s = stateRef.current;
      if (s.lastCheckIn === today && extraPoints === 0) return;
      const isNewDay = s.lastCheckIn !== today;
      const newStreak = isNewDay
        ? s.lastCheckIn === yesterdayISO()
          ? s.streak + 1
          : 1
        : s.streak;
      const addPoints = (isNewDay ? 10 + (newStreak >= 7 ? 5 : 0) : 0) + extraPoints;
      const newPoints = s.points + addPoints;
      setState((p) => ({ ...p, streak: newStreak, points: newPoints, lastCheckIn: today }));
      await supabase.from("user_stats").upsert(
        {
          user_id: uid,
          streak: newStreak,
          points: newPoints,
          last_check_in: today,
          current_mood: s.mood,
          current_confidence: s.confidence,
        },
        { onConflict: "user_id" },
      );
    },
    [],
  );

  const actions: MindsetActions = useMemo(
    () => ({
      setMood: async (v) => {
        if (!userId) return;
        setState((s) => ({ ...s, mood: v }));
        await supabase
          .from("user_stats")
          .upsert({ user_id: userId, current_mood: v }, { onConflict: "user_id" });
        await upsertDayLog(userId, { mood: v });
        await checkIn(userId);
      },
      setConfidence: async (v) => {
        if (!userId) return;
        setState((s) => ({ ...s, confidence: v }));
        await supabase
          .from("user_stats")
          .upsert({ user_id: userId, current_confidence: v }, { onConflict: "user_id" });
        await upsertDayLog(userId, { confidence: v });
      },
      saveJournal: async (entry) => {
        if (!userId) return;
        const today = todayISO();
        const isNewToday = !stateRef.current.journal.find((j) => j.date === today);
        setState((s) => ({
          ...s,
          journal: [entry, ...s.journal.filter((j) => j.date !== entry.date)],
        }));
        await supabase
          .from("journal_entries")
          .upsert(
            { user_id: userId, date: entry.date, items: entry.items },
            { onConflict: "user_id,date" },
          );
        await checkIn(userId, isNewToday ? 15 : 0);
      },
      saveReflection: async (r) => {
        if (!userId) return;
        const isNew = !stateRef.current.reflections.find((x) => x.weekOf === r.weekOf);
        setState((s) => ({
          ...s,
          reflections: [r, ...s.reflections.filter((x) => x.weekOf !== r.weekOf)],
          points: s.points + (isNew ? 50 : 0),
        }));
        await supabase
          .from("reflections")
          .upsert(
            {
              user_id: userId,
              week_of: r.weekOf,
              wins: r.wins,
              challenges: r.challenges,
              focus: r.focus,
            },
            { onConflict: "user_id,week_of" },
          );
        if (isNew) {
          await supabase
            .from("user_stats")
            .upsert(
              { user_id: userId, points: stateRef.current.points + 50 },
              { onConflict: "user_id" },
            );
        }
      },
    }),
    [userId, upsertDayLog, checkIn],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: Ctx = {
    state,
    hydrated,
    authLoading,
    isAuthed: !!userId,
    userId,
    email,
    isAdmin,
    signOut,
    actions,
  };

  return <MindsetContext.Provider value={value}>{children}</MindsetContext.Provider>;
}

export function useMindset() {
  const ctx = useContext(MindsetContext);
  if (!ctx) throw new Error("useMindset must be used within MindsetProvider");
  return ctx;
}
