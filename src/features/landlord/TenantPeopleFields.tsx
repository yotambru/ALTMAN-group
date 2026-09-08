"use client";

import { FormField } from "@/components/ui/FormField";

export interface TenantPersonForm {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
}

interface TenantPeopleFieldsProps {
  primary: TenantPersonForm;
  secondary: TenantPersonForm;
  onPrimaryChange: (next: TenantPersonForm) => void;
  onSecondaryChange: (next: TenantPersonForm) => void;
  primaryEmailRequired?: boolean;
  className?: string;
}

/** Primary + optional co-tenant (בעל/אישה) contact and login emails. */
export function TenantPeopleFields({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
  primaryEmailRequired = true,
  className,
}: TenantPeopleFieldsProps) {
  return (
    <div className={className ?? "space-y-4"}>
      <PersonBlock
        title="שוכר 1"
        hint="בעל/אישה — חשבון הכניסה הראשי"
        person={primary}
        onChange={onPrimaryChange}
        emailRequired={primaryEmailRequired}
        emailHint="מייל כניסה — יישלח מייל הזמנה"
      />
      <PersonBlock
        title="שוכר 2"
        hint="אופציונלי — גם לו/לה יישלח מייל הזמנה אם יוזן מייל"
        person={secondary}
        onChange={onSecondaryChange}
        emailRequired={false}
        emailHint="מייל כניסה נפרד לבן/בת הזוג"
      />
    </div>
  );
}

function PersonBlock({
  title,
  hint,
  person,
  onChange,
  emailRequired,
  emailHint,
}: {
  title: string;
  hint: string;
  person: TenantPersonForm;
  onChange: (next: TenantPersonForm) => void;
  emailRequired: boolean;
  emailHint: string;
}) {
  const patch = (partial: Partial<TenantPersonForm>) => onChange({ ...person, ...partial });

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-3">
      <div>
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="mt-0.5 text-[0.7rem] text-text-muted">{hint}</p>
      </div>
      <FormField
        label="מייל"
        hint={emailHint}
        inputProps={{
          value: person.email,
          onChange: (e) => patch({ email: e.target.value }),
          type: "email",
          inputMode: "email",
          dir: "ltr",
          required: emailRequired,
          autoComplete: "email",
        }}
      />
      <FormField
        label="שם מלא"
        hint="אופציונלי"
        inputProps={{
          value: person.name,
          onChange: (e) => patch({ name: e.target.value }),
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="טלפון"
          hint="אופציונלי"
          inputProps={{
            value: person.phone,
            onChange: (e) => patch({ phone: e.target.value }),
            inputMode: "tel",
            dir: "ltr",
          }}
        />
        <FormField
          label="מס׳ ת״ז"
          hint="אופציונלי"
          inputProps={{
            value: person.idNumber,
            onChange: (e) => patch({ idNumber: e.target.value }),
            inputMode: "numeric",
            dir: "ltr",
          }}
        />
      </div>
    </div>
  );
}

export const emptyTenantPerson = (): TenantPersonForm => ({
  name: "",
  email: "",
  phone: "",
  idNumber: "",
});
