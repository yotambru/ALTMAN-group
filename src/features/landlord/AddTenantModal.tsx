"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, FileText, IdCard, Paperclip, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { LeaseScheduleFields } from "@/features/leases/LeaseScheduleFields";
import { CheckClearanceFields } from "@/features/leases/CheckClearanceFields";
import { emailInUse, isValidEmail } from "@/lib/auth";
import {
  alignPeriodRents,
  buildLeasePeriods,
  rentScheduleFromPeriods,
} from "@/lib/lease-periods";
import { draftsToCheckEntries, validateCheckDrafts, type CheckDraft } from "@/lib/check-schedule";
import { can } from "@/lib/permissions";
import { useData } from "@/lib/store";
import { intakeDocumentName } from "@/lib/document-folders";
import { fileToDataUrl } from "@/lib/utils";
import type { DocumentFolder, DocumentType, Property } from "@/types";

interface AddTenantModalProps {
  open: boolean;
  onClose: () => void;
  properties: Property[];
}

interface PickedFile {
  name: string;
  dataUrl: string;
}

const parseMoney = (v: string) => Number(v.replace(/[^0-9.]/g, "")) || 0;

/** Landlord (or manager) opens a tenant login by email — with lease details and optional docs. */
export function AddTenantModal({ open, onClose, properties }: AddTenantModalProps) {
  const { addTenant, landlords, tenants, users, actor } = useData();
  const [done, setDone] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodRents, setPeriodRents] = useState<string[]>([""]);
  const [checkRows, setCheckRows] = useState<CheckDraft[]>([]);
  const [leaseFile, setLeaseFile] = useState<PickedFile | null>(null);
  const [idPhoto, setIdPhoto] = useState<PickedFile | null>(null);
  const [guarantorIdPhoto1, setGuarantorIdPhoto1] = useState<PickedFile | null>(null);
  const [guarantorIdPhoto2, setGuarantorIdPhoto2] = useState<PickedFile | null>(null);
  const [extraFile, setExtraFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState("");
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const selectedPropertyId = properties.some((p) => p.id === propertyId)
    ? propertyId
    : (properties[0]?.id ?? "");
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const existingTenant = tenants.find((t) => t.id === selectedProperty?.tenantId);
  const isReplacement = Boolean(selectedProperty?.tenantId);
  const listedRentHint = selectedProperty?.listedRent
    ? String(selectedProperty.listedRent)
    : "";
  const isManager = can(actor.role, "documents.viewAll");

  const applyLeaseDates = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    const nextPeriods = nextStart
      ? buildLeasePeriods(nextStart, nextEnd || undefined)
      : [];
    setPeriodRents((prev) =>
      alignPeriodRents(prev, Math.max(nextPeriods.length, 1), listedRentHint),
    );
    setError("");
  };

  const reset = () => {
    setDone(false);
    setPropertyId(properties[0]?.id ?? "");
    setEmail("");
    setName("");
    setPhone("");
    setIdNumber("");
    setStartDate("");
    setEndDate("");
    setPeriodRents([""]);
    setCheckRows([]);
    setLeaseFile(null);
    setIdPhoto(null);
    setGuarantorIdPhoto1(null);
    setGuarantorIdPhoto2(null);
    setExtraFile(null);
    setError("");
    setConfirmReplacement(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submitTenant = () => {
    if (!selectedProperty) return;
    const activePeriods = buildLeasePeriods(startDate, endDate || undefined);
    const rentFields = alignPeriodRents(
      periodRents,
      Math.max(activePeriods.length, 1),
      listedRentHint,
    );
    const rents = activePeriods.map((_, i) => parseMoney(rentFields[i] ?? ""));
    const schedule = rentScheduleFromPeriods(activePeriods, rents);
    const documents: Array<{
      name: string;
      type: DocumentType;
      folder: DocumentFolder;
      fileDataUrl: string;
    }> = [];
    if (leaseFile) {
      documents.push({
        name: intakeDocumentName("הסכם שכירות", leaseFile.name),
        type: "contract",
        folder: "lease",
        fileDataUrl: leaseFile.dataUrl,
      });
    }
    if (idPhoto) {
      documents.push({
        name: intakeDocumentName("תצלום תעודת זהות — שוכר", idPhoto.name),
        type: "id",
        folder: "id_photos",
        fileDataUrl: idPhoto.dataUrl,
      });
    }
    if (guarantorIdPhoto1) {
      documents.push({
        name: intakeDocumentName("תצלום תעודת זהות — ערב 1", guarantorIdPhoto1.name),
        type: "id",
        folder: "guarantor_id",
        fileDataUrl: guarantorIdPhoto1.dataUrl,
      });
    }
    if (guarantorIdPhoto2) {
      documents.push({
        name: intakeDocumentName("תצלום תעודת זהות — ערב 2", guarantorIdPhoto2.name),
        type: "id",
        folder: "guarantor_id",
        fileDataUrl: guarantorIdPhoto2.dataUrl,
      });
    }
    if (extraFile) {
      documents.push({
        name: extraFile.name.trim() || "נספח",
        type: "approval",
        folder: "appendices",
        fileDataUrl: extraFile.dataUrl,
      });
    }

    addTenant({
      propertyId: selectedPropertyId,
      email,
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      idNumber: idNumber.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      monthlyRent: schedule.monthlyRent,
      startingMonthlyRent: schedule.startingMonthlyRent,
      rentAdjustments: schedule.rentAdjustments.length
        ? schedule.rentAdjustments
        : undefined,
      checks: draftsToCheckEntries(checkRows),
      replaceExistingTenant: isReplacement,
      documents: documents.length ? documents : undefined,
    });
    setConfirmReplacement(false);
    setDone(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      setError("יש לבחור נכס.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("יש להזין מייל תקין כדי לפתוח חשבון שוכר.");
      return;
    }
    if (emailInUse(email, [...users, ...landlords, ...tenants])) {
      setError("המייל הזה כבר משויך למשתמש במערכת.");
      return;
    }
    if (!startDate) {
      setError("יש להזין תאריך תחילת שכירות.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("תאריך סיום החוזה חייב להיות אחרי תאריך ההתחלה.");
      return;
    }

    const activePeriods = buildLeasePeriods(startDate, endDate || undefined);
    const rentFields = alignPeriodRents(
      periodRents,
      Math.max(activePeriods.length, 1),
      listedRentHint,
    );
    const rents = activePeriods.map((_, i) => parseMoney(rentFields[i] ?? ""));
    if (rents.some((r) => r <= 0)) {
      setError(
        activePeriods.length > 1
          ? "יש להזין דמי שכירות לכל תקופה בחוזה."
          : "יש להזין דמי שכירות חודשיים.",
      );
      return;
    }
    const checkError = validateCheckDrafts(checkRows);
    if (checkError) {
      setError(checkError);
      return;
    }

    if (isReplacement) {
      setConfirmReplacement(true);
      return;
    }
    submitTenant();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={isReplacement ? "שוכר חדש / החלפת שוכר" : "שוכר חדש"}
        description={
          done
            ? undefined
            : "פתיחת חשבון שוכר עם פרטי חוזה. השוכר יקבע סיסמה בכניסה הראשונה"
        }
      >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">חשבון השוכר נפתח</h4>
          <p className="text-sm text-text-muted">
            השוכר ייכנס בפעם הראשונה עם המייל ויקבע סיסמה בעצמו.
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : properties.length === 0 ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-text-muted">
            אין נכסים זמינים לבחירת שוכר.
          </p>
          <Button type="button" variant="outline" fullWidth onClick={handleClose}>
            סגירה
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="no-scrollbar max-h-[64vh] space-y-4 overflow-y-auto pe-1"
        >
          <FormField label="נכס">
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                const id = e.target.value;
                setPropertyId(id);
                const prop = properties.find((p) => p.id === id);
                if (prop?.listedRent) {
                  setPeriodRents((prev) => {
                    if (prev.some((v) => v.trim())) return prev;
                    return prev.map(() => String(prop.listedRent));
                  });
                }
              }}
              required
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}
                  {p.apartmentNumber ? ` · דירה ${p.apartmentNumber}` : ""}
                  {p.city ? `, ${p.city}` : ""}
                  {p.tenantId ? " · החלפת שוכר" : " · פנוי"}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="מייל השוכר"
            hint="זה מזהה הכניסה — בלי סיסמה"
            inputProps={{
              value: email,
              onChange: (e) => {
                setEmail(e.target.value);
                setError("");
              },
              type: "email",
              inputMode: "email",
              dir: "ltr",
              required: true,
              autoComplete: "email",
            }}
          />
          <FormField
            label="שם השוכר"
            hint="אופציונלי"
            inputProps={{ value: name, onChange: (e) => setName(e.target.value) }}
          />
          <FormField
            label="טלפון"
            hint="אופציונלי"
            inputProps={{
              value: phone,
              onChange: (e) => setPhone(e.target.value),
              inputMode: "tel",
              dir: "ltr",
            }}
          />
          <FormField
            label="מס׳ ת״ז"
            hint="אופציונלי"
            inputProps={{
              value: idNumber,
              onChange: (e) => setIdNumber(e.target.value),
              inputMode: "numeric",
              dir: "ltr",
            }}
          />

          <LeaseScheduleFields
            startDate={startDate}
            endDate={endDate}
            onDatesChange={applyLeaseDates}
            periodRents={periodRents}
            onPeriodRentsChange={(next) => {
              setPeriodRents(next);
              setError("");
            }}
            listedRentHint={listedRentHint}
          />

          <CheckClearanceFields
            leaseStartDate={startDate}
            leaseEndDate={endDate}
            periodRents={periodRents}
            rows={checkRows}
            onRowsChange={(next) => {
              setCheckRows(next);
              setError("");
            }}
          />

          {isManager && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-1">
                <span className="h-4 w-1 rounded-full bg-orange" />
                <h4 className="text-sm font-bold text-navy">מסמכים</h4>
              </div>
              <FilePickField
                label="הסכם שכירות"
                hint="PDF או תמונה"
                accept="image/*,.pdf,application/pdf"
                icon={<FileText className="h-5 w-5" />}
                emptyLabel="העלאת הסכם שכירות"
                file={leaseFile}
                onPick={setLeaseFile}
              />
              <FilePickField
                label="תצלום תעודת זהות של השוכר"
                hint="אופציונלי"
                accept="image/*,.pdf,application/pdf"
                icon={<IdCard className="h-5 w-5" />}
                emptyLabel="העלאת תצלום ת״ז"
                file={idPhoto}
                onPick={setIdPhoto}
              />
              <FilePickField
                label="תצלום תעודת זהות של ערב 1"
                hint="אופציונלי"
                accept="image/*,.pdf,application/pdf"
                icon={<IdCard className="h-5 w-5" />}
                emptyLabel="העלאת תצלום ת״ז"
                file={guarantorIdPhoto1}
                onPick={setGuarantorIdPhoto1}
              />
              <FilePickField
                label="תצלום תעודת זהות של ערב 2"
                hint="אופציונלי"
                accept="image/*,.pdf,application/pdf"
                icon={<IdCard className="h-5 w-5" />}
                emptyLabel="העלאת תצלום ת״ז"
                file={guarantorIdPhoto2}
                onPick={setGuarantorIdPhoto2}
              />
              <FilePickField
                label="מסמך נוסף"
                hint="נספח, ערבות או כל מסמך רלוונטי"
                accept="image/*,.pdf,application/pdf"
                icon={<Paperclip className="h-5 w-5" />}
                emptyLabel="העלאת מסמך"
                file={extraFile}
                onPick={setExtraFile}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth size="lg">
            {isReplacement ? "החלפת שוכר" : "פתיחת חשבון שוכר"}
          </Button>
        </form>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmReplacement}
        onClose={() => setConfirmReplacement(false)}
        onConfirm={submitTenant}
        title="אישור החלפת שוכר"
        description={`האם אתה בטוח שברצונך להחליף את ${existingTenant?.fullName ?? "השוכר הנוכחי"}? חשבון הכניסה, החוזה והתשלומים שלו יוסרו.`}
        confirmLabel="כן, להחליף"
        cancelLabel="ביטול"
      />
    </>
  );
}

function FilePickField({
  label,
  hint,
  accept,
  icon,
  emptyLabel,
  file,
  onPick,
}: {
  label: string;
  hint?: string;
  accept: string;
  icon: ReactNode;
  emptyLabel: string;
  file: PickedFile | null;
  onPick: (f: PickedFile | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = Boolean(file?.dataUrl.startsWith("data:image/"));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-navy">{label}</p>
        {hint && <p className="text-[0.7rem] text-text-muted">{hint}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          onPick({ name: f.name, dataUrl: await fileToDataUrl(f) });
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.dataUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy" dir="ltr">
              {file.name}
            </p>
            <p className="text-[0.7rem] text-success">הועלה בהצלחה</p>
          </div>
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label="הסרת קובץ"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" fullWidth onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {emptyLabel}
        </Button>
      )}
    </div>
  );
}
