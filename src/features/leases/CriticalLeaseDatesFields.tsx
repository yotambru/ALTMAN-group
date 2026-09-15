"use client";

import { FormField } from "@/components/ui/FormField";

export interface CriticalLeaseDates {
  guaranteeExpiry: string;
  optionDate: string;
  insuranceRenewalDate: string;
}

interface CriticalLeaseDatesFieldsProps {
  value: CriticalLeaseDates;
  onChange: (next: CriticalLeaseDates) => void;
  className?: string;
}

/** Optional critical dates that feed the 90-day alerts (ערבות / אופציה / ביטוח). */
export function CriticalLeaseDatesFields({
  value,
  onChange,
  className,
}: CriticalLeaseDatesFieldsProps) {
  const patch = (key: keyof CriticalLeaseDates, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className={className ?? "space-y-3 rounded-xl border border-border bg-surface-muted/40 p-3"}>
      <div>
        <p className="text-sm font-semibold text-navy">מועדים קריטיים</p>
        <p className="mt-0.5 text-[0.7rem] text-text-muted">
          תזכורות יופיעו בהתראות הקריטיות ב־90 הימים שלפני המועד
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField
          label="חידוש ערבות בנקאית"
          hint="אופציונלי"
          inputProps={{
            type: "date",
            value: value.guaranteeExpiry,
            onChange: (e) => patch("guaranteeExpiry", e.target.value),
          }}
        />
        <FormField
          label="מימוש אופציה"
          hint="אופציונלי"
          inputProps={{
            type: "date",
            value: value.optionDate,
            onChange: (e) => patch("optionDate", e.target.value),
          }}
        />
        <FormField
          label="חידוש ביטוח"
          hint="אופציונלי"
          inputProps={{
            type: "date",
            value: value.insuranceRenewalDate,
            onChange: (e) => patch("insuranceRenewalDate", e.target.value),
          }}
        />
      </div>
    </div>
  );
}

export const emptyCriticalLeaseDates = (): CriticalLeaseDates => ({
  guaranteeExpiry: "",
  optionDate: "",
  insuranceRenewalDate: "",
});
