"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, FileText, IdCard, Paperclip, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useData } from "@/lib/store";
import { emailInUse, isValidEmail, normalizeEmail } from "@/lib/auth";
import { intakeDocumentName } from "@/lib/document-folders";
import { fileToDataUrl } from "@/lib/utils";
import { PhotoGridField } from "@/components/ui/PhotoGridField";
import { LeaseScheduleFields } from "@/features/leases/LeaseScheduleFields";
import { CheckClearanceFields } from "@/features/leases/CheckClearanceFields";
import {
  LeaseContractFields,
  leaseFilesToDocuments,
  type LeasePickedFile,
} from "@/features/leases/LeaseContractFields";
import {
  TenantPeopleFields,
  emptyTenantPerson,
  type TenantPersonForm,
} from "@/features/landlord/TenantPeopleFields";
import {
  alignPeriodRents,
  alignPeriodSlots,
  buildLeasePeriods,
  rentScheduleFromPeriods,
} from "@/lib/lease-periods";
import { resolveCheckSchedule, type CheckDraft } from "@/lib/check-schedule";
import type { AirDirection, DocumentFolder, DocumentType } from "@/types";

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  /** When set, adds a property to this existing landlord. */
  existingLandlordId?: string | null;
}

type Tri = "" | "yes" | "no";

interface PickedFile {
  name: string;
  dataUrl: string;
}

const airOptions: { id: AirDirection; label: string }[] = [
  { id: "north", label: "צפון" },
  { id: "south", label: "דרום" },
  { id: "east", label: "מזרח" },
  { id: "west", label: "מערב" },
];

const num = (v: string) => Number(v.replace(/[^0-9.]/g, "")) || 0;
const triBool = (v: Tri): boolean | undefined => (v === "yes" ? true : v === "no" ? false : undefined);

