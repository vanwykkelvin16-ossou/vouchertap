// Whitelisted access code gate. Stored in localStorage so the user does it once per device.
// Also re-validated server-side inside the signup edge function.
export const ACCESS_CODE = "SLK2026";
export const ACCESS_KEY = "slk.access_granted_v1";

export function hasAccess(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ACCESS_KEY) === "1";
  } catch {
    return false;
  }
}

export function grantAccess(code: string): boolean {
  if (code.trim().toUpperCase() !== ACCESS_CODE) return false;
  try {
    window.localStorage.setItem(ACCESS_KEY, "1");
  } catch {
    /* ignore */
  }
  return true;
}

export function revokeAccess() {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
  } catch {
    /* ignore */
  }
}
