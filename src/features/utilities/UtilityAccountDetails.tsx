"use client";

import { useState } from "react";
import {
  Copy,
  Droplets,
  FileText,
  Flame,
  Hash,
  IdCard,
  MapPin,
  Phone,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import type { Property, Tenant } from "@/types";

interface AccountRow {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string;
  ltr?: boolean;
}

function accountRows(property: Property, hideLocation: boolean): AccountRow[] {
  const floorLabel = property.floor === 0 ? "קומת קרקע" : `קומה ${property.floor}`;
  const location: AccountRow[] = hideLocation
    ? []
    : [
        {
          id: "address",
          icon: MapPin,
          label: "כתובת מלאה",
          value: `${property.address}, דירה ${property.apartmentNumber}, ${property.city}`,
        },
        {
          id: "floor",
          icon: Hash,
          label: "קומה",
          value: floorLabel,
        },
      ];

  return [
    ...location,
    {
      id: "arnona",
      icon: FileText,
      label: "מס׳ נכס בארנונה",
      value: property.municipalPropertyNumber?.trim() ?? "",
      ltr: true,
    },
    {
      id: "electricity",
      icon: Zap,
      label: "מונה חשמל",
      value: property.electricityMeter?.trim() ?? "",
      ltr: true,
    },
    {
      id: "water",
      icon: Droplets,
      label: "מונה מים",
      value: property.waterMeter?.trim() ?? "",
      ltr: true,
    },
    {
      id: "gas",
      icon: Flame,
      label: "מונה גז",
      value: property.gasMeter?.trim() ?? "",
      ltr: true,
    },
    {
      id: "vaad",
      icon: Phone,
      label: "טלפון חברת ניהול",
      value: property.managementCompanyPhone?.trim() ?? "",
      ltr: true,
    },
  ];
}

function identityRows(tenant: Tenant): AccountRow[] {
  return [
    {
      id: "idNumber",
      icon: IdCard,
      label: "מס׳ תעודת זהות",
      value: tenant.idNumber?.trim() ?? "",
      ltr: true,
    },
    {
      id: "phone",
      icon: Phone,
      label: "טלפון השוכר",
      value: tenant.phone?.trim() ?? "",
      ltr: true,
    },
  ];
}

interface UtilityAccountDetailsProps {
  property: Property;
  /** When provided, also shows ת״ז and phone for filling transfer forms. */
  tenant?: Tenant;
  /** Hide address/floor when they already appear nearby. */
  hideLocation?: boolean;
  heading?: string;
  hint?: string;
}

/** Copyable meter / municipal identifiers for transferring utility accounts. */
export function UtilityAccountDetails({
  property,
  tenant,
  hideLocation = false,
  heading,
  hint = "לחצו על פרט כדי להעתיק אותו — להעברת החשבונות על שמכם.",
}: UtilityAccountDetailsProps) {
  const [toast, setToast] = useState<string | null>(null);
  const rows = [
    ...accountRows(property, hideLocation),
    ...(tenant ? identityRows(tenant) : []),
  ];

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`${label} הועתק`);
    } catch {
      setToast("לא הצלחנו להעתיק. נסו שוב.");
    }
  };

  return (
    <div className="space-y-2">
      {heading && <p className="text-sm font-bold text-navy">{heading}</p>}
      {hint && <p className="text-xs leading-relaxed text-text-muted">{hint}</p>}
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        {rows.map((row) => {
          const Icon = row.icon;
          const empty = !row.value;
          const content = (
            <>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-start">
                <span className="block text-[0.7rem] leading-tight text-text-muted">{row.label}</span>
                <span
                  className={
                    "block truncate text-sm font-bold leading-tight " +
                    (empty ? "text-text-muted" : "text-navy")
                  }
                  dir={row.ltr && !empty ? "ltr" : undefined}
                >
                  {empty ? "לא הוזן" : row.value}
                </span>
              </span>
              {!empty && <Copy className="h-4 w-4 shrink-0 text-text-muted" />}
            </>
          );

          if (empty) {
            return (
              <div
                key={row.id}
                className="flex items-center gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                {content}
              </div>
            );
          }

          return (
            <button
              key={row.id}
              type="button"
              onClick={() => void copy(row.value, row.label)}
              aria-label={`העתקת ${row.label}`}
              className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-start last:border-b-0 hover:bg-surface-muted/80"
            >
              {content}
            </button>
          );
        })}
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
