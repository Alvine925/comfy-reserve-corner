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

const SITE_URL   = "https://comfy-reserve.vercel.app";
const ADMIN_URL  = `${SITE_URL}/alvookado`;
const BRAND_URL  = "https://myjoyfullday.com";
const BRAND_NAME = "My Joyfullday";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ── Shared components ────────────────────────────────────────────────────────
function ctaButton(href: string, label: string, bg = "#1a1a1a"): string {
  return `
  <div style="text-align:center;margin:24px 0">
    <a href="${href}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;
       padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.3px">
      ${label}
    </a>
  </div>`;
}

function poweredByFooter(): string {
  return `
  <div style="margin-top:36px;padding-top:20px;border-top:1px solid #e5e5e5;text-align:center">
    <p style="margin:0 0 10px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px">Powered by</p>
    <a href="${BRAND_URL}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;
       padding:8px 22px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px">
      ${BRAND_NAME}
    </a>
    <p style="margin:12px 0 0;font-size:11px;color:#bbb">
      <a href="${BRAND_URL}" style="color:#bbb;text-decoration:underline">${BRAND_URL}</a>
    </p>
  </div>`;
}

function emailWrapper(content: string): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#fff">
  ${content}
  ${poweredByFooter()}
</div>`;
}

// ── Order-sheet email sent to the customer ──────────────────────────────────
function reservationHtml(o: {
  customerName: string;
  reference: string;
  date?: string;
  items?: Array<{ name: string; serial_number?: string | null; price: number }>;
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
      <td style="padding:8px 6px;font-family:monospace;font-size:12px;color:#4f46e5">${item.serial ? esc(item.serial) : "—"}</td>
      <td style="padding:8px 6px;text-align:right;font-weight:600">KSh ${Number(item.price).toLocaleString()}</td>
    </tr>`).join("");

  return emailWrapper(`
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

  <!-- Browse button -->
  ${ctaButton(SITE_URL, "Browse More Items →", "#059669")}

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
  `);
}

// ── Admin: new reservation ──────────────────────────────────────────────────
function adminReservationHtml(o: {
  productName: string; customerName: string; customerEmail: string;
  customerPhone: string; notes?: string | null; quantity?: number; serialNumbers?: string[];
  reference?: string; contactMethod?: string; productId?: string;
}) {
  const qty = o.quantity ?? 1;
  const serials = o.serialNumbers ?? [];
  const contactLabel = o.contactMethod === "whatsapp" ? "WhatsApp" : o.contactMethod === "phone" ? "Phone" : "Email";
  const productLink = o.productId ? `${SITE_URL}/product/${o.productId}` : SITE_URL;

  return emailWrapper(`
  <h2 style="margin:0 0 16px;font-size:20px">🛒 New reservation received</h2>

  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 16px;margin-bottom:20px">
    <p style="margin:0;font-size:15px;font-weight:700;color:#15803d">${esc(o.productName)}${qty > 1 ? ` × ${qty}` : ""}</p>
    ${o.reference ? `<p style="margin:4px 0 0;font-family:monospace;font-size:12px;color:#166534">Ref: ${esc(o.reference)}</p>` : ""}
    ${serials.length ? `<p style="margin:4px 0 0;font-family:monospace;font-size:12px;color:#4f46e5">Serial(s): ${serials.map(esc).join(", ")}</p>` : ""}
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:5px 0;color:#666;width:140px;vertical-align:top">Customer</td><td style="padding:5px 0;font-weight:600">${esc(o.customerName)}</td></tr>
    <tr><td style="padding:5px 0;color:#666;vertical-align:top">Email</td><td style="padding:5px 0"><a href="mailto:${esc(o.customerEmail)}" style="color:#1a1a1a">${esc(o.customerEmail)}</a></td></tr>
    <tr><td style="padding:5px 0;color:#666;vertical-align:top">Phone</td><td style="padding:5px 0">${esc(o.customerPhone)}</td></tr>
    <tr><td style="padding:5px 0;color:#666;vertical-align:top">Preferred contact</td><td style="padding:5px 0">${esc(contactLabel)}</td></tr>
    ${o.notes ? `<tr><td style="padding:5px 0;color:#666;vertical-align:top">Notes</td><td style="padding:5px 0">${esc(o.notes)}</td></tr>` : ""}
  </table>

  <div style="display:flex;gap:12px;margin:20px 0">
    ${ctaButton(ADMIN_URL, "Open Admin Dashboard →")}
  </div>
  ${o.productId ? ctaButton(productLink, "View Product Page →", "#4f46e5") : ""}
  `);
}

// ── Reserver outbid ─────────────────────────────────────────────────────────
function outbidHtml(o: {
  reserverName: string; productName: string; serialNumber?: string;
  originalPrice: number; counterPrice: number; productId?: string;
}) {
  const productLink = o.productId ? `${SITE_URL}/product/${o.productId}` : SITE_URL;

  return emailWrapper(`
  <!-- Alert banner -->
  <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <h2 style="margin:0 0 4px;font-size:20px;color:#b91c1c">⚠️ You've been outbid</h2>
    <p style="margin:0;font-size:13px;color:#991b1b">Act now to keep your reservation</p>
  </div>

  <p style="font-size:15px">Hi <strong>${esc(o.reserverName)}</strong>,</p>

  <p style="font-size:14px;line-height:1.6">
    A new counter offer of <strong style="font-size:18px;color:#b91c1c">KSh ${o.counterPrice.toLocaleString()}</strong>
    was placed on <strong>${esc(o.productName)}</strong>${o.serialNumber ? ` (Serial: <code style="font-family:monospace;color:#4f46e5">${esc(o.serialNumber)}</code>)` : ""}.
    <br>You originally reserved this item for <strong>KSh ${o.originalPrice.toLocaleString()}</strong>.
  </p>

  ${o.serialNumber ? `
  <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;padding:12px 16px;margin:16px 0;font-size:13px">
    <p style="margin:0">Your reservation serial number:
      <strong style="font-family:monospace;color:#4f46e5;font-size:14px">${esc(o.serialNumber)}</strong>
    </p>
  </div>` : ""}

  <p style="font-size:14px;color:#374151;line-height:1.6">
    To keep your reservation, click the button below to increase your offer.
    If we don't hear from you, the item may be awarded to the higher bidder.
  </p>

  ${ctaButton(productLink, "Increase My Offer →", "#b91c1c")}

  <p style="font-size:12px;color:#9ca3af;margin-top:8px;text-align:center">
    Or reply to this email to contact our team directly.
  </p>
  `);
}

