// Supabase Edge Function: send-email
// Central Brevo sender for the app. All app email sending is routed here
// so it runs on the Supabase database's edge runtime, not the app server.
//
// Deploy:   supabase functions deploy send-email
// Secrets:  BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (optional)
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

function reservationHtml(o: {
  customerName: string; productName: string; offerPrice: number;
  quantity?: number; serialNumbers?: string[];
}) {
  const qty = o.quantity ?? 1;
  const serials = o.serialNumbers ?? [];
  const serialBlock = serials.length
    ? `<div style="margin:16px 0;padding:12px 16px;background:#f5f5f5;border-left:4px solid #1a1a1a;border-radius:4px">
        <p style="margin:0 0 4px;font-weight:bold;font-size:13px">Your unit serial number${serials.length > 1 ? "s" : ""}:</p>
        <p style="margin:0;font-family:monospace;font-size:15px">${serials.map(esc).join(", ")}</p>
      </div>` : "";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 12px">Reservation confirmed ✓</h2>
    <p>Hi ${esc(o.customerName)},</p>
    <p>Thank you for reserving <strong>${esc(o.productName)}</strong>${qty > 1 ? ` <em>(${qty} units)</em>` : ""} for
      <strong>KSh ${o.offerPrice.toLocaleString()}</strong>.</p>
    ${serialBlock}
    <p>We'll contact you shortly to arrange pickup or delivery.</p>
  </div>`;
}

function adminReservationHtml(o: {
  productName: string; customerName: string; customerEmail: string;
  customerPhone: string; notes?: string | null; quantity?: number; serialNumbers?: string[];
}) {
  const qty = o.quantity ?? 1;
  const serials = o.serialNumbers ?? [];
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 12px">New reservation</h2>
    <p><strong>Product:</strong> ${esc(o.productName)}${qty > 1 ? ` × ${qty}` : ""}</p>
    ${serials.length ? `<p><strong>Serial(s):</strong> <code>${serials.map(esc).join(", ")}</code></p>` : ""}
    <p><strong>Customer:</strong> ${esc(o.customerName)}</p>
    <p><strong>Email:</strong> ${esc(o.customerEmail)}</p>
    <p><strong>Phone:</strong> ${esc(o.customerPhone)}</p>
    ${o.notes ? `<p><strong>Notes:</strong> ${esc(o.notes)}</p>` : ""}
  </div>`;
}

function outbidHtml(o: {
  reserverName: string; productName: string; serialNumber?: string;
  originalPrice: number; counterPrice: number;
}) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="margin:0 0 12px;color:#b91c1c">Someone outbid your reservation</h2>
    <p>Hi ${esc(o.reserverName)},</p>
    <p>A new counter offer of <strong>KSh ${o.counterPrice.toLocaleString()}</strong> was placed on
      <strong>${esc(o.productName)}</strong>${o.serialNumber ? ` (Serial: <code>${esc(o.serialNumber)}</code>)` : ""},
      which you reserved for KSh ${o.originalPrice.toLocaleString()}.</p>
    <p>To keep your reservation, reply with a higher offer or contact us directly.</p>
  </div>`;
}

function adminCounterOfferHtml(o: {
  productName: string; serialNumber?: string; counterPrice: number;
  customerName: string; customerEmail: string; customerPhone: string; notes?: string | null;
}) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
    <p><strong>Counter offer received</strong></p>
    <p>Product: ${esc(o.productName)}${o.serialNumber ? ` — Serial: <code>${esc(o.serialNumber)}</code>` : ""}</p>
    <p>Counter price: KSh ${o.counterPrice.toLocaleString()}</p>
    <p>From: ${esc(o.customerName)} — ${esc(o.customerEmail)} — ${esc(o.customerPhone)}</p>
    ${o.notes ? `<p>Notes: ${esc(o.notes)}</p>` : ""}
  </div>`;
}

async function sendBrevo(to: { email: string; name?: string }, subject: string, htmlContent: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Furniture Store";
  if (!apiKey || !senderEmail) throw new Error("Brevo not configured");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [to], subject, htmlContent,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const body = await req.json();
    const type = body.type as string;
    let to: { email: string; name?: string };
    let subject: string;
    let html: string;

    switch (type) {
      case "reservation_customer":
        to = { email: body.customer_email, name: body.customer_name };
        subject = `Reservation confirmed: ${body.product_name}${body.quantity > 1 ? ` × ${body.quantity}` : ""}`;
        html = reservationHtml({
          customerName: body.customer_name, productName: body.product_name,
          offerPrice: body.offer_price, quantity: body.quantity, serialNumbers: body.serial_numbers,
        });
        break;
      case "reservation_admin":
        to = { email: body.admin_email };
        subject = `New reservation: ${body.product_name}${body.quantity > 1 ? ` × ${body.quantity}` : ""}`;
        html = adminReservationHtml({
          productName: body.product_name, customerName: body.customer_name,
          customerEmail: body.customer_email, customerPhone: body.customer_phone,
          notes: body.notes, quantity: body.quantity, serialNumbers: body.serial_numbers,
        });
        break;
      case "counter_offer_reserver":
        to = { email: body.reserver_email, name: body.reserver_name };
        subject = `Your reservation for ${body.product_name} has been outbid`;
        html = outbidHtml({
          reserverName: body.reserver_name, productName: body.product_name,
          serialNumber: body.serial_number, originalPrice: body.original_price,
          counterPrice: body.counter_price,
        });
        break;
      case "counter_offer_admin":
        to = { email: body.admin_email };
        subject = `Counter offer on: ${body.product_name}${body.serial_number ? ` (${body.serial_number})` : ""}`;
        html = adminCounterOfferHtml({
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
    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
