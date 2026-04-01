"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  const [step, setStep] = useState<"login" | "signup-form" | "signup-otp" | "signup-confirm" | "forgot-step1" | "forgot-otp" | "forgot-newpass">("login");
  const [userData, setUserData] = useState({
    phone: "",
    email: "",
    firstName: "",
    address: "",
  });

  useEffect(() => {
    if (!role) {
      router.replace("/login?role=player");
    }
  }, [role, router]);

  if (!role) {
    return <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Redirecting...</div>;
  }

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
            setStep("signup-otp");
          }}
        />
      )}

      {/* SIGNUP - STEP 2: OTP Verification */}
      {step === "signup-otp" && (
        <OTPVerificationPhone
          phone={userData.phone}
          mode="signup"
          onVerified={() => setStep("signup-confirm")}
          onBack={() => setStep("signup-form")}
        />
      )}

      {/* SIGNUP - STEP 3: Confirm Details & Create Account */}
      {step === "signup-confirm" && (
        <PlayerSignUpStep2
          userData={userData}
          onBack={() => setStep("signup-form")}
          onSuccess={() => {
            setStep("login");
            alert("Account created successfully! Please login.");
          }}
        />
      )}

      {/* FORGOT PASSWORD - STEP 1: Enter Phone */}
      {step === "forgot-step1" && (
        <ForgotPasswordStep1
          onBack={() => setStep("login")}
          onContinue={(phone: string) => {
            setUserData((prev) => ({ ...prev, phone }));
            setStep("forgot-otp");
          }}
        />
      )}

      {/* FORGOT PASSWORD - STEP 2: OTP Verification */}
      {step === "forgot-otp" && (
        <OTPVerificationPhone
          phone={userData.phone}
          mode="forgot-password"
          onVerified={() => setStep("forgot-newpass")}
          onBack={() => setStep("forgot-step1")}
        />
      )}

      {/* FORGOT PASSWORD - STEP 3: Set New Password */}
      {step === "forgot-newpass" && (
        <SetNewPasswordForm
          phone={userData.phone}
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

