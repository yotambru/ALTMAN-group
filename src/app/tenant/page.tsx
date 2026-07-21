"use client";

import { useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  LogOut,
  MessagesSquare,
  PenLine,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BrandHeader } from "@/components/dashboard/BrandHeader";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PaymentCard } from "@/components/dashboard/PaymentCard";
import {
  BottomNavigation,
  type BottomTab,
} from "@/components/dashboard/BottomNavigation";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { Cityscape } from "@/components/brand/Cityscape";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { TicketModal } from "@/features/maintenance/TicketModal";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { SignatureDialog } from "@/features/documents/SignatureDialog";
import { getProperty, notifications } from "@/lib/mock-data";
import { useSession } from "@/lib/useSession";
import { formatDateDots } from "@/lib/utils";

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex w-full items-center gap-3 p-4 text-start transition-shadow hover:shadow"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-soft text-orange">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-navy">{title}</p>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
      {trailing ?? <ChevronLeft className="h-5 w-5 shrink-0 text-text-muted" />}
    </button>
  );
}

export default function TenantDashboard() {
  const { session, logout } = useSession("tenant");
  const [tab, setTab] = useState<BottomTab>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const property = getProperty("p_5")!;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col">
      <div className="relative rounded-b-3xl pb-6">
        <Cityscape className="rounded-b-3xl" />
        <div className="relative">
          <BrandHeader tone="navy" onMenu={() => setMenuOpen(true)} />
          <DashboardHero
            title="דשבורד שוכר"
            subtitle={`שלום ${session.fullName}, ברוך שובך!`}
            tone="navy"
            underline
            className="pb-2 pt-1"
          />
        </div>
      </div>

      <div className="flex-1">
        {tab === "dashboard" && (
          <div className="space-y-5 px-4 pt-4">
            {/* Active property */}
            <section className="card p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-navy">
                    {property.address}, {property.city}
                  </h2>
                  <p className="mt-0.5 text-sm text-text-muted">
                    דירה {property.apartmentNumber}, קומה {property.floor}
                  </p>
                  <div className="mt-3">
                    <StatusBadge
                      tone="success"
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    >
                      הדירה פעילה
                    </StatusBadge>
                  </div>
                </div>
                <PropertyImage
                  variant={property.imageId}
                  className="h-24 w-28 shrink-0"
                  rounded="rounded-xl"
                />
              </div>
            </section>

            {/* Payments */}
            <section className="space-y-3">
              <SectionHeader title="תשלומים" />
              <div className="grid grid-cols-2 gap-3">
                <PaymentCard
                  icon={Wallet}
                  label="כמה משלם"
                  value="₪6,250"
                  sublabel="דמי שכירות חודשיים"
                />
                <PaymentCard
                  icon={CalendarDays}
                  label="מתי יורד הצ׳ק"
                  value="01/06/2025"
                  sublabel="בעוד 5 ימים"
                />
              </div>
            </section>

            {/* Actions */}
            <section className="space-y-3">
              <ActionRow
                icon={Wrench}
                title="פתיחת תקלה"
                subtitle="דווח על בעיה או תקלה בנכס"
                onClick={() => setTicketOpen(true)}
              />
              <ActionRow
                icon={MessagesSquare}
                title="צ׳אט עם מנהל"
                subtitle="שלח הודעה למנהל הנכס"
                onClick={() => setChatOpen(true)}
              />
              <ActionRow
                icon={CalendarClock}
                title="מתי נגמר החוזה"
                subtitle="בעוד 3 חודשים"
                trailing={
                  <span className="text-sm font-extrabold text-orange">
                    01/09/2026
                  </span>
                }
                onClick={() => setToast("פרטי החוזה נטענים")}
              />
              <ActionRow
                icon={PenLine}
                title="חתימה דיגיטלית"
                subtitle="צפה וחתום על מסמכים"
                onClick={() => setSignOpen(true)}
              />
            </section>
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3 px-4 pt-4">
            <SectionHeader title="הודעות" />
            {notifications.map((n) => (
              <div key={n.id} className="card flex items-start gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
                  <Bell className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-navy">{n.title}</p>
                    {!n.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-orange" />
                    )}
                  </div>
                  <p className="text-sm text-text-muted">{n.body}</p>
                  <p className="mt-1 text-[0.7rem] text-text-muted">
                    {formatDateDots(n.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && (
          <div className="space-y-4 px-4 pt-4">
            <SectionHeader title="פרופיל" />
            <div className="card flex flex-col items-center gap-2 p-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-navy text-2xl font-bold text-white">
                {session.fullName.charAt(0)}
              </span>
              <p className="text-lg font-bold text-navy">{session.fullName}</p>
              <p className="text-sm text-text-muted">שוכר</p>
              <p className="mt-1 text-sm text-text">
                {property.address}, {property.city}
              </p>
            </div>
            <Button variant="outline" fullWidth onClick={logout}>
              <LogOut className="h-5 w-5" />
              התנתקות
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation
        active={tab}
        onChange={setTab}
        notificationCount={unread}
      />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role="tenant"
        userName={session.fullName}
      />
      <TicketModal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        propertyId={property.id}
        createdById={session.fullName}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <SignatureDialog open={signOpen} onClose={() => setSignOpen(false)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </main>
  );
}
