// Supabase Edge Function: send-email
// Central Brevo sender for the app. All app email sending is routed here.
//
// Deploy:   supabase functions deploy send-email
// Secrets:  BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (optional)
//           ADMIN_EMAIL  — receives all reservation & counter-offer alerts
//
// Payload:  { type, ...data }
//   type = "reservation_customer" | "reservation_admin"
//        | "counter_offer_reserver" | "counter_offer_admin"
//        | "raw"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ── Order-sheet email sent to the customer ──────────────────────────────────
function reservationHtml(o: {
  customerName: string;
  reference: string;
  date?: string;
  // New structured format
  items?: Array<{ name: string; serial_number?: string | null; price: number }>;
  // Legacy fallback
  productName?: string; offerPrice?: number; quantity?: number; serialNumbers?: string[];
}) {
  const ref  = o.reference ?? "—";
  const date = o.date ?? new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const expiry = (() => {
    try {
      const d = new Date(); d.setDate(d.getDate() + 7);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch { return "7 days from today"; }
  })();

  // Normalise to items array
  let items: Array<{ name: string; serial?: string; price: number }> = [];
  if (o.items && o.items.length > 0) {
    items = o.items.map(i => ({ name: i.name, serial: i.serial_number ?? undefined, price: i.price }));
  } else if (o.productName) {
    const serials = o.serialNumbers ?? [];
    const qty = o.quantity ?? 1;
    if (serials.length > 0) {
      items = serials.map(s => ({ name: o.productName!, serial: s, price: o.offerPrice! / (qty || 1) }));
    } else {
      items = [{ name: o.productName!, serial: undefined, price: o.offerPrice! }];
    }
  }

  const total = items.reduce((s, i) => s + i.price, 0);

  const rows = items.map((item, idx) => `
    <tr style="border-bottom:1px solid #e5e5e5">
      <td style="padding:8px 6px;color:#666">${idx + 1}</td>
      <td style="padding:8px 6px">${esc(item.name)}</td>
      <td style="padding:8px 6px;font-family:monospace;font-size:12px;color:#444">${item.serial ? esc(item.serial) : "—"}</td>
      <td style="padding:8px 6px;text-align:right;font-weight:600">KSh ${Number(item.price).toLocaleString()}</td>
    </tr>`).join("");

  return `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#fff">

  <!-- Header -->
  <div style="border-bottom:3px solid #1a1a1a;padding-bottom:20px;margin-bottom:24px">
    <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px">Reservation Order Sheet</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Office Furniture</p>
  </div>

  <!-- Meta -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px">
    <tr>
      <td style="padding:3px 0;color:#666;width:120px">Reference</td>
      <td style="padding:3px 0;font-family:monospace;font-weight:700">${esc(ref)}</td>
      <td style="padding:3px 0;color:#666;width:80px">Date</td>
      <td style="padding:3px 0">${esc(date)}</td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#666">Customer</td>
      <td style="padding:3px 0">${esc(o.customerName)}</td>
      <td style="padding:3px 0;color:#666">Expires</td>
      <td style="padding:3px 0">${esc(expiry)}</td>
    </tr>
  </table>

  <!-- Items table -->
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
    <thead>
      <tr style="background:#1a1a1a;color:#fff">
        <th style="padding:8px 6px;text-align:left;font-weight:600;width:32px">#</th>
        <th style="padding:8px 6px;text-align:left;font-weight:600">Item</th>
        <th style="padding:8px 6px;text-align:left;font-weight:600">Serial No.</th>
        <th style="padding:8px 6px;text-align:right;font-weight:600">Price</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f5f5f5">
        <td colspan="3" style="padding:10px 6px;font-weight:700;font-size:14px">Total</td>
        <td style="padding:10px 6px;text-align:right;font-weight:700;font-size:14px">KSh ${total.toLocaleString()}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Terms -->
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;font-size:12px;color:#78350f;margin-bottom:24px">
    <p style="margin:0 0 6px;font-weight:700">Important — please read</p>
    <ul style="margin:0;padding-left:18px;line-height:1.8">
      <li>Reservations go to the <strong>highest bidder</strong> — this is not a guaranteed purchase.</li>
      <li>Your reservation is valid for <strong>7 days</strong> (until ${esc(expiry)}).</li>
      <li>Items will be <strong>released</strong> if full payment is not received within that period.</li>
      <li>Keep your serial number(s) — you'll need them to track or counter future offers.</li>
    </ul>
  </div>

  <p style="font-size:12px;color:#999;margin:0">Questions? Simply reply to this email and our team will get back to you.</p>
</div>`;
}

// ── Admin: new reservation ──────────────────────────────────────────────────
function adminReservationHtml(o: {
  productName: string; customerName: string; customerEmail: string;
  customerPhone: string; notes?: string | null; quantity?: number; serialNumbers?: string[];
  reference?: string;
}) {
  const qty = o.quantity ?? 1;
  const serials = o.serialNumbers ?? [];
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 12px">🛒 New reservation</h2>
    ${o.reference ? `<p><strong>Ref:</strong> <code>${esc(o.reference)}</code></p>` : ""}
    <p><strong>Product:</strong> ${esc(o.productName)}${qty > 1 ? ` × ${qty}` : ""}</p>
    ${serials.length ? `<p><strong>Serial(s):</strong> <code>${serials.map(esc).join(", ")}</code></p>` : ""}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0"/>
    <p><strong>Customer:</strong> ${esc(o.customerName)}</p>
    <p><strong>Email:</strong> ${esc(o.customerEmail)}</p>
    <p><strong>Phone:</strong> ${esc(o.customerPhone)}</p>
    ${o.notes ? `<p><strong>Notes:</strong> ${esc(o.notes)}</p>` : ""}
  </div>`;
}

// ── Reserver outbid ─────────────────────────────────────────────────────────
function outbidHtml(o: {
  reserverName: string; productName: string; serialNumber?: string;
  originalPrice: number; counterPrice: number;
}) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 12px;color:#b91c1c">⚠️ Someone outbid your reservation</h2>
    <p>Hi ${esc(o.reserverName)},</p>
    <p>A new counter offer of <strong>KSh ${o.counterPrice.toLocaleString()}</strong> was placed on
      <strong>${esc(o.productName)}</strong>${o.serialNumber ? ` (Serial: <code>${esc(o.serialNumber)}</code>)` : ""},
      which you reserved for KSh ${o.originalPrice.toLocaleString()}.</p>
    <p>To keep your reservation, reply with a higher offer or contact us directly. If we don't hear from you, the item may be awarded to the higher bidder.</p>
    <p style="color:#666;font-size:12px;margin-top:16px">This is an automated notification. Reply directly to reach our team.</p>
  </div>`;
}

// ── Admin: counter offer ────────────────────────────────────────────────────
function adminCounterOfferHtml(o: {
  productName: string; serialNumber?: string; counterPrice: number;
  customerName: string; customerEmail: string; customerPhone: string; notes?: string | null;
}) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 12px">💬 Counter offer received</h2>
    <p><strong>Product:</strong> ${esc(o.productName)}${o.serialNumber ? ` — Serial: <code>${esc(o.serialNumber)}</code>` : ""}</p>
    <p><strong>Counter price:</strong> KSh ${o.counterPrice.toLocaleString()}</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0"/>
    <p><strong>From:</strong> ${esc(o.customerName)}</p>
    <p><strong>Email:</strong> ${esc(o.customerEmail)}</p>
    <p><strong>Phone:</strong> ${esc(o.customerPhone)}</p>
    ${o.notes ? `<p><strong>Notes:</strong> ${esc(o.notes)}</p>` : ""}
  </div>`;
}

// ── Brevo sender ────────────────────────────────────────────────────────────
async function sendBrevo(to: { email: string; name?: string }, subject: string, htmlContent: string) {
  const apiKey     = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName  = Deno.env.get("BREVO_SENDER_NAME") ?? "Furniture Store";
  if (!apiKey || !senderEmail) throw new Error("Brevo not configured: missing BREVO_API_KEY or BREVO_SENDER_EMAIL");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey },
    body: JSON.stringify({ sender: { email: senderEmail, name: senderName }, to: [to], subject, htmlContent }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

// ── Request handler ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const body  = await req.json();
    const type  = body.type as string;
    // Admin email: prefer what the caller passes, fall back to the Supabase secret
    const adminEmail = body.admin_email || Deno.env.get("ADMIN_EMAIL") || "";

    let to: { email: string; name?: string };
    let subject: string;
    let html: string;

    switch (type) {
      case "reservation_customer":
        to      = { email: body.customer_email, name: body.customer_name };
        subject = `Your reservation order sheet — ${body.reference ?? body.product_name}`;
        html    = reservationHtml({
          customerName: body.customer_name,
          reference:    body.reference ?? "—",
          date:         body.date,
          items:        body.items,
          productName:  body.product_name,
          offerPrice:   body.offer_price,
          quantity:     body.quantity,
          serialNumbers: body.serial_numbers,
        });
        break;

      case "reservation_admin":
        if (!adminEmail) {
          console.warn("reservation_admin: no admin email configured — skipping");
          return new Response(JSON.stringify({ ok: true, skipped: "no admin email" }),
            { headers: { ...CORS, "Content-Type": "application/json" } });
        }
        to      = { email: adminEmail };
        subject = `New reservation: ${body.product_name}${body.quantity > 1 ? ` × ${body.quantity}` : ""}`;
        html    = adminReservationHtml({
          productName: body.product_name, customerName: body.customer_name,
          customerEmail: body.customer_email, customerPhone: body.customer_phone,
          notes: body.notes, quantity: body.quantity, serialNumbers: body.serial_numbers,
          reference: body.reference,
        });
        break;

      case "counter_offer_reserver":
        to      = { email: body.reserver_email, name: body.reserver_name };
        subject = `Your reservation for ${body.product_name} has been outbid`;
        html    = outbidHtml({
          reserverName: body.reserver_name, productName: body.product_name,
          serialNumber: body.serial_number, originalPrice: body.original_price,
          counterPrice: body.counter_price,
        });
        break;

      case "counter_offer_admin":
        if (!adminEmail) {
          console.warn("counter_offer_admin: no admin email configured — skipping");
          return new Response(JSON.stringify({ ok: true, skipped: "no admin email" }),
            { headers: { ...CORS, "Content-Type": "application/json" } });
        }
        to      = { email: adminEmail };
        subject = `Counter offer on: ${body.product_name}${body.serial_number ? ` (${body.serial_number})` : ""}`;
        html    = adminCounterOfferHtml({
          productName: body.product_name, serialNumber: body.serial_number,
          counterPrice: body.counter_price, customerName: body.customer_name,
          customerEmail: body.customer_email, customerPhone: body.customer_phone, notes: body.notes,
        });
        break;

      case "raw":
        to = body.to; subject = body.subject; html = body.html;
        break;

      default:
        return new Response(JSON.stringify({ ok: false, error: `Unknown type: ${type}` }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    await sendBrevo(to, subject, html);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
