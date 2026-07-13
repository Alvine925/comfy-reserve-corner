// Server-only Brevo email helper.
// Filename ends in .server.ts so the bundler blocks it from client bundles.

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

export function reservationConfirmationHtml(opts: {
  customerName: string;
  productName: string;
  offerPrice: number;
  quantity?: number;
  serialNumbers?: string[];
}): string {
  const qty = opts.quantity ?? 1;
  const serials = opts.serialNumbers ?? [];

  const serialBlock =
    serials.length > 0
      ? `
        <div style="margin:16px 0;padding:12px 16px;background:#f5f5f5;border-left:4px solid #1a1a1a;border-radius:4px">
          <p style="margin:0 0 4px;font-weight:bold;font-size:13px">Your unit serial number${serials.length > 1 ? "s" : ""}:</p>
          <p style="margin:0;font-family:monospace;font-size:15px;letter-spacing:0.05em">${serials.map(escapeHtml).join(", ")}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#666">Keep this number — use it to track your reservation or counter any future offers.</p>
        </div>`
      : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 12px">Reservation confirmed ✓</h2>
      <p>Hi ${escapeHtml(opts.customerName)},</p>
      <p>Thank you for reserving <strong>${escapeHtml(opts.productName)}</strong>${qty > 1 ? ` <em>(${qty} units)</em>` : ""} for
        <strong>KSh ${opts.offerPrice.toLocaleString()}</strong>.</p>
      ${serialBlock}
      <p>We've received your reservation and will contact you shortly to arrange pickup or delivery.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">Questions? Simply reply to this email.</p>
    </div>
  `;
}

export function adminNotificationHtml(opts: {
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string | null;
  quantity?: number;
  serialNumbers?: string[];
}): string {
  const qty = opts.quantity ?? 1;
  const serials = opts.serialNumbers ?? [];
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 12px">New reservation</h2>
      <p><strong>Product:</strong> ${escapeHtml(opts.productName)}${qty > 1 ? ` × ${qty}` : ""}</p>
      ${serials.length > 0 ? `<p><strong>Serial(s):</strong> <code>${serials.map(escapeHtml).join(", ")}</code></p>` : ""}
      <p><strong>Customer:</strong> ${escapeHtml(opts.customerName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(opts.customerEmail)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(opts.customerPhone)}</p>
      ${opts.notes ? `<p><strong>Notes:</strong> ${escapeHtml(opts.notes)}</p>` : ""}
    </div>
  `;
}

export function outbidNotificationHtml(opts: {
  reserverName: string;
  productName: string;
  serialNumber?: string;
  originalPrice: number;
  counterPrice: number;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 12px;color:#b91c1c">Someone outbid your reservation</h2>
      <p>Hi ${escapeHtml(opts.reserverName)},</p>
      <p>
        A new counter offer of <strong>KSh ${opts.counterPrice.toLocaleString()}</strong> has been placed on
        <strong>${escapeHtml(opts.productName)}</strong>${opts.serialNumber ? ` <em>(Serial: <code>${escapeHtml(opts.serialNumber)}</code>)</em>` : ""},
        which you reserved for KSh ${opts.originalPrice.toLocaleString()}.
      </p>
      ${opts.serialNumber
        ? `<div style="margin:16px 0;padding:12px 16px;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px">
            <p style="margin:0;font-size:13px">Your reservation serial number: <strong style="font-family:monospace">${escapeHtml(opts.serialNumber)}</strong></p>
          </div>`
        : ""}
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
