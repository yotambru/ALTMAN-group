import type { DataState } from "@/lib/data-state";
import type {
  ActivityLogEntry,
  AirDirection,
  AppDocument,
  AppNotification,
  ChatMessage,
  ChatThread,
  CheckDepositMode,
  DocumentStatus,
  DocumentType,
  Expense,
  InsuranceStatus,
  Landlord,
  Lease,
  MaintenanceTicket,
  NotificationKind,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Professional,
  Property,
  PropertyImageId,
  PropertyStatus,
  ProtocolChecklistItem,
  ProtocolRecord,
  ProtocolType,
  Role,
  Task,
  TaskStatus,
  Tenant,
  TenantOnboarding,
  TicketPriority,
  TicketStatus,
  TicketUpdate,
  User,
  UtilitySwitch,
} from "@/types";

export type Row = Record<string, unknown>;

function opt<T>(value: T | null | undefined): T | undefined {
  return value == null ? undefined : value;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function strArr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type CollectionKey = keyof DataState;

export interface CollectionSpec<T> {
  key: CollectionKey;
  table: string;
  idColumn: string;
  getId: (item: T) => string;
  toRow: (item: T) => Row;
  fromRow: (row: Row) => T;
}

function userToRow(u: User): Row {
  return {
    id: u.id,
    full_name: u.fullName,
    role: u.role,
    email: u.email ?? null,
    phone: u.phone ?? null,
    avatar_url: u.avatarUrl ?? null,
    landlord_id: u.landlordId ?? null,
    tenant_id: u.tenantId ?? null,
    professional_id: u.professionalId ?? null,
  };
}

function userFromRow(row: Row): User {
  return {
    id: str(row.id),
    fullName: str(row.full_name),
    role: str(row.role) as Role,
    email: opt(row.email as string | null),
    phone: opt(row.phone as string | null),
    avatarUrl: opt(row.avatar_url as string | null),
    landlordId: opt(row.landlord_id as string | null),
    tenantId: opt(row.tenant_id as string | null),
    professionalId: opt(row.professional_id as string | null),
  };
}

function landlordToRow(l: Landlord): Row {
  return {
    id: l.id,
    full_name: l.fullName,
    phone: l.phone,
    email: l.email,
    property_ids: l.propertyIds,
    id_number: l.idNumber ?? null,
    id_photo_uploaded: l.idPhotoUploaded ?? null,
    management_fee_percent: l.managementFeePercent ?? null,
    check_deposit_mode: l.checkDepositMode ?? null,
  };
}

function landlordFromRow(row: Row): Landlord {
  return {
    id: str(row.id),
    fullName: str(row.full_name),
    phone: str(row.phone),
    email: str(row.email),
    propertyIds: strArr(row.property_ids),
    idNumber: opt(row.id_number as string | null),
    idPhotoUploaded: opt(row.id_photo_uploaded as boolean | null),
    managementFeePercent: opt(row.management_fee_percent as number | null),
    checkDepositMode: opt(row.check_deposit_mode as CheckDepositMode | null),
  };
}

function propertyToRow(p: Property): Row {
  return {
    id: p.id,
    address: p.address,
    city: p.city,
    apartment_number: p.apartmentNumber,
    floor: p.floor,
    size_sqm: p.sizeSqm,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    status: p.status,
    value: p.value,
    municipal_tax: p.municipalTax,
    municipal_property_number: p.municipalPropertyNumber ?? null,
    building_fee: p.buildingFee,
    electricity_meter: p.electricityMeter,
    image_id: p.imageId,
    landlord_id: p.landlordId,
    tenant_id: p.tenantId ?? null,
    neighborhood: p.neighborhood ?? null,
    has_inspection_report: p.hasInspectionReport ?? null,
    has_balcony: p.hasBalcony ?? null,
    balcony_sqm: p.balconySqm ?? null,
    has_elevator: p.hasElevator ?? null,
    toilets: p.toilets ?? null,
    pets_allowed: p.petsAllowed ?? null,
    accessible: p.accessible ?? null,
    air_directions: p.airDirections ?? null,
    has_parking: p.hasParking ?? null,
    parking_number: p.parkingNumber ?? null,
    has_storage: p.hasStorage ?? null,
    storage_number: p.storageNumber ?? null,
    listed_rent: p.listedRent ?? null,
    entry_date: p.entryDate ?? null,
    keys_received: p.keysReceived ?? null,
    subcontractor_phones: p.subcontractorPhones ?? null,
    management_company_phone: p.managementCompanyPhone ?? null,
    gas_meter: p.gasMeter ?? null,
    water_meter: p.waterMeter ?? null,
  };
}

function propertyFromRow(row: Row): Property {
  return {
    id: str(row.id),
    address: str(row.address),
    city: str(row.city),
    apartmentNumber: str(row.apartment_number),
    floor: num(row.floor),
    sizeSqm: num(row.size_sqm),
    rooms: num(row.rooms),
    bathrooms: num(row.bathrooms),
    status: str(row.status, "vacant") as PropertyStatus,
    value: num(row.value),
    municipalTax: num(row.municipal_tax),
    municipalPropertyNumber: opt(row.municipal_property_number as string | null),
    buildingFee: num(row.building_fee),
    electricityMeter: str(row.electricity_meter),
    imageId: str(row.image_id, "residential") as PropertyImageId,
    landlordId: str(row.landlord_id),
    tenantId: opt(row.tenant_id as string | null),
    neighborhood: opt(row.neighborhood as string | null),
    hasInspectionReport: opt(row.has_inspection_report as boolean | null),
    hasBalcony: opt(row.has_balcony as boolean | null),
    balconySqm: opt(row.balcony_sqm as number | null),
    hasElevator: opt(row.has_elevator as boolean | null),
    toilets: opt(row.toilets as number | null),
    petsAllowed: opt(row.pets_allowed as boolean | null),
    accessible: opt(row.accessible as boolean | null),
    airDirections: row.air_directions == null ? undefined : (strArr(row.air_directions) as AirDirection[]),
    hasParking: opt(row.has_parking as boolean | null),
    parkingNumber: opt(row.parking_number as string | null),
    hasStorage: opt(row.has_storage as boolean | null),
    storageNumber: opt(row.storage_number as string | null),
    listedRent: opt(row.listed_rent as number | null),
    entryDate: opt(row.entry_date as string | null),
    keysReceived: opt(row.keys_received as number | null),
    subcontractorPhones: opt(row.subcontractor_phones as string | null),
    managementCompanyPhone: opt(row.management_company_phone as string | null),
    gasMeter: opt(row.gas_meter as string | null),
    waterMeter: opt(row.water_meter as string | null),
  };
}

function tenantToRow(t: Tenant): Row {
  return {
    id: t.id,
    full_name: t.fullName,
    phone: t.phone,
    email: t.email,
    property_id: t.propertyId,
    lease_id: t.leaseId,
    id_number: t.idNumber ?? null,
    id_photo_uploaded: t.idPhotoUploaded ?? null,
  };
}

function tenantFromRow(row: Row): Tenant {
  return {
    id: str(row.id),
    fullName: str(row.full_name),
    phone: str(row.phone),
    email: str(row.email),
    propertyId: str(row.property_id),
    leaseId: str(row.lease_id),
    idNumber: opt(row.id_number as string | null),
    idPhotoUploaded: opt(row.id_photo_uploaded as boolean | null),
  };
}

function leaseToRow(l: Lease): Row {
  return {
    id: l.id,
    property_id: l.propertyId,
    tenant_id: l.tenantId,
    landlord_id: l.landlordId,
    monthly_rent: l.monthlyRent,
    start_date: l.startDate,
    end_date: l.endDate,
    next_payment_date: l.nextPaymentDate,
    active: l.active,
    management_start_date: l.managementStartDate ?? null,
    management_end_date: l.managementEndDate ?? null,
    option_date: l.optionDate ?? null,
    guarantee_expiry: l.guaranteeExpiry ?? null,
    insurance_renewal_date: l.insuranceRenewalDate ?? null,
    management_fee_percent: l.managementFeePercent ?? null,
    management_fee_before_vat: l.managementFeeBeforeVat ?? null,
    management_fee_inc_vat: l.managementFeeIncVat ?? null,
  };
}

function leaseFromRow(row: Row): Lease {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    tenantId: str(row.tenant_id),
    landlordId: str(row.landlord_id),
    monthlyRent: num(row.monthly_rent),
    startDate: str(row.start_date),
    endDate: str(row.end_date),
    nextPaymentDate: str(row.next_payment_date),
    active: bool(row.active, true),
    managementStartDate: opt(row.management_start_date as string | null),
    managementEndDate: opt(row.management_end_date as string | null),
    optionDate: opt(row.option_date as string | null),
    guaranteeExpiry: opt(row.guarantee_expiry as string | null),
    insuranceRenewalDate: opt(row.insurance_renewal_date as string | null),
    managementFeePercent: opt(row.management_fee_percent as number | null),
    managementFeeBeforeVat: opt(row.management_fee_before_vat as number | null),
    managementFeeIncVat: opt(row.management_fee_inc_vat as number | null),
  };
}

