"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useData, type Actor } from "@/lib/store";
import { formatDateDots } from "@/lib/utils";
import type { TaskStatus } from "@/types";

interface TasksDialogProps {
  open: boolean;
  onClose: () => void;
  self: Actor;
}

/** Central task calendar for the manager + assistant. */
export function TasksDialog({ open, onClose, self }: TasksDialogProps) {
  const { tasks, users, addTask, setTaskStatus } = useData();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(self.id);
  const [dueDate, setDueDate] = useState("");

  const staff = users.filter((u) => u.role === "manager" || u.role === "assistant");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      assigneeUserId: assignee,
      dueDate: dueDate || undefined,
      createdById: self.id,
    });
    setTitle(""); setDueDate(""); setAdding(false);
  };

  const cycle = (s: TaskStatus): TaskStatus =>
    s === "open" ? "in_progress" : s === "in_progress" ? "done" : "open";

  return (
    <Modal open={open} onClose={onClose} title="יומן משימות" description={`${tasks.filter((t) => t.status !== "done").length} משימות פתוחות`}>
      {adding ? (
        <form onSubmit={submit} className="mb-3 space-y-2 rounded-xl border border-dashed border-border p-3">
          <FormField label="משימה" inputProps={{ value: title, onChange: (e) => setTitle(e.target.value), required: true }} />
          <div className="grid grid-cols-2 gap-2">
            <FormField label="אחראי">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-xl border bg-surface px-3 py-3 text-sm focus:border-orange focus:outline-none"
              >
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </FormField>
            <FormField label="תאריך יעד" inputProps={{ type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value) }} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" fullWidth>הוספה</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>ביטול</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" fullWidth className="mb-3" onClick={() => setAdding(true)}>
          <Plus className="h-5 w-5" />
          משימה חדשה
        </Button>
      )}

      <div className="no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto">
        {tasks.map((t) => {
          const owner = users.find((u) => u.id === t.assigneeUserId);
          const done = t.status === "done";
          return (
            <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <button
                onClick={() => setTaskStatus(t.id, cycle(t.status))}
                aria-label="שינוי סטטוס"
                className="mt-0.5 shrink-0"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : t.status === "in_progress" ? (
                  <Circle className="h-5 w-5 fill-orange-soft text-orange" />
                ) : (
                  <Circle className="h-5 w-5 text-text-muted" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={"font-semibold " + (done ? "text-text-muted line-through" : "text-navy")}>{t.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[0.7rem] text-text-muted">
                  <span>{owner?.fullName ?? "—"}</span>
                  {t.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateDots(t.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
