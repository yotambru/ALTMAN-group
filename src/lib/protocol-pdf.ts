import type { ProtocolChecklistItem, ProtocolType } from "@/types";
import { formatDateDots } from "@/lib/utils";

export const PROTOCOL_FURNITURE_LABEL = "ריהוט";

export interface ProtocolPdfInput {
  type: ProtocolType;
  address: string;
  dateIso: string;
  meterElectricity?: string;
  meterWater?: string;
  meterGas?: string;
  meterElectricityReading?: string;
  meterWaterReading?: string;
  meterGasReading?: string;
  items: ProtocolChecklistItem[];
  photos: string[];
  keysHandedOver: boolean;
  keysApartment?: number;
  keysStorage?: number;
  keysMailbox?: number;
  keysNote?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function meterCard(label: string, number?: string, reading?: string): string {
  return `
    <div style="flex:1;min-width:30%;padding:10px 12px;border:1px solid #eaeef5;border-radius:12px;">
      <div style="font-size:11px;color:#7c89a1;font-weight:700;">מונה ${escapeHtml(label)}</div>
      <div style="margin-top:4px;font-size:16px;font-weight:800;color:#14285a;">${escapeHtml(number?.trim() || "—")}</div>
      <div style="margin-top:8px;font-size:11px;color:#7c89a1;font-weight:700;">קריאת מונה</div>
      <div style="margin-top:2px;font-size:15px;font-weight:800;color:#14285a;">${escapeHtml(reading?.trim() || "—")}</div>
    </div>`;
}

function itemStatus(item: ProtocolChecklistItem): { text: string; color: string } {
  if (item.label === PROTOCOL_FURNITURE_LABEL) {
    return item.ok
      ? { text: "יש ריהוט", color: "#14285a" }
      : { text: "אין ריהוט", color: "#7c89a1" };
  }
  return item.ok
    ? { text: "תקין", color: "#1f9d57" }
    : { text: "לא תקין", color: "#e0483a" };
}

function buildProtocolHtml(data: ProtocolPdfInput): string {
  const title = data.type === "entry" ? "פרוטוקול כניסה" : "פרוטוקול יציאה";
  const meters = [
    meterCard("חשמל", data.meterElectricity, data.meterElectricityReading),
    meterCard("מים", data.meterWater, data.meterWaterReading),
    meterCard("גז", data.meterGas, data.meterGasReading),
  ].join("");

  const items = data.items
    .map((item) => {
      const status = itemStatus(item);
      const note = item.note?.trim();
      return `
      <tr>
        <td style="padding:8px 10px 2px;border-bottom:${note ? "none" : "1px solid #eaeef5"};font-weight:600;color:#14285a;">${escapeHtml(item.label)}</td>
        <td style="padding:8px 10px 2px;border-bottom:${note ? "none" : "1px solid #eaeef5"};font-weight:800;color:${status.color};">
          ${status.text}
        </td>
      </tr>
      ${
        note
          ? `<tr>
              <td colspan="2" style="padding:0 10px 10px;border-bottom:1px solid #eaeef5;font-size:12px;color:#7c89a1;">
                ${escapeHtml(note)}
              </td>
            </tr>`
          : ""
      }`;
    })
    .join("");

  const photos = data.photos
    .slice(0, 8)
    .map(
      (src) =>
        `<img src="${escapeHtml(src)}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:10px;border:1px solid #eaeef5;" />`,
    )
    .join("");

  const keyCounts = data.keysHandedOver
    ? `דירה ${data.keysApartment ?? 0} · מחסן ${data.keysStorage ?? 0} · דואר ${data.keysMailbox ?? 0}`
    : "";
  const keyNote = data.keysNote?.trim();

  return `
    <div dir="rtl" lang="he" style="width:720px;padding:32px;background:#ffffff;color:#16233f;font-family:Assistant,Arial,sans-serif;box-sizing:border-box;">
      <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.08em;color:#f26a21;">ALTMAN GROUP</p>
      <h1 style="margin:8px 0 4px;font-size:26px;color:#14285a;">${title}</h1>
      <p style="margin:0 0 20px;color:#7c89a1;font-size:14px;">
        ${escapeHtml(data.address)} · ${formatDateDots(data.dateIso)}
      </p>
      <div style="display:flex;gap:10px;margin-bottom:18px;">${meters}</div>
      <h2 style="margin:0 0 8px;font-size:16px;color:#14285a;">מצב הדירה</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tbody>${items}</tbody>
      </table>
      <p style="margin:0;font-weight:700;color:#14285a;">
        מסירת מפתחות: ${data.keysHandedOver ? "בוצעה" : "לא סומנה"}
      </p>
      ${keyCounts ? `<p style="margin:4px 0 0;font-size:13px;color:#14285a;">${escapeHtml(keyCounts)}</p>` : ""}
      ${keyNote ? `<p style="margin:4px 0 0;font-size:12px;color:#7c89a1;">${escapeHtml(keyNote)}</p>` : ""}
      ${
        photos
          ? `<h2 style="margin:16px 0 8px;font-size:16px;color:#14285a;">תמונות</h2>
             <div style="display:flex;flex-wrap:wrap;gap:8px;">${photos}</div>`
          : ""
      }
      <p style="margin:24px 0 0;font-size:12px;color:#7c89a1;">
        המסמך ממתין לחתימת השוכר וחתימת המנהל.
      </p>
    </div>
  `;
}

/** Render the filled protocol to a PDF data URL for the document vault. */
export async function protocolPdfDataUrl(data: ProtocolPdfInput): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;inset-inline-start:-10000px;top:0;width:720px;pointer-events:none;opacity:1;";
  host.innerHTML = buildProtocolHtml(data);
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
    return pdf.output("datauristring") as string;
  } finally {
    host.remove();
  }
}
