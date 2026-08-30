"use client";

import { useEffect, useRef, useState } from "react";
import {
  AirVent,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  Flame,
  Home,
  Lock,
  MessagesSquare,
  PenLine,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { HeroStatCard } from "@/components/dashboard/HeroStatCard";
import { FocusActions } from "@/components/dashboard/FocusActions";
import { AlertStrip } from "@/components/dashboard/AlertStrip";
import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MobileMenu, type MobileMenuItem } from "@/components/dashboard/MobileMenu";
import { NotificationsTab } from "@/components/dashboard/NotificationsTab";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { appBottomNavItems, type AppTab } from "@/components/dashboard/appNav";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { TicketModal } from "@/features/maintenance/TicketModal";
import { TicketsDialog } from "@/features/maintenance/TicketsDialog";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { DocumentsDialog } from "@/features/documents/DocumentsDialog";
import { PropertyDetailDialog } from "@/features/properties/PropertyDetailDialog";
import { UtilityAccountDetails } from "@/features/utilities/UtilityAccountDetails";
import { useSession } from "@/lib/useSession";
import { useData, utilityLabelHe } from "@/lib/store";
import { storage } from "@/lib/storage";
import { inferDocumentFolder } from "@/lib/document-folders";
import {
  acFilterDue,
  awaitingManagementApproval,
  isOnboardingLocked,
  onboardingReminderDue,
  pendingOnboardingCount,
  pendingOnboardingLabels,
} from "@/lib/alerts";
import { currentMonthlyRent } from "@/lib/portfolio";
import { nextPaymentDate } from "@/lib/payment-dates";
import {
  daysUntil,
  fileToDataUrl,
  formatDateSlashes,
  formatCurrency,
  isValidIsoDate,
} from "@/lib/utils";
import type { AppNotification, UtilityKind } from "@/types";

type Dialog = "ticket" | "contract" | null;
type HomePanel = "home" | "chat" | "tickets" | "docs";

const utilityIcon: Record<UtilityKind, LucideIcon> = {
  arnona: FileText,
  water: Droplets,
  electricity: Zap,
  gas: Flame,
  vaad: CalendarDays,
};

const utilityOrder: UtilityKind[] = ["vaad", "gas", "electricity", "water", "arnona"];

