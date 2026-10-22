"use client";

// The WhatsApp check for a Google signup's number (see utils/phoneVerify).
// Mounted once in the root layout. Required before a booking, with Cancel in
// place of Skip; only offered after a top-up or a pass purchase. The number is
// editable here, and only here: until it is verified it is a typo waiting to be
// found, and this is where the player finds it — when the code doesn't arrive.

import { useEffect, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import { validatePhone } from "@/utils/auth";
import { markPhoneVerified, registerPhoneVerify, settlePhoneVerify } from "@/utils/phoneVerify";

export default function PhoneVerifySheet() {
  const [open, setOpen] = useState(false);
  // A booking is waiting on this answer (requirePhoneVerify).
  const [required, setRequired] = useState(false);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    registerPhoneVerify((current, isRequired) => {
      setPhone(current);
      setRequired(isRequired);
      setSent(false);
      setOtp("");
      setError("");
      setDone(false);
      setOpen(true);
    });
    return () => {
      registerPhoneVerify(null);
      settlePhoneVerify(false); // a booking still waiting must not wait forever
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Skipping an offer needs no bookkeeping: offerPhoneVerify already noted today's
  // offer. Closing a required check, by any route, is a Cancel: the booking is not made.
  const finish = () => {
    setOpen(false);
    if (required) settlePhoneVerify(false);
  };

  // Verified here or on another device: either way, stop offering. A booking
  // waiting on it goes ahead at once, so there is no "verified" screen to close.
  const verified = () => {
    markPhoneVerified();
    if (required) {
      setOpen(false);
      settlePhoneVerify(true);
    } else {
      setDone(true);
    }
  };

  const post = async (path: string, body: object) => {
    const res = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: { Authorization: `Bearer ${getSession().token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
  };

  const sendCode = async () => {
    if (!validatePhone(phone)) {
      setError("Enter a valid 10-digit number (starting with 6–9).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if ((await post("/auth/phone/send", { phone })).alreadyVerified) return verified();
      setSent(true);
      setOtp("");
      setResendIn(30);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await post("/auth/phone/verify", { phone, otp });
      verified();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const input = {
    width: "100%", boxSizing: "border-box" as const, background: "#1a1a1a", border: "1px solid #333",
    borderRadius: 8, padding: "12px 14px", color: "#fff", fontSize: 16, outline: "none",
  };
  const primary = {
    width: "100%", background: "#c8ff3e", color: "#000", border: "none", borderRadius: 8,
    padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1, marginTop: 14,
  };
  const link = { background: "none", border: "none", color: "#c8ff3e", fontSize: 13, cursor: "pointer", padding: 0 };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001, padding: 16 }}
      onClick={() => !loading && finish()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-verify-title"
        style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: "26px 24px", width: "100%", maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 34, marginBottom: 10 }}>📲</div>
        <h2 id="phone-verify-title" style={{ fontSize: 18, fontWeight: 800, color: "#c8ff3e", margin: "0 0 8px" }}>
          {done ? "Number verified" : required ? "Verify your number to book" : "Verify your WhatsApp number"}
        </h2>
        <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6, margin: "0 0 18px" }}>
          {done
            ? <>You can now log in with <strong style={{ color: "#ddd" }}>+91 {phone}</strong> as well as with Google.</>
            : sent
              ? <>We sent a 6-digit code to <strong style={{ color: "#ddd" }}>+91 {phone}</strong> on WhatsApp.</>
              : required
                ? "Confirm your WhatsApp number once before your first booking. Your booking continues as soon as the code is in. Not your number? Correct it here."
                : "Verify it once and you can log in with your number as well as with Google. Not your number? Correct it here."}
        </p>

        {error && (
          <div style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.3)", color: "#ff8080", padding: "10px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {done ? null : !sent ? (
          <>
            <label htmlFor="phone-verify-number" style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>
              WhatsApp number (+91)
            </label>
            <input
              id="phone-verify-number"
              type="tel"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
              placeholder="9876543210"
              style={input}
            />
            <button type="button" disabled={loading} onClick={sendCode} style={primary}>
              {loading ? "Sending…" : "Send code"}
            </button>
          </>
        ) : (
          <form onSubmit={verify}>
            <label htmlFor="phone-verify-code" style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>
              6-digit code
            </label>
            <input
              id="phone-verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder="••••••"
              style={{ ...input, letterSpacing: "0.4em", textAlign: "center", fontSize: 20 }}
            />
            <button type="submit" disabled={loading} style={primary}>
              {loading ? "Verifying…" : "Verify"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button type="button" style={link} onClick={() => { setSent(false); setError(""); }}>
                Wrong number?
              </button>
              {resendIn > 0
                ? <span style={{ fontSize: 13, color: "#777" }}>Resend in {resendIn}s</span>
                : <button type="button" style={link} disabled={loading} onClick={sendCode}>Resend code</button>}
            </div>
          </form>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={finish}
          style={{ width: "100%", background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 8, padding: "11px", fontSize: 14, cursor: "pointer", marginTop: 12 }}
        >
          {done ? "Done" : required ? "Cancel" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
