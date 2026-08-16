"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { seedState, type DataState } from "@/lib/data-state";
import {
  applyRealtimeChange,
  fetchAll,
  persistDiff,
  subscribeToData,
} from "@/lib/supabase/sync";
import { accountDisplayName, normalizeEmail } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import type {
  ActivityLogEntry,
  AppDocument,
  AppNotification,
  DocumentType,
  Expense,
  Landlord,
  Lease,
  MaintenanceTicket,
  Payment,
  Professional,
  Property,
  ProtocolRecord,
  Role,
  Task,
  TaskStatus,
  Tenant,
  TenantOnboarding,
  TicketStatus,
  User,
  UtilityKind,
  OnboardingItemStatus,
  CheckDepositMode,
} from "@/types";

export interface Actor {
  id: string;
  name: string;
  role: Role;
}

export interface NewClientInput {
  // property
  address: string;
  city: string;
  apartmentNumber: string;
  floor: number;
  sizeSqm: number;
  rooms: number;
  bathrooms: number;
  value: number;
  municipalTax: number;
  municipalPropertyNumber?: string;
  buildingFee: number;
  electricityMeter: string;
  imageId: Property["imageId"];
  neighborhood?: string;
  hasInspectionReport?: boolean;
  hasBalcony?: boolean;
  balconySqm?: number;
  hasElevator?: boolean;
  toilets?: number;
  petsAllowed?: boolean;
  accessible?: boolean;
  airDirections?: Property["airDirections"];
  hasParking?: boolean;
  parkingNumber?: string;
  hasStorage?: boolean;
  storageNumber?: string;
  listedRent?: number;
  entryDate?: string;
  keysReceived?: number;
  subcontractorPhones?: string;
  managementCompanyPhone?: string;
  gasMeter?: string;
  waterMeter?: string;
  // landlord — omit / leave empty when attaching to existingLandlordId
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
  landlordIdNumber?: string;
  landlordIdPhotoUploaded?: boolean;
  /** Landlord ID card photo (data URL). */
  landlordIdPhotoDataUrl?: string;
  managementFeePercent?: number;
  checkDepositMode?: CheckDepositMode;
  /** When set, adds a property to this existing landlord instead of creating one. */
  existingLandlordId?: string;
  // tenant — optional; omit to create a vacant property without lease
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantIdNumber?: string;
  // lease — optional when no tenant
  monthlyRent?: number;
  startDate?: string;
  endDate?: string;
  managementStartDate?: string;
  managementEndDate?: string;
  managementFeeBeforeVat?: number;
  managementFeeIncVat?: number;
  /** Management-agreement file (data URL) + original filename. */
  managementAgreementDataUrl?: string;
  managementAgreementFileName?: string;
}

export interface NewTenantInput {
  propertyId: string;
  email: string;
  name?: string;
  phone?: string;
  idNumber?: string;
  monthlyRent?: number;
  startDate?: string;
  endDate?: string;
}

const ALL_UTILITIES: UtilityKind[] = ["arnona", "water", "electricity", "gas", "vaad"];

function recomputeCompleted(ob: TenantOnboarding): TenantOnboarding {
  return {
    ...ob,
    completed:
      ob.utilities.every((u) => u.status === "approved") && ob.insurance.status === "approved",
  };
}

interface DataContextValue extends DataState {
  ready: boolean;
  actor: Actor;
  setActor: (a: Actor) => void;
  /** Last Supabase write error, if a mutation did not persist. */
  persistError: string | null;
  retryPersist: () => void;

  // audit
  log: (action: string, entity?: string, entityId?: string, details?: string) => void;

  // composite
  addClient: (input: NewClientInput) => {
    propertyId: string;
    landlordId: string;
    leaseId?: string;
    tenantId?: string;
  };
  addTenant: (input: NewTenantInput) => {
    tenantId: string;
    leaseId: string;
    userId?: string;
  };
  setUserPassword: (userId: string, passwordHash: string) => void;

  // properties / leases / people
  updateUser: (id: string, patch: Partial<User>) => void;
  updateProperty: (id: string, patch: Partial<Property>) => void;
  updateLease: (id: string, patch: Partial<Lease>) => void;
  updateLandlord: (id: string, patch: Partial<Landlord>) => void;
  updateTenant: (id: string, patch: Partial<Tenant>) => void;

  // payments / expenses
  confirmPaymentClearance: (paymentId: string) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  addExpense: (e: Omit<Expense, "id">) => Expense;

  // tickets
  addTicket: (t: Omit<MaintenanceTicket, "id" | "createdAt" | "status" | "updates"> & { status?: TicketStatus }) => MaintenanceTicket;
  setTicketStatus: (id: string, status: TicketStatus, note?: string) => void;
  assignTicket: (id: string, professionalId: string, scheduledAt?: string) => void;
  /** Upload / replace an invoice document linked to a maintenance ticket. */
  attachTicketInvoice: (ticketId: string, file: { name: string; dataUrl: string }) => AppDocument | null;

