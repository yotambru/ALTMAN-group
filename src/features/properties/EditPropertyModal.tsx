"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { PhotoGridField } from "@/components/ui/PhotoGridField";
import { CheckClearanceFields } from "@/features/leases/CheckClearanceFields";
import { LeaseScheduleFields } from "@/features/leases/LeaseScheduleFields";
import {
  paymentsToCheckDrafts,
  resolveCheckSchedule,
  validateCheckDrafts,
  type CheckDraft,
} from "@/lib/check-schedule";
import {
  alignPeriodRents,
  buildLeasePeriods,
  rentOnDate,
  rentScheduleFromPeriods,
} from "@/lib/lease-periods";
import { currentMonthlyRent, propertyDisplayValue } from "@/lib/portfolio";
import { useData } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { Property, PropertyStatus } from "@/types";

interface EditPropertyModalProps {
  property: Property | null;
  onClose: () => void;
}

const num = (v: string) => Number(v.replace(/[^0-9.]/g, "")) || 0;

const statusOptions: { id: PropertyStatus; label: string }[] = [
  { id: "rented", label: "מושכר" },
  { id: "vacant", label: "פנוי" },
  { id: "in_process", label: "בתהליך" },
  { id: "renovation", label: "בשיפוץ" },
  { id: "issue", label: "תקלה" },
];

function rentsFromLease(
  lease: {
    monthlyRent: number;
    startingMonthlyRent?: number;
    rentAdjustments?: { date: string; monthlyRent: number }[];
  },
  start: string,
  end: string,
): string[] {
  const periods = start ? buildLeasePeriods(start, end || undefined) : [];
  const fallback = String(currentMonthlyRent(lease) || lease.monthlyRent || "");
  if (!periods.length) return [fallback];
  return periods.map((period) => {
    const rent = rentOnDate(
      lease.startingMonthlyRent ?? lease.monthlyRent,
      lease.rentAdjustments,
      period.startDate,
    );
    return rent > 0 ? String(rent) : fallback;
  });
}

