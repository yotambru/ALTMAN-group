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
  TrendingUp,
  UserPlus,
  Vault,
  Wrench,
} from "lucide-react";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { HeroStatCard } from "@/components/dashboard/HeroStatCard";
import { FocusActions } from "@/components/dashboard/FocusActions";
import { AlertStrip } from "@/components/dashboard/AlertStrip";
import { IncomeGrowthChart } from "@/components/dashboard/IncomeGrowthChart";
import { PropertyRow } from "@/components/dashboard/PropertyCard";
import { PropertyStatusFilter } from "@/components/dashboard/PropertyStatusFilter";
import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
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
import { AddTenantModal } from "@/features/landlord/AddTenantModal";
import { RentalsDialog } from "@/features/leases/RentalsDialog";
import { AnnualReportDialog } from "@/features/reports/AnnualReportDialog";
import { TicketsDialog } from "@/features/maintenance/TicketsDialog";
import { CriticalDatesDialog } from "@/features/alerts/CriticalDatesDialog";
import { useSession } from "@/lib/useSession";
import { useData } from "@/lib/store";
import { getCriticalDates } from "@/lib/alerts";
import {
  buildPortfolioYieldHistory,
  buildPortfolioYieldSeries,
  formatPercent,
  impliedPortfolioValue,
  monthlyRentalIncome,
  occupancyPercent,
  portfolioIncomeGrowth,
  portfolioJoinDate,
  PORTFOLIO_YIELD_RATE,
} from "@/lib/portfolio";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import type { AppNotification, Property, PropertyStatus } from "@/types";

type Dialog = "list" | "rentals" | "critical" | "addTenant" | null;
type HomePanel = "properties" | "docs" | "report" | "chat" | "tickets";

