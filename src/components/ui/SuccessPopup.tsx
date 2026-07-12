"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SuccessPopupProps = {
  show: boolean;
  message: string;
  onClose: () => void;
};

export function SuccessPopup({ show, message, onClose }: SuccessPopupProps) {
  const [isBrowser, setIsBrowser] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setIsBrowser(true); }, []);

  useEffect(() => {
    if (show) {
      const fadeIn = setTimeout(() => setVisible(true), 10);
      const fadeOut = setTimeout(() => setVisible(false), 1700);
      const close   = setTimeout(onClose, 2000);
      return () => { clearTimeout(fadeIn); clearTimeout(fadeOut); clearTimeout(close); };
    } else {
      setVisible(false);
    }
  }, [show, onClose]);

  if (!isBrowser || !show) return null;

  const popup = (
    <>
      <style>{`
        @keyframes kkPopupIn {
          from { opacity: 0; transform: scale(0.86); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes kkPopupOut {
          from { opacity: 1; transform: scale(1);    }
          to   { opacity: 0; transform: scale(0.86); }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        pointerEvents: "none",
      }} />

      {/* Flex centring container */}
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(74,222,128,0.95), rgba(46,185,90,0.95))",
          color: "#fff",
          padding: "24px 32px",
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 28px rgba(74,222,128,0.3)",
          textAlign: "center",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(74,222,128,0.35)",
          width: "100%",
          maxWidth: 320,
          animation: visible ? "kkPopupIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards"
                             : "kkPopupOut 0.22s ease-in forwards",
        }}>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.4px",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}>
            {message}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(popup, document.body);
}
