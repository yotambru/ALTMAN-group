import {
  Bath,
  Building2,
  FileText,
  ReceiptText,
  Users,
  Zap,
} from "lucide-react";
import type { Property } from "@/types";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";

const statusLabels: Record<Property["status"], string> = {
  rented: "מושכר",
  vacant: "פנוי",
  maintenance: "בטיפול",
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
        <PropertyImage
          variant={property.imageId}
          className="h-20 w-24 shrink-0"
          rounded="rounded-xl"
        />
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
            <StatusBadge tone="navy">{statusLabels[property.status]}</StatusBadge>
          </div>
        </div>
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
