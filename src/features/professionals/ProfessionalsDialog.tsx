"use client";

import { useState } from "react";
import { Phone, Plus, Star, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useData } from "@/lib/store";

interface ProfessionalsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Assistant can view/assign but not add to the roster. */
  canManage?: boolean;
}

/** Roster of professionals (בעלי מקצוע) with a quick add form. */
export function ProfessionalsDialog({ open, onClose, canManage = true }: ProfessionalsDialogProps) {
  const { professionals, tickets, addProfessional } = useData();
  const [adding, setAdding] = useState(false);
  const [fullName, setFullName] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !trade.trim()) return;
    addProfessional({ fullName: fullName.trim(), trade: trade.trim(), phone: phone.trim() });
    setFullName(""); setTrade(""); setPhone(""); setAdding(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="ניהול בעלי מקצוע" description={`${professionals.length} בעלי מקצוע`}>
      {canManage && (
        adding ? (
          <form onSubmit={submit} className="mb-3 space-y-2 rounded-xl border border-dashed border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="שם מלא" inputProps={{ value: fullName, onChange: (e) => setFullName(e.target.value), required: true }} />
              <FormField label="תחום" inputProps={{ value: trade, onChange: (e) => setTrade(e.target.value), placeholder: "חשמל / אינסטלציה" }} />
            </div>
            <FormField label="טלפון" inputProps={{ value: phone, onChange: (e) => setPhone(e.target.value), inputMode: "tel" }} />
            <div className="flex gap-2">
              <Button type="submit" fullWidth>הוספה</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>ביטול</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" fullWidth className="mb-3" onClick={() => setAdding(true)}>
            <Plus className="h-5 w-5" />
            הוספת בעל מקצוע
          </Button>
        )
      )}

      <div className="no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto">
        {professionals.map((p) => {
          const jobs = tickets.filter((t) => t.assignedProfessionalId === p.id).length;
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
                <Wrench className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">{p.fullName}</p>
                <p className="truncate text-xs text-text-muted">{p.trade} • {jobs} קריאות</p>
                <span className="mt-1 flex items-center gap-1 text-[0.7rem] text-text-muted" dir="ltr">
                  <Phone className="h-3 w-3" />
                  {p.phone}
                </span>
              </div>
              {p.rating != null && (
                <span className="flex items-center gap-1 text-xs font-bold text-navy">
                  <Star className="h-4 w-4 fill-orange text-orange" />
                  {p.rating}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
