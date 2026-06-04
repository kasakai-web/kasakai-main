const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim();

const API_BASE_URL = rawApiBaseUrl || "http://localhost:5000/api/v1";

const isBrowser = () => typeof window !== "undefined";

const normalizeApiPath = (path: string): string => {
  if (!path) return "";

  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const baseHasApiPrefix = /\/api\/v1\/?$/i.test(API_BASE_URL);

  if (baseHasApiPrefix && withLeadingSlash.startsWith("/api/v1/")) {
    return withLeadingSlash.replace(/^\/api\/v1/i, "");
  }

  return withLeadingSlash;
};

export const buildApiUrl = (path: string): string => {
  if (!path) return API_BASE_URL;

  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = normalizeApiPath(path);
  return `${base}${normalizedPath}`;
};

export const getSession = () => {
  if (!isBrowser()) {
    return { token: null, role: null, userId: null };
  }

  const token = localStorage.getItem("authToken");
  const role = localStorage.getItem("userRole");
  const userId = localStorage.getItem("userId");

  return { token, role, userId };
};

export const clearSession = () => {
  if (!isBrowser()) return;

  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userProfileImage");
};

// Call this when any authenticated API returns 401 — clears session and
// broadcasts the change so header/auth-aware components update immediately.
export const handleAuthExpiry = () => {
  clearSession();
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("kk-auth-changed"));
  }
};

// A pass is valid through the END of its expiry day in IST (matches backend
// passUtils.isPassExpired). "Expires 1 July" → valid all of 1 July IST, expires
// at 2 July 00:00 IST. No expiry date = never expires.
export const isPassExpired = (expiryDate?: string | null, now: Date = new Date()): boolean => {
  if (!expiryDate) return false;
  const expIstYMD = new Date(expiryDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const cutoff = new Date(`${expIstYMD}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000;
  return now.getTime() >= cutoff;
};
