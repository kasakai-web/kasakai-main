"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buildApiUrl } from "@/utils/api";

// ── Validation helpers ─────────────────────────────────────────────────────
const validatePhone = (p: string) => /^[6-9]\d{9}$/.test(p);
const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validatePassword = (p: string) => p.length >= 8;

// ── Global CSS injected once ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .sk-input::placeholder { color: #2e2e2e; }
  .sk-input:hover { border-color: #2e2e2e !important; }
  .sk-input:focus { border-color: #c8f135 !important; box-shadow: 0 0 0 3px rgba(200,241,53,0.09) !important; }
  .sk-select option { background: #111; color: #fff; }
  .sk-btn-lime:hover:not(:disabled) { background: #d4f545 !important; box-shadow: 0 0 32px rgba(200,241,53,0.32) !important; }
  .sk-btn-lime:active:not(:disabled) { transform: scale(0.98); }
  .sk-btn-outline:hover:not(:disabled) { border-color: #333 !important; color: #ccc !important; background: rgba(255,255,255,0.04) !important; }
  .sk-btn-outline:active:not(:disabled) { transform: scale(0.98); }
  .sk-back:hover { color: #c8f135 !important; }
  .sk-link:hover { color: #d4f545 !important; }
  .sk-forgot:hover { color: #aaa !important; }
  .sk-step { animation: fadeSlideUp 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both; }
  .sk-success { animation: scaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* ── Responsive ── */
  .sk-card-body { padding: 32px 28px 36px; }
  .sk-otp-box  { width: 46px; height: 56px; font-size: 22px; }

  @media (max-width: 400px) {
    .sk-card-body { padding: 24px 18px 28px; }
    .sk-otp-box  { width: 38px; height: 48px; font-size: 18px; }
  }
  @media (min-width: 640px) {
    .sk-card-body { padding: 40px 40px 44px; }
  }
`;

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />;
}

// ── Shared style helpers ───────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: "100%",
  height: "50px",
  background: "#0d0d0d",
  border: "1px solid #222",
  borderRadius: "8px",
  color: "#f0f0f0",
  fontSize: "15px",
  outline: "none",
  transition: "border-color 0.18s, box-shadow 0.18s",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#555",
  marginBottom: "9px",
};

// ── PhoneInput ─────────────────────────────────────────────────────────────
function PhoneInput({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="sk-input"
      style={{
        display: "flex",
        alignItems: "center",
        ...inputBase,
        padding: "0 14px",
        borderColor: hasError ? "#ef4444" : focused ? "#c8f135" : "#222",
        boxShadow: focused ? "0 0 0 3px rgba(200,241,53,0.09)" : "none",
      }}
    >
      <span style={{ color: "#3a3a3a", fontSize: "14px", fontWeight: 700, marginRight: "10px", flexShrink: 0, letterSpacing: "0.04em" }}>
        +91
      </span>
      <div style={{ width: "1px", height: "18px", background: "#1e1e1e", marginRight: "10px", flexShrink: 0 }} />
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder="9876543210"
        maxLength={10}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0f0f0", fontSize: "15px", letterSpacing: "0.04em" }}
        className="sk-input"
      />
    </div>
  );
}

// ── TextInput ──────────────────────────────────────────────────────────────
function TextInput({
  type = "text",
  value,
  onChange,
  placeholder,
  hasError,
  autoComplete,
  showToggle,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  autoComplete?: string;
  showToggle?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  if (isPassword && showToggle !== false) {
    return (
      <div
        style={{
          ...inputBase,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          borderColor: hasError ? "#ef4444" : focused ? "#c8f135" : "#222",
          boxShadow: focused ? "0 0 0 3px rgba(200,241,53,0.09)" : "none",
        }}
      >
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0f0f0", fontSize: "15px" }}
          className="sk-input"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", color: "#3a3a3a", transition: "color 0.15s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#888")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#3a3a3a")}
          tabIndex={-1}
        >
          {visible ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="sk-input"
      style={{
        ...inputBase,
        padding: "0 14px",
        borderColor: hasError ? "#ef4444" : focused ? "#c8f135" : "#222",
        boxShadow: focused ? "0 0 0 3px rgba(200,241,53,0.09)" : "none",
      }}
    />
  );
}

// ── ErrorMsg ───────────────────────────────────────────────────────────────
function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.22)",
      color: "#f87171",
      borderRadius: "8px",
      padding: "11px 14px",
      fontSize: "13px",
      lineHeight: 1.5,
    }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: "1px" }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      {msg}
    </div>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ── OTP Boxes ──────────────────────────────────────────────────────────────
function OtpBoxes({ otp, onChange, idPrefix }: { otp: string[]; onChange: (otp: string[]) => void; idPrefix: string }) {
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    onChange(next);
    if (value && index < 5) {
      (document.getElementById(`${idPrefix}-${index + 1}`) as HTMLInputElement)?.focus();
    }
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      (document.getElementById(`${idPrefix}-${index - 1}`) as HTMLInputElement)?.focus();
    }
  };
  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
      {otp.map((digit, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="sk-otp-box"
          style={{
            width: "46px",
            height: "56px",
            background: digit ? "rgba(200,241,53,0.06)" : "#0d0d0d",
            border: `1.5px solid ${digit ? "#c8f135" : "#222"}`,
            borderRadius: "8px",
            fontSize: "22px",
            fontWeight: 800,
            color: digit ? "#c8f135" : "#f0f0f0",
            textAlign: "center",
            outline: "none",
            transition: "border-color 0.18s, background 0.18s, color 0.18s, box-shadow 0.18s",
            letterSpacing: "0.04em",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#c8f135";
            e.target.style.boxShadow = "0 0 0 3px rgba(200,241,53,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = digit ? "#c8f135" : "#222";
            e.target.style.boxShadow = "none";
          }}
        />
      ))}
    </div>
  );
}

// ── ResendTimer ────────────────────────────────────────────────────────────
function ResendTimer({ onResend }: { onResend: () => void }) {
  const [timer, setTimer] = useState(60);
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);
  const handleResend = () => { setTimer(60); onResend(); };
  if (timer > 0) {
    return (
      <p style={{ color: "#333", fontSize: "12px", textAlign: "center", fontWeight: 700, letterSpacing: "0.06em" }}>
        Resend code in{" "}
        <span style={{
          color: "#c8f135",
          fontVariantNumeric: "tabular-nums",
          display: "inline-block",
          minWidth: "28px",
        }}>
          {timer}s
        </span>
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={handleResend}
      className="sk-link"
      style={{ background: "transparent", border: "none", color: "#c8f135", fontSize: "13px", cursor: "pointer", fontWeight: 700, padding: 0, transition: "color 0.15s" }}
    >
      Resend OTP
    </button>
  );
}

// ── Loading spinner ────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: "16px",
      height: "16px",
      border: "2px solid rgba(0,0,0,0.25)",
      borderTopColor: "#000",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      verticalAlign: "middle",
      marginRight: "8px",
    }} />
  );
}

// ── BackBtn ────────────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sk-back"
      style={{
        background: "none",
        border: "none",
        color: "#666",
        fontSize: "12px",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        padding: "0",
        marginBottom: "24px",
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        transition: "color 0.15s",
      }}
    >
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Back
    </button>
  );
}

// ── Card accent + header ───────────────────────────────────────────────────
function CardHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ width: "18px", height: "2px", background: "#c8f135", borderRadius: "9999px" }} />
        <span style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.28em" }}>
          {eyebrow}
        </span>
      </div>
      <h1 style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, color: "#f0f0f0", margin: 0, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ color: "#3a3a3a", fontSize: "13px", marginTop: "9px", lineHeight: 1.6, fontWeight: 500 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Minimal Screening Header ───────────────────────────────────────────────
function ScreeningAuthHeader() {
  return (
    <header style={{ position: "sticky", top: 0, background: "rgba(5,5,5,0.97)", borderBottom: "1px solid #181818", backdropFilter: "blur(20px)", zIndex: 40 }}>
      <div className="h-[66px] flex items-center">
        <Link
          href="/screening"
          aria-label="Back to screening"
          className="no-underline flex-shrink-0"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "66px", width: "64px", borderRight: "1px solid #181818" }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: "34px", height: "34px", overflow: "hidden", border: "1.5px solid #2a2a2a", flexShrink: 0 }}>
            <div style={{ flex: 1, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.08em", color: "#000", userSelect: "none" }}>KASA</span>
            </div>
            <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #2a2a2a" }}>
              <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.08em", color: "#fff", userSelect: "none" }}>KAI</span>
            </div>
          </div>
        </Link>

        <div style={{ padding: "0 20px", height: "100%", borderRight: "1px solid #181818", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#333", textTransform: "uppercase", letterSpacing: "0.25em", lineHeight: 1 }}>Kasa Kai</span>
          <span style={{ fontSize: "13px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 1, marginTop: "5px" }}>Screening</span>
        </div>

        <div style={{ flex: 1 }} />

        <Link
          href="/screening"
          className="no-underline sk-back"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginRight: "20px",
            color: "#888",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            transition: "color 0.15s",
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Live Events
        </Link>
      </div>
    </header>
  );
}

// ── Step types ─────────────────────────────────────────────────────────────
type Step = "login" | "signup" | "signup-otp" | "signup-success" | "forgot" | "forgot-otp" | "forgot-newpass";

// ── Card wrapper ───────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #1e1e1e",
  borderRadius: "14px",
  overflow: "hidden",
};

// ── Main auth flow ─────────────────────────────────────────────────────────
function ScreeningAuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep: Step = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [step, setStep] = useState<Step>(initialStep);
  const [animKey, setAnimKey] = useState(0);

  const goTo = (s: Step) => {
    setStep(s);
    setAnimKey((k) => k + 1);
    clearError();
  };

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifiedForgotOtp, setVerifiedForgotOtp] = useState("");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const clearError = () => setError("");

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validatePhone(loginPhone)) { setError("Enter a valid 10-digit phone number (starts with 6–9)"); return; }
    if (!validatePassword(loginPassword)) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword, role: "player" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "player");
      localStorage.setItem("userId", data.user?.id || "");
      localStorage.setItem("userName", data.user?.name || "");
      window.dispatchEvent(new CustomEvent("kk-auth-changed"));
      router.push(searchParams.get("redirect") || "/screening");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP ───────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!validatePhone(signupPhone)) { setError("Enter a valid 10-digit phone number (starts with 6–9)"); return; }
    if (!validateEmail(email)) { setError("Enter a valid email address"); return; }
    if (!validatePassword(password)) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: signupPhone, email, password, role: "player" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      setPhone(signupPhone);
      setOtp(["", "", "", "", "", ""]);
      goTo("signup-otp");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP OTP ───────────────────────────────────────────────────────────
  const handleSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const otpString = otp.join("");
    if (otpString.length !== 6) { setError("Please enter all 6 digits"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpString, role: "player", mode: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");
      // Backend now returns a JWT — auto-login and redirect without a second login step
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userRole", "player");
        localStorage.setItem("userId", data.user?.id || "");
        localStorage.setItem("userName", data.user?.name || "");
        window.dispatchEvent(new CustomEvent("kk-auth-changed"));
        router.push(searchParams.get("redirect") || "/screening");
        return;
      }
      goTo("signup-success");
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    clearError();
    try {
      await fetch(buildApiUrl("/api/v1/auth/resend-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role: "player" }),
      });
    } catch { }
  };

  // ── FORGOT ───────────────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validatePhone(phone)) { setError("Enter a valid 10-digit phone number (starts with 6–9)"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role: "player" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setForgotOtp(["", "", "", "", "", ""]);
      goTo("forgot-otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT OTP ───────────────────────────────────────────────────────────
  const handleForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const otpString = forgotOtp.join("");
    if (otpString.length !== 6) { setError("Please enter all 6 digits"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpString, role: "player", mode: "forgot-password" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");
      setVerifiedForgotOtp(otpString);
      goTo("forgot-newpass");
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    clearError();
    try {
      await fetch(buildApiUrl("/api/v1/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role: "player" }),
      });
    } catch { }
  };

  // ── FORGOT NEWPASS ───────────────────────────────────────────────────────
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validatePassword(newPassword)) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmNewPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: verifiedForgotOtp, newPassword, role: "player" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");
      setNewPassword("");
      setConfirmNewPassword("");
      goTo("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = (p: string) => `••••••${p.slice(-4)}`;

  const inner = (() => {
    // ── LOGIN ──
    if (step === "login") return (
      <div key={animKey} className="sk-step">
        {/* Top lime accent */}
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px", marginBottom: "0" }} />

        <div className="sk-card-body" style={{ padding: "32px 28px 36px" }}>
          <CardHeader eyebrow="Screening" title="Welcome back" subtitle="Sign in to access your bookings and reserve seats" />

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {error && <ErrorMsg msg={error} />}

            <Field label="Phone Number">
              <PhoneInput value={loginPhone} onChange={setLoginPhone} hasError={!!error && !validatePhone(loginPhone)} />
            </Field>

            <div>
              <Field label="Password">
                <TextInput type="password" value={loginPassword} onChange={setLoginPassword} placeholder="Min. 8 characters" autoComplete="current-password" hasError={!!error && !validatePassword(loginPassword)} />
              </Field>
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => goTo("forgot")}
                  className="sk-forgot"
                  style={{ background: "none", border: "none", color: "#3a3a3a", fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: 0, letterSpacing: "0.04em", transition: "color 0.15s" }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sk-btn-lime"
              style={{
                width: "100%",
                height: "52px",
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: loading ? "default" : "pointer",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                boxShadow: "0 0 24px rgba(200,241,53,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <><Spinner />Signing in…</> : <>Sign In <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#151515" }} />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#282828", letterSpacing: "0.1em", textTransform: "uppercase" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#151515" }} />
          </div>

          <button
            type="button"
            onClick={() => goTo("signup")}
            className="sk-btn-outline"
            style={{
              width: "100%",
              height: "48px",
              background: "transparent",
              color: "#555",
              border: "1px solid #222",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s, background 0.15s, transform 0.1s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M19 8v6M22 11h-6" />
            </svg>
            Create free account
          </button>

          <p style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#1e1e1e", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "24px" }}>
            By signing in you agree to our{" "}
            <Link href="/terms" className="no-underline" style={{ color: "#2e2e2e", textDecoration: "underline" }}>Terms</Link>
            {" & "}
            <Link href="/privacy" className="no-underline" style={{ color: "#2e2e2e", textDecoration: "underline" }}>Privacy</Link>
          </p>
        </div>
      </div>
    );

    // ── SIGNUP ──
    if (step === "signup") return (
      <div key={animKey} className="sk-step">
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px" }} />
        <div className="sk-card-body" style={{ padding: "32px 28px 36px" }}>
          <BackBtn onClick={() => goTo("login")} />
          <CardHeader eyebrow="Screening" title="Create account" subtitle="Join and start booking live match screenings" />

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {error && <ErrorMsg msg={error} />}

            <Field label="Full Name">
              <TextInput value={name} onChange={setName} placeholder="Your full name" hasError={!!error && !name.trim()} showToggle={false} />
            </Field>

            <Field label="Phone Number">
              <PhoneInput value={signupPhone} onChange={setSignupPhone} hasError={!!error && !validatePhone(signupPhone)} />
            </Field>

            <Field label="Email Address">
              <TextInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" hasError={!!error && !validateEmail(email)} showToggle={false} />
            </Field>

            <Field label="Password">
              <TextInput type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" autoComplete="new-password" hasError={!!error && !validatePassword(password)} />
            </Field>

            <Field label="Confirm Password">
              <TextInput type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" autoComplete="new-password" hasError={!!error && password !== confirmPassword && !!confirmPassword} />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="sk-btn-lime"
              style={{
                width: "100%",
                height: "52px",
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: loading ? "default" : "pointer",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                boxShadow: "0 0 24px rgba(200,241,53,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "4px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <><Spinner />Creating Account…</> : "Create Account"}
            </button>

            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#333", fontSize: "13px" }}>Already have an account? </span>
              <button
                type="button"
                onClick={() => goTo("login")}
                className="sk-link"
                style={{ background: "none", border: "none", color: "#c8f135", fontSize: "13px", fontWeight: 800, cursor: "pointer", padding: 0, transition: "color 0.15s" }}
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    );

    // ── SIGNUP OTP ──
    if (step === "signup-otp") return (
      <div key={animKey} className="sk-step">
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px" }} />
        <div className="sk-card-body" style={{ padding: "32px 28px 36px" }}>
          <BackBtn onClick={() => goTo("signup")} />

          {/* OTP icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <div style={{ width: "56px", height: "56px", background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 9.91A16 16 0 0014.09 17.91l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 18.92z" />
              </svg>
            </div>
          </div>

          <CardHeader eyebrow="Verify Account" title="Check your phone" subtitle={`A 6-digit code was sent to +91 ${maskPhone(phone)}`} />

          <form onSubmit={handleSignupOtp} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {error && <ErrorMsg msg={error} />}
            <OtpBoxes otp={otp} onChange={setOtp} idPrefix="sotp" />
            <div style={{ textAlign: "center" }}>
              <ResendTimer onResend={handleResendSignupOtp} />
            </div>
            <button
              type="submit"
              disabled={loading || otp.some((d) => !d)}
              className="sk-btn-lime"
              style={{
                width: "100%",
                height: "52px",
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: (loading || otp.some((d) => !d)) ? "default" : "pointer",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                boxShadow: "0 0 24px rgba(200,241,53,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: (loading || otp.some((d) => !d)) ? 0.45 : 1,
              }}
            >
              {loading ? <><Spinner />Verifying…</> : "Verify & Continue"}
            </button>
          </form>
        </div>
      </div>
    );

    // ── SIGNUP SUCCESS ──
    if (step === "signup-success") return (
      <div key={animKey} className="sk-success">
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px" }} />
        <div className="sk-card-body" style={{ padding: "40px 28px 44px", textAlign: "center" }}>
          {/* Animated check */}
          <div style={{
            width: "72px",
            height: "72px",
            background: "rgba(200,241,53,0.1)",
            border: "1.5px solid rgba(200,241,53,0.3)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
            boxShadow: "0 0 32px rgba(200,241,53,0.12)",
          }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "14px" }}>
            <div style={{ width: "18px", height: "2px", background: "#c8f135", borderRadius: "9999px" }} />
            <span style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.28em" }}>Account Created</span>
            <div style={{ width: "18px", height: "2px", background: "#c8f135", borderRadius: "9999px" }} />
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#f0f0f0", margin: "0 0 10px", lineHeight: 1.2 }}>You're all set!</h1>
          <p style={{ color: "#3a3a3a", fontSize: "13px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "280px", margin: "0 auto 32px" }}>
            Welcome to Kasa Kai Screening,{" "}
            <span style={{ color: "#888", fontWeight: 700 }}>{name}</span>.{" "}
            Your account is ready — sign in to start booking events.
          </p>

          <button
            onClick={() => goTo("login")}
            className="sk-btn-lime"
            style={{
              width: "100%",
              height: "52px",
              background: "#c8f135",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
              boxShadow: "0 0 24px rgba(200,241,53,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            Sign In Now
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    );

    // ── FORGOT ──
    if (step === "forgot") return (
      <div key={animKey} className="sk-step">
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px" }} />
        <div className="sk-card-body" style={{ padding: "32px 28px 36px" }}>
          <BackBtn onClick={() => goTo("login")} />

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <div style={{ width: "56px", height: "56px", background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
          </div>

          <CardHeader eyebrow="Password Reset" title="Forgot password?" subtitle="Enter your registered phone number and we'll send a reset code" />

          <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {error && <ErrorMsg msg={error} />}
            <Field label="Phone Number">
              <PhoneInput value={phone} onChange={setPhone} hasError={!!error && !validatePhone(phone)} />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="sk-btn-lime"
              style={{
                width: "100%",
                height: "52px",
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: loading ? "default" : "pointer",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                boxShadow: "0 0 24px rgba(200,241,53,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <><Spinner />Sending OTP…</> : "Send Reset Code"}
            </button>
          </form>
        </div>
      </div>
    );

    // ── FORGOT OTP ──
    if (step === "forgot-otp") return (
      <div key={animKey} className="sk-step">
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px" }} />
        <div className="sk-card-body" style={{ padding: "32px 28px 36px" }}>
          <BackBtn onClick={() => goTo("forgot")} />

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <div style={{ width: "56px", height: "56px", background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 9.91A16 16 0 0014.09 17.91l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 18.92z" />
              </svg>
            </div>
          </div>

          <CardHeader eyebrow="Password Reset" title="Enter reset code" subtitle={`Code sent to +91 ${maskPhone(phone)}`} />

          <form onSubmit={handleForgotOtp} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {error && <ErrorMsg msg={error} />}
            <OtpBoxes otp={forgotOtp} onChange={setForgotOtp} idPrefix="fotp" />
            <div style={{ textAlign: "center" }}>
              <ResendTimer onResend={handleResendForgotOtp} />
            </div>
            <button
              type="submit"
              disabled={loading || forgotOtp.some((d) => !d)}
              className="sk-btn-lime"
              style={{
                width: "100%",
                height: "52px",
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: (loading || forgotOtp.some((d) => !d)) ? "default" : "pointer",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                boxShadow: "0 0 24px rgba(200,241,53,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: (loading || forgotOtp.some((d) => !d)) ? 0.45 : 1,
              }}
            >
              {loading ? <><Spinner />Verifying…</> : "Verify Code"}
            </button>
          </form>
        </div>
      </div>
    );

    // ── FORGOT NEWPASS ──
    if (step === "forgot-newpass") return (
      <div key={animKey} className="sk-step">
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135 40%, transparent)", margin: "0 40px", borderRadius: "9999px" }} />
        <div className="sk-card-body" style={{ padding: "32px 28px 36px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <div style={{ width: "56px", height: "56px", background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>

          <CardHeader eyebrow="Password Reset" title="Set new password" subtitle="Choose a strong password for your account" />

          <form onSubmit={handleNewPassword} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {error && <ErrorMsg msg={error} />}

            <Field label="New Password">
              <TextInput type="password" value={newPassword} onChange={setNewPassword} placeholder="Min. 8 characters" autoComplete="new-password" hasError={!!error && !validatePassword(newPassword)} />
            </Field>

            <Field label="Confirm New Password">
              <TextInput type="password" value={confirmNewPassword} onChange={setConfirmNewPassword} placeholder="Re-enter password" autoComplete="new-password" hasError={!!error && newPassword !== confirmNewPassword && !!confirmNewPassword} />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="sk-btn-lime"
              style={{
                width: "100%",
                height: "52px",
                background: "#c8f135",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: loading ? "default" : "pointer",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                boxShadow: "0 0 24px rgba(200,241,53,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "4px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <><Spinner />Resetting…</> : <>Reset Password <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>}
            </button>
          </form>
        </div>
      </div>
    );

    return null;
  })();

  return (
    <div style={card}>
      {inner}
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────────────
export default function ScreeningLoginPage() {
  return (
    <>
      <GlobalStyles />
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          backgroundImage: "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(200,241,53,0.07) 0%, transparent 70%)",
        }}
      >
        <ScreeningAuthHeader />

        {/* Subtle grid pattern */}
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }} />

        <main style={{
          position: "relative",
          zIndex: 1,
          minHeight: "calc(100vh - 66px)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "32px 16px 60px",
        }}>
          <div style={{ width: "100%", maxWidth: "480px", paddingTop: "clamp(0px, 4vh, 40px)" }}>
            <Suspense fallback={
              <div style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "48px", textAlign: "center", color: "#333", fontSize: "13px" }}>
                Loading…
              </div>
            }>
              <ScreeningAuthFlow />
            </Suspense>

            {/* Back link below card */}
            <div style={{ textAlign: "center", marginTop: "20px", paddingBottom: "8px" }}>
              <Link
                href="/screening"
                className="no-underline sk-back"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "#555",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  transition: "color 0.15s",
                }}
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back to Live Screenings
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
