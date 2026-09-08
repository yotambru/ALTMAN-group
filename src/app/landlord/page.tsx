"use client";

import { useState } from "react";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  Home,
  MessagesSquare,
  PenLine,
  Banknote,
  Vault,
  Wrench,
} from "lucide-react";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { HeroStatCard } from "@/components/dashboard/HeroStatCard";
import { FocusActions } from "@/components/dashboard/FocusActions";
import { PropertyRow } from "@/components/dashboard/PropertyCard";
import { PropertyStatusFilter } from "@/components/dashboard/PropertyStatusFilter";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MobileMenu, type MobileMenuItem } from "@/components/dashboard/MobileMenu";
import { NotificationsTab } from "@/components/dashboard/NotificationsTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { appBottomNavItems, type AppTab } from "@/components/dashboard/appNav";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { DocumentsDialog } from "@/features/documents/DocumentsDialog";
import { PropertyDetailDialog } from "@/features/properties/PropertyDetailDialog";
import { PropertyListDialog } from "@/features/properties/PropertyListDialog";
import { RentalsDialog } from "@/features/leases/RentalsDialog";
import { ChecksDialog } from "@/features/leases/ChecksDialog";
import { AnnualReportDialog } from "@/features/reports/AnnualReportDialog";
import { TicketsDialog } from "@/features/maintenance/TicketsDialog";
import { CriticalDatesDialog } from "@/features/alerts/CriticalDatesDialog";
import { WithdrawalsDialog } from "@/features/withdrawals/WithdrawalsDialog";
import { Toast } from "@/components/ui/Toast";
import { useSession } from "@/lib/useSession";
import { useData } from "@/lib/store";
import { isNotificationForAudience } from "@/lib/notifications";
import { getCriticalDates } from "@/lib/alerts";
import {
  occupancyPercent,
  formatPercent,
  propertyAddressLabel,
  propertyMonthlyIncome,
  sortPropertiesByLocation,
  summarizePortfolio,
  PORTFOLIO_YIELD_RATE,
} from "@/lib/portfolio";
import { heroIncomeChartProps } from "@/lib/hero-income-chart";
import { formatCurrency, formatDateDots } from "@/lib/utils";
import { paymentClearanceDate, upcomingCheckPayments } from "@/lib/check-schedule";
import type { AppNotification, Property, PropertyStatus } from "@/types";

type Dialog = "list" | "rentals" | "critical" | "checks" | null;
type HomePanel = "properties" | "docs" | "report" | "chat" | "tickets" | "withdrawals";

