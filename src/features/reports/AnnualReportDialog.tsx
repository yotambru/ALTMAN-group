"use client";

import { useRef, useState } from "react";
import { ChevronLeft, Download, Landmark, Receipt, Trash2, TrendingUp, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { IncomeGrowthChart } from "@/components/dashboard/IncomeGrowthChart";
import { downloadAnnualReportPdf } from "@/lib/annual-report-pdf";
import { expensePlaceLabel, ticketForExpense } from "@/lib/invoice-place";
import { useData } from "@/lib/store";
import {
  buildPortfolioYieldHistory,
  estimateMarketValue,
  formatPercent,
  impliedPortfolioValue,
  monthlyManagementFee,
  occupancyPercent,
  PORTFOLIO_YIELD_RATE,
  propertyAddressLabel,
  propertyMonthlyIncome,
} from "@/lib/portfolio";
import { fileToDataUrl, formatCurrency, formatDateDots } from "@/lib/utils";

interface AnnualReportDialogProps {
  open?: boolean;
  onClose?: () => void;
  /** Render report in-place (dashboard panel) instead of a modal sheet. */
  inline?: boolean;
  landlordId?: string;
  /** Allow uploading expense invoices (landlord / manager). */
  canAddExpenses?: boolean;
  /** Manager only: delete an expense row. Landlords can upload, not delete. */
  canDeleteExpenses?: boolean;
  /** Show implied asset values / yield. Landlord annual report is income vs expenses only. */
  showAssetValues?: boolean;
  /** Open the linked maintenance ticket. */
  onOpenTicket?: (ticketId: string) => void;
  /** Open the invoices list. */
  onOpenInvoices?: () => void;
}

/** Annual portfolio summary: value, income growth, yield, net of expenses. */
export function AnnualReportDialog({
  open = false,
  onClose,
  inline = false,
  landlordId,
  canAddExpenses = false,
  canDeleteExpenses = false,
  showAssetValues = true,
  onOpenTicket,
  onOpenInvoices,
}: AnnualReportDialogProps) {
  const { properties, leases, landlords, expenses, tickets, addExpense, addDocument, deleteExpense } = useData();
  const [filterLandlordId, setFilterLandlordId] = useState("");
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePropertyId, setExpensePropertyId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const managerProperties = properties.filter((p) => !landlordId || p.landlordId === landlordId);
  const filterableProperties = managerProperties.filter(
    (p) => !filterLandlordId || p.landlordId === filterLandlordId,
  );
  const owned = filterableProperties.filter((p) => !filterPropertyId || p.id === filterPropertyId);
  const ownedIds = new Set(owned.map((p) => p.id));
  const activeLeases = leases.filter((l) => l.active && ownedIds.has(l.propertyId));
  const year = new Date().getFullYear();
  const landlordsById = new Map(landlords.map((l) => [l.id, l]));

  const rows = owned.map((property) => {
    const propertyLeases = leases.filter(
      (l) =>
        l.propertyId === property.id &&
        l.startDate.slice(0, 4) <= String(year) &&
        (!l.endDate?.trim() || l.endDate.slice(0, 4) >= String(year)),
    );
    // Calendar-year rent: sum months covered by any overlapping lease (prototype: use active / overlapping monthly × months in year).
    const lease = activeLeases.find((l) => l.propertyId === property.id) ?? propertyLeases[0];
    const yearly = propertyMonthlyIncome(property, lease) * 12;
    const landlord = landlordsById.get(property.landlordId);
    const yearlyManagementFee = lease
      ? monthlyManagementFee(lease, landlord?.managementFeePercent) * 12
      : 0;
    const marketValue = yearly > 0 ? estimateMarketValue(yearly) : property.value;
    const yieldPct = yearly > 0 ? PORTFOLIO_YIELD_RATE * 100 : 0;
    return { property, yearly, yearlyManagementFee, marketValue, yieldPct };
  });
  const totalIncome = rows.reduce((sum, r) => sum + r.yearly, 0);
  const totalManagementFees = rows.reduce((sum, r) => sum + r.yearlyManagementFee, 0);
  const yearExpenses = (expenses ?? []).filter((e) => {
    if (landlordId && e.landlordId !== landlordId) return false;
    if (!landlordId) {
      // Manager view: all expenses for owned landlords in this report scope
      const landlordIds = new Set(owned.map((p) => p.landlordId));
      if (!landlordIds.has(e.landlordId)) return false;
    }
    if (filterPropertyId && e.propertyId !== filterPropertyId) return false;
    return e.date.startsWith(String(year));
  });
  const recordedExpenses = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = recordedExpenses + totalManagementFees;
  const netIncome = totalIncome - totalExpenses;
  const expenseRows: {
    id: string;
    description: string;
    amount: number;
    date: string;
    dateLabel?: string;
    propertyLabel: string;
    ticketId?: string;
    deletable: boolean;
  }[] = [
    ...(totalManagementFees > 0
      ? [
          {
            id: "mgmt-fees",
            description: "דמי ניהול",
            amount: totalManagementFees,
            date: `${year}-01-01`,
            dateLabel: `שנתי · ${year}`,
            propertyLabel: owned.length === 1 ? propertyAddressLabel(owned[0]) : "כל הנכסים",
            deletable: false,
          },
        ]
      : []),
    ...yearExpenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      date: e.date,
      propertyLabel: expensePlaceLabel(e, properties, tickets),
      ticketId: ticketForExpense(e, tickets)?.id,
      deletable: true,
    })),
  ];
  const portfolioValue = impliedPortfolioValue(totalIncome / 12);
  const yieldHistory = buildPortfolioYieldHistory(activeLeases, new Date(), owned);
  const portfolioYield = totalIncome > 0 ? PORTFOLIO_YIELD_RATE * 100 : 0;
  const occupancy = occupancyPercent(owned);

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAnnualReportPdf({
        year,
        totalIncome,
        totalExpenses,
        netIncome,
        showAssetValues,
        portfolioValue,
        portfolioYield,
        occupancy,
        properties: rows.map(({ property, yearly, marketValue, yieldPct }) => ({
          address: propertyAddressLabel(property),
          yearlyIncome: yearly,
          marketValue: yearly > 0 ? marketValue : property.value,
          yieldPct,
        })),
        expenses: expenseRows.map((e) => ({
          description: e.description,
          amount: e.amount,
          date: e.date,
          dateLabel: e.dateLabel,
          propertyLabel: e.propertyLabel,
        })),
      });
      setToast("הדוח הורד בהצלחה");
    } catch {
      setToast("לא הצלחנו להוריד את הדוח. נסו שוב");
    } finally {
      setDownloading(false);
    }
  };

  const submitExpense = async (file?: File) => {
    if (!landlordId) return;
    const amount = Number(expenseAmount.replace(/[^0-9.]/g, "")) || 0;
    if (!amount || !expenseDesc.trim()) {
      setToast("יש למלא תיאור וסכום");
      return;
    }
    const propertyId = expensePropertyId || (owned.length === 1 ? owned[0]?.id : "");
    if (!propertyId) {
      setToast("יש לשייך את ההוצאה לדירה");
      return;
    }
    let invoiceDocId: string | undefined;
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      const doc = addDocument({
        name: `חשבונית — ${expenseDesc.trim()}`,
        type: "invoice",
        folder: "expenses",
        propertyId,
        landlordId,
        fileDataUrl: dataUrl,
      });
      invoiceDocId = doc.id;
    }
    addExpense({
      landlordId,
      propertyId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      description: expenseDesc.trim(),
      invoiceDocId,
    });
    setExpenseDesc("");
    setExpenseAmount("");
    setExpensePropertyId("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const body = (
    <div className="space-y-3">
      {!landlordId && (
        <section className="space-y-2 rounded-2xl border border-border bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-navy">סינון הדוח</p>
            {(filterLandlordId || filterPropertyId) && (
              <button
                type="button"
                onClick={() => {
                  setFilterLandlordId("");
                  setFilterPropertyId("");
                }}
                className="text-xs font-semibold text-orange underline underline-offset-2"
              >
                איפוס סינון
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-semibold text-text-muted">
              <span>משכיר</span>
              <select
                value={filterLandlordId}
                onChange={(event) => {
                  setFilterLandlordId(event.target.value);
                  setFilterPropertyId("");
                }}
                className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm font-normal text-navy focus:border-orange focus:outline-none"
                aria-label="סינון לפי משכיר"
              >
                <option value="">כל המשכירים</option>
                {landlords
                  .filter((landlord) => managerProperties.some((property) => property.landlordId === landlord.id))
                  .map((landlord) => (
                    <option key={landlord.id} value={landlord.id}>
                      {landlord.fullName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-text-muted">
              <span>דירה</span>
              <select
                value={filterPropertyId}
                onChange={(event) => setFilterPropertyId(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm font-normal text-navy focus:border-orange focus:outline-none"
                aria-label="סינון לפי דירה"
              >
                <option value="">כל הדירות</option>
                {filterableProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address} · דירה {property.apartmentNumber}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <div className="rounded-2xl bg-gradient-to-l from-navy-dark to-navy-light p-4 text-white">
        <p className="flex items-center gap-1.5 text-sm text-white/80">
          <TrendingUp className="h-4 w-4" />
          הכנסה שנתית צפויה ({year})
        </p>
        <p className="mt-1 text-3xl font-extrabold">{formatCurrency(totalIncome)}</p>
        {showAssetValues && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
            <span className="inline-flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5" />
              שווי נכסים {formatCurrency(portfolioValue)}
            </span>
            <span>תפוסה {occupancy}%</span>
            <span>תשואה {formatPercent(portfolioYield)}</span>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-sm">
          <div>
            <p className="text-white/65">הוצאות</p>
            <p className="font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-white/65">רווח נקי</p>
            <p className="font-bold text-orange">{formatCurrency(netIncome)}</p>
          </div>
        </div>
      </div>

      <IncomeGrowthChart points={yieldHistory} />

      <div className="space-y-2">
        {rows.map(({ property, yearly, yieldPct, marketValue }) => (
          <div key={property.id} className="flex items-center justify-between rounded-xl border border-border p-3">
            <div className="min-w-0">
              <p className="text-pretty font-semibold text-navy">{propertyAddressLabel(property)}</p>
              {showAssetValues && (
                <p className="text-xs text-text-muted">
                  שווי {formatCurrency(yearly > 0 ? marketValue : property.value)}
                  {yearly > 0 ? ` · תשואה ${formatPercent(yieldPct)}` : " · ללא שכירות פעילה"}
                </p>
              )}
            </div>
            <span className="font-bold text-orange">{formatCurrency(yearly)}</span>
          </div>
        ))}
      </div>

      {expenseRows.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-navy">
              <Receipt className="h-4 w-4 text-orange" />
              הוצאות {year}
            </p>
            {onOpenInvoices && (
              <button
                type="button"
                onClick={onOpenInvoices}
                className="text-xs font-semibold text-orange underline underline-offset-2"
              >
                חשבוניות
              </button>
            )}
          </div>
          <div className="card divide-y divide-border">
            {expenseRows.map((e) => {
              const openTicket = e.ticketId && onOpenTicket ? () => onOpenTicket(e.ticketId!) : undefined;
              return (
                <div key={e.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    {openTicket ? (
                      <button type="button" onClick={openTicket} className="block w-full text-start">
                        <p className="truncate font-semibold text-navy">{e.description}</p>
                        <p className="text-xs font-semibold text-navy">{e.propertyLabel}</p>
                        <p className="text-[0.7rem] text-text-muted">{e.dateLabel ?? formatDateDots(e.date)}</p>
                        <p className="mt-0.5 inline-flex items-center gap-0.5 text-[0.7rem] font-bold text-orange">
                          לצפייה בתקלה
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </p>
                      </button>
                    ) : (
                      <>
                        <p className="truncate font-semibold text-navy">{e.description}</p>
                        <p className="text-xs font-semibold text-navy">{e.propertyLabel}</p>
                        <p className="text-[0.7rem] text-text-muted">{e.dateLabel ?? formatDateDots(e.date)}</p>
                      </>
                    )}
                  </div>
                  <span className="shrink-0 font-bold text-navy">{formatCurrency(e.amount)}</span>
                  {canDeleteExpenses && e.deletable && (
                    <button
                      type="button"
                      aria-label={`מחיקת ${e.description}`}
                      onClick={() => setPendingDeleteId(e.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {canAddExpenses && landlordId && (
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-surface-muted p-3">
          <p className="text-sm font-bold text-navy">העלאת חשבונית הוצאה</p>
          <input
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            placeholder="תיאור ההוצאה"
            className="w-full rounded-lg border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="סכום (₪)"
              inputMode="numeric"
              className="rounded-lg border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
            />
            <select
              value={expensePropertyId}
              onChange={(e) => setExpensePropertyId(e.target.value)}
              className="rounded-lg border bg-surface px-2 py-2 text-xs focus:border-orange focus:outline-none"
              aria-label="שיוך לנכס"
            >
              <option value="">בחירת דירה</option>
              {owned.map((p) => (
                <option key={p.id} value={p.id}>{propertyAddressLabel(p)}</option>
              ))}
            </select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              void submitExpense(f ?? undefined);
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void submitExpense()}>
              שמירת הוצאה
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const amount = Number(expenseAmount.replace(/[^0-9.]/g, "")) || 0;
                const propertyId = expensePropertyId || (owned.length === 1 ? owned[0]?.id : "");
                if (!amount || !expenseDesc.trim() || !propertyId) {
                  void submitExpense();
                  return;
                }
                fileRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4" />
              עם חשבונית
            </Button>
          </div>
        </div>
      )}

      <Button fullWidth onClick={() => void handleDownloadPdf()} disabled={downloading}>
        <Download className="h-5 w-5" />
        {downloading ? "מכין את הדוח…" : "הורדת הדוח (PDF)"}
      </Button>
    </div>
  );

  const pendingDelete = expenseRows.find((row) => row.id === pendingDeleteId);
  const toastEl = (
    <>
      <Toast message={toast} onDone={() => setToast(null)} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) deleteExpense(pendingDelete.id);
          setPendingDeleteId(null);
          setToast("ההוצאה נמחקה מהדוח");
        }}
        title="מחיקת הוצאה"
        description={
          pendingDelete
            ? `למחוק את «${pendingDelete.description}»? ההוצאה והחשבונית ירדו מהדוח. התקלה עצמה תישאר בקריאות.`
            : ""
        }
      />
    </>
  );

  if (inline) {
    return (
      <div>
        {body}
        {toastEl}
      </div>
    );
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose ?? (() => undefined)}
        title={`דוח שנתי ${year}`}
        description="הכנסות בניכוי הוצאות ודמי ניהול לפי השנה הקלנדרית"
      >
        {body}
      </Modal>
      {toastEl}
    </>
  );
}
