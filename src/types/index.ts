/**
 * Core domain types for the AltmanGroup property-management system.
 * These are intentionally backend-agnostic so a real API can map onto them later.
 * The client-side data store (`src/lib/store.tsx`) syncs them to Supabase.
 */

export type Role = "manager" | "assistant" | "landlord" | "tenant" | "professional";

export interface User {
  id: string;
  fullName: string;
  role: Role;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  /** Links a login account to its domain record. */
  landlordId?: string;
  tenantId?: string;
  professionalId?: string;
}

/**
 * Operational status shown on property lists / filters.
 * Occupancy % counts only `rented`.
 */
export type PropertyStatus =
  | "vacant"
  | "rented"
  | "in_process"
  | "renovation"
  | "issue";

export type AirDirection = "north" | "south" | "east" | "west";

export interface Property {
  id: string;
  address: string;
  city: string;
  apartmentNumber: string;
  floor: number;
  sizeSqm: number;
  rooms: number;
  bathrooms: number;
  status: PropertyStatus;
  /**
   * Estimated market value in ILS.
   * Prefer anchoring at management-start via average Israeli yield so rent
   * growth raises yield % (see `lib/portfolio.ts`) instead of revaluing 1:1.
   */
  value: number;
  /** Monthly municipal tax (ארנונה) in ILS */
  municipalTax: number;
  /** Property number at the municipality (מספר נכס בארנונה) */
  municipalPropertyNumber?: string;
  /** Monthly building-committee fee (ועד בית) in ILS */
  buildingFee: number;
  electricityMeter: string;
  imageId: PropertyImageId;
  landlordId: string;
  tenantId?: string;
  /** Neighborhood (שכונה) */
  neighborhood?: string;
  /** Whether an inspection report (דוח בדק) exists */
  hasInspectionReport?: boolean;
  hasBalcony?: boolean;
  balconySqm?: number;
  hasElevator?: boolean;
  /** Number of toilets / WCs (מס׳ שירותים), separate from bathrooms */
  toilets?: number;
  petsAllowed?: boolean;
  /** Accessible for people with disabilities (גישה לנכים) */
  accessible?: boolean;
  airDirections?: AirDirection[];
  hasParking?: boolean;
  parkingNumber?: string;
  hasStorage?: boolean;
  storageNumber?: string;
  /** Asking / listed monthly rent from intake (שכ״ד), before a lease exists */
  listedRent?: number;
  /** Planned / actual move-in date from intake (תאריך כניסה) */
  entryDate?: string;
  keysReceived?: number;
  /** Subcontractor phones for new apartments */
  subcontractorPhones?: string;
  managementCompanyPhone?: string;
  gasMeter?: string;
  waterMeter?: string;
}

export type PropertyImageId = "tower" | "residential" | "boutique" | "garden";

/**
 * Where rent checks are deposited.
 * - client: landlord deposits themselves; dates + optional auto-reminder only
 * - client_confirm: same, but landlord confirms clearance with a tap
 * - company: ALTMAN deposits; full tracking (future-ready)
 */
export type CheckDepositMode = "client" | "client_confirm" | "company";

export interface Landlord {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  propertyIds: string[];
  /** National ID (ת"ז) */
  idNumber?: string;
  idPhotoUploaded?: boolean;
  /** Management fee the landlord pays ALTMAN, as a percentage of rent. */
  managementFeePercent?: number;
  /** Check deposit workflow for this client. Default: client. */
  checkDepositMode?: CheckDepositMode;
}

export interface Tenant {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  propertyId: string;
  leaseId: string;
  idNumber?: string;
  idPhotoUploaded?: boolean;
}

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  monthlyRent: number;
  startDate: string; // ISO — lease start
  endDate: string; // ISO — lease end
  nextPaymentDate: string; // ISO
  active: boolean;
  /** Management-agreement period (הסכם ניהול). */
  managementStartDate?: string; // ISO
  managementEndDate?: string; // ISO
  /** Critical dates for alerts. */
  optionDate?: string; // ISO — מועד מימוש אופציה
  guaranteeExpiry?: string; // ISO — פקיעת בטוחות/ערבויות
  insuranceRenewalDate?: string; // ISO — חידוש ביטוח
  /** Management fee breakdown (what the landlord pays ALTMAN). */
  managementFeePercent?: number;
  managementFeeBeforeVat?: number;
  managementFeeIncVat?: number;
}

export type PaymentStatus = "paid" | "due" | "upcoming" | "overdue";
export type PaymentMethod = "check" | "transfer" | "cash" | "other";

export interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  dueDate: string; // ISO
  status: PaymentStatus;
  method?: PaymentMethod;
  /** Check number when method is check. */
  checkNumber?: string;
  /** Planned / actual deposit date for the check. */
  depositDate?: string; // ISO
  /** Landlord confirmed the check cleared (client_confirm / company modes). */
  clearanceConfirmed?: boolean;
  clearanceConfirmedAt?: string; // ISO
}

