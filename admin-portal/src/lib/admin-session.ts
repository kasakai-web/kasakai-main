export const ADMIN_SESSION_KEY = "adminPortalSession";

type AdminSession = {
  username: string;
  loggedInAt: string;
};

export function saveAdminSession(username: string) {
  const payload: AdminSession = {
    username: username.trim(),
    loggedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
}

export function getAdminSession() {
  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function clearAdminSession() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}
