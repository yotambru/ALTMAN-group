"use client";

import { useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  documentName?: string;
}

/** Mock digital-signature flow: type name, confirm, success state. */
export function SignatureDialog({
  open,
  onClose,
  documentName = "נספח חידוש חוזה",
}: SignatureDialogProps) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setName("");
      setAgreed(false);
      setSigned(false);
    }, 200);
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
          <p className="text-sm text-text-muted">
            עותק חתום נשמר בכספת המסמכים שלך.
          </p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && agreed) setSigned(true);
          }}
          className="space-y-4"
        >
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

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={!name.trim() || !agreed}
          >
            חתום ואשר
          </Button>
        </form>
      )}
    </Modal>
  );
}
