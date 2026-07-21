"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  FileText,
  Home,
  Info,
  MessagesSquare,
  PenLine,
  ShieldCheck,
  Vault,
} from "lucide-react";
import { BrandHeader } from "@/components/dashboard/BrandHeader";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { PropertyMiniCard } from "@/components/dashboard/PropertyCard";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Toast } from "@/components/ui/Toast";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { DocumentsDialog } from "@/features/documents/DocumentsDialog";
import { SignatureDialog } from "@/features/documents/SignatureDialog";
import { NotificationsPanel } from "@/features/notifications/NotificationsPanel";
import {
  getLeaseByProperty,
  getProperty,
  getTenant,
  landlordSummary,
  properties,
} from "@/lib/mock-data";
import { useSession } from "@/lib/useSession";
import { formatCurrency, formatDateDots } from "@/lib/utils";

export default function LandlordDashboard() {
  const { session } = useSession("landlord");
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const rentalIds = ["p_1", "p_2", "p_3"];
  const rentals = rentalIds
    .map((id) => {
      const property = getProperty(id)!;
      const lease = getLeaseByProperty(id)!;
      const tenant = getTenant(lease.tenantId)!;
      return { property, lease, tenant };
    })
    .filter(Boolean);

  const portfolio = properties.slice(0, 3);

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col pb-8">
      <BrandHeader
        tone="light"
        onMenu={() => setMenuOpen(true)}
        onBell={() => setNotifOpen(true)}
        notificationCount={2}
      />
      <DashboardHero
        title="דשבורד משכיר"
        subtitle={`שלום, ${session.fullName}`}
        tone="light"
        className="pb-3 pt-1"
      />

      <div className="space-y-5 px-4">
        {/* Portfolio hero card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-navy-dark to-navy-light p-4 text-white shadow">
          <div className="flex items-center gap-4">
            <PropertyImage
              variant="tower"
              className="h-24 w-28 shrink-0"
              rounded="rounded-xl"
            />
            <div className="flex-1 text-start">
              <p className="text-sm text-white/80">שווי נכסים כולל</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">
                {formatCurrency(landlordSummary.totalValue)}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-white/70">
                <Info className="h-3.5 w-3.5" />
                עודכן ב-{formatDateDots(landlordSummary.updatedAt)}
              </p>
            </div>
          </div>
          <span className="absolute bottom-0 end-0 h-1 w-24 rounded-full bg-orange" />
        </section>

        {/* Summary metrics */}
        <section className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Home}
            value={landlordSummary.activeProperties}
            label="נכסים פעילים"
            sublabel={`מתוך ${landlordSummary.totalProperties} נכסים`}
          />
          <MetricCard
            icon={CalendarDays}
            value={formatCurrency(landlordSummary.expectedIncome)}
            label="הכנסות שכירות צפויות"
            sublabel="ב-30 הימים הקרובים"
          />
        </section>

        {/* Rentals management */}
        <section className="space-y-3">
          <SectionHeader title="ניהול שכירויות" />
          <div className="card divide-y divide-border">
            {rentals.map(({ property, lease, tenant }) => (
              <div key={property.id} className="flex items-center gap-3 p-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-orange" />
                <PropertyImage
                  variant={property.imageId}
                  className="h-11 w-11 shrink-0"
                  rounded="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">
                    {property.address}, ת״א
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    שוכר: {tenant.fullName}
                  </p>
                </div>
                <div className="text-center text-xs text-text-muted">
                  {formatDateDots(lease.startDate)}
                </div>
                <div className="text-sm font-extrabold text-orange">
                  {formatCurrency(lease.monthlyRent)}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setToast("נטען: כל השכירויות")}
              className="flex w-full items-center justify-center gap-1 py-3 text-sm font-bold text-orange hover:bg-orange-soft"
            >
              צפייה בכל השכירויות
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Properties showcase */}
        <section className="space-y-3">
          <SectionHeader
            title="תצוגת נכסים"
            action={
              <button
                onClick={() => setToast("נטען: כל הנכסים")}
                className="flex items-center gap-1 text-sm font-semibold text-orange"
              >
                לכל הנכסים
                <ChevronLeft className="h-4 w-4" />
              </button>
            }
          />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {portfolio.map((property) => (
              <PropertyMiniCard
                key={property.id}
                property={property}
                onClick={() => setToast(`נפתח: ${property.address}`)}
              />
            ))}
          </div>
        </section>

        {/* Action grid */}
        <section className="grid grid-cols-2 gap-3">
          <ActionCard
            icon={Vault}
            title="כספת מסמכים"
            subtitle="חוזים, אישורים, תו״ז ועוד"
            onClick={() => setDocsOpen(true)}
          />
          <ActionCard
            icon={FileText}
            title="דוח שנתי"
            subtitle="צפה והורד דוח שנתי לנכסים"
            onClick={() => setToast("הדוח השנתי בהכנה")}
          />
          <ActionCard
            icon={PenLine}
            title="חתימה דיגיטלית"
            subtitle="חתום על מסמכים בצורה מאובטחת"
            onClick={() => setSignOpen(true)}
          />
          <ActionCard
            icon={MessagesSquare}
            title="צ׳אט עם מנהל"
            subtitle="צור קשר עם מנהל הנכסים שלך"
            onClick={() => setChatOpen(true)}
          />
        </section>

        {/* Security footer */}
        <div className="flex items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-white">
          <ShieldCheck className="h-6 w-6 shrink-0 text-orange" />
          <div>
            <p className="text-sm font-bold">הנתונים שלך מאובטחים</p>
            <p className="text-xs text-white/70">
              אנחנו מחויבים להגנה מקסימלית על המידע שלך
            </p>
          </div>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role="landlord"
        userName={session.fullName}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <DocumentsDialog open={docsOpen} onClose={() => setDocsOpen(false)} />
      <SignatureDialog open={signOpen} onClose={() => setSignOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </main>
  );
}
