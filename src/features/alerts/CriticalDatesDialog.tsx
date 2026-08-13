"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { getCriticalDates } from "@/lib/alerts";
import { formatDateDots } from "@/lib/utils";

interface CriticalDatesDialogProps {
  open: boolean;
  onClose: () => void;
  landlordId?: string;
}

/** Critical dates within 90 days: lease end, option, insurance, guarantees. */
export function CriticalDatesDialog({ open, onClose, landlordId }: CriticalDatesDialogProps) {
  const { leases, properties } = useData();
  const scoped = landlordId ? leases.filter((l) => l.landlordId === landlordId) : leases;
  const dates = getCriticalDates(scoped, properties);

  return (
    <Modal open={open} onClose={onClose} title="התראות קריטיות" description="מועדים חשובים ב-90 הימים הקרובים">
      <div className="no-scrollbar max-h-[64vh] space-y-2 overflow-y-auto">
        {dates.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">אין מועדים קריטיים בטווח הקרוב.</p>
        )}
        {dates.map((d) => (
          <div key={d.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <span
              className={
                "grid h-10 w-10 shrink-0 place-items-center rounded-full " +
                (d.daysLeft <= 30 ? "bg-[#fdecea] text-danger" : "bg-orange-soft text-orange")
              }
            >
              {d.daysLeft <= 30 ? <AlertTriangle className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-bold text-navy">{d.label}</p>
                <StatusBadge tone={d.daysLeft <= 30 ? "danger" : "warning"}>
                  בעוד {d.daysLeft} ימים
                </StatusBadge>
              </div>
              <p className="truncate text-xs text-text-muted">{d.address}</p>
              <p className="mt-0.5 text-[0.7rem] text-text-muted">{formatDateDots(d.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