function paymentToRow(p: Payment): Row {
  return {
    id: p.id,
    lease_id: p.leaseId,
    amount: p.amount,
    due_date: p.dueDate,
    status: p.status,
    method: p.method ?? null,
    check_number: p.checkNumber ?? null,
    deposit_date: p.depositDate ?? null,
    clearance_confirmed: p.clearanceConfirmed ?? null,
    clearance_confirmed_at: p.clearanceConfirmedAt ?? null,
  };
}

function paymentFromRow(row: Row): Payment {
  return {
    id: str(row.id),
    leaseId: str(row.lease_id),
    amount: num(row.amount),
    dueDate: str(row.due_date),
    status: str(row.status, "upcoming") as PaymentStatus,
    method: opt(row.method as PaymentMethod | null),
    checkNumber: opt(row.check_number as string | null),
    depositDate: opt(row.deposit_date as string | null),
    clearanceConfirmed: opt(row.clearance_confirmed as boolean | null),
    clearanceConfirmedAt: opt(row.clearance_confirmed_at as string | null),
  };
}

function expenseToRow(e: Expense): Row {
  return {
    id: e.id,
    landlord_id: e.landlordId,
    property_id: e.propertyId ?? null,
    amount: e.amount,
    date: e.date,
    description: e.description,
    invoice_doc_id: e.invoiceDocId ?? null,
  };
}

