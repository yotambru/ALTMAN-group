"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Send, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useData } from "@/lib/store";
import { propertyAddressLabel, currentMonthlyRent } from "@/lib/portfolio";
import { roleLabels } from "@/lib/permissions";
import { fileToDataUrl } from "@/lib/utils";

interface SendForSignatureDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Manager uploads a document and sends it to a landlord/tenant for signing.
 *  Optional "חידוש חוזה" mode attaches lease end/rent updates applied on sign. */
export function SendForSignatureDialog({ open, onClose }: SendForSignatureDialogProps) {
  const { users, properties, leases, addDocument } = useData();
  const [renewal, setRenewal] = useState(false);
  const [name, setName] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [fileData, setFileData] = useState<string | undefined>();
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rentedProperties = useMemo(
    () => properties.filter((p) => Boolean(p.tenantId)),
    [properties],
  );

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const activeLease = leases.find(
    (l) => l.propertyId === propertyId && l.active && l.tenantId === selectedProperty?.tenantId,
  ) ?? leases.find((l) => l.propertyId === propertyId && l.active);

  const recipients = useMemo(() => {
    if (renewal && selectedProperty?.tenantId) {
      const tenantLogins = users.filter(
        (u) => u.role === "tenant" && u.tenantId === selectedProperty.tenantId && u.email,
      );
      if (tenantLogins.length) return tenantLogins;
    }
    return users.filter((u) => u.role === "landlord" || u.role === "tenant");
  }, [renewal, selectedProperty, users]);

  const applyProperty = (nextId: string) => {
    setPropertyId(nextId);
    setError("");
    const prop = properties.find((p) => p.id === nextId);
    const lease =
      leases.find((l) => l.propertyId === nextId && l.active && l.tenantId === prop?.tenantId) ??
      leases.find((l) => l.propertyId === nextId && l.active);
    if (lease) {
      setEndDate(lease.endDate?.slice(0, 10) ?? "");
      setMonthlyRent(String(currentMonthlyRent(lease) || lease.monthlyRent || ""));
    } else {
      setEndDate("");
      setMonthlyRent("");
    }
    if (renewal && prop) {
      const apt = prop.apartmentNumber?.trim();
      setName(`חידוש הסכם שכירות — ${prop.address}${apt ? ` דירה ${apt}` : ""}`);
      const tenantLogins = users.filter(
        (u) => u.role === "tenant" && u.tenantId === prop.tenantId && u.email,
      );
      setOwnerUserId(tenantLogins[0]?.id ?? "");
    }
  };

  const reset = () => {
    setRenewal(false);
    setName("");
    setOwnerUserId("");
    setPropertyId("");
    setEndDate("");
    setMonthlyRent("");
    setFileData(undefined);
    setFileName("");
    setError("");
    setDone(false);
  };
  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !ownerUserId) return;

    if (renewal) {
      if (!propertyId || !activeLease) {
        setError("יש לבחור נכס עם שכירות פעילה.");
        return;
      }
      if (!endDate) {
        setError("יש להזין תאריך סיום חדש לחוזה.");
        return;
      }
      if (activeLease.startDate && endDate < activeLease.startDate.slice(0, 10)) {
        setError("תאריך הסיום חייב להיות אחרי תחילת השכירות.");
        return;
      }
      const rent = Number(monthlyRent.replace(/[^0-9.]/g, "")) || 0;
      if (rent <= 0) {
        setError("יש להזין דמי שכירות לתקופה החדשה.");
        return;
      }
      addDocument({
        name: name.trim(),
        type: "contract",
        folder: "lease_renewal",
        propertyId,
        landlordId: activeLease.landlordId,
        tenantId: activeLease.tenantId,
        ownerUserId,
        fileDataUrl: fileData,
        awaitingSignature: true,
        pendingLeaseUpdate: {
          leaseId: activeLease.id,
          endDate,
          monthlyRent: rent,
          effectiveDate: activeLease.endDate?.slice(0, 10) || endDate,
        },
      });
      setDone(true);
      return;
    }

    addDocument({
      name: name.trim(),
      type: "contract",
      folder: /חידוש/.test(name) ? "lease_renewal" : "lease",
      propertyId: propertyId || undefined,
      landlordId: selectedProperty?.landlordId,
      tenantId: selectedProperty?.tenantId,
      ownerUserId,
      fileDataUrl: fileData,
      awaitingSignature: true,
    });
    setDone(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="שליחת מסמך לחתימה"
      description={done ? undefined : "העלאת מסמך ושליחתו לחתימה דיגיטלית"}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">המסמך נשלח לחתימה</h4>
          <p className="text-sm text-text-muted">
            {renewal
              ? "אחרי חתימת השוכר המסמך ייכנס לתיקיית החידוש, ותאריך הסיום והשכ״ד יתעדכנו אוטומטית."
              : "הנמען יקבל התראה וימתין לחתימתו."}
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
            <input
              type="checkbox"
              checked={renewal}
              onChange={(e) => {
                const next = e.target.checked;
                setRenewal(next);
                setError("");
                if (next) {
                  if (!name.trim()) setName("חידוש הסכם שכירות");
                  if (propertyId) applyProperty(propertyId);
                }
              }}
              className="mt-0.5 h-4 w-4 accent-[color:var(--orange)]"
            />
            <span>
              <span className="block text-sm font-semibold text-navy">חידוש חוזה לשוכר קיים</span>
              <span className="mt-0.5 block text-xs text-text-muted">
                אחרי החתימה — תיקיית חידוש + עדכון תאריך סיום ושכ״ד
              </span>
            </span>
          </label>

          <FormField
            label="שם המסמך"
            inputProps={{
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: renewal ? "חידוש הסכם שכירות" : "לדוגמה: נספח חידוש חוזה",
              required: true,
            }}
          />

          <FormField label={renewal ? "נכס (חובה)" : "נכס משויך (לא חובה)"}>
            <select
              value={propertyId}
              onChange={(e) => applyProperty(e.target.value)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
              required={renewal}
            >
              <option value="">— {renewal ? "בחר/י נכס מושכר" : "ללא"} —</option>
              {(renewal ? rentedProperties : properties).map((p) => (
                <option key={p.id} value={p.id}>
                  {propertyAddressLabel(p)}
                </option>
              ))}
            </select>
          </FormField>

          {renewal && (
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="תאריך סיום חדש"
                inputProps={{
                  type: "date",
                  value: endDate,
                  onChange: (e) => {
                    setEndDate(e.target.value);
                    setError("");
                  },
                  required: true,
                }}
              />
              <FormField
                label="שכ״ד חודשי (₪)"
                inputProps={{
                  value: monthlyRent,
                  onChange: (e) => {
                    setMonthlyRent(e.target.value);
                    setError("");
                  },
                  inputMode: "numeric",
                  required: true,
                  placeholder: "₪",
                }}
              />
            </div>
          )}

          <FormField label="נמען לחתימה">
            <select
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
              required
            >
              <option value="">— בחר/י נמען —</option>
              {recipients.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} · {roleLabels[u.role]}
                </option>
              ))}
            </select>
          </FormField>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFileData(await fileToDataUrl(f));
                  setFileName(f.name);
                }
              }}
            />
            <Button type="button" variant="outline" fullWidth onClick={() => fileRef.current?.click()}>
              <Upload className="h-5 w-5" />
              {fileName || (renewal ? "העלאת נספח חידוש" : "העלאת קובץ (לא חובה)")}
            </Button>
          </div>

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}

          <Button type="submit" fullWidth size="lg">
            <Send className="h-5 w-5 -scale-x-100" />
            שליחה לחתימה
          </Button>
        </form>
      )}
    </Modal>
  );
}
