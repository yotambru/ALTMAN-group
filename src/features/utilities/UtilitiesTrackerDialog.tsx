"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, Clock, Lock, ShieldCheck, Unlock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import { DocumentPreviewDialog } from "@/features/documents/DocumentPreviewDialog";
import { useData, utilityLabelHe } from "@/lib/store";
import {
  awaitingManagementApproval,
  compareOnboardingsForTracker,
  pendingOnboardingCount,
} from "@/lib/alerts";
import { propertyAddressLabel } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import type { AppDocument, TenantOnboarding, UtilityKind } from "@/types";

interface UtilitiesTrackerDialogProps {
  open: boolean;
  onClose: () => void;
}

const utilityOrder: UtilityKind[] = ["arnona", "water", "electricity", "gas", "vaad"];

const REMINDER_TITLE = "תזכורת להשלמת פעולות";
const REMINDER_BODY = "נא להשלים החלפת חשבונות והעלאת פוליסת ביטוח.";

/** Manager oversight of account switches (ארנונה/מים/חשמל/גז/ועד) + insurance. */
export function UtilitiesTrackerDialog({ open, onClose }: UtilitiesTrackerDialogProps) {
  const {
    onboardings,
    tenants,
    properties,
    leases,
    users,
    documents,
    addNotification,
    approveOnboarding,
    setOnboardingReleased,
  } = useData();

  const [preview, setPreview] = useState<{ title: string; doc?: AppDocument } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  const rows = tenants
    .map((tenant) => {
      const property = properties.find((p) => p.id === tenant.propertyId);
      const lease = leases.find((l) => l.id === tenant.leaseId || l.tenantId === tenant.id);
      const existing = onboardings.find((o) => o.tenantId === tenant.id);
      const ob: TenantOnboarding = existing ?? {
        tenantId: tenant.id,
        leaseId: tenant.leaseId || lease?.id || "",
        moveInDate: lease?.startDate || "",
        utilities: utilityOrder.map((utility) => ({ utility, status: "pending" as const })),
        insurance: { status: "pending" as const },
        completed: false,
      };
      const tenantUsers = users.filter((u) => u.role === "tenant" && u.tenantId === tenant.id);
      return { ob, tenant, property, tenantUsers };
    })
    .sort((a, b) => {
      const byStatusAndActivity = compareOnboardingsForTracker(a.ob, b.ob);
      if (byStatusAndActivity !== 0) return byStatusAndActivity;
      const onboardingIndex = (tenantId: string) => {
        const index = onboardings.findIndex((o) => o.tenantId === tenantId);
        return index === -1 ? onboardings.length : index;
      };
      const byInsert = onboardingIndex(b.ob.tenantId) - onboardingIndex(a.ob.tenantId);
      if (byInsert !== 0) return byInsert;
      return (
        tenants.findIndex((t) => t.id === b.tenant.id) -
        tenants.findIndex((t) => t.id === a.tenant.id)
      );
    });

  const pendingReminderRows = rows.filter(
    ({ ob }) => !ob.completed && !awaitingManagementApproval(ob),
  );

  const remindTenants = (tenantIds: string[]) => {
    let sent = 0;
    let withoutLogin = 0;
    for (const tenantId of tenantIds) {
      const logins = users.filter((u) => u.role === "tenant" && u.tenantId === tenantId);
      if (logins.length === 0) {
        withoutLogin += 1;
        continue;
      }
      for (const login of logins) {
        addNotification({
          kind: "reminder",
          title: REMINDER_TITLE,
          body: REMINDER_BODY,
          forUserId: login.id,
          relatedId: tenantId,
          actionRequired: true,
        });
        sent += 1;
      }
    }
    if (sent === 0) {
      setToast("אין חשבון כניסה לשוכר — לא ניתן לשלוח תזכורת");
      return;
    }
    if (withoutLogin > 0) {
      setToast(`נשלחו ${sent} תזכורות · ${withoutLogin} בלי חשבון כניסה`);
      return;
    }
    setToast(sent === 1 ? "נשלחה תזכורת לשוכר" : `נשלחו תזכורות ל־${sent} שוכרים`);
  };

  const openProof = (title: string, docId?: string) => {
    const doc = docId ? documents.find((d) => d.id === docId) : undefined;
    setPreview({ title, doc });
  };

  const chipClass =
    "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-surface-muted";
  const chipUploadedClass = "border-success bg-success-soft text-success hover:bg-success-soft";

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="מעקב החלפת חשבונות"
        description="ארנונה · מים · חשמל · גז · ועד בית · ביטוח"
      >
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            כברירת מחדל כל שוכר חסום עד להעלאת המסמכים. אפשר לשחרר או לחסום ידנית.
          </p>

          {pendingReminderRows.length > 0 && (
            <button
              type="button"
              onClick={() => remindTenants(pendingReminderRows.map(({ tenant }) => tenant.id))}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange"
            >
              <BellRing className="h-4 w-4" />
              שליחת תזכורת לשוכרים שטרם העלו
            </button>
          )}

          {rows.map(({ ob, tenant, property, tenantUsers }) => {
            const pending = pendingOnboardingCount(ob);
            const awaiting = awaitingManagementApproval(ob);
            return (
              <div key={ob.tenantId} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-navy">{tenant.fullName || "שוכר"}</p>
                    <p className="truncate text-xs text-text-muted">
                      {property ? propertyAddressLabel(property) : ""}
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
                    const uploaded = item != null && item.status !== "pending";
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => openProof(utilityLabelHe(kind), item?.proofDocId)}
                        className={cn(chipClass, uploaded && chipUploadedClass)}
                      >
                        {utilityLabelHe(kind)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => openProof("פוליסת ביטוח", ob.insurance.docId)}
                    className={cn(chipClass, ob.insurance.status !== "pending" && chipUploadedClass)}
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

                {!ob.completed && !awaiting && (
                  <button
                    type="button"
                    onClick={() => remindTenants([ob.tenantId])}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange"
                  >
                    <BellRing className="h-4 w-4" />
                    שליחת תזכורת לשוכר
                  </button>
                )}

                {!ob.completed && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingReleased(ob.tenantId, true);
                      setToast("השוכר שוחרר ידנית לשימוש באפליקציה");
                    }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy"
                  >
                    <Unlock className="h-4 w-4" />
                    שחרור ידני מהחסימה
                  </button>
                )}

                {ob.completed && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingReleased(ob.tenantId, false);
                      setToast("השוכר נחסם עד להעלאת המסמכים");
                    }}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy"
                  >
                    <Lock className="h-4 w-4" />
                    חסימה מחדש עד להעלאה
                  </button>
                )}

                {!ob.completed && !awaiting && tenantUsers.length === 0 && (
                  <p className="mt-2 text-xs text-text-muted">אין חשבון כניסה לשוכר — התזכורת לא תגיע.</p>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-text-muted">אין נתוני מעקב.</p>}
        </div>
      </Modal>

      <DocumentPreviewDialog
        open={open && preview !== null}
        onClose={() => setPreview(null)}
        document={preview?.doc}
        title={preview?.title}
        description="הטופס שהועלה ע״י השוכר"
        emptyTitle="טרם הועלה מסמך"
        emptyDescription="כשהשוכר יעלה טופס, הוא יופיע כאן."
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
