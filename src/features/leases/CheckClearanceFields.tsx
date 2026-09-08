"use client";

import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  alignPeriodRents,
  buildLeasePeriods,
  rentScheduleFromPeriods,
} from "@/lib/lease-periods";
import { buildCheckDrafts, type CheckDraft } from "@/lib/check-schedule";
import { formatCurrency } from "@/lib/utils";

interface CheckClearanceFieldsProps {
  leaseStartDate: string;
  leaseEndDate: string;
  periodRents: string[];
  rows: CheckDraft[];
  onRowsChange: (rows: CheckDraft[]) => void;
  /** When false, keep loaded rows until the user changes the first date / rebuilds. */
  autoRebuild?: boolean;
}

const parseMoney = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;

function draftsEqual(a: CheckDraft[], b: CheckDraft[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (row, i) =>
      row.clearanceDate === b[i]?.clearanceDate &&
      row.amount === b[i]?.amount &&
      row.checkNumber === b[i]?.checkNumber,
  );
}

/** Post-dated check schedule collected when opening a tenant. */
export function CheckClearanceFields({
  leaseStartDate,
  leaseEndDate,
  periodRents,
  rows,
  onRowsChange,
  autoRebuild = true,
}: CheckClearanceFieldsProps) {
  const firstDate = rows[0]?.clearanceDate || leaseStartDate;
  const firstCheckNumber = rows[0]?.checkNumber ?? "";
  const lockedRef = useRef(false);
  const onRowsChangeRef = useRef(onRowsChange);

  useEffect(() => {
    onRowsChangeRef.current = onRowsChange;
  }, [onRowsChange]);

  const scheduleFromLease = () => {
    if (!leaseStartDate) return { startingMonthlyRent: 0, rentAdjustments: undefined as undefined };
    const periods = buildLeasePeriods(leaseStartDate, leaseEndDate || undefined);
    const rents = alignPeriodRents(periodRents, Math.max(periods.length, 1)).map(parseMoney);
    const schedule = rentScheduleFromPeriods(periods, rents);
    return {
      startingMonthlyRent: schedule.startingMonthlyRent,
      rentAdjustments: schedule.rentAdjustments.length ? schedule.rentAdjustments : undefined,
    };
  };

  const rebuild = (nextFirst = firstDate, nextCheckNumber = firstCheckNumber) => {
    if (!nextFirst) {
      onRowsChangeRef.current([]);
      return;
    }
    const schedule = scheduleFromLease();
    onRowsChangeRef.current(
      buildCheckDrafts({
        firstDate: nextFirst,
        endDate: leaseEndDate || undefined,
        startingMonthlyRent: schedule.startingMonthlyRent,
        rentAdjustments: schedule.rentAdjustments,
        firstCheckNumber: nextCheckNumber,
      }),
    );
  };

  useEffect(() => {
    if (!autoRebuild || lockedRef.current || !leaseStartDate) return;
    const schedule = scheduleFromLease();
    const generated = buildCheckDrafts({
      firstDate: rows[0]?.clearanceDate || leaseStartDate,
      endDate: leaseEndDate || undefined,
      startingMonthlyRent: schedule.startingMonthlyRent,
      rentAdjustments: schedule.rentAdjustments,
      firstCheckNumber: rows[0]?.checkNumber,
    });
    if (!draftsEqual(rows, generated)) onRowsChangeRef.current(generated);
    // Rebuild when lease dates / rents change; skip after the user edits individual rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRebuild, leaseStartDate, leaseEndDate, periodRents.join("|")]);

  const updateRow = (index: number, patch: Partial<CheckDraft>) => {
    lockedRef.current = true;
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const total = rows.reduce((sum, row) => sum + parseMoney(row.amount), 0);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-3">
      <div>
        <p className="text-sm font-semibold text-navy">לוח פרעון צ׳קים</p>
        <p className="mt-0.5 text-[0.7rem] text-text-muted">
          אם לא מזינים תאריך אחר, הפרעון הוא באותו יום בחודש כמו תחילת החוזה — למשל כניסה ב־10, הפרעון בכל 10 לחודש
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="תאריך פרעון ראשון"
          inputProps={{
            type: "date",
            value: firstDate,
            onChange: (e) => {
              lockedRef.current = false;
              rebuild(e.target.value, firstCheckNumber);
            },
          }}
        />
        <FormField
          label="מס׳ צ׳ק ראשון"
          hint="אופציונלי"
          inputProps={{
            value: firstCheckNumber,
            dir: "ltr",
            inputMode: "numeric",
            onChange: (e) => {
              lockedRef.current = false;
              rebuild(firstDate, e.target.value);
            },
          }}
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_auto] gap-2 px-0.5 text-[0.7rem] font-semibold text-text-muted">
            <span>תאריך פרעון</span>
            <span>סכום</span>
            <span>מס׳ צ׳ק</span>
            <span className="sr-only">מחיקה</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={`${row.clearanceDate}-${index}`}
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_auto] items-center gap-2"
            >
              <input
                type="date"
                aria-label={`תאריך פרעון ${index + 1}`}
                value={row.clearanceDate}
                onChange={(e) => updateRow(index, { clearanceDate: e.target.value })}
                className="w-full rounded-xl border bg-surface px-2.5 py-2.5 text-sm text-text focus:border-orange focus:outline-none"
              />
              <input
                inputMode="numeric"
                aria-label={`סכום צ׳ק ${index + 1}`}
                value={row.amount}
                onChange={(e) => updateRow(index, { amount: e.target.value })}
                className="w-full rounded-xl border bg-surface px-2.5 py-2.5 text-sm text-text focus:border-orange focus:outline-none"
              />
              <input
                dir="ltr"
                inputMode="numeric"
                aria-label={`מספר צ׳ק ${index + 1}`}
                value={row.checkNumber}
                onChange={(e) => updateRow(index, { checkNumber: e.target.value })}
                className="w-full rounded-xl border bg-surface px-2 py-2.5 text-sm text-text focus:border-orange focus:outline-none"
              />
              <button
                type="button"
                aria-label={`מחיקת צ׳ק ${index + 1}`}
                onClick={() => {
                  lockedRef.current = true;
                  onRowsChange(rows.filter((_, i) => i !== index));
                }}
                className="grid h-10 w-10 place-items-center rounded-full text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <p className="text-end text-[0.7rem] font-semibold text-navy">
            סה״כ {rows.length} צ׳קים · {formatCurrency(total)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            lockedRef.current = true;
            onRowsChange([
              ...rows,
              {
                clearanceDate: rows.at(-1)?.clearanceDate || firstDate || leaseStartDate,
                amount: rows.at(-1)?.amount || "",
                checkNumber: "",
              },
            ]);
          }}
        >
          <Plus className="h-4 w-4" />
          הוספת צ׳ק
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            lockedRef.current = false;
            rebuild();
          }}
        >
          בנייה מחדש לפי תאריך ראשון
        </Button>
      </div>
    </div>
  );
}