  // documents
  addDocument: (d: {
    name: string;
    type: DocumentType;
    propertyId?: string;
    landlordId?: string;
    tenantId?: string;
    ownerUserId?: string;
    fileDataUrl?: string;
    awaitingSignature?: boolean;
  }) => AppDocument;
  signDocument: (id: string, signedByName: string) => void;

  // notifications
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (forUserId?: string, forRole?: Role) => void;

  // professionals
  addProfessional: (p: Omit<Professional, "id" | "active"> & { active?: boolean }) => void;

  // tasks
  addTask: (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;

  // chat
  ensureThread: (a: string, b: string, title: string) => string;
  sendMessage: (threadId: string, from: Actor, text: string) => void;

  // onboarding
  setUtilityStatus: (tenantId: string, utility: UtilityKind, status: OnboardingItemStatus, proofDocId?: string) => void;
  setInsuranceStatus: (tenantId: string, status: OnboardingItemStatus, docId?: string) => void;
  /** Manager/assistant: approve all submitted items and release the tenant account. */
  approveOnboarding: (tenantId: string) => void;
  markAcFilterCleaned: (tenantId: string) => void;

  // protocols
  addProtocol: (p: Omit<ProtocolRecord, "id">) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const DEFAULT_ACTOR: Actor = { id: "u_manager", name: "אבי אלטמן", role: "manager" };

/** Keep at most one unread chat notification per recipient + thread/sender. */
function collapseChatNotifications(list: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  const out: AppNotification[] = [];
  for (const n of list) {
    if (n.kind === "chat" && !n.read) {
      const key = `${n.forUserId ?? ""}:${n.relatedId ?? n.body}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(n);
  }
  return out;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(seedState);
  const [ready, setReady] = useState(false);
  const [actor, setActorState] = useState<Actor>(DEFAULT_ACTOR);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persistNonce, setPersistNonce] = useState(0);
  const actorRef = useRef<Actor>(DEFAULT_ACTOR);
  const prevRef = useRef<DataState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchAll();
        if (cancelled) return;
        if (remote) {
          const merged: DataState = {
            ...seedState(),
            ...remote,
            expenses: remote.expenses ?? [],
            notifications: collapseChatNotifications(remote.notifications ?? []),
          };
          setState(merged);
          prevRef.current = merged;
        } else {
          prevRef.current = seedState();
        }
      } catch {
        if (!cancelled) prevRef.current = seedState();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const prev = prevRef.current;
    if (!prev) return;
    let cancelled = false;
    void (async () => {
      const errors = await persistDiff(prev, state);
      if (cancelled) return;
      if (errors.length === 0) {
        prevRef.current = state;
        setPersistError(null);
        return;
      }
      setPersistError(errors[0] ?? "שמירה לשרת נכשלה");
    })();
    return () => {
      cancelled = true;
    };
  }, [state, ready, persistNonce]);

  useEffect(() => {
    if (!ready) return;
    return subscribeToData((table, event, row) => {
      setState((prev) => {
        const next = applyRealtimeChange(prev, table, event, row);
        if (prevRef.current) {
          prevRef.current = applyRealtimeChange(prevRef.current, table, event, row);
        }
        return next;
      });
    });
  }, [ready]);

  const setActor = useCallback((a: Actor) => {
    actorRef.current = a;
    setActorState(a);
  }, []);

  const retryPersist = useCallback(() => {
    setPersistNonce((n) => n + 1);
  }, []);

  const makeLog = useCallback(
    (action: string, entity?: string, entityId?: string, details?: string): ActivityLogEntry => ({
      id: generateId("log"),
      at: new Date().toISOString(),
      userId: actorRef.current.id,
      userName: actorRef.current.name,
      role: actorRef.current.role,
      action,
      entity,
      entityId,
      details,
    }),
    [],
  );

  const log = useCallback(
    (action: string, entity?: string, entityId?: string, details?: string) => {
      setState((p) => ({ ...p, activityLog: [makeLog(action, entity, entityId, details), ...p.activityLog] }));
    },
    [makeLog],
  );

  const addClient = useCallback<DataContextValue["addClient"]>(
    (input) => {
      const attaching = Boolean(input.existingLandlordId);
      const landlordId = input.existingLandlordId ?? generateId("l");
      const propertyId = generateId("p");
      const nowIso = new Date().toISOString();
      const withTenant = Boolean(
        input.tenantName?.trim() ||
          input.tenantPhone?.trim() ||
          input.tenantEmail?.trim() ||
          input.endDate,
      );
      const tenantId = withTenant ? generateId("t") : undefined;
      const leaseId = withTenant ? generateId("ls") : undefined;

      const landlord: Landlord | null = attaching
        ? null
        : {
            id: landlordId,
            fullName: input.landlordName || "לא צויין",
            phone: input.landlordPhone,
            email: input.landlordEmail,
            propertyIds: [propertyId],
            idNumber: input.landlordIdNumber,
            idPhotoUploaded:
              Boolean(input.landlordIdPhotoDataUrl) ||
              input.landlordIdPhotoUploaded ||
              false,
            managementFeePercent: input.managementFeePercent,
            checkDepositMode: input.checkDepositMode ?? "client",
          };
      const property: Property = {
        id: propertyId,
        address: input.address || "לא צויין",
        city: input.city || "לא צויין",
        apartmentNumber: input.apartmentNumber,
        floor: input.floor,
        sizeSqm: input.sizeSqm,
        rooms: input.rooms,
        bathrooms: input.bathrooms,
        status: withTenant ? "rented" : "vacant",
        value: input.value,
        municipalTax: input.municipalTax,
        municipalPropertyNumber: input.municipalPropertyNumber,
        buildingFee: input.buildingFee,
        electricityMeter: input.electricityMeter,
        imageId: input.imageId,
        landlordId,
        tenantId,
        neighborhood: input.neighborhood,
        hasInspectionReport: input.hasInspectionReport,
        hasBalcony: input.hasBalcony,
        balconySqm: input.balconySqm,
        hasElevator: input.hasElevator,
        toilets: input.toilets,
        petsAllowed: input.petsAllowed,
        accessible: input.accessible,
        airDirections: input.airDirections,
        hasParking: input.hasParking,
        parkingNumber: input.parkingNumber,
        hasStorage: input.hasStorage,
        storageNumber: input.storageNumber,
        listedRent: input.listedRent ?? (input.monthlyRent || undefined),
        entryDate: input.entryDate || input.startDate || undefined,
        keysReceived: input.keysReceived,
        subcontractorPhones: input.subcontractorPhones,
        managementCompanyPhone: input.managementCompanyPhone,
        gasMeter: input.gasMeter,
        waterMeter: input.waterMeter,
      };
      const tenant: Tenant | null = withTenant && tenantId && leaseId
        ? {
            id: tenantId,
            fullName: input.tenantName || "לא צויין",
            phone: input.tenantPhone ?? "",
            email: input.tenantEmail ?? "",
            propertyId,
            leaseId,
            idNumber: input.tenantIdNumber,
            idPhotoUploaded: Boolean(input.tenantIdNumber),
          }
        : null;
      const lease: Lease | null = withTenant && tenantId && leaseId
        ? {
            id: leaseId,
            propertyId,
            tenantId,
            landlordId,
            monthlyRent: input.monthlyRent ?? input.listedRent ?? 0,
            startDate: input.startDate || input.entryDate || nowIso.slice(0, 10),
            endDate: input.endDate || "",
            nextPaymentDate: input.startDate || input.entryDate || nowIso.slice(0, 10),
            active: true,
            managementStartDate: input.managementStartDate,
            managementEndDate: input.managementEndDate,
            managementFeePercent: input.managementFeePercent,
            managementFeeBeforeVat: input.managementFeeBeforeVat,
            managementFeeIncVat: input.managementFeeIncVat,
          }
        : null;
      const onboarding: TenantOnboarding | null =
        withTenant && tenantId && leaseId
          ? {
              tenantId,
              leaseId,
              moveInDate: input.startDate || input.entryDate || nowIso,
              utilities: ALL_UTILITIES.map((utility) => ({ utility, status: "pending" })),
              insurance: { status: "pending" },
              completed: false,
            }
          : null;

      const docs: AppDocument[] = [];
      if (input.landlordIdPhotoDataUrl && !attaching) {
        docs.push({
          id: generateId("doc"),
          name: "תצלום תעודת זהות — משכיר",
          type: "id",
          propertyId,
          landlordId,
          fileDataUrl: input.landlordIdPhotoDataUrl,
          createdAt: nowIso,
          signed: false,
          status: "draft",
        });
      }
      if (input.managementAgreementDataUrl) {
        docs.push({
          id: generateId("doc"),
          name: input.managementAgreementFileName?.trim() || "הסכם ניהול",
          type: "contract",
          propertyId,
          landlordId,
          fileDataUrl: input.managementAgreementDataUrl,
          createdAt: nowIso,
          signed: false,
          status: "draft",
        });
      }

      const loginUsers: User[] = [];
      const landlordEmail = input.landlordEmail.trim();
      if (!attaching && landlordEmail) {
        loginUsers.push({
          id: generateId("u"),
          fullName: accountDisplayName(input.landlordName, landlordEmail),
          role: "landlord",
          email: normalizeEmail(landlordEmail),
          phone: input.landlordPhone.trim() || undefined,
          landlordId,
        });
      }
      const tenantEmail = input.tenantEmail?.trim();
      if (tenant && tenantId && tenantEmail) {
        loginUsers.push({
          id: generateId("u"),
          fullName: accountDisplayName(input.tenantName, tenantEmail),
          role: "tenant",
          email: normalizeEmail(tenantEmail),
          phone: input.tenantPhone?.trim() || undefined,
          tenantId,
        });
      }

      setState((p) => {
        const taken = new Set(
          p.users
            .map((u) => (u.email ? normalizeEmail(u.email) : ""))
            .filter(Boolean),
        );
        const uniqueLogins = loginUsers.filter(
          (u) => u.email && !taken.has(normalizeEmail(u.email)),
        );
        const accountLogs = uniqueLogins.map((u) =>
          makeLog(
            u.role === "landlord" ? "פתיחת חשבון משכיר" : "פתיחת חשבון שוכר",
            "user",
            u.id,
            u.email,
          ),
        );
        return {
          ...p,
          users: uniqueLogins.length ? [...uniqueLogins, ...p.users] : p.users,
          landlords: landlord
            ? [landlord, ...p.landlords]
            : p.landlords.map((l) =>
                l.id === landlordId
                  ? {
                      ...l,
                      propertyIds: [propertyId, ...l.propertyIds],
                      idPhotoUploaded: input.landlordIdPhotoDataUrl ? true : l.idPhotoUploaded,
                    }
                  : l,
              ),
          properties: [property, ...p.properties],
          tenants: tenant ? [tenant, ...p.tenants] : p.tenants,
          leases: lease ? [lease, ...p.leases] : p.leases,
          onboardings: onboarding ? [onboarding, ...p.onboardings] : p.onboardings,
          documents: docs.length ? [...docs, ...p.documents] : p.documents,
          activityLog: [
            makeLog(
              attaching ? "הוספת נכס ללקוח קיים" : "הוספת משכיר חדש",
              "property",
              propertyId,
              `${property.address}, ${property.city}`,
            ),
            ...accountLogs,
            ...docs.map((d) => makeLog("העלאת מסמך", "document", d.id, d.name)),
            ...p.activityLog,
          ],
        };
      });

      return { propertyId, leaseId, tenantId, landlordId };
    },
    [makeLog],
  );

  const addTenant = useCallback<DataContextValue["addTenant"]>(
    (input) => {
      const tenantId = generateId("t");
      const leaseId = generateId("ls");
      const userId = generateId("u");
      const nowIso = new Date().toISOString();
      const email = normalizeEmail(input.email);
      const fullName = accountDisplayName(input.name, email);

      setState((p) => {
        const property = p.properties.find((it) => it.id === input.propertyId);
        if (!property || property.tenantId) return p;

        const tenant: Tenant = {
          id: tenantId,
          fullName,
          phone: input.phone?.trim() ?? "",
          email,
          propertyId: property.id,
          leaseId,
          idNumber: input.idNumber,
          idPhotoUploaded: Boolean(input.idNumber),
        };
        const lease: Lease = {
          id: leaseId,
          propertyId: property.id,
          tenantId,
          landlordId: property.landlordId,
          monthlyRent: input.monthlyRent ?? property.listedRent ?? 0,
          startDate: input.startDate || property.entryDate || nowIso.slice(0, 10),
          endDate: input.endDate || "",
          nextPaymentDate: input.startDate || property.entryDate || nowIso.slice(0, 10),
          active: true,
        };
        const onboarding: TenantOnboarding = {
          tenantId,
          leaseId,
          moveInDate: lease.startDate,
          utilities: ALL_UTILITIES.map((utility) => ({ utility, status: "pending" })),
          insurance: { status: "pending" },
          completed: false,
        };
        const loginUser: User = {
          id: userId,
          fullName,
          role: "tenant",
          email,
          phone: input.phone?.trim() || undefined,
          tenantId,
        };
        const emailTaken = p.users.some(
          (u) => u.email && normalizeEmail(u.email) === email,
        );

        return {
          ...p,
          users: emailTaken ? p.users : [loginUser, ...p.users],
          tenants: [tenant, ...p.tenants],
          leases: [lease, ...p.leases],
          onboardings: [onboarding, ...p.onboardings],
          properties: p.properties.map((it) =>
            it.id === property.id ? { ...it, tenantId, status: "rented" as const } : it,
          ),
          activityLog: [
            makeLog("הוספת שוכר", "tenant", tenantId, fullName),
            ...(emailTaken
              ? []
              : [makeLog("פתיחת חשבון שוכר", "user", userId, email)]),
            ...p.activityLog,
          ],
        };
      });

      return { tenantId, leaseId, userId };
    },
    [makeLog],
  );

  const setUserPassword = useCallback<DataContextValue["setUserPassword"]>(
    (userId, passwordHash) => {
      setState((p) => ({
        ...p,
        users: p.users.map((it) => (it.id === userId ? { ...it, passwordHash } : it)),
        activityLog: [makeLog("קביעת סיסמת כניסה", "user", userId), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const confirmPaymentClearance = useCallback<DataContextValue["confirmPaymentClearance"]>(
    (paymentId) => {
      const now = new Date().toISOString();
      setState((p) => ({
        ...p,
        payments: p.payments.map((pay) =>
          pay.id === paymentId
            ? { ...pay, clearanceConfirmed: true, clearanceConfirmedAt: now, status: pay.status === "upcoming" ? "paid" : pay.status }
            : pay,
        ),
        activityLog: [makeLog("אישור פרעון צ׳ק", "payment", paymentId), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const updatePayment = useCallback<DataContextValue["updatePayment"]>(
    (id, patch) => {
      setState((p) => ({
        ...p,
        payments: p.payments.map((pay) => (pay.id === id ? { ...pay, ...patch } : pay)),
        activityLog: [makeLog("עדכון תשלום", "payment", id), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const addExpense = useCallback<DataContextValue["addExpense"]>(
    (expense) => {
      const row: Expense = { ...expense, id: generateId("ex") };
      setState((p) => ({
        ...p,
        expenses: [row, ...(p.expenses ?? [])],
        activityLog: [makeLog("הוספת הוצאה", "expense", row.id, expense.description), ...p.activityLog],
      }));
      return row;
    },
    [makeLog],
  );

  const updateUser = useCallback<DataContextValue["updateUser"]>(
    (id, patch) => {
      setState((p) => ({
        ...p,
        users: p.users.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        activityLog: [makeLog("עדכון פרופיל", "user", id), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const updateProperty = useCallback<DataContextValue["updateProperty"]>(
    (id, patch) => {
      setState((p) => ({
        ...p,
        properties: p.properties.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        activityLog: [makeLog("עדכון נכס", "property", id), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const updateLease = useCallback<DataContextValue["updateLease"]>(
    (id, patch) => {
      setState((p) => ({
        ...p,
        leases: p.leases.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        activityLog: [makeLog("עדכון שכירות", "lease", id), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const updateLandlord = useCallback<DataContextValue["updateLandlord"]>(
    (id, patch) => {
      setState((p) => ({
        ...p,
        landlords: p.landlords.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        activityLog: [makeLog("עדכון משכיר", "landlord", id), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const updateTenant = useCallback<DataContextValue["updateTenant"]>(
    (id, patch) => {
      setState((p) => ({
        ...p,
        tenants: p.tenants.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        activityLog: [makeLog("עדכון שוכר", "tenant", id), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const addTicket = useCallback<DataContextValue["addTicket"]>(
    (t) => {
      const ticket: MaintenanceTicket = {
        ...t,
        id: generateId("mt"),
        status: t.status ?? "open",
        createdAt: new Date().toISOString(),
        updates: [],
      };
      setState((p) => ({
        ...p,
        tickets: [ticket, ...p.tickets],
        notifications: [
          {
            id: generateId("n"),
            kind: "maintenance",
            title: "קריאת שירות חדשה",
            body: ticket.title,
            createdAt: ticket.createdAt,
            read: false,
            forRole: "manager",
            relatedId: ticket.id,
          },
          ...p.notifications,
        ],
        activityLog: [makeLog("פתיחת קריאת שירות", "ticket", ticket.id, ticket.title), ...p.activityLog],
      }));
      return ticket;
    },
    [makeLog],
  );

  const setTicketStatus = useCallback<DataContextValue["setTicketStatus"]>(
    (id, status, note) => {
      const at = new Date().toISOString();
      setState((p) => {
        const ticket = p.tickets.find((t) => t.id === id);
        return {
          ...p,
          tickets: p.tickets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  updates: [...(t.updates ?? []), { at, byUserId: actorRef.current.id, status, note }],
                }
              : t,
          ),
          notifications: ticket
            ? [
                {
                  id: generateId("n"),
                  kind: "maintenance",
                  title: "עדכון בקריאת שירות",
                  body: `${ticket.title} — ${statusLabelHe(status)}`,
                  createdAt: at,
                  read: false,
                  forUserId: ticket.createdById.startsWith("u_") ? ticket.createdById : undefined,
                  relatedId: ticket.id,
                },
                ...p.notifications,
              ]
            : p.notifications,
          activityLog: [makeLog("עדכון סטטוס תקלה", "ticket", id, statusLabelHe(status)), ...p.activityLog],
        };
      });
    },
    [makeLog],
  );

  const assignTicket = useCallback<DataContextValue["assignTicket"]>(
    (id, professionalId, scheduledAt) => {
      setState((p) => {
        const ticket = p.tickets.find((t) => t.id === id);
        const recipientId = p.users.find((u) => u.professionalId === professionalId)?.id;
        // Notify the assigned professional so they see the new job.
        const notifications = recipientId
          ? [
              {
                id: generateId("n"),
                kind: "maintenance" as const,
                title: "קריאה חדשה שויכה אליך",
                body: `${ticket?.title ?? "קריאת שירות"} שויכה לטיפולך.`,
                createdAt: new Date().toISOString(),
                read: false,
                forUserId: recipientId,
                relatedId: id,
              },
              ...p.notifications,
            ]
          : p.notifications;
        return {
          ...p,
          tickets: p.tickets.map((t) =>
            t.id === id
              ? { ...t, assignedProfessionalId: professionalId, scheduledAt, status: t.status === "open" ? "in_progress" : t.status }
              : t,
          ),
          notifications,
          activityLog: [makeLog("שיוך בעל מקצוע לתקלה", "ticket", id), ...p.activityLog],
        };
      });
    },
    [makeLog],
  );

  const attachTicketInvoice = useCallback<DataContextValue["attachTicketInvoice"]>(
    (ticketId, file) => {
      const ticket = state.tickets.find((t) => t.id === ticketId);
      if (!ticket) return null;
      const property = state.properties.find((prop) => prop.id === ticket.propertyId);
      const doc: AppDocument = {
        id: generateId("doc"),
        name: file.name.trim() || `חשבונית — ${ticket.title}`,
        type: "invoice",
        propertyId: ticket.propertyId,
        landlordId: property?.landlordId,
        fileDataUrl: file.dataUrl,
        createdAt: new Date().toISOString(),
        signed: false,
        status: "draft",
      };
      setState((p) => ({
        ...p,
        documents: [doc, ...p.documents],
        tickets: p.tickets.map((t) => (t.id === ticketId ? { ...t, invoiceDocId: doc.id } : t)),
        activityLog: [
          makeLog("העלאת חשבונית לתקלה", "ticket", ticketId, ticket.title),
          ...p.activityLog,
        ],
      }));
      return doc;
    },
    [state.tickets, state.properties, makeLog],
  );

  const addDocument = useCallback<DataContextValue["addDocument"]>(
    (d) => {
      const doc: AppDocument = {
        id: generateId("doc"),
        name: d.name,
        type: d.type,
        propertyId: d.propertyId,
        landlordId: d.landlordId,
        tenantId: d.tenantId,
        ownerUserId: d.ownerUserId,
        fileDataUrl: d.fileDataUrl,
        createdAt: new Date().toISOString(),
        signed: false,
        status: d.awaitingSignature ? "awaiting_signature" : "draft",
      };
      setState((p) => ({
        ...p,
        documents: [doc, ...p.documents],
        notifications: d.awaitingSignature && d.ownerUserId
          ? [
              {
                id: generateId("n"),
                kind: "signature",
                title: "מסמך ממתין לחתימה",
                body: `${doc.name} ממתין לחתימתך.`,
                createdAt: doc.createdAt,
                read: false,
                forUserId: d.ownerUserId,
                actionRequired: true,
              },
              ...p.notifications,
            ]
          : p.notifications,
        activityLog: [makeLog(d.awaitingSignature ? "שליחת מסמך לחתימה" : "העלאת מסמך", "document", doc.id, doc.name), ...p.activityLog],
      }));
      return doc;
    },
    [makeLog],
  );

  const signDocument = useCallback<DataContextValue["signDocument"]>(
    (id, signedByName) => {
      const at = new Date().toISOString();
      setState((p) => ({
        ...p,
        documents: p.documents.map((doc) =>
          doc.id === id ? { ...doc, signed: true, status: "signed", signedByName, signedAt: at } : doc,
        ),
        activityLog: [makeLog("חתימה על מסמך", "document", id, signedByName), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const addNotification = useCallback<DataContextValue["addNotification"]>((n) => {
    setState((p) => ({
      ...p,
      notifications: [{ ...n, id: generateId("n"), createdAt: new Date().toISOString(), read: false }, ...p.notifications],
    }));
  }, []);

  const markNotificationRead = useCallback<DataContextValue["markNotificationRead"]>((id) => {
    // Dismiss: once opened, the notification disappears from the inbox.
    setState((p) => ({
      ...p,
      notifications: p.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  const markAllNotificationsRead = useCallback<DataContextValue["markAllNotificationsRead"]>(
    (forUserId, forRole) => {
      setState((p) => ({
        ...p,
        notifications: p.notifications.filter((n) => {
          const mine =
            (forUserId && n.forUserId === forUserId) || (forRole && n.forRole === forRole);
          return !mine;
        }),
      }));
    },
    [],
  );

  const addProfessional = useCallback<DataContextValue["addProfessional"]>(
    (pInput) => {
      setState((p) => ({
        ...p,
        professionals: [{ ...pInput, id: generateId("pr"), active: pInput.active ?? true }, ...p.professionals],
        activityLog: [makeLog("הוספת בעל מקצוע", "professional", undefined, pInput.fullName), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const addTask = useCallback<DataContextValue["addTask"]>(
    (t) => {
      setState((p) => ({
        ...p,
        tasks: [{ ...t, id: generateId("tk"), createdAt: new Date().toISOString(), status: t.status ?? "open" }, ...p.tasks],
        activityLog: [makeLog("יצירת משימה", "task", undefined, t.title), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const setTaskStatus = useCallback<DataContextValue["setTaskStatus"]>((id, status) => {
    setState((p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  }, []);

  const ensureThread = useCallback<DataContextValue["ensureThread"]>((a, b, title) => {
    let id = "";
    setState((p) => {
      const existing = p.chatThreads.find(
        (t) => t.participantIds.includes(a) && t.participantIds.includes(b),
      );
      if (existing) {
        id = existing.id;
        return p;
      }
      id = generateId("th");
      return { ...p, chatThreads: [{ id, participantIds: [a, b], title }, ...p.chatThreads] };
    });
    return id;
  }, []);

  const sendMessage = useCallback<DataContextValue["sendMessage"]>((threadId, from, text) => {
    setState((p) => {
      const now = new Date().toISOString();
      const thread = p.chatThreads.find((t) => t.id === threadId);
      const recipientId = thread?.participantIds.find((id) => id !== from.id);
      const message = {
        id: generateId("cm"),
        threadId,
        fromUserId: from.id,
        fromRole: from.role,
        text,
        createdAt: now,
      };

      if (!recipientId) {
        return { ...p, chatMessages: [...p.chatMessages, message] };
      }

      // One unread notification per chat thread (WhatsApp-style), not per message.
      // Also collapses legacy chat notifications (without relatedId) from the same sender.
      const others = p.notifications.filter((n) => {
        if (n.kind !== "chat" || n.read || n.forUserId !== recipientId) return true;
        if (n.relatedId === threadId) return false;
        if (!n.relatedId && n.body.includes(from.name)) return false;
        return true;
      });
      const previousCount = p.notifications.length - others.length;
      const total = previousCount + 1;
      const body =
        total > 1
          ? `${from.name} שלח/ה לך ${total} הודעות חדשות`
          : `${from.name} שלח/ה לך הודעה חדשה`;

      return {
        ...p,
        chatMessages: [...p.chatMessages, message],
        notifications: [
          {
            id: generateId("n"),
            kind: "chat" as const,
            title: "הודעה חדשה בצ׳אט",
            body,
            createdAt: now,
            read: false,
            forUserId: recipientId,
            relatedId: threadId,
          },
          ...others,
        ],
      };
    });
  }, []);

  const setUtilityStatus = useCallback<DataContextValue["setUtilityStatus"]>(
    (tenantId, utility, status, proofDocId) => {
      setState((p) => {
        const prev = p.onboardings.find((o) => o.tenantId === tenantId);
        const onboardings = p.onboardings.map((ob) =>
          ob.tenantId === tenantId
            ? recomputeCompleted({
                ...ob,
                utilities: ob.utilities.map((u) =>
                  u.utility === utility ? { ...u, status, proofDocId, updatedAt: new Date().toISOString() } : u,
                ),
              })
            : ob,
        );
        const updated = onboardings.find((o) => o.tenantId === tenantId);
        const justReady =
          status === "submitted" &&
          updated != null &&
          !updated.completed &&
          updated.utilities.every((u) => u.status === "submitted" || u.status === "approved") &&
          (updated.insurance.status === "submitted" || updated.insurance.status === "approved");
        const justReleased = Boolean(updated?.completed && !prev?.completed);
        const tenantUser = p.users.find((u) => u.tenantId === tenantId);
        const now = new Date().toISOString();

        let notifications = p.notifications;
        if (justReleased && tenantUser) {
          notifications = [
            {
              id: generateId("n"),
              kind: "info" as const,
              title: "החשבון שוחרר",
              body: "ההנהלה אישרה את הפעולות הנדרשות — ניתן לפתוח תקלות ולהשתמש בשירותים.",
              createdAt: now,
              read: false,
              forUserId: tenantUser.id,
              relatedId: tenantId,
            },
            ...notifications,
          ];
        } else if (justReady) {
          notifications = [
            {
              id: generateId("n"),
              kind: "utility" as const,
              title: "ממתין לאישור הנהלה",
              body: "השוכר השלים את כל הפעולות הנדרשות — יש לאשר ולשחרר את החשבון.",
              createdAt: now,
              read: false,
              forRole: "manager" as const,
              actionRequired: true,
              relatedId: tenantId,
            },
            ...notifications,
          ];
        }

        return {
          ...p,
          onboardings,
          notifications,
          activityLog: [
            makeLog("עדכון החלפת חשבון", "utility", tenantId, `${utilityLabelHe(utility)} — ${onboardingStatusHe(status)}`),
            ...p.activityLog,
          ],
        };
      });
    },
    [makeLog],
  );

  const setInsuranceStatus = useCallback<DataContextValue["setInsuranceStatus"]>(
    (tenantId, status, docId) => {
      setState((p) => {
        const prev = p.onboardings.find((o) => o.tenantId === tenantId);
        const onboardings = p.onboardings.map((ob) =>
          ob.tenantId === tenantId
            ? recomputeCompleted({ ...ob, insurance: { status, docId, updatedAt: new Date().toISOString() } })
            : ob,
        );
        const updated = onboardings.find((o) => o.tenantId === tenantId);
        const justReady =
          status === "submitted" &&
          updated != null &&
          !updated.completed &&
          updated.utilities.every((u) => u.status === "submitted" || u.status === "approved") &&
          (updated.insurance.status === "submitted" || updated.insurance.status === "approved");
        const justReleased = Boolean(updated?.completed && !prev?.completed);
        const tenantUser = p.users.find((u) => u.tenantId === tenantId);
        const now = new Date().toISOString();

        let notifications = p.notifications;
        if (justReleased && tenantUser) {
          notifications = [
            {
              id: generateId("n"),
              kind: "info" as const,
              title: "החשבון שוחרר",
              body: "ההנהלה אישרה את הפעולות הנדרשות — ניתן לפתוח תקלות ולהשתמש בשירותים.",
              createdAt: now,
              read: false,
              forUserId: tenantUser.id,
              relatedId: tenantId,
            },
            ...notifications,
          ];
        } else if (justReady) {
          notifications = [
            {
              id: generateId("n"),
              kind: "insurance" as const,
              title: "ממתין לאישור הנהלה",
              body: "השוכר השלים את כל הפעולות הנדרשות — יש לאשר ולשחרר את החשבון.",
              createdAt: now,
              read: false,
              forRole: "manager" as const,
              actionRequired: true,
              relatedId: tenantId,
            },
            ...notifications,
          ];
        }

        return {
          ...p,
          onboardings,
          notifications,
          activityLog: [
            makeLog("עדכון פוליסת ביטוח", "insurance", tenantId, onboardingStatusHe(status)),
            ...p.activityLog,
          ],
        };
      });
    },
    [makeLog],
  );

  const approveOnboarding = useCallback<DataContextValue["approveOnboarding"]>(
    (tenantId) => {
      setState((p) => {
        const now = new Date().toISOString();
        const prev = p.onboardings.find((o) => o.tenantId === tenantId);
        if (!prev || prev.completed) return p;

        const ready =
          prev.utilities.every((u) => u.status === "submitted" || u.status === "approved") &&
          (prev.insurance.status === "submitted" || prev.insurance.status === "approved");
        if (!ready) return p;

        const tenantUser = p.users.find((u) => u.tenantId === tenantId);
        const onboardings = p.onboardings.map((ob) => {
          if (ob.tenantId !== tenantId) return ob;
          return recomputeCompleted({
            ...ob,
            utilities: ob.utilities.map((u) => ({ ...u, status: "approved" as const, updatedAt: now })),
            insurance: { ...ob.insurance, status: "approved" as const, updatedAt: now },
          });
        });

        return {
          ...p,
          onboardings,
          notifications: [
            {
              id: generateId("n"),
              kind: "info" as const,
              title: "החשבון שוחרר",
              body: "ההנהלה אישרה את הפעולות הנדרשות — ניתן לפתוח תקלות ולהשתמש בשירותים.",
              createdAt: now,
              read: false,
              forUserId: tenantUser?.id,
              relatedId: tenantId,
            },
            ...p.notifications,
          ],
          activityLog: [
            makeLog("שחרור חשבון שוכר", "onboarding", tenantId, "אישור הנהלה לאחר השלמת פעולות נדרשות"),
            ...p.activityLog,
          ],
        };
      });
    },
    [makeLog],
  );

  const markAcFilterCleaned = useCallback<DataContextValue["markAcFilterCleaned"]>((tenantId) => {
    setState((p) => ({
      ...p,
      onboardings: p.onboardings.map((ob) =>
        ob.tenantId === tenantId ? { ...ob, acFilterLastCleaned: new Date().toISOString() } : ob,
      ),
    }));
  }, []);

  const addProtocol = useCallback<DataContextValue["addProtocol"]>(
    (protocol) => {
      setState((p) => ({
        ...p,
        protocols: [{ ...protocol, id: generateId("prot") }, ...p.protocols],
        activityLog: [makeLog("יצירת פרוטוקול", "protocol", protocol.propertyId, protocol.type === "entry" ? "כניסה" : "יציאה"), ...p.activityLog],
      }));
    },
    [makeLog],
  );

  const value: DataContextValue = {
    ...state,
    ready,
    actor,
    setActor,
    persistError,
    retryPersist,
    log,
    addClient,
    addTenant,
    setUserPassword,
    updateUser,
    updateProperty,
    updateLease,
    updateLandlord,
    updateTenant,
    confirmPaymentClearance,
    updatePayment,
    addExpense,
    addTicket,
    setTicketStatus,
    assignTicket,
    attachTicketInvoice,
    addDocument,
    signDocument,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    addProfessional,
    addTask,
    setTaskStatus,
    ensureThread,
    sendMessage,
    setUtilityStatus,
    setInsuranceStatus,
    approveOnboarding,
    markAcFilterCleaned,
    addProtocol,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}

/* ---------- shared label helpers (Hebrew) ---------- */

export function statusLabelHe(s: TicketStatus): string {
  return s === "open" ? "פתוחה" : s === "in_progress" ? "בטיפול" : "טופלה";
}

export function utilityLabelHe(u: UtilityKind): string {
  switch (u) {
    case "arnona":
      return "ארנונה";
    case "water":
      return "מים";
    case "electricity":
      return "חשמל";
    case "gas":
      return "גז";
    case "vaad":
      return "ועד בית";
  }
}

export function onboardingStatusHe(s: OnboardingItemStatus): string {
  return s === "approved" ? "אושר" : s === "submitted" ? "הועלה" : "נדרש";
}