function expenseFromRow(row: Row): Expense {
  return {
    id: str(row.id),
    landlordId: str(row.landlord_id),
    propertyId: opt(row.property_id as string | null),
    amount: num(row.amount),
    date: str(row.date),
    description: str(row.description),
    invoiceDocId: opt(row.invoice_doc_id as string | null),
  };
}

function ticketToRow(t: MaintenanceTicket): Row {
  return {
    id: t.id,
    property_id: t.propertyId,
    created_by_id: t.createdById,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    created_at: t.createdAt,
    photo_data_url: t.photoDataUrl ?? null,
    assigned_professional_id: t.assignedProfessionalId ?? null,
    scheduled_at: t.scheduledAt ?? null,
    resolution_notes: t.resolutionNotes ?? null,
    invoice_doc_id: t.invoiceDocId ?? null,
    updates: t.updates ?? [],
  };
}

function ticketFromRow(row: Row): MaintenanceTicket {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    createdById: str(row.created_by_id),
    title: str(row.title),
    description: str(row.description),
    category: str(row.category),
    priority: str(row.priority, "medium") as TicketPriority,
    status: str(row.status, "open") as TicketStatus,
    createdAt: str(row.created_at),
    photoDataUrl: opt(row.photo_data_url as string | null),
    assignedProfessionalId: opt(row.assigned_professional_id as string | null),
    scheduledAt: opt(row.scheduled_at as string | null),
    resolutionNotes: opt(row.resolution_notes as string | null),
    invoiceDocId: opt(row.invoice_doc_id as string | null),
    updates: Array.isArray(row.updates) ? (row.updates as TicketUpdate[]) : [],
  };
}

function documentToRow(d: AppDocument): Row {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    property_id: d.propertyId ?? null,
    landlord_id: d.landlordId ?? null,
    tenant_id: d.tenantId ?? null,
    created_at: d.createdAt,
    signed: d.signed,
    status: d.status ?? null,
    owner_user_id: d.ownerUserId ?? null,
    signed_by_name: d.signedByName ?? null,
    signed_at: d.signedAt ?? null,
    file_data_url: d.fileDataUrl ?? null,
  };
}

function documentFromRow(row: Row): AppDocument {
  return {
    id: str(row.id),
    name: str(row.name),
    type: str(row.type) as DocumentType,
    propertyId: opt(row.property_id as string | null),
    landlordId: opt(row.landlord_id as string | null),
    tenantId: opt(row.tenant_id as string | null),
    createdAt: str(row.created_at),
    signed: bool(row.signed),
    status: opt(row.status as DocumentStatus | null),
    ownerUserId: opt(row.owner_user_id as string | null),
    signedByName: opt(row.signed_by_name as string | null),
    signedAt: opt(row.signed_at as string | null),
    fileDataUrl: opt(row.file_data_url as string | null),
  };
}

