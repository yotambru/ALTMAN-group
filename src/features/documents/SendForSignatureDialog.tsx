"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Send, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useData } from "@/lib/store";
import { fileToDataUrl } from "@/lib/utils";
import { roleLabels } from "@/lib/permissions";

interface SendForSignatureDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Manager uploads a document and sends it to a landlord/tenant for signing. */
export function SendForSignatureDialog({ open, onClose }: SendForSignatureDialogProps) {
  const { users, properties, addDocument } = useData();
  const [name, setName] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [fileData, setFileData] = useState<string | undefined>();
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const recipients = users.filter((u) => u.role === "landlord" || u.role === "tenant");

  const reset = () => {
    setName(""); setOwnerUserId(""); setPropertyId(""); setFileData(undefined); setFileName(""); setDone(false);
  };
  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerUserId) return;
    addDocument({
      name: name.trim(),
      type: "contract",
      propertyId: propertyId || undefined,
      ownerUserId,
      fileDataUrl: fileData,
      awaitingSignature: true,
    });
    setDone(true);
  };

  return (
    <Modal open={open} onClose={handleClose} title="שליחת מסמך לחתימה" description={done ? undefined : "העלאת מסמך ושליחתו לחתימה דיגיטלית"}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">המסמך נשלח לחתימה</h4>
          <p className="text-sm text-text-muted">הנמען יקבל התראה וימתין לחתימתו.</p>
          <Button onClick={handleClose} fullWidth className="mt-2">סגירה</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormField label="שם המסמך" inputProps={{ value: name, onChange: (e) => setName(e.target.value), placeholder: "לדוגמה: נספח חידוש חוזה", required: true }} />
          <FormField label="נמען לחתימה">
            <select
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
              required
            >
              <option value="">— בחר/י נמען —</option>
              {recipients.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} · {roleLabels[u.role]}</option>
              ))}
            </select>
          </FormField>
          <FormField label="נכס משויך (לא חובה)">
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full rounded-xl border bg-surface px-3.5 py-3 text-sm focus:border-orange focus:outline-none"
            >
              <option value="">— ללא —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
              ))}
            </select>
          </FormField>
          <div>
            <input
              ref={fileRef}
              type="file"
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
              {fileName || "העלאת קובץ (לא חובה)"}
            </Button>
          </div>
          <Button type="submit" fullWidth size="lg">
            <Send className="h-5 w-5 -scale-x-100" />
            שליחה לחתימה
          </Button>
        </form>
      )}
    </Modal>
  );
}
