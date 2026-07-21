"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { storage } from "@/lib/storage";
import { generateId } from "@/lib/utils";

export interface MockClient {
  id: string;
  address: string;
  city: string;
  landlordName: string;
  tenantName: string;
  monthlyRent: string;
  createdAt: string;
}

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: MockClient) => void;
}

/** Manager form that adds a new mock client (property + landlord + tenant). */
export function AddClientModal({ open, onClose, onCreated }: AddClientModalProps) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [done, setDone] = useState(false);

  const reset = () => {
    setAddress("");
    setCity("");
    setLandlordName("");
    setTenantName("");
    setMonthlyRent("");
    setDone(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !city.trim()) return;
    const client: MockClient = {
      id: generateId("client"),
      address: address.trim(),
      city: city.trim(),
      landlordName: landlordName.trim() || "לא צויין",
      tenantName: tenantName.trim() || "לא צויין",
      monthlyRent: monthlyRent.trim() || "0",
      createdAt: new Date().toISOString(),
    };
    const existing = storage.getItem<MockClient[]>(storage.keys.clients, []);
    storage.setItem(storage.keys.clients, [client, ...existing]);
    onCreated(client);
    setDone(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="הזנת לקוח חדש"
      description={done ? undefined : "הוספת נכס, משכיר ושוכר חדשים למערכת"}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">הלקוח נוסף בהצלחה</h4>
          <p className="text-sm text-text-muted">
            הנכס החדש מופיע כעת ברשימת הלקוחות הקיימים.
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="כתובת הנכס"
              inputProps={{
                value: address,
                onChange: (e) => setAddress(e.target.value),
                placeholder: "רחוב ומספר",
                required: true,
              }}
            />
            <FormField
              label="עיר"
              inputProps={{
                value: city,
                onChange: (e) => setCity(e.target.value),
                placeholder: "עיר",
                required: true,
              }}
            />
          </div>
          <FormField
            label="שם המשכיר"
            inputProps={{
              value: landlordName,
              onChange: (e) => setLandlordName(e.target.value),
              placeholder: "שם מלא",
            }}
          />
          <FormField
            label="שם השוכר"
            inputProps={{
              value: tenantName,
              onChange: (e) => setTenantName(e.target.value),
              placeholder: "שם מלא",
            }}
          />
          <FormField
            label="שכר דירה חודשי (₪)"
            inputProps={{
              value: monthlyRent,
              onChange: (e) => setMonthlyRent(e.target.value),
              inputMode: "numeric",
              placeholder: "לדוגמה: 6000",
            }}
          />
          <Button type="submit" fullWidth size="lg">
            הוספת לקוח
          </Button>
        </form>
      )}
    </Modal>
  );
}
