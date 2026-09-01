"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/utils/api";

type Role = "player" | "organiser";

type UseAuthGuardOptions = {
  requiredRole: Role;
  redirectTo: string;
};

const normalizeRole = (role: string | null): Role | null => {
  if (role === "player") return "player";
  if (role === "organiser" || role === "organizer") return "organiser";
  return null;
};

export function useAuthGuard({ requiredRole, redirectTo }: UseAuthGuardOptions) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  // Read eagerly rather than in the effect: the session's userId IS the
  // identity these pages render (it used to come off the URL, which was
  // available on the very first render). Callers compare it against rows they
  // fetch, so a null-on-first-render session would mis-mark them as someone
  // else's. Safe to read here because everything under the dashboard layout is
  // client-only — the layout renders nothing until it has resolved the session.
  const [session, setSession] = useState(getSession);

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    const normalizedRole = normalizeRole(currentSession.role);
    const roleMismatch = normalizedRole !== requiredRole;

    if (!currentSession.token || !currentSession.userId || roleMismatch) {
      clearSession();
      setIsAuthorized(false);
      router.replace(redirectTo);
      return;
    }

    setIsAuthorized(true);
  }, [requiredRole, redirectTo, router]);

  return { session, isAuthorized };
}
