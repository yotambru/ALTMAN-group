"use client";

import { useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { intakeDocumentName } from "@/lib/document-folders";
import {
  alignPeriodSlots,
  buildLeasePeriods,
  type LeasePeriod,
} from "@/lib/lease-periods";
import { fileToDataUrl } from "@/lib/utils";
import type { DocumentFolder, DocumentType } from "@/types";

export interface LeasePickedFile {
  name: string;
  dataUrl: string;
}

interface LeaseContractFieldsProps {
  startDate: string;
  endDate: string;
  files: (LeasePickedFile | null)[];
  onFilesChange: (files: (LeasePickedFile | null)[]) => void;
  className?: string;
}

/** Optional lease PDF/image upload — one slot per yearly period when the lease spans multiple years. */
export function LeaseContractFields({
  startDate,
  endDate,
  files,
  onFilesChange,
  className,
}: LeaseContractFieldsProps) {
  const periods = startDate ? buildLeasePeriods(startDate, endDate || undefined) : [];
  const slots = alignPeriodSlots(files, Math.max(periods.length, 1));
  const multi = periods.length > 1;

  const setAt = (index: number, file: LeasePickedFile | null) => {
    const next = alignPeriodSlots(files, Math.max(periods.length, 1));
    next[index] = file;
    onFilesChange(next);
  };

  if (!multi) {
    return (
      <div className={className}>
        <ContractPickField
          label="הסכם שכירות"
          hint="אופציונלי"
          emptyLabel="העלאת הסכם שכירות"
          file={slots[0] ?? null}
          onPick={(f) => setAt(0, f)}
        />
      </div>
    );
  }

  return (
    <div className={className ?? "space-y-3"}>
      <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
        <p className="text-sm font-semibold text-navy">הסכמי שכירות לפי תקופות</p>
        <p className="mt-0.5 text-[0.7rem] text-text-muted">
          אפשר להעלות חוזה נפרד לכל תקופה (למשל שנה + אופציות) — לא חובה
        </p>
      </div>
      {periods.map((period, i) => (
        <ContractPickField
          key={period.startDate}
          label={`הסכם שכירות · ${period.label}`}
          hint="אופציונלי"
          emptyLabel={i === 0 ? "העלאת הסכם שכירות" : "העלאת חידוש חוזה"}
          file={slots[i] ?? null}
          onPick={(f) => setAt(i, f)}
        />
      ))}
    </div>
  );
}

/** Map optional per-period uploads into tenant documents (first → lease, rest → lease_renewal). */
export function leaseFilesToDocuments(
  periods: LeasePeriod[],
  files: (LeasePickedFile | null)[],
): Array<{
  name: string;
  type: DocumentType;
  folder: DocumentFolder;
  fileDataUrl: string;
}> {
  const multi = periods.length > 1;
  const docs: Array<{
    name: string;
    type: DocumentType;
    folder: DocumentFolder;
    fileDataUrl: string;
  }> = [];

  files.forEach((file, i) => {
    if (!file) return;
    const period = periods[i];
    const isRenewal = multi && i > 0;
    const semantic = !multi
      ? "הסכם שכירות"
      : isRenewal
        ? `חידוש הסכם שכירות — תקופה ${period?.index ?? i + 1}`
        : `הסכם שכירות — תקופה ${period?.index ?? 1}`;
    docs.push({
      name: intakeDocumentName(semantic, file.name),
      type: "contract",
      folder: isRenewal ? "lease_renewal" : "lease",
      fileDataUrl: file.dataUrl,
    });
  });

  return docs;
}

function ContractPickField({
  label,
  hint,
  emptyLabel,
  file,
  onPick,
}: {
  label: string;
  hint?: string;
  emptyLabel: string;
  file: LeasePickedFile | null;
  onPick: (f: LeasePickedFile | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = Boolean(file?.dataUrl.startsWith("data:image/"));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-navy">{label}</p>
        {hint && <p className="text-[0.7rem] text-text-muted">{hint}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          onPick({ name: f.name, dataUrl: await fileToDataUrl(f) });
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.dataUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
              <FileText className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy" dir="ltr">
              {file.name}
            </p>
            <p className="text-[0.7rem] text-success">הועלה בהצלחה</p>
          </div>
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label="הסרת קובץ"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" fullWidth onClick={() => inputRef.current?.click()}>
          <Upload className="h-5 w-5" />
          {emptyLabel}
        </Button>
      )}
    </div>
  );
}