function notificationToRow(n: AppNotification): Row {
  return {
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    created_at: n.createdAt,
    read: n.read,
    for_user_id: n.forUserId ?? null,
    for_role: n.forRole ?? null,
    action_required: n.actionRequired ?? null,
    related_id: n.relatedId ?? null,
  };
}

function notificationFromRow(row: Row): AppNotification {
  return {
    id: str(row.id),
    kind: str(row.kind) as NotificationKind,
    title: str(row.title),
    body: str(row.body),
    createdAt: str(row.created_at),
    read: bool(row.read),
    forUserId: opt(row.for_user_id as string | null),
    forRole: opt(row.for_role as Role | null),
    actionRequired: opt(row.action_required as boolean | null),
    relatedId: opt(row.related_id as string | null),
  };
}

function professionalToRow(p: Professional): Row {
  return {
    id: p.id,
    full_name: p.fullName,
    trade: p.trade,
    phone: p.phone,
    email: p.email ?? null,
    rating: p.rating ?? null,
    active: p.active,
  };
}

function professionalFromRow(row: Row): Professional {
  return {
    id: str(row.id),
    fullName: str(row.full_name),
    trade: str(row.trade),
    phone: str(row.phone),
    email: opt(row.email as string | null),
    rating: opt(row.rating as number | null),
    active: bool(row.active, true),
  };
}

function taskToRow(t: Task): Row {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    assignee_user_id: t.assigneeUserId ?? null,
    due_date: t.dueDate ?? null,
    status: t.status,
    created_at: t.createdAt,
    created_by_id: t.createdById,
    related_ticket_id: t.relatedTicketId ?? null,
    related_property_id: t.relatedPropertyId ?? null,
  };
}

function taskFromRow(row: Row): Task {
  return {
    id: str(row.id),
    title: str(row.title),
    description: opt(row.description as string | null),
    assigneeUserId: opt(row.assignee_user_id as string | null),
    dueDate: opt(row.due_date as string | null),
    status: str(row.status, "open") as TaskStatus,
    createdAt: str(row.created_at),
    createdById: str(row.created_by_id),
    relatedTicketId: opt(row.related_ticket_id as string | null),
    relatedPropertyId: opt(row.related_property_id as string | null),
  };
}

function threadToRow(t: ChatThread): Row {
  return {
    id: t.id,
    participant_ids: t.participantIds,
    title: t.title,
  };
}

function threadFromRow(row: Row): ChatThread {
  const ids = strArr(row.participant_ids);
  return {
    id: str(row.id),
    participantIds: [ids[0] ?? "", ids[1] ?? ""],
    title: str(row.title),
  };
}

function messageToRow(m: ChatMessage): Row {
  return {
    id: m.id,
    thread_id: m.threadId,
    from_user_id: m.fromUserId,
    from_role: m.fromRole,
    text: m.text,
    created_at: m.createdAt,
  };
}

function messageFromRow(row: Row): ChatMessage {
  return {
    id: str(row.id),
    threadId: str(row.thread_id),
    fromUserId: str(row.from_user_id),
    fromRole: str(row.from_role) as Role,
    text: str(row.text),
    createdAt: str(row.created_at),
  };
}

function onboardingToRow(o: TenantOnboarding): Row {
  return {
    tenant_id: o.tenantId,
    lease_id: o.leaseId,
    move_in_date: o.moveInDate,
    utilities: o.utilities,
    insurance: o.insurance,
    ac_filter_last_cleaned: o.acFilterLastCleaned ?? null,
    completed: o.completed,
  };
}

function onboardingFromRow(row: Row): TenantOnboarding {
  return {
    tenantId: str(row.tenant_id),
    leaseId: str(row.lease_id),
    moveInDate: str(row.move_in_date),
    utilities: Array.isArray(row.utilities) ? (row.utilities as UtilitySwitch[]) : [],
    insurance: (row.insurance as InsuranceStatus) ?? { status: "pending" },
    acFilterLastCleaned: opt(row.ac_filter_last_cleaned as string | null),
    completed: bool(row.completed),
  };
}

function protocolToRow(p: ProtocolRecord): Row {
  return {
    id: p.id,
    property_id: p.propertyId,
    lease_id: p.leaseId ?? null,
    type: p.type,
    date: p.date,
    meter_electricity: p.meterElectricity ?? null,
    meter_water: p.meterWater ?? null,
    meter_gas: p.meterGas ?? null,
    items: p.items,
    photo_data_urls: p.photoDataUrls,
    keys_handed_over: p.keysHandedOver,
    signed_by_tenant: p.signedByTenant,
    signed_by_manager: p.signedByManager,
    notes: p.notes ?? null,
  };
}

