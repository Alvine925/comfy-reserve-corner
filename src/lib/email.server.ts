// Server-only Brevo email helper.
// Filename ends in .server.ts so the bundler blocks it from client bundles.

const SITE_URL   = "https://comfy-reserve.vercel.app";
const ADMIN_URL  = `${SITE_URL}/alvookado`;
const BRAND_URL  = "https://myjoyfullday.com";
const BRAND_NAME = "My Joyfullday";

type SendEmailInput = {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
};

export async function sendBrevoEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Furniture Store";

  if (!apiKey || !senderEmail) {
    console.error("Brevo not configured: missing BREVO_API_KEY or BREVO_SENDER_EMAIL");
    return;
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
      to: [input.to],
      subject: input.subject,
      htmlContent: input.htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo send failed [${res.status}]: ${body}`);
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function emailWrapper(content: string): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#fff">
  ${content}
  ${poweredByFooter()}
</div>`;
}

// ── Customer: reservation confirmation ───────────────────────────────────────
export function reservationConfirmationHtml(opts: {
  customerName: string;
  productName: string;
  offerPrice: number;
  quantity?: number;
  serialNumbers?: string[];
  productId?: string;
}): string {
  const qty = opts.quantity ?? 1;
  const serials = opts.serialNumbers ?? [];
  const productLink = opts.productId ? `${SITE_URL}/product/${opts.productId}` : SITE_URL;

  const serialBlock =
    serials.length > 0
      ? `
        <div style="margin:16px 0;padding:12px 16px;background:#eef2ff;border-left:4px solid #4f46e5;border-radius:4px">
          <p style="margin:0 0 4px;font-weight:bold;font-size:13px">Your unit serial number${serials.length > 1 ? "s" : ""}:</p>
          <p style="margin:0;font-family:monospace;font-size:15px;letter-spacing:0.05em;color:#4f46e5">${serials.map(escapeHtml).join(", ")}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#666">Keep this — use it to track your reservation or counter any future offers.</p>
        </div>`
      : "";

  return emailWrapper(`
    <h2 style="margin:0 0 12px;font-size:22px">Reservation confirmed ✓</h2>
    <p>Hi <strong>${escapeHtml(opts.customerName)}</strong>,</p>
    <p>Thank you for reserving <strong>${escapeHtml(opts.productName)}</strong>${qty > 1 ? ` <em>(${qty} units)</em>` : ""} for
      <strong style="color:#059669">KSh ${opts.offerPrice.toLocaleString()}</strong>.</p>
    ${serialBlock}
    <p>We've received your reservation and will contact you shortly to arrange pickup or delivery.</p>

    ${ctaButton(productLink, "View Your Reservation →", "#059669")}

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;font-size:12px;color:#78350f">
      <p style="margin:0 0 4px;font-weight:700">Remember</p>
      <p style="margin:0">Reservations go to the <strong>highest bidder</strong>. You have 7 days to complete payment.</p>
    </div>

    <p style="color:#9ca3af;font-size:12px;margin-top:20px">Questions? Simply reply to this email.</p>
  `);
}

// ── Admin: new reservation notification ──────────────────────────────────────
export function adminNotificationHtml(opts: {
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string | null;
  quantity?: number;
  serialNumbers?: string[];
  productId?: string;
}): string {
  const qty = opts.quantity ?? 1;
  const serials = opts.serialNumbers ?? [];
  const productLink = opts.productId ? `${SITE_URL}/product/${opts.productId}` : SITE_URL;

  return emailWrapper(`
    <h2 style="margin:0 0 16px;font-size:20px">🛒 New reservation received</h2>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 16px;margin-bottom:20px">
      <p style="margin:0;font-size:15px;font-weight:700;color:#15803d">${escapeHtml(opts.productName)}${qty > 1 ? ` × ${qty}` : ""}</p>
      ${serials.length > 0 ? `<p style="margin:4px 0 0;font-family:monospace;font-size:12px;color:#4f46e5">Serial(s): ${serials.map(escapeHtml).join(", ")}</p>` : ""}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <tr><td style="padding:5px 0;color:#666;width:140px">Customer</td><td style="padding:5px 0;font-weight:600">${escapeHtml(opts.customerName)}</td></tr>
      <tr><td style="padding:5px 0;color:#666">Email</td><td style="padding:5px 0"><a href="mailto:${escapeHtml(opts.customerEmail)}" style="color:#1a1a1a">${escapeHtml(opts.customerEmail)}</a></td></tr>
      <tr><td style="padding:5px 0;color:#666">Phone</td><td style="padding:5px 0">${escapeHtml(opts.customerPhone)}</td></tr>
      ${opts.notes ? `<tr><td style="padding:5px 0;color:#666;vertical-align:top">Notes</td><td style="padding:5px 0">${escapeHtml(opts.notes)}</td></tr>` : ""}
    </table>

    ${ctaButton(ADMIN_URL, "Open Admin Dashboard →")}
    ${opts.productId ? ctaButton(productLink, "View Product Page →", "#4f46e5") : ""}
  `);
}

