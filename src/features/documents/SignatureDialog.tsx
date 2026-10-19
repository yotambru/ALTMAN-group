"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DocumentFilePreview } from "@/features/documents/DocumentPreviewDialog";
import { canSignDocument, packSignature } from "@/lib/document-signing";
import { useData } from "@/lib/store";
import { storage } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/client";
import { uploadDataUrl } from "@/lib/supabase/files";
import type { AppDocument } from "@/types";

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  document?: AppDocument | null;
  signerName?: string;
  onSigned?: () => void;
}

/** Re-auth, then an on-screen signature saved with the document. */
export function SignatureDialog({
  open,
  onClose,
  document,
  signerName = "",
  onSigned,
}: SignatureDialogProps) {
  const { signDocument, documents } = useData();
  const [name, setName] = useState(signerName);
  const [password, setPassword] = useState("");
  const [ink, setInk] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const liveDoc = document ? (documents.find((d) => d.id === document.id) ?? document) : null;
  const signerId = storage.getSession()?.userId;
  const allowed = liveDoc ? canSignDocument(liveDoc, signerId) : false;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setName(signerName);
    setPassword("");
    setInk(null);
    setSigned(false);
    setError("");
  }, [open, signerName, document?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const documentName = liveDoc?.name ?? "מסמך לחתימה";

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSigned(false);
      setError("");
      setPassword("");
    }, 200);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password || !ink || busy) return;
    if (!liveDoc || !allowed) {
      setError("לא ניתן לחתום על המסמך. פנו למשרד.");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("אין חיבור לשרת. לא ניתן לאמת את החתימה.");
      return;
    }
    setBusy(true);
    setError("");
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setBusy(false);
      setError("לא נמצא חשבון מחובר לאימות.");
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setBusy(false);
      setError("הסיסמה שגויה. החתימה לא נשמרה.");
      return;
    }
    const url = await uploadDataUrl(ink, `signatures/${liveDoc.id}-${Date.now()}`);
    if (!url || url.startsWith("data:")) {
      setBusy(false);
      setError("שמירת החתימה נכשלה. בדקו את החיבור ונסו שוב.");
      return;
    }
    signDocument(liveDoc.id, packSignature(name.trim(), url));
    setBusy(false);
    setSigned(true);
    onSigned?.();
  };

  return (
    <Modal open={open} onClose={handleClose} title="חתימה דיגיטלית" description={signed ? undefined : documentName}>
      {signed ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h4 className="text-lg font-bold text-navy">המסמך נחתם בהצלחה</h4>
          <p className="text-sm text-text-muted">הזהות אומתה והחתימה נשמרה על המסמך.</p>
          <Button onClick={handleClose} fullWidth className="mt-2">
            סגירה
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSign(e)} className="space-y-4">
          <DocumentFilePreview document={liveDoc} compact />

          <div className="rounded-xl bg-surface-muted p-4 text-sm text-text-muted">
            אני מאשר/ת כי קראתי את המסמך <b className="text-navy">{documentName}</b> וכי החתימה על המסך מהווה הסכמה מחייבת.
          </div>

          <label className="block text-sm font-semibold text-navy">
            שם מלא
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-navy focus:border-orange focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-navy">
            סיסמה לאימות
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-navy focus:border-orange focus:outline-none"
            />
          </label>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-navy">חתימה על המסך</p>
            <SignaturePad resetKey={document?.id ?? ""} onChange={setInk} />
          </div>

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={!name.trim() || !password || !ink || !allowed || busy}>
            {busy ? "מאמת…" : "חתום ואשר"}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function SignaturePad({
  resetKey,
  onChange,
}: {
  resetKey: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#14285a";
    ctx.clearRect(0, 0, width, height);
    onChange(null);
  }, [resetKey, onChange]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className="h-36 w-full touch-none rounded-xl border border-border bg-white"
      aria-label="משטח חתימה"
    />
  );
}
