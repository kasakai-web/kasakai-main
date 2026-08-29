"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlayerLoginForm } from "@/components/auth/PlayerLoginForm";
import { PlayerSignUpStep1 } from "@/components/auth/PlayerSignUpStep1";
import { PlayerSignUpPreferences } from "@/components/auth/PlayerSignUpPreferences";
import { PlayerSignUpStep2 } from "@/components/auth/PlayerSignUpStep2";
import { OTPVerificationPhone } from "@/components/auth/OTPVerificationPhone";
import { ForgotPasswordStep1 } from "@/components/auth/ForgotPasswordStep1";
import { SetNewPasswordForm } from "@/components/auth/SetNewPasswordForm";
import { buildApiUrl, resolveImageUrl } from "@/utils/api";

function AuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfterLogin = searchParams.get("redirect") || null;
  const targetGame = searchParams.get("targetGame") || null; // Game ID for auto-booking
  const mode = searchParams.get("mode") || null;
  const [step, setStep] = useState<
    | "login"
    | "signup-form"
    | "signup-preferences"
    | "signup-confirm"
    | "signup-otp"
    | "signup-success"
    | "forgot-step1"
    | "forgot-otp"
    | "forgot-newpass"
  >(mode === "signup" ? "signup-form" : "login");

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

  const [userData, setUserData] = useState({
    phone: "",
    email: "",
    firstName: "",
    city: "",
    preferences: { positions: [] as string[], preferredLocations: [] as string[] },
    otp: "",
    profileImageDataUrl: "",
    devOtp: "",
  });


  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const uRole = localStorage.getItem("userRole");
    const uId = localStorage.getItem("userId");

    if (token && uRole === "player" && uId && step === "login") {
      router.replace(`/dashboard/player/${uId}`);
    }
  }, [router, step]);

  return (
    <>
      {/* LOGIN */}
      {step === "login" && (
        <>
          <PlayerLoginForm
            onSignupClick={() => setStep("signup-form")}
            onForgotClick={() => setStep("forgot-step1")}
            redirectAfterLogin={redirectAfterLogin}
            targetGame={persistedTargetGame}
          />
        </>
      )}

      {/* SIGNUP - STEP 1: Personal details */}
      {step === "signup-form" && (
        <PlayerSignUpStep1
          onBack={() => setStep("login")}
          onContinue={(data: { firstName: string; phone: string; email: string; profileImageDataUrl?: string }) => {
            setUserData((prev) => ({ ...prev, ...data, profileImageDataUrl: data.profileImageDataUrl || "" }));
            setStep("signup-preferences");
          }}
        />
      )}

      {/* SIGNUP - STEP 2: Game preferences */}
      {step === "signup-preferences" && (
        <PlayerSignUpPreferences
          onBack={() => setStep("signup-form")}
          onContinue={({ city, ...prefs }) => {
            setUserData((prev) => ({ ...prev, city, preferences: prefs }));
            setStep("signup-confirm");
          }}
        />
      )}

      {/* SIGNUP - STEP 3: Confirm & Create Account */}
      {step === "signup-confirm" && (
        <PlayerSignUpStep2
          userData={userData}
          onBack={() => setStep("signup-preferences")}
          onSuccess={(password, devOtp) => {
            setUserData((prev) => ({ ...prev, password, devOtp: devOtp || "" }));
            setStep("signup-otp");
          }}
        />
      )}

      {/* SIGNUP - STEP 4: OTP Verification */}
      {step === "signup-otp" && (
        <OTPVerificationPhone
          phone={userData.phone}
          role="player"
          mode="signup"
          devOtp={userData.devOtp}
          onVerified={async (_otpVal, authData) => {
            if (authData?.token && authData?.user) {
              const uid = authData.user.id || authData.user._id;
              localStorage.setItem("authToken", authData.token);
              localStorage.setItem("userRole", "player");
              localStorage.setItem("userId", uid);
              localStorage.setItem("userName", authData.user.name || "User");
              
              // for auto-handoff to booking
              if (persistedTargetGame) {
                localStorage.setItem("targetGameId", persistedTargetGame);
              }
              
              window.dispatchEvent(new CustomEvent("kk-auth-changed"));

              // Upload profile photo chosen during signup
              if (userData.profileImageDataUrl) {
                try {
                  const blob = await (await fetch(userData.profileImageDataUrl)).blob();
                  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
                  const formData = new FormData();
                  formData.append("profileImage", blob, `profile.${ext}`);
                  const imgRes = await fetch(buildApiUrl("/players/me/profile-image"), {
                    method: "POST",
                    headers: { Authorization: `Bearer ${authData.token}` },
                    body: formData,
                  });
                  if (imgRes.ok) {
                    const imgData = await imgRes.json();
                    if (imgData.data?.profileImage) {
                      localStorage.setItem("userProfileImage", resolveImageUrl(imgData.data.profileImage));
                    }
                  }
                } catch { /* non-critical */ }
              }

              localStorage.setItem("showProfileBanner", "true");
              
              if (persistedTargetGame) {
                router.replace(`/dashboard/player/${uid}?openGame=${persistedTargetGame}`);
              } else if (redirectAfterLogin) {
                router.replace(redirectAfterLogin);
              } else {
                router.replace(`/dashboard/player/${uid}/profile`);
              }
            } else {
              setStep("signup-success");
            }
          }}
          onBack={() => setStep("signup-confirm")}
        />
      )}

      {/* SIGNUP SUCCESS — fallback if auto-login data is missing */}
      {step === "signup-success" && (
        <div style={{ background: "var(--dark-navy)", padding: "40px 30px", borderRadius: "12px", border: "1px solid #333", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
          <h1 style={{ color: "var(--yellow)", fontSize: "26px", marginBottom: "12px" }}>Account Verified!</h1>
          <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "8px", lineHeight: 1.6 }}>
            Welcome to Kasakai, <strong style={{ color: "white" }}>{userData.firstName}</strong>!
          </p>
          <p style={{ color: "#999", fontSize: "13px", marginBottom: "28px", lineHeight: 1.6 }}>
            Your account is ready. Please log in to continue.
          </p>
          <button
            onClick={() => {
              localStorage.setItem("newSignup", "true");
              if (userData.profileImageDataUrl) {
                localStorage.setItem("pendingProfileImage", userData.profileImageDataUrl);
              }
              setStep("login");
            }}
            style={{
              width: "100%",
              background: "var(--yellow)",
              color: "black",
              border: "none",
              padding: "12px",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Login Now
          </button>
        </div>
      )}

      {/* FORGOT PASSWORD - STEP 1: Enter Phone */}
      {step === "forgot-step1" && (
        <ForgotPasswordStep1
          onBack={() => setStep("login")}
          onContinue={(phone: string, devOtp?: string) => {
            setUserData((prev) => ({ ...prev, phone, devOtp: devOtp || "" }));
            setStep("forgot-otp");
          }}
        />
      )}

      {/* FORGOT PASSWORD - STEP 2: OTP Verification */}
      {step === "forgot-otp" && (
        <OTPVerificationPhone
          phone={userData.phone}
          role="player"
          mode="forgot-password"
          devOtp={userData.devOtp}
          onVerified={(otpVal: string) => {
            setUserData((prev) => ({ ...prev, otp: otpVal }));
            setStep("forgot-newpass");
          }}
          onBack={() => setStep("forgot-step1")}
        />
      )}

      {/* FORGOT PASSWORD - STEP 3: Set New Password */}
      {step === "forgot-newpass" && (
        <SetNewPasswordForm
          phone={userData.phone}
          otp={userData.otp}
          onSuccess={() => {
            setStep("login");
            alert("Password changed successfully! Please login with new password.");
          }}
          onBack={() => setStep("forgot-step1")}
        />
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: "66px", background: "var(--black)", position: "relative", overflow: "hidden" }}>
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
