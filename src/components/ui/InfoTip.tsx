"use client";

import React, { createContext, useContext, useId, useState } from "react";
import Image from "next/image";


type InfoTipContextValue = {
  open: boolean;
  toggle: () => void;
  text: React.ReactNode;
  panelId: string;
};

const InfoTipContext = createContext<InfoTipContextValue | null>(null);

function useInfoTipContext(part: string): InfoTipContextValue {
  const ctx = useContext(InfoTipContext);
  if (!ctx) {
    throw new Error(`<${part}> must be rendered inside an <InfoTip>`);
  }
  return ctx;
}

export function InfoTip({
  text,
  defaultOpen = false,
  children,
}: {
  text: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <InfoTipContext.Provider
      value={{ open, toggle: () => setOpen((v) => !v), text, panelId }}
    >
      {children}
    </InfoTipContext.Provider>
  );
}

export function InfoTipButton({
  label = "More info",
  size = 14,
  style,
}: {
  label?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const { open, toggle, text, panelId } = useInfoTipContext("InfoTipButton");

  return (
      <Image 
         onClick={toggle}
      aria-label={label}
      aria-expanded={open}
      aria-controls={panelId}
        src="/info.png"
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "contain", display: "block",marginBottom:"3px", transition: "opacity 0.15s ease", cursor: "pointer",  ...style,}}
          title={typeof text === "string" ? text : undefined}
      />
  );
}

export function InfoTipPanel({ style }: { style?: React.CSSProperties }) {
  const { open, text, panelId } = useInfoTipContext("InfoTipPanel");
  if (!open) return null;

  return (
    <div
      id={panelId}
      role="note"
      style={{
        marginTop: 8,
        padding: "8px 10px",
        background: "rgba(91,230,178,0.08)",
        border: "1px solid rgba(91,230,178,0.2)",
        borderRadius: 8,
        fontSize: 12,
        textTransform: "none",
        color: "#a7f3d0",
        lineHeight: 1.5,
        ...style,
      }}
    >
      {text}
    </div>
  );
}
