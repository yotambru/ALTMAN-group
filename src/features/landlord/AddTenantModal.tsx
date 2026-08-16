"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { emailInUse, isValidEmail } from "@/lib/auth";
import { useData } from "@/lib/store";
import type { Property } from "@/types";

interface AddTenantModalProps {
  open: boolean;
  onClose: () => void;
  properties: Property[];
}

/** Landlord (or manager) opens a tenant login by email only — no password. */
export function AddTenantModal({ open, onClose, properties }: AddTenantModalProps) {
  const { addTenant, landlords, tenants, users } = useData();
  const vacant = properties.filter((p) => !p.tenantId);
  const [done, setDone] = useState(false);
  const [propertyId, setPropertyId] = useState(vacant[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const selectedPropertyId = vacant.some((p) => p.id === propertyId)
    ? propertyId
    : (vacant[0]?.id ?? "");

  const reset = () => {
    setDone(false);
    setPropertyId(vacant[0]?.id ?? "");
    setEmail("");
    setName("");
    setPhone("");
    setError("");
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      setError("יש לבחור נכס פנוי.");
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
    addTenant({
      propertyId: selectedPropertyId,
      email,
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setDone(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="שוכר חדש"
      description={done ? undefined : "מזינים רק מייל. השוכר יקבע סיסמה בכניסה הראשונה"}
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
      ) : vacant.length === 0 ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-text-muted">
            אין נכס פנוי לשוכר חדש. כשיתווסף נכס פנוי אפשר לפתוח כאן חשבון שוכר.
          </p>
          <Button type="button" variant="outline" fullWidth onClick={handleClose}>
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="נכס">
            <select
              value={selectedPropertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
            >
              {vacant.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}
                  {p.apartmentNumber ? ` · דירה ${p.apartmentNumber}` : ""}
                  {p.city ? `, ${p.city}` : ""}
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
          {error && (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth size="lg">
            פתיחת חשבון שוכר
          </Button>
        </form>
      )}
    </Modal>
  );
}
