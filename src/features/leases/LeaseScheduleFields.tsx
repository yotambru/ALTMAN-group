"use client";

import { FormField } from "@/components/ui/FormField";
import { alignPeriodRents, buildLeasePeriods } from "@/lib/lease-periods";
import { formatCurrency } from "@/lib/utils";

interface LeaseScheduleFieldsProps {
  startDate: string;
  endDate: string;
  onDatesChange: (start: string, end: string) => void;
  periodRents: string[];
  onPeriodRentsChange: (rents: string[]) => void;
  listedRentHint?: string;
  startRequired?: boolean;
  className?: string;
}

/** Start/end dates plus one rent field per yearly lease period. */
export function LeaseScheduleFields({
  startDate,
  endDate,
  onDatesChange,
  periodRents,
  onPeriodRentsChange,
  listedRentHint = "",
  startRequired = true,
  className,
}: LeaseScheduleFieldsProps) {
  const periods = startDate ? buildLeasePeriods(startDate, endDate || undefined) : [];
  const rentFields = alignPeriodRents(periodRents, Math.max(periods.length, 1), listedRentHint);
  const listedHint =
    listedRentHint && Number(listedRentHint) > 0
      ? `שכ״ד מבוקש בנכס: ${formatCurrency(Number(listedRentHint))}`
      : undefined;

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

      {periods.length > 1 ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-3">
          <div>
            <p className="text-sm font-semibold text-navy">דמי שכירות לפי תקופות</p>
            <p className="mt-0.5 text-[0.7rem] text-text-muted">
              החוזה משתרע על {periods.length} תקופות שנתיות — הזינו שכר דירה לכל תקופה
            </p>
          </div>
          {periods.map((period, i) => (
            <FormField
              key={period.startDate}
              label={`שכ״ד · ${period.label}`}
              inputProps={{
                value: rentFields[i] ?? "",
                onChange: (e) => {
                  const next = alignPeriodRents(periodRents, periods.length, listedRentHint);
                  onPeriodRentsChange(
                    next.map((value, index) => (index === i ? e.target.value : value)),
                  );
                },
                inputMode: "numeric",
                required: true,
                placeholder: listedRentHint || "₪",
              }}
            />
          ))}
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
