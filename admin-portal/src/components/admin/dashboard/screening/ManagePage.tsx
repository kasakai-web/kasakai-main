"use client";
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";
import { ScrEvent, ScrShow, ScrShowTicket, scrStatusBadge, backBtnStyle, inp } from "./types";
import { scrApi, type ApiScrEvent, type ApiScrShow, type ApiScrTier, type CreateScrEventPayload } from "@/lib/screening-api";

// ── static data ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "TV Screenings", "Music", "Nightlife", "Social Mixers", "Performances",
  "Open Mics", "Comedy", "Sports", "Food & Drinks", "Esports",
  "Games & Quizzes", "Fitness Activities", "Kids", "Art Exhibitions",
  "Fests & Fairs", "Conferences & Talks", "Workshops", "Adventure",
];

const SUB_CATS: Record<string, string[]> = {
  "TV Screenings": ["Football Screenings", "Cricket Screenings", "F1 Screenings", "Movie Screenings", "Olympics Screenings", "Concert Screenings"],
  "Sports": ["Football", "Cricket", "Tennis", "Badminton", "Running", "Cycling"],
  "Music": ["Live Music", "DJ Night", "Open Mic", "Classical"],
  "Food & Drinks": ["Dining Experience", "Bar Night", "Wine Tasting", "Food Festival"],
};

const LANGUAGES = [
  "English", "Hindi", "Hinglish", "Bengali", "Telugu", "Tamil", "Tanglish",
  "Marathi", "Gujarati", "Kannada", "Punjabi", "Malayalam", "French", "Spanish", "German",
];

const AGE_OPTS = ["All ages", ...Array.from({ length: 50 }, (_, i) => String(i + 1))];

// ── shared helpers ────────────────────────────────────────────────────────────

function SideCard({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
      {accent && <div style={{ height: "3px", background: accent }} />}
      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{title}</p>
        {children}
      </div>
    </div>
  );
}

function SideRow({ label, sub, icon, accent, onClick }: { label: string; sub?: string; icon?: React.ReactNode; accent?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", width: "100%", padding: "9px 0", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", gap: "10px", textAlign: "left", transition: "opacity 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
      {icon && <div style={{ width: 28, height: 28, borderRadius: "7px", background: accent ? `${accent}15` : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "1px" }}>{sub}</div>}
      </div>
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--muted2)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}