function protocolFromRow(row: Row): ProtocolRecord {
  return {
    id: str(row.id),
    propertyId: str(row.property_id),
    leaseId: opt(row.lease_id as string | null),
    type: str(row.type) as ProtocolType,
    date: str(row.date),
    meterElectricity: opt(row.meter_electricity as string | null),
    meterWater: opt(row.meter_water as string | null),
    meterGas: opt(row.meter_gas as string | null),
    items: Array.isArray(row.items) ? (row.items as ProtocolChecklistItem[]) : [],
    photoDataUrls: strArr(row.photo_data_urls),
    keysHandedOver: bool(row.keys_handed_over),
    signedByTenant: bool(row.signed_by_tenant),
    signedByManager: bool(row.signed_by_manager),
    notes: opt(row.notes as string | null),
  };
}

function logToRow(e: ActivityLogEntry): Row {
  return {
    id: e.id,
    at: e.at,
    user_id: e.userId,
    user_name: e.userName,
    role: e.role,
    action: e.action,
    entity: e.entity ?? null,
    entity_id: e.entityId ?? null,
    details: e.details ?? null,
  };
}

function logFromRow(row: Row): ActivityLogEntry {
  return {
    id: str(row.id),
    at: str(row.at),
    userId: str(row.user_id),
    userName: str(row.user_name),
    role: str(row.role) as Role,
    action: str(row.action),
    entity: opt(row.entity as string | null),
    entityId: opt(row.entity_id as string | null),
    details: opt(row.details as string | null),
  };
}

export const COLLECTIONS = [
  { key: "users", table: "app_users", idColumn: "id", getId: (x: User) => x.id, toRow: userToRow, fromRow: userFromRow },
  { key: "landlords", table: "landlords", idColumn: "id", getId: (x: Landlord) => x.id, toRow: landlordToRow, fromRow: landlordFromRow },
  { key: "properties", table: "properties", idColumn: "id", getId: (x: Property) => x.id, toRow: propertyToRow, fromRow: propertyFromRow },
  { key: "tenants", table: "tenants", idColumn: "id", getId: (x: Tenant) => x.id, toRow: tenantToRow, fromRow: tenantFromRow },
  { key: "leases", table: "leases", idColumn: "id", getId: (x: Lease) => x.id, toRow: leaseToRow, fromRow: leaseFromRow },
  { key: "payments", table: "payments", idColumn: "id", getId: (x: Payment) => x.id, toRow: paymentToRow, fromRow: paymentFromRow },
  { key: "expenses", table: "expenses", idColumn: "id", getId: (x: Expense) => x.id, toRow: expenseToRow, fromRow: expenseFromRow },
  { key: "tickets", table: "tickets", idColumn: "id", getId: (x: MaintenanceTicket) => x.id, toRow: ticketToRow, fromRow: ticketFromRow },
  { key: "documents", table: "documents", idColumn: "id", getId: (x: AppDocument) => x.id, toRow: documentToRow, fromRow: documentFromRow },
  { key: "notifications", table: "notifications", idColumn: "id", getId: (x: AppNotification) => x.id, toRow: notificationToRow, fromRow: notificationFromRow },
  { key: "professionals", table: "professionals", idColumn: "id", getId: (x: Professional) => x.id, toRow: professionalToRow, fromRow: professionalFromRow },
  { key: "tasks", table: "tasks", idColumn: "id", getId: (x: Task) => x.id, toRow: taskToRow, fromRow: taskFromRow },
  { key: "chatThreads", table: "chat_threads", idColumn: "id", getId: (x: ChatThread) => x.id, toRow: threadToRow, fromRow: threadFromRow },
  { key: "chatMessages", table: "chat_messages", idColumn: "id", getId: (x: ChatMessage) => x.id, toRow: messageToRow, fromRow: messageFromRow },
  { key: "onboardings", table: "onboardings", idColumn: "tenant_id", getId: (x: TenantOnboarding) => x.tenantId, toRow: onboardingToRow, fromRow: onboardingFromRow },
  { key: "protocols", table: "protocols", idColumn: "id", getId: (x: ProtocolRecord) => x.id, toRow: protocolToRow, fromRow: protocolFromRow },
  { key: "activityLog", table: "activity_log", idColumn: "id", getId: (x: ActivityLogEntry) => x.id, toRow: logToRow, fromRow: logFromRow },
] as const;
