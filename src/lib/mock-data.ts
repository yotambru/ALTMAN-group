import type {
  AppDocument,
  AppNotification,
  Landlord,
  Lease,
  MaintenanceTicket,
  Payment,
  Property,
  Tenant,
  User,
} from "@/types";

/**
 * Static mock data for the prototype. Kept separate from UI so it can later be
 * swapped for API calls without touching components.
 */

export const currentUsers: Record<string, User> = {
  manager: {
    id: "u_manager",
    fullName: "אבי אלטמן",
    role: "manager",
    email: "avi@altmangroup.co.il",
  },
  landlord: {
    id: "u_landlord",
    fullName: "דניאל",
    role: "landlord",
    email: "daniel@example.com",
  },
  tenant: {
    id: "u_tenant",
    fullName: "דני",
    role: "tenant",
    email: "danny@example.com",
  },
};

export const landlords: Landlord[] = [
  {
    id: "l_1",
    fullName: "דניאל כהן",
    phone: "050-1234567",
    email: "daniel@example.com",
    propertyIds: ["p_1", "p_2", "p_3"],
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
    value: 3250000,
    municipalTax: 640,
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
    value: 2450000,
    municipalTax: 520,
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
    status: "rented",
    value: 1150000,
    municipalTax: 410,
    buildingFee: 190,
    electricityMeter: "33871045",
    imageId: "garden",
    landlordId: "l_1",
    tenantId: "t_3",
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
    status: "rented",
    value: 2450000,
    municipalTax: 620,
    buildingFee: 250,
    electricityMeter: "32165478",
    imageId: "boutique",
    landlordId: "l_1",
    tenantId: "t_4",
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
    status: "rented",
    value: 2980000,
    municipalTax: 590,
    buildingFee: 260,
    electricityMeter: "44029156",
    imageId: "residential",
    landlordId: "l_1",
    tenantId: "t_5",
  },
];

export const tenants: Tenant[] = [
  { id: "t_1", fullName: "יוסי לוי", phone: "052-1112233", email: "yossi@example.com", propertyId: "p_1", leaseId: "ls_1" },
  { id: "t_2", fullName: "מיכל כהן", phone: "054-2223344", email: "michal@example.com", propertyId: "p_2", leaseId: "ls_2" },
  { id: "t_3", fullName: "איתן חיון", phone: "053-3334455", email: "eitan@example.com", propertyId: "p_3", leaseId: "ls_3" },
  { id: "t_4", fullName: "רון ברק", phone: "050-4445566", email: "ron@example.com", propertyId: "p_4", leaseId: "ls_4" },
  { id: "t_5", fullName: "דני שמעוני", phone: "058-5556677", email: "danny@example.com", propertyId: "p_5", leaseId: "ls_5" },
];

export const leases: Lease[] = [
  { id: "ls_1", propertyId: "p_1", tenantId: "t_1", landlordId: "l_1", monthlyRent: 6500, startDate: "2024-06-01", endDate: "2026-05-31", nextPaymentDate: "2024-06-01", active: true },
  { id: "ls_2", propertyId: "p_2", tenantId: "t_2", landlordId: "l_1", monthlyRent: 5800, startDate: "2024-06-05", endDate: "2026-06-04", nextPaymentDate: "2024-06-05", active: true },
  { id: "ls_3", propertyId: "p_3", tenantId: "t_3", landlordId: "l_1", monthlyRent: 4200, startDate: "2024-06-10", endDate: "2026-06-09", nextPaymentDate: "2024-06-10", active: true },
  { id: "ls_4", propertyId: "p_4", tenantId: "t_4", landlordId: "l_1", monthlyRent: 6100, startDate: "2024-04-01", endDate: "2026-03-31", nextPaymentDate: "2024-06-01", active: true },
  { id: "ls_5", propertyId: "p_5", tenantId: "t_5", landlordId: "l_1", monthlyRent: 6250, startDate: "2024-09-01", endDate: "2026-09-01", nextPaymentDate: "2026-08-05", active: true },
];

export const payments: Payment[] = [
  { id: "pay_1", leaseId: "ls_1", amount: 6500, dueDate: "2024-06-01", status: "due" },
  { id: "pay_2", leaseId: "ls_2", amount: 5800, dueDate: "2024-06-05", status: "upcoming" },
  { id: "pay_3", leaseId: "ls_3", amount: 4200, dueDate: "2024-06-10", status: "upcoming" },
  { id: "pay_5", leaseId: "ls_5", amount: 6250, dueDate: "2026-08-05", status: "upcoming" },
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
    createdAt: "2026-07-14T09:20:00.000Z",
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
    createdAt: "2026-07-10T07:00:00.000Z",
  },
];

export const documents: AppDocument[] = [
  { id: "doc_1", name: "חוזה שכירות — דיזנגוף 123", type: "contract", propertyId: "p_5", createdAt: "2024-09-01T00:00:00.000Z", signed: true },
  { id: "doc_2", name: "אישור תשלום ארנונה", type: "approval", propertyId: "p_5", createdAt: "2025-01-04T00:00:00.000Z", signed: false },
  { id: "doc_3", name: "דוח שנתי 2024", type: "report", createdAt: "2025-01-15T00:00:00.000Z", signed: false },
  { id: "doc_4", name: "נספח חידוש חוזה", type: "contract", propertyId: "p_1", createdAt: "2026-05-01T00:00:00.000Z", signed: false },
];

export const notifications: AppNotification[] = [
  { id: "n_1", kind: "payment", title: "תשלום מתקרב", body: "הצ\u05F4ק הבא יורד ב-01/06/2025.", createdAt: "2026-07-18T08:00:00.000Z", read: false },
  { id: "n_2", kind: "signature", title: "מסמך ממתין לחתימה", body: "נספח חידוש חוזה ממתין לחתימתך.", createdAt: "2026-07-17T12:30:00.000Z", read: false },
  { id: "n_3", kind: "maintenance", title: "עדכון בתקלה", body: "התקלה שדיווחת עליה בטיפול.", createdAt: "2026-07-15T10:00:00.000Z", read: true },
];

/** Manager top-line summary metrics (from the reference). */
export const managerSummary = {
  properties: 82,
  landlords: 35,
  tenants: 48,
  openTickets: 12,
};

/** Landlord portfolio summary (from the reference). */
export const landlordSummary = {
  totalValue: 8950000,
  updatedAt: "2024-05-12",
  activeProperties: 6,
  totalProperties: 7,
  expectedIncome: 24500,
};

/* ---- helper selectors ---- */

export function getProperty(id: string): Property | undefined {
  return properties.find((p) => p.id === id);
}

export function getTenant(id: string): Tenant | undefined {
  return tenants.find((t) => t.id === id);
}

export function getLeaseByProperty(propertyId: string): Lease | undefined {
  return leases.find((l) => l.propertyId === propertyId);
}
