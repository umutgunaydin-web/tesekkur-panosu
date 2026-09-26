import type { EmployeePublic, ThanksMessage } from "@/lib/types";

/** Pano sorgusu: avatar her zaman çalışan satırından gelir, kopyalanmaz. */
export const THANKS_WITH_RECIPIENT = `
  id,
  message,
  sender,
  receiver,
  recipient_employee_id,
  category_tag,
  color_theme,
  created_at,
  recipient:employees!recipient_employee_id (
    id,
    name,
    email,
    avatar_url
  )
`;

type ThanksQueryRow = {
  id: string;
  message: string;
  sender: string;
  receiver: string;
  recipient_employee_id: string | null;
  category_tag: string;
  color_theme: ThanksMessage["color_theme"];
  created_at: string;
  recipient: EmployeePublic | EmployeePublic[] | null;
};

function singleRecipient(
  value: EmployeePublic | EmployeePublic[] | null,
): EmployeePublic | null {
  if (Array.isArray(value)) return value[0] ?? null;

  return value;
}

export function mapThanksRow(row: ThanksQueryRow): ThanksMessage {
  return {
    id: row.id,
    message: row.message,
    sender: row.sender,
    receiver: row.receiver,
    recipient_employee_id: row.recipient_employee_id,
    recipient: singleRecipient(row.recipient),
    category_tag: row.category_tag,
    color_theme: row.color_theme,
    created_at: row.created_at,
  };
}
