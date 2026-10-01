import "server-only";

import { sendWithResend } from "./send";
import { buildRejectionEmail, type RejectionEmailInput } from "./template";

export type { RejectionEmailInput };
export { buildRejectionEmail };

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
