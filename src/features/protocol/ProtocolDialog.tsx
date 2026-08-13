"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, ClipboardList, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { fileToDataUrl, formatDateDots } from "@/lib/utils";
import type { ProtocolChecklistItem, ProtocolType } from "@/types";

interface ProtocolDialogProps {
  open: boolean;
  onClose: () => void;
}

const defaultItems: string[] = [
  "מצב כללי של הדירה",
  "מטבח ומכשירי חשמל",
  "חדרי רחצה ואינסטלציה",
  "חשמל ותאורה",
  "מיזוג אוויר",
  "צביעה וקירות",
];

/** Digital entry/exit protocol: meters, checklist, photos, keys, signatures. */
export function ProtocolDialog({ open, onClose }: ProtocolDialogProps) {
  const { properties, leases, protocols, addProtocol } = useData();
  const [mode, setMode] = useState<"list" | "create">("list");
  const [done, setDone] = useState(false);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [type, setType] = useState<ProtocolType>("entry");
  const [meterElectricity, setMeterElectricity] = useState("");
  const [meterWater, setMeterWater] = useState("");
  const [meterGas, setMeterGas] = useState("");
  const [items, setItems] = useState<ProtocolChecklistItem[]>(
    defaultItems.map((label) => ({ label, ok: true })),
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [keysHandedOver, setKeysHandedOver] = useState(false);
  const [signedTenant, setSignedTenant] = useState(false);
  const [signedManager, setSignedManager] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMode("list"); setDone(false); setType("entry");
    setMeterElectricity(""); setMeterWater(""); setMeterGas("");
    setItems(defaultItems.map((label) => ({ label, ok: true })));
    setPhotos([]); setKeysHandedOver(false); setSignedTenant(false); setSignedManager(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const lease = leases.find((l) => l.propertyId === propertyId && l.active);
    addProtocol({
      propertyId,
      leaseId: lease?.id,
      type,
      date: new Date().toISOString(),
      meterElectricity: meterElectricity || undefined,
      meterWater: meterWater || undefined,
      meterGas: meterGas || undefined,
      items,
      photoDataUrls: photos,
      keysHandedOver,
      signedByTenant: signedTenant,
      signedByManager: signedManager,
    });
    setDone(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="פרוטוקול כניסה / יציאה"
      description={mode === "create" ? "צ׳קליסט דיגיטלי" : `${protocols.length} פרוטוקולים`}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">הפרוטוקול נשמר</h4>
          <Button onClick={handleClose} fullWidth className="mt-2">סגירה</Button>
        </div>
      ) : mode === "list" ? (
        <>
          <Button fullWidth className="mb-3" onClick={() => setMode("create")}>
            <ClipboardList className="h-5 w-5" />
            פרוטוקול חדש
          </Button>
          <div className="no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto">
            {protocols.length === 0 && (
              <p className="py-6 text-center text-sm text-text-muted">אין פרוטוקולים עדיין.</p>
            )}
            {protocols.map((p) => {
              const property = properties.find((pr) => pr.id === p.propertyId);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{property?.address ?? "נכס"}</p>
                    <p className="text-xs text-text-muted">{formatDateDots(p.date)}</p>
                  </div>
                  <StatusBadge tone={p.type === "entry" ? "success" : "navy"}>
                    {p.type === "entry" ? "כניסה" : "יציאה"}
                  </StatusBadge>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="no-scrollbar max-h-[64vh] space-y-4 overflow-y-auto pe-1">
          <FormField label="נכס">
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            {(["entry", "exit"] as ProtocolType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  "rounded-xl border py-2 text-sm font-bold transition-colors " +
                  (type === t ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-muted")
                }
              >
                {t === "entry" ? "כניסה" : "יציאה"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FormField label="מונה חשמל" inputProps={{ value: meterElectricity, onChange: (e) => setMeterElectricity(e.target.value), inputMode: "numeric" }} />
            <FormField label="מונה מים" inputProps={{ value: meterWater, onChange: (e) => setMeterWater(e.target.value), inputMode: "numeric" }} />
            <FormField label="מונה גז" inputProps={{ value: meterGas, onChange: (e) => setMeterGas(e.target.value), inputMode: "numeric" }} />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-navy">צ׳קליסט מצב הדירה</p>
            <div className="space-y-1.5">
              {items.map((it, idx) => (
                <label key={it.label} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={it.ok}
                    onChange={(e) =>
                      setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, ok: e.target.checked } : p)))
                    }
                    className="h-4 w-4 accent-[color:var(--orange)]"
                  />
                  <span className="text-text">{it.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-navy">תמונות</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                const urls = await Promise.all(files.map(fileToDataUrl));
                setPhotos((prev) => [...prev, ...urls]);
              }}
            />
            <div className="flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-navy text-white"
                    aria-label="הסרה"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border text-text-muted"
              >
                <Camera className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Toggle label="מסירת מפתחות" checked={keysHandedOver} onChange={setKeysHandedOver} />
            <Toggle label="חתימת השוכר" checked={signedTenant} onChange={setSignedTenant} />
            <Toggle label="חתימת המנהל" checked={signedManager} onChange={setSignedManager} />
          </div>

          <Button type="submit" fullWidth size="lg">שמירת הפרוטוקול</Button>
        </form>
      )}
    </Modal>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-2.5 text-sm">
      <span className="font-semibold text-navy">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[color:var(--orange)]"
      />
    </label>
  );
}