export default function LandlordDashboard() {
  const { session, user, ready, logout } = useSession("landlord");
  const { properties, leases, documents, notifications, tenants, landlords, tickets } = useData();
  const landlordId = session.landlordId ?? user.landlordId ?? "l_1";

  const [tab, setTab] = useState<AppTab>("dashboard");
  const [homePanel, setHomePanel] = useState<HomePanel>("properties");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [docsCanSign, setDocsCanSign] = useState(false);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const firstName = session.fullName.trim().split(/\s+/)[0] || session.fullName;

  const myProperties = properties.filter((p) => p.landlordId === landlordId);
  const myPropertyIds = myProperties.map((p) => p.id);
  const myLeases = leases.filter((l) => l.landlordId === landlordId && l.active);
  const expectedIncome = monthlyRentalIncome(myLeases);
  const portfolioValue = impliedPortfolioValue(expectedIncome);
  const criticalDates = getCriticalDates(myLeases, myProperties);
  const criticalCount = criticalDates.length;
  const leaseRenewals = criticalDates.filter((d) => d.kind === "lease_end" && d.daysLeft <= 30).length;
  const occupancy = occupancyPercent(myProperties);
  const yieldHistory = buildPortfolioYieldHistory(myLeases);
  const yieldSeries = buildPortfolioYieldSeries(myLeases);
  const incomeSeries = yieldSeries.map((p) => p.monthlyIncome);
  const incomeGrowth = portfolioIncomeGrowth(myLeases);
  const joinDate = portfolioJoinDate(myLeases);
  const firstYield = yieldSeries[0];
  const lastYield = yieldSeries.at(-1);
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
    (n) => !n.read && (n.forRole === "landlord" || n.forUserId === user.id),
  ).length;

  const openPanel = (panel: HomePanel, opts?: { canSign?: boolean }) => {
    if (opts?.canSign !== undefined) setDocsCanSign(opts.canSign);
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

  const menuItems: MobileMenuItem[] = [
    { icon: Building2, label: "תצוגת נכסים", onClick: () => openPanel("properties") },
    { icon: UserPlus, label: "שוכר חדש", onClick: () => setDialog("addTenant") },
    { icon: FileText, label: "שכירויות", onClick: () => setDialog("rentals") },
    { icon: Vault, label: "כספת מסמכים", onClick: () => setTab("documents") },
    { icon: FileText, label: "דוח שנתי", onClick: () => openPanel("report") },
    { icon: PenLine, label: "מסמכים לחתימה", onClick: () => openDocs(true) },
    { icon: MessagesSquare, label: "צ׳אט עם מנהל", onClick: () => openPanel("chat") },
    { icon: Wrench, label: "סטטוס תקלות", onClick: () => openPanel("tickets") },
    { icon: CalendarDays, label: "התראות קריטיות", onClick: () => setDialog("critical") },
  ];

  const onNav = (id: string) => {
    const next = id as AppTab;
    if (next === "dashboard") {
      if (tab === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
      setHomePanel("properties");
      setDocsCanSign(false);
    }
    if (next === "documents") setDocsCanSign(false);
    setTab(next);
  };

  const panelTitles: Record<Exclude<HomePanel, "properties">, string> = {
    docs: docsCanSign ? "מסמכים לחתימה" : "מסמכים",
    report: `דוח שנתי ${new Date().getFullYear()}`,
    chat: "צ׳אט עם מנהל",
    tickets: "סטטוס תקלות",
  };

  if (!ready) return null;

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col bg-surface-muted">
      {tab === "dashboard" && criticalCount > 0 && (
        <AlertStrip
          title={`${criticalCount} מועדים קריטיים ב-90 הימים הקרובים`}
          onClick={() => setDialog("critical")}
        />
      )}

      {tab === "dashboard" ? (
        <div className="dusk-header">
          <DashboardTopBar
            tone="dusk"
            greeting={`שלום, ${firstName}`}
            subtitle="התיק שלך במבט אחד"
            onMenu={() => setMenuOpen(true)}
            onBell={() => setTab("notifications")}
            notificationCount={unread}
          />
          <div className="px-4 pb-6 pt-1">
            <HeroStatCard
              tone="glass"
              label="שווי נכסים כולל"
              value={formatCurrency(portfolioValue)}
              subtitle={`תפוסה ${occupancy}% · שווי לפי תשואה ${formatPercent(PORTFOLIO_YIELD_RATE * 100)}`}
              data={incomeSeries.length > 1 ? incomeSeries : undefined}
              trendPercent={incomeGrowth}
              trendLabel={
                joinDate
                  ? `גידול בהכנסות מאז ההצטרפות · ${formatMonthYear(joinDate)}`
                  : "גידול בדמי שכירות"
              }
              chartStartLabel={
                firstYield && joinDate
                  ? `הצטרפות ${formatMonthYear(joinDate)} · ${formatCurrency(firstYield.monthlyIncome)}`
                  : undefined
              }
              chartEndLabel={
                lastYield
                  ? `${lastYield.incomeGrowthPercent >= 0 ? "+" : ""}${formatPercent(lastYield.incomeGrowthPercent)} · ${formatCurrency(lastYield.monthlyIncome)}`
                  : undefined
              }
              secondary={{
                label: "הכנסה חודשית",
                value: formatCurrency(expectedIncome),
                sublabel: "סך דמי שכירות מכל הנכסים",
                onClick: () => setDialog("rentals"),
              }}
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
                icon={Home}
                label="הנכסים שלי"
                value={myProperties.length}
                sublabel={`${rentedCount} מושכרים · תפוסה ${occupancy}%`}
                onClick={() => openPanel("properties")}
              />
              <MetricCard
                icon={TrendingUp}
                label="גידול בהכנסות"
                value={
                  incomeGrowth != null
                    ? `${incomeGrowth >= 0 ? "+" : ""}${formatPercent(incomeGrowth)}`
                    : "—"
                }
                sublabel={
                  incomeGrowth != null && joinDate
                    ? `מאז ההצטרפות · ${formatMonthYear(joinDate)}`
                    : "מתעדכן עם דמי השכירות"
                }
                onClick={() => openPanel("report")}
              />
              <MetricCard
                icon={CalendarCheck}
                label="חוזים לחידוש"
                value={leaseRenewals}
                sublabel="ב-30 הימים הקרובים"
                onClick={() => setDialog("critical")}
              />
              <MetricCard
                icon={Wrench}
                label="קריאות פתוחות"
                value={openTicketCount}
                sublabel="קריאות לטיפול"
                onClick={() => openPanel("tickets")}
              />
            </div>

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
              ]}
            />

            {homePanel === "properties" && yieldHistory.length >= 2 && (
              <IncomeGrowthChart points={yieldHistory} />
            )}

            <section className="space-y-1 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border">
              {homePanel === "properties" ? (
                <>
                  <SectionHeader title="הנכסים שלי" className="mb-3" />
                  <PropertyStatusFilter
                    value={statusFilter}
                    onChange={setStatusFilter}
                    counts={statusCounts}
                    className="mb-3"
                  />
                  <div className="space-y-0.5">
                    {visibleProperties.map((property) => {
                      const lease = myLeases.find((l) => l.propertyId === property.id);
                      const tenant = myTenants.find((t) => t.id === property.tenantId);
                      return (
                        <PropertyRow
                          key={property.id}
                          property={property}
                          rent={lease?.monthlyRent}
                          tenantName={tenant?.fullName}
                          onClick={() => setDetailProperty(property)}
                        />
                      );
                    })}
                    {visibleProperties.length === 0 && (
                      <p className="py-8 text-center text-sm text-text-muted">אין נכסים בסטטוס זה</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <SectionHeader title={panelTitles[homePanel]} />
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
                </>
              )}
            </section>
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-3 px-4 pb-8 pt-2">
            <SectionHeader title="מסמכים" />
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
          <NotificationsTab
            forUserId={user.id}
            forRole="landlord"
            onOpen={(n) => {
              setTab("dashboard");
              openNotification(n);
            }}
          />
        )}

        {tab === "profile" && (
          <ProfileTab
            userId={user.id}
            fullName={session.fullName}
            role="landlord"
            detail={`${myProperties.length} נכסים · ${formatCurrency(expectedIncome)} / חודש`}
            onLogout={logout}
          />
        )}
      </div>

      <BottomNavigation
        tone="dusk"
        items={appBottomNavItems(unread)}
        active={tab}
        onSelect={onNav}
      />

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
      <AddTenantModal
        open={dialog === "addTenant"}
        onClose={() => setDialog(null)}
        properties={myProperties}
      />
      <CriticalDatesDialog open={dialog === "critical"} onClose={() => setDialog(null)} landlordId={landlordId} />
      <PropertyDetailDialog
        property={detailProperty}
        onClose={() => setDetailProperty(null)}
        canConfirmClearance
      />
    </main>
  );
}