/** New-landlord intake: owner + property details. All fields are optional / skippable. */
export function AddClientModal({ open, onClose, onCreated, existingLandlordId }: AddClientModalProps) {
  const { addClient, landlords, tenants, users } = useData();
  const [done, setDone] = useState(false);
  const attaching = Boolean(existingLandlordId);
  const existing = landlords.find((l) => l.id === existingLandlordId);

  const [modeChoice, setModeChoice] = useState<"new" | "existing">("new");
  const mode: "new" | "existing" = attaching ? "existing" : modeChoice;
  const [pickedLandlordId, setPickedLandlordId] = useState("");

  // landlord
  const [landlordName, setLandlordName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordEmail, setLandlordEmail] = useState("");
  const [landlordIdNumber, setLandlordIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<PickedFile | null>(null);
  const [managementAgreement, setManagementAgreement] = useState<PickedFile | null>(null);
  const [includeTenant, setIncludeTenant] = useState(false);
  const [tenantPrimary, setTenantPrimary] = useState<TenantPersonForm>(emptyTenantPerson);
  const [tenantSecondary, setTenantSecondary] = useState<TenantPersonForm>(emptyTenantPerson);
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [periodRents, setPeriodRents] = useState<string[]>([""]);
  const [checkRows, setCheckRows] = useState<CheckDraft[]>([]);
  const [leaseFiles, setLeaseFiles] = useState<(LeasePickedFile | null)[]>([null]);
  const [tenantIdPhoto1, setTenantIdPhoto1] = useState<PickedFile | null>(null);
  const [tenantIdPhoto2, setTenantIdPhoto2] = useState<PickedFile | null>(null);
  const [guarantorIdPhoto1, setGuarantorIdPhoto1] = useState<PickedFile | null>(null);
  const [guarantorIdPhoto2, setGuarantorIdPhoto2] = useState<PickedFile | null>(null);
  const [tenantExtraFile, setTenantExtraFile] = useState<PickedFile | null>(null);
  const [formError, setFormError] = useState("");

  // property
  const [hasInspectionReport, setHasInspectionReport] = useState<Tri>("");
  const [inspectionReportFile, setInspectionReportFile] = useState<PickedFile | null>(null);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [rooms, setRooms] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [hasBalcony, setHasBalcony] = useState<Tri>("");
  const [balconySqm, setBalconySqm] = useState("");
  const [floor, setFloor] = useState("");
  const [hasElevator, setHasElevator] = useState<Tri>("");
  const [bathrooms, setBathrooms] = useState("");
  const [toilets, setToilets] = useState("");
  const [petsAllowed, setPetsAllowed] = useState<Tri>("");
  const [accessible, setAccessible] = useState<Tri>("");
  const [airDirections, setAirDirections] = useState<AirDirection[]>([]);
  const [hasParking, setHasParking] = useState<Tri>("");
  const [parkingNumber, setParkingNumber] = useState("");
  const [hasStorage, setHasStorage] = useState<Tri>("");
  const [storageNumber, setStorageNumber] = useState("");
  const [buildingFee, setBuildingFee] = useState("");
  const [municipalTax, setMunicipalTax] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [keysReceived, setKeysReceived] = useState("");
  const [subcontractorPhones, setSubcontractorPhones] = useState("");
  const [managementCompanyPhone, setManagementCompanyPhone] = useState("");
  const [municipalPropertyNumber, setMunicipalPropertyNumber] = useState("");
  const [electricityMeter, setElectricityMeter] = useState("");
  const [gasMeter, setGasMeter] = useState("");
  const [waterMeter, setWaterMeter] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const reset = () => {
    setDone(false);
    setModeChoice("new");
    setPickedLandlordId("");
    setLandlordName("");
    setLandlordPhone("");
    setLandlordEmail("");
    setLandlordIdNumber("");
    setIdPhoto(null);
    setManagementAgreement(null);
    setIncludeTenant(false);
    setTenantPrimary(emptyTenantPerson());
    setTenantSecondary(emptyTenantPerson());
    setLeaseStartDate("");
    setLeaseEndDate("");
    setPeriodRents([""]);
    setCheckRows([]);
    setLeaseFiles([null]);
    setTenantIdPhoto1(null);
    setTenantIdPhoto2(null);
    setGuarantorIdPhoto1(null);
    setGuarantorIdPhoto2(null);
    setTenantExtraFile(null);
    setFormError("");
    setHasInspectionReport("");
    setInspectionReportFile(null);
    setCity("");
    setAddress("");
    setNeighborhood("");
    setApartmentNumber("");
    setRooms("");
    setMonthlyRent("");
    setSizeSqm("");
    setHasBalcony("");
    setBalconySqm("");
    setFloor("");
    setHasElevator("");
    setBathrooms("");
    setToilets("");
    setPetsAllowed("");
    setAccessible("");
    setAirDirections([]);
    setHasParking("");
    setParkingNumber("");
    setHasStorage("");
    setStorageNumber("");
    setBuildingFee("");
    setMunicipalTax("");
    setEntryDate("");
    setKeysReceived("");
    setSubcontractorPhones("");
    setManagementCompanyPhone("");
    setMunicipalPropertyNumber("");
    setElectricityMeter("");
    setGasMeter("");
    setWaterMeter("");
    setPhotoUrls([]);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const effectiveLandlordId = attaching
    ? existingLandlordId!
    : mode === "existing"
      ? pickedLandlordId
      : undefined;
  const targetLandlord = landlords.find((l) => l.id === effectiveLandlordId);

  const toggleAir = (dir: AirDirection) => {
    setAirDirections((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "existing" && !effectiveLandlordId) return;

    const openingLandlord = mode === "new" && !attaching;
    const landlordMail = landlordEmail.trim();
    if (openingLandlord) {
      if (!isValidEmail(landlordMail)) {
        setFormError("יש להזין מייל תקין כדי לפתוח חשבון משכיר.");
        return;
      }
      if (emailInUse(landlordMail, [...users, ...landlords, ...tenants])) {
        setFormError("המייל הזה כבר משויך למשתמש במערכת.");
        return;
      }
    }

    const tenantMail = tenantPrimary.email.trim();
    const secondaryMail = tenantSecondary.email.trim();
    const hasSecondaryResident =
      Boolean(tenantSecondary.name.trim()) ||
      Boolean(tenantSecondary.phone.trim()) ||
      Boolean(secondaryMail) ||
      Boolean(tenantSecondary.idNumber.trim());
    if (includeTenant) {
      if (!isValidEmail(tenantMail)) {
        setFormError("יש להזין מייל תקין לשוכר הראשון.");
        return;
      }
      if (
        openingLandlord &&
        normalizeEmail(tenantMail) === normalizeEmail(landlordMail)
      ) {
        setFormError("מייל השוכר חייב להיות שונה ממייל המשכיר.");
        return;
      }
      if (emailInUse(tenantMail, [...users, ...landlords, ...tenants])) {
        setFormError("מייל השוכר הראשון כבר משויך למשתמש במערכת.");
        return;
      }
      if (hasSecondaryResident) {
        if (!isValidEmail(secondaryMail)) {
          setFormError("יש להזין מייל תקין לשוכר השני.");
          return;
        }
        if (normalizeEmail(secondaryMail) === normalizeEmail(tenantMail)) {
          setFormError("מיילי שני השוכרים חייבים להיות שונים.");
          return;
        }
        if (
          openingLandlord &&
          normalizeEmail(secondaryMail) === normalizeEmail(landlordMail)
        ) {
          setFormError("מייל השוכר השני חייב להיות שונה ממייל המשכיר.");
          return;
        }
        if (emailInUse(secondaryMail, [...users, ...landlords, ...tenants])) {
          setFormError("מייל השוכר השני כבר משויך למשתמש במערכת.");
          return;
        }
      }
      if (!leaseStartDate) {
        setFormError("יש להזין תאריך תחילת שכירות.");
        return;
      }
      if (leaseEndDate && leaseEndDate < leaseStartDate) {
        setFormError("תאריך סיום החוזה חייב להיות אחרי תאריך ההתחלה.");
        return;
      }
    }

    const listedRentAmount = num(monthlyRent);
    let leaseRent = listedRentAmount;
    let startingMonthlyRent: number | undefined;
    let rentAdjustments: ReturnType<typeof rentScheduleFromPeriods>["rentAdjustments"] | undefined;
    const tenantDocuments: Array<{
      name: string;
      type: DocumentType;
      folder: DocumentFolder;
      fileDataUrl: string;
    }> = [];

    if (includeTenant) {
      const activePeriods = buildLeasePeriods(leaseStartDate, leaseEndDate || undefined);
      const rentFields = alignPeriodRents(
        periodRents,
        Math.max(activePeriods.length, 1),
        listedRentAmount ? String(listedRentAmount) : "",
      );
      const rents = activePeriods.map((_, i) => num(rentFields[i] ?? ""));
      if (rents.some((r) => r <= 0)) {
        setFormError(
          activePeriods.length > 1
            ? "יש להזין דמי שכירות לכל תקופה בחוזה."
            : "יש להזין דמי שכירות חודשיים.",
        );
        return;
      }
      const schedule = rentScheduleFromPeriods(activePeriods, rents);
      leaseRent = schedule.monthlyRent;
      startingMonthlyRent = schedule.startingMonthlyRent;
      rentAdjustments = schedule.rentAdjustments.length
        ? schedule.rentAdjustments
        : undefined;
      tenantDocuments.push(
        ...leaseFilesToDocuments(activePeriods, leaseFiles),
      );
      if (tenantIdPhoto1) {
        tenantDocuments.push({
          name: intakeDocumentName(
            hasSecondaryResident ? "תצלום תעודת זהות — שוכר 1" : "תצלום תעודת זהות — שוכר",
            tenantIdPhoto1.name,
          ),
          type: "id",
          folder: "id_photos",
          fileDataUrl: tenantIdPhoto1.dataUrl,
        });
      }
      if (hasSecondaryResident && tenantIdPhoto2) {
        tenantDocuments.push({
          name: intakeDocumentName("תצלום תעודת זהות — שוכר 2", tenantIdPhoto2.name),
          type: "id",
          folder: "id_photos",
          fileDataUrl: tenantIdPhoto2.dataUrl,
        });
      }
      if (guarantorIdPhoto1) {
        tenantDocuments.push({
          name: intakeDocumentName("תצלום תעודת זהות — ערב 1", guarantorIdPhoto1.name),
          type: "id",
          folder: "guarantor_id",
          fileDataUrl: guarantorIdPhoto1.dataUrl,
        });
      }
      if (guarantorIdPhoto2) {
        tenantDocuments.push({
          name: intakeDocumentName("תצלום תעודת זהות — ערב 2", guarantorIdPhoto2.name),
          type: "id",
          folder: "guarantor_id",
          fileDataUrl: guarantorIdPhoto2.dataUrl,
        });
      }
      if (tenantExtraFile) {
        tenantDocuments.push({
          name: tenantExtraFile.name.trim() || "נספח",
          type: "approval",
          folder: "appendices",
          fileDataUrl: tenantExtraFile.dataUrl,
        });
      }
    }

    addClient({
      address: address.trim(),
      city: city.trim(),
      apartmentNumber: apartmentNumber.trim(),
      floor: num(floor),
      sizeSqm: num(sizeSqm),
      rooms: num(rooms),
      bathrooms: num(bathrooms),
      value: 0,
      municipalTax: num(municipalTax),
      municipalPropertyNumber: municipalPropertyNumber.trim() || undefined,
      buildingFee: num(buildingFee),
      electricityMeter: electricityMeter.trim(),
      imageId: "residential",
      photoUrls: photoUrls.length ? photoUrls : undefined,
      neighborhood: neighborhood.trim() || undefined,
      hasInspectionReport: triBool(hasInspectionReport),
      hasBalcony: triBool(hasBalcony),
      balconySqm: hasBalcony === "yes" ? num(balconySqm) || undefined : undefined,
      hasElevator: triBool(hasElevator),
      toilets: num(toilets) || undefined,
      petsAllowed: triBool(petsAllowed),
      accessible: triBool(accessible),
      airDirections: airDirections.length ? airDirections : undefined,
      hasParking: triBool(hasParking),
      parkingNumber: hasParking === "yes" ? parkingNumber.trim() || undefined : undefined,
      hasStorage: triBool(hasStorage),
      storageNumber: hasStorage === "yes" ? storageNumber.trim() || undefined : undefined,
      listedRent: (includeTenant ? startingMonthlyRent : listedRentAmount) || undefined,
      entryDate: entryDate || undefined,
      keysReceived: num(keysReceived) || undefined,
      subcontractorPhones: subcontractorPhones.trim() || undefined,
      managementCompanyPhone: managementCompanyPhone.trim() || undefined,
      gasMeter: gasMeter.trim() || undefined,
      waterMeter: waterMeter.trim() || undefined,
      landlordName: targetLandlord?.fullName ?? landlordName.trim(),
      landlordPhone: targetLandlord?.phone ?? landlordPhone.trim(),
      landlordEmail: targetLandlord?.email ?? landlordEmail.trim(),
      landlordIdNumber: targetLandlord?.idNumber ?? (landlordIdNumber.trim() || undefined),
      landlordIdPhotoUploaded: attaching || mode === "existing"
        ? targetLandlord?.idPhotoUploaded
        : Boolean(idPhoto) || undefined,
      landlordIdPhotoDataUrl: mode === "new" && !attaching ? idPhoto?.dataUrl : undefined,
      managementAgreementDataUrl: managementAgreement?.dataUrl,
      managementAgreementFileName: managementAgreement
        ? intakeDocumentName("הסכם ניהול", managementAgreement.name)
        : undefined,
      inspectionReportDataUrl:
        hasInspectionReport === "yes" ? inspectionReportFile?.dataUrl : undefined,
      inspectionReportFileName:
        hasInspectionReport === "yes" ? inspectionReportFile?.name : undefined,
      existingLandlordId: effectiveLandlordId,
      ...(includeTenant
        ? {
            tenantName: tenantPrimary.name.trim() || undefined,
            tenantPhone: tenantPrimary.phone.trim() || undefined,
            tenantEmail: tenantMail,
            tenantIdNumber: tenantPrimary.idNumber.trim() || undefined,
            ...(hasSecondaryResident
              ? {
                  secondaryTenantName: tenantSecondary.name.trim() || undefined,
                  secondaryTenantPhone: tenantSecondary.phone.trim() || undefined,
                  secondaryTenantEmail: secondaryMail,
                  secondaryTenantIdNumber: tenantSecondary.idNumber.trim() || undefined,
                }
              : {}),
            monthlyRent: leaseRent || undefined,
            startingMonthlyRent,
            rentAdjustments,
            startDate: leaseStartDate || undefined,
            endDate: leaseEndDate || undefined,
            checks: resolveCheckSchedule({
              rows: checkRows,
              startDate: leaseStartDate,
              endDate: leaseEndDate,
              startingMonthlyRent: startingMonthlyRent ?? leaseRent,
              rentAdjustments,
            }),
            tenantDocuments: tenantDocuments.length ? tenantDocuments : undefined,
          }
        : {}),
    });
    onCreated?.();
    setDone(true);
  };

  const title = attaching
    ? `הוספת נכס · ${existing?.fullName ?? "משכיר קיים"}`
    : "משכיר חדש";
  const description = attaching || mode === "existing"
    ? "אפשר לצרף שוכר לפי מייל — יישלח מייל הזמנה. שאר השדות אופציונליים"
    : "פתיחת חשבון לפי מייל — יישלח מייל הזמנה לאימות ולהגדרת סיסמה";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={done ? undefined : description}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">
            {attaching || mode === "existing"
              ? "הנכס נוסף בהצלחה"
              : includeTenant
                ? "המשכיר והשוכר נוספו בהצלחה"
                : "המשכיר נוסף בהצלחה"}
          </h4>
          <p className="text-sm text-text-muted">
            {includeTenant || (mode === "new" && !attaching)
              ? "החשבון נפתח לפי מייל. הסיסמה תיקבע בכניסה הראשונה לאפליקציה."
              : "הפרטים נשמרו במערכת."}
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="no-scrollbar max-h-[64vh] space-y-4 overflow-y-auto pe-1">
          {!attaching && (
            <>
              <Section title="סוג הזנה" />
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="סוג הזנה">
                <ChoiceChip
                  selected={mode === "new"}
                  onClick={() => setModeChoice("new")}
                  label="משכיר חדש"
                  role="radio"
                />
                <ChoiceChip
                  selected={mode === "existing"}
                  onClick={() => setModeChoice("existing")}
                  label="נכס למשכיר קיים"
                  role="radio"
                />
              </div>
              {mode === "existing" && (
                <FormField label="בחירת משכיר (לפי שם / ת״ז)">
                  <select
                    value={pickedLandlordId}
                    onChange={(e) => setPickedLandlordId(e.target.value)}
                    required
                    className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
                  >
                    <option value="">בחרו משכיר…</option>
                    {landlords.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName}
                        {l.idNumber ? ` · ת״ז ${l.idNumber}` : ""}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </>
          )}

          {mode === "new" && !attaching && (
            <>
              <Section title="פרטי בעל הנכס" />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="שם בעל הנכס"
                  className="col-span-2"
                  inputProps={{ value: landlordName, onChange: (e) => setLandlordName(e.target.value) }}
                />
                <FormField
                  label="טלפון נייד"
                  inputProps={{
                    value: landlordPhone,
                    onChange: (e) => setLandlordPhone(e.target.value),
                    inputMode: "tel",
                    dir: "ltr",
                  }}
                />
                <FormField
                  label="מייל"
                  hint="המשכיר ייכנס בפעם הראשונה עם המייל הזה ויקבע סיסמה"
                  inputProps={{
                    value: landlordEmail,
                    onChange: (e) => {
                      setLandlordEmail(e.target.value);
                      setFormError("");
                    },
                    type: "email",
                    inputMode: "email",
                    dir: "ltr",
                    required: true,
                    autoComplete: "email",
                  }}
                />
                <FormField
                  label="מס׳ ת״ז"
                  className="col-span-2"
                  inputProps={{
                    value: landlordIdNumber,
                    onChange: (e) => setLandlordIdNumber(e.target.value),
                    inputMode: "numeric",
                    dir: "ltr",
                  }}
                />
              </div>
              <FilePickField
                label="תצלום תעודת זהות"
                hint="תמונה או PDF"
                accept="image/*,.pdf,application/pdf"
                icon={<IdCard className="h-5 w-5" />}
                emptyLabel="העלאת תצלום ת״ז"
                file={idPhoto}
                onPick={setIdPhoto}
              />
            </>
          )}

          <Section title="חשבון שוכר" />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
            <input
              type="checkbox"
              checked={includeTenant}
              onChange={(e) => {
                const next = e.target.checked;
                setIncludeTenant(next);
                setFormError("");
                if (next && monthlyRent.trim() && !periodRents.some((v) => v.trim())) {
                  setPeriodRents([monthlyRent]);
                }
              }}
              className="mt-0.5 h-4 w-4 accent-[color:var(--orange)]"
            />
            <span>
              <span className="block text-sm font-semibold text-navy">פתיחת יוזר שוכר</span>
              <span className="mt-0.5 block text-xs text-text-muted">
                מייל — יישלח מייל הזמנה. אפשר גם שוכר שני (זוג) עם כניסה נפרדת
              </span>
            </span>
          </label>
          {includeTenant && (
            <div className="space-y-4">
              <TenantPeopleFields
                primary={tenantPrimary}
                secondary={tenantSecondary}
                onPrimaryChange={(next) => {
                  setTenantPrimary(next);
                  setFormError("");
                }}
                onSecondaryChange={(next) => {
                  setTenantSecondary(next);
                  setFormError("");
                }}
              />
              <LeaseScheduleFields
                startDate={leaseStartDate}
                endDate={leaseEndDate}
                onDatesChange={(nextStart, nextEnd) => {
                  setLeaseStartDate(nextStart);
                  setLeaseEndDate(nextEnd);
                  const nextPeriods = nextStart
                    ? buildLeasePeriods(nextStart, nextEnd || undefined)
                    : [];
                  setPeriodRents((prev) =>
                    alignPeriodRents(
                      prev,
                      Math.max(nextPeriods.length, 1),
                      monthlyRent.trim() || "",
                    ),
                  );
                  setLeaseFiles((prev) =>
                    alignPeriodSlots(prev, Math.max(nextPeriods.length, 1)),
                  );
                  setFormError("");
                }}
                periodRents={periodRents}
                onPeriodRentsChange={(next) => {
                  setPeriodRents(next);
                  setFormError("");
                }}
                listedRentHint={monthlyRent.trim()}
              />
              <CheckClearanceFields
                leaseStartDate={leaseStartDate}
                leaseEndDate={leaseEndDate}
                periodRents={periodRents}
                rows={checkRows}
                onRowsChange={(next) => {
                  setCheckRows(next);
                  setFormError("");
                }}
              />
              <div className="space-y-3">
                <LeaseContractFields
                  startDate={leaseStartDate}
                  endDate={leaseEndDate}
                  files={leaseFiles}
                  onFilesChange={(next) => {
                    setLeaseFiles(next);
                    setFormError("");
                  }}
                />
                <FilePickField
                  label={
                    tenantSecondary.email.trim() ||
                    tenantSecondary.name.trim() ||
                    tenantSecondary.phone.trim() ||
                    tenantSecondary.idNumber.trim()
                      ? "תצלום תעודת זהות — שוכר 1"
                      : "תצלום תעודת זהות של השוכר"
                  }
                  hint="אופציונלי"
                  accept="image/*,.pdf,application/pdf"
                  icon={<IdCard className="h-5 w-5" />}
                  emptyLabel="העלאת תצלום ת״ז"
                  file={tenantIdPhoto1}
                  onPick={setTenantIdPhoto1}
                />
                {(tenantSecondary.email.trim() ||
                  tenantSecondary.name.trim() ||
                  tenantSecondary.phone.trim() ||
                  tenantSecondary.idNumber.trim()) && (
                  <FilePickField
                    label="תצלום תעודת זהות — שוכר 2"
                    hint="אופציונלי"
                    accept="image/*,.pdf,application/pdf"
                    icon={<IdCard className="h-5 w-5" />}
                    emptyLabel="העלאת תצלום ת״ז"
                    file={tenantIdPhoto2}
                    onPick={setTenantIdPhoto2}
                  />
                )}
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
                  file={tenantExtraFile}
                  onPick={setTenantExtraFile}
                />
              </div>
            </div>
          )}

          <Section title="פרטים אודות הנכס" />
          <YesNoField
            label="האם קיים דוח בדק?"
            value={hasInspectionReport}
            onChange={(next) => {
              setHasInspectionReport(next);
              if (next !== "yes") setInspectionReportFile(null);
            }}
          />
          {hasInspectionReport === "yes" && (
            <FilePickField
              label="דוח בדק"
              hint="PDF או תמונה"
              accept="image/*,.pdf,application/pdf"
              icon={<FileText className="h-5 w-5" />}
              emptyLabel="העלאת דוח בדק"
              file={inspectionReportFile}
              onPick={setInspectionReportFile}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="עיר" inputProps={{ value: city, onChange: (e) => setCity(e.target.value) }} />
            <FormField label="שכונה" inputProps={{ value: neighborhood, onChange: (e) => setNeighborhood(e.target.value) }} />
            <FormField
              label="כתובת הנכס"
              className="col-span-2"
              inputProps={{ value: address, onChange: (e) => setAddress(e.target.value), placeholder: "רחוב ומספר" }}
            />
            <FormField label="מס׳ דירה" inputProps={{ value: apartmentNumber, onChange: (e) => setApartmentNumber(e.target.value) }} />
            <FormField label="מס׳ חדרים" inputProps={{ value: rooms, onChange: (e) => setRooms(e.target.value), inputMode: "decimal" }} />
            {!includeTenant && (
              <FormField
                label="שכ״ד (₪)"
                inputProps={{ value: monthlyRent, onChange: (e) => setMonthlyRent(e.target.value), inputMode: "numeric" }}
              />
            )}
            <FormField
              label="מ״ר"
              inputProps={{ value: sizeSqm, onChange: (e) => setSizeSqm(e.target.value), inputMode: "numeric" }}
            />
          </div>

          <YesNoField label="מרפסת" value={hasBalcony} onChange={setHasBalcony} />
          {hasBalcony === "yes" && (
            <FormField
              label="מ״ר מרפסת"
              inputProps={{ value: balconySqm, onChange: (e) => setBalconySqm(e.target.value), inputMode: "numeric" }}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="קומה" inputProps={{ value: floor, onChange: (e) => setFloor(e.target.value), inputMode: "numeric" }} />
            <YesNoField label="מעלית" value={hasElevator} onChange={setHasElevator} />
            <FormField
              label="מס׳ מקלחות"
              inputProps={{ value: bathrooms, onChange: (e) => setBathrooms(e.target.value), inputMode: "numeric" }}
            />
            <FormField
              label="מס׳ שירותים"
              inputProps={{ value: toilets, onChange: (e) => setToilets(e.target.value), inputMode: "numeric" }}
            />
          </div>

          <YesNoField label="בע״ח" value={petsAllowed} onChange={setPetsAllowed} />
          <YesNoField label="גישה לנכים" value={accessible} onChange={setAccessible} />

          <div>
            <p className="mb-1.5 text-sm font-semibold text-navy">כיווני אוויר</p>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="כיווני אוויר">
              {airOptions.map((o) => (
                <ChoiceChip
                  key={o.id}
                  selected={airDirections.includes(o.id)}
                  onClick={() => toggleAir(o.id)}
                  label={o.label}
                />
              ))}
            </div>
          </div>

          <YesNoField label="חניה" value={hasParking} onChange={setHasParking} />
          {hasParking === "yes" && (
            <FormField
              label="מס׳ חניה"
              inputProps={{ value: parkingNumber, onChange: (e) => setParkingNumber(e.target.value) }}
            />
          )}

          <YesNoField label="מחסן" value={hasStorage} onChange={setHasStorage} />
          {hasStorage === "yes" && (
            <FormField
              label="מס׳ מחסן"
              inputProps={{ value: storageNumber, onChange: (e) => setStorageNumber(e.target.value) }}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="ועד בית (₪)"
              inputProps={{ value: buildingFee, onChange: (e) => setBuildingFee(e.target.value), inputMode: "numeric" }}
            />
            <FormField
              label="ארנונה (₪)"
              inputProps={{ value: municipalTax, onChange: (e) => setMunicipalTax(e.target.value), inputMode: "numeric" }}
            />
            <FormField
              label="תאריך כניסה"
              inputProps={{ type: "date", value: entryDate, onChange: (e) => setEntryDate(e.target.value) }}
            />
            <FormField
              label="מספר המפתחות שהתקבלו"
              inputProps={{ value: keysReceived, onChange: (e) => setKeysReceived(e.target.value), inputMode: "numeric" }}
            />
          </div>

          <FormField
            label="טלפונים של קבלני משנה (במידה והדירה חדשה)"
            as="textarea"
            textareaProps={{
              value: subcontractorPhones,
              onChange: (e) => setSubcontractorPhones(e.target.value),
              placeholder: "שם / טלפון, ניתן להפריד בפסיקים",
              dir: "ltr",
              className: "text-start",
            }}
          />
          <FormField
            label="טלפון של חברת הניהול"
            inputProps={{
              value: managementCompanyPhone,
              onChange: (e) => setManagementCompanyPhone(e.target.value),
              inputMode: "tel",
              dir: "ltr",
            }}
          />

          <Section title="מונים וארנונה" />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="מספר נכס בארנונה"
              className="col-span-2"
              inputProps={{
                value: municipalPropertyNumber,
                onChange: (e) => setMunicipalPropertyNumber(e.target.value),
                dir: "ltr",
              }}
            />
            <FormField
              label="מספר מונה חשמל"
              inputProps={{
                value: electricityMeter,
                onChange: (e) => setElectricityMeter(e.target.value),
                dir: "ltr",
              }}
            />
            <FormField
              label="מספר מונה גז"
              inputProps={{ value: gasMeter, onChange: (e) => setGasMeter(e.target.value), dir: "ltr" }}
            />
            <FormField
              label="מספר מונה מים"
              className="col-span-2"
              inputProps={{ value: waterMeter, onChange: (e) => setWaterMeter(e.target.value), dir: "ltr" }}
            />
          </div>

          <PhotoGridField
            label="תמונות נכס"
            hint="JPEG, PNG או HEIC"
            emptyLabel="העלאת תמונות"
            photos={photoUrls}
            onChange={setPhotoUrls}
          />

          <Section title="מסמכים" />
          <FilePickField
            label="הסכם ניהול"
            hint="PDF או תמונה"
            accept="image/*,.pdf,application/pdf"
            icon={<FileText className="h-5 w-5" />}
            emptyLabel="העלאת הסכם ניהול"
            file={managementAgreement}
            onPick={setManagementAgreement}
          />

          {formError && (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth size="lg">
            {attaching || mode === "existing" ? "שמירת הנכס" : "שמירת המשכיר"}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="h-4 w-1 rounded-full bg-orange" />
      <h4 className="text-sm font-bold text-navy">{title}</h4>
    </div>
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
          <Upload className="h-5 w-5" />
          {emptyLabel}
        </Button>
      )}
    </div>
  );
}

function ChoiceChip({
  selected,
  onClick,
  label,
  role,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  role?: "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "radio" ? selected : undefined}
      aria-pressed={role === "radio" ? undefined : selected}
      onClick={onClick}
      className={
        "rounded-xl border px-3 py-2.5 text-sm font-semibold " +
        (selected ? "border-orange bg-orange-soft text-navy" : "border-border text-text-muted")
      }
    >
      {label}
    </button>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Tri;
  onChange: (v: Tri) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-navy">{label}</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
        <ChoiceChip
          selected={value === "yes"}
          onClick={() => onChange(value === "yes" ? "" : "yes")}
          label="כן"
          role="radio"
        />
        <ChoiceChip
          selected={value === "no"}
          onClick={() => onChange(value === "no" ? "" : "no")}
          label="לא"
          role="radio"
        />
      </div>
    </div>
  );
}
