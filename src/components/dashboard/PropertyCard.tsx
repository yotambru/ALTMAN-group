import {
  Bath,
  Building2,
  ChevronLeft,
  FileText,
  ReceiptText,
  Users,
  Zap,
} from "lucide-react";
import type { Property } from "@/types";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, formatCurrency } from "@/lib/utils";
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_TONES } from "@/lib/portfolio";

const statusLabels = PROPERTY_STATUS_LABELS;

const statusRing: Record<string, string> = {
  success: "ring-navy/20",
  warning: "ring-navy/20",
  navy: "ring-navy/20",
  danger: "ring-navy/20",
  neutral: "ring-border",
};

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.62rem] leading-tight text-text-muted">{label}</p>
        <p className="text-[0.8rem] font-bold leading-tight text-navy">
          {value}
        </p>
      </div>
    </div>
  );
}

/** Detailed property card used on the manager dashboard. */
export function PropertyCard({
  property,
  onClick,
}: {
  property: Property;
  onClick?: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-base font-bold text-navy">
              <Building2 className="h-4 w-4 text-orange" />
              <span className="truncate">
                {property.address}, {property.city}
              </span>
            </h3>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            דירה {property.apartmentNumber} • {property.sizeSqm} מ&quot;ר • קומה{" "}
            {property.floor}
          </p>
          <div className="mt-2">
            <StatusBadge tone={PROPERTY_STATUS_TONES[property.status]}>
              {statusLabels[property.status]}
            </StatusBadge>
          </div>
        </div>
        <PropertyImage
          variant={property.imageId}
          src={property.photoUrls?.[0]}
          className="h-20 w-24 shrink-0"
          rounded="rounded-xl"
        />
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-3 border-t border-border px-4 py-3">
        <Stat
          icon={<ReceiptText className="h-4 w-4" />}
          label="שווי נכס"
          value={formatCurrency(property.value)}
        />
        <Stat
          icon={<FileText className="h-4 w-4" />}
          label="ארנונה (לחודש)"
          value={formatCurrency(property.municipalTax)}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="ועד בית"
          value={formatCurrency(property.buildingFee)}
        />
        <Stat
          icon={<Bath className="h-4 w-4" />}
          label="חדרי רחצה"
          value={String(property.bathrooms)}
        />
        <Stat
          icon={<Zap className="h-4 w-4" />}
          label="מספר מונה חשמל"
          value={property.electricityMeter}
        />
      </div>

      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="w-full border-t border-border py-2.5 text-sm font-bold text-orange hover:bg-orange-soft"
        >
          לפרטי הנכס
        </button>
      )}
    </div>
  );
}

/**
 * Polished property row — circular thumb, status, clear value hierarchy.
 */
export function PropertyRow({
  property,
  meta,
  rent,
  tenantName,
  onClick,
}: {
  property: Property;
  /** Fallback secondary line when rent/tenant aren't provided. */
  meta?: string;
  rent?: number;
  tenantName?: string;
  onClick?: () => void;
}) {
  const tone = PROPERTY_STATUS_TONES[property.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-start transition-all hover:bg-surface-muted/90 active:scale-[0.995]"
    >
      <span
        className={cn(
          "relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted ring-[3px] ring-offset-2 ring-offset-surface",
          statusRing[tone] ?? statusRing.neutral,
        )}
      >
        <PropertyImage
          variant={property.imageId}
          src={property.photoUrls?.[0]}
          className="h-full w-full"
          rounded="rounded-full"
          muted
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[0.98rem] font-extrabold tracking-tight text-navy">
            {property.address}, {property.city}
          </p>
          <StatusBadge tone={tone} className="shrink-0 px-2 py-0.5 text-[0.65rem]">
            {statusLabels[property.status]}
          </StatusBadge>
        </div>

        {rent !== undefined || tenantName || meta ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.78rem]">
            <span className="font-bold tabular-nums text-navy/85">
              {formatCurrency(property.value)}
            </span>
            {rent !== undefined && (
              <>
                <span className="text-border">·</span>
                <span className="font-semibold text-orange">
                  {formatCurrency(rent)}
                  <span className="font-medium text-text-muted"> / חודש</span>
                </span>
              </>
            )}
            {rent === undefined && !tenantName && meta && (
              <>
                <span className="text-border">·</span>
                <span className="text-text-muted">{meta}</span>
              </>
            )}
            {tenantName && (
              <>
                <span className="text-border">·</span>
                <span className="text-text-muted">{tenantName}</span>
              </>
            )}
          </div>
        ) : (
          <p className="mt-1 text-[0.78rem] text-text-muted">
            דירה {property.apartmentNumber} · {property.sizeSqm} מ&quot;ר
          </p>
        )}
      </div>

      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted text-navy/35 transition-colors group-hover:bg-orange-soft group-hover:text-orange">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </span>
    </button>
  );
}

/** Compact property tile for the landlord horizontal scroller. */
export function PropertyMiniCard({
  property,
  onClick,
}: {
  property: Property;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-40 shrink-0 overflow-hidden text-start transition-shadow hover:shadow"
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <p className="truncate text-sm font-bold text-navy">
          {property.address}
        </p>
      </div>
      <div className="flex items-center gap-1 px-3 pb-2 pt-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-[0.7rem] font-semibold text-success">פעיל</span>
        <span className="text-[0.7rem] text-text-muted">• {property.city}</span>
      </div>
      <PropertyImage
        variant={property.imageId}
        src={property.photoUrls?.[0]}
        className="mx-3 h-20"
        rounded="rounded-lg"
      />
      <div className="px-3 py-2.5">
        <p className="text-[0.7rem] text-text-muted">שווי משוער</p>
        <p className="text-sm font-extrabold text-navy">
          {formatCurrency(property.value)}
        </p>
      </div>
    </button>
  );
}
