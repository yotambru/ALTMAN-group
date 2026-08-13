import { formatPercent } from "@/lib/portfolio";
import { formatCurrency, formatDateDots } from "@/lib/utils";

export interface AnnualReportPropertyRow {
  address: string;
  yearlyIncome: number;
  marketValue: number;
  yieldPct: number;
}

export interface AnnualReportExpenseRow {
  description: string;
  amount: number;
  date: string;
  /** Override the formatted date cell (e.g. "שנתי · 2026"). */
  dateLabel?: string;
}

export interface AnnualReportPdfInput {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  portfolioValue: number;
  portfolioYield: number;
  occupancy: number;
  properties: AnnualReportPropertyRow[];
  expenses: AnnualReportExpenseRow[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Build printable RTL Hebrew HTML for the annual portfolio report. */
function buildReportHtml(data: AnnualReportPdfInput): string {
  const propertyRows = data.properties
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eaeef5;font-weight:700;color:#14285a;">${escapeHtml(p.address)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eaeef5;color:#7c89a1;font-size:12px;">
          שווי ${formatCurrency(p.marketValue)}
          ${p.yearlyIncome > 0 ? ` · תשואה ${formatPercent(p.yieldPct)}` : " · ללא שכירות פעילה"}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eaeef5;font-weight:800;color:#f26a21;text-align:left;white-space:nowrap;">
          ${formatCurrency(p.yearlyIncome)}
        </td>
      </tr>`,
    )
    .join("");

  const expenseRows =
    data.expenses.length === 0
      ? `<tr><td colspan="3" style="padding:12px;color:#7c89a1;">לא נרשמו הוצאות בשנה זו</td></tr>`
      : data.expenses
          .map(
            (e) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eaeef5;font-weight:600;color:#14285a;">${escapeHtml(e.description)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eaeef5;color:#7c89a1;font-size:12px;">${escapeHtml(e.dateLabel ?? formatDateDots(e.date))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eaeef5;font-weight:700;color:#14285a;text-align:left;white-space:nowrap;">
          ${formatCurrency(e.amount)}
        </td>
      </tr>`,
          )
          .join("");

  return `
    <div dir="rtl" lang="he" style="width:720px;padding:32px;background:#ffffff;color:#16233f;font-family:Assistant,Arial,sans-serif;box-sizing:border-box;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div>
          <p style="margin:0;font-size:12px;font-weight:700;color:#f26a21;letter-spacing:0.04em;" dir="ltr">ALTMAN Group</p>
          <h1 style="margin:6px 0 0;font-size:28px;font-weight:800;color:#14285a;">דוח שנתי ${data.year}</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#7c89a1;">הכנסות בניכוי הוצאות ודמי ניהול לפי השנה הקלנדרית</p>
        </div>
        <div style="text-align:left;font-size:12px;color:#7c89a1;">
          הופק ב-${formatDateDots(new Date().toISOString())}
        </div>
      </div>

      <div style="background:linear-gradient(90deg,#0e1c40,#23427f);color:#ffffff;border-radius:18px;padding:20px 22px;margin-bottom:22px;">
        <p style="margin:0;font-size:13px;opacity:0.85;">הכנסה שנתית צפויה (${data.year})</p>
        <p style="margin:8px 0 0;font-size:34px;font-weight:800;">${formatCurrency(data.totalIncome)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:14px 22px;margin-top:14px;font-size:12px;opacity:0.85;">
          <span>שווי נכסים ${formatCurrency(data.portfolioValue)}</span>
          <span>תפוסה ${data.occupancy}%</span>
          <span>תשואה ${formatPercent(data.portfolioYield)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.18);">
          <div>
            <p style="margin:0;font-size:12px;opacity:0.7;">הוצאות</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;">${formatCurrency(data.totalExpenses)}</p>
          </div>
          <div>
            <p style="margin:0;font-size:12px;opacity:0.7;">נטו</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#f26a21;">${formatCurrency(data.netIncome)}</p>
          </div>
        </div>
      </div>

      <h2 style="margin:0 0 10px;font-size:16px;font-weight:800;color:#14285a;">פירוט נכסים</h2>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #eaeef5;border-radius:14px;overflow:hidden;margin-bottom:22px;">
        <thead>
          <tr style="background:#f5f7fb;text-align:right;">
            <th style="padding:10px 12px;font-size:12px;color:#7c89a1;font-weight:700;">כתובת</th>
            <th style="padding:10px 12px;font-size:12px;color:#7c89a1;font-weight:700;">שווי ותשואה</th>
            <th style="padding:10px 12px;font-size:12px;color:#7c89a1;font-weight:700;text-align:left;">הכנסה שנתית</th>
          </tr>
        </thead>
        <tbody>${propertyRows}</tbody>
      </table>

      <h2 style="margin:0 0 10px;font-size:16px;font-weight:800;color:#14285a;">הוצאות ${data.year}</h2>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #eaeef5;border-radius:14px;overflow:hidden;">
        <thead>
          <tr style="background:#f5f7fb;text-align:right;">
            <th style="padding:10px 12px;font-size:12px;color:#7c89a1;font-weight:700;">תיאור</th>
            <th style="padding:10px 12px;font-size:12px;color:#7c89a1;font-weight:700;">תאריך</th>
            <th style="padding:10px 12px;font-size:12px;color:#7c89a1;font-weight:700;text-align:left;">סכום</th>
          </tr>
        </thead>
        <tbody>${expenseRows}</tbody>
      </table>
    </div>
  `;
}

/**
 * Render the annual report to a multi-page A4 PDF and trigger a browser download.
 * Uses an offscreen RTL HTML snapshot so Hebrew renders correctly.
 */
export async function downloadAnnualReportPdf(data: AnnualReportPdfInput): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;inset-inline-start:-10000px;top:0;width:720px;pointer-events:none;opacity:1;";
  host.innerHTML = buildReportHtml(data);
  document.body.appendChild(host);

  try {
    const source = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(source, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let offsetY = margin;

    pdf.addImage(imgData, "PNG", margin, offsetY, contentWidth, contentHeight);
    heightLeft -= pageHeight - margin;

    while (heightLeft > 0) {
      offsetY = margin - (contentHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, offsetY, contentWidth, contentHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`דוח-שנתי-${data.year}.pdf`);
  } finally {
    host.remove();
  }
}