/** Edit an existing property (and its active lease's rent schedule). */
export function EditPropertyModal({ property, onClose }: EditPropertyModalProps) {
  const { updateProperty, updateLease, replaceLeaseChecks, setPropertyPhotos, leases, payments } =
    useData();
  const lease = property ? leases.find((l) => l.propertyId === property.id && l.active) : undefined;

  const [value, setValue] = useState("");
  const [municipalTax, setMunicipalTax] = useState("");
  const [buildingFee, setBuildingFee] = useState("");
  const [electricityMeter, setElectricityMeter] = useState("");
  const [gasMeter, setGasMeter] = useState("");
  const [waterMeter, setWaterMeter] = useState("");
  const [municipalPropertyNumber, setMunicipalPropertyNumber] = useState("");
  const [managementCompanyPhone, setManagementCompanyPhone] = useState("");
  const [status, setStatus] = useState<PropertyStatus>("rented");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [periodRents, setPeriodRents] = useState<string[]>([""]);
  const [checkRows, setCheckRows] = useState<CheckDraft[]>([]);
  const [autoRebuildChecks, setAutoRebuildChecks] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (property) {
      setValue(property.value > 0 ? String(property.value) : "");
      setMunicipalTax(String(property.municipalTax));
      setBuildingFee(String(property.buildingFee));
      setElectricityMeter(property.electricityMeter);
      setGasMeter(property.gasMeter ?? "");
      setWaterMeter(property.waterMeter ?? "");
      setMunicipalPropertyNumber(property.municipalPropertyNumber ?? "");
      setManagementCompanyPhone(property.managementCompanyPhone ?? "");
      setStatus(property.status);
      const start = lease?.startDate?.slice(0, 10) ?? "";
      const end = lease?.endDate?.slice(0, 10) ?? "";
      setLeaseStartDate(start);
      setLeaseEndDate(end);
      setPeriodRents(lease ? rentsFromLease(lease, start, end) : [""]);
      const existingChecks = lease
        ? paymentsToCheckDrafts(payments.filter((pay) => pay.leaseId === lease.id))
        : [];
      setCheckRows(existingChecks);
      setAutoRebuildChecks(existingChecks.length === 0);
      setPhotoUrls(property.photoUrls ?? []);
      setFormError("");
    }
    // Seed once per property/lease identity so live payment updates don't wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id, lease?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!property) return null;

  const estimatedValue = propertyDisplayValue(
    property,
    lease ? currentMonthlyRent(lease) : property.listedRent,
  );

  const applyLeaseDates = (nextStart: string, nextEnd: string) => {
    setLeaseStartDate(nextStart);
    setLeaseEndDate(nextEnd);
    const nextPeriods = nextStart ? buildLeasePeriods(nextStart, nextEnd || undefined) : [];
    setPeriodRents((prev) =>
      alignPeriodRents(prev, Math.max(nextPeriods.length, 1), prev[0] ?? ""),
    );
    setFormError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let schedule:
      | ReturnType<typeof rentScheduleFromPeriods>
      | undefined;
    if (lease) {
      if (!leaseStartDate) {
        setFormError("יש להזין תאריך תחילת שכירות.");
        return;
      }
      if (leaseEndDate && leaseEndDate < leaseStartDate) {
        setFormError("תאריך סיום החוזה חייב להיות אחרי תאריך ההתחלה.");
        return;
      }
      const periods = buildLeasePeriods(leaseStartDate, leaseEndDate || undefined);
      const rentFields = alignPeriodRents(periodRents, Math.max(periods.length, 1));
      const rents = periods.map((_, i) => num(rentFields[i] ?? ""));
      if (rents.some((r) => r <= 0)) {
        setFormError(
          periods.length > 1
            ? "יש להזין דמי שכירות לכל תקופה בחוזה."
            : "יש להזין דמי שכירות חודשיים.",
        );
        return;
      }
      schedule = rentScheduleFromPeriods(periods, rents);
      const checkError = validateCheckDrafts(checkRows);
      if (checkError) {
        setFormError(checkError);
        return;
      }
    }

    updateProperty(property.id, {
      value: num(value),
      municipalTax: num(municipalTax),
      buildingFee: num(buildingFee),
      electricityMeter: electricityMeter.trim(),
      gasMeter: gasMeter.trim() || undefined,
      waterMeter: waterMeter.trim() || undefined,
      municipalPropertyNumber: municipalPropertyNumber.trim() || undefined,
      managementCompanyPhone: managementCompanyPhone.trim() || undefined,
      status,
      ...(schedule ? { listedRent: schedule.startingMonthlyRent } : {}),
    });
    setPropertyPhotos(property.id, photoUrls);
    if (lease && schedule) {
      const checks = resolveCheckSchedule({
        rows: checkRows,
        startDate: leaseStartDate || lease.startDate,
        endDate: leaseEndDate,
        startingMonthlyRent: schedule.startingMonthlyRent,
        rentAdjustments: schedule.rentAdjustments,
      });
      updateLease(lease.id, {
        startDate: leaseStartDate || lease.startDate,
        endDate: leaseEndDate,
        monthlyRent: schedule.monthlyRent,
        startingMonthlyRent: schedule.startingMonthlyRent,
        rentAdjustments: schedule.rentAdjustments,
        nextPaymentDate: checks[0]?.clearanceDate || leaseStartDate || lease.nextPaymentDate,
      });
      replaceLeaseChecks(lease.id, checks);
    }
    onClose();
  };

  return (
    <Modal open={!!property} onClose={onClose} title="עריכת נכס" description={`${property.address}, ${property.city}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="שווי (₪)"
            hint={
              estimatedValue > 0
                ? `אם ריק, מוצג שווי לפי תשואה: ${formatCurrency(estimatedValue)}`
                : "אם ריק, מחושב לפי תשואה 2.8%"
            }
            className="col-span-2"
            inputProps={{ value, onChange: (e) => setValue(e.target.value), inputMode: "numeric", placeholder: estimatedValue ? String(estimatedValue) : undefined }}
          />
          <FormField label="ארנונה (₪)" inputProps={{ value: municipalTax, onChange: (e) => setMunicipalTax(e.target.value), inputMode: "numeric" }} />
          <FormField label="ועד בית (₪)" inputProps={{ value: buildingFee, onChange: (e) => setBuildingFee(e.target.value), inputMode: "numeric" }} />
          <FormField
            label="מס׳ נכס בארנונה"
            className="col-span-2"
            inputProps={{
              value: municipalPropertyNumber,
              onChange: (e) => setMunicipalPropertyNumber(e.target.value),
              dir: "ltr",
            }}
          />
          <FormField
            label="מונה חשמל"
            inputProps={{
              value: electricityMeter,
              onChange: (e) => setElectricityMeter(e.target.value),
              dir: "ltr",
            }}
          />
          <FormField
            label="מונה מים"
            inputProps={{
              value: waterMeter,
              onChange: (e) => setWaterMeter(e.target.value),
              dir: "ltr",
            }}
          />
          <FormField
            label="מונה גז"
            inputProps={{
              value: gasMeter,
              onChange: (e) => setGasMeter(e.target.value),
              dir: "ltr",
            }}
          />
          <FormField
            label="טלפון חברת ניהול"
            inputProps={{
              value: managementCompanyPhone,
              onChange: (e) => setManagementCompanyPhone(e.target.value),
              inputMode: "tel",
              dir: "ltr",
            }}
          />
          <FormField label="סטטוס" className="col-span-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PropertyStatus)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
            >
              {statusOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </div>
        {lease && (
          <>
            <LeaseScheduleFields
              startDate={leaseStartDate}
              endDate={leaseEndDate}
              onDatesChange={applyLeaseDates}
              periodRents={periodRents}
              onPeriodRentsChange={setPeriodRents}
            />
            <CheckClearanceFields
              leaseStartDate={leaseStartDate}
              leaseEndDate={leaseEndDate}
              periodRents={periodRents}
              rows={checkRows}
              autoRebuild={autoRebuildChecks}
              onRowsChange={(next) => {
                setCheckRows(next);
                setFormError("");
              }}
            />
          </>
        )}
        {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
        <PhotoGridField
          label="תמונות נכס"
          hint="JPEG, PNG או HEIC"
          emptyLabel="העלאת תמונות"
          photos={photoUrls}
          onChange={setPhotoUrls}
        />
        <Button type="submit" fullWidth size="lg">שמירת שינויים</Button>
      </form>
    </Modal>
  );
}
