"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlayerLoginForm, type SessionUser, type GoogleStep } from "@/components/auth/PlayerLoginForm";
import { PlayerSignUpStep1, type ProfileDetails } from "@/components/auth/PlayerSignUpStep1";
import { OTPVerificationPhone } from "@/components/auth/OTPVerificationPhone";
import { buildApiUrl, resolveImageUrl } from "@/utils/api";
import { UNVERIFIED_PHONE_KEY } from "@/utils/phoneVerify";

// One flow signs in and signs up, with no password anywhere:
//   phone  → WhatsApp code → (new number) name, email, photo
//   Google, Gmail on an account → "welcome back" → code to that account's number
//   Google, Gmail no account uses → number + photo → signed in, no code. That
//     number signs nobody in by phone until they verify it, which the app offers
//     after a booking or top-up (utils/phoneVerify)
// A number typed there that already has an account is offered a code instead:
// to add this Gmail to THAT account, or just to log in with the number — old
// players with another email land in their own account, never the photo step.
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
  const [notice, setNotice] = useState("");
  // Typed at Google signup, and already on an account: the player picks what next.
  const [existingPhone, setExistingPhone] = useState("");
  const [sending, setSending] = useState(false);

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
    if (user.phoneVerified === false && user.phone) localStorage.setItem(UNVERIFIED_PHONE_KEY, user.phone);
    else localStorage.removeItem(UNVERIFIED_PHONE_KEY);
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
    } else {
      // Everyone — new signups and photo-less older accounts too — lands on browse.
      // The photo reminder (requirePhotoUpload) still nudges the latter from there.
      router.replace(redirectAfterLogin || "/dashboard");
    }
  };

  // A code to the number that already has an account: with Google it adds this
  // Gmail to that account; without, it just logs in with the number.
  const sendCodeToExisting = async (addGmail: boolean) => {
    setError("");
    setSending(true);
    try {
      const sent = await fetch(buildApiUrl("/auth/otp/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: existingPhone, role: "player" }),
      });
      const sentData = await sent.json();
      if (!sent.ok) throw new Error(sentData.message || "Couldn't send the code. Please try again.");
      setPhone(existingPhone);
      if (addGmail) setNotice("Enter the code to add this Gmail to your KasaKai account.");
      else setGoogle(null);
      setExistingPhone("");
      setStep("otp");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const completeSignup = async (d: ProfileDetails) => {
    setDetails(d);
    setError("");
    setExistingPhone("");
    try {
      // Multipart: the photo is compulsory and the server stores it with the account.
      const body = new FormData();
      // After a phone code: the signupToken. A Gmail no account uses: Google's
      // token and the number typed, which gets no code here (the app offers one
      // after a booking or top-up — utils/phoneVerify).
      if (signupToken || !google) body.append("signupToken", signupToken);
      else {
        body.append("googleToken", google.googleToken);
        body.append("phone", d.phone || "");
      }
      body.append("name", d.firstName);
      body.append("email", d.email);
      if (d.positions?.length) body.append("preferences", JSON.stringify({ positions: d.positions }));
      if (d.profileImageDataUrl) {
        const blob = await (await fetch(d.profileImageDataUrl)).blob();
        body.append("profileImage", blob, `profile.${blob.type.split("/")[1] || "jpg"}`);
      }
      const res = await fetch(buildApiUrl("/auth/complete-signup"), { method: "POST", body });
      const data = await res.json();
      if (data.code === "PHONE_HAS_ACCOUNT" && google) {
        setExistingPhone(d.phone || "");
        window.scrollTo({ top: 0, behavior: "smooth" }); // the note sits above the form
        return;
      }
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
            setStep(r.maskedPhone ? "google" : "profile");
          }}
        />
      )}

      {/* Google, not linked, and their Gmail found the account: "welcome back" */}
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

      {/* New players only. Phone sign-up: name, email, photo. Google sign-up: number + photo. */}
      {step === "profile" && (
        <>
          {error && (
            <div style={{ background: "#ff4444", color: "white", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>
              {error}
            </div>
          )}
          {existingPhone && (
            <div style={{ background: "rgba(196,213,108,0.06)", border: "1px solid rgba(196,213,108,0.3)", color: "var(--white)", padding: "14px 16px", marginBottom: "16px", fontSize: "13px", lineHeight: 1.5 }}>
              <p style={{ margin: "0 0 12px" }}>
                <strong>+91 {existingPhone}</strong> is already associated with a KasaKai account. We can send a WhatsApp code to it to add this Gmail to that account, or you can just log in with the number.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button type="button" disabled={sending} onClick={() => sendCodeToExisting(true)} className="btn-primary" style={{ flex: "1 1 180px", opacity: sending ? 0.6 : 1 }}>
                  <span>Send code to add this Gmail</span>
                </button>
                <button type="button" disabled={sending} onClick={() => sendCodeToExisting(false)} style={{ flex: "1 1 160px", background: "none", border: "1px solid var(--border)", color: "var(--white)", padding: "10px 14px", cursor: "pointer", fontSize: "13px", opacity: sending ? 0.6 : 1 }}>
                  Log in with this number
                </button>
              </div>
            </div>
          )}
          <PlayerSignUpStep1
            google={google?.profile}
            askPhone={!!google && !signupToken}
            initial={details}
            onBack={() => {
              setGoogle(null);
              setSignupToken("");
              setExistingPhone("");
              setStep("start");
            }}
            onContinue={completeSignup}
          />
        </>
      )}

      {step === "otp" && (
        <>
          {notice && (
            <div style={{ background: "rgba(196,213,108,0.06)", border: "1px solid rgba(196,213,108,0.3)", color: "var(--white)", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", lineHeight: 1.5 }}>
              {notice}
            </div>
          )}
          <OTPVerificationPhone
            phone={phone}
            maskedPhone={google?.maskedPhone}
            role="player"
            googleToken={google?.googleToken}
            onVerified={async (r) => {
              setNotice("");
              if ("token" in r) return finishLogin(r.token, r.user);
              setSignupToken(r.signupToken);
              setStep("profile");
            }}
            onBack={() => {
              setNotice("");
              setStep(google?.maskedPhone ? "google" : google ? "profile" : "start");
            }}
          />
        </>
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
