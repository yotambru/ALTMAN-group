"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useData } from "@/lib/store";
import type { AppDocument } from "@/types";

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  /** The document being signed. When provided, the signature is recorded. */
  document?: AppDocument | null;
  /** Name pre-filled / used as the legal signer. */
  signerName?: string;
  onSigned?: () => void;
}

/** Digital-signature flow: type name, confirm, and record the signature. */
export function SignatureDialog({
  open,
  onClose,
  document,
  signerName = "",
  onSigned,
}: SignatureDialogProps) {
  const { signDocument } = useData();
  const [name, setName] = useState(signerName);
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) setName(signerName);
  }, [open, signerName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const documentName = document?.name ?? "מסמך לחתימה";

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setAgreed(false);
      setSigned(false);
    }, 200);
  };

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !agreed) return;
    if (document) signDocument(document.id, name.trim());
    setSigned(true);
    onSigned?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="חתימה דיגיטלית"
      description={signed ? undefined : documentName}
    >
      {signed ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">המסמך נחתם בהצלחה</h4>
          <p className="text-sm text-text-muted">עותק חתום נשמר בכספת המסמכים שלך.</p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSign} className="space-y-4">
          <div className="rounded-xl bg-surface-muted p-4 text-sm text-text-muted">
            אני מאשר/ת כי קראתי את המסמך <b className="text-navy">{documentName}</b>{" "}
            וכי חתימתי הדיגיטלית מהווה הסכמה מחייבת לתנאיו.
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy">
              חתימה (הקלד/י את שמך המלא)
            </label>
            <div className="relative">
              <PenLine className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-orange" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם מלא"
                className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 font-[cursive] text-lg text-navy focus:border-orange focus:outline-none"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--orange)]"
            />
            אני מסכים/ה לתנאי המסמך
          </label>

          <Button type="submit" fullWidth size="lg" disabled={!name.trim() || !agreed}>
            חתום ואשר
          </Button>
        </form>
      )}
    </Modal>
  );
}
