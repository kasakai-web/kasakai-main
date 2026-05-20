"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error";

export interface ToastState {
  type: ToastType;
  title: string;
  subtitle?: string;
}

interface ToastProps extends ToastState {
  onClose: () => void;
  duration?: number;
}

const ICONS: Record<ToastType, { symbol: string; bg: string; border: string; color: string; glow: string }> = {
  success: {
    symbol: "✓",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.4)",
    color: "#4ade80",
    glow: "0 0 24px rgba(74,222,128,0.25)",
  },
  error: {
    symbol: "✕",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.4)",
    color: "#f87171",
    glow: "0 0 24px rgba(248,113,113,0.25)",
  },
};

export function Toast({ type, title, subtitle, onClose, duration = 2000 }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    // Slight delay so the fade-in always plays
    const show = setTimeout(() => setVisible(true), 10);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 280);
    }, duration);
    return () => {
      clearTimeout(show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onClose]);

  if (!mounted) return null;

  const icon = ICONS[type];

  const content = (
    <>
      <style>{`
        @keyframes kkToastIn {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.88); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes kkToastOut {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to   { opacity: 0; transform: translate(-50%, -54%) scale(0.88); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        zIndex: 99999,
        pointerEvents: "none",
        animation: visible
          ? "kkToastIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards"
          : "kkToastOut 0.26s ease-in forwards",
      }}>
        {/* Backdrop blur overlay — subtle dimming behind the card */}
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          transform: "translate(-50%, -50%)",
          left: "50%",
          top: "50%",
          width: "100vw",
          height: "100vh",
          zIndex: -1,
        }} />

        {/* Card */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          background: "linear-gradient(160deg, #1c1c1c 0%, #141414 100%)",
          border: `1px solid ${icon.border}`,
          borderRadius: 20,
          padding: "32px 40px 28px",
          minWidth: 280,
          maxWidth: 360,
          boxShadow: `0 24px 64px rgba(0,0,0,0.7), ${icon.glow}`,
          textAlign: "center",
          transform: "translateX(-50%)",
        }}>
          {/* Icon */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: icon.bg,
            border: `2px solid ${icon.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 700,
            color: icon.color,
            boxShadow: icon.glow,
          }}>
            {icon.symbol}
          </div>

          {/* Title */}
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.3,
            letterSpacing: "-0.2px",
          }}>
            {title}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div style={{
              fontSize: 13,
              color: "#888",
              lineHeight: 1.5,
              marginTop: -6,
            }}>
              {subtitle}
            </div>
          )}

          {/* Progress bar */}
          <div style={{
            width: "100%",
            height: 3,
            borderRadius: 99,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            marginTop: 4,
          }}>
            <div style={{
              height: "100%",
              background: icon.color,
              borderRadius: 99,
              animation: `linear ${duration}ms`,
              animationName: "kkProgressShrink",
              animationFillMode: "forwards",
            }} />
          </div>
        </div>

        <style>{`
          @keyframes kkProgressShrink {
            from { width: 100%; }
            to   { width: 0%; }
          }
        `}</style>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

/** Simple hook for managing a single toast at a time */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: ToastType, title: string, subtitle?: string, duration = 2000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type, title, subtitle });
    timerRef.current = setTimeout(() => setToast(null), duration + 320);
  };

  const hideToast = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  };

  return { toast, showToast, hideToast };
}
