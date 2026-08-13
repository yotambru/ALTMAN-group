"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { useData, type Actor } from "@/lib/store";
import { cn, formatChatListTime } from "@/lib/utils";

export interface ChatPeer {
  id: string;
  name: string;
  subtitle?: string;
}

interface ChatPanelProps {
  open?: boolean;
  onClose?: () => void;
  /** Render chat in-place (dashboard panel) instead of a modal sheet. */
  inline?: boolean;
  self: Actor;
  peers: ChatPeer[];
  title?: string;
  initialPeerId?: string | null;
}

/** Persisted, thread-based chat. Single peer opens directly; many show a list. */
export function ChatPanel({
  open = false,
  onClose,
  inline = false,
  self,
  peers,
  title = "צ׳אט",
  initialPeerId = null,
}: ChatPanelProps) {
  const { chatThreads, chatMessages, ensureThread, sendMessage, users } = useData();
  const [activePeerId, setActivePeerId] = useState<string | null>(
    () => initialPeerId ?? (peers.length === 1 ? peers[0].id : null),
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const activePeer = peers.find((p) => p.id === activePeerId) ?? null;

  const threadId = useMemo(() => {
    if (!activePeer) return null;
    return (
      chatThreads.find(
        (t) => t.participantIds.includes(self.id) && t.participantIds.includes(activePeer.id),
      )?.id ?? null
    );
  }, [activePeer, chatThreads, self.id]);

  const messages = useMemo(
    () => (threadId ? chatMessages.filter((m) => m.threadId === threadId) : []),
    [threadId, chatMessages],
  );

  const showList = peers.length > 1 && !activePeer;

  const filteredPeers = useMemo(() => {
    const lastAt = (peerId: string) => {
      const t = chatThreads.find(
        (th) => th.participantIds.includes(self.id) && th.participantIds.includes(peerId),
      );
      if (!t) return 0;
      const last = chatMessages.filter((m) => m.threadId === t.id).slice(-1)[0];
      return last ? new Date(last.createdAt).getTime() : 0;
    };

    const q = query.trim().toLowerCase();
    const list = q
      ? peers.filter((p) => {
          const t = chatThreads.find(
            (th) => th.participantIds.includes(self.id) && th.participantIds.includes(p.id),
          );
          const last = t
            ? chatMessages.filter((m) => m.threadId === t.id).slice(-1)[0]
            : undefined;
          const haystack = [p.name, p.subtitle, last?.text].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(q);
        })
      : [...peers];

    return list.sort((a, b) => lastAt(b.id) - lastAt(a.id));
  }, [peers, query, chatThreads, chatMessages, self.id]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (showList) return;
    // Wait for layout so scrollHeight is correct (esp. inline panel mount).
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToLatest);
    });
    return () => cancelAnimationFrame(id);
  }, [messages.length, activePeerId, open, inline, threadId, showList]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activePeer) return;
    const id = ensureThread(self.id, activePeer.id, `${self.name} · ${activePeer.name}`);
    sendMessage(id, self, draft.trim());
    setDraft("");
  };

  const handleClose = () => {
    onClose?.();
    if (peers.length > 1) setTimeout(() => setActivePeerId(null), 200);
  };

  const body = showList ? (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">חיפוש שיחה</span>
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          strokeWidth={1.8}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם או הודעה…"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pe-3 ps-9 text-sm text-text placeholder:text-text-muted/70 focus:border-orange focus:outline-none"
        />
      </label>
      <div className={inline ? "space-y-2" : "no-scrollbar max-h-[60vh] space-y-2 overflow-y-auto"}>
        {filteredPeers.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">לא נמצאו שיחות.</p>
        ) : (
          filteredPeers.map((p) => {
            const t = chatThreads.find(
              (th) => th.participantIds.includes(self.id) && th.participantIds.includes(p.id),
            );
            const last = t
              ? chatMessages.filter((m) => m.threadId === t.id).slice(-1)[0]
              : undefined;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePeerId(p.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-start transition-colors hover:bg-surface-muted"
              >
                <UserAvatar
                  name={p.name}
                  avatarUrl={users.find((u) => u.id === p.id)?.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-bold text-navy">{p.name}</p>
                    {last?.createdAt && (
                      <span className="shrink-0 text-[0.7rem] tabular-nums text-text-muted">
                        {formatChatListTime(last.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-text-muted">
                    {last?.text ?? p.subtitle ?? "התחל שיחה"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : (
    <div className={cn("flex flex-col", inline ? "h-[min(28rem,55dvh)]" : "h-80")}>
      {peers.length > 1 && (
        <button
          type="button"
          onClick={() => setActivePeerId(null)}
          className="mb-2 flex items-center gap-1 self-end text-xs font-semibold text-orange"
        >
          <ChevronRight className="h-4 w-4" />
          לכל השיחות
        </button>
      )}
      {inline && activePeer && (
        <p className="mb-2 shrink-0 text-sm font-bold text-navy">
          {activePeer.name}
          {activePeer.subtitle ? (
            <span className="ms-2 font-medium text-text-muted">{activePeer.subtitle}</span>
          ) : null}
        </p>
      )}
      <div
        ref={scrollRef}
        className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pe-1"
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-text-muted">
            אין הודעות עדיין. שלח/י את ההודעה הראשונה.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.fromUserId === self.id;
          const time = new Date(m.createdAt).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-[1.15rem] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  mine ? "rounded-se-md bg-navy text-white" : "rounded-ss-md bg-surface-muted text-text",
                )}
              >
                <p>{m.text}</p>
                <span
                  className={cn(
                    "mt-1 block text-[0.65rem]",
                    mine ? "text-white/60" : "text-text-muted",
                  )}
                >
                  {time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="mt-3 flex shrink-0 items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="כתוב הודעה..."
          className="flex-1 rounded-full border bg-surface px-4 py-2.5 text-sm focus:border-orange focus:outline-none"
        />
        <button
          type="submit"
          aria-label="שליחה"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange text-white transition-colors hover:bg-orange-dark"
        >
          <Send className="h-5 w-5 -scale-x-100" />
        </button>
      </form>
    </div>
  );

  if (inline) return <div>{body}</div>;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={activePeer ? activePeer.name : title}
      description={activePeer?.subtitle ?? (showList ? "בחר/י שיחה" : undefined)}
    >
      {body}
    </Modal>
  );
}
