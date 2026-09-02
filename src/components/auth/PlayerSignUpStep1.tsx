"use client";

import { useEffect, useRef, useState } from "react";
import { validatePhone, validateEmail } from "@/utils/auth";
import { buildApiUrl } from "@/utils/api";

interface PlayerSignUpStep1Props {
  onBack: () => void;
  onContinue: (data: { firstName: string; phone: string; email: string; profileImageDataUrl?: string }) => void;
}

export function PlayerSignUpStep1({ onBack, onContinue }: PlayerSignUpStep1Props) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profileImageDataUrl, setProfileImageDataUrl] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState<{ phone?: boolean; email?: boolean }>({});
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  useEffect(() => {
    if (!showPhotoPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) setShowPhotoPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPhotoPicker]);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacing } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => { if (!cancelled) { setCameraOpen(false); fileInputRef.current?.click(); } });
    return () => { cancelled = true; };
  }, [cameraOpen, cameraFacing]);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const closeCamera = () => { stopStream(); setCameraOpen(false); };
  const flipCamera = () => setCameraFacing((f) => f === "user" ? "environment" : "user");

  // Check phone or email availability against the DB (only verified accounts count)
  const checkField = async (field: "phone" | "email", value: string) => {
    setChecking((prev) => ({ ...prev, [field]: true }));
    try {
      const body: Record<string, string> = { role: "player" };
      body[field] = value;
      const res = await fetch(buildApiUrl("/auth/check-availability"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        if (field === "phone" && data.data.phoneExists) {
          setErrors((prev) => ({ ...prev, phone: "This phone number is already registered. Please login or use a different number." }));
        }
        if (field === "email" && data.data.emailExists) {
          setErrors((prev) => ({ ...prev, email: "This email is already registered. Please login or use a different email." }));
        }
      }
    } catch {
      // non-critical — will be caught at submit if still duplicate
    } finally {
      setChecking((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleTakePhoto = () => { setShowPhotoPicker(false); setCameraOpen(true); };
  const handleChooseGallery = () => { setShowPhotoPicker(false); fileInputRef.current?.click(); };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      closeCamera();
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      setErrors((prev) => ({ ...prev, image: "" }));
      const reader = new FileReader();
      reader.onload = () => setProfileImageDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    }, "image/jpeg", 0.9);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: "Only JPEG, PNG, or WebP images allowed" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be under 5MB" }));
      return;
    }
    setErrors((prev) => ({ ...prev, image: "" }));
    const reader = new FileReader();
    reader.onload = () => setProfileImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!profileImageDataUrl) newErrors.image = "A clear photo of yourself is required";
    if (!firstName.trim()) newErrors.firstName = "Name is required";
    if (!validatePhone(phone)) newErrors.phone = "Enter valid 10-digit phone (starting 6-9)";
    if (!validateEmail(email)) newErrors.email = "Enter valid email";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Re-run availability check on submit in case blur was skipped (autofill, paste, etc.)
    // If errors already showing from blur, skip re-check
    if (!errors.phone && !errors.email) {
      try {
        const res = await fetch(buildApiUrl("/auth/check-availability"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, email, role: "player" }),
        });
        const data = await res.json();
        if (data.success) {
          const submitErrors: Record<string, string> = {};
          if (data.data.phoneExists) submitErrors.phone = "This phone number is already registered. Please login or use a different number.";
          if (data.data.emailExists) submitErrors.email = "This email is already registered. Please login or use a different email.";
          if (Object.keys(submitErrors).length > 0) {
            setErrors(submitErrors);
            return;
          }
        }
      } catch {
        // network failure — let the register call handle it in step 3
      }
    } else if (errors.phone || errors.email) {
      // existing availability errors still showing — block submit
      return;
    }

    onContinue({ firstName, phone, email, profileImageDataUrl });
  };

  return (
    <>
    {cameraOpen && (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#000", display: "flex", flexDirection: "column" }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", flex: 1, objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px 48px", background: "linear-gradient(transparent,rgba(0,0,0,0.85))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={closeCamera} style={{ color: "#fff", background: "none", border: "none", fontSize: 15, cursor: "pointer", padding: "8px 12px", fontFamily: "var(--body)" }}>Cancel</button>
          <button type="button" onClick={capturePhoto} style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", border: "5px solid rgba(255,255,255,0.4)", cursor: "pointer", boxShadow: "0 0 0 3px rgba(255,255,255,0.2)" }} aria-label="Capture" />
          <button type="button" onClick={flipCamera} style={{ color: "#fff", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Flip camera">🔄</button>
        </div>
      </div>
    )}
    <div className="auth-card">
      {/* No "← Back" here on purpose. Step 1 is the START of sign-up, so the only
          place back could go is the login form — and the "Sign In" button below
          says that outright. Steps 2 and 3 keep theirs: those go to a real
          previous step. `onBack` still drives that button. */}
      <div className="auth-head">
        <div className="auth-eyebrow">Step 1 of 3 · Your details</div>
        <h1 className="auth-title">
          Create<br />
          <span className="accent">Account</span>
        </h1>
        <p className="auth-lead">Tell us who you are. Takes under a minute.</p>
      </div>

      {/* Profile photo */}
      <div className="auth-photo" style={{ marginBottom: "28px" }}>
        <div
          className={`auth-photo-well${profileImageDataUrl ? " filled" : ""}${errors.image ? " invalid" : ""}`}
          onClick={() => setShowPhotoPicker(true)}
        >
          {profileImageDataUrl ? (
            <img src={profileImageDataUrl} alt="Profile preview" />
          ) : (
            <div className="auth-photo-placeholder">
              📷
              <br />
              Add photo
            </div>
          )}
        </div>

        <div ref={pickerWrapRef} style={{ position: "relative" }}>
          <button type="button" className="auth-linkbtn" onClick={() => setShowPhotoPicker((v) => !v)}>
            {profileImageDataUrl ? "Change photo" : "Upload a photo of yourself *"}
          </button>
          {showPhotoPicker && (
            <div className="auth-photo-menu">
              <button type="button" onClick={handleTakePhoto}>
                <span style={{ fontSize: 16 }}>📷</span> Take Photo
              </button>
              <button type="button" onClick={handleChooseGallery}>
                <span style={{ fontSize: 16 }}>🖼️</span> Choose from Gallery
              </button>
            </div>
          )}
        </div>

        {errors.image && <span className="auth-err">{errors.image}</span>}
        {/* States the PURPOSE, not a vague appeal to quality: people upload
            stock images when they cannot see what the photo is for. Organisers
            check faces against this picture at the venue, so say that. */}
        <p className="auth-hint" style={{ textAlign: "center", maxWidth: "280px" }}>
          Organisers use this photo to identify you at the venue, so please
          upload a clear, recent photo of yourself.
        </p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageChange} />
      </div>

      <form onSubmit={handleContinue} className="auth-form">
        {/* Name */}
        <div className="auth-field">
          <label className="auth-label">Full Name *</label>
          <div className={`auth-input-shell${errors.firstName ? " invalid" : ""}`}>
            <input
              type="text"
              className="auth-input"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setErrors({ ...errors, firstName: "" });
              }}
              placeholder="Your full name"
            />
          </div>
          {errors.firstName && <span className="auth-err">{errors.firstName}</span>}
        </div>

        {/* Phone */}
        <div className="auth-field">
          <label className="auth-label">Phone Number *</label>
          <div className={`auth-input-shell${errors.phone ? " invalid" : ""}`}>
            <span className="auth-prefix">+91</span>
            <input
              type="tel"
              className="auth-input"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(val);
                setErrors({ ...errors, phone: "" });
              }}
              placeholder="9876543210"
              maxLength={10}
              onBlur={(e) => {
                const val = e.currentTarget.value.replace(/\D/g, "");
                if (validatePhone(val)) checkField("phone", val);
              }}
            />
          </div>
          {checking.phone && !errors.phone && <span className="auth-hint">Checking availability…</span>}
          {errors.phone && <span className="auth-err">{errors.phone}</span>}
        </div>

        {/* Email */}
        <div className="auth-field">
          <label className="auth-label">Email Address *</label>
          <div className={`auth-input-shell${errors.email ? " invalid" : ""}`}>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ ...errors, email: "" });
              }}
              placeholder="your@email.com"
              onBlur={(e) => {
                if (validateEmail(e.target.value)) checkField("email", e.target.value);
              }}
            />
          </div>
          {checking.email && !errors.email && <span className="auth-hint">Checking availability…</span>}
          {errors.email && <span className="auth-err">{errors.email}</span>}
        </div>

        <button
          type="submit"
          disabled={checking.phone || checking.email}
          className="btn-primary btn-block"
          style={{ marginTop: "4px" }}
        >
          <span>{(checking.phone || checking.email) ? "Checking…" : "Continue"}</span>
        </button>

        {/* Switch to sign-in — the mirror of the login form's "Create an Account".
            Landing-page CTAs open this step first, so people who already have an
            account must be able to cross over. */}
        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <button type="button" onClick={onBack} className="btn-ghost btn-block">
          Sign In
        </button>
      </form>
    </div>
    </>
  );
}
