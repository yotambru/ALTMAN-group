import {
  activityLog as seedActivityLog,
  chatMessages as seedChatMessages,
  chatThreads as seedChatThreads,
  documents as seedDocuments,
  landlords as seedLandlords,
  leases as seedLeases,
  maintenanceTickets as seedTickets,
  notifications as seedNotifications,
  onboardings as seedOnboardings,
  payments as seedPayments,
  expenses as seedExpenses,
  professionals as seedProfessionals,
  properties as seedProperties,
  protocols as seedProtocols,
  tasks as seedTasks,
  tenants as seedTenants,
  users as seedUsers,
} from "@/lib/mock-data";
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
  Task,
  Tenant,
  TenantOnboarding,
  User,
} from "@/types";

export interface DataState {
  users: User[];
  landlords: Landlord[];
  properties: Property[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
  expenses: Expense[];
  tickets: MaintenanceTicket[];
  documents: AppDocument[];
  notifications: AppNotification[];
  professionals: Professional[];
  tasks: Task[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  onboardings: TenantOnboarding[];
  protocols: ProtocolRecord[];
  activityLog: ActivityLogEntry[];
}

export function seedState(): DataState {
  return {
    users: seedUsers,
    landlords: seedLandlords,
    properties: seedProperties,
    tenants: seedTenants,
    leases: seedLeases,
    payments: seedPayments,
    expenses: seedExpenses,
    tickets: seedTickets,
    documents: seedDocuments,
    notifications: seedNotifications,
    professionals: seedProfessionals,
    tasks: seedTasks,
    chatThreads: seedChatThreads,
    chatMessages: seedChatMessages,
    onboardings: seedOnboardings,
    protocols: seedProtocols,
    activityLog: seedActivityLog,
  };
}
