"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { PropertyStatusFilter } from "@/components/dashboard/PropertyStatusFilter";
import { formatCurrency } from "@/lib/utils";
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_TONES, propertyAddressLabel, propertyDisplayValue } from "@/lib/portfolio";
import type { Property, PropertyStatus } from "@/types";

interface PropertyListDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  properties: Property[];
  onSelect: (property: Property) => void;
}

/** Scrollable list of properties; selecting a row opens its detail dialog. */
export function PropertyListDialog({
  open,
  onClose,
  title = "כל הנכסים",
  properties,
  onSelect,
}: PropertyListDialogProps) {
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");

  const counts: Partial<Record<PropertyStatus | "all", number>> = { all: properties.length };
  for (const p of properties) counts[p.status] = (counts[p.status] ?? 0) + 1;

  const visible =
    statusFilter === "all" ? properties : properties.filter((p) => p.status === statusFilter);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${visible.length} נכסים`}
    >
      <div className="mb-3">
        <PropertyStatusFilter value={statusFilter} onChange={setStatusFilter} counts={counts} />
      </div>
      <div className="no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto">
        {visible.map((property) => (
          <button
            key={property.id}
            type="button"
            onClick={() => onSelect(property)}
            className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-start transition-colors hover:bg-surface-muted"
          >
            <PropertyImage
              variant={property.imageId}
              src={property.photoUrls?.[0]}
              className="h-12 w-12 shrink-0"
              rounded="rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy">
                {propertyAddressLabel(property)}
              </p>
              <p className="truncate text-xs text-text-muted">
                {property.sizeSqm} מ״ר
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-extrabold text-navy">
                {formatCurrency(propertyDisplayValue(property))}
              </span>
              <StatusBadge tone={PROPERTY_STATUS_TONES[property.status]}>
                {PROPERTY_STATUS_LABELS[property.status]}
              </StatusBadge>
            </div>
            <ChevronLeft className="h-5 w-5 shrink-0 text-text-muted" />
          </button>
        ))}
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">אין נכסים בסטטוס זה</p>
        )}
      </div>
    </Modal>
  );
}
