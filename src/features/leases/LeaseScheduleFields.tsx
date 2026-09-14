"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  addLeasePeriod,
  alignPeriodRents,
  buildLeasePeriods,
  leaseLongerThanYear,
  removeLastLeasePeriod,
  setPeriodEnd,
  type LeasePeriod,
} from "@/lib/lease-periods";
import { formatCurrency } from "@/lib/utils";

interface LeaseScheduleFieldsProps {
  startDate: string;
  endDate: string;
  onDatesChange: (start: string, end: string) => void;
  periods: LeasePeriod[];
  onPeriodsChange: (periods: LeasePeriod[]) => void;
  periodRents: string[];
  onPeriodRentsChange: (rents: string[]) => void;
  listedRentHint?: string;
  startRequired?: boolean;
  className?: string;
}

/** Start/end dates plus rent (and custom date range) per lease period. */
export function LeaseScheduleFields({
  startDate,
  endDate,
  onDatesChange,
  periods,
  onPeriodsChange,
  periodRents,
  onPeriodRentsChange,
  listedRentHint = "",
  startRequired = true,
  className,
}: LeaseScheduleFieldsProps) {
  const activePeriods = periods.length
    ? periods
    : startDate
      ? buildLeasePeriods(startDate, endDate || undefined)
      : [];
  const rentFields = alignPeriodRents(periodRents, Math.max(activePeriods.length, 1), listedRentHint);
  const listedHint =
    listedRentHint && Number(listedRentHint) > 0
      ? `שכ״ד מבוקש בנכס: ${formatCurrency(Number(listedRentHint))}`
      : undefined;
  const showPeriodDates =
    activePeriods.length > 1 || leaseLongerThanYear(startDate, endDate || undefined);

  const applyPeriods = (next: LeasePeriod[]) => {
    onPeriodsChange(next);
    onPeriodRentsChange(alignPeriodRents(periodRents, Math.max(next.length, 1), listedRentHint));
  };

  return (
    <div className={className ?? "space-y-4"}>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="תאריך תחילת שכירות"
          inputProps={{
            type: "date",
            value: startDate,
            required: startRequired,
            onChange: (e) => onDatesChange(e.target.value, endDate),
          }}
        />
        <FormField
          label="תאריך סיום חוזה"
          hint="לקביעת תקופות"
          inputProps={{
            type: "date",
            value: endDate,
            onChange: (e) => onDatesChange(startDate, e.target.value),
          }}
        />
      </div>

      {showPeriodDates ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-3">
          <div>
            <p className="text-sm font-semibold text-navy">תקופות שכירות</p>
            <p className="mt-0.5 text-[0.7rem] text-text-muted">
              בחרו מתי כל תקופה מתחילה ונגמרת. לדוגמה 15 חודשים ואז 12 — סה״כ 27 חודשים
            </p>
          </div>
          {activePeriods.map((period, i) => {
            const isLast = i === activePeriods.length - 1;
            return (
              <div key={`${period.startDate}-${i}`} className="space-y-2 rounded-xl border border-border bg-surface p-3">
                <p className="text-sm font-semibold text-navy">תקופה {period.index}</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="התחלה"
                    inputProps={{
                      type: "date",
                      value: period.startDate,
                      readOnly: i === 0,
                      onChange: (e) => {
                        if (i === 0) {
                          onDatesChange(e.target.value, endDate);
                          return;
                        }
                        applyPeriods(setPeriodEnd(activePeriods, i - 1, e.target.value, endDate));
                      },
                    }}
                  />
                  <FormField
                    label="סיום"
                    inputProps={{
                      type: "date",
                      value: period.endDate,
                      min: period.startDate,
                      max: isLast ? undefined : endDate || undefined,
                      onChange: (e) => {
                        if (isLast) {
                          onDatesChange(startDate, e.target.value);
                          return;
                        }
                        applyPeriods(setPeriodEnd(activePeriods, i, e.target.value, endDate));
                      },
                    }}
                  />
                </div>
                <FormField
                  label="שכ״ד חודשי (₪)"
                  inputProps={{
                    value: rentFields[i] ?? "",
                    onChange: (e) => {
                      const next = alignPeriodRents(periodRents, activePeriods.length, listedRentHint);
                      onPeriodRentsChange(
                        next.map((value, index) => (index === i ? e.target.value : value)),
                      );
                    },
                    inputMode: "numeric",
                    required: true,
                    placeholder: listedRentHint || "₪",
                  }}
                />
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!endDate || activePeriods.length >= 8}
              onClick={() => applyPeriods(addLeasePeriod(activePeriods))}
            >
              <Plus className="h-4 w-4" />
              הוספת תקופה
            </Button>
            {activePeriods.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyPeriods(removeLastLeasePeriod(activePeriods))}
              >
                <Trash2 className="h-4 w-4" />
                הסרת תקופה אחרונה
              </Button>
            )}
          </div>
        </div>
      ) : (
        <FormField
          label="דמי שכירות חודשיים (₪)"
          hint={listedHint}
          inputProps={{
            value: rentFields[0] ?? "",
            onChange: (e) => onPeriodRentsChange([e.target.value]),
            inputMode: "numeric",
            required: startRequired,
            placeholder: listedRentHint || undefined,
          }}
        />
      )}
    </div>
  );
}
