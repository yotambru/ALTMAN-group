"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useData } from "@/lib/store";
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

/** Edit an existing property (and its active lease's rent). */
export function EditPropertyModal({ property, onClose }: EditPropertyModalProps) {
  const { updateProperty, updateLease, leases } = useData();
  const lease = property ? leases.find((l) => l.propertyId === property.id && l.active) : undefined;

  const [value, setValue] = useState("");
  const [municipalTax, setMunicipalTax] = useState("");
  const [buildingFee, setBuildingFee] = useState("");
  const [electricityMeter, setElectricityMeter] = useState("");
  const [status, setStatus] = useState<PropertyStatus>("rented");
  const [rent, setRent] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (property) {
      setValue(String(property.value));
      setMunicipalTax(String(property.municipalTax));
      setBuildingFee(String(property.buildingFee));
      setElectricityMeter(property.electricityMeter);
      setStatus(property.status);
      setRent(lease ? String(lease.monthlyRent) : "");
    }
  }, [property, lease]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!property) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProperty(property.id, {
      value: num(value),
      municipalTax: num(municipalTax),
      buildingFee: num(buildingFee),
      electricityMeter: electricityMeter.trim(),
      status,
    });
    if (lease && rent) updateLease(lease.id, { monthlyRent: num(rent) });
    onClose();
  };

  return (
    <Modal open={!!property} onClose={onClose} title="עריכת נכס" description={`${property.address}, ${property.city}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="שווי (₪)" inputProps={{ value, onChange: (e) => setValue(e.target.value), inputMode: "numeric" }} />
          <FormField label="שכר דירה (₪)" inputProps={{ value: rent, onChange: (e) => setRent(e.target.value), inputMode: "numeric" }} />
          <FormField label="ארנונה (₪)" inputProps={{ value: municipalTax, onChange: (e) => setMunicipalTax(e.target.value), inputMode: "numeric" }} />
          <FormField label="ועד בית (₪)" inputProps={{ value: buildingFee, onChange: (e) => setBuildingFee(e.target.value), inputMode: "numeric" }} />
          <FormField label="מונה חשמל" inputProps={{ value: electricityMeter, onChange: (e) => setElectricityMeter(e.target.value) }} />
          <FormField label="סטטוס">
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
        <Button type="submit" fullWidth size="lg">שמירת שינויים</Button>
      </form>
    </Modal>
  );
}
