"use client";

import { useState } from "react";
import { Building2, ChevronDown, KeyRound, Mail, Phone, Trash2, User } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { ChangePasswordDialog } from "@/features/auth/ChangePasswordDialog";
import { can, roleLabels } from "@/lib/permissions";
import { useData } from "@/lib/store";
import type { User as AppUser } from "@/types";

type PeopleMode = "landlords" | "tenants" | "accounts";

interface PeopleListDialogProps {
  open: boolean;
  onClose: () => void;
  mode: PeopleMode;
}

type PendingDelete =
  | { kind: "landlord"; id: string; name: string }
  | { kind: "tenant"; id: string; name: string };

/** Directory of landlords (with their properties + tenants) or tenants
 *  (with their property + landlord). */
export function PeopleListDialog({ open, onClose, mode }: PeopleListDialogProps) {
  const { landlords, tenants, properties, users, actor, deleteLandlord, deleteTenant } = useData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{ userId: string; name: string } | null>(null);
  const isLandlords = mode === "landlords";
  const isAccounts = mode === "accounts";
  const canDelete = can(actor.role, "clients.delete");
  const canSetPassword = can(actor.role, "users.password");

  const loginForLandlord = (landlordId: string) =>
    users.find((u) => u.landlordId === landlordId && u.email);
  const loginForTenant = (tenantId: string) =>
    users.find((u) => u.tenantId === tenantId && u.email);

  const openPassword = (user: AppUser | undefined, fallbackName: string) => {
    if (!user?.id) {
      setToast("אין חשבון כניסה עם מייל");
      return;
    }
    if (!user.email) {
      setToast("לחשבון אין כתובת מייל");
      return;
    }
    setPasswordTarget({ userId: user.id, name: user.fullName || fallbackName });
  };

  const rows = isAccounts ? users.length : isLandlords ? landlords.length : tenants.length;
  const title = isAccounts ? "חשבונות כניסה" : isLandlords ? "תצוגת משכירים" : "תצוגת שוכרים";
  const description = isAccounts
    ? `${rows} חשבונות`
    : `${rows} ${isLandlords ? "משכירים" : "שוכרים"}`;

  const confirmDelete = () => {
    if (!pending) return;
    if (pending.kind === "landlord") {
      deleteLandlord(pending.id);
      setToast("המשכיר נמחק");
    } else {
      deleteTenant(pending.id);
      setToast("השוכר נמחק");
    }
    setPending(null);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        description={description}
      >
        <div className="no-scrollbar max-h-[62vh] space-y-2 overflow-y-auto">
          {isAccounts
            ? [...users]
                .sort((a, b) => {
                  const order = { manager: 0, assistant: 1, landlord: 2, tenant: 3 };
                  const roleDiff = order[a.role] - order[b.role];
                  if (roleDiff !== 0) return roleDiff;
                  return a.fullName.localeCompare(b.fullName, "he");
                })
                .map((u) => (
                  <div key={u.id} className="flex items-center gap-2 rounded-xl border border-border p-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-base font-bold text-white">
                      {(u.fullName || u.email || "?").charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy">{u.fullName || "ללא שם"}</p>
                      <p className="truncate text-xs text-text-muted">{roleLabels[u.role]}</p>
                      {u.email && (
                        <p className="mt-1 truncate text-[0.7rem] text-text-muted" dir="ltr">
                          {u.email}
                        </p>
                      )}
                    </div>
                    {canSetPassword && (
                      <button
                        type="button"
                        aria-label={`הגדרת סיסמה ל${u.fullName || u.email || "משתמש"}`}
                        onClick={() => openPassword(u, u.fullName || u.email || "משתמש")}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-navy/70 transition-colors hover:bg-surface-muted hover:text-navy"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
            : isLandlords
            ? landlords.map((l) => {
                const owned = properties.filter((p) => p.landlordId === l.id);
                const isOpen = expanded === l.id;
                return (
                  <div key={l.id} className="rounded-xl border border-border">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : l.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-start"
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
                      {canSetPassword && (
                        <button
                          type="button"
                          aria-label={`הגדרת סיסמה ל${l.fullName}`}
                          onClick={() => openPassword(loginForLandlord(l.id), l.fullName)}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-navy/70 transition-colors hover:bg-surface-muted hover:text-navy"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          aria-label={`מחיקת ${l.fullName}`}
                          onClick={() => setPending({ kind: "landlord", id: l.id, name: l.fullName })}
                          className="me-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
                  <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border p-3">
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
                    {canSetPassword && (
                      <button
                        type="button"
                        aria-label={`הגדרת סיסמה ל${t.fullName}`}
                        onClick={() => openPassword(loginForTenant(t.id), t.fullName)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-navy/70 transition-colors hover:bg-surface-muted hover:text-navy"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        aria-label={`מחיקת ${t.fullName}`}
                        onClick={() => setPending({ kind: "tenant", id: t.id, name: t.fullName })}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
        </div>
      </Modal>
      <ConfirmDialog
        open={pending != null}
        onClose={() => setPending(null)}
        onConfirm={confirmDelete}
        title={pending?.kind === "landlord" ? "מחיקת משכיר" : "מחיקת שוכר"}
        description={
          pending?.kind === "landlord"
            ? `למחוק את ${pending.name}? יימחקו גם הנכסים, השוכרים והשכירויות הקשורים. לא ניתן לשחזר.`
            : pending
              ? `למחוק את ${pending.name}? חשבון הכניסה, השכירות והתשלומים יימחקו, והנכס יסומן כפנוי.`
              : ""
        }
        confirmLabel="מחיקה"
      />
      <ChangePasswordDialog
        open={passwordTarget != null}
        onClose={() => setPasswordTarget(null)}
        target={passwordTarget}
        onSuccess={() => setToast("הסיסמה עודכנה")}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