/** Landlord expense (for annual net-income reports). */
export interface Expense {
  id: string;
  landlordId: string;
  propertyId?: string;
  amount: number;
  date: string; // ISO
  description: string;
  /** Linked invoice document id when uploaded. */
  invoiceDocId?: string;
}

export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface TicketUpdate {
  at: string; // ISO
  byUserId: string;
  status: TicketStatus;
  note?: string;
}

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  createdById: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string; // ISO
  /** Optional attached photo (data URL for the prototype). */
  photoDataUrl?: string;
  /** Assigned professional (בעל מקצוע). */
  assignedProfessionalId?: string;
  scheduledAt?: string; // ISO — מועד טיפול
  resolutionNotes?: string;
  /** Linked invoice document id when uploaded for this ticket. */
  invoiceDocId?: string;
  updates?: TicketUpdate[];
}

export type DocumentType =
  | "contract"
  | "approval"
  | "report"
  | "id"
  | "invoice"
  | "insurance"
  | "utility"
  | "protocol";

export type DocumentStatus = "draft" | "awaiting_signature" | "signed";

export interface AppDocument {
  id: string;
  name: string;
  type: DocumentType;
  propertyId?: string;
  /** Optional direct links for search / folder filters. */
  landlordId?: string;
  tenantId?: string;
  createdAt: string; // ISO
  signed: boolean;
  status?: DocumentStatus;
  /** Which user is expected to sign / owns the doc. */
  ownerUserId?: string;
  signedByName?: string;
  signedAt?: string; // ISO
  /** Uploaded file contents (data URL) for the prototype. */
  fileDataUrl?: string;
}

export type NotificationKind =
  | "info"
  | "payment"
  | "maintenance"
  | "signature"
  | "utility"
  | "insurance"
  | "reminder"
  | "critical"
  | "chat";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
  /** Targeting: a specific user and/or a role. */
  forUserId?: string;
  forRole?: Role;
  /** Whether this notification blocks/nudges until an action is taken. */
  actionRequired?: boolean;
  /** Optional link to an entity (e.g. chat thread id) for grouping / navigation. */
  relatedId?: string;
}

/* ---------- Utilities / onboarding (account switch tracking) ---------- */

export type UtilityKind =
  | "arnona"
  | "water"
  | "electricity"
  | "gas"
  | "vaad";

export type OnboardingItemStatus = "pending" | "submitted" | "approved";

export interface UtilitySwitch {
  utility: UtilityKind;
  status: OnboardingItemStatus;
  proofDocId?: string;
  updatedAt?: string; // ISO
}

export interface InsuranceStatus {
  status: OnboardingItemStatus;
  docId?: string;
  updatedAt?: string; // ISO
}

/** Tenant move-in onboarding: utility switches, insurance and AC reminders. */
export interface TenantOnboarding {
  tenantId: string;
  leaseId: string;
  /** Start of the transition period (usually move-in / lease start). */
  moveInDate: string; // ISO
  utilities: UtilitySwitch[];
  insurance: InsuranceStatus;
  /** Last time AC filters were marked as cleaned. */
  acFilterLastCleaned?: string; // ISO
  completed: boolean;
}

/* ---------- Chat ---------- */

export interface ChatMessage {
  id: string;
  threadId: string;
  fromUserId: string;
  fromRole: Role;
  text: string;
  createdAt: string; // ISO
}

export interface ChatThread {
  id: string;
  /** The two participant user ids. */
  participantIds: [string, string];
  title: string;
}

/* ---------- Professionals ---------- */

export interface Professional {
  id: string;
  fullName: string;
  trade: string; // תחום — אינסטלציה, חשמל...
  phone: string;
  email?: string;
  rating?: number;
  active: boolean;
}

/* ---------- Central task calendar ---------- */

export type TaskStatus = "open" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeUserId?: string;
  dueDate?: string; // ISO
  status: TaskStatus;
  createdAt: string; // ISO
  createdById: string;
  relatedTicketId?: string;
  relatedPropertyId?: string;
}

/* ---------- Entry / exit protocol ---------- */

export type ProtocolType = "entry" | "exit";

export interface ProtocolChecklistItem {
  label: string;
  ok: boolean;
  note?: string;
}

export interface ProtocolRecord {
  id: string;
  propertyId: string;
  leaseId?: string;
  type: ProtocolType;
  date: string; // ISO
  meterElectricity?: string;
  meterWater?: string;
  meterGas?: string;
  items: ProtocolChecklistItem[];
  photoDataUrls: string[];
  keysHandedOver: boolean;
  signedByTenant: boolean;
  signedByManager: boolean;
  notes?: string;
}

/* ---------- Activity log (audit) ---------- */

export interface ActivityLogEntry {
  id: string;
  at: string; // ISO
  userId: string;
  userName: string;
  role: Role;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
}