export default function TenantDashboard() {
  const { session, user, ready, logout } = useSession("tenant");
  const {
    properties,
    leases,
    tenants,
    onboardings,
    notifications,
    documents,
    setUtilityStatus,
    setInsuranceStatus,
    markAcFilterCleaned,
    addDocument,
    addNotification,
  } = useData();

  const tenantId = session.tenantId ?? user.tenantId ?? "t_5";
  const tenant = tenants.find((t) => t.id === tenantId);
  const property = properties.find((p) => p.id === tenant?.propertyId) ?? properties[0];
  const lease = leases.find((l) => l.id === tenant?.leaseId);
  const onboarding = onboardings.find((o) => o.tenantId === tenantId);

  const pending = pendingOnboardingCount(onboarding);
  const pendingLabels = pendingOnboardingLabels(onboarding);
  const awaitingApproval = awaitingManagementApproval(onboarding);
  const locked = isOnboardingLocked(onboarding);
  const reminder = onboardingReminderDue(onboarding);
  const acDue = acFilterDue(onboarding);
  const showRequiredActions = pending > 0 || awaitingApproval;

  const firstName = session.fullName.trim().split(/\s+/)[0] || session.fullName;
  const unread = notifications.filter((n) => !n.read && (n.forUserId === user.id || n.forRole === "tenant")).length;
  const myDocs = documents.filter((d) => {
    const belongsToTenant = d.ownerUserId === user.id || (d.propertyId && d.propertyId === property?.id);
    if (!belongsToTenant) return false;
    const folder = inferDocumentFolder(d);
    return folder !== "management" && folder !== "landlord_id";
  });
  const tenantProperties = property ? [property] : [];

  const [tab, setTab] = useState<AppTab>("dashboard");
  /** Always start on home — first render uses a demo session, so `locked` is not yet trustworthy. */
  const [homePanel, setHomePanel] = useState<HomePanel>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  /** Infinitive phrase for the lock sheet, e.g. "להשתמש בצ׳אט עם המנהל". */
  const [lockAction, setLockAction] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<UtilityKind | "insurance" | null>(null);

  // Wait for the real session before choosing a panel — first render is the demo user.
  if (ready) {
    if (locked && homePanel !== "home") {
      setHomePanel("home");
    } else if (!locked && homePanel === "home") {
      setHomePanel("chat");
    }
  }

  useEffect(() => {
    if (!onboarding || onboarding.completed || !reminder.due) return;
    const key = `altman.reminder.${tenantId}.${new Date().toISOString().slice(0, 10)}`;
    if (storage.getItem<boolean>(key, false)) return;
    storage.setItem(key, true);
    addNotification({
      kind: "reminder",
      title: "תזכורת: פעולות נדרשות",
      body:
        reminder.cadence === "daily"
          ? "עברו שבועיים מהמעבר — יש להשלים את הפעולות הנדרשות (החלפת חשבונות ופוליסת ביטוח)."
          : "נא להשלים את החלפת החשבונות והעלאת פוליסת הביטוח.",
      forUserId: user.id,
      actionRequired: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startUpload = (target: UtilityKind | "insurance") => {
    pendingUpload.current = target;
    fileRef.current?.click();
  };

  const handleFile = async (file: File) => {
    const target = pendingUpload.current;
    if (!target) return;
    const dataUrl = await fileToDataUrl(file);
    if (target === "insurance") {
      const doc = addDocument({ name: "פוליסת ביטוח", type: "insurance", folder: "appendices", propertyId: property?.id, tenantId: tenantId, ownerUserId: user.id, fileDataUrl: dataUrl });
      setInsuranceStatus(tenantId, "submitted", doc.id);
    } else {
      const doc = addDocument({ name: `אישור החלפת ${utilityLabelHe(target)}`, type: "utility", folder: "appendices", propertyId: property?.id, tenantId: tenantId, ownerUserId: user.id, fileDataUrl: dataUrl });
      setUtilityStatus(tenantId, target, "submitted", doc.id);
    }
    addNotification({
      kind: "utility",
      title: "עודכן ע״י שוכר",
      body: target === "insurance" ? "פוליסת ביטוח הועלתה." : `אישור החלפת ${utilityLabelHe(target)} הועלה.`,
      forRole: "manager",
    });
    pendingUpload.current = null;
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!property) return null;

  const nextPayment = lease ? nextPaymentDate(lease) : undefined;
  const paymentDays = nextPayment
    ? daysUntil(nextPayment)
    : Number.POSITIVE_INFINITY;
  const leaseEnd = lease && isValidIsoDate(lease.endDate) ? lease.endDate : undefined;
  const monthlyRent = lease ? currentMonthlyRent(lease) : 0;
  const contractDays = leaseEnd ? daysUntil(leaseEnd) : Number.POSITIVE_INFINITY;
  const acLast = onboarding?.acFilterLastCleaned ?? onboarding?.moveInDate;
  const acNext = acLast ? new Date(new Date(acLast).getTime() + 90 * 86400000).toISOString() : undefined;

  const openPanel = (panel: Exclude<HomePanel, "home">) => {
    setHomePanel(panel);
    setTab("dashboard");
  };

  const showLock = (action: string) => {
    setLockAction(action);
    setTab("dashboard");
    setHomePanel("home");
  };

  const guard = (action: string, fn: () => void) => () => {
    if (locked) {
      showLock(action);
      return;
    }
    fn();
  };

  const openNotification = (n: AppNotification) => {
    switch (n.kind) {
      case "chat":
        guard("להשתמש בצ׳אט עם המנהל", () => openPanel("chat"))();
        break;
      case "maintenance":
        guard("לצפות במעקב תקלות", () => openPanel("tickets"))();
        break;
      case "signature":
        guard("לגשת למסמכים וחתימה", () => openPanel("docs"))();
        break;
      case "payment":
        setDialog("contract");
        break;
      case "utility":
      case "insurance":
      case "reminder":
      case "critical":
      default:
        setTab("dashboard");
        setHomePanel(locked ? "home" : "chat");
        break;
    }
  };

  const onNav = (id: string) => {
    const next = id as AppTab;
    if (next === "documents" && locked) {
      showLock("לגשת למסמכים לחתימה");
      return;
    }
    if (next === "dashboard") {
      if (tab === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
      setHomePanel(locked ? "home" : "chat");
    }
    setTab(next);
  };

  const panelTitles: Record<Exclude<HomePanel, "home">, string> = {
    chat: "צ׳אט עם מנהל",
    tickets: "מעקב תקלות",
    docs: "מסמכים לחתימה",
  };

  const menuItems: MobileMenuItem[] = [
    { icon: Home, label: "דשבורד", onClick: () => onNav("dashboard") },
    { icon: FileText, label: "מסמכים וחתימות", onClick: () => onNav("documents") },
    {
      icon: Wrench,
      label: "תקלות וקריאות שירות",
      onClick: guard("לצפות במעקב תקלות", () => openPanel("tickets")),
    },
    {
      icon: MessagesSquare,
      label: "צ׳אט",
      onClick: guard("להשתמש בצ׳אט עם המנהל", () => openPanel("chat")),
    },
    { icon: Bell, label: "התראות", onClick: () => onNav("notifications") },
    { icon: Settings, label: "הגדרות", onClick: () => setTab("profile") },
  ];

  if (!ready) return null;

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col bg-surface-muted">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {locked && (
        <AlertStrip
          title={
            awaitingApproval
              ? "המסמכים הועלו — ממתין לאישור הנהלה לשחרור החשבון"
              : `נותרו ${pending} פעולות נדרשות להשלמה`
          }
        />
      )}

      {tab === "dashboard" ? (
        <div className="dusk-header">
          <DashboardTopBar
            tone="dusk"
            greeting={`שלום, ${firstName}`}
            subtitle={
              property
                ? `${property.address}, ${property.city}`
                : "הדירה שלך במבט אחד"
            }
            onMenu={() => setMenuOpen(true)}
            onBell={() => setTab("notifications")}
            notificationCount={unread}
          />
          <div className="px-4 pb-6 pt-1">
            <HeroStatCard
              tone="glass"
              label="דמי שכירות חודשיים"
              value={formatCurrency(monthlyRent)}
              subtitle={
                lease
                  ? `תשלום הבא · ${
                      nextPayment
                        ? formatDateSlashes(nextPayment)
                        : "—"
                    }`
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
                icon={Wallet}
                label="תשלום הבא"
                value={
                  nextPayment
                    ? formatDateSlashes(nextPayment)
                    : "—"
                }
                onClick={() => setDialog("contract")}
              />
              <MetricCard
                icon={CalendarClock}
                label="סיום חוזה"
                value={leaseEnd ? formatDateSlashes(leaseEnd) : "—"}
                onClick={() => setDialog("contract")}
              />
              <MetricCard
                icon={awaitingApproval ? Clock : pending > 0 ? Lock : CheckCircle2}
                label="פעולות נדרשות"
                value={awaitingApproval ? "—" : pending}
                sublabel={
                  awaitingApproval ? "ממתין לאישור" : pending > 0 ? "להשלמה" : "הכול הושלם"
                }
                onClick={() => {
                  setHomePanel("home");
                  setTab("dashboard");
                }}
              />
              <MetricCard
                icon={FileText}
                label="מסמכים"
                value={myDocs.length}
                sublabel="בכספת שלך"
                onClick={guard("לגשת למסמכים לחתימה", () => setTab("documents"))}
              />
            </div>

            <FocusActions
              title="פעולות מהירות"
              items={[
                {
                  icon: locked ? Lock : Wrench,
                  label: "פתיחת תקלה",
                  active: false,
                  onClick: guard("לפתוח תקלה", () => setDialog("ticket")),
                },
                {
                  icon: locked ? Lock : MessagesSquare,
                  label: "צ׳אט",
                  active: homePanel === "chat",
                  onClick: guard("להשתמש בצ׳אט עם המנהל", () => openPanel("chat")),
                },
                {
                  icon: locked ? Lock : Wrench,
                  label: "מעקב",
                  active: homePanel === "tickets",
                  onClick: guard("לצפות במעקב תקלות", () => openPanel("tickets")),
                },
                {
                  icon: locked ? Lock : PenLine,
                  label: "מסמכים",
                  active: homePanel === "docs",
                  onClick: guard("לגשת למסמכים לחתימה", () => setTab("documents")),
                },
              ]}
            />

            {homePanel !== "home" && !locked ? (
              <section className="space-y-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border">
                <SectionHeader title={panelTitles[homePanel]} />
                {homePanel === "chat" && (
                  <ChatPanel
                    inline
                    self={{ id: session.userId, name: session.fullName, role: "tenant" }}
                    peers={[{ id: "u_manager", name: "מנהל הנכסים", subtitle: "ALTMAN Group" }]}
                    title="צ׳אט עם מנהל"
                  />
                )}
                {homePanel === "tickets" && (
                  <TicketsDialog inline propertyIds={[property.id]} readOnly title="מעקב תקלות" />
                )}
                {homePanel === "docs" && (
                  <DocumentsDialog
                    inline
                    searchable
                    documents={myDocs}
                    canSign
                    signerName={session.fullName}
                    properties={tenantProperties}
                    upload={{
                      ownerUserId: user.id,
                      propertyId: property.id,
                      tenantId: tenantId,
                      landlordId: property.landlordId,
                      defaultType: "approval",
                    }}
                  />
                )}
              </section>
            ) : (
              <>
            {/* Active property — compact row */}
            <button
              type="button"
              onClick={() => setDialog("contract")}
              className="flex w-full items-center gap-3 border-y border-border py-3 text-start transition-colors hover:bg-surface-muted/80"
            >
              <PropertyImage variant={property.imageId} src={property.photoUrls?.[0]} className="h-12 w-12 shrink-0" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy">
                  {property.address}, {property.city}
                </p>
                <p className="truncate text-xs text-text-muted">
                  דירה {property.apartmentNumber} · קומה {property.floor}
                </p>
              </div>
              <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                פעילה
              </StatusBadge>
            </button>

            {/* Required onboarding — uploads + awaiting management approval */}
            {showRequiredActions && (
            <section className="space-y-3">
              <SectionHeader title="פעולות נדרשות" />
              <UtilityAccountDetails property={property} tenant={tenant} />
              <div className="grid grid-cols-5 gap-2">
                {utilityOrder.map((u) => {
                  const item = onboarding?.utilities.find((x) => x.utility === u);
                  const uploaded = Boolean(
                    onboarding && (item?.status === "submitted" || item?.status === "approved"),
                  );
                  const Icon = utilityIcon[u];
                  return (
                    <button
                      key={u}
                      onClick={() => !uploaded && startUpload(u)}
                      disabled={uploaded}
                      className="flex flex-col items-center gap-1 rounded-[var(--radius)] bg-surface px-1 py-3 text-center ring-1 ring-border disabled:cursor-default"
                    >
                      <Icon className={"h-5 w-5 " + (uploaded ? "text-success" : "text-orange")} />
                      <span className="text-[0.68rem] font-bold text-navy">{utilityLabelHe(u)}</span>
                      <span className={"text-[0.6rem] font-semibold " + (uploaded ? "text-success" : "text-danger")}>
                        {uploaded ? "הועלה" : "נדרש"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  const pending = !onboarding || onboarding.insurance.status === "pending";
                  if (pending) startUpload("insurance");
                }}
                disabled={Boolean(onboarding && onboarding.insurance.status !== "pending")}
                className={
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start disabled:cursor-default " +
                  (onboarding && onboarding.insurance.status !== "pending"
                    ? "bg-success-soft"
                    : "bg-orange-soft")
                }
              >
                <ShieldAlert
                  className={
                    "h-6 w-6 shrink-0 " +
                    (onboarding && onboarding.insurance.status !== "pending"
                      ? "text-success"
                      : "text-orange")
                  }
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">פוליסת ביטוח</p>
                  <p className="text-xs text-text-muted">
                    {onboarding && onboarding.insurance.status !== "pending"
                      ? "הועלתה בהצלחה"
                      : "נדרש להעלות פוליסת ביטוח בתוקף"}
                  </p>
                </div>
                {onboarding && onboarding.insurance.status !== "pending" ? (
                  <StatusBadge tone="success">הועלה</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">העלאה</StatusBadge>
                )}
              </button>

              {awaitingApproval && (
                <div className="flex items-start gap-3 rounded-2xl bg-orange-soft px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-orange" />
                  <div>
                    <p className="text-sm font-bold text-navy">ממתין לאישור הנהלה</p>
                    <p className="text-xs text-text-muted">
                      כל המסמכים הועלו. לאחר אישור מנהל או עוזר מנהל ניתן יהיה לפתוח תקלות ולהשתמש בשירותים.
                    </p>
                  </div>
                </div>
              )}
            </section>
            )}

            {!showRequiredActions && (
              <section className="space-y-3">
                <SectionHeader title="פרטי חשבונות" />
                <UtilityAccountDetails property={property} tenant={tenant} />
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <button onClick={() => setDialog("contract")} className="rounded-[var(--radius)] bg-surface p-3 text-start ring-1 ring-border">
                <p className="flex items-center gap-1.5 text-xs text-text-muted">
                  <CalendarClock className="h-4 w-4" /> סיום חוזה
                </p>
                <p className="mt-1 text-base font-extrabold text-navy">
                  {leaseEnd ? formatDateSlashes(leaseEnd) : "—"}
                </p>
              </button>
              <button
                onClick={() => markAcFilterCleaned(tenantId)}
                className={
                  "rounded-[var(--radius)] bg-surface p-3 text-start ring-1 ring-border " +
                  (acDue ? "ring-orange" : "")
                }
              >
                <p className="flex items-center gap-1.5 text-xs text-text-muted">
                  <AirVent className="h-4 w-4" /> ניקוי פילטרים
                </p>
                <p className="mt-1 text-sm font-bold text-navy">
                  {acDue ? "נדרש ניקוי כעת" : "כל 3 חודשים"}
                </p>
                <p className="text-[0.7rem] text-text-muted">
                  {acNext ? `הבא: ${formatDateSlashes(acNext)}` : ""}
                </p>
              </button>
            </section>

            {(paymentDays < 0 || (contractDays <= 90 && contractDays >= 0)) && (
              <div className="space-y-1 pb-2 text-xs">
                {paymentDays < 0 && <p className="text-danger">שים/י לב: מועד התשלום חלף.</p>}
                {contractDays <= 90 && contractDays >= 0 && (
                  <p className="text-orange">החוזה מסתיים בעוד {contractDays} ימים — ייתכן שיישלח נספח חידוש.</p>
                )}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-4 px-4 pb-8 pt-2">
            <SectionHeader title="מסמכים" />
            <DocumentsDialog
              inline
              searchable
              documents={myDocs}
              canSign
              signerName={session.fullName}
              properties={tenantProperties}
              upload={{
                ownerUserId: user.id,
                propertyId: property.id,
                tenantId: tenantId,
                landlordId: property.landlordId,
                defaultType: "approval",
              }}
            />
          </div>
        )}

        {tab === "notifications" && (
          <NotificationsTab
            forUserId={user.id}
            forRole="tenant"
            onOpen={(n) => {
              openNotification(n);
            }}
          />
        )}

        {tab === "profile" && (
          <ProfileTab
            userId={user.id}
            fullName={session.fullName}
            role="tenant"
            detail={`${property.address}, ${property.city}`}
            onLogout={logout}
          >
            <div className="flex items-center gap-3 border-y border-border py-3">
              <Wallet className="h-5 w-5 text-navy" />
              <div className="flex-1 text-start">
                <p className="text-xs text-text-muted">שכירות חודשית</p>
                <p className="font-bold text-navy">{formatCurrency(monthlyRent)}</p>
              </div>
            </div>
            <UtilityAccountDetails
              property={property}
              tenant={tenant}
              heading="פרטים להעברת חשבונות"
            />
          </ProfileTab>
        )}
      </div>

      <BottomNavigation items={appBottomNavItems(unread)} active={tab} onSelect={onNav} />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role="tenant"
        userName={session.fullName}
        avatarUrl={user.avatarUrl}
        extraItems={menuItems}
      />
      <TicketModal open={dialog === "ticket"} onClose={() => setDialog(null)} propertyId={property.id} createdById={user.id} />
      <PropertyDetailDialog property={dialog === "contract" ? property : null} onClose={() => setDialog(null)} />

      <Modal
        open={!!lockAction}
        onClose={() => setLockAction(null)}
        title="פעולה נעולה"
        description={
          awaitingApproval
            ? `על מנת ${lockAction ?? "להשתמש בשירות זה"} יש להמתין לאישור הנהלה.`
            : `על מנת ${lockAction ?? "להשתמש בשירות זה"} יש להעלות את:`
        }
      >
        {awaitingApproval ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-orange-soft/60 px-3 py-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
            <p className="text-sm text-navy">
              כל הפעולות הנדרשות הושלמו מצדך. מנהל או עוזר מנהל יאשר וישחרר את החשבון.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pendingLabels.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5 text-sm font-semibold text-navy"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-soft text-orange">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </main>
  );
}
