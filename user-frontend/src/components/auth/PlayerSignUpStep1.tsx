"use client";

import { useRef, useState } from "react";
import { validatePhone, validateEmail } from "@/utils/auth";

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
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!profileImageDataUrl) newErrors.image = "A profile photo is required";
    if (!firstName.trim()) newErrors.firstName = "Name is required";
    if (!validatePhone(phone)) newErrors.phone = "Enter valid 10-digit phone (starting 6-9)";
    if (!validateEmail(email)) newErrors.email = "Enter valid email";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onContinue({ firstName, phone, email, profileImageDataUrl });
  };

  const inputStyle = {
    width: "100%",
    background: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "6px",
    padding: "12px",
    color: "white",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ background: "var(--dark-navy)", padding: "40px 30px", borderRadius: "12px", border: "1px solid #333" }}>
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          color: "var(--yellow)",
          border: "none",
          fontSize: "14px",
          cursor: "pointer",
          marginBottom: "20px",
          padding: 0,
        }}
      >
        ← Back
      </button>

      <h1 style={{ color: "var(--yellow)", fontSize: "28px", marginBottom: "10px" }}>Create Account</h1>
      <p style={{ color: "#999", marginBottom: "30px", fontSize: "14px" }}>Step 1 of 3: Enter your details</p>

      {/* Photo Picker Bottom Sheet */}
      {showPhotoPicker && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowPhotoPicker(false)}
        >
          <div
            style={{ background: "#12122a", borderRadius: "16px 16px 0 0", padding: "20px 20px 36px", width: "100%", maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ textAlign: "center", color: "#888", fontSize: 12, marginBottom: 18, textTransform: "uppercase", letterSpacing: 1 }}>Profile Photo</p>
            <button type="button" style={{ width: "100%", background: "#1e1e3a", border: "none", color: "#fff", padding: "16px 20px", borderRadius: 12, fontSize: 16, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}
              onClick={() => { setShowPhotoPicker(false); cameraInputRef.current?.click(); }}>
              <span style={{ fontSize: 24 }}>📷</span> Take Photo
            </button>
            <button type="button" style={{ width: "100%", background: "#1e1e3a", border: "none", color: "#fff", padding: "16px 20px", borderRadius: 12, fontSize: 16, cursor: "pointer", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}
              onClick={() => { setShowPhotoPicker(false); fileInputRef.current?.click(); }}>
              <span style={{ fontSize: 24 }}>🖼️</span> Choose from Gallery
            </button>
            <button type="button" style={{ width: "100%", background: "transparent", border: "1px solid #333", color: "#888", padding: "14px", borderRadius: 12, fontSize: 15, cursor: "pointer" }}
              onClick={() => setShowPhotoPicker(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile Image Picker */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
        <div
          onClick={() => setShowPhotoPicker(true)}
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: profileImageDataUrl ? "transparent" : "#1a1a2e",
            border: `2px dashed ${errors.image ? "#ff6b6b" : profileImageDataUrl ? "var(--yellow)" : "#555"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
            marginBottom: "10px",
            transition: "border-color 0.2s",
          }}
        >
          {profileImageDataUrl ? (
            <img src={profileImageDataUrl} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px" }}>📷</div>
              <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>Add Photo</div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPhotoPicker(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--yellow)",
            fontSize: "13px",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {profileImageDataUrl ? "Change photo" : "Upload profile photo *"}
        </button>
        {errors.image && <small style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "4px" }}>{errors.image}</small>}
        <p style={{ color: "#888", fontSize: "11px", marginTop: "8px", textAlign: "center", maxWidth: "260px", lineHeight: 1.5 }}>
          Adding a photo is important to ensure quality of the game.
        </p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageChange} />
        <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" style={{ display: "none" }} onChange={handleImageChange} />
      </div>

      <form onSubmit={handleContinue}>
        {/* Name */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Full Name *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setErrors({ ...errors, firstName: "" });
            }}
            placeholder="Your full name"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.target.style.borderColor = "#444")}
          />
          {errors.firstName && <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "4px" }}>{errors.firstName}</small>}
        </div>

        {/* Phone */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Phone Number *</label>
          <div style={{ display: "flex", alignItems: "center", background: "#1a1a2e", border: errors.phone ? "1px solid #ff6b6b" : "1px solid #444", borderRadius: "6px", padding: "0 12px" }}>
            <span style={{ color: "#999", fontSize: "14px", fontWeight: "600" }}>+91</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(val);
                setErrors({ ...errors, phone: "" });
              }}
              placeholder="9876543210"
              maxLength={10}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "12px 12px",
                color: "white",
                fontSize: "16px",
                outline: "none",
              }}
              onFocus={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) container.style.borderColor = "var(--yellow)";
              }}
              onBlur={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) container.style.borderColor = errors.phone ? "#ff6b6b" : "#444";
              }}
            />
          </div>
          {errors.phone && <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "4px" }}>{errors.phone}</small>}
        </div>

        {/* Email */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({ ...errors, email: "" });
            }}
            placeholder="your@email.com"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.target.style.borderColor = errors.email ? "#ff6b6b" : "#444")}
          />
          {errors.email && <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "4px" }}>{errors.email}</small>}
        </div>

        <button
          type="submit"
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
            transition: "background 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--yellow)")}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
