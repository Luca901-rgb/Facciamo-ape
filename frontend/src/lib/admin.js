export const SUPER_ADMIN_EMAIL = "lcammarota24@gmail.com";

export function isSuperAdmin(user) {
  return user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
}
