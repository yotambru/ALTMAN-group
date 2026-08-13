import type {
  ActivityLogEntry,
  AppDocument,
  AppNotification,
  ChatMessage,
  ChatThread,
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
  Tenant,
  TenantOnboarding,
  User,
} from "@/types";

/**
 * Seed data for the system. `scripts/seed-supabase.ts` loads this into
 * Supabase; afterwards the shared database is the source of truth. Kept
 * separate from UI so screens stay backend-agnostic.
 */

export const users: User[] = [
  { id: "u_manager", fullName: "אבי אלטמן", role: "manager", email: "avi@altmangroup.co.il", phone: "050-9000001" },
  { id: "u_assistant", fullName: "נועה לוי", role: "assistant", email: "noa@altmangroup.co.il", phone: "050-9000002" },
  { id: "u_landlord", fullName: "דניאל כהן", role: "landlord", email: "daniel@example.com", phone: "050-1234567", landlordId: "l_1" },
  { id: "u_tenant", fullName: "דני שמעוני", role: "tenant", email: "danny@example.com", phone: "058-5556677", tenantId: "t_5" },
  { id: "u_professional", fullName: "יגאל הנדימן", role: "professional", email: "yigal@pro.co.il", phone: "052-7778899", professionalId: "pr_1" },
];

/** Default demo account per role (used for the prototype login). */
export const currentUsers: Record<Role, User> = {
  manager: users[0],
  assistant: users[1],
  landlord: users[2],
  tenant: users[3],
  professional: users[4],
};

export const landlords: Landlord[] = [
  {
    id: "l_1",
    fullName: "דניאל כהן",
    phone: "050-1234567",
    email: "daniel@example.com",
    propertyIds: ["p_1", "p_2", "p_3"],
    idNumber: "025896471",
    idPhotoUploaded: true,
    managementFeePercent: 8,
    checkDepositMode: "client_confirm",
  },
  {
    id: "l_2",
    fullName: "שרה אברהם",
    phone: "054-7654321",
    email: "sara@example.com",
    propertyIds: ["p_4"],
    idNumber: "031547829",
    idPhotoUploaded: true,
    managementFeePercent: 7,
    checkDepositMode: "client",
  },
  {
    id: "l_3",
    fullName: "מאיר פרץ",
    phone: "053-9998877",
    email: "meir@example.com",
    propertyIds: ["p_5"],
    idNumber: "047123658",
    idPhotoUploaded: false,
    managementFeePercent: 8.5,
    checkDepositMode: "company",
  },
];

export const properties: Property[] = [
  {
    id: "p_1",
    address: "תשי\u05F4לר 78",
    city: "תל אביב",
    apartmentNumber: "9",
    floor: 4,
    sizeSqm: 92,
    rooms: 4,
    bathrooms: 2,
    status: "rented",
    /** Anchored at management-start: (6500×12) / 0.03 */
    value: 2600000,
    municipalTax: 640,
    municipalPropertyNumber: "TA-118342",
    buildingFee: 280,
    electricityMeter: "48120973",
    imageId: "tower",
    landlordId: "l_1",
    tenantId: "t_1",
  },
  {
    id: "p_2",
    address: "הארבעה 12",
    city: "תל אביב",
    apartmentNumber: "3",
    floor: 2,
    sizeSqm: 78,
    rooms: 3,
    bathrooms: 1,
    status: "rented",
    value: 2320000,
    municipalTax: 520,
    municipalPropertyNumber: "TA-227815",
    buildingFee: 240,
    electricityMeter: "51902384",
    imageId: "residential",
    landlordId: "l_1",
    tenantId: "t_2",
  },
  {
    id: "p_3",
    address: "דרך השלום 54",
    city: "תל אביב",
    apartmentNumber: "7",
    floor: 3,
    sizeSqm: 64,
    rooms: 3,
    bathrooms: 1,
    status: "vacant",
    value: 1680000,
    municipalTax: 410,
    municipalPropertyNumber: "TA-335120",
    buildingFee: 190,
    electricityMeter: "33871045",
    imageId: "garden",
    landlordId: "l_1",
  },
  {
    id: "p_4",
    address: "החשמונאים 23",
    city: "תל אביב",
    apartmentNumber: "12",
    floor: 3,
    sizeSqm: 85,
    rooms: 4,
    bathrooms: 2,
    status: "renovation",
    value: 2440000,
    municipalTax: 620,
    municipalPropertyNumber: "TA-441007",
    buildingFee: 250,
    electricityMeter: "32165478",
    imageId: "boutique",
    landlordId: "l_2",
  },
  {
    id: "p_5",
    address: "דיזנגוף 123",
    city: "תל אביב",
    apartmentNumber: "12",
    floor: 3,
    sizeSqm: 88,
    rooms: 4,
    bathrooms: 2,
    status: "issue",
    value: 2500000,
    municipalTax: 590,
    municipalPropertyNumber: "TA-559284",
    buildingFee: 260,
    electricityMeter: "44029156",
    imageId: "residential",
    landlordId: "l_3",
    tenantId: "t_5",
  },
];

