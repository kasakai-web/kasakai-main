"use client";

import { Dispatch, SetStateAction, useEffect } from "react";

type ImageLightboxProps = {
  lightboxImage: string | null;
  alt?: string;
  setLightboxImage?: Dispatch<SetStateAction<string | null>>;
  setLightboxOpen?: Dispatch<SetStateAction<boolean>>;
};

export function ImageLightbox({lightboxImage,setLightboxImage,setLightboxOpen,alt = "Profile full size",}: ImageLightboxProps) {
  const closeLightbox = () => {
    if (setLightboxOpen) {
      setLightboxOpen(false);
    } else {
      setLightboxImage?.(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!lightboxImage) return null;

  return (
    <div 
      onClick={closeLightbox}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <img
        src={lightboxImage}
        alt={alt}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: 8,
          objectFit: "contain",
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      <button
        type="button"
        onClick={closeLightbox}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          background: "rgba(255,255,255,0.1)",
          border: "none",
          color: "#fff",
          fontSize: 28,
          lineHeight: 1,
          width: 44,
          height: 44,
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}