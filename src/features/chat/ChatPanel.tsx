"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  from: "me" | "them";
  text: string;
  time: string;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  peerName?: string;
}

const seedMessages: ChatMessage[] = [
  { id: 1, from: "them", text: "שלום! כאן מנהל הנכסים של ALTMAN Group. איך אפשר לעזור?", time: "09:14" },
  { id: 2, from: "me", text: "היי, רציתי לוודא שהתשלום הבא נקלט.", time: "09:16" },
  { id: 3, from: "them", text: "בוודאי, התשלום נקלט במערכת. נעדכן אותך לפני מועד החיוב הבא.", time: "09:17" },
];

export function ChatPanel({
  open,
  onClose,
  title = "צ׳אט עם מנהל",
  peerName = "מנהל הנכסים",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [draft, setDraft] = useState("");

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const mine: ChatMessage = { id: Date.now(), from: "me", text: draft.trim(), time };
    setMessages((m) => [...m, mine]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: "them",
          text: "תודה על ההודעה! נחזור אליך בהקדם.",
          time,
        },
      ]);
    }, 700);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={peerName}>
      <div className="flex h-80 flex-col">
        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto pe-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.from === "me" ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                  m.from === "me"
                    ? "bg-navy text-white"
                    : "bg-surface-muted text-text",
                )}
              >
                <p>{m.text}</p>
                <span
                  className={cn(
                    "mt-1 block text-[0.65rem]",
                    m.from === "me" ? "text-white/60" : "text-text-muted",
                  )}
                >
                  {m.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={send} className="mt-3 flex items-center gap-2">
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
    </Modal>
  );
}