export const tenants: Tenant[] = [
  { id: "t_1", fullName: "יוסי לוי", phone: "052-1112233", email: "yossi@example.com", propertyId: "p_1", leaseId: "ls_1", idNumber: "301122334", idPhotoUploaded: true },
  { id: "t_2", fullName: "מיכל כהן", phone: "054-2223344", email: "michal@example.com", propertyId: "p_2", leaseId: "ls_2", idNumber: "302233445", idPhotoUploaded: true },
  { id: "t_3", fullName: "איתן חיון", phone: "053-3334455", email: "eitan@example.com", propertyId: "p_3", leaseId: "ls_3", idNumber: "303344556", idPhotoUploaded: false },
  { id: "t_4", fullName: "רון ברק", phone: "050-4445566", email: "ron@example.com", propertyId: "p_4", leaseId: "ls_4", idNumber: "304455667", idPhotoUploaded: true },
  { id: "t_5", fullName: "דני שמעוני", phone: "058-5556677", email: "danny@example.com", propertyId: "p_5", leaseId: "ls_5", idNumber: "305566778", idPhotoUploaded: true },
];

export const leases: Lease[] = [
  {
    id: "ls_1", propertyId: "p_1", tenantId: "t_1", landlordId: "l_1", monthlyRent: 6500,
    startDate: "2024-10-15", endDate: "2026-10-15", nextPaymentDate: "2026-08-01", active: true,
    managementStartDate: "2024-10-15", managementEndDate: "2026-10-15",
    optionDate: "2026-08-15", insuranceRenewalDate: "2026-09-30", guaranteeExpiry: "2026-11-15",
    managementFeePercent: 8, managementFeeBeforeVat: 520, managementFeeIncVat: 608,
  },
  {
    id: "ls_2", propertyId: "p_2", tenantId: "t_2", landlordId: "l_1", monthlyRent: 5800,
    startDate: "2024-09-20", endDate: "2026-09-20", nextPaymentDate: "2026-08-05", active: true,
    managementStartDate: "2024-09-20", managementEndDate: "2026-09-20",
    insuranceRenewalDate: "2026-08-25",
    managementFeePercent: 8, managementFeeBeforeVat: 464, managementFeeIncVat: 543,
  },
  {
    id: "ls_3", propertyId: "p_3", tenantId: "t_3", landlordId: "l_1", monthlyRent: 4200,
    startDate: "2025-01-10", endDate: "2027-01-10", nextPaymentDate: "2026-08-10", active: false,
    managementStartDate: "2025-01-10", managementEndDate: "2027-01-10",
    managementFeePercent: 8, managementFeeBeforeVat: 336, managementFeeIncVat: 393,
  },
  {
    id: "ls_4", propertyId: "p_4", tenantId: "t_4", landlordId: "l_2", monthlyRent: 6100,
    startDate: "2024-08-30", endDate: "2026-08-30", nextPaymentDate: "2026-08-01", active: false,
    managementStartDate: "2024-08-30", managementEndDate: "2026-08-30",
    optionDate: "2026-08-01", insuranceRenewalDate: "2026-09-10",
    managementFeePercent: 7, managementFeeBeforeVat: 427, managementFeeIncVat: 500,
  },
  {
    id: "ls_5", propertyId: "p_5", tenantId: "t_5", landlordId: "l_3", monthlyRent: 6250,
    startDate: "2026-07-20", endDate: "2028-07-20", nextPaymentDate: "2026-08-05", active: true,
    managementStartDate: "2026-07-20", managementEndDate: "2028-07-20",
    insuranceRenewalDate: "2027-07-20",
    managementFeePercent: 8.5, managementFeeBeforeVat: 531, managementFeeIncVat: 621,
  },
];