export default function LandlordDashboard() {
  const { session, user, ready, logout } = useSession("landlord");
  const { properties, leases, documents, notifications, tenants, landlords, tickets, payments } = useData();
  const landlordId = session.landlordId ?? user.landlordId ?? "l_1";

  const [tab, setTab] = useState<AppTab>("dashboard");
  const [homePanel, setHomePanel] = useState<HomePanel>("properties");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [docsCanSign, setDocsCanSign] = useState(false);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [focusWithdrawalId, setFocusWithdrawalId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const firstName = session.fullName.trim().split(/\s+/)[0] || session.fullName;

  const myProperties = sortPropertiesByLocation(
    properties.filter((p) => p.landlordId === landlordId),
  );
  const myPropertyIds = myProperties.map((p) => p.id);
  const myLeases = leases.filter(
    (l) => l.active && (l.landlordId === landlordId || myPropertyIds.includes(l.propertyId)),
  );
  const incomeChart = heroIncomeChartProps(myLeases);
  const { monthlyIncome: expectedIncome, portfolioValue } = summarizePortfolio(
    myProperties,
    myLeases,
  );
  const criticalDates = getCriticalDates(myLeases, myProperties);
  const leaseRenewals = criticalDates.filter((d) => d.kind === "lease_end" && d.daysLeft <= 30).length;
  const occupancy = occupancyPercent(myProperties);
  const rentedCount = myProperties.filter((p) => p.status === "rented").length;
  const openTicketCount = tickets.filter(
    (t) =>
      myPropertyIds.includes(t.propertyId) &&
      (t.status === "open" || t.status === "in_progress"),
  ).length;

  const statusCounts: Partial<Record<PropertyStatus | "all", number>> = { all: myProperties.length };
  for (const p of myProperties) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;

  const visibleProperties =
    statusFilter === "all"
      ? myProperties
      : myProperties.filter((p) => p.status === statusFilter);

  const myDocs = documents.filter(
    (d) => d.ownerUserId === user.id || (d.propertyId && myPropertyIds.includes(d.propertyId)),
  );
  const unread = notifications.filter(
    (n) => !n.read && isNotificationForAudience(n, user.id, "landlord"),
  ).length;

  const openPanel = (panel: HomePanel, opts?: { canSign?: boolean; withdrawalId?: string | null }) => {
    if (opts?.canSign !== undefined) setDocsCanSign(opts.canSign);
    setFocusWithdrawalId(panel === "withdrawals" ? (opts?.withdrawalId ?? null) : null);
    setHomePanel(panel);
    setTab("dashboard");
  };

  const openDocs = (canSign: boolean) => openPanel("docs", { canSign });

  const openNotification = (n: AppNotification) => {
    switch (n.kind) {
      case "chat":
        openPanel("chat");
        break;
      case "maintenance":
        openPanel("tickets");
        break;
      case "signature":
        openDocs(true);
        break;
      case "payment":
        setDialog("rentals");
        break;
      case "withdrawal":
        openPanel("withdrawals", { withdrawalId: n.relatedId ?? null });
        break;
      case "critical":
      case "reminder":
        setDialog("critical");
        break;
      default:
        setDialog(null);
        break;
    }
  };

  const myTenants = tenants.filter((t) => myPropertyIds.includes(t.propertyId));
  const myLandlordRecords = landlords.filter((l) => l.id === landlordId);
  const upcomingChecks = upcomingCheckPayments(
    payments,
    myLeases.map((lease) => lease.id),
  );
  const nextCheck = upcomingChecks[0];
  const nextCheckProperty = nextCheck
    ? myProperties.find(
        (property) => property.id === myLeases.find((lease) => lease.id === nextCheck.leaseId)?.propertyId,
      )
    : undefined;

  const menuItems: MobileMenuItem[] = [
    { icon: Building2, label: "תצוגת נכסים", onClick: () => openPanel("properties") },
    { icon: FileText, label: "שכירויות", onClick: () => setDialog("rentals") },
    { icon: Banknote, label: "פרעון צ׳קים", onClick: () => setDialog("checks") },
    { icon: Vault, label: "כספת מסמכים", onClick: () => setTab("documents") },
    { icon: FileText, label: "דוח שנתי", onClick: () => openPanel("report") },
    { icon: PenLine, label: "מסמכים לחתימה", onClick: () => openDocs(true) },
    { icon: MessagesSquare, label: "צ׳אט עם מנהל", onClick: () => openPanel("chat") },
    { icon: Banknote, label: "משיכה מיידית", onClick: () => openPanel("withdrawals") },
    { icon: Wrench, label: "סטטוס תקלות", onClick: () => openPanel("tickets") },
    { icon: CalendarDays, label: "התראות קריטיות", onClick: () => setDialog("critical") },
  ];

  const onNav = (id: string) => {
    const next = id as AppTab;
    if (next === "dashboard") {
      if (tab === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
      setHomePanel("properties");
      setDocsCanSign(false);
      setFocusWithdrawalId(null);
    }
    if (next === "documents") setDocsCanSign(false);
    setTab(next);
  };

  const panelTitles: Record<Exclude<HomePanel, "properties">, string> = {
    docs: docsCanSign ? "מסמכים לחתימה" : "מסמכים",
    report: `דוח שנתי ${new Date().getFullYear()}`,
    chat: "צ׳אט עם מנהל",
    tickets: "סטטוס תקלות",
    withdrawals: "משיכה מיידית",
  };

  if (!ready) return null;

  return (
    <DashboardFrame items={appBottomNavItems(unread)} active={tab} onSelect={onNav}>
      {tab === "dashboard" ? (
        <div className="dash-wide">
          <div className="dusk-header dash-wide-chrome">
            <DashboardTopBar
              tone="dusk"
              greeting={`שלום, ${firstName}`}
              subtitle="התיק שלך במבט אחד"
              onMenu={() => setMenuOpen(true)}
              onBell={() => setTab("notifications")}
              notificationCount={unread}
            />
            <div className="dash-wide-hero px-4 pb-6 pt-1">
              <HeroStatCard
                tone="glass"
                label="שווי נכסים כולל"
                value={formatCurrency(portfolioValue)}
                subtitle={`תפוסה ${occupancy}% · שווי לפי תשואה ${formatPercent(PORTFOLIO_YIELD_RATE * 100)}`}
                secondary={{
                  label: "הכנסה חודשית",
                  value: formatCurrency(expectedIncome),
                  sublabel: "סך דמי שכירות מכל הנכסים",
                  onClick: () => setDialog("rentals"),
                }}
                data={incomeChart.data}
                chartProgress={incomeChart.progress}
                chartStartLabel={incomeChart.chartStartLabel}
                chartEndLabel={incomeChart.chartEndLabel}
                chartPoints={incomeChart.points}
              />
            </div>
          </div>

          <div className="dash-sheet dash-wide-body space-y-5 px-4 pb-8 pt-5 lg:space-y-0">
            <div className="dash-wide-metrics grid grid-cols-2 gap-3">
              <MetricCard
                icon={Home}
                label="הנכסים שלי"
                value={myProperties.length}
                sublabel={`${rentedCount} מושכרים · תפוסה ${occupancy}%`}
                onClick={() => openPanel("properties")}
              />
              <MetricCard
                icon={CalendarCheck}
                label="חוזים לחידוש"
                value={leaseRenewals}
                sublabel="ב-30 הימים הקרובים"
                onClick={() => setDialog("critical")}
              />
              <MetricCard
                icon={Banknote}
                label="פרעון הבא"
                value={nextCheck ? formatDateDots(paymentClearanceDate(nextCheck)) : "—"}
                sublabel={
                  nextCheck
                    ? `${formatCurrency(nextCheck.amount)}${nextCheckProperty ? ` · ${propertyAddressLabel(nextCheckProperty)}` : ""}`
                    : "אין צ׳קים מתוכננים"
                }
                onClick={() => setDialog("checks")}
              />
              <MetricCard
                icon={Wrench}
                label="קריאות פתוחות"
                value={openTicketCount}
                sublabel="קריאות לטיפול"
                onClick={() => openPanel("tickets")}
              />
            </div>

            <div className="dash-wide-main space-y-5">
              <FocusActions
                title="פעולות מהירות"
                items={[
                  {
                    icon: Building2,
                    label: "נכסים",
                    active: homePanel === "properties",
                    onClick: () => openPanel("properties"),
                  },
                  {
                    icon: Vault,
                    label: "מסמכים",
                    active: homePanel === "docs" && !docsCanSign,
                    onClick: () => setTab("documents"),
                  },
                  {
                    icon: FileText,
                    label: "דוח שנתי",
                    active: homePanel === "report",
                    onClick: () => openPanel("report"),
                  },
                  {
                    icon: PenLine,
                    label: "מסמכים לחתימה",
                    active: homePanel === "docs" && docsCanSign,
                    onClick: () => openDocs(true),
                  },
                  {
                    icon: MessagesSquare,
                    label: "צ׳אט",
                    active: homePanel === "chat",
                    onClick: () => openPanel("chat"),
                  },
                  {
                    icon: Banknote,
                    label: "משיכה מיידית",
                    active: homePanel === "withdrawals",
                    onClick: () => openPanel("withdrawals"),
                  },
                ]}
              />

              <section className="space-y-1 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border">
                {homePanel === "properties" ? (
                  <>
                    <SectionHeader
                      title="פרעון צ׳קים"
                      className="mb-3"
                      action={
                        upcomingChecks.length > 3 ? (
                          <button
                            type="button"
                            onClick={() => setDialog("checks")}
                            className="text-sm font-bold text-orange"
                          >
                            הכל
                          </button>
                        ) : undefined
                      }
                    />
                    <div className="mb-4 space-y-1.5">
                      {upcomingChecks.slice(0, 3).map((payment) => {
                        const lease = myLeases.find((item) => item.id === payment.leaseId);
                        const property = myProperties.find((item) => item.id === lease?.propertyId);
                        return (
                          <button
                            key={payment.id}
                            type="button"
                            onClick={() => setDialog("checks")}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-surface-muted"
                          >
                            <span className="w-[5.5rem] shrink-0 text-sm font-bold text-navy">
                              {formatDateDots(paymentClearanceDate(payment))}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                              {property
                                ? `${property.address}${property.apartmentNumber ? ` דירה ${property.apartmentNumber}` : ""}`
                                : "נכס"}
                            </span>
                            <span className="shrink-0 text-sm font-extrabold text-orange">
                              {formatCurrency(payment.amount)}
                            </span>
                          </button>
                        );
                      })}
                      {upcomingChecks.length === 0 && (
                        <p className="px-2 py-2 text-xs text-text-muted">אין תאריכי פרעון מתוכננים</p>
                      )}
                    </div>
                    <SectionHeader title="הנכסים שלי" className="mb-3" />
                    <PropertyStatusFilter
                      value={statusFilter}
                      onChange={setStatusFilter}
                      counts={statusCounts}
                      className="mb-3"
                    />
                    <div className="grid grid-cols-1 gap-0.5">
                      {visibleProperties.map((property) => {
                        const lease = myLeases.find((l) => l.propertyId === property.id);
                        const tenant = myTenants.find((t) => t.id === property.tenantId);
                        const rent = propertyMonthlyIncome(property, lease);
                        return (
                          <PropertyRow
                            key={property.id}
                            property={property}
                            rent={rent > 0 ? rent : undefined}
                            tenantName={tenant?.fullName}
                            detailsLabel="ראה עוד"
                            onClick={() => setDetailProperty(property)}
                          />
                        );
                      })}
                      {visibleProperties.length === 0 && (
                        <p className="col-span-full py-8 text-center text-sm text-text-muted">
                          אין נכסים בסטטוס זה
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <SectionHeader title={panelTitles[homePanel]} onBack={() => onNav("dashboard")} />
                    {homePanel === "docs" && (
                      <DocumentsDialog
                        inline
                        searchable
                        documents={myDocs}
                        canSign={docsCanSign}
                        signerName={session.fullName}
                        properties={myProperties}
                        landlords={myLandlordRecords}
                        tenants={myTenants}
                        awaitingSignatureOnly={docsCanSign}
                        upload={{ ownerUserId: user.id, landlordId }}
                      />
                    )}
                    {homePanel === "report" && (
                      <AnnualReportDialog inline landlordId={landlordId} canAddExpenses />
                    )}
                    {homePanel === "chat" && (
                      <ChatPanel
                        inline
                        self={{ id: session.userId, name: session.fullName, role: "landlord" }}
                        peers={[{ id: "u_manager", name: "מנהל הנכסים", subtitle: "ALTMAN Group" }]}
                        title="צ׳אט עם מנהל"
                      />
                    )}
                    {homePanel === "tickets" && (
                      <TicketsDialog inline propertyIds={myPropertyIds} readOnly title="סטטוס תקלות" />
                    )}
                    {homePanel === "withdrawals" && (
                      <WithdrawalsDialog
                        inline
                        landlordId={landlordId}
                        createdByUserId={user.id}
                        highlightId={focusWithdrawalId}
                        onSubmitted={() => setToast("הבקשה נשלחה למנהל")}
                      />
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : (
        <>
          <DashboardTopBar
            tone="brand"
            onMenu={() => setMenuOpen(true)}
            onProfile={() => setTab("profile")}
          />
          <div className="flex-1">
            {tab === "documents" && (
              <div className="dash-tab space-y-3 px-4 pb-8 pt-2">
                <SectionHeader title="מסמכים" onBack={() => onNav("dashboard")} />
                <DocumentsDialog
                  inline
                  searchable
                  documents={myDocs}
                  canSign
                  signerName={session.fullName}
                  properties={myProperties}
                  landlords={myLandlordRecords}
                  tenants={myTenants}
                  upload={{ ownerUserId: user.id, landlordId }}
                />
              </div>
            )}

            {tab === "notifications" && (
              <div className="dash-tab">
                <NotificationsTab
                  forUserId={user.id}
                  forRole="landlord"
                  onBack={() => onNav("dashboard")}
                  onOpen={(n) => {
                    setTab("dashboard");
                    openNotification(n);
                  }}
                />
              </div>
            )}

            {tab === "profile" && (
              <div className="dash-tab">
                <ProfileTab
                  userId={user.id}
                  fullName={session.fullName}
                  role="landlord"
                  detail={`${myProperties.length} נכסים · ${formatCurrency(expectedIncome)} / חודש`}
                  onLogout={logout}
                  onBack={() => onNav("dashboard")}
                />
              </div>
            )}
          </div>
        </>
      )}

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role="landlord"
        userName={session.fullName}
        avatarUrl={user.avatarUrl}
        extraItems={menuItems}
      />
      <PropertyListDialog
        open={dialog === "list"}
        onClose={() => setDialog(null)}
        title="תצוגת נכסים"
        properties={myProperties}
        onSelect={(property) => {
          setDialog(null);
          setDetailProperty(property);
        }}
      />
      <RentalsDialog open={dialog === "rentals"} onClose={() => setDialog(null)} landlordId={landlordId} />
      <ChecksDialog open={dialog === "checks"} onClose={() => setDialog(null)} landlordId={landlordId} />
      <CriticalDatesDialog open={dialog === "critical"} onClose={() => setDialog(null)} landlordId={landlordId} />
      <PropertyDetailDialog
        property={detailProperty}
        onClose={() => setDetailProperty(null)}
        canConfirmClearance
        collapsible
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </DashboardFrame>
  );
}
