"use client";

import { useState } from "react";
import { Building2, ChevronDown, Mail, Phone, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useData } from "@/lib/store";

type PeopleMode = "landlords" | "tenants";

interface PeopleListDialogProps {
  open: boolean;
  onClose: () => void;
  mode: PeopleMode;
}

/** Directory of landlords (with their properties + tenants) or tenants
 *  (with their property + landlord). */
export function PeopleListDialog({ open, onClose, mode }: PeopleListDialogProps) {
  const { landlords, tenants, properties } = useData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const isLandlords = mode === "landlords";

  const rows = isLandlords ? landlords.length : tenants.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isLandlords ? "תצוגת משכירים" : "תצוגת שוכרים"}
      description={`${rows} ${isLandlords ? "משכירים" : "שוכרים"}`}
    >
      <div className="no-scrollbar max-h-[62vh] space-y-2 overflow-y-auto">
        {isLandlords
          ? landlords.map((l) => {
              const owned = properties.filter((p) => p.landlordId === l.id);
              const isOpen = expanded === l.id;
              return (
                <div key={l.id} className="rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : l.id)}
                    className="flex w-full items-center gap-3 p-3 text-start"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-base font-bold text-white">
                      {l.fullName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy">{l.fullName}</p>
                      <p className="truncate text-xs text-text-muted">{owned.length} נכסים</p>
                      <div className="mt-1 flex items-center gap-3 text-[0.7rem] text-text-muted">
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone className="h-3 w-3" />
                          {l.phone}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={"h-5 w-5 shrink-0 text-text-muted transition-transform " + (isOpen ? "rotate-180" : "")}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-1.5 border-t border-border p-3">
                      {owned.map((p) => {
                        const tenant = tenants.find((t) => t.id === p.tenantId);
                        return (
                          <div key={p.id} className="rounded-lg bg-surface-muted p-2.5 text-sm">
                            <p className="flex items-center gap-1.5 font-semibold text-navy">
                              <Building2 className="h-4 w-4 text-orange" />
                              {p.address}, {p.city}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                              <User className="h-3.5 w-3.5" />
                              שוכר: {tenant?.fullName ?? "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          : tenants.map((t) => {
              const property = properties.find((p) => p.id === t.propertyId);
              const landlord = landlords.find((l) => l.id === property?.landlordId);
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-base font-bold text-white">
                    {t.fullName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy">{t.fullName}</p>
                    <p className="truncate text-xs text-text-muted">
                      {property ? `${property.address}, ${property.city}` : "—"}
                      {landlord ? ` • משכיר: ${landlord.fullName}` : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[0.7rem] text-text-muted">
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="h-3 w-3" />
                        {t.phone}
                      </span>
                      <span className="flex items-center gap-1 truncate" dir="ltr">
                        <Mail className="h-3 w-3" />
                        {t.email}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </Modal>
  );
}