// ── Admin: counter offer (includes outbid reserver info) ────────────────────
function adminCounterOfferHtml(o: {
  productName: string; serialNumber?: string; counterPrice: number;
  customerName: string; customerEmail: string; customerPhone: string; notes?: string | null;
  contactMethod?: string; productId?: string;
  reserverName?: string; reserverEmail?: string;
}) {
  const contactLabel = o.contactMethod === "whatsapp" ? "WhatsApp" : o.contactMethod === "phone" ? "Phone" : "Email";
  const productLink = o.productId ? `${SITE_URL}/product/${o.productId}` : SITE_URL;

  return emailWrapper(`
  <h2 style="margin:0 0 16px;font-size:20px">💬 New counter offer received</h2>

  <!-- Offer highlight -->
  <div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="margin:0 0 4px;font-size:13px;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-weight:600">Counter offer amount</p>
    <p style="margin:0;font-size:28px;font-weight:800;color:#92400e">KSh ${o.counterPrice.toLocaleString()}</p>
    <p style="margin:6px 0 0;font-size:13px;color:#78350f">
      <strong>${esc(o.productName)}</strong>
      ${o.serialNumber ? `— Serial: <code style="font-family:monospace;color:#4f46e5">${esc(o.serialNumber)}</code>` : ""}
    </p>
  </div>

  <!-- New bidder -->
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#666">New Bidder</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:4px 0;color:#666;width:140px">Name</td><td style="padding:4px 0;font-weight:600">${esc(o.customerName)}</td></tr>
    <tr><td style="padding:4px 0;color:#666">Email</td><td style="padding:4px 0"><a href="mailto:${esc(o.customerEmail)}" style="color:#1a1a1a">${esc(o.customerEmail)}</a></td></tr>
    <tr><td style="padding:4px 0;color:#666">Phone</td><td style="padding:4px 0">${esc(o.customerPhone)}</td></tr>
    <tr><td style="padding:4px 0;color:#666">Preferred contact</td><td style="padding:4px 0">${esc(contactLabel)}</td></tr>
    ${o.notes ? `<tr><td style="padding:4px 0;color:#666;vertical-align:top">Notes</td><td style="padding:4px 0">${esc(o.notes)}</td></tr>` : ""}
  </table>

  ${o.reserverName || o.reserverEmail ? `
  <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:12px 16px;margin-bottom:20px">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#991b1b">Outbid reserver (notified)</p>
    ${o.reserverName ? `<p style="margin:0;font-size:13px"><strong>${esc(o.reserverName)}</strong>${o.reserverEmail ? ` — <a href="mailto:${esc(o.reserverEmail)}" style="color:#991b1b">${esc(o.reserverEmail)}</a>` : ""}</p>` : ""}
  </div>` : ""}

  ${ctaButton(ADMIN_URL, "Open Admin Dashboard →")}
  ${o.productId ? ctaButton(productLink, "View Product Page →", "#4f46e5") : ""}
  `);
}

// ── Brevo sender ────────────────────────────────────────────────────────────
async function sendBrevo(to: { email: string; name?: string }, subject: string, htmlContent: string) {
  const apiKey      = Deno.env.get("BREVO_API_KEY");
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
    const body      = await req.json();
    const type      = body.type as string;
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
          reference: body.reference, contactMethod: body.contact_method,
          productId: body.product_id,
        });
        break;

      case "counter_offer_reserver":
        to      = { email: body.reserver_email, name: body.reserver_name };
        subject = `⚠️ You've been outbid on ${body.product_name} — act now`;
        html    = outbidHtml({
          reserverName: body.reserver_name, productName: body.product_name,
          serialNumber: body.serial_number, originalPrice: body.original_price,
          counterPrice: body.counter_price, productId: body.product_id,
        });
        break;

      case "counter_offer_admin":
        if (!adminEmail) {
          console.warn("counter_offer_admin: no admin email configured — skipping");
          return new Response(JSON.stringify({ ok: true, skipped: "no admin email" }),
            { headers: { ...CORS, "Content-Type": "application/json" } });
        }
        to      = { email: adminEmail };
        subject = `Counter offer KSh ${Number(body.counter_price).toLocaleString()} — ${body.product_name}${body.serial_number ? ` (${body.serial_number})` : ""}`;
        html    = adminCounterOfferHtml({
          productName: body.product_name, serialNumber: body.serial_number,
          counterPrice: body.counter_price, customerName: body.customer_name,
          customerEmail: body.customer_email, customerPhone: body.customer_phone,
          notes: body.notes, contactMethod: body.contact_method,
          productId: body.product_id,
          reserverName: body.reserver_name, reserverEmail: body.reserver_email,
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
