"use client";

import { History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useData } from "@/lib/store";
import { roleLabels } from "@/lib/permissions";

interface ActivityLogDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Audit trail of key actions performed in the system (הרשאות ויומן פעילות). */
export function ActivityLogDialog({ open, onClose }: ActivityLogDialogProps) {
  const { activityLog } = useData();

  return (
    <Modal open={open} onClose={onClose} title="יומן פעילות" description={`${activityLog.length} פעולות תועדו`}>
      <div className="no-scrollbar max-h-[64vh] space-y-2 overflow-y-auto">
        {activityLog.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">עדיין לא תועדו פעולות.</p>
        )}
        {activityLog.map((e) => (
          <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/5 text-navy">
              <History className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{e.action}</p>
              {e.details && <p className="truncate text-xs text-text-muted">{e.details}</p>}
              <p className="mt-0.5 text-[0.7rem] text-text-muted">
                {e.userName} · {roleLabels[e.role]} · {new Date(e.at).toLocaleString("he-IL")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
