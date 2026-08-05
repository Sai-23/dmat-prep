import type { UserRole } from "@/types/auth";

export const DEFAULT_ROLE: UserRole = "student";

export function hasRole(
  roles: readonly UserRole[] | undefined,
  requiredRole: UserRole,
) {
  return roles?.includes(requiredRole) ?? false;
}

export function hasAnyRole(
  roles: readonly UserRole[] | undefined,
  requiredRoles: readonly UserRole[],
) {
  if (!roles?.length) {
    return false;
  }

  return requiredRoles.some((requiredRole) => roles.includes(requiredRole));
}

export function isAdmin(roles: readonly UserRole[] | undefined) {
  return hasRole(roles, "admin");
}

export function isReviewer(roles: readonly UserRole[] | undefined) {
  return hasAnyRole(roles, ["reviewer", "admin"]);
}
