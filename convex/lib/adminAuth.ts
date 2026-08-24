import { getPromptEnvironment } from "./promptControl";

function getAdminPassword() {
  return (
    process.env.ADMIN_PASSWORD ??
    (getPromptEnvironment() === "production" ? undefined : "dev-admin")
  );
}

export function validateAdminPassword(password: string) {
  const adminPw = getAdminPassword();
  if (!adminPw) throw new Error("ADMIN_PASSWORD not configured");
  if (password !== adminPw) throw new Error("Unauthorized");
}

export function checkAdminPassword(password: string) {
  const adminPw = getAdminPassword();
  if (!adminPw) return false;
  return password === adminPw;
}
