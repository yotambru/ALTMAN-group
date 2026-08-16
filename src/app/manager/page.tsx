"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  FileText,
  History,
  Home,
  KeyRound,
  ListChecks,
  MessagesSquare,
  Repeat,
  Send,
  UserPlus,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { HeroStatCard } from "@/components/dashboard/HeroStatCard";
import { FocusActions } from "@/components/dashboard/FocusActions";
import { AlertStrip } from "@/components/dashboard/AlertStrip";
import { ClientRow, SearchField } from "@/components/dashboard/ClientRow";
import { PropertyRow } from "@/components/dashboard/PropertyCard";
import { PropertyStatusFilter } from "@/components/dashboard/PropertyStatusFilter";
import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MobileMenu, type MobileMenuItem } from "@/components/dashboard/MobileMenu";
import { NotificationsTab } from "@/components/dashboard/NotificationsTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { appBottomNavItems, type AppTab } from "@/components/dashboard/appNav";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChatPanel, type ChatPeer } from "@/features/chat/ChatPanel";
import { DocumentsDialog } from "@/features/documents/DocumentsDialog";
import { SendForSignatureDialog } from "@/features/documents/SendForSignatureDialog";
import { AddClientModal } from "@/features/manager/AddClientModal";
import { AddTenantModal } from "@/features/landlord/AddTenantModal";
import { PropertyDetailDialog } from "@/features/properties/PropertyDetailDialog";
import { PropertyListDialog } from "@/features/properties/PropertyListDialog";
import { EditPropertyModal } from "@/features/properties/EditPropertyModal";
import { PeopleListDialog } from "@/features/people/PeopleListDialog";
import { TicketsDialog } from "@/features/maintenance/TicketsDialog";
import { UtilitiesTrackerDialog } from "@/features/utilities/UtilitiesTrackerDialog";
import { ProfessionalsDialog } from "@/features/professionals/ProfessionalsDialog";
import { TasksDialog } from "@/features/tasks/TasksDialog";
import { ActivityLogDialog } from "@/features/activity/ActivityLogDialog";
import { ProtocolDialog } from "@/features/protocol/ProtocolDialog";
import { CriticalDatesDialog } from "@/features/alerts/CriticalDatesDialog";
import { AnnualReportDialog } from "@/features/reports/AnnualReportDialog";
import { useSession } from "@/lib/useSession";
import { useData } from "@/lib/store";
import { can } from "@/lib/permissions";
import { getCriticalDates } from "@/lib/alerts";
import {
  buildPortfolioYieldSeries,
  formatPercent,
  occupancyPercent,
  portfolioIncomeGrowth,
  portfolioJoinDate,
} from "@/lib/portfolio";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import type { AppNotification, Property, PropertyStatus } from "@/types";

type Dialog =
  | "add"
  | "addTenant"
  | "send"
  | "landlords"
  | "tenants"
  | "utilities"
  | "professionals"
  | "tasks"
  | "activity"
  | "protocol"
  | "critical"
  | "properties"
  | null;

/** Inline panels that replace the clients list on the dashboard. */
type HomePanel = "clients" | "tickets" | "docs" | "chat" | "report";

