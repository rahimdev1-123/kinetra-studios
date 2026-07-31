import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const BUSINESS_EMAIL =
  process.env.BUSINESS_EMAIL || "abderrahim.bouakaz@his.edu.dz";

type Inquiry = {
  name: string;
  email: string;
  handle?: string | null;
  projectType: string;
  budget?: string | null;
  message: string;
};

export async function sendInquiryEmail(data: Inquiry) {
  return resend.emails.send({
    from: "Kinetra Studios <onboarding@resend.dev>",
    to: BUSINESS_EMAIL,
    subject: `🎬 New Project Inquiry from ${data.name}`,

    html: `
      <div style="font-family:Arial,sans-serif;padding:30px;max-width:650px;">
        <h1>🎬 New Project Inquiry</h1>

        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Handle:</strong> ${data.handle || "-"}</p>
        <p><strong>Project:</strong> ${data.projectType}</p>
        <p><strong>Budget:</strong> ${data.budget || "-"}</p>

        <hr>

        <p>${data.message.replace(/\n/g, "<br>")}</p>
      </div>
    `,
  });
}

/* ========================================================================== */
/* Phase 5 — outbound emails from the CRM to leads                            */
/* ========================================================================== */

/**
 * Sender identity for outbound CRM emails. Falls back to the same Resend
 * sandbox sender the inquiry notification already uses.
 *
 * NOTE: the sandbox sender (onboarding@resend.dev) can only deliver to your
 * own Resend account email. To email real leads, verify a domain in Resend
 * and set EMAIL_FROM, e.g.:  EMAIL_FROM="Kinetra Studios <hello@kinetra.studio>"
 */
const EMAIL_FROM =
  process.env.EMAIL_FROM || "Kinetra Studios <onboarding@resend.dev>";

/** Minimal HTML-escaping for user/admin-authored content. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type OutboundLeadEmail = {
  to: string;
  subject: string;
  /** Plain text body — converted to escaped HTML for the rich version. */
  text: string;
};

/**
 * Send a CRM-composed email to a lead. Content is escaped before being
 * embedded in HTML, and a plain-text part is always included. Replies go to
 * the business inbox.
 */
export async function sendLeadEmail({ to, subject, text }: OutboundLeadEmail) {
  const htmlBody = escapeHtml(text).replace(/\n/g, "<br>");

  return resend.emails.send({
    from: EMAIL_FROM,
    to,
    replyTo: BUSINESS_EMAIL,
    subject,
    text,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px;max-width:650px;color:#1a1a1a;line-height:1.6;">
        <p style="white-space:normal;margin:0 0 16px 0;">${htmlBody}</p>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0 12px 0;">
        <p style="font-size:12px;color:#8a8a8a;margin:0;">Kinetra Studios — Edited for impact.</p>
      </div>
    `,
  });
}