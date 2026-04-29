const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim();

const API_BASE_URL = rawApiBaseUrl || "https://kasakai-backend-hta7fydfarbdf8bh.centralindia-01.azurewebsites.net/api/v1";

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
