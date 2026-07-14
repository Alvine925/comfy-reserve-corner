// Supabase Edge Function: notify-outbid
// Deploy with: supabase functions deploy notify-outbid
// Required secrets: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (optional)
//
// Called by the server when a counter offer is placed on a reserved product.
// Sends a Brevo email to the original reserver informing them they've been outbid.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL   = "https://comfy-reserve.vercel.app";
const BRAND_URL  = "https://myjoyfullday.com";
const BRAND_NAME = "My Joyfullday";

interface NotifyOutbidPayload {
  reserver_email: string;
  reserver_name: string;
  product_name: string;
  product_id?: string;
  serial_number?: string;
  original_price: number;
  counter_price: number;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

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

function outbidHtml(opts: {
  reserverName: string;
  productName: string;
  serialNumber?: string;
  originalPrice: number;
  counterPrice: number;
  productId?: string;
}): string {
  const productLink = opts.productId ? `${SITE_URL}/product/${opts.productId}` : SITE_URL;

  return `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#fff">

  <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <h2 style="margin:0 0 4px;font-size:20px;color:#b91c1c">⚠️ You've been outbid</h2>
    <p style="margin:0;font-size:13px;color:#991b1b">Act now to keep your reservation</p>
  </div>

  <p style="font-size:15px">Hi <strong>${escapeHtml(opts.reserverName)}</strong>,</p>

  <p style="font-size:14px;line-height:1.6">
    A new counter offer of <strong style="font-size:18px;color:#b91c1c">KSh ${opts.counterPrice.toLocaleString()}</strong>
    was placed on <strong>${escapeHtml(opts.productName)}</strong>${opts.serialNumber ? ` (Serial: <code style="font-family:monospace;color:#4f46e5">${escapeHtml(opts.serialNumber)}</code>)` : ""}.
    <br>You originally reserved this item for <strong>KSh ${opts.originalPrice.toLocaleString()}</strong>.
  </p>

  ${opts.serialNumber ? `
  <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;padding:12px 16px;margin:16px 0;font-size:13px">
    <p style="margin:0">Your reservation serial number:
      <strong style="font-family:monospace;color:#4f46e5;font-size:14px">${escapeHtml(opts.serialNumber)}</strong>
    </p>
  </div>` : ""}

  <p style="font-size:14px;color:#374151;line-height:1.6">
    Click below to visit the product page and place a higher offer before someone else takes it.
  </p>

  ${ctaButton(productLink, "Increase My Offer →", "#b91c1c")}

  <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px">
    Or reply to this email to contact our team directly.
  </p>

  ${poweredByFooter()}
</div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body: NotifyOutbidPayload = await req.json();
    const { reserver_email, reserver_name, product_name, product_id, serial_number, original_price, counter_price } = body;

    const apiKey      = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName  = Deno.env.get("BREVO_SENDER_NAME") ?? "Furniture Store";

    if (!apiKey || !senderEmail) {
      return new Response(
        JSON.stringify({ ok: false, error: "Brevo not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: reserver_email, name: reserver_name }],
        subject: `⚠️ You've been outbid on ${product_name} — act now`,
        htmlContent: outbidHtml({
          reserverName: reserver_name,
          productName: product_name,
          serialNumber: serial_number,
          originalPrice: original_price,
          counterPrice: counter_price,
          productId: product_id,
        }),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Brevo error [${res.status}]: ${errBody}`);
      return new Response(
        JSON.stringify({ ok: false, error: `Brevo error: ${res.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-outbid error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