export const payments: Payment[] = [
  { id: "pay_1a", leaseId: "ls_1", amount: 6500, dueDate: "2026-05-01", status: "paid", method: "check", checkNumber: "1001", depositDate: "2026-05-01", clearanceConfirmed: true, clearanceConfirmedAt: "2026-05-03T10:00:00.000Z" },
  { id: "pay_1b", leaseId: "ls_1", amount: 6500, dueDate: "2026-06-01", status: "paid", method: "check", checkNumber: "1002", depositDate: "2026-06-01", clearanceConfirmed: true, clearanceConfirmedAt: "2026-06-02T09:00:00.000Z" },
  { id: "pay_1c", leaseId: "ls_1", amount: 6500, dueDate: "2026-07-01", status: "paid", method: "check", checkNumber: "1003", depositDate: "2026-07-01", clearanceConfirmed: false },
  { id: "pay_1", leaseId: "ls_1", amount: 6500, dueDate: "2026-08-01", status: "upcoming", method: "check", checkNumber: "1004", depositDate: "2026-08-01" },
  { id: "pay_2a", leaseId: "ls_2", amount: 5800, dueDate: "2026-06-05", status: "paid", method: "check", checkNumber: "2041", depositDate: "2026-06-05", clearanceConfirmed: true, clearanceConfirmedAt: "2026-06-06T11:00:00.000Z" },
  { id: "pay_2b", leaseId: "ls_2", amount: 5800, dueDate: "2026-07-05", status: "paid", method: "check", checkNumber: "2042", depositDate: "2026-07-05" },
  { id: "pay_2", leaseId: "ls_2", amount: 5800, dueDate: "2026-08-05", status: "upcoming", method: "check", checkNumber: "2043", depositDate: "2026-08-05" },
  { id: "pay_5a", leaseId: "ls_5", amount: 6250, dueDate: "2026-07-05", status: "paid", method: "transfer" },
  { id: "pay_5", leaseId: "ls_5", amount: 6250, dueDate: "2026-08-05", status: "upcoming", method: "check", checkNumber: "8801", depositDate: "2026-08-05" },
];

export const expenses: Expense[] = [
  { id: "ex_1", landlordId: "l_1", propertyId: "p_1", amount: 1800, date: "2026-03-12", description: "תיקון אינסטלציה" },
  { id: "ex_2", landlordId: "l_1", propertyId: "p_2", amount: 950, date: "2026-05-20", description: "ביטוח מבנה" },
  { id: "ex_3", landlordId: "l_1", amount: 420, date: "2026-06-01", description: "עמלת בנק / הפקדות" },
];

export const maintenanceTickets: MaintenanceTicket[] = [
  {
    id: "mt_1",
    propertyId: "p_5",
    createdById: "t_5",
    title: "נזילה במטבח",
    description: "יש נזילה מתחת לכיור במטבח, נדרש טיפול דחוף.",
    category: "אינסטלציה",
    priority: "high",
    status: "open",
    createdAt: "2026-07-24T09:20:00.000Z",
    updates: [],
  },
  {
    id: "mt_2",
    propertyId: "p_2",
    createdById: "t_2",
    title: "תקלה בדוד חשמל",
    description: "אין מים חמים בשעות הבוקר.",
    category: "חשמל",
    priority: "medium",
    status: "in_progress",
    createdAt: "2026-07-20T07:00:00.000Z",
    assignedProfessionalId: "pr_2",
    scheduledAt: "2026-07-30T08:00:00.000Z",
    updates: [
      { at: "2026-07-21T10:00:00.000Z", byUserId: "u_manager", status: "in_progress", note: "שובץ חשמלאי, טיפול נקבע." },
    ],
  },
];

