import { propertyAddressLabel } from "@/lib/portfolio";
import type { AppDocument, Expense, MaintenanceTicket, Property } from "@/types";

type ExpenseLink = Pick<Expense, "propertyId" | "invoiceDocId" | "description">;

/** Ticket whose invoice or title matches this expense. The ticket itself is never removed. */
export function ticketForExpense(
  expense: ExpenseLink,
  tickets: MaintenanceTicket[],
): MaintenanceTicket | undefined {
  if (expense.invoiceDocId) {
    const byInvoice = tickets.find((ticket) => ticket.invoiceDocId === expense.invoiceDocId);
    if (byInvoice) return byInvoice;
  }
  const description = expense.description.trim();
  if (!expense.propertyId || !description) return undefined;
  const byTitle = tickets.filter(
    (ticket) => ticket.propertyId === expense.propertyId && ticket.title.trim() === description,
  );
  return byTitle.length === 1 ? byTitle[0] : undefined;
}

export function propertyForExpense(
  expense: ExpenseLink,
  properties: Property[],
  tickets: MaintenanceTicket[],
): Property | undefined {
  const ticket = ticketForExpense(expense, tickets);
  const propertyId = expense.propertyId || ticket?.propertyId;
  if (!propertyId) return undefined;
  return properties.find((property) => property.id === propertyId);
}

/** Street, apartment and city: `ספיר 21, דירה 6, כפר סבא`. */
export function expensePlaceLabel(
  expense: ExpenseLink,
  properties: Property[],
  tickets: MaintenanceTicket[],
): string {
  const property = propertyForExpense(expense, properties, tickets);
  return property ? propertyAddressLabel(property) : "ללא שיוך לדירה";
}

export interface InvoiceListItem {
  key: string;
  description: string;
  amount: number | null;
  date: string;
  propertyLabel: string;
  fileDataUrl?: string;
  fileName?: string;
  expenseId?: string;
  documentId?: string;
  ticketId?: string;
}

/** Invoices the role can open: file, amount, date and apartment. */
export function buildInvoiceList(input: {
  documents: AppDocument[];
  expenses: Expense[];
  properties: Property[];
  tickets: MaintenanceTicket[];
  /** When set, only this landlord's invoices. */
  landlordId?: string;
}): InvoiceListItem[] {
  const propertyIds = input.landlordId
    ? new Set(input.properties.filter((property) => property.landlordId === input.landlordId).map((property) => property.id))
    : null;

  const inScope = (expense: Expense | undefined, doc: AppDocument | undefined): boolean => {
    if (!input.landlordId || !propertyIds) return true;
    if (expense?.landlordId === input.landlordId) return true;
    if (doc?.landlordId === input.landlordId) return true;
    const propertyId = expense?.propertyId || doc?.propertyId;
    return Boolean(propertyId && propertyIds.has(propertyId));
  };

  const invoiceDocs = input.documents.filter((doc) => doc.type === "invoice" || doc.folder === "expenses");
  const usedDocIds = new Set<string>();
  const rows: InvoiceListItem[] = [];

  for (const doc of invoiceDocs) {
    const expense = input.expenses.find((item) => item.invoiceDocId === doc.id);
    if (!inScope(expense, doc)) continue;
    usedDocIds.add(doc.id);
    const link: ExpenseLink = expense ?? {
      propertyId: doc.propertyId,
      invoiceDocId: doc.id,
      description: doc.name,
    };
    const ticket =
      ticketForExpense(link, input.tickets) ??
      input.tickets.find((item) => item.invoiceDocId === doc.id);
    rows.push({
      key: expense ? `ex-${expense.id}` : `doc-${doc.id}`,
      description: expense?.description?.trim() || doc.name,
      amount: expense ? expense.amount : null,
      date: expense?.date || doc.createdAt,
      propertyLabel: expensePlaceLabel(
        { ...link, propertyId: link.propertyId || ticket?.propertyId },
        input.properties,
        input.tickets,
      ),
      fileDataUrl: doc.fileDataUrl,
      fileName: doc.name,
      expenseId: expense?.id,
      documentId: doc.id,
      ticketId: ticket?.id,
    });
  }

  for (const expense of input.expenses) {
    if (expense.invoiceDocId && usedDocIds.has(expense.invoiceDocId)) continue;
    if (!expense.invoiceDocId) continue;
    if (!inScope(expense, undefined)) continue;
    const ticket = ticketForExpense(expense, input.tickets);
    rows.push({
      key: `ex-${expense.id}`,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      propertyLabel: expensePlaceLabel(expense, input.properties, input.tickets),
      expenseId: expense.id,
      documentId: expense.invoiceDocId,
      ticketId: ticket?.id,
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
