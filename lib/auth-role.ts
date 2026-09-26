import { ADMIN_ROLES } from "@/lib/types";

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}
