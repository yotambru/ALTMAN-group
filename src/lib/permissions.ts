import type { Role } from "@/types";

/**
 * Capability-based permissions. Each role maps to the set of capabilities it
 * holds. UI uses `can(role, capability)` to gate actions, keeping access rules
 * in one place (part of the "הרשאות ויומן פעילות" scope).
 */
export type Capability =
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "people.view"
  | "tickets.viewAll"
  | "tickets.manage"
  | "tickets.viewOwn"
  | "professionals.manage"
  | "professionals.assign"
  | "tasks.manage"
  | "documents.viewAll"
  | "documents.sendForSignature"
  | "documents.sign"
  | "reports.view"
  | "utilities.track"
  | "protocol.manage"
  | "activityLog.view"
  | "payments.confirm"
  | "payments.manage"
  | "chat.manager"; // can chat as the management side

const MANAGER: Capability[] = [
  "clients.view",
  "clients.create",
  "clients.edit",
  "people.view",
  "tickets.viewAll",
  "tickets.manage",
  "professionals.manage",
  "professionals.assign",
  "tasks.manage",
  "documents.viewAll",
  "documents.sendForSignature",
  "reports.view",
  "utilities.track",
  "protocol.manage",
  "activityLog.view",
  "payments.confirm",
  "payments.manage",
  "chat.manager",
];

// Assistant helps the manager but cannot manage the professional roster,
// permissions or the audit log. Can confirm payments but not change deposit modes.
const ASSISTANT: Capability[] = [
  "clients.view",
  "clients.create",
  "clients.edit",
  "people.view",
  "tickets.viewAll",
  "tickets.manage",
  "professionals.assign",
  "tasks.manage",
  "documents.viewAll",
  "documents.sendForSignature",
  "reports.view",
  "utilities.track",
  "protocol.manage",
  "payments.confirm",
  "chat.manager",
];

const LANDLORD: Capability[] = [
  "reports.view",
  "documents.sign",
  "tickets.viewOwn",
  "payments.confirm",
];

const TENANT: Capability[] = [
  "documents.sign",
  "tickets.viewOwn",
];

const PROFESSIONAL: Capability[] = ["tickets.viewOwn"];

const MATRIX: Record<Role, Capability[]> = {
  manager: MANAGER,
  assistant: ASSISTANT,
  landlord: LANDLORD,
  tenant: TENANT,
  professional: PROFESSIONAL,
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

export const roleLabels: Record<Role, string> = {
  manager: "מנהל",
  assistant: "עוזר מנהל",
  landlord: "משכיר",
  tenant: "שוכר",
  professional: "בעל מקצוע",
};

export const routeByRole: Record<Role, string> = {
  manager: "/manager",
  assistant: "/manager",
  landlord: "/landlord",
  tenant: "/tenant",
  professional: "/professional",
};