function TicketRow({ ticket, isLast }: { ticket: ScrShowTicket; isLast: boolean }) {
  const fillPct   = Math.min(100, Math.round((ticket.sold / Math.max(1, ticket.qty)) * 100));
  const fillColor = fillPct >= 90 ? "#ef4444" : fillPct >= 60 ? "#f59e0b" : "#5be6b2";
  return (
    <div style={{ padding: "12px 0", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", gap: "12px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--white)" }}>{ticket.name}</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "13px", color: "#5be6b2", fontWeight: 700 }}>₹{Math.round(ticket.pricePaise / 100)}</span>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{ticket.sold}/{ticket.qty} sold</span>
        </div>
      </div>
      <div style={{ height: "4px", borderRadius: "999px", background: "var(--surface2)" }}>
        <div style={{ height: "100%", width: `${fillPct}%`, background: fillColor, borderRadius: "999px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ── Overview form helpers ─────────────────────────────────────────────────────

function OvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "14px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: "var(--white)" }}>{title}</p>
      <div style={{ height: "1px", background: "var(--border)", margin: "12px 0 16px" }} />
      {children}
    </div>
  );
}

function OvLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {children}{required && <span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function OvSelect({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ ...inp, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, appearance: "none" as const }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function GuideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>{label}<span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span></span>
      {children}
    </div>
  );
}

function MultiSelect({ options, value, onChange, max, disabled }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = (opt: string) => {
    if (disabled) return;
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else if (!max || value.length < max) onChange([...value, opt]);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => !disabled && setOpen(p => !p)}
        style={{ ...inp, minHeight: "42px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
        {value.length === 0
          ? <span style={{ color: "var(--muted)", fontSize: "13px" }}>Select…</span>
          : value.map(v => (
              <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", background: "rgba(91,230,178,0.1)", border: "1px solid rgba(91,230,178,0.3)", borderRadius: "999px", fontSize: "12px", color: "#5be6b2", fontWeight: 600 }}>
                {v}
                {!disabled && (
                  <button type="button" onClick={e => { e.stopPropagation(); toggle(v); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#5be6b2", padding: 0, lineHeight: 1, display: "flex" }}>
                    <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </span>
            ))}
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", maxHeight: "220px", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {options.map(opt => {
            const selected = value.includes(opt);
            const capped   = !selected && !!max && value.length >= max;
            return (
              <div key={opt} onClick={() => !capped && toggle(opt)}
                style={{ padding: "9px 14px", cursor: capped ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "10px", opacity: capped ? 0.4 : 1, background: selected ? "rgba(91,230,178,0.07)" : "none" }}
                onMouseEnter={(e) => { if (!selected && !capped) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = selected ? "rgba(91,230,178,0.07)" : "none"; }}>
                <div style={{ width: 16, height: 16, borderRadius: "4px", border: `1.5px solid ${selected ? "#5be6b2" : "var(--border)"}`, background: selected ? "#5be6b2" : "none", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selected && <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="3.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>}
                </div>
                <span style={{ fontSize: "13px", color: selected ? "#5be6b2" : "var(--white)", fontWeight: selected ? 600 : 400 }}>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Uploads the file immediately; calls onUpload with the returned server URL.
function ImageUploadBox({ label, ratio, maxSize, existingUrl, disabled, onUpload }: {
  label: string; ratio: string; maxSize: string; existingUrl?: string; disabled?: boolean;
  onUpload?: (url: string) => void;
}) {
  const [preview,    setPreview]    = useState(existingUrl ?? "");
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync if parent updates existingUrl (e.g. after loadEvent)
  useEffect(() => { if (existingUrl) setPreview(existingUrl); }, [existingUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadErr("");
    setPreview(URL.createObjectURL(f)); // immediate local preview
    if (onUpload) {
      setUploading(true);
      try {
        const url = await scrApi.uploadImage(f);
        setPreview(url);
        onUpload(url);
      } catch {
        setUploadErr("Upload failed — try again");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted2)" }}>{ratio}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--muted2)" }}>Max {maxSize}</p>
          {preview && (
            <img src={preview} alt="preview" style={{ height: "44px", width: "auto", borderRadius: "6px", border: "1px solid var(--border)", objectFit: "cover" }} />
          )}
          <button type="button" onClick={() => !disabled && !uploading && fileRef.current?.click()}
            style={{ padding: "6px 14px", background: "none", border: "1px solid var(--border)", borderRadius: "7px", color: (disabled || uploading) ? "var(--muted2)" : "var(--muted)", fontSize: "12px", fontWeight: 600, cursor: (disabled || uploading) ? "not-allowed" : "pointer" }}>
            {uploading ? "Uploading…" : preview ? "Replace" : "Upload"}
          </button>
        </div>
      </div>
      {uploadErr && <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#ef4444" }}>{uploadErr}</p>}
      {!preview && !disabled && (
        <div onClick={() => fileRef.current?.click()}
          style={{ border: "1.5px dashed var(--border)", borderRadius: "10px", padding: "20px", textAlign: "center", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(91,230,178,0.4)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" style={{ display: "block", margin: "0 auto 6px" }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Click to upload</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

// ── Add Show Drawer ────────────────────────────────────────────────────────────

function AddShowDrawer({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (show: ScrShow, raw: { date: string; startTime: string; endTime: string }) => void;
}) {
  const [date, setDate]       = useState("");
  const [startTime, setStart] = useState("");
  const [endTime, setEnd]     = useState("");
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const firstRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTimeout(() => firstRef.current?.focus(), 80); }
    else { setDate(""); setStart(""); setEnd(""); setErrors({}); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const fmt = useCallback((t: string) => { const [h,m] = t.split(":").map(Number); return `${((h%12)||12).toString().padStart(2,"0")}:${m.toString().padStart(2,"0")} ${h>=12?"PM":"AM"}`; }, []);

  const handleSave = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = "Required";
    if (!startTime) errs.startTime = "Required";
    if (!endTime) errs.endTime = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const d = new Date(date + "T12:00:00");
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const mons = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dateLabel = `${days[d.getDay()]}, ${d.getDate()} ${mons[d.getMonth()]}`;

    onSave(
      {
        id: `show-${Date.now()}`,
        dateLabel,
        timeLabel: `${fmt(startTime)} to ${fmt(endTime)}`,
        status: "active", expanded: false,
        tickets: [],
      },
      { date: new Date(date + "T12:00:00").toISOString(), startTime: fmt(startTime), endTime: fmt(endTime) }
    );
    onClose();
  }, [date, startTime, endTime, onSave, onClose, fmt]);

  const fe = (k: string): React.CSSProperties => ({ ...inp, marginTop: "6px", borderColor: errors[k] ? "rgba(239,68,68,0.6)" : undefined });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.55)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: "min(480px,100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", boxShadow: "-6px 0 40px rgba(0,0,0,0.45)", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.16em", textTransform: "uppercase" }}>Shows</p>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--white)" }}>Add New Show</h3>
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--bg)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>
          <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
            Adding a new show date makes this event available to book again. Ticket tiers are shared across all shows and can be edited in the Tickets section.
          </p>
          <div style={{ marginBottom: "18px" }}>
            <OvLabel required>Show Date</OvLabel>
            <input ref={firstRef} type="date" value={date} onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: "" })); }} style={fe("date")} />
            {errors.date && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{errors.date}</p>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <OvLabel required>Start Time</OvLabel>
              <input type="time" value={startTime} onChange={e => { setStart(e.target.value); setErrors(p => ({ ...p, startTime: "" })); }} style={fe("startTime")} />
              {errors.startTime && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{errors.startTime}</p>}
            </div>
            <div>
              <OvLabel required>End Time</OvLabel>
              <input type="time" value={endTime} onChange={e => { setEnd(e.target.value); setErrors(p => ({ ...p, endTime: "" })); }} style={fe("endTime")} />
              {errors.endTime && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{errors.endTime}</p>}
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: "42px", background: "none", border: "1px solid var(--border)", borderRadius: "9px", color: "var(--muted)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={handleSave} style={{ flex: 2, height: "42px", background: "rgba(91,230,178,0.12)", border: "1.5px solid rgba(91,230,178,0.45)", borderRadius: "9px", color: "#5be6b2", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>Save Show</button>
        </div>
      </div>
    </>
  );
}

// ── Add Ticket Drawer ─────────────────────────────────────────────────────────

const SALES_END_UNITS     = ["Minutes", "Hours", "Days"];
const SALES_END_STRATEGIES = ["Before Show Start", "Before Show End"];
const GST_OPTIONS          = ["None / Exempt", "CGST+SGST 5%", "CGST+SGST 12%", "CGST+SGST 18%", "IGST 18%"];

function ScopeOption({ selected, onClick, title, sub, comingSoon }: {
  selected: boolean; onClick: () => void; title: string; sub: string; comingSoon?: boolean;
}) {
  return (
    <button type="button" onClick={comingSoon ? undefined : onClick}
      style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", width: "100%", background: selected ? "rgba(91,230,178,0.06)" : "var(--bg)", border: `1.5px solid ${selected ? "rgba(91,230,178,0.35)" : "var(--border)"}`, borderRadius: "11px", cursor: comingSoon ? "not-allowed" : "pointer", textAlign: "left", opacity: comingSoon ? 0.5 : 1, transition: "all 0.15s" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `2px solid ${selected ? "#5be6b2" : "var(--border)"}`, background: selected ? "rgba(91,230,178,0.15)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5be6b2" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--white)" }}>{title}</p>
          {comingSoon && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", padding: "2px 7px", background: "var(--surface2)", borderRadius: "999px", letterSpacing: "0.06em" }}>SOON</span>
          )}
        </div>
        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>{sub}</p>
      </div>
    </button>
  );
}

function AddTicketDrawer({ open, onClose, onSave, shows }: {
  open: boolean; onClose: () => void;
  onSave: (tier: { name: string; pricePaise: number; capacity: number; description: string }) => Promise<void>;
  shows: ScrShow[];
}) {
  const [step, setStep]                     = useState<1 | 2>(1);
  const [name, setName]                     = useState("Regular Ticket");
  const [description, setDescription]       = useState("");
  const [priceRs, setPriceRs]               = useState("");
  const [quantity, setQuantity]             = useState("");
  const [salesEndNum, setSalesEndNum]       = useState("0");
  const [salesEndUnit, setSalesEndUnit]     = useState("Hours");
  const [salesEndStrat, setSalesEndStrat]   = useState("Before Show Start");
  const [gst, setGst]                       = useState("None / Exempt");
  const [ticketDisabled, setTicketDisabled] = useState(false);
  const [showScope, setShowScope]           = useState<"all" | "single" | "custom">("all");
  const [selectedShowId, setSelectedShowId] = useState("");
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [saving, setSaving]                 = useState(false);
  const nameRef                             = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setTimeout(() => nameRef.current?.focus(), 80); }
    else {
      setStep(1); setName("Regular Ticket"); setDescription(""); setPriceRs(""); setQuantity("");
      setSalesEndNum("0"); setSalesEndUnit("Hours"); setSalesEndStrat("Before Show Start");
      setGst("None / Exempt"); setTicketDisabled(false);
      setShowScope("all"); setSelectedShowId(""); setErrors({}); setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { if (step === 2) setStep(1); else onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, step, onClose]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Required";
    const p = Number(priceRs);
    if (priceRs === "" || isNaN(p) || p < 0) errs.price = "Enter a valid price (₹)";
    const q = Number(quantity);
    if (!quantity || isNaN(q) || q < 1) errs.quantity = "Minimum 1";
    return errs;
  }, [name, priceRs, quantity]);

  const handleNext = useCallback(() => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  }, [validate]);

  const handleSave = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); setStep(1); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), pricePaise: Math.round(Number(priceRs) * 100), capacity: Number(quantity), description: description.trim() });
      onClose();
    } catch { setSaving(false); }
  }, [validate, name, priceRs, quantity, description, onSave, onClose]);

  const fe = (k: string): React.CSSProperties => ({ ...inp, marginTop: "6px", borderColor: errors[k] ? "rgba(239,68,68,0.6)" : undefined });

  const activeShows = shows.filter(s => s.status === "active");

  return (
    <>
      <div onClick={() => { if (!saving) onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.55)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: "min(520px,100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", boxShadow: "-6px 0 40px rgba(0,0,0,0.45)", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} style={{ width: 28, height: 28, borderRadius: "7px", background: "var(--bg)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Step {step} of 2 · {step === 1 ? "Ticket Details" : "Show Assignment"}
              </p>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--white)" }}>Add Ticket</h3>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <div style={{ width: step === 1 ? 18 : 6, height: 6, borderRadius: "999px", background: "#5be6b2", transition: "width 0.2s" }} />
              <div style={{ width: step === 2 ? 18 : 6, height: 6, borderRadius: "999px", background: step === 2 ? "#5be6b2" : "var(--border)", transition: "all 0.2s" }} />
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--bg)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>
          {step === 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Name */}
              <div>
                <OvLabel required>Name</OvLabel>
                <input ref={nameRef} value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
                  placeholder="e.g. Regular Ticket" style={fe("name")} />
                {errors.name && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <OvLabel>Description</OvLabel>
                <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.55 }}>
                  Inclusions, joining details i.e. anything that will help the customer to make this purchase can be added here. This will show up on the e-ticket, website and apps.
                </p>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="A short description of this ticket" rows={3}
                  style={{ ...inp, marginTop: 0, resize: "vertical", minHeight: "76px", fontFamily: "inherit" }} />
              </div>

              {/* Price */}
              <div>
                <OvLabel required>Ticket price (inc of taxes) (₹)</OvLabel>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--muted)", fontWeight: 700, pointerEvents: "none" }}>₹</span>
                  <input type="number" min="0" step="1" value={priceRs}
                    onChange={e => { setPriceRs(e.target.value); setErrors(p => ({ ...p, price: "" })); }}
                    placeholder="100" style={{ ...fe("price"), paddingLeft: "28px" }} />
                </div>
                {errors.price && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{errors.price}</p>}
              </div>

              {/* Quantity */}
              <div>
                <OvLabel required>Total Quantity</OvLabel>
                <input type="number" min="1" value={quantity}
                  onChange={e => { setQuantity(e.target.value); setErrors(p => ({ ...p, quantity: "" })); }}
                  placeholder="100" style={fe("quantity")} />
                {errors.quantity && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#ef4444" }}>{errors.quantity}</p>}
              </div>

              {/* Ticket Sales End */}
              <div>
                <OvLabel required>Ticket Sales End</OvLabel>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <input type="number" min="0" value={salesEndNum} onChange={e => setSalesEndNum(e.target.value)}
                    style={{ ...inp, width: "80px", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><OvSelect value={salesEndUnit} onChange={setSalesEndUnit} options={SALES_END_UNITS} /></div>
                  <div style={{ flex: 2 }}><OvSelect value={salesEndStrat} onChange={setSalesEndStrat} options={SALES_END_STRATEGIES} /></div>
                </div>
              </div>

              {/* GST */}
              <div>
                <OvLabel>Applicable GST</OvLabel>
                <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--muted)" }}>Ticket price (Inclusive of tax)</p>
                <OvSelect value={gst} onChange={setGst} options={GST_OPTIONS} />
              </div>

              {/* Disable toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: "var(--white)" }}>Disable Ticket</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>Hidden from customers until enabled</p>
                </div>
                <button type="button" onClick={() => setTicketDisabled(p => !p)}
                  style={{ width: 40, height: 22, borderRadius: "999px", background: ticketDisabled ? "#5be6b2" : "var(--surface2)", border: `1.5px solid ${ticketDisabled ? "#5be6b2" : "var(--border)"}`, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s", padding: 0 }}>
                  <div style={{ position: "absolute", top: "2px", left: ticketDisabled ? "19px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: ticketDisabled ? "#000" : "var(--muted)", transition: "left 0.2s" }} />
                </button>
              </div>

              {/* Note */}
              <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 800, color: "#f59e0b", letterSpacing: "0.12em", textTransform: "uppercase" }}>Note</p>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  You cannot change the price/GST after creating this ticket since the event is already published.
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>
                  If you want to change the price/GST of this ticket in future, you will have to disable this ticket and create a new one.
                </p>
              </div>
            </div>
          ) : (
            /* Step 2 — Show scope */
            <div>
              <p style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 800, color: "var(--white)" }}>
                Which shows will include this ticket?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <ScopeOption selected={showScope === "all"} onClick={() => setShowScope("all")}
                  title="All shows" sub="Add ticket across all dates and time slots" />
                <ScopeOption selected={showScope === "single"} onClick={() => setShowScope("single")}
                  title="Single show" sub="Choose a date and time slot to add ticket" />
                {showScope === "single" && (
                  <div style={{ padding: "14px", background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    {activeShows.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>No active shows available</p>
                    ) : activeShows.map(s => (
                      <button key={s.id} type="button" onClick={() => setSelectedShowId(s.id)}
                        style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "10px 12px", marginBottom: "6px", background: selectedShowId === s.id ? "rgba(91,230,178,0.08)" : "var(--surface)", border: `1.5px solid ${selectedShowId === s.id ? "rgba(91,230,178,0.35)" : "var(--border)"}`, borderRadius: "9px", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedShowId === s.id ? "#5be6b2" : "var(--muted)", flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: 700, color: "var(--white)" }}>{s.dateLabel}</p>
                          <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>{s.timeLabel}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <ScopeOption selected={false} onClick={() => {}}
                  title="Custom range" sub="Choose specific dates, days or time slots to add tickets" comingSoon />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", flexShrink: 0 }}>
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose}
                style={{ flex: 1, height: "42px", background: "none", border: "1px solid var(--border)", borderRadius: "9px", color: "var(--muted)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={handleNext}
                style={{ flex: 2, height: "42px", background: "rgba(91,230,178,0.12)", border: "1.5px solid rgba(91,230,178,0.45)", borderRadius: "9px", color: "#5be6b2", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                Next
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep(1)}
                style={{ flex: 1, height: "42px", background: "none", border: "1px solid var(--border)", borderRadius: "9px", color: "var(--muted)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                Back
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{ flex: 2, height: "42px", background: saving ? "rgba(91,230,178,0.06)" : "rgba(91,230,178,0.12)", border: "1.5px solid rgba(91,230,178,0.45)", borderRadius: "9px", color: "#5be6b2", fontSize: "13px", fontWeight: 800, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Add Ticket"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Poc = { id: string; name: string; email: string; phone: string };

export function ScrManageEventPage({ ev, onBack }: { ev: ScrEvent; onBack: () => void }) {
  const router = useRouter();

  // Shows tab state
  const [tab, setTab]               = useState<"shows" | "overview">("shows");
  const [shows, setShows]                   = useState<ScrShow[]>([]);
  const [fullShows, setFullShows]           = useState<ApiScrShow[]>([]);
  const [fullTiers, setFullTiers]           = useState<ApiScrTier[]>([]);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);

  // Overview tab state — all initialised empty; useEffect populates from API
  const [eventName, setEventName]         = useState(ev.title);
  const [description, setDescription]     = useState("");
  const [categories, setCategories]       = useState<string[]>([]);
  const [subCategories, setSubCats]       = useState<string[]>([]);
  const [venueLocation, setVenueLoc]      = useState("");
  const [venueCity, setVenueCity]         = useState("");
  const [ownRestaurant, setOwnRest]       = useState<"yes" | "no">("no");
  const [instagramLink, setIgLink]        = useState("");
  const [language, setLanguage]           = useState<string[]>([]);
  const [minAge, setMinAge]               = useState("All ages");
  const [ticketAge, setTicketAge]         = useState("All ages");
  const [venueType, setVenueType]         = useState("Indoor");
  const [seating, setSeating]             = useState("Seated & Standing");
  const [kidFriendly, setKidFriendly]     = useState("No");
  const [petFriendly, setPetFriendly]     = useState("No");
  const [gatesOpen, setGatesOpen]         = useState(false);
  const [gatesOpenMinutes, setGatesOpenMinutes] = useState(30);
  const [imgUrl, setImgUrl]               = useState(ev.image || "");
  const [posterUrl, setPosterUrl]         = useState("");
  const [pocs, setPocs]                   = useState<Poc[]>(() =>
    ev.contacts.length > 0
      ? ev.contacts.map((c, i) => ({ id: `poc-${i}`, name: c.name, email: c.email, phone: c.phone }))
      : [{ id: "poc-0", name: "", email: "", phone: "" }]
  );
  const [sendCopies, setSendCopies]       = useState(false);
  const [extraSections, setExtraSections] = useState<string[]>([]);
  const [extraContent, setExtraContent]   = useState<Record<string, string>>({});
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const badge      = scrStatusBadge(ev.status);
  const allExpired = shows.every(s => s.status === "expired");
  const isLocked   = ev.status === "published";

  // Load full event data to populate all form fields
  useEffect(() => {
    setLoadingOverview(true);
    scrApi.getEvent(ev.id)
      .then((full: ApiScrEvent) => {
        setEventName(full.title || ev.title);
        setDescription(full.description || "");
        setCategories(full.categories || []);
        setSubCats(full.subCategories || []);
        setLanguage(full.languages || []);
        setOwnRest(full.ownRestaurant ? "yes" : "no");
        setIgLink(full.venueInstagram || "");
        setMinAge(full.minAgeEntry > 0 ? String(full.minAgeEntry) : "All ages");
        setTicketAge(full.minAgePaid > 0 ? String(full.minAgePaid) : "All ages");
        setVenueType(full.isIndoor === false ? "Outdoor" : "Indoor");
        setSeating(full.isSeated === true ? "Seated" : full.isSeated === false ? "Standing" : "Seated & Standing");
        setKidFriendly(full.kidFriendly === true ? "Yes" : "No");
        setPetFriendly(full.petFriendly === true ? "Yes" : "No");
        const gateMin = full.gatesOpenBefore || 0;
        setGatesOpen(gateMin > 0);
        setGatesOpenMinutes(gateMin > 0 ? gateMin : 30);
        setImgUrl(full.image || "");
        setPosterUrl(full.poster || "");
        setVenueLoc(full.venueName || "");
        setVenueCity(full.location || "");
        if (full.contacts?.length) {
          setPocs(full.contacts.map((c, i) => ({ id: `poc-${i}`, name: c.name, email: c.email, phone: c.phone })));
        }
        // Populate extra sections from stored data
        const storedSections = (full.extraSections || []).filter(s => s.content);
        if (storedSections.length) {
          setExtraSections(storedSections.map(s => s.type));
          const content: Record<string, string> = {};
          storedSections.forEach(s => { content[s.type] = s.content; });
          setExtraContent(content);
        }
        // Transform API shows to display format
        const displayShows: ScrShow[] = (full.shows || []).map(s => {
          const d = new Date(s.date);
          const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
          const mons = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const dateLabel = `${days[d.getDay()]}, ${d.getDate()} ${mons[d.getMonth()]}`;
          const timeLabel = s.endTime ? `${s.startTime} to ${s.endTime}` : s.startTime;
          const isExpired = new Date(s.date) < new Date();
          return {
            id: s._id,
            dateLabel,
            timeLabel,
            status: (isExpired ? "expired" : "active") as "active" | "expired",
            expanded: false,
            tickets: (full.tiers || []).map(t => ({
              id: String(t._id), name: t.name, qty: t.capacity, sold: t.sold, pricePaise: t.pricePaise,
            })),
          };
        });
        setShows(displayShows);
        setFullShows(full.shows || []);
        setFullTiers(full.tiers || []);
      })
      .catch(err => console.error("[ManagePage] Failed to load event:", err))
      .finally(() => setLoadingOverview(false));
  }, [ev.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleShow        = useCallback((id: string) => setShows(p => p.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s)), []);
  const openDrawer        = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer       = useCallback(() => setDrawerOpen(false), []);
  const openTicketDrawer  = useCallback(() => setTicketDrawerOpen(true), []);
  const closeTicketDrawer = useCallback(() => setTicketDrawerOpen(false), []);

  const handleSaveTicket = useCallback(async (tier: { name: string; pricePaise: number; capacity: number; description: string }) => {
    const updatedTiers = [
      ...fullTiers.map(t => ({ name: t.name, pricePaise: t.pricePaise, capacity: t.capacity, description: t.description })),
      tier,
    ];
    await scrApi.updateEvent(ev.id, { tiers: updatedTiers });
    const newTicket: ScrShowTicket = { id: `tier-${Date.now()}`, name: tier.name, qty: tier.capacity, sold: 0, pricePaise: tier.pricePaise };
    setShows(p => p.map(s => ({ ...s, tickets: [...s.tickets, newTicket] })));
    setFullTiers(p => [...p, { _id: `tier-${Date.now()}`, ...tier, sold: 0 }]);
  }, [ev.id, fullTiers]);

  const handleSaveShow = useCallback(async (newShow: ScrShow, raw: { date: string; startTime: string; endTime: string }) => {
    setShows(p => [newShow, ...p]);
    const newRaw = { date: raw.date, startTime: raw.startTime, endTime: raw.endTime };
    const updatedShows = [...fullShows, newRaw] as CreateScrEventPayload["shows"];
    try {
      await scrApi.updateEvent(ev.id, { shows: updatedShows });
      setFullShows(p => [...p, { _id: `local-${Date.now()}`, ...newRaw, status: "active" as const }]);
    } catch (err) {
      console.error("[ManagePage] Failed to save show:", err);
      // Revert if backend save failed
      setShows(p => p.filter(s => s.id !== newShow.id));
    }
  }, [ev.id, fullShows]);

  const availableSubCats = useMemo(() => {
    const all = new Set<string>();
    categories.forEach(c => { (SUB_CATS[c] ?? []).forEach(s => all.add(s)); });
    return Array.from(all);
  }, [categories]);

  const addPoc = useCallback(() => setPocs(p => [...p, { id: `poc-${Date.now()}`, name: "", email: "", phone: "" }]), []);
  const updatePoc = useCallback((id: string, field: keyof Poc, val: string) =>
    setPocs(p => p.map(poc => poc.id === id ? { ...poc, [field]: val } : poc)), []);
  const removePoc = useCallback((id: string) => setPocs(p => p.filter(poc => poc.id !== id)), []);

  const toggleExtra = useCallback((sec: string) =>
    setExtraSections(p => p.includes(sec) ? p.filter(s => s !== sec) : [...p, sec]), []);

  const handleSaveOverview = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const minAgeNum    = minAge === "All ages"    ? 0 : Number(minAge);
      const ticketAgeNum = ticketAge === "All ages" ? 0 : Number(ticketAge);
      const isIndoorVal  = venueType === "Indoor" ? true : venueType === "Outdoor" ? false : null;
      const isSeatedVal  = seating === "Seated" ? true : seating === "Standing" ? false : null;

      await scrApi.updateEvent(ev.id, {
        title:           eventName.trim() || ev.title,
        description,
        categories,
        subCategories,
        languages:       language,
        venueName:       venueLocation,
        location:        venueCity,
        ownRestaurant:   ownRestaurant === "yes",
        venueInstagram:  instagramLink,
        isIndoor:        isIndoorVal,
        isSeated:        isSeatedVal,
        kidFriendly:     kidFriendly === "Yes",
        petFriendly:     petFriendly === "Yes",
        minAgeEntry:     minAgeNum,
        minAgePaid:      ticketAgeNum,
        gatesOpenBefore: gatesOpen ? gatesOpenMinutes : 0,
        contacts:        pocs.map(p => ({ name: p.name, email: p.email, phone: p.phone })),
        ...(imgUrl    ? { image:  imgUrl }    : {}),
        ...(posterUrl ? { poster: posterUrl } : {}),
        extraSections: extraSections.map(sec => ({
          type:    sec,
          content: extraContent[sec] || "",
        })),
      });
      setSaveMsg("Saved");
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, [ev.id, ev.title, eventName, description, categories, subCategories, language, venueLocation, venueCity, ownRestaurant, instagramLink, venueType, seating, kidFriendly, petFriendly, minAge, ticketAge, gatesOpen, gatesOpenMinutes, pocs, imgUrl, posterUrl, extraSections, extraContent]);

  return (
    <>
      <div style={{ paddingBottom: 48 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={onBack} style={backBtnStyle}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.15em", textTransform: "uppercase" }}>Streaming Events</p>
            <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800, color: "var(--white)" }}>Manage Event</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</p>
          </div>
          <span style={{ flexShrink: 0, marginTop: "4px", padding: "5px 14px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>{badge.label}</span>
        </div>

        <div style={{ height: "1px", background: "var(--border)", margin: "16px 0 24px" }} />

        <div className={styles.scrManageLayout}>
          {/* ── LEFT ── */}
          <div>
            {/* Tab bar */}
            <div className={styles.scrManageTabBar}>
              {([
                { key: "shows",    label: "Shows & Tickets", icon: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></> },
                { key: "overview", label: "Overview",         icon: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></> },
              ] as const).map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`${styles.scrManageTab} ${tab === t.key ? styles.scrManageTabActive : ""}`}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: "6px", verticalAlign: "middle" }}>{t.icon}</svg>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Shows tab ── */}
            {tab === "shows" && (
              <div>
                {loadingOverview ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                    <svg className="animate-spin" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="#5be6b2" strokeWidth="3" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="#5be6b2" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </div>
                ) : (
                  <>
                    {shows.length > 0 && allExpired && (
                      <div style={{ background: "rgba(17,17,17,0.9)", border: "1.5px dashed rgba(255,255,255,0.08)", borderRadius: "14px", padding: "36px 24px", marginBottom: "24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "10px" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
                          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                        </div>
                        <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--white)" }}>All shows are expired</p>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>Add a new show date below</p>
                        <button type="button" onClick={openDrawer}
                          style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 24px", background: "#5be6b2", border: "none", borderRadius: "10px", color: "#000", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          Add new show
                        </button>
                      </div>
                    )}
                    {shows.length === 0 && (
                      <div style={{ textAlign: "center", padding: "48px 24px", border: "1.5px dashed var(--border)", borderRadius: "14px", marginBottom: "20px" }}>
                        <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--muted)" }}>No shows scheduled</p>
                        <button type="button" onClick={openTicketDrawer}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", background: "rgba(91,230,178,0.1)", border: "1px solid rgba(91,230,178,0.3)", borderRadius: "8px", color: "#5be6b2", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          Add Ticket
                        </button>
                      </div>
                    )}
                    {shows.length > 0 && !allExpired && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--white)" }}>
                          {shows.filter(s => s.status === "active").length} active · {shows.filter(s => s.status === "expired").length} expired
                        </p>
                        <button type="button" onClick={openTicketDrawer}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "rgba(91,230,178,0.1)", border: "1px solid rgba(91,230,178,0.3)", borderRadius: "8px", color: "#5be6b2", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          Add Ticket
                        </button>
                      </div>
                    )}
                    {shows.map(show => (
                      <div key={show.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "10px", overflow: "hidden" }}>
                        <button type="button" onClick={() => toggleShow(show.id)}
                          style={{ display: "flex", alignItems: "center", width: "100%", padding: "15px 18px", background: "none", border: "none", cursor: "pointer", gap: "12px" }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: show.status === "active" ? "#22c55e" : "#444", flexShrink: 0 }} />
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "var(--white)" }}>{show.dateLabel}</p>
                            <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>{show.timeLabel}</p>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: show.status === "active" ? "rgba(34,197,94,0.1)" : "var(--surface2)", color: show.status === "active" ? "#22c55e" : "var(--muted)", border: `1px solid ${show.status === "active" ? "rgba(34,197,94,0.25)" : "var(--border)"}` }}>
                            {show.status === "active" ? "Active" : "Expired"}
                          </span>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s", transform: show.expanded ? "rotate(180deg)" : "none", flexShrink: 0 }}><path d="M7.5 9.75l4.5 4.5 4.5-4.5"/></svg>
                        </button>
                        {show.expanded && (
                          <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}>
                            <p style={{ margin: "14px 0 10px", fontSize: "11px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Ticket Tiers</p>
                            {show.tickets.map((t, i) => <TicketRow key={t.id} ticket={t} isLast={i === show.tickets.length - 1} />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Overview tab ── */}
            {tab === "overview" && (
              <div>
                {loadingOverview ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
                    <svg className="animate-spin" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="#5be6b2" strokeWidth="3" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="#5be6b2" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </div>
                ) : (
                  <>
                    {isLocked && (
                      <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "11px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 600 }}>This event is published. Some fields may be restricted. Contact <strong>events.moderation@kasakai.in</strong> for structural changes.</span>
                      </div>
                    )}

                    {/* Event Name + Description */}
                    <OvSection title="Event Info">
                      <div style={{ marginBottom: "14px" }}>
                        <OvLabel>Event Name</OvLabel>
                        <input value={eventName} onChange={e => setEventName(e.target.value)} disabled={isLocked}
                          style={{ ...inp, opacity: isLocked ? 0.55 : 1, cursor: isLocked ? "not-allowed" : "text" }} />
                      </div>
                      <div>
                        <OvLabel required>Event Description</OvLabel>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={7} disabled={isLocked}
                          style={{ ...inp, resize: "vertical", lineHeight: 1.7, opacity: isLocked ? 0.55 : 1, cursor: isLocked ? "not-allowed" : "text" } as React.CSSProperties} />
                        <p style={{ margin: "5px 0 0", fontSize: "11px", color: "var(--muted2)" }}>{description.length} characters</p>
                      </div>
                    </OvSection>

                    {/* Event Type */}
                    <OvSection title="Event Type">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <OvLabel required>Category</OvLabel>
                            <span style={{ fontSize: "11px", color: "var(--muted2)" }}>Upto 2</span>
                          </div>
                          <MultiSelect options={CATEGORIES} value={categories} onChange={setCategories} max={2} disabled={isLocked} />
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <OvLabel>Sub-Category</OvLabel>
                            <span style={{ fontSize: "11px", color: "var(--muted2)" }}>Upto 2</span>
                          </div>
                          <MultiSelect options={availableSubCats.length ? availableSubCats : ["Select a category first"]} value={subCategories} onChange={setSubCats} max={2} disabled={isLocked || availableSubCats.length === 0} />
                        </div>
                      </div>
                    </OvSection>

                    {/* Venue */}
                    <OvSection title="Set Up Venue">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                        <div>
                          <OvLabel required>Venue Name</OvLabel>
                          <input value={venueLocation} onChange={e => setVenueLoc(e.target.value)} disabled={isLocked}
                            style={{ ...inp, opacity: isLocked ? 0.55 : 1 }} />
                        </div>
                        <div>
                          <OvLabel required>City / Area</OvLabel>
                          <input value={venueCity} onChange={e => setVenueCity(e.target.value)} disabled={isLocked}
                            style={{ ...inp, opacity: isLocked ? 0.55 : 1 }} placeholder="e.g. Koramangala, Bangalore" />
                        </div>
                      </div>
                      <div style={{ marginBottom: "14px" }}>
                        <OvLabel required>Hosting at your restaurant?</OvLabel>
                        <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                          {(["yes","no"] as const).map(v => (
                            <label key={v} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.55 : 1 }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${ownRestaurant === v ? "#5be6b2" : "var(--border)"}`, background: ownRestaurant === v ? "#5be6b2" : "none", flexShrink: 0, cursor: "pointer" }}
                                onClick={() => !isLocked && setOwnRest(v)} />
                              <span style={{ fontSize: "13px", color: "var(--muted)", textTransform: "capitalize" }}>{v}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <OvLabel>Instagram Link</OvLabel>
                        <input type="url" placeholder="https://instagram.com/yourvenue" value={instagramLink} onChange={e => setIgLink(e.target.value)} disabled={isLocked}
                          style={{ ...inp, opacity: isLocked ? 0.55 : 1 }} />
                      </div>
                    </OvSection>

                    {/* Event Card Images */}
                    <OvSection title="Event Card Images">
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <ImageUploadBox
                          label="Landscape for Website" ratio="16:9 · 1600×900px" maxSize="1.5MB"
                          existingUrl={imgUrl} disabled={isLocked}
                          onUpload={url => setImgUrl(url)}
                        />
                        <ImageUploadBox
                          label="Portrait for App" ratio="3:4 · 900×1200px" maxSize="1.5MB"
                          existingUrl={posterUrl} disabled={isLocked}
                          onUpload={url => setPosterUrl(url)}
                        />
                      </div>
                    </OvSection>

                    {/* Event Guide */}
                    <OvSection title="Event Guide">
                      <div style={{ marginBottom: "12px" }}>
                        <GuideRow label="Language(s)">
                          <MultiSelect options={LANGUAGES} value={language} onChange={setLanguage} disabled={isLocked} />
                        </GuideRow>
                        <GuideRow label="Minimum age for entry">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <OvSelect value={minAge} onChange={setMinAge} options={AGE_OPTS} disabled={isLocked} />
                            <span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>&amp; above</span>
                          </div>
                        </GuideRow>
                        <GuideRow label="Age for paid entry">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <OvSelect value={ticketAge} onChange={setTicketAge} options={AGE_OPTS} disabled={isLocked} />
                            <span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>&amp; above</span>
                          </div>
                        </GuideRow>
                        <GuideRow label="Indoor or Outdoor?">
                          <OvSelect value={venueType} onChange={setVenueType} options={["Indoor","Outdoor"]} disabled={isLocked} />
                        </GuideRow>
                        <GuideRow label="Seated or Standing?">
                          <OvSelect value={seating} onChange={setSeating} options={["Seated","Standing","Seated & Standing"]} disabled={isLocked} />
                        </GuideRow>
                        <GuideRow label="Kid-friendly?">
                          <OvSelect value={kidFriendly} onChange={setKidFriendly} options={["Yes","No"]} disabled={isLocked} />
                        </GuideRow>
                        <GuideRow label="Pet-friendly?">
                          <OvSelect value={petFriendly} onChange={setPetFriendly} options={["Yes","No"]} disabled={isLocked} />
                        </GuideRow>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center", padding: "12px 0" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>Gates open before start?<span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span></span>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button type="button" onClick={() => !isLocked && setGatesOpen(p => !p)}
                              style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: isLocked ? "not-allowed" : "pointer", padding: 0, opacity: isLocked ? 0.5 : 1 }}>
                              <div style={{ width: 40, height: 22, borderRadius: "999px", background: gatesOpen ? "#5be6b2" : "var(--surface2)", border: `1.5px solid ${gatesOpen ? "#5be6b2" : "var(--border)"}`, position: "relative", transition: "background 0.2s" }}>
                                <div style={{ position: "absolute", top: "2px", left: gatesOpen ? "20px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: gatesOpen ? "#000" : "var(--muted)", transition: "left 0.2s" }} />
                              </div>
                              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>{gatesOpen ? "Yes" : "No"}</span>
                            </button>
                            {gatesOpen && (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input type="number" min="5" max="120" value={gatesOpenMinutes}
                                  onChange={e => setGatesOpenMinutes(Number(e.target.value))}
                                  disabled={isLocked}
                                  style={{ ...inp, width: "64px", padding: "4px 8px", fontSize: "13px" }} />
                                <span style={{ fontSize: "12px", color: "var(--muted)" }}>min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </OvSection>

                    {/* Add More Sections */}
                    <div style={{ background: "rgba(91,230,178,0.03)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px", marginBottom: "14px" }}>
                      <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 800, color: "var(--white)" }}>Add More Sections</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {["Event Instructions","Youtube Video","Prohibited Items","FAQs"].map(sec => {
                          const active = extraSections.includes(sec);
                          return (
                            <button key={sec} type="button" onClick={() => toggleExtra(sec)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "7px 14px", background: active ? "rgba(91,230,178,0.1)" : "var(--surface)", border: `1px solid ${active ? "rgba(91,230,178,0.35)" : "var(--border)"}`, borderRadius: "8px", color: active ? "#5be6b2" : "var(--muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                              {active
                                ? <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                                : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                              }
                              {sec}
                            </button>
                          );
                        })}
                      </div>
                      {extraSections.map(sec => (
                        <div key={sec} style={{ marginTop: "14px" }}>
                          <OvLabel>{sec}</OvLabel>
                          <textarea rows={3} placeholder={`Enter ${sec.toLowerCase()}…`} value={extraContent[sec] || ""}
                            onChange={e => setExtraContent(p => ({ ...p, [sec]: e.target.value }))}
                            style={{ ...inp, resize: "vertical" } as React.CSSProperties} />
                        </div>
                      ))}
                    </div>

                    {/* Point of Contact */}
                    <OvSection title="Point of Contact">
                      <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--muted)" }}>Add POCs with whom event feedback will be shared</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
                        {pocs.map((poc) => (
                          <div key={poc.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "10px", alignItems: "center" }}>
                            <input value={poc.name}  onChange={e => updatePoc(poc.id, "name",  e.target.value)} placeholder="Name"  style={inp} />
                            <input value={poc.email} onChange={e => updatePoc(poc.id, "email", e.target.value)} placeholder="Email" type="email" style={inp} />
                            <input value={poc.phone} onChange={e => updatePoc(poc.id, "phone", e.target.value)} placeholder="Phone" type="tel"   style={inp} />
                            {pocs.length > 1 && (
                              <button type="button" onClick={() => removePoc(poc.id)}
                                style={{ width: 32, height: 32, borderRadius: "7px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={addPoc}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", background: "rgba(91,230,178,0.08)", border: "1px solid rgba(91,230,178,0.25)", borderRadius: "8px", color: "#5be6b2", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add POC
                      </button>
                    </OvSection>

                    {/* Send copy toggle */}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--white)" }}>Send a copy of every sale to organiser</p>
                      <button type="button" onClick={() => setSendCopies(p => !p)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <div style={{ width: 40, height: 22, borderRadius: "999px", background: sendCopies ? "#5be6b2" : "var(--surface2)", border: `1.5px solid ${sendCopies ? "#5be6b2" : "var(--border)"}`, position: "relative", transition: "background 0.2s" }}>
                          <div style={{ position: "absolute", top: "2px", left: sendCopies ? "20px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: sendCopies ? "#000" : "var(--muted)", transition: "left 0.2s" }} />
                        </div>
                      </button>
                    </div>

                    {/* Save button */}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "14px" }}>
                      <button type="button" onClick={handleSaveOverview} disabled={saving}
                        style={{ padding: "12px 40px", background: saving ? "rgba(91,230,178,0.4)" : "#5be6b2", border: "none", borderRadius: "10px", color: "#000", fontSize: "14px", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 0 24px rgba(91,230,178,0.22)", letterSpacing: "0.04em" }}
                        onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#79eebc"; }}
                        onMouseLeave={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#5be6b2"; }}>
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                      {saveMsg && (
                        <span style={{ fontSize: "13px", fontWeight: 600, color: saveMsg === "Saved" ? "#5be6b2" : "#ef4444" }}>
                          {saveMsg}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT sidebar ── */}
          <div className={styles.scrManageSidebar}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ height: "120px", overflow: "hidden", position: "relative" }}>
                {imgUrl || ev.image ? (
                  <img src={imgUrl || ev.image} alt={ev.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--surface2)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(18,26,31,0.9), transparent)" }} />
                <span style={{ position: "absolute", bottom: "10px", left: "12px", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>{badge.label}</span>
              </div>
              <div style={{ padding: "14px" }}>
                <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 700, color: "var(--white)", lineHeight: 1.4 }}>{ev.title}</p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, background: "var(--bg)", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 800, color: "var(--white)" }}>{ev.sold ?? 0}</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "var(--muted)", fontWeight: 600 }}>Sold</p>
                  </div>
                  <div style={{ flex: 1, background: "var(--bg)", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: 800, color: "var(--white)" }}>{(ev.capacity ?? 0) - (ev.sold ?? 0)}</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "var(--muted)", fontWeight: 600 }}>Left</p>
                  </div>
                </div>
              </div>
            </div>

            <SideCard title="Organiser Tools" accent="#5be6b2">
              <SideRow label="Generate OneLink" sub="Share booking link" accent="#5be6b2"
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>} />
              <SideRow label="Add Attendees" sub="Manual entry" accent="#5be6b2"
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>} />
              <SideRow label="Send Communication" accent="#5be6b2"
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.92a16 16 0 006.29 6.29l1.28-1.29a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>} />
              <SideRow label="Manage Discounts" accent="#5be6b2"
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>} />
            </SideCard>

            <SideCard title="Analytics" accent="#a78bfa">
              <SideRow label="View Insights" accent="#a78bfa"
                onClick={() => router.push(`/dashboard/streaming/${ev.id}/analytics`)}
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>} />
              <SideRow label="Attendees" sub="View ticket holders" accent="#a78bfa"
                onClick={() => router.push(`/dashboard/streaming/${ev.id}/attendees`)}
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>} />
              <SideRow label="Door Scan" sub="Scan entry codes" accent="#a78bfa"
                onClick={() => router.push(`/dashboard/streaming/${ev.id}/scan`)}
                icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17h3M17 14h3"/></svg>} />
            </SideCard>
          </div>
        </div>
      </div>

      <AddShowDrawer open={drawerOpen} onClose={closeDrawer} onSave={handleSaveShow} />
      <AddTicketDrawer open={ticketDrawerOpen} onClose={closeTicketDrawer} onSave={handleSaveTicket} shows={shows} />
    </>
  );
}
