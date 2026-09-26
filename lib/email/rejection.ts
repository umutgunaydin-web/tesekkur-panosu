import "server-only";

import { buildRejectionEmail, type RejectionEmailInput } from "./template";

export type { RejectionEmailInput };
export { buildRejectionEmail };

async function sendWithResend(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("email_not_configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!response.ok) {
    throw new Error(`email_provider_${response.status}`);
  }
}

export async function sendModerationRejectionEmail(
  input: RejectionEmailInput,
): Promise<void> {
  const to = process.env.ADMIN_AFFAIRS_EMAIL?.trim();

  if (!to) {
    throw new Error("admin_email_not_configured");
  }

  const email = buildRejectionEmail(input);
  await sendWithResend(to, email.subject, email.text);
}
