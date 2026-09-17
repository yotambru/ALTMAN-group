"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, ClipboardList, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { PROTOCOL_FURNITURE_LABEL, protocolPdfDataUrl } from "@/lib/protocol-pdf";
import { serializeProtocolNotes } from "@/lib/protocol-notes";
import { propertyAddressLabel, sortPropertiesByLocation } from "@/lib/portfolio";
import { propertyKeyCounts, totalKeysReceived } from "@/lib/property-keys";
import { fileToDataUrl, formatDateDots, generateId } from "@/lib/utils";
import type { ProtocolChecklistItem, ProtocolType, Property } from "@/types";

interface ProtocolDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, the picker is limited to this landlord's apartments. */
  landlordId?: string;
}

const defaultItems: ProtocolChecklistItem[] = [
  { label: "מצב כללי של הדירה", ok: true },
  { label: "מטבח", ok: true },
  { label: "חדרי רחצה ואינסטלציה", ok: true },
  { label: "חשמל ותאורה", ok: true },
  { label: "מיזוג אוויר", ok: true },
  { label: "צביעה וקירות", ok: true },
  { label: "תריסים וחלונות", ok: true },
  { label: PROTOCOL_FURNITURE_LABEL, ok: false },
];

function countInput(value: string): number {
  const n = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Digital entry/exit protocol: meters, checklist, photos, keys — then vault + dual signature. */
export function ProtocolDialog({ open, onClose, landlordId }: ProtocolDialogProps) {
  const { properties, leases, protocols, users, addProtocol, addDocument, updateProperty } = useData();
  const [mode, setMode] = useState<"list" | "create">("list");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const scopedProperties = useMemo(() => {
    const list = landlordId ? properties.filter((p) => p.landlordId === landlordId) : properties;
    return sortPropertiesByLocation(list);
  }, [properties, landlordId]);

  const scopedProtocols = useMemo(() => {
    const ids = new Set(scopedProperties.map((p) => p.id));
    return protocols.filter((p) => ids.has(p.propertyId));
  }, [protocols, scopedProperties]);

  const [propertyId, setPropertyId] = useState("");
  const [type, setType] = useState<ProtocolType>("entry");
  const [meterElectricity, setMeterElectricity] = useState("");
  const [meterWater, setMeterWater] = useState("");
  const [meterGas, setMeterGas] = useState("");
  const [meterElectricityReading, setMeterElectricityReading] = useState("");
  const [meterWaterReading, setMeterWaterReading] = useState("");
  const [meterGasReading, setMeterGasReading] = useState("");
  const [items, setItems] = useState<ProtocolChecklistItem[]>(() => defaultItems.map((it) => ({ ...it })));
  const [photos, setPhotos] = useState<string[]>([]);
  const [keysHandedOver, setKeysHandedOver] = useState(false);
  const [keysApartment, setKeysApartment] = useState("");
  const [keysStorage, setKeysStorage] = useState("");
  const [keysMailbox, setKeysMailbox] = useState("");
  const [keysNote, setKeysNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const applyProperty = (id: string) => {
    setPropertyId(id);
    const prop = scopedProperties.find((p) => p.id === id);
    if (!prop) return;
    setMeterElectricity(prop.electricityMeter?.trim() ?? "");
    setMeterWater(prop.waterMeter?.trim() ?? "");
    setMeterGas(prop.gasMeter?.trim() ?? "");
    const keys = propertyKeyCounts(prop);
    setKeysApartment(keys ? String(keys.apartment) : "");
    setKeysStorage(keys ? String(keys.storage) : "");
    setKeysMailbox(keys ? String(keys.mailbox) : "");
  };

  const selectedPropertyId = scopedProperties.some((p) => p.id === propertyId)
    ? propertyId
    : (scopedProperties[0]?.id ?? "");

  const selectedProperty: Property | undefined = scopedProperties.find((p) => p.id === selectedPropertyId);

  const reset = () => {
    setMode("list");
    setDone(false);
    setError("");
    setSaving(false);
    setType("entry");
    setMeterElectricity("");
    setMeterWater("");
    setMeterGas("");
    setMeterElectricityReading("");
    setMeterWaterReading("");
    setMeterGasReading("");
    setItems(defaultItems.map((it) => ({ ...it })));
    setPhotos([]);
    setKeysHandedOver(false);
    setKeysApartment("");
    setKeysStorage("");
    setKeysMailbox("");
    setKeysNote("");
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const selectedId = selectedPropertyId;
    const property = scopedProperties.find((p) => p.id === selectedId);
    if (!property) {
      setError("יש לבחור דירה.");
      return;
    }

    const lease =
      leases.find((l) => l.propertyId === selectedId && l.active && l.tenantId === property.tenantId) ??
      leases.find((l) => l.propertyId === selectedId && l.active);
    const tenantId = property.tenantId ?? lease?.tenantId;
    if (!tenantId) {
      setError("אין שוכר פעיל בדירה זו — לא ניתן לשלוח פרוטוקול לחתימה.");
      return;
    }

    const tenantUser = users.find((u) => u.role === "tenant" && u.tenantId === tenantId);
    if (!tenantUser) {
      setError("לא נמצא חשבון שוכר לשליחת החתימה.");
      return;
    }

    const managerUser =
      users.find((u) => u.role === "manager" && u.email) ?? users.find((u) => u.role === "manager");
    if (!managerUser) {
      setError("לא נמצא חשבון מנהל לשליחת החתימה.");
      return;
    }

    const keyCounts = {
      apartment: countInput(keysApartment),
      storage: countInput(keysStorage),
      mailbox: countInput(keysMailbox),
    };

    setSaving(true);
    try {
      const address = propertyAddressLabel(property);
      const kindLabel = type === "entry" ? "כניסה" : "יציאה";
      const dateIso = new Date().toISOString();
      const fileDataUrl = await protocolPdfDataUrl({
        type,
        address,
        dateIso,
        meterElectricity,
        meterWater,
        meterGas,
        meterElectricityReading,
        meterWaterReading,
        meterGasReading,
        items: items.map((it) => ({
          ...it,
          note: it.label === PROTOCOL_FURNITURE_LABEL && !it.ok ? undefined : it.note,
        })),
        photos,
        keysHandedOver,
        keysApartment: keysHandedOver ? keyCounts.apartment : undefined,
        keysStorage: keysHandedOver ? keyCounts.storage : undefined,
        keysMailbox: keysHandedOver ? keyCounts.mailbox : undefined,
        keysNote: keysHandedOver ? keysNote.trim() || undefined : undefined,
      });

      const tenantDocId = generateId("doc");
      const managerDocId = generateId("doc");
      const docName = `פרוטוקול ${kindLabel} — ${address}`;

      addProtocol({
        propertyId: selectedId,
        leaseId: lease?.id,
        type,
        date: dateIso,
        meterElectricity: meterElectricity || undefined,
        meterWater: meterWater || undefined,
        meterGas: meterGas || undefined,
        meterElectricityReading: meterElectricityReading.trim() || undefined,
        meterWaterReading: meterWaterReading.trim() || undefined,
        meterGasReading: meterGasReading.trim() || undefined,
        items,
        photoDataUrls: photos,
        keysHandedOver,
        keysApartment: keysHandedOver ? keyCounts.apartment : undefined,
        keysStorage: keysHandedOver ? keyCounts.storage : undefined,
        keysMailbox: keysHandedOver ? keyCounts.mailbox : undefined,
        keysNote: keysHandedOver ? keysNote.trim() || undefined : undefined,
        signedByTenant: false,
        signedByManager: false,
        notes: serializeProtocolNotes({
          docIds: [tenantDocId, managerDocId],
          meterElectricityReading: meterElectricityReading.trim() || undefined,
          meterWaterReading: meterWaterReading.trim() || undefined,
          meterGasReading: meterGasReading.trim() || undefined,
          keysApartment: keysHandedOver ? keyCounts.apartment : undefined,
          keysStorage: keysHandedOver ? keyCounts.storage : undefined,
          keysMailbox: keysHandedOver ? keyCounts.mailbox : undefined,
          keysNote: keysHandedOver ? keysNote.trim() || undefined : undefined,
        }),
      });

      if (type === "entry" && keysHandedOver) {
        updateProperty(selectedId, {
          keysApartment: keyCounts.apartment,
          keysStorage: keyCounts.storage,
          keysMailbox: keyCounts.mailbox,
          keysReceived: totalKeysReceived(keyCounts),
        });
      }

      addDocument({
        id: tenantDocId,
        name: `${docName} · חתימת שוכר`,
        type: "protocol",
        folder: "entry_protocol",
        propertyId: selectedId,
        landlordId: property.landlordId,
        tenantId,
        ownerUserId: tenantUser.id,
        fileDataUrl,
        awaitingSignature: true,
      });
      addDocument({
        id: managerDocId,
        name: `${docName} · חתימת מנהל`,
        type: "protocol",
        folder: "entry_protocol",
        propertyId: selectedId,
        landlordId: property.landlordId,
        tenantId,
        ownerUserId: managerUser.id,
        fileDataUrl,
        awaitingSignature: true,
      });
      photos.forEach((photo, index) => {
        addDocument({
          name: `צילום מונה · ${formatDateDots(new Date().toISOString())} · ${index + 1}`,
          type: "id",
          folder: "meter_photos",
          propertyId: selectedId,
          landlordId: property.landlordId,
          tenantId,
          fileDataUrl: photo,
        });
      });

      setDone(true);
    } catch {
      setError("לא הצלחנו להפיק את המסמך. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="פרוטוקול כניסה / יציאה"
      description={
        mode === "create"
          ? "צ׳קליסט דיגיטלי ליום הכניסה לדירה"
          : `${scopedProtocols.length} פרוטוקולים`
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">נשלח לחתימה</h4>
          <p className="text-sm text-text-muted">
            הפרוטוקול נשמר בתיקיית פרוטוקול כניסה של הדירה ונשלח לחתימת השוכר ולחתימת המנהל.
            {type === "entry" && keysHandedOver
              ? " מספרי המפתחות בפרטי הדירה עודכנו לפי המסירה בפועל."
              : ""}
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : mode === "list" ? (
        <>
          <Button
            fullWidth
            className="mb-3"
            onClick={() => {
              setMode("create");
              const prop = scopedProperties.find((p) => p.id === selectedPropertyId) ?? scopedProperties[0];
              if (prop) applyProperty(prop.id);
            }}
          >
            <ClipboardList className="h-5 w-5" />
            פרוטוקול חדש
          </Button>
          <div className="space-y-2">
            {scopedProtocols.length === 0 && (
              <p className="py-6 text-center text-sm text-text-muted">אין פרוטוקולים עדיין.</p>
            )}
            {scopedProtocols.map((p) => {
              const property = properties.find((pr) => pr.id === p.propertyId);
              const fullySigned = p.signedByTenant && p.signedByManager;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">
                      {property ? propertyAddressLabel(property) : "דירה"}
                    </p>
                    <p className="text-xs text-text-muted">{formatDateDots(p.date)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge tone={p.type === "entry" ? "success" : "navy"}>
                      {p.type === "entry" ? "כניסה" : "יציאה"}
                    </StatusBadge>
                    <span className="text-[11px] font-semibold text-text-muted">
                      {fullySigned ? "חתום" : "ממתין לחתימה"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="min-w-0 space-y-4">
          <FormField label="דירה">
            <select
              value={selectedPropertyId}
              onChange={(e) => applyProperty(e.target.value)}
              required
              className="w-full min-w-0 max-w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
            >
              {scopedProperties.length === 0 && <option value="">אין דירות</option>}
              {scopedProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {propertyAddressLabel(p)}
                </option>
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

          <div className="space-y-2">
            <MeterFields
              label="חשמל"
              number={meterElectricity}
              onNumber={setMeterElectricity}
              reading={meterElectricityReading}
              onReading={setMeterElectricityReading}
            />
            <MeterFields
              label="מים"
              number={meterWater}
              onNumber={setMeterWater}
              reading={meterWaterReading}
              onReading={setMeterWaterReading}
            />
            <MeterFields
              label="גז"
              number={meterGas}
              onNumber={setMeterGas}
              reading={meterGasReading}
              onReading={setMeterGasReading}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-navy">צ׳קליסט מצב הדירה</p>
            <div className="space-y-2">
              {items.map((it, idx) => {
                const isFurniture = it.label === PROTOCOL_FURNITURE_LABEL;
                const showNote = !isFurniture || it.ok;
                return (
                  <div key={it.label} className="rounded-xl border border-border p-2.5">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={it.ok}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, ok: e.target.checked, note: !e.target.checked && isFurniture ? undefined : p.note }
                                : p,
                            ),
                          )
                        }
                        className="h-4 w-4 accent-[color:var(--orange)]"
                      />
                      <span className="font-semibold text-navy">{it.label}</span>
                    </label>
                    {showNote && (
                      <input
                        value={it.note ?? ""}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, note: e.target.value } : p)),
                          )
                        }
                        placeholder="פירוט (לא חובה)"
                        className="mt-2 w-full min-w-0 rounded-lg border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:border-orange focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
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

          <div className="rounded-xl border border-border p-2.5">
            <Toggle
              label="מסירת מפתחות"
              checked={keysHandedOver}
              onChange={(next) => {
                setKeysHandedOver(next);
                if (next && selectedProperty && !keysApartment && !keysStorage && !keysMailbox) {
                  const keys = propertyKeyCounts(selectedProperty);
                  if (keys) {
                    setKeysApartment(String(keys.apartment));
                    setKeysStorage(String(keys.storage));
                    setKeysMailbox(String(keys.mailbox));
                  }
                }
              }}
            />
            {keysHandedOver && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    label="לדירה"
                    inputProps={{
                      value: keysApartment,
                      onChange: (e) => setKeysApartment(e.target.value),
                      inputMode: "numeric",
                    }}
                  />
                  <FormField
                    label="למחסן"
                    inputProps={{
                      value: keysStorage,
                      onChange: (e) => setKeysStorage(e.target.value),
                      inputMode: "numeric",
                    }}
                  />
                  <FormField
                    label="לדואר"
                    inputProps={{
                      value: keysMailbox,
                      onChange: (e) => setKeysMailbox(e.target.value),
                      inputMode: "numeric",
                    }}
                  />
                </div>
                <FormField
                  label="פירוט מסירה"
                  as="textarea"
                  textareaProps={{
                    value: keysNote,
                    onChange: (e) => setKeysNote(e.target.value),
                    placeholder: "למשל מפתח נוסף שנמסר / חסר",
                  }}
                />
                {type === "entry" && (
                  <p className="text-xs text-text-muted">
                    המספרים בפרטי הדירה יעודכנו לפי מה שנמסר בפועל ביום הכניסה.
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="rounded-xl bg-surface px-3 py-2.5 text-sm text-text-muted">
            לאחר השמירה המסמך יישלח לחתימת השוכר ולחתימת המנהל, ויישמר בתיקיית פרוטוקול כניסה של הדירה.
          </p>

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={saving}>
            {saving ? "שולח לחתימה…" : "שליחה לחתימה"}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function MeterFields({
  label,
  number,
  onNumber,
  reading,
  onReading,
}: {
  label: string;
  number: string;
  onNumber: (value: string) => void;
  reading: string;
  onReading: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-sm font-semibold text-navy">מונה {label}</p>
      <div className="grid grid-cols-2 gap-2">
        <FormField
          label="מספר מונה"
          inputProps={{
            value: number,
            onChange: (e) => onNumber(e.target.value),
            inputMode: "numeric",
            dir: "ltr",
          }}
        />
        <FormField
          label="קריאת מונה"
          hint="לפי הרשויות"
          inputProps={{
            value: reading,
            onChange: (e) => onReading(e.target.value),
            inputMode: "decimal",
            dir: "ltr",
          }}
        />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm">
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