export const documents: AppDocument[] = [
  { id: "doc_1", name: "חוזה שכירות — דיזנגוף 123", type: "contract", propertyId: "p_5", landlordId: "l_3", tenantId: "t_5", createdAt: "2026-07-20T00:00:00.000Z", signed: true, status: "signed", ownerUserId: "u_tenant", signedByName: "דני שמעוני", signedAt: "2026-07-20T10:00:00.000Z" },
  { id: "doc_2", name: "אישור תשלום ארנונה", type: "approval", propertyId: "p_5", landlordId: "l_3", tenantId: "t_5", createdAt: "2026-07-22T00:00:00.000Z", signed: false, status: "draft" },
  { id: "doc_3", name: "דוח שנתי 2025", type: "report", landlordId: "l_1", createdAt: "2026-01-15T00:00:00.000Z", signed: false, status: "draft", ownerUserId: "u_landlord" },
  { id: "doc_4", name: "נספח חידוש חוזה — תשי\u05F4לר 78", type: "contract", propertyId: "p_1", landlordId: "l_1", tenantId: "t_1", createdAt: "2026-07-25T00:00:00.000Z", signed: false, status: "awaiting_signature", ownerUserId: "u_landlord" },
  { id: "doc_5", name: "חוזה שכירות — תשי\u05F4לר 78", type: "contract", propertyId: "p_1", landlordId: "l_1", tenantId: "t_1", createdAt: "2024-10-15T00:00:00.000Z", signed: true, status: "signed", ownerUserId: "u_landlord", signedByName: "דניאל כהן", signedAt: "2024-10-15T12:00:00.000Z" },
  { id: "doc_6", name: "פוליסת ביטוח מבנה — תשי\u05F4לר 78", type: "insurance", propertyId: "p_1", landlordId: "l_1", createdAt: "2025-09-01T00:00:00.000Z", signed: false, status: "draft", ownerUserId: "u_landlord" },
  { id: "doc_7", name: "חוזה שכירות — הארבעה 12", type: "contract", propertyId: "p_2", landlordId: "l_1", tenantId: "t_2", createdAt: "2024-09-20T00:00:00.000Z", signed: true, status: "signed", ownerUserId: "u_landlord", signedByName: "דניאל כהן", signedAt: "2024-09-20T11:00:00.000Z" },
  { id: "doc_8", name: "אישור ועד בית — הארבעה 12", type: "approval", propertyId: "p_2", landlordId: "l_1", createdAt: "2026-03-10T00:00:00.000Z", signed: false, status: "draft", ownerUserId: "u_landlord" },
  { id: "doc_9", name: "טופס מסירה — דרך השלום 54", type: "protocol", propertyId: "p_3", landlordId: "l_1", createdAt: "2026-06-01T00:00:00.000Z", signed: false, status: "draft", ownerUserId: "u_landlord" },
  { id: "doc_10", name: "מסמך רשות מקומית — ארנונה", type: "approval", propertyId: "p_2", landlordId: "l_1", createdAt: "2026-04-10T00:00:00.000Z", signed: false, status: "draft", ownerUserId: "u_landlord" },
];

export const notifications: AppNotification[] = [
  { id: "n_1", kind: "signature", title: "מסמך ממתין לחתימה", body: "נספח חידוש חוזה ממתין לחתימתך.", createdAt: "2026-07-25T12:30:00.000Z", read: false, forRole: "landlord", actionRequired: true },
  { id: "n_2", kind: "maintenance", title: "עדכון בתקלה", body: "התקלה שדיווחת עליה בטיפול.", createdAt: "2026-07-21T10:00:00.000Z", read: true, forUserId: "u_tenant" },
];

