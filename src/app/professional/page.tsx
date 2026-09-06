"use client";

import { useRef, useState } from "react";
import { CalendarClock, CheckCircle2, FileText, ListChecks, MapPin, Receipt, Upload, Wrench } from "lucide-react";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { HeroStatCard } from "@/components/dashboard/HeroStatCard";
import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { NotificationsTab } from "@/components/dashboard/NotificationsTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { appBottomNavItems, type AppTab } from "@/components/dashboard/appNav";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/useSession";
import { useData } from "@/lib/store";
import { fileToDataUrl, formatDateDots } from "@/lib/utils";
import type { MaintenanceTicket, TicketStatus } from "@/types";

const statusMeta: Record<TicketStatus, { label: string; tone: "success" | "warning" | "navy" }> = {
  open: { label: "פתוחה", tone: "warning" },
  in_progress: { label: "בטיפול", tone: "navy" },
  resolved: { label: "טופלה", tone: "success" },
};

export default function ProfessionalDashboard() {
  const { session, user, ready, logout } = useSession("professional");
  const { tickets, properties, professionals, documents, notifications, setTicketStatus, attachTicketInvoice } =
    useData();
  const [tab, setTab] = useState<AppTab>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const professionalId = session.professionalId ?? "pr_1";
  const me = professionals.find((p) => p.id === professionalId);
  const myJobs = tickets.filter((t) => t.assignedProfessionalId === professionalId);
  const openJobs = myJobs.filter((t) => t.status === "open");
  const inProgress = myJobs.filter((t) => t.status === "in_progress");
  const active = myJobs.filter((t) => t.status !== "resolved");
  const resolved = myJobs.filter((t) => t.status === "resolved").length;
  const myInvoices = myJobs.flatMap((t) => {
    const doc = t.invoiceDocId ? documents.find((d) => d.id === t.invoiceDocId) : undefined;
    return doc ? [{ ticket: t, doc }] : [];
  });
  const firstName = session.fullName.trim().split(/\s+/)[0] || session.fullName;
  const unread = notifications.filter(
    (n) => !n.read && (n.forUserId === user.id || n.forRole === "professional"),
  ).length;

  const onNav = (id: string) => {
    const next = id as AppTab;
    if (next === "dashboard" && tab === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setTab(next);
  };

  if (!ready) return null;

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col bg-surface-muted">
      {tab === "dashboard" ? (
        <div className="dusk-header">
          <DashboardTopBar
            tone="dusk"
            greeting={`שלום, ${firstName}`}
            subtitle={me?.trade ? `${me.trade} · הקריאות שלך` : "הקריאות שלך"}
            onMenu={() => setMenuOpen(true)}
            onBell={() => setTab("notifications")}
            notificationCount={unread}
          />
          <div className="px-4 pb-6 pt-1">
            <HeroStatCard
              tone="glass"
              label="קריאות פעילות"
              value={String(active.length)}
              subtitle={`${resolved} קריאות שטופלו`}
            />
          </div>
        </div>
      ) : (
        <DashboardTopBar
          tone="brand"
          onMenu={() => setMenuOpen(true)}
          onProfile={() => setTab("profile")}
        />
      )}

      <div className="flex-1">
        {tab === "dashboard" && (
          <div className="dash-sheet space-y-5 px-4 pb-8 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={Wrench}
                label="פתוחות"
                value={openJobs.length}
                sublabel="ממתינות להתחלה"
              />
              <MetricCard
                icon={ListChecks}
                label="בטיפול"
                value={inProgress.length}
                sublabel="בעבודה כעת"
              />
              <MetricCard
                icon={CheckCircle2}
                label="טופלו"
                value={resolved}
                sublabel="סה״כ שהושלמו"
              />
              <MetricCard
                icon={CalendarClock}
                label="סה״כ קריאות"
                value={myJobs.length}
                sublabel="משויכות אליך"
              />
            </div>

            <section className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border">
              <SectionHeader title="הקריאות שלי" />
              {myJobs.length === 0 && (
                <p className="py-8 text-center text-sm text-text-muted">אין קריאות משויכות כרגע.</p>
              )}
              <div className="mt-1 divide-y divide-border">
                {myJobs.map((t) => {
                  const property = properties.find((p) => p.id === t.propertyId);
                  const invoice = t.invoiceDocId ? documents.find((d) => d.id === t.invoiceDocId) : undefined;
                  return (
                    <div key={t.id} className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold text-navy">
                            <Wrench className="h-4 w-4 shrink-0 text-orange" />
                            {t.title}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">{t.category}</p>
                        </div>
                        <StatusBadge tone={statusMeta[t.status].tone}>{statusMeta[t.status].label}</StatusBadge>
                      </div>
                      {t.description && <p className="mt-2 text-sm text-text">{t.description}</p>}
                      {property && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                          <MapPin className="h-4 w-4" />
                          {property.address}, {property.city}
                        </p>
                      )}
                      {t.scheduledAt && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                          <CalendarClock className="h-4 w-4" />
                          מועד טיפול: {formatDateDots(t.scheduledAt)}
                        </p>
                      )}
                      <TicketInvoiceActions
                        ticket={t}
                        invoiceName={invoice?.name}
                        invoiceUrl={invoice?.fileDataUrl}
                        onUpload={async (file) => {
                          const dataUrl = await fileToDataUrl(file);
                          attachTicketInvoice(t.id, {
                            name: `חשבונית — ${t.title}`,
                            dataUrl,
                          });
                        }}
                      />
                      {t.status !== "resolved" && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {t.status === "open" && (
                            <Button variant="navy" onClick={() => setTicketStatus(t.id, "in_progress")}>
                              התחלת טיפול
                            </Button>
                          )}
                          <Button
                            onClick={() => setTicketStatus(t.id, "resolved")}
                            className={t.status === "open" ? "" : "col-span-2"}
                          >
                            סימון כטופל
                          </Button>
                        </div>
                      )}
                      {t.status === "resolved" && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          טופלה
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-3 px-4 pb-8 pt-2">
            <SectionHeader title="מסמכים" onBack={() => onNav("dashboard")} />
            {myInvoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                חשבוניות הקריאות יופיעו כאן לאחר העלאה.
              </p>
            ) : (
              <div className="space-y-2">
                {myInvoices.map(({ ticket, doc }) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy">{doc.name}</p>
                      <p className="text-[0.7rem] text-text-muted">
                        {ticket.title} · {formatDateDots(doc.createdAt)}
                      </p>
                    </div>
                    {doc.fileDataUrl && (
                      <a
                        href={doc.fileDataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-orange hover:bg-orange-soft"
                      >
                        צפייה
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <NotificationsTab
            forUserId={user.id}
            forRole="professional"
            onBack={() => onNav("dashboard")}
          />
        )}

        {tab === "profile" && (
          <ProfileTab
            userId={user.id}
            fullName={session.fullName}
            role="professional"
            detail={me?.trade}
            onLogout={logout}
            onBack={() => onNav("dashboard")}
          />
        )}
      </div>

      <BottomNavigation items={appBottomNavItems(unread)} active={tab} onSelect={onNav} />

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="professional" userName={session.fullName} avatarUrl={user.avatarUrl} />
    </main>
  );
}

function TicketInvoiceActions({
  ticket,
  invoiceName,
  invoiceUrl,
  onUpload,
}: {
  ticket: MaintenanceTicket;
  invoiceName?: string;
  invoiceUrl?: string;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        aria-label={`העלאת חשבונית ל${ticket.title}`}
        onChange={(e) => void handlePick(e.target.files?.[0])}
      />
      {invoiceName ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/60 p-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">{invoiceName}</p>
            <p className="text-[0.7rem] text-text-muted">חשבונית מצורפת</p>
          </div>
          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-orange hover:bg-orange-soft"
            >
              צפייה
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 px-2.5 text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            החלפה
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          fullWidth
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {uploading ? "מעלה…" : "העלאת חשבונית"}
        </Button>
      )}
    </div>
  );
}
