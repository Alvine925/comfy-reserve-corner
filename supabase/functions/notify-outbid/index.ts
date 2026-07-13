// Supabase Edge Function: notify-outbid
// Deploy with: supabase functions deploy notify-outbid
// Required secrets: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (optional)
//
// Called by the server when a counter offer is placed on a reserved product.
// Sends a Brevo email to the original reserver informing them they've been outbid.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface NotifyOutbidPayload {
  reserver_email: string;
  reserver_name: string;
  product_name: string;
  original_price: number;
  counter_price: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function outbidHtml(opts: {
  reserverName: string;
  productName: string;
  originalPrice: number;
  counterPrice: number;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 12px;color:#b91c1c">Someone outbid your reservation</h2>
      <p>Hi ${escapeHtml(opts.reserverName)},</p>
      <p>
        A new counter offer of <strong>KSh ${opts.counterPrice.toLocaleString()}</strong> has been
        placed on <strong>${escapeHtml(opts.productName)}</strong>, which you reserved for
        KSh ${opts.originalPrice.toLocaleString()}.
      </p>
      <p>
        To keep your reservation, please reply to this email with a higher offer or contact us directly.
        If we don't hear from you, the item may be awarded to the higher bidder.
      </p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        This is an automated notification. Reply directly to reach our team.
      </p>
    </div>
  `;
}

serve(async (req) => {
  // CORS pre-flight
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
    const { reserver_email, reserver_name, product_name, original_price, counter_price } = body;

    const apiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Furniture Store";

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
        subject: `Your reservation for ${product_name} has been outbid`,
        htmlContent: outbidHtml({
          reserverName: reserver_name,
          productName: product_name,
          originalPrice: original_price,
          counterPrice: counter_price,
        }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Brevo error [${res.status}]: ${body}`);
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