export const professionals: Professional[] = [
  { id: "pr_1", fullName: "יגאל הנדימן", trade: "תחזוקה כללית", phone: "052-7778899", email: "yigal@pro.co.il", rating: 4.8, active: true },
  { id: "pr_2", fullName: "רמי חשמל", trade: "חשמל", phone: "050-3332211", email: "rami@pro.co.il", rating: 4.6, active: true },
  { id: "pr_3", fullName: "שלומי מיזוג", trade: "מיזוג אוויר", phone: "054-1230099", rating: 4.9, active: true },
  { id: "pr_4", fullName: "דוד אינסטלציה", trade: "אינסטלציה", phone: "053-4567890", rating: 4.7, active: true },
];

export const tasks: Task[] = [
  { id: "tk_1", title: "לתאם חתימת נספח חידוש — תשי\u05F4לר 78", assigneeUserId: "u_assistant", dueDate: "2026-07-31", status: "open", createdAt: "2026-07-25T09:00:00.000Z", createdById: "u_manager", relatedPropertyId: "p_1" },
  { id: "tk_2", title: "מעקב אחר החלפת חשבונות — דיזנגוף 123", assigneeUserId: "u_manager", dueDate: "2026-08-03", status: "in_progress", createdAt: "2026-07-22T09:00:00.000Z", createdById: "u_manager", relatedPropertyId: "p_5" },
];

export const chatThreads: ChatThread[] = [
  { id: "th_mgr_tenant", participantIds: ["u_manager", "u_tenant"], title: "מנהל · דני שמעוני" },
  { id: "th_mgr_landlord", participantIds: ["u_manager", "u_landlord"], title: "מנהל · דניאל כהן" },
];

export const chatMessages: ChatMessage[] = [
  { id: "cm_1", threadId: "th_mgr_tenant", fromUserId: "u_manager", fromRole: "manager", text: "שלום דני! ברוך הבא. נשמח שתשלים את החלפת החשבונות ותעלה פוליסת ביטוח.", createdAt: "2026-07-20T09:14:00.000Z" },
  { id: "cm_2", threadId: "th_mgr_tenant", fromUserId: "u_tenant", fromRole: "tenant", text: "תודה! אני על זה השבוע.", createdAt: "2026-07-20T09:16:00.000Z" },
  { id: "cm_3", threadId: "th_mgr_landlord", fromUserId: "u_landlord", fromRole: "landlord", text: "היי, מתי מתקבל התשלום הבא?", createdAt: "2026-07-24T11:00:00.000Z" },
  { id: "cm_4", threadId: "th_mgr_landlord", fromUserId: "u_manager", fromRole: "manager", text: "התשלום צפוי ב-01/08. נעדכן ברגע שנקלט.", createdAt: "2026-07-24T11:05:00.000Z" },
];

const utilityKinds = ["arnona", "water", "electricity", "gas", "vaad"] as const;

export const onboardings: TenantOnboarding[] = [
  {
    tenantId: "t_5",
    leaseId: "ls_5",
    moveInDate: "2026-07-20T00:00:00.000Z",
    utilities: utilityKinds.map((utility) => ({
      utility,
      status: utility === "electricity" || utility === "water" ? "submitted" : "pending",
    })),
    insurance: { status: "pending" },
    completed: false,
  },
];

export const protocols: ProtocolRecord[] = [];

export const activityLog: ActivityLogEntry[] = [];

/** Portfolio "as-of" date shown on the landlord hero. */
export const landlordSummary = {
  updatedAt: "2026-07-25",
};

/* ---- helper selectors (operate on the static seed; store has live ones) ---- */

export function getProperty(id: string): Property | undefined {
  return properties.find((p) => p.id === id);
}

export function getTenant(id: string): Tenant | undefined {
  return tenants.find((t) => t.id === id);
}

export function getLeaseByProperty(propertyId: string): Lease | undefined {
  return leases.find((l) => l.propertyId === propertyId);
}
