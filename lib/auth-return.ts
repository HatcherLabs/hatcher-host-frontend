import { sanitizeLocalReturnPath } from "@/lib/safe-redirect";
const KEY = "hatcher.auth.return";
export function rememberAuthReturn(path: string): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        path: sanitizeLocalReturnPath(path),
        expires: Date.now() + 86400000,
      }),
    );
  } catch {}
}
export function readAuthReturn(): string {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      value &&
      typeof value.expires === "number" &&
      value.expires > Date.now() &&
      typeof value.path === "string"
    )
      return sanitizeLocalReturnPath(value.path);
    localStorage.removeItem(KEY);
  } catch {}
  return "/dashboard";
}
