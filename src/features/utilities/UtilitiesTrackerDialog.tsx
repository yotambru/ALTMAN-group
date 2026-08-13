"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Clock, FileText, ShieldCheck, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData, utilityLabelHe } from "@/lib/store";
import {
  awaitingManagementApproval,
  pendingOnboardingCount,
} from "@/lib/alerts";
import type { AppDocument, UtilityKind } from "@/types";

interface UtilitiesTrackerDialogProps {
  open: boolean;
  onClose: () => void;
}

const utilityOrder: UtilityKind[] = ["arnona", "water", "electricity", "gas", "vaad"];

/** Manager oversight of account switches (ארנונה/מים/חשמל/גז/ועד) + insurance. */
export function UtilitiesTrackerDialog({ open, onClose }: UtilitiesTrackerDialogProps) {
  const {
    onboardings,
    tenants,
    properties,
    users,
    documents,
    addNotification,
    approveOnboarding,
  } = useData();

  const [preview, setPreview] = useState<{ title: string; doc?: AppDocument } | null>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPreview(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [preview]);

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  const rows = onboardings.map((ob) => {
    const tenant = tenants.find((t) => t.id === ob.tenantId);
    const property = properties.find((p) => p.id === tenant?.propertyId);
    const tenantUser = users.find((u) => u.tenantId === ob.tenantId);
    return { ob, tenant, property, tenantUser };
  });

  const openProof = (title: string, docId?: string) => {
    const doc = docId ? documents.find((d) => d.id === docId) : undefined;
    setPreview({ title, doc });
  };

  const chipClass =
    "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-surface-muted";

  return (
    <>
      <Modal open={open} onClose={handleClose} title="מעקב החלפת חשבונות" description="ארנונה · מים · חשמל · גז · ועד בית · ביטוח">
        <div className="no-scrollbar max-h-[64vh] space-y-3 overflow-y-auto">
          {rows.map(({ ob, tenant, property, tenantUser }) => {
            const pending = pendingOnboardingCount(ob);
            const awaiting = awaitingManagementApproval(ob);
            return (
              <div key={ob.tenantId} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-navy">{tenant?.fullName ?? "שוכר"}</p>
                    <p className="truncate text-xs text-text-muted">
                      {property ? `${property.address}, ${property.city}` : ""}
                    </p>
                  </div>
                  {ob.completed ? (
                    <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                      שוחרר
                    </StatusBadge>
                  ) : awaiting ? (
                    <StatusBadge tone="warning" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                      ממתין לאישור
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="warning" icon={<Clock className="h-3.5 w-3.5" />}>
                      {pending} נותרו
                    </StatusBadge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {utilityOrder.map((kind) => {
                    const item = ob.utilities.find((u) => u.utility === kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => openProof(utilityLabelHe(kind), item?.proofDocId)}
                        className={chipClass}
                      >
                        {utilityLabelHe(kind)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => openProof("פוליסת ביטוח", ob.insurance.docId)}
                    className={chipClass}
                  >
                    ביטוח
                  </button>
                </div>

                {awaiting && (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    className="mt-3"
                    onClick={() => approveOnboarding(ob.tenantId)}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    אישור ושחרור חשבון
                  </Button>
                )}

                {!ob.completed && !awaiting && tenantUser && (
                  <button
                    onClick={() =>
                      addNotification({
                        kind: "reminder",
                        title: "תזכורת להשלמת פעולות",
                        body: "נא להשלים החלפת חשבונות והעלאת פוליסת ביטוח.",
                        forUserId: tenantUser.id,
                        actionRequired: true,
                      })
                    }
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange"
                  >
                    <BellRing className="h-4 w-4" />
                    שליחת תזכורת לשוכר
                  </button>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-text-muted">אין נתוני מעקב.</p>}
        </div>
      </Modal>

      {open && preview && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={preview.title}
        >
          <button
            aria-label="סגירה"
            className="absolute inset-0 bg-navy-dark/50 backdrop-blur-[2px]"
            onClick={() => setPreview(null)}
          />
          <div className="relative z-10 w-full max-w-[30rem] rounded-t-2xl bg-surface p-5 shadow-lg sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-navy">{preview.title}</h3>
                <p className="mt-1 text-sm text-text-muted">הטופס שהועלה ע״י השוכר</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="סגירה"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {preview.doc?.fileDataUrl ? (
              preview.doc.fileDataUrl.startsWith("data:image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.doc.fileDataUrl}
                  alt={preview.title}
                  className="max-h-[55vh] w-full rounded-xl object-contain ring-1 ring-border"
                />
              ) : (
                <iframe
                  title={preview.title}
                  src={preview.doc.fileDataUrl}
                  className="h-[55vh] w-full rounded-xl ring-1 ring-border"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <FileText className="h-8 w-8 text-text-muted" />
                <p className="text-sm font-semibold text-navy">טרם הועלה מסמך</p>
                <p className="text-xs text-text-muted">כשהשוכר יעלה טופס, הוא יופיע כאן.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
