import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import coachLogo from "@/assets/coach-jayanthi.png";
import { useMindset } from "@/lib/store";

const STORAGE_KEY = "mindreps:coach-chat:v1";

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

const SUGGESTIONS = [
  "I'm nervous about my next game.",
  "I made a mistake and can't shake it off.",
  "How do I stay confident under pressure?",
  "I feel burnt out from training.",
];

export function CoachChat() {
  const { state } = useMindset();
  const [hydrated, setHydrated] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setInitialMessages(loadMessages());
    setHydrated(true);
  }, []);

  // Build context snapshot for the server. Refreshes per render so the AI
  // always sees up-to-date dashboard data when the athlete sends a message.
  const context = {
    mood: state.mood,
    confidence: state.confidence,
    streak: state.streak,
    points: state.points,
    recentJournal: state.journal.slice(0, 3).flatMap((j) => j.items).slice(0, 5),
    recentFocus: state.reflections[0]?.focus ?? "",
  };

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: "coach-jayanthi",
    messages: hydrated ? initialMessages : [],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => {
      toast.error(e.message || "Coach couldn't respond. Try again.");
    },
  });

  // Persist messages to localStorage whenever they change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages, hydrated]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    await sendMessage({ text }, { body: { context } });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const clearChat = () => {
    setMessages([]);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat cleared. Coach is ready when you are.");
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <section className="glass rounded-3xl shadow-card overflow-hidden flex flex-col">
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-gradient-to-r from-pink/10 via-purple/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-background/60 grid place-items-center shadow-glow ring-1 ring-pink/30">
            <img src={coachLogo} alt="" width={36} height={36} className="size-9 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg">Ask Coach Jayanthi Priya</div>
            <div className="text-xs text-muted-foreground">
              Mindset coach · Warm · Nurturing · Always in your corner
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        )}
      </header>

      <Conversation className="h-[460px]">
        <ConversationContent className="px-4 sm:px-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <img
                  src={coachLogo}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  className="size-16 object-contain drop-shadow-[0_0_20px_hsl(var(--pink)/0.45)]"
                />
              }
              title="Hey athlete — I'm here for you."
              description="Share what's on your mind: nerves, slumps, wins, doubts. Nothing's too small."
            >
              <div className="grid sm:grid-cols-2 gap-2 mt-4 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      requestAnimationFrame(() => taRef.current?.focus());
                    }}
                    className="text-left text-sm px-3 py-2 rounded-xl glass hover:bg-background/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
                {m.role === "assistant" && (
                  <div className="size-8 shrink-0 rounded-xl bg-background/60 grid place-items-center ring-1 ring-pink/30 mt-0.5">
                    <img src={coachLogo} alt="" width={28} height={28} className="size-7 object-contain" />
                  </div>
                )}
                {m.role === "user" ? (
                  <MessageContent>
                    {m.parts.map((part, i) =>
                      part.type === "text" ? <span key={i}>{part.text}</span> : null,
                    )}
                  </MessageContent>
                ) : (
                  <MessageContent className="!bg-transparent !px-0 !py-0">
                    {m.parts.map((part, i) =>
                      part.type === "text" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                )}
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <div className="size-8 shrink-0 rounded-xl bg-background/60 grid place-items-center ring-1 ring-pink/30 mt-0.5">
                <img src={coachLogo} alt="" width={28} height={28} className="size-7 object-contain" />
              </div>
              <MessageContent className="!bg-transparent !px-0 !py-0">
                <Shimmer>Coach Jayanthi is thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && (
            <p className="text-xs text-destructive px-2 py-1">
              {error.message || "Couldn't reach Coach. Try again."}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="p-4 sm:p-5 border-t border-border bg-background/40">
        <PromptInput
          onSubmit={(_msg, e) => {
            e?.preventDefault();
            void submit();
          }}
        >

          <PromptInputTextarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell Coach what's on your mind…"
            autoFocus
            disabled={isBusy}
          />
          <PromptInputFooter className="justify-between">
            <span className="text-[11px] text-muted-foreground">
              Coach sees your today's mood & streak — not a substitute for medical care.
            </span>
            <PromptInputSubmit
              size="icon-sm"
              status={isBusy ? "streaming" : undefined}
              disabled={!input.trim() || isBusy}
            >
              <Send className="size-3.5" />
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}
