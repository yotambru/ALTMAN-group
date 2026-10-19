"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ImagePlus, Paperclip, Search, Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { chatPreviewText, encodeChatFile, parseChatBody, type ChatFile } from "@/lib/chat-body";
import { unreadCountInThread } from "@/lib/chat-unread";
import { useData, type Actor } from "@/lib/store";
import { uploadBinaryFile, useSignedUrl } from "@/lib/supabase/files";
import { cn, formatChatListTime, formatDateDots } from "@/lib/utils";

export interface ChatPeer {
  id: string;
  name: string;
  subtitle?: string;
}

function displayUrl(raw: string): string {
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

type ChatPart = { kind: "text"; value: string } | { kind: "link"; href: string; label: string };

/** Split a chat message so URLs are links and Hebrew stays readable. */
function chatTextParts(text: string): ChatPart[] {
  const parts: ChatPart[] = [];
  let last = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const href = raw.replace(/[),.!?]+$/u, "");
    if (index > last) parts.push({ kind: "text", value: text.slice(last, index) });
    parts.push({ kind: "link", href, label: displayUrl(href) });
    last = index + href.length;
    if (href.length < raw.length) {
      parts.push({ kind: "text", value: raw.slice(href.length) });
      last = index + raw.length;
    }
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

function ChatAttachment({ file, mine }: { file: ChatFile; mine: boolean }) {
  const href = useSignedUrl(file.url) ?? file.url;
  const image = file.mime.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
  if (image) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="mb-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={file.name} className="max-h-48 w-full rounded-lg object-cover" />
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("mb-1 block underline", mine ? "text-white" : "text-orange")}
    >
      {file.name}
    </a>
  );
}

function GalleryFileLink({ file }: { file: ChatFile }) {
  const href = useSignedUrl(file.url) ?? file.url;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-semibold text-orange">
      {file.name}
    </a>
  );
}

