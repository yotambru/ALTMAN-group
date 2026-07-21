/**
 * Core domain types for the AltmanGroup property-management prototype.
 * These are intentionally backend-agnostic so a real API can map onto them later.
 */

export type Role = "manager" | "landlord" | "tenant";

export interface User {
  id: string;
  fullName: string;
  role: Role;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export type PropertyStatus = "rented" | "vacant" | "maintenance";

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
  /** Estimated market value in ILS */
  value: number;
  /** Monthly municipal tax (ארנונה) in ILS */
  municipalTax: number;
  /** Monthly building-committee fee (ועד בית) in ILS */
  buildingFee: number;
  electricityMeter: string;
  imageId: PropertyImageId;
  landlordId: string;
  tenantId?: string;
}

export type PropertyImageId = "tower" | "residential" | "boutique" | "garden";

export interface Landlord {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  propertyIds: string[];
}

export interface Tenant {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  propertyId: string;
  leaseId: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  monthlyRent: number;
  startDate: string; // ISO
  endDate: string; // ISO
  nextPaymentDate: string; // ISO
  active: boolean;
}

export type PaymentStatus = "paid" | "due" | "upcoming" | "overdue";

export interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  dueDate: string; // ISO
  status: PaymentStatus;
}

export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";

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
}

export type DocumentType =
  | "contract"
  | "approval"
  | "report"
  | "id"
  | "invoice";

export interface AppDocument {
  id: string;
  name: string;
  type: DocumentType;
  propertyId?: string;
  createdAt: string; // ISO
  signed: boolean;
}

export type NotificationKind = "info" | "payment" | "maintenance" | "signature";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
}
