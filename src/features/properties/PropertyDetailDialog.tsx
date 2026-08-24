"use client";

import { useState } from "react";
import {
  Bath,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  FileText,
  IdCard,
  Layers,
  Mail,
  Pencil,
  Phone,
  Plus,
  Ruler,
  Users,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { UtilityAccountDetails } from "@/features/utilities/UtilityAccountDetails";
import { useData } from "@/lib/store";
import { cn, formatCurrency, formatDateDots } from "@/lib/utils";
import { PROPERTY_STATUS_LABELS } from "@/lib/portfolio";
import type { CheckDepositMode, Payment, PaymentStatus, Property } from "@/types";

const statusLabels = PROPERTY_STATUS_LABELS;

const depositModeLabel: Record<CheckDepositMode, string> = {
  client: "הפקדה אצל הלקוח",
  client_confirm: "הפקדה אצל הלקוח · אישור פרעון",
  company: "הפקדה בחברה",
};

const paymentStatusLabel: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "שולם", tone: "success" },
  due: { label: "לתשלום", tone: "warning" },
  upcoming: { label: "צפוי", tone: "neutral" },
  overdue: { label: "באיחור", tone: "danger" },
};

function PropertyHero({ property }: { property: Property }) {
  const photos = (property.photoUrls ?? []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const safeIndex = photos.length ? Math.min(index, photos.length - 1) : 0;
  const cover = photos[safeIndex];
  const floorLabel = property.floor === 0 ? "קומת קרקע" : `קומה ${property.floor}`;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl">
        <PropertyImage
          variant={property.imageId}
          src={cover}
          className="h-48 w-full"
          rounded="rounded-2xl"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/80 via-navy/30 to-transparent px-3.5 pb-3.5 pt-16">
          <p className="text-base font-extrabold text-white">
            {property.address}, {property.city}
          </p>
          <p className="text-xs text-white/85">
            דירה {property.apartmentNumber} • {floorLabel}
          </p>
        </div>
        <div className="absolute start-3 top-3">
          <StatusBadge tone="neutral" className="border border-border/60 bg-white/95 text-navy shadow-sm backdrop-blur">
            {statusLabels[property.status]}
          </StatusBadge>
        </div>
      </div>
      {photos.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
          {photos.map((src, i) => (
            <button
              key={`${i}-${src.slice(-24)}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`תמונה ${i + 1}`}
              aria-current={i === safeIndex}
              className={cn(
                "h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-1 ring-offset-surface",
                i === safeIndex ? "ring-orange" : "ring-transparent",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spec({ icon: Icon, value }: { icon: typeof Bath; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 py-1">
      <Icon className="h-5 w-5 text-orange" strokeWidth={1.8} />
      <span className="text-xs font-bold text-navy">{value}</span>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Bath; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.7rem] leading-tight text-text-muted">{label}</p>
        <p className="truncate text-sm font-bold leading-tight text-navy">{value}</p>
      </div>
    </div>
  );
}

interface PropertyDetailDialogProps {
  property: Property | null;
  onClose: () => void;
  /** When provided, shows an edit button (manager/assistant). */
  onEdit?: (property: Property) => void;
  /** Allow confirming check clearance (manager / landlord). */
  canConfirmClearance?: boolean;
}

export function PropertyDetailDialog({
  property,
  onClose,
  onEdit,
  canConfirmClearance = false,
}: PropertyDetailDialogProps) {
  const { leases, tenants, landlords, tickets, payments, users, confirmPaymentClearance } = useData();
  if (!property) return null;
  const lease = leases.find((l) => l.propertyId === property.id && l.active)
    ?? leases.find((l) => l.propertyId === property.id);
  const tenant =
    (lease ? tenants.find((t) => t.id === lease.tenantId) : undefined)
    ?? tenants.find((t) => t.id === property.tenantId)
    ?? tenants.find((t) => t.propertyId === property.id);
  const landlord = landlords.find((l) => l.id === property.landlordId);
  const openTickets = tickets.filter((t) => t.propertyId === property.id && t.status !== "resolved");
  const depositMode: CheckDepositMode = landlord?.checkDepositMode ?? "client";

  const leasePayments = (lease
    ? payments.filter((p) => p.leaseId === lease.id)
    : []
  ).slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const floorLabel = property.floor === 0 ? "קומת קרקע" : `קומה ${property.floor}`;

  return (
    <Modal
      open={!!property}
      onClose={onClose}
      title="פרטי נכס"
      description={undefined}
      className="max-h-[90dvh] overflow-y-auto"
    >
      <div className="relative space-y-5 pb-14">
        {/* Hero — address only */}
        <PropertyHero key={property.id} property={property} />

        {/* 1. מפרט דירה — רק שורת האייקונים */}
        <section className="space-y-2">
          <p className="text-sm font-bold text-navy">מפרט דירה</p>
          <div className="flex items-center rounded-2xl bg-surface-muted p-2">
            <Spec icon={Layers} value={floorLabel} />
            <span className="h-8 w-px bg-border" />
            <Spec icon={Ruler} value={`${property.sizeSqm} מ״ר`} />
            <span className="h-8 w-px bg-border" />
            <Spec icon={BedDouble} value={`${property.rooms} חדרים`} />
            <span className="h-8 w-px bg-border" />
            <Spec icon={Bath} value={`${property.bathrooms} רחצה`} />
          </div>
        </section>

        {/* 2. פרטי שוכר */}
        <section className="space-y-2">
          <p className="text-sm font-bold text-navy">פרטי שוכר</p>
          {tenant ? (
            <div className="card space-y-3 p-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={tenant.fullName}
                  avatarUrl={users.find((u) => u.tenantId === tenant.id)?.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">{tenant.fullName}</p>
                  {lease && (
                    <p className="text-[0.7rem] text-text-muted">נכנס: {formatDateDots(lease.startDate)}</p>
                  )}
                </div>
                {tenant.phone && (
                  <a
                    href={`tel:${tenant.phone}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-dark"
                  >
                    <Phone className="h-4 w-4" />
                    צור קשר
                  </a>
                )}
              </div>
              <div className="space-y-1.5 border-t border-border pt-2.5">
                <TenantMeta icon={IdCard} label="מס׳ ת״ז" value={tenant.idNumber} ltr />
                <TenantMeta icon={Phone} label="טלפון" value={tenant.phone} ltr />
                <TenantMeta icon={Mail} label="מייל" value={tenant.email} ltr />
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
              אין שוכר פעיל בנכס זה
            </p>
          )}
        </section>

        {/* 3. השאר — פרטי תשלומים/מונים, שווי, וכו׳ */}
        <div className="grid grid-cols-2 gap-2">
          <DetailRow icon={FileText} label="ארנונה (לחודש)" value={formatCurrency(property.municipalTax)} />
          <DetailRow icon={Users} label="ועד בית" value={formatCurrency(property.buildingFee)} />
        </div>

        <UtilityAccountDetails
          property={property}
          hideLocation
          heading="מונים וחשבונות"
          hint="לחצו על פרט כדי להעתיק אותו."
        />

        <div className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
          <span className="text-sm text-text-muted">שווי נכס</span>
          <span className="text-lg font-extrabold text-navy">{formatCurrency(property.value)}</span>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-navy">תשלומים וצ׳קים</p>
            <span className="text-[0.7rem] text-text-muted">{depositModeLabel[depositMode]}</span>
          </div>
          {leasePayments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
              אין רשומות תשלום לנכס זה
            </p>
          ) : (
            <div className="card divide-y divide-border">
              {leasePayments.map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  depositMode={depositMode}
                  canConfirm={canConfirmClearance}
                  onConfirm={() => confirmPaymentClearance(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        {openTickets.length > 0 && (
          <section>
            <p className="mb-2 text-sm font-bold text-navy">
              קריאות שירות פתוחות ({openTickets.length})
            </p>
            <div className="card divide-y divide-border">
              {openTickets.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy">{t.title}</p>
                    {t.createdAt && (
                      <p className="text-[0.7rem] text-text-muted">נפתחה: {formatDateDots(t.createdAt)}</p>
                    )}
                  </div>
                  <StatusBadge tone={t.status === "in_progress" ? "warning" : "danger"}>
                    {t.status === "in_progress" ? "בביצוע" : "דחוף"}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <p className="text-sm font-bold text-navy">ניהול</p>
          {landlord && (
            <p className="text-sm text-text-muted">
              משכיר: <span className="font-semibold text-navy">{landlord.fullName}</span>
            </p>
          )}
          {lease && (
            <div className="rounded-2xl bg-surface-muted p-3">
              <div className="space-y-1.5 text-sm">
                <Line label="שכר דירה חודשי" value={formatCurrency(lease.monthlyRent)} />
                <Line
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="תחילת חוזה"
                  value={formatDateDots(lease.startDate)}
                />
                <Line
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="סיום חוזה"
                  value={formatDateDots(lease.endDate)}
                  valueClass="text-orange"
                />
                {lease.managementEndDate && (
                  <Line label="סיום הסכם ניהול" value={formatDateDots(lease.managementEndDate)} />
                )}
                {lease.managementFeePercent != null && (
                  <Line label="דמי ניהול" value={`${lease.managementFeePercent}%`} />
                )}
                <Line label="מצב הפקדת צ׳קים" value={depositModeLabel[depositMode]} />
              </div>
            </div>
          )}
        </section>

        {onEdit && (
          <>
            <Button variant="outline" fullWidth onClick={() => onEdit(property)}>
              <Pencil className="h-5 w-5" />
              עריכת פרטי הנכס
            </Button>
            <button
              type="button"
              onClick={() => onEdit(property)}
              aria-label="עריכת נכס"
              className="fab"
            >
              <Plus className="h-7 w-7" strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function PaymentRow({
  payment,
  depositMode,
  canConfirm,
  onConfirm,
}: {
  payment: Payment;
  depositMode: CheckDepositMode;
  canConfirm: boolean;
  onConfirm: () => void;
}) {
  const meta = paymentStatusLabel[payment.status];
  const showConfirm =
    canConfirm &&
    (depositMode === "client_confirm" || depositMode === "company") &&
    payment.method === "check" &&
    !payment.clearanceConfirmed &&
    payment.status !== "upcoming";

  const monthLabel = new Date(payment.dueDate).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{monthLabel}</p>
          <p className="text-[0.7rem] text-text-muted">
            {formatDateDots(payment.dueDate)}
            {payment.method === "check" && payment.checkNumber
              ? ` · צ׳ק ${payment.checkNumber}`
              : payment.method === "transfer"
                ? " · העברה"
                : ""}
            {payment.depositDate ? ` · הפקדה ${formatDateDots(payment.depositDate)}` : ""}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold text-navy">{formatCurrency(payment.amount)}</span>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </span>
      </div>
      {payment.clearanceConfirmed && (
        <p className="flex items-center gap-1 text-[0.7rem] text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          פרעון אושר
          {payment.clearanceConfirmedAt
            ? ` · ${formatDateDots(payment.clearanceConfirmedAt)}`
            : ""}
        </p>
      )}
      {showConfirm && (
        <Button variant="outline" onClick={onConfirm}>
          אישור פרעון צ׳ק
        </Button>
      )}
    </div>
  );
}

function TenantMeta({
  icon: Icon,
  label,
  value,
  ltr,
}: {
  icon: typeof Bath;
  label: string;
  value?: string;
  ltr?: boolean;
}) {
  const display = value?.trim() ? value : "—";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex shrink-0 items-center gap-1.5 text-text-muted">
        <Icon className="h-3.5 w-3.5 text-orange" />
        {label}
      </span>
      <span className="min-w-0 truncate font-semibold text-navy" dir={ltr ? "ltr" : undefined}>
        {display}
      </span>
    </div>
  );
}

function Line({
  icon,
  label,
  value,
  valueClass = "text-navy",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-text-muted">
        {icon}
        {label}
      </span>
      <span className={"font-semibold " + valueClass}>{value}</span>
    </div>
  );
}