function MessageText({ text, mine }: { text: string; mine: boolean }) {
  const parsed = parseChatBody(text);
  return (
    <div>
      {parsed.file ? <ChatAttachment file={parsed.file} mine={mine} /> : null}
      {parsed.caption ? (
    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {chatTextParts(parsed.caption).map((part, index) =>
        part.kind === "link" ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className={cn(
              "underline decoration-1 underline-offset-2",
              mine ? "text-white" : "text-orange",
            )}
          >
            {part.label}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
      ) : null}
    </div>
  );
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
  const { chatThreads, chatMessages, ensureThread, sendMessage, markThreadRead, users } = useData();
  const [activePeerId, setActivePeerId] = useState<string | null>(
    () => initialPeerId ?? (peers.length === 1 ? peers[0].id : null),
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [gallery, setGallery] = useState(false);
  const [fileQuery, setFileQuery] = useState("");
  const [sendingFile, setSendingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const haystack = [p.name, p.subtitle, last ? chatPreviewText(last.text) : ""].filter(Boolean).join(" ").toLowerCase();
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

  useEffect(() => {
    if (showList || !threadId || (!inline && !open)) return;
    const latest = messages.reduce((max, message) => (message.createdAt > max ? message.createdAt : max), "");
    if (!latest) return;
    const seenAt = chatThreads.find((thread) => thread.id === threadId)?.readAt?.[self.id];
    if (seenAt && seenAt >= latest) return;
    const id = requestAnimationFrame(() => markThreadRead(threadId, self.id, latest));
    return () => cancelAnimationFrame(id);
  }, [showList, threadId, inline, open, messages, chatThreads, self.id, markThreadRead]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activePeer) return;
    const id = ensureThread(self.id, activePeer.id, `${self.name} · ${activePeer.name}`);
    sendMessage(id, self, draft.trim());
    setDraft("");
  };

  const attach = async (file: File | undefined) => {
    if (!file || !activePeer || sendingFile) return;
    setSendingFile(true);
    setFileError("");
    try {
      const thread = ensureThread(self.id, activePeer.id, `${self.name} · ${activePeer.name}`);
      const url = await uploadBinaryFile(file, `chat/${thread}/${crypto.randomUUID()}`);
      if (!url) {
        setFileError("לא הצלחנו לשלוח את הקובץ. בדקו את החיבור ונסו שוב.");
        return;
      }
      sendMessage(
        thread,
        self,
        encodeChatFile({ url, name: file.name || "קובץ", mime: file.type || "" }, draft.trim()),
      );
      setDraft("");
    } finally {
      setSendingFile(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    onClose?.();
    if (peers.length > 1) setTimeout(() => setActivePeerId(null), 200);
  };

  const body = showList ? (
    <div className={cn(inline ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3")}>
      <label className="relative block shrink-0">
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
      <div className={cn("space-y-2", inline && "min-h-0 flex-1 overflow-y-auto overscroll-y-contain")}>
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
            const unread = unreadCountInThread(self.id, t, chatMessages);
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
                    {last ? chatPreviewText(last.text) : (p.subtitle ?? "התחל שיחה")}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : (
    <div className={cn("flex flex-col", inline ? "h-full min-h-0" : "h-80")}>
      {peers.length > 1 && (
        <button
          type="button"
          onClick={() => setActivePeerId(null)}
          className="mb-2 flex items-center gap-1 self-start text-xs font-semibold text-orange"
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
        className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pe-1"
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-text-muted">
            אין הודעות עדיין. שלח/י את ההודעה הראשונה.
          </p>
        )}
        {messages.map((m, index) => {
          const mine = m.fromUserId === self.id;
          const time = new Date(m.createdAt).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const day = m.createdAt.slice(0, 10);
          const prevDay = index > 0 ? messages[index - 1].createdAt.slice(0, 10) : "";
          return (
            <div key={m.id}>
              {day !== prevDay && (
                <p className="mb-2 select-none text-center text-[0.7rem] font-semibold text-text-muted">
                  {formatDateDots(m.createdAt)}
                </p>
              )}
            <div className={cn("flex", mine ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-[1.15rem] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  mine ? "rounded-se-md bg-navy text-white" : "rounded-ss-md bg-surface-muted text-text",
                )}
              >
                <MessageText text={m.text} mine={mine} />
                <span
                  className={cn(
                    "mt-1 block select-none text-[0.65rem]",
                    mine ? "text-white/60" : "text-text-muted",
                  )}
                >
                  {time}
                </span>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {gallery && (
        <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          <input
            type="search"
            value={fileQuery}
            onChange={(e) => setFileQuery(e.target.value)}
            placeholder="חיפוש לפי שם קובץ…"
            className="mb-1 w-full rounded-lg border bg-surface px-3 py-1.5 text-xs focus:border-orange focus:outline-none"
          />
          {messages
            .map((message) => ({ message, file: parseChatBody(message.text).file }))
            .filter((row) => row.file && row.file.name.toLowerCase().includes(fileQuery.trim().toLowerCase()))
            .map(({ message, file }) => (file ? <GalleryFileLink key={message.id} file={file} /> : null))}
        </div>
      )}

      <form onSubmit={send} className="mt-3 flex shrink-0 items-center gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void attach(e.target.files?.[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={(e) => void attach(e.target.files?.[0])}
        />
        <button
          type="button"
          aria-label="שליחת תמונה"
          disabled={sendingFile || !activePeer}
          onClick={() => imageInputRef.current?.click()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-navy"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="שליחת קובץ"
          disabled={sendingFile || !activePeer}
          onClick={() => fileInputRef.current?.click()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-navy"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="גלריית קבצים"
          onClick={() => setGallery((openGallery) => !openGallery)}
          className="shrink-0 text-xs font-semibold text-orange"
        >
          קבצים
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="כתוב הודעה..."
          className="min-w-0 flex-1 rounded-full border bg-surface px-4 py-2.5 text-sm focus:border-orange focus:outline-none"
        />
        <button
          type="submit"
          aria-label="שליחה"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange text-white transition-colors hover:bg-orange-dark"
        >
          <Send className="h-5 w-5 -scale-x-100" />
        </button>
      </form>
      {fileError && <p className="mt-1 text-xs font-semibold text-danger">{fileError}</p>}
    </div>
  );

  if (inline) return <div className="flex h-full min-h-0 flex-1 flex-col">{body}</div>;

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