// ── Customer: outbid notification ────────────────────────────────────────────
export function outbidNotificationHtml(opts: {
  reserverName: string;
  productName: string;
  serialNumber?: string;
  originalPrice: number;
  counterPrice: number;
  productId?: string;
}): string {
  const productLink = opts.productId ? `${SITE_URL}/product/${opts.productId}` : SITE_URL;

  return emailWrapper(`
    <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <h2 style="margin:0 0 4px;font-size:20px;color:#b91c1c">⚠️ You've been outbid</h2>
      <p style="margin:0;font-size:13px;color:#991b1b">Act now to keep your reservation</p>
    </div>

    <p style="font-size:15px">Hi <strong>${escapeHtml(opts.reserverName)}</strong>,</p>

    <p style="font-size:14px;line-height:1.6">
      A new counter offer of <strong style="font-size:18px;color:#b91c1c">KSh ${opts.counterPrice.toLocaleString()}</strong>
      has been placed on <strong>${escapeHtml(opts.productName)}</strong>${opts.serialNumber ? ` <em>(Serial: <code style="font-family:monospace;color:#4f46e5">${escapeHtml(opts.serialNumber)}</code>)</em>` : ""}.
      <br>You originally reserved this item for <strong>KSh ${opts.originalPrice.toLocaleString()}</strong>.
    </p>

    ${opts.serialNumber
      ? `<div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;padding:12px 16px;margin:16px 0;font-size:13px">
          <p style="margin:0">Your reservation serial number:
            <strong style="font-family:monospace;color:#4f46e5;font-size:14px">${escapeHtml(opts.serialNumber)}</strong>
          </p>
        </div>`
      : ""}

    <p style="font-size:14px;color:#374151;line-height:1.6">
      Click below to visit the product page and place a higher offer before someone else takes it.
    </p>

    ${ctaButton(productLink, "Increase My Offer →", "#b91c1c")}

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px">
      Or reply to this email to contact our team directly.
    </p>
  `);
}

// ── Admin: counter offer with outbid info ─────────────────────────────────────
export function adminCounterOfferHtml(opts: {
  productName: string;
  counterPrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serialNumber?: string;
  notes?: string | null;
  contactMethod?: string;
  productId?: string;
  reserverName?: string;
  reserverEmail?: string;
}): string {
  const contactLabel = opts.contactMethod === "whatsapp" ? "WhatsApp" : opts.contactMethod === "phone" ? "Phone" : "Email";
  const productLink = opts.productId ? `${SITE_URL}/product/${opts.productId}` : SITE_URL;

  return emailWrapper(`
    <h2 style="margin:0 0 16px;font-size:20px">💬 New counter offer received</h2>

    <div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-weight:600">Counter offer amount</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#92400e">KSh ${opts.counterPrice.toLocaleString()}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#78350f">
        <strong>${escapeHtml(opts.productName)}</strong>
        ${opts.serialNumber ? `— Serial: <code style="font-family:monospace;color:#4f46e5">${escapeHtml(opts.serialNumber)}</code>` : ""}
      </p>
    </div>

    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#666">New Bidder</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <tr><td style="padding:4px 0;color:#666;width:140px">Name</td><td style="padding:4px 0;font-weight:600">${escapeHtml(opts.customerName)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Email</td><td style="padding:4px 0"><a href="mailto:${escapeHtml(opts.customerEmail)}" style="color:#1a1a1a">${escapeHtml(opts.customerEmail)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#666">Phone</td><td style="padding:4px 0">${escapeHtml(opts.customerPhone)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Preferred contact</td><td style="padding:4px 0">${escapeHtml(contactLabel)}</td></tr>
      ${opts.notes ? `<tr><td style="padding:4px 0;color:#666;vertical-align:top">Notes</td><td style="padding:4px 0">${escapeHtml(opts.notes)}</td></tr>` : ""}
    </table>

    ${opts.reserverName || opts.reserverEmail ? `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:12px 16px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#991b1b">Outbid reserver (notified by email)</p>
      <p style="margin:0;font-size:13px">
        ${opts.reserverName ? `<strong>${escapeHtml(opts.reserverName)}</strong>` : ""}
        ${opts.reserverEmail ? ` — <a href="mailto:${escapeHtml(opts.reserverEmail)}" style="color:#991b1b">${escapeHtml(opts.reserverEmail)}</a>` : ""}
      </p>
    </div>` : ""}

    ${ctaButton(ADMIN_URL, "Open Admin Dashboard →")}
    ${opts.productId ? ctaButton(productLink, "View Product Page →", "#4f46e5") : ""}
  `);
}
