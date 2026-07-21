"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { storage } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { MaintenanceTicket, TicketPriority } from "@/types";

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  createdById: string;
}

const categories = ["אינסטלציה", "חשמל", "מיזוג אוויר", "מבנה", "מכשירי חשמל", "אחר"];
const priorities: { id: TicketPriority; label: string }[] = [
  { id: "low", label: "נמוכה" },
  { id: "medium", label: "בינונית" },
  { id: "high", label: "דחופה" },
];

export function TicketModal({
  open,
  onClose,
  propertyId,
  createdById,
}: TicketModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setTitle("");
    setCategory(categories[0]);
    setPriority("medium");
    setDescription("");
    setSubmitted(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ticket: MaintenanceTicket = {
      id: generateId("mt"),
      propertyId,
      createdById,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    const existing = storage.getItem<MaintenanceTicket[]>(
      storage.keys.tickets,
      [],
    );
    storage.setItem(storage.keys.tickets, [ticket, ...existing]);
    setSubmitted(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="פתיחת תקלה"
      description={submitted ? undefined : "דווח על בעיה או תקלה בנכס ונטפל בהקדם."}
    >
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">הקריאה נפתחה בהצלחה</h4>
          <p className="text-sm text-text-muted">
            מנהל הנכס קיבל את הפנייה ויחזור אליך עם עדכון.
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="נושא התקלה"
            inputProps={{
              value: title,
              onChange: (e) => setTitle(e.target.value),
              placeholder: "לדוגמה: נזילה במטבח",
              required: true,
            }}
          />

          <FormField label="קטגוריה">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-text focus:border-orange focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-navy">
              דחיפות
            </span>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={
                    "rounded-xl border py-2 text-sm font-semibold transition-colors " +
                    (priority === p.id
                      ? "border-orange bg-orange-soft text-orange-dark"
                      : "border-border bg-surface text-text-muted hover:bg-surface-muted")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <FormField
            label="תיאור"
            as="textarea"
            textareaProps={{
              value: description,
              onChange: (e) => setDescription(e.target.value),
              placeholder: "פרט את התקלה כדי שנוכל לטפל מהר יותר",
            }}
          />

          <Button type="submit" fullWidth size="lg">
            שליחת הקריאה
          </Button>
        </form>
      )}
    </Modal>
  );
}
