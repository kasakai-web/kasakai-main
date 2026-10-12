"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlayerLoginForm, type SessionUser, type GoogleStep } from "@/components/auth/PlayerLoginForm";
import { PlayerSignUpStep1, type ProfileDetails } from "@/components/auth/PlayerSignUpStep1";
import { OTPVerificationPhone } from "@/components/auth/OTPVerificationPhone";
import { buildApiUrl, resolveImageUrl } from "@/utils/api";

// One flow signs in and signs up, with no password anywhere:
//   phone  → WhatsApp code → (new number) name, email, photo
//   Google → (not linked yet) WhatsApp code → (new number) photo
// After Google the code goes to the number on the account their Gmail found, or
// else to a number they type. An existing account is signed in straight after
// the code, with Google linked to it, so only a new player sees the photo step.
function AuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfterLogin = searchParams.get("redirect") || null;
  const targetGame = searchParams.get("targetGame") || null; // Game ID for auto-booking
  const [step, setStep] = useState<"start" | "google" | "otp" | "profile">("start");
  const [phone, setPhone] = useState("");
  const [google, setGoogle] = useState<GoogleStep | null>(null);
  const [signupToken, setSignupToken] = useState("");
  const [details, setDetails] = useState<ProfileDetails>({ firstName: "", email: "" });
  const [error, setError] = useState("");

  const [persistedTargetGame] = useState(() => {
    return targetGame || (typeof window !== "undefined" ? localStorage.getItem("targetGameId") : null);
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (targetGame) {
        localStorage.setItem("targetGameId", targetGame);
      }
    }
  }, [targetGame]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const uRole = localStorage.getItem("userRole");
    const uId = localStorage.getItem("userId");

    if (token && uRole === "player" && uId && step === "start") {
      router.replace("/dashboard");
    }
  }, [router, step]);

  const finishLogin = async (token: string, user: SessionUser, isNew = false) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userRole", "player");
    localStorage.setItem("userId", user.id);
    localStorage.setItem("userName", user.name || "User");
    if (user.profileImage) {
      localStorage.setItem("userProfileImage", resolveImageUrl(user.profileImage));
    } else {
      localStorage.removeItem("userProfileImage");
    }
    // Signal SocketClient to connect now that we have a token (same-tab login)
    window.dispatchEvent(new CustomEvent("kk-auth-changed"));

    // Only accounts made before the photo became compulsory can lack one.
    const hasImage = !!localStorage.getItem("userProfileImage");
    if (!hasImage) localStorage.setItem("requirePhotoUpload", "true");
    if (isNew) localStorage.setItem("showProfileBanner", "true");

    if (persistedTargetGame) {
      // Clear the targetGameId so it doesn't carry over to other flows
      localStorage.removeItem("targetGameId");
      router.replace(`/dashboard?openGame=${persistedTargetGame}`);
    } else if (!hasImage || (isNew && !redirectAfterLogin)) {
      router.replace("/dashboard/profile");
    } else {
      router.replace(redirectAfterLogin || "/dashboard");
    }
  };

  const completeSignup = async (d: ProfileDetails) => {
    setDetails(d);
    setError("");
    try {
      // Multipart: the photo is compulsory and the server stores it with the account.
      const body = new FormData();
      body.append("signupToken", signupToken);
      body.append("name", d.firstName);
      body.append("email", d.email);
      if (d.profileImageDataUrl) {
        const blob = await (await fetch(d.profileImageDataUrl)).blob();
        body.append("profileImage", blob, `profile.${blob.type.split("/")[1] || "jpg"}`);
      }
      const res = await fetch(buildApiUrl("/auth/complete-signup"), { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't create your account. Please try again.");
      await finishLogin(data.token, data.user, true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      {step === "start" && (
        <PlayerLoginForm
          onCodeSent={(p) => {
            setPhone(p);
            setStep("otp");
          }}
          onGoogle={async (r) => {
            if ("token" in r) return finishLogin(r.token, r.user);
            setGoogle(r);
            setStep("google");
          }}
        />
      )}

      {/* Google, not linked: "welcome back" (their Gmail found the account) or a number to type */}
      {step === "google" && google && (
        <PlayerLoginForm
          google={google}
          onBack={() => {
            setGoogle(null);
            setStep("start");
          }}
          onCodeSent={(p) => {
            setPhone(p);
            setStep("otp");
          }}
        />
      )}

      {/* New players only. Phone sign-up: name, email, photo. Google sign-up: photo. */}
      {step === "profile" && (
        <>
          {error && (
            <div style={{ background: "#ff4444", color: "white", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>
              {error}
            </div>
          )}
          <PlayerSignUpStep1
            google={google?.profile}
            initial={details}
            onBack={() => {
              setGoogle(null);
              setStep("start");
            }}
            onContinue={completeSignup}
          />
        </>
      )}

      {step === "otp" && (
        <OTPVerificationPhone
          phone={phone}
          maskedPhone={google?.maskedPhone}
          role="player"
          googleToken={google?.googleToken}
          onVerified={async (r) => {
            if ("token" in r) return finishLogin(r.token, r.user);
            setSignupToken(r.signupToken);
            setStep("profile");
          }}
          onBack={() => setStep(google ? "google" : "start")}
        />
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: "calc(var(--nav-h) + 14px)", background: "var(--black)", position: "relative", overflow: "hidden" }}>
        {/* Decorative background lines */}
        <span style={{ position: "absolute", top: "28%", left: 0, right: 0, height: "1px", background: "var(--border)", pointerEvents: "none" }} />
        <span style={{ position: "absolute", top: "62%", left: 0, right: 0, height: "1px", background: "var(--border)", pointerEvents: "none" }} />
        <span style={{ position: "absolute", left: "18%", top: 0, bottom: 0, width: "1px", background: "var(--border)", pointerEvents: "none" }} />
        <span style={{ position: "absolute", right: "18%", top: 0, bottom: 0, width: "1px", background: "var(--border)", pointerEvents: "none" }} />
        {/* Subtle glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(196,213,108,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: "460px", margin: "0 auto", padding: "40px 20px 80px", position: "relative", zIndex: 1 }}>
          <Suspense fallback={<div style={{ color: "white", textAlign: "center" }}>Loading...</div>}>
            <AuthFlow />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
