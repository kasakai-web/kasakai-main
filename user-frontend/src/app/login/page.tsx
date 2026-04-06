"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlayerLoginForm } from "@/components/auth/PlayerLoginForm";
import { PlayerSignUpStep1 } from "@/components/auth/PlayerSignUpStep1";        
import { PlayerSignUpStep2 } from "@/components/auth/PlayerSignUpStep2";        
import { OTPVerificationPhone } from "@/components/auth/OTPVerificationPhone";  
import { ForgotPasswordStep1 } from "@/components/auth/ForgotPasswordStep1";    
import { SetNewPasswordForm } from "@/components/auth/SetNewPasswordForm"; 

function AuthFlow() {
  const router = useRouter();

  const [step, setStep] = useState<"login" | "signup-form" | "signup-otp" | "signup-confirm" | "forgot-step1" | "forgot-otp" | "forgot-newpass">("login");
  const [userData, setUserData] = useState({
    phone: "",
    email: "",
    firstName: "",
    address: "",
    otp: "",
  });

  useEffect(() => {
    // Auto-login persistence
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
        <PlayerLoginForm
          onSignupClick={() => setStep("signup-form")}
          onForgotClick={() => setStep("forgot-step1")}
        />
      )}

      {/* SIGNUP - STEP 1: Details */}
      {step === "signup-form" && (
        <PlayerSignUpStep1
          onBack={() => setStep("login")}
          onContinue={(data: { firstName: string; phone: string; email: string; address: string }) => {
            setUserData((prev) => ({ ...prev, ...data }));
            setStep("signup-confirm");
          }}
        />
      )}

      {/* SIGNUP - STEP 2: Confirm Details & Create Account */}
      {step === "signup-confirm" && (
        <PlayerSignUpStep2
          userData={userData}
          onBack={() => setStep("signup-form")}
          onSuccess={(password) => {
            setUserData((prev) => ({ ...prev, password }));
            setStep("signup-otp");
          }}
        />
      )}

      {/* SIGNUP - STEP 3: OTP Verification */}
      {step === "signup-otp" && (
        <OTPVerificationPhone
          email={userData.email}
          phone={userData.phone}
          role="player"
          mode="signup"
          onVerified={() => {
            setStep("login");
            alert("Account verified and created successfully! Please login.");
          }}
          onBack={() => setStep("signup-confirm")}
        />
      )}

      {/* FORGOT PASSWORD - STEP 1: Enter Email */}
      {step === "forgot-step1" && (
        <ForgotPasswordStep1
          onBack={() => setStep("login")}
          onContinue={(email: string) => {
            setUserData((prev) => ({ ...prev, email }));
            setStep("forgot-otp");
          }}
        />
      )}

      {/* FORGOT PASSWORD - STEP 2: OTP Verification */}
      {step === "forgot-otp" && (
        <OTPVerificationPhone
          email={userData.email}
          role="player"
          mode="forgot-password"
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
          email={userData.email}
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
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: "100px", background: "var(--black)" }}>
        <div className="container" style={{ maxWidth: "500px", margin: "0 auto", paddingBottom: "80px" }}>
          <Suspense fallback={<div style={{ color: "white", textAlign: "center" }}>Loading...</div>}>
            <AuthFlow />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