export default function ManagerDashboard() {
  const { session, user, ready, logout } = useSession(["manager", "assistant"]);
  const data = useData();
  const { properties, landlords, tenants, documents, notifications, leases, users, chatThreads, tickets } = data;
  const role = session.role;

  const [tab, setTab] = useState<AppTab>("dashboard");
  const [homePanel, setHomePanel] = useState<HomePanel>("clients");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [chatPeerId, setChatPeerId] = useState<string | null>(null);
  const [focusTicketId, setFocusTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [clientQuery, setClientQuery] = useState("");
  const [propertyQuery, setPropertyQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [addForLandlordId, setAddForLandlordId] = useState<string | null>(null);

  const self = { id: session.userId, name: session.fullName, role };
  const firstName = session.fullName.trim().split(/\s+/)[0] || session.fullName;
  const criticalDates = getCriticalDates(leases, properties);
  const criticalCount = criticalDates.length;
  const leaseRenewals = criticalDates.filter((d) => d.kind === "lease_end" && d.daysLeft <= 30).length;
  const unread = notifications.filter(
    (n) => !n.read && (n.forRole === "manager" || n.forUserId === session.userId || (!n.forUserId && !n.forRole)),
  ).length;

  const activeLeases = leases.filter((l) => l.active);
  const monthlyIncome = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0);
  const occupancy = occupancyPercent(properties);
  const yieldSeries = buildPortfolioYieldSeries(activeLeases);
  const incomeSeries = yieldSeries.map((p) => p.annualIncome);
  const incomeGrowth = portfolioIncomeGrowth(activeLeases);
  const joinDate = portfolioJoinDate(activeLeases);
  const firstYield = yieldSeries[0];
  const lastYield = yieldSeries.at(-1);
  const openTicketCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const rentedCount = properties.filter((p) => p.status === "rented").length;

  const selectedClient = landlords.find((l) => l.id === selectedClientId) ?? null;
  const clientProperties = useMemo(
    () => (selectedClientId ? properties.filter((p) => p.landlordId === selectedClientId) : []),
    [properties, selectedClientId],
  );
  const searchedProperties = useMemo(() => {
    const q = propertyQuery.trim().toLowerCase();
    if (!q) return clientProperties;
    return clientProperties.filter((p) => {
      const tenantName = tenants.find((t) => t.id === p.tenantId)?.fullName ?? "";
      return `${p.address} ${p.city} ${p.apartmentNumber} ${p.sizeSqm} ${tenantName}`
        .toLowerCase()
        .includes(q);
    });
  }, [clientProperties, propertyQuery, tenants]);
  const statusCounts: Partial<Record<PropertyStatus | "all", number>> = { all: searchedProperties.length };
  for (const p of searchedProperties) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  const visibleProperties =
    statusFilter === "all"
      ? searchedProperties
      : searchedProperties.filter((p) => p.status === statusFilter);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return landlords;
    return landlords.filter((l) => {
      const owned = properties.filter((p) => p.landlordId === l.id);
      const addresses = owned.map((p) => `${p.address} ${p.city}`).join(" ");
      const tenantNames = owned
        .map((p) => tenants.find((t) => t.id === p.tenantId)?.fullName ?? "")
        .join(" ");
      return `${l.fullName} ${l.phone} ${l.email} ${l.idNumber ?? ""} ${addresses} ${tenantNames}`
        .toLowerCase()
        .includes(q);
    });
  }, [landlords, properties, tenants, clientQuery]);

  const chatPeers: ChatPeer[] = [
    ...landlords.map((l) => ({
      id: users.find((u) => u.landlordId === l.id)?.id ?? `l:${l.id}`,
      name: l.fullName,
      subtitle: "משכיר",
    })),
    ...tenants.map((t) => ({
      id: users.find((u) => u.tenantId === t.id)?.id ?? `t:${t.id}`,
      name: t.fullName,
      subtitle: "שוכר",
    })),
  ];

  const openChat = (peerId: string | null = null) => {
    setChatPeerId(peerId);
    setHomePanel("chat");
    setTab("dashboard");
  };

  const openPanel = (panel: HomePanel) => {
    if (panel !== "tickets") setFocusTicketId(null);
    setHomePanel(panel);
    setTab("dashboard");
  };

  const openTickets = (ticketId: string | null = null) => {
    setFocusTicketId(ticketId);
    setHomePanel("tickets");
    setTab("dashboard");
  };

  const resolveTicketId = (n: AppNotification) => {
    if (n.relatedId && tickets.some((t) => t.id === n.relatedId)) return n.relatedId;
    const byTitle = tickets.find((t) => t.title === n.body || n.body.startsWith(`${t.title} —`));
    return byTitle?.id ?? null;
  };

  const openNotification = (n: AppNotification) => {
    switch (n.kind) {
      case "chat": {
        const thread = n.relatedId
          ? chatThreads.find((t) => t.id === n.relatedId)
          : undefined;
        const peerId =
          thread?.participantIds.find((id) => id !== session.userId) ?? null;
        openChat(peerId);
        break;
      }
      case "maintenance":
        openTickets(resolveTicketId(n));
        break;
      case "signature":
        setTab("documents");
        break;
      case "utility":
      case "insurance":
        setDialog("utilities");
        break;
      case "critical":
      case "reminder":
        setDialog("critical");
        break;
      case "payment":
      case "info":
      default:
        setDialog(null);
        break;
    }
  };

  const primaryActions = [
    can(role, "clients.create")
      ? { icon: UserPlus, label: "משכיר חדש", kind: "dialog" as const, dialog: "add" as const }
      : { icon: UsersRound, label: "לקוחות", kind: "panel" as const, panel: "clients" as const },
    { icon: Bell, label: "קריאות", kind: "panel" as const, panel: "tickets" as const },
    { icon: FileText, label: "מסמכים", kind: "tab" as const, tab: "documents" as const },
    { icon: MessagesSquare, label: "צ׳אט", kind: "panel" as const, panel: "chat" as const },
  ].filter((a) => {
    if (a.kind === "panel" && a.panel === "tickets") return can(role, "tickets.manage");
    if (a.kind === "tab" && a.tab === "documents") return can(role, "documents.viewAll");
    if (a.kind === "dialog" && a.dialog === "add") return can(role, "clients.create");
    return true;
  });

  const menuItems: MobileMenuItem[] = [
    { icon: UserPlus, label: "משכיר חדש", onClick: () => { setAddForLandlordId(null); setDialog("add"); } },
    { icon: KeyRound, label: "שוכר חדש", onClick: () => setDialog("addTenant") },
    { icon: UsersRound, label: "תצוגת לקוחות", onClick: () => { setSelectedClientId(null); openPanel("clients"); } },
    { icon: Users, label: "תצוגת שוכרים", onClick: () => setDialog("tenants") },
    { icon: Building2, label: "כל הנכסים", onClick: () => setDialog("properties") },
    { icon: FileBarChart, label: "דוח שנתי", onClick: () => openPanel("report") },
    { icon: Wrench, label: "ניהול קריאות", onClick: () => openPanel("tickets") },
    { icon: Repeat, label: "החלפת חשבונות", onClick: () => setDialog("utilities") },
    { icon: FileText, label: "כספת מסמכים", onClick: () => setTab("documents") },
    { icon: Send, label: "שליחה לחתימה", onClick: () => setDialog("send") },
    { icon: MessagesSquare, label: "צ׳אט", onClick: () => openChat(null) },
    { icon: Wrench, label: "בעלי מקצוע", onClick: () => setDialog("professionals") },
    { icon: ListChecks, label: "יומן משימות", onClick: () => setDialog("tasks") },
    { icon: ClipboardList, label: "פרוטוקול", onClick: () => setDialog("protocol") },
    { icon: CalendarCheck, label: "התראות קריטיות", onClick: () => setDialog("critical") },
    { icon: History, label: "יומן פעילות", onClick: () => setDialog("activity") },
  ].filter((item) => {
    const map: Record<string, boolean> = {
      "משכיר חדש": can(role, "clients.create"),
      "שוכר חדש": can(role, "clients.create"),
      "תצוגת לקוחות": can(role, "clients.view") || can(role, "people.view"),
      "תצוגת שוכרים": can(role, "people.view"),
      "כל הנכסים": true,
      "דוח שנתי": can(role, "reports.view"),
      "ניהול קריאות": can(role, "tickets.manage"),
      "החלפת חשבונות": can(role, "utilities.track"),
      "כספת מסמכים": can(role, "documents.viewAll"),
      "שליחה לחתימה": can(role, "documents.sendForSignature"),
      "צ׳אט": true,
      "בעלי מקצוע": can(role, "professionals.assign"),
      "יומן משימות": can(role, "tasks.manage"),
      "פרוטוקול": can(role, "protocol.manage"),
      "התראות קריטיות": true,
      "יומן פעילות": can(role, "activityLog.view"),
    };
    return map[item.label] ?? true;
  });

  const onNav = (id: string) => {
    const next = id as AppTab;
    if (next === "dashboard") {
      if (tab === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
      setFocusTicketId(null);
      setHomePanel("clients");
    }
    setTab(next);
  };

  const rentByProperty = (propertyId: string) =>
    leases.find((l) => l.propertyId === propertyId && l.active)?.monthlyRent;

  const panelTitles: Record<Exclude<HomePanel, "clients">, string> = {
    tickets: "קריאות ותקלות",
    docs: "מסמכים",
    chat: "צ׳אט",
    report: `דוח שנתי ${new Date().getFullYear()}`,
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
            subtitle="כאן מרכז הניהול שלך"
            onMenu={() => setMenuOpen(true)}
            onBell={() => setTab("notifications")}
            notificationCount={unread}
          />
          <div className="px-4 pb-6 pt-1">
            <HeroStatCard
              tone="glass"
              label="הכנסות חודשיות"
              value={formatCurrency(monthlyIncome)}
              subtitle={`תפוסה ${occupancy}% · ${rentedCount}/${properties.length} מושכרים · ${landlords.length} לקוחות`}
              data={incomeSeries.length > 1 ? incomeSeries : undefined}
              trendPercent={incomeGrowth}
              trendLabel={
                joinDate
                  ? `גידול בהכנסות מאז תחילת הניהול · ${formatMonthYear(joinDate)}`
                  : "לפי מחשבון תשואה"
              }
              chartStartLabel={
                firstYield && joinDate
                  ? `התחלה ${formatMonthYear(joinDate)} · ${formatPercent(firstYield.yieldPercent)}`
                  : undefined
              }
              chartEndLabel={
                lastYield
                  ? `${lastYield.incomeGrowthPercent >= 0 ? "+" : ""}${formatPercent(lastYield.incomeGrowthPercent)} · תשואה ${formatPercent(lastYield.yieldPercent)}`
                  : undefined
              }
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
                label="נכסים פעילים"
                value={properties.length}
                sublabel={`${rentedCount} מושכרים · תפוסה ${occupancy}%`}
                onClick={() => setDialog("properties")}
              />
              <MetricCard
                icon={Wrench}
                label="קריאות פתוחות"
                value={openTicketCount}
                sublabel="קריאות לטיפול"
                onClick={() => openPanel("tickets")}
              />
              <MetricCard
                icon={CalendarCheck}
                label="חוזים לחידוש"
                value={leaseRenewals}
                sublabel="ב-30 הימים הקרובים"
                onClick={() => setDialog("critical")}
              />
              <MetricCard
                icon={Users}
                label="לקוחות"
                value={landlords.length}
                sublabel={`${tenants.length} שוכרים פעילים`}
                onClick={() => {
                  setSelectedClientId(null);
                  openPanel("clients");
                }}
              />
            </div>

            <FocusActions
              title="פעולות מהירות"
              items={primaryActions.map((a) => ({
                icon: a.icon,
                label: a.label,
                active:
                  a.kind === "panel"
                    ? homePanel === a.panel
                    : false,
                onClick: () => {
                  if (a.kind === "panel") openPanel(a.panel);
                  else if (a.kind === "tab") setTab(a.tab);
                  else {
                    setAddForLandlordId(null);
                    setDialog(a.dialog);
                  }
                },
              }))}
            />

            <section className="space-y-1 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border">
              {homePanel === "clients" ? (
                selectedClient ? (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(null);
                          setPropertyQuery("");
                          setStatusFilter("all");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-navy/75 transition-colors hover:bg-navy/10"
                      >
                        <ArrowRight className="h-4 w-4" />
                        לקוחות
                      </button>
                      {can(role, "clients.create") && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddForLandlordId(selectedClient.id);
                            setDialog("add");
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-orange px-3.5 py-1.5 text-sm font-bold text-white shadow-[0_8px_18px_-10px_rgba(242,106,33,0.8)] transition-colors hover:bg-orange-dark"
                        >
                          + נכס
                        </button>
                      )}
                    </div>

                    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-l from-orange-soft/70 to-surface-muted px-3.5 py-3.5">
                      <UserAvatar
                        name={selectedClient.fullName}
                        avatarUrl={users.find((u) => u.landlordId === selectedClient.id)?.avatarUrl}
                        size="lg"
                        tone="gradient"
                      />
                      <div className="min-w-0 flex-1 text-start">
                        <h2 className="truncate text-xl font-extrabold tracking-tight text-navy">
                          {selectedClient.fullName}
                        </h2>
                        <p className="mt-0.5 text-xs font-medium text-text-muted">
                          {clientProperties.length} נכסים
                          {selectedClient.idNumber ? ` · ת״ז ${selectedClient.idNumber}` : ""}
                        </p>
                      </div>
                    </div>

                    <SearchField
                      value={propertyQuery}
                      onChange={setPropertyQuery}
                      placeholder="חיפוש לפי כתובת או שוכר…"
                      className="mb-3"
                    />
                    <PropertyStatusFilter
                      value={statusFilter}
                      onChange={setStatusFilter}
                      counts={statusCounts}
                      className="mb-3"
                    />
                    <div className="space-y-1">
                      {visibleProperties.map((p) => {
                        const rent = rentByProperty(p.id);
                        const tenant = tenants.find((t) => t.id === p.tenantId);
                        return (
                          <PropertyRow
                            key={p.id}
                            property={p}
                            onClick={() => setDetailProperty(p)}
                            rent={rent}
                            tenantName={tenant?.fullName}
                          />
                        );
                      })}
                      {visibleProperties.length === 0 && (
                        <p className="py-8 text-center text-sm text-text-muted">
                          {propertyQuery.trim()
                            ? "לא נמצאו נכסים התואמים לחיפוש"
                            : "אין נכסים בסטטוס זה"}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <SectionHeader title="לקוחות" className="mb-3" />
                    <SearchField
                      value={clientQuery}
                      onChange={setClientQuery}
                      placeholder="חיפוש לפי שם לקוח, כתובת או שוכר…"
                      className="mb-3"
                    />
                    <div className="space-y-0.5">
                      {filteredClients.map((l) => {
                        const owned = properties.filter((p) => p.landlordId === l.id);
                        const first = owned[0];
                        return (
                          <ClientRow
                            key={l.id}
                            landlord={l}
                            propertyCount={owned.length}
                            avatarUrl={users.find((u) => u.landlordId === l.id)?.avatarUrl}
                            subtitle={
                              first
                                ? `${first.address}, ${first.city}${owned.length > 1 ? ` · +${owned.length - 1}` : ""}`
                                : "אין נכסים"
                            }
                            onClick={() => {
                              setStatusFilter("all");
                              setPropertyQuery("");
                              setSelectedClientId(l.id);
                            }}
                          />
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <p className="py-8 text-center text-sm text-text-muted">לא נמצאו לקוחות</p>
                      )}
                    </div>
                  </>
                )
              ) : (
                <>
                  <SectionHeader title={panelTitles[homePanel]} />
                  {homePanel === "tickets" && (
                    <TicketsDialog inline highlightTicketId={focusTicketId} />
                  )}
                  {homePanel === "docs" && (
                    <DocumentsDialog
                      inline
                      searchable
                      documents={documents}
                      landlords={landlords}
                      tenants={tenants}
                      properties={properties}
                      upload={can(role, "documents.viewAll") ? {} : undefined}
                    />
                  )}
                  {homePanel === "report" && can(role, "reports.view") && (
                    <AnnualReportDialog inline />
                  )}
                  {homePanel === "chat" && (
                    <ChatPanel
                      key={`chat-${chatPeerId ?? "all"}`}
                      inline
                      self={self}
                      peers={chatPeers}
                      title="צ׳אט עם כל הצדדים"
                      initialPeerId={chatPeerId}
                    />
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
              documents={documents}
              landlords={landlords}
              tenants={tenants}
              properties={properties}
              upload={can(role, "documents.viewAll") ? {} : undefined}
            />
          </div>
        )}

        {tab === "notifications" && (
          <NotificationsTab
            forUserId={user.id}
            forRole="manager"
            onOpen={(n) => {
              setTab("dashboard");
              openNotification(n);
            }}
          />
        )}

        {tab === "profile" && (
          <ProfileTab userId={user.id} fullName={session.fullName} role={role} onLogout={logout} />
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
        role={role}
        userName={session.fullName}
        avatarUrl={user.avatarUrl}
        extraItems={menuItems}
      />
      <PropertyListDialog
        open={dialog === "properties"}
        onClose={() => setDialog(null)}
        title="כל הנכסים"
        properties={properties}
        onSelect={(p) => {
          setDialog(null);
          setDetailProperty(p);
        }}
      />
      <AddClientModal
        open={dialog === "add"}
        onClose={() => {
          setDialog(null);
          setAddForLandlordId(null);
        }}
        existingLandlordId={addForLandlordId}
      />
      <AddTenantModal
        open={dialog === "addTenant"}
        onClose={() => setDialog(null)}
        properties={properties}
      />
      <SendForSignatureDialog open={dialog === "send"} onClose={() => setDialog(null)} />
      <PeopleListDialog open={dialog === "landlords"} onClose={() => setDialog(null)} mode="landlords" />
      <PeopleListDialog open={dialog === "tenants"} onClose={() => setDialog(null)} mode="tenants" />
      <UtilitiesTrackerDialog open={dialog === "utilities"} onClose={() => setDialog(null)} />
      <ProfessionalsDialog open={dialog === "professionals"} onClose={() => setDialog(null)} canManage={can(role, "professionals.manage")} />
      <TasksDialog open={dialog === "tasks"} onClose={() => setDialog(null)} self={self} />
      <ActivityLogDialog open={dialog === "activity"} onClose={() => setDialog(null)} />
      <ProtocolDialog open={dialog === "protocol"} onClose={() => setDialog(null)} />
      <CriticalDatesDialog open={dialog === "critical"} onClose={() => setDialog(null)} />

      <PropertyDetailDialog
        property={detailProperty}
        onClose={() => setDetailProperty(null)}
        canConfirmClearance={can(role, "payments.confirm")}
        onEdit={
          can(role, "clients.edit")
            ? (p) => {
                setDetailProperty(null);
                setEditProperty(p);
              }
            : undefined
        }
      />
      <EditPropertyModal property={editProperty} onClose={() => setEditProperty(null)} />
    </main>
  );
}
