"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Building2,
  FileSearch,
  FileSignature,
  MessagesSquare,
  Plus,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import { BrandHeader } from "@/components/dashboard/BrandHeader";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { PropertyCard } from "@/components/dashboard/PropertyCard";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Toast } from "@/components/ui/Toast";
import { Cityscape } from "@/components/brand/Cityscape";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { DocumentsDialog } from "@/features/documents/DocumentsDialog";
import { SignatureDialog } from "@/features/documents/SignatureDialog";
import {
  AddClientModal,
  type MockClient,
} from "@/features/manager/AddClientModal";
import { getProperty, managerSummary } from "@/lib/mock-data";
import { storage } from "@/lib/storage";
import { useSession } from "@/lib/useSession";
import { formatCurrency } from "@/lib/utils";

export default function ManagerDashboard() {
  const { session } = useSession("manager");
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [clients, setClients] = useState<MockClient[]>([]);

  const featured = getProperty("p_4")!;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setClients(storage.getItem<MockClient[]>(storage.keys.clients, []));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const metrics = [
    { icon: Building2, value: managerSummary.properties, label: "נכסים" },
    { icon: Building, value: managerSummary.landlords, label: "משכירים" },
    { icon: Users, value: managerSummary.tenants, label: "שוכרים" },
    { icon: Wrench, value: managerSummary.openTickets, label: "תקלות פתוחות" },
  ];

  const actions = [
    { icon: FileSignature, title: "חתימות דיגיטליות", subtitle: "שליחת מסמכים לחתימה", onClick: () => setSignOpen(true) },
    { icon: FileSearch, title: "תצוגת חתימות", subtitle: "צפייה במסמכים חתומים", onClick: () => setDocsOpen(true) },
    { icon: UsersRound, title: "תצוגת משכירים", subtitle: "רשימת המשכירים שלי", onClick: () => setToast("נטען: תצוגת משכירים") },
    { icon: Users, title: "תצוגת שוכרים", subtitle: "רשימת השוכרים שלי", onClick: () => setToast("נטען: תצוגת שוכרים") },
    { icon: MessagesSquare, title: "צ׳אט עם כל הצדדים", subtitle: "שיחה עם משכירים ושוכרים", onClick: () => setChatOpen(true) },
    { icon: Wrench, title: "ניהול קריאות ותקלות", subtitle: "מעקב וטיפול בקריאות", onClick: () => setToast("נטען: ניהול קריאות ותקלות") },
  ];

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col pb-8">
      <div className="relative rounded-b-3xl pb-14">
        <Cityscape className="rounded-b-3xl" />
        <div className="relative">
          <BrandHeader
            tone="navy"
            onMenu={() => setMenuOpen(true)}
          />
          <DashboardHero
            title="דשבורד מנהל"
            subtitle="ברוכים הבאים למערכת הניהול"
            tone="navy"
            className="pb-2 pt-1"
          />
        </div>
      </div>

      {/* Metrics overlap the navy header */}
      <div className="-mt-10 grid grid-cols-4 gap-2.5 px-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="mt-5 space-y-5 px-4">
        <section className="space-y-3">
          <SectionHeader title="לקוחות קיימים" />
          <PropertyCard
            property={featured}
            onClick={() => setToast("נפתחו פרטי הנכס")}
          />
          {clients.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-bold text-navy">
                  <Building2 className="h-4 w-4 text-orange" />
                  {c.address}, {c.city}
                </h3>
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                  חדש
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-[0.7rem] text-text-muted">משכיר</p>
                  <p className="font-semibold text-navy">{c.landlordName}</p>
                </div>
                <div>
                  <p className="text-[0.7rem] text-text-muted">שוכר</p>
                  <p className="font-semibold text-navy">{c.tenantName}</p>
                </div>
                <div>
                  <p className="text-[0.7rem] text-text-muted">שכ״ד חודשי</p>
                  <p className="font-semibold text-navy">
                    {formatCurrency(Number(c.monthlyRent) || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Big add-client CTA */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-orange px-5 py-4 text-start text-white shadow transition-colors hover:bg-orange-dark"
        >
          <div>
            <p className="text-lg font-bold">הזנת לקוח חדש</p>
            <p className="text-sm text-white/85">הוספת נכס, משכיר ושוכר חדשים</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </span>
        </button>

        <section className="grid grid-cols-3 gap-2.5">
          {actions.map((a) => (
            <ActionCard key={a.title} {...a} />
          ))}
        </section>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role="manager"
        userName={session.fullName}
      />
      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(c) => setClients((prev) => [c, ...prev])}
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} title="צ׳אט עם כל הצדדים" peerName="משכירים ושוכרים" />
      <DocumentsDialog open={docsOpen} onClose={() => setDocsOpen(false)} />
      <SignatureDialog open={signOpen} onClose={() => setSignOpen(false)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </main>
  );
}
