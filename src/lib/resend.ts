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