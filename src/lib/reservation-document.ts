// Generates and prints a styled reservation order document in a new window.
// No external dependencies — uses browser print-to-PDF.

export interface ReservationDocData {
  reference: string;
  date: string;           // e.g. "13 July 2026"
  customer: {
    name: string;
    email: string;
    phone: string;
    notes?: string;
  };
  items: Array<{
    productName: string;
    serialNumber: string;
    price: number;
    category?: string | null;
  }>;
  total: number;
}

export function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `RSV-${ts}-${rand}`;
}

export function formatDocDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function printReservationDocument(data: ReservationDocData): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow pop-ups to download your reservation document.");
    return;
  }

  const rows = data.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(item.productName)}</td>
        <td class="mono">${escHtml(item.serialNumber)}</td>
        <td class="right">KSh ${Number(item.price).toLocaleString()}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Reservation Order ${escHtml(data.reference)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    background: #fff;
    padding: 40px 48px;
    max-width: 800px;
    margin: 0 auto;
  }

  /* ── Header ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .doc-header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .doc-header .subtitle { font-size: 11px; color: #666; margin-top: 3px; }
  .doc-type { text-align: right; }
  .doc-type .label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #888; }
  .doc-type .ref { font-size: 17px; font-weight: 700; margin-top: 3px; }
  .doc-type .date { font-size: 11px; color: #666; margin-top: 2px; }

  /* ── Section titles ── */
  .section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #eee;
  }

  /* ── Customer block ── */
  .customer-block { margin-bottom: 28px; }
  .customer-block p { margin-bottom: 3px; line-height: 1.6; }
  .customer-block strong { font-weight: 600; }

  /* ── Items table ── */
  .items-section { margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #888;
    text-align: left;
    padding: 7px 10px;
    border-bottom: 1px solid #ccc;
    background: #fafafa;
  }
  thead th.right { text-align: right; }
  tbody td {
    padding: 9px 10px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
    line-height: 1.5;
  }
  tbody tr:last-child td { border-bottom: none; }
  td.mono { font-family: "Courier New", monospace; font-size: 11px; font-weight: 600; }
  td.right { text-align: right; }

  /* ── Total ── */
  .total-row {
    display: flex;
    justify-content: flex-end;
    gap: 40px;
    align-items: baseline;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 2px solid #111;
    margin-bottom: 32px;
  }
  .total-row .label { font-size: 11px; font-weight: 600; color: #444; }
  .total-row .amount { font-size: 18px; font-weight: 800; }

  /* ── Notes ── */
  .notes-block {
    background: #f9f9f9;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 28px;
    font-size: 11.5px;
    color: #555;
    line-height: 1.6;
  }

  /* ── T&C ── */
  .tc-section {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 16px 18px;
    background: #fcfcfc;
    margin-bottom: 32px;
  }
  .tc-section .section-title { margin-bottom: 10px; }
  .tc-section ol {
    padding-left: 18px;
    list-style: decimal;
  }
  .tc-section li {
    margin-bottom: 7px;
    line-height: 1.65;
    font-size: 11.5px;
    color: #444;
  }
  .tc-section li strong { color: #111; font-weight: 700; }

  /* ── Warning banner ── */
  .warning-banner {
    border-left: 4px solid #e8a000;
    background: #fffbec;
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 28px;
    font-size: 11.5px;
    color: #5a3e00;
    line-height: 1.6;
  }
  .warning-banner strong { font-weight: 700; }

  /* ── Footer ── */
  .doc-footer {
    text-align: center;
    font-size: 10px;
    color: #aaa;
    border-top: 1px solid #eee;
    padding-top: 14px;
  }

  /* ── Print ── */
  @media print {
    body { padding: 20px 24px; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 1.5cm; }
  }

  /* ── Print button (screen only) ── */
  .print-bar {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
  }
  .print-bar button {
    padding: 9px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }
  .btn-primary { background: #111; color: #fff; }
  .btn-primary:hover { background: #333; }
  .btn-secondary { background: #eee; color: #333; }
  .btn-secondary:hover { background: #ddd; }
</style>
</head>
<body>

<!-- Screen-only print/close buttons -->
<div class="print-bar no-print">
  <button class="btn-secondary" onclick="window.close()">✕ Close</button>
  <button class="btn-primary" onclick="window.print()">⬇ Save / Print PDF</button>
</div>

<!-- Document -->
<div class="doc-header">
  <div>
    <h1>Furniture Collection</h1>
    <div class="subtitle">Pre-owned office & home furniture</div>
  </div>
  <div class="doc-type">
    <div class="label">Reservation Order</div>
    <div class="ref">${escHtml(data.reference)}</div>
    <div class="date">Issued: ${escHtml(data.date)}</div>
  </div>
</div>

<!-- Customer -->
<div class="customer-block">
  <div class="section-title">Reserved by</div>
  <p><strong>${escHtml(data.customer.name)}</strong></p>
  <p>${escHtml(data.customer.email)}</p>
  <p>${escHtml(data.customer.phone)}</p>
</div>

<!-- Items -->
<div class="items-section">
  <div class="section-title">Reserved Items</div>
  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Item</th>
        <th style="width:140px">Serial Number</th>
        <th class="right" style="width:130px">Listed Price</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>

<!-- Total -->
<div class="total-row">
  <span class="label">Total (all items)</span>
  <span class="amount">KSh ${data.total.toLocaleString()}</span>
</div>

${
  data.customer.notes
    ? `<div class="notes-block"><strong>Notes:</strong> ${escHtml(data.customer.notes)}</div>`
    : ""
}

<!-- Warning banner -->
<div class="warning-banner">
  <strong>Important:</strong> This document is a <strong>reservation notice only</strong> — it is not a receipt, invoice, or guarantee of purchase.
  Your reservation expires in <strong>7 days</strong> (by ${escHtml(expiryDate(data.date))}).
  Items will be released to other buyers if full payment is not received by that date.
</div>

<!-- T&C -->
<div class="tc-section">
  <div class="section-title">Terms &amp; Conditions of Reservation</div>
  <ol>
    <li>
      <strong>Highest-Bidder Policy.</strong> All items are sold to the highest bidder. 
      Submitting a reservation does not guarantee purchase. If a higher offer is received before full payment is made, 
      the seller reserves the right to accept that offer and cancel your reservation with notice.
    </li>
    <li>
      <strong>Reservation Period — 7 Days.</strong> This reservation is valid for <strong>seven (7) calendar days</strong> 
      from the date of issue shown above. After this period, unreleased items are automatically returned to the available pool.
    </li>
    <li>
      <strong>Payment Required to Secure.</strong> A reservation only becomes binding upon receipt of full payment. 
      No item will be physically set aside until payment is confirmed.
    </li>
    <li>
      <strong>Release of Items.</strong> If full payment is not received within 7 days, your reservation will be 
      cancelled and the reserved items will be made available to other interested buyers without further notice.
    </li>
    <li>
      <strong>No Transfer.</strong> Reservations are personal and may not be transferred to a third party.
    </li>
    <li>
      <strong>Condition of Goods.</strong> All items are pre-owned and sold as-is. Descriptions and images are provided 
      in good faith. The buyer is responsible for inspecting items before completing payment.
    </li>
    <li>
      <strong>Cancellation.</strong> You may cancel your reservation at any time before payment is made by contacting us. 
      Once payment is received, standard sale terms apply.
    </li>
  </ol>
</div>

<div class="doc-footer">
  Furniture Collection · This document was generated automatically on ${escHtml(data.date)} · Reference ${escHtml(data.reference)}
</div>

<script>
  // Auto-prompt print when opened programmatically (optional — user can also click the button)
  // window.onload = () => window.print();
</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function expiryDate(issuedDate: string): string {
  // Parse "13 July 2026" style date and add 7 days
  const d = new Date(issuedDate);
  if (isNaN(d.getTime())) {
    // fallback
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
