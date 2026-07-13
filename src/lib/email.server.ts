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
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 12px">Reservation confirmed</h2>
      <p>Hi ${escapeHtml(opts.customerName)},</p>
      <p>Thank you for reserving <strong>${escapeHtml(opts.productName)}</strong> for
      <strong>$${opts.offerPrice.toFixed(2)}</strong>.</p>
      <p>We've received your reservation and will contact you shortly to arrange pickup or delivery.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">If you have any questions, simply reply to this email.</p>
    </div>
  `;
}

export function adminNotificationHtml(opts: {
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string | null;
}): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 12px">New reservation</h2>
      <p><strong>Product:</strong> ${escapeHtml(opts.productName)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(opts.customerName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(opts.customerEmail)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(opts.customerPhone)}</p>
      ${opts.notes ? `<p><strong>Notes:</strong> ${escapeHtml(opts.notes)}</p>` : ""}
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
