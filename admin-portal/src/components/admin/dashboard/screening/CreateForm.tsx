"use client";
import React, { useState, useCallback } from "react";
import styles from "../dashboard.module.css";
import { backBtnStyle } from "./types";
import { scrApi } from "@/lib/screening-api";
import type { CreateScrEventPayload } from "@/lib/screening-api";

/* ── static data ── */
const CATEGORIES = ["Sports","Music","Comedy","Art","Food & Drinks","Tech","Film","Business","Wellness","Education"];
const SUB_CATS: Record<string,string[]> = {
  Sports:          ["Football","Cricket","Basketball","Tennis","Badminton","Other"],
  Music:           ["Live Band","DJ Night","Open Mic","Acoustic","Other"],
  Comedy:          ["Stand-up","Improv","Sketch","Other"],
  Art:             ["Exhibition","Workshop","Performance","Other"],
  "Food & Drinks": ["Tasting","Cooking Class","Brunch","Dinner","Other"],
  Tech:            ["Hackathon","Meetup","Workshop","Conference","Other"],
  Film:            ["Screening","Festival","Workshop","Other"],
  Business:        ["Networking","Conference","Workshop","Other"],
  Wellness:        ["Yoga","Meditation","Fitness","Other"],
  Education:       ["Workshop","Seminar","Course","Other"],
};
const LANGUAGES  = ["English","Hindi","Tamil","Telugu","Kannada","Malayalam","Bengali","Marathi","Other"];
const EXTRA_SECS = ["Event Instructions","Youtube Video","Prohibited Items","FAQs"];

const STEPS = [
  { num:1, label:"Basic Info" },
  { num:2, label:"Schedule"   },
  { num:3, label:"Tickets"    },
  { num:4, label:"Media"      },
  { num:5, label:"Publish"    },
];

/* ── types ── */
type Poc  = { name:string; email:string; phone:string };
type Show = { id:string; date:string; startTime:string; endTime:string };
type Tier = { id:string; name:string; price:string; capacity:string; desc:string };

type Draft = {
  name:string; description:string;
  categories:string[]; subCategory:string;
  gstin:string; accountNumber:string; ifsc:string; accountType:"savings"|"current";
  pocs:Poc[];
  venueLocation:string; ownRestaurant:boolean|null; instagramLink:string;
  shows:Show[]; gatesOpenBefore:string;
  tiers:Tier[];
  languages:string[]; minAgeEntry:string; minAgePaid:string;
  isIndoor:boolean|null; isSeated:boolean|null;
  kidFriendly:boolean|null; petFriendly:boolean|null;
  extraSections:string[];
  image:string; poster:string; videoUrl:string; galleryImages:string[];
};

const INIT: Draft = {
  name:"", description:"",
  categories:[], subCategory:"",
  gstin:"", accountNumber:"", ifsc:"", accountType:"savings",
  pocs:[{ name:"", email:"", phone:"" }],
  venueLocation:"", ownRestaurant:null, instagramLink:"",
  shows:[], gatesOpenBefore:"",
  tiers:[],
  languages:[], minAgeEntry:"", minAgePaid:"",
  isIndoor:null, isSeated:null, kidFriendly:null, petFriendly:null,
  extraSections:[],
  image:"", poster:"", videoUrl:"", galleryImages:[],
};

/* ── shared styles ── */
const LBL: React.CSSProperties = {
  display:"block", fontSize:"11px", fontWeight:700, color:"var(--muted)",
  letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"6px",
};
const INP: React.CSSProperties = {
  width:"100%", padding:"10px 12px", background:"var(--bg)", border:"1px solid var(--border)",
  borderRadius:"8px", color:"var(--white)", fontSize:"13px", outline:"none", boxSizing:"border-box",
};
const SEC: React.CSSProperties = { margin:"0 0 20px", fontSize:"14px", fontWeight:800, color:"var(--white)" };

/* ── uid counter ── */
let _n = 0;
const uid = () => `c${++_n}`;

/* ── reusable atoms ── */
function Chip({ label, active, onToggle }: { label:string; active:boolean; onToggle:()=>void }) {
  return (
    <button type="button" onClick={onToggle}
      style={{ padding:"6px 14px", borderRadius:"999px", fontSize:"12px", fontWeight:600, cursor:"pointer",
        border:"1.5px solid", transition:"all 0.15s",
        background:active?"rgba(91,230,178,0.12)":"var(--bg)",
        borderColor:active?"rgba(91,230,178,0.5)":"var(--border)",
        color:active?"#5be6b2":"var(--muted)" }}>
      {label}
    </button>
  );
}

function TriToggle({ label, value, onChange, yesText="Yes", noText="No" }: {
  label:string; value:boolean|null; onChange:(v:boolean)=>void; yesText?:string; noText?:string;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      <span style={LBL}>{label}</span>
      <div style={{ display:"flex", gap:"8px" }}>
        {([true,false] as const).map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            style={{ padding:"7px 18px", borderRadius:"8px", fontSize:"12px", fontWeight:700, cursor:"pointer",
              border:"1.5px solid", transition:"all 0.15s",
              background:value===v?(v?"rgba(91,230,178,0.15)":"rgba(239,68,68,0.1)"):"var(--bg)",
              borderColor:value===v?(v?"rgba(91,230,178,0.5)":"rgba(239,68,68,0.4)"):"var(--border)",
              color:value===v?(v?"#5be6b2":"#ef4444"):"var(--muted)" }}>
            {v ? yesText : noText}
          </button>
        ))}
      </div>
    </div>
  );
}

function UploadBox({ label, hint, value, onChange }: {
  label:string; hint:string; value:string; onChange:(url:string)=>void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string|null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadErr(null);
    try {
      const url = await scrApi.uploadImage(file);
      onChange(url);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span style={LBL}>{label}</span>
      <label style={{ display:"block", border:"1.5px dashed var(--border2)", borderRadius:"10px",
        padding:"32px 16px", textAlign:"center", background:"var(--bg)", cursor: uploading ? "wait" : "pointer", transition:"border-color 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor="rgba(91,230,178,0.4)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor="var(--border2)")}>
        <input type="file" accept="image/*" style={{ display:"none" }} disabled={uploading}
          onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
        {value
          ? <img src={value} alt="" style={{ maxHeight:"120px", maxWidth:"100%", objectFit:"cover", borderRadius:"6px" }} />
          : uploading
          ? <p style={{ margin:0, fontSize:"13px", color:"var(--muted)" }}>Uploading…</p>
          : <>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" style={{ margin:"0 auto 10px", display:"block" }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <p style={{ margin:"0 0 4px", fontSize:"13px", fontWeight:600, color:"var(--muted)" }}>Drag &amp; drop or click</p>
              <p style={{ margin:0, fontSize:"11px", color:"var(--muted)", opacity:0.6 }}>{hint}</p>
            </>
        }
      </label>
      {uploadErr && <p style={{ margin:"6px 0 0", fontSize:"11px", color:"#ef4444" }}>{uploadErr}</p>}
    </div>
  );
}

/* ── Step 1: Basic Info ── */
function S1({ form, set }: { form:Draft; set:React.Dispatch<React.SetStateAction<Draft>> }) {
  const subOpts = [...new Set(form.categories.flatMap(c => SUB_CATS[c] ?? []))];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

      <div className={styles.scrCard}>
        <p style={SEC}>Event Name</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <div>
            <span style={LBL}>Event Title *</span>
            <input style={INP} placeholder="e.g. UCL Final Big Screening"
              value={form.name} onChange={e => set(f => ({ ...f, name:e.target.value }))} />
          </div>
          <div>
            <span style={LBL}>Description</span>
            <textarea style={{ ...INP, minHeight:"100px", resize:"vertical", fontFamily:"inherit", lineHeight:1.6 } as React.CSSProperties}
              placeholder="Tell attendees what to expect…"
              value={form.description} onChange={e => set(f => ({ ...f, description:e.target.value }))} />
          </div>
        </div>
      </div>

      <div className={styles.scrCard}>
        <p style={SEC}>Event Type</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
          <div>
            <span style={LBL}>Category — choose up to 2</span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"4px" }}>
              {CATEGORIES.map(cat => (
                <Chip key={cat} label={cat} active={form.categories.includes(cat)} onToggle={() => set(f => {
                  if (f.categories.includes(cat)) return { ...f, categories:f.categories.filter(c => c!==cat), subCategory:"" };
                  if (f.categories.length >= 2) return f;
                  return { ...f, categories:[...f.categories, cat], subCategory:"" };
                })} />
              ))}
            </div>
          </div>
          {subOpts.length > 0 && (
            <div>
              <span style={LBL}>Sub-category</span>
              <select style={INP} value={form.subCategory} onChange={e => set(f => ({ ...f, subCategory:e.target.value }))}>
                <option value="">Select sub-category</option>
                {subOpts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className={styles.scrCard}>
        <p style={SEC}>Payout Details</p>
        <div className={styles.scrGrid2}>
          <div>
            <span style={LBL}>GSTIN (optional)</span>
            <input style={INP} placeholder="22AAAAA0000A1Z5"
              value={form.gstin} onChange={e => set(f => ({ ...f, gstin:e.target.value }))} />
          </div>
          <div>
            <span style={LBL}>Bank Account Number</span>
            <input style={INP} placeholder="Account number"
              value={form.accountNumber} onChange={e => set(f => ({ ...f, accountNumber:e.target.value }))} />
          </div>
          <div>
            <span style={LBL}>IFSC Code</span>
            <input style={INP} placeholder="e.g. HDFC0001234"
              value={form.ifsc} onChange={e => set(f => ({ ...f, ifsc:e.target.value }))} />
          </div>
          <div>
            <span style={LBL}>Account Type</span>
            <select style={INP} value={form.accountType} onChange={e => set(f => ({ ...f, accountType:e.target.value as "savings"|"current" }))}>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.scrCard}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <p style={{ margin:0, fontSize:"14px", fontWeight:800, color:"var(--white)" }}>Point of Contact</p>
          <button type="button" onClick={() => set(f => ({ ...f, pocs:[...f.pocs, { name:"", email:"", phone:"" }] }))}
            style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"7px 14px",
              background:"rgba(91,230,178,0.08)", border:"1px solid rgba(91,230,178,0.25)",
              borderRadius:"8px", color:"#5be6b2", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Contact
          </button>
        </div>
        {form.pocs.map((poc, i) => (
          <div key={i} className={styles.scrGridPoc} style={{ marginBottom:i < form.pocs.length-1 ? "14px" : 0 }}>
            <div>
              <span style={LBL}>Name</span>
              <input style={INP} placeholder="Full name" value={poc.name}
                onChange={e => { const p=[...form.pocs]; p[i]={...p[i],name:e.target.value}; set(f=>({...f,pocs:p})); }} />
            </div>
            <div>
              <span style={LBL}>Email</span>
              <input style={INP} type="email" placeholder="name@example.com" value={poc.email}
                onChange={e => { const p=[...form.pocs]; p[i]={...p[i],email:e.target.value}; set(f=>({...f,pocs:p})); }} />
            </div>
            <div>
              <span style={LBL}>Phone</span>
              <input style={INP} type="tel" placeholder="+91 98765 43210" value={poc.phone}
                onChange={e => { const p=[...form.pocs]; p[i]={...p[i],phone:e.target.value}; set(f=>({...f,pocs:p})); }} />
            </div>
            {form.pocs.length > 1
              ? <button type="button" onClick={() => set(f => ({ ...f, pocs:f.pocs.filter((_,idx) => idx!==i) }))}
                  style={{ alignSelf:"end", padding:"10px 12px", background:"rgba(239,68,68,0.08)",
                    border:"1px solid rgba(239,68,68,0.2)", borderRadius:"8px", color:"#ef4444", cursor:"pointer", lineHeight:1 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              : <div />
            }
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2: Schedule ── */
function S2({ form, set }: { form:Draft; set:React.Dispatch<React.SetStateAction<Draft>> }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newShow, setNewShow] = useState({ date:"", startTime:"", endTime:"" });

  function saveShow() {
    if (!newShow.date || !newShow.startTime || !newShow.endTime) return;
    set(f => ({ ...f, shows:[...f.shows, { id:uid(), ...newShow }] }));
    setNewShow({ date:"", startTime:"", endTime:"" });
    setAddOpen(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

      <div className={styles.scrCard}>
        <p style={SEC}>Venue</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
          <div>
            <span style={LBL}>Location / Venue Name *</span>
            <input style={INP} placeholder="e.g. The Local Cafe, Sector 29, Gurgaon"
              value={form.venueLocation} onChange={e => set(f => ({ ...f, venueLocation:e.target.value }))} />
          </div>
          <TriToggle label="Hosting at own restaurant?" value={form.ownRestaurant} onChange={v => set(f => ({ ...f, ownRestaurant:v }))} />
          <div>
            <span style={LBL}>Venue Instagram (optional)</span>
            <input style={INP} placeholder="https://instagram.com/venuename"
              value={form.instagramLink} onChange={e => set(f => ({ ...f, instagramLink:e.target.value }))} />
          </div>
          <div>
            <span style={LBL}>Gates Open Before Event (mins)</span>
            <input style={INP} type="number" placeholder="e.g. 30" min="0"
              value={form.gatesOpenBefore} onChange={e => set(f => ({ ...f, gatesOpenBefore:e.target.value }))} />
          </div>
        </div>
      </div>

      <div className={styles.scrCard}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <p style={{ margin:0, fontSize:"14px", fontWeight:800, color:"var(--white)" }}>Shows</p>
          {!addOpen && (
            <button type="button" onClick={() => setAddOpen(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"7px 14px",
                background:"rgba(91,230,178,0.08)", border:"1px solid rgba(91,230,178,0.25)",
                borderRadius:"8px", color:"#5be6b2", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add Show
            </button>
          )}
        </div>

        {addOpen && (
          <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"10px", padding:"16px", marginBottom:"16px" }}>
            <div className={styles.scrGrid2}>
              <div style={{ gridColumn:"1 / -1" }}>
                <span style={LBL}>Date *</span>
                <input style={INP} type="date" value={newShow.date}
                  onChange={e => setNewShow(s => ({ ...s, date:e.target.value }))} />
              </div>
              <div>
                <span style={LBL}>Start Time *</span>
                <input style={INP} type="time" value={newShow.startTime}
                  onChange={e => setNewShow(s => ({ ...s, startTime:e.target.value }))} />
              </div>
              <div>
                <span style={LBL}>End Time *</span>
                <input style={INP} type="time" value={newShow.endTime}
                  onChange={e => setNewShow(s => ({ ...s, endTime:e.target.value }))} />
              </div>
            </div>
            <div style={{ display:"flex", gap:"8px", marginTop:"14px", justifyContent:"flex-end" }}>
              <button type="button" onClick={() => { setAddOpen(false); setNewShow({ date:"", startTime:"", endTime:"" }); }}
                style={{ padding:"8px 16px", background:"var(--bg)", border:"1px solid var(--border)",
                  borderRadius:"8px", color:"var(--muted)", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={saveShow}
                style={{ padding:"8px 18px", background:"rgba(91,230,178,0.12)", border:"1.5px solid rgba(91,230,178,0.4)",
                  borderRadius:"8px", color:"#5be6b2", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
                Add
              </button>
            </div>
          </div>
        )}

        {form.shows.length === 0 && !addOpen && (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:"13px" }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round"
              style={{ display:"block", margin:"0 auto 12px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            No shows yet. Click "Add Show" to schedule one.
          </div>
        )}

        {form.shows.map(sh => (
          <div key={sh.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"12px 14px", background:"var(--bg)", border:"1px solid var(--border)",
            borderRadius:"8px", marginBottom:"8px" }}>
            <div>
              <span style={{ fontSize:"13px", fontWeight:700, color:"var(--white)" }}>
                {new Date(sh.date + "T12:00:00").toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" })}
              </span>
              <span style={{ fontSize:"12px", color:"var(--muted)", marginLeft:"12px" }}>
                {sh.startTime} – {sh.endTime}
              </span>
            </div>
            <button type="button" onClick={() => set(f => ({ ...f, shows:f.shows.filter(s => s.id!==sh.id) }))}
              style={{ padding:"6px 10px", background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:"6px", color:"#ef4444", cursor:"pointer", lineHeight:1 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 3: Tickets ── */
function S3({ form, set }: { form:Draft; set:React.Dispatch<React.SetStateAction<Draft>> }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newTier, setNewTier] = useState({ name:"", price:"", capacity:"", desc:"" });

  function saveTier() {
    if (!newTier.name || !newTier.price || !newTier.capacity) return;
    set(f => ({ ...f, tiers:[...f.tiers, { id:uid(), ...newTier }] }));
    setNewTier({ name:"", price:"", capacity:"", desc:"" });
    setAddOpen(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
      <div className={styles.scrCard}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <p style={{ margin:0, fontSize:"14px", fontWeight:800, color:"var(--white)" }}>Ticket Tiers</p>
          {!addOpen && (
            <button type="button" onClick={() => setAddOpen(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"7px 14px",
                background:"rgba(91,230,178,0.08)", border:"1px solid rgba(91,230,178,0.25)",
                borderRadius:"8px", color:"#5be6b2", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add Tier
            </button>
          )}
        </div>

        {addOpen && (
          <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"10px", padding:"16px", marginBottom:"16px" }}>
            <div className={styles.scrGrid2}>
              <div>
                <span style={LBL}>Tier Name *</span>
                <input style={INP} placeholder="e.g. General, VIP" value={newTier.name}
                  onChange={e => setNewTier(t => ({ ...t, name:e.target.value }))} />
              </div>
              <div>
                <span style={LBL}>Price (₹) *</span>
                <input style={INP} type="number" placeholder="0 for free" min="0" value={newTier.price}
                  onChange={e => setNewTier(t => ({ ...t, price:e.target.value }))} />
              </div>
              <div>
                <span style={LBL}>Capacity *</span>
                <input style={INP} type="number" placeholder="Max seats" min="1" value={newTier.capacity}
                  onChange={e => setNewTier(t => ({ ...t, capacity:e.target.value }))} />
              </div>
              <div>
                <span style={LBL}>Description (optional)</span>
                <input style={INP} placeholder="e.g. Includes free drinks" value={newTier.desc}
                  onChange={e => setNewTier(t => ({ ...t, desc:e.target.value }))} />
              </div>
            </div>
            <div style={{ display:"flex", gap:"8px", marginTop:"14px", justifyContent:"flex-end" }}>
              <button type="button" onClick={() => { setAddOpen(false); setNewTier({ name:"", price:"", capacity:"", desc:"" }); }}
                style={{ padding:"8px 16px", background:"var(--bg)", border:"1px solid var(--border)",
                  borderRadius:"8px", color:"var(--muted)", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={saveTier}
                style={{ padding:"8px 18px", background:"rgba(91,230,178,0.12)", border:"1.5px solid rgba(91,230,178,0.4)",
                  borderRadius:"8px", color:"#5be6b2", fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
                Add Tier
              </button>
            </div>
          </div>
        )}

        {form.tiers.length === 0 && !addOpen && (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:"13px" }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round"
              style={{ display:"block", margin:"0 auto 12px" }}>
              <rect x="2" y="7" width="20" height="10" rx="1"/>
              <circle cx="7.5" cy="12" r="1.5" fill="var(--border2)" stroke="none"/>
            </svg>
            No ticket tiers yet.
          </div>
        )}

        {form.tiers.map(tier => (
          <div key={tier.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"14px 16px", background:"var(--bg)", border:"1px solid var(--border)",
            borderRadius:"8px", marginBottom:"8px" }}>
            <div>
              <span style={{ fontSize:"13px", fontWeight:800, color:"var(--white)" }}>{tier.name}</span>
              {tier.desc && <span style={{ fontSize:"11px", color:"var(--muted)", marginLeft:"10px" }}>{tier.desc}</span>}
              <div style={{ marginTop:"4px", display:"flex", gap:"12px" }}>
                <span style={{ fontSize:"12px", fontWeight:700, color:"#5be6b2" }}>₹{Number(tier.price).toLocaleString()}</span>
                <span style={{ fontSize:"12px", color:"var(--muted)" }}>{tier.capacity} seats</span>
              </div>
            </div>
            <button type="button" onClick={() => set(f => ({ ...f, tiers:f.tiers.filter(t => t.id!==tier.id) }))}
              style={{ padding:"6px 10px", background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:"6px", color:"#ef4444", cursor:"pointer", lineHeight:1 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 4: Media ── */
function S4({ form, set }: { form:Draft; set:React.Dispatch<React.SetStateAction<Draft>> }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

      <div className={styles.scrCard}>
        <p style={SEC}>Creatives</p>
        <div className={styles.scrGrid2}>
          <UploadBox label="Landscape Banner (16:9)" hint="PNG or JPG · up to 10 MB"
            value={form.image}  onChange={url => set(f => ({ ...f, image: url }))} />
          <UploadBox label="Portrait Poster (3:4)"   hint="PNG or JPG · up to 10 MB"
            value={form.poster} onChange={url => set(f => ({ ...f, poster: url }))} />
        </div>
      </div>

      <div className={styles.scrCard}>
        <p style={SEC}>Video Sneak Peek</p>
        <div>
          <span style={LBL}>Paste YouTube / Vimeo URL</span>
          <input style={INP} placeholder="https://youtube.com/watch?v=…"
            value={form.videoUrl} onChange={e => set(f => ({ ...f, videoUrl: e.target.value }))} />
        </div>
      </div>

      <div className={styles.scrCard}>
        <p style={SEC}>Gallery</p>
        <p style={{ margin:"-12px 0 16px", fontSize:"12px", color:"var(--muted)" }}>Up to 8 images</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))", gap:"12px" }}>
          {Array.from({ length:8 }).map((_, i) => (
            <GallerySlot key={i} value={form.galleryImages[i] || ""}
              onChange={url => set(f => {
                const imgs = [...f.galleryImages];
                imgs[i] = url;
                return { ...f, galleryImages: imgs.filter(Boolean) };
              })} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GallerySlot({ value, onChange }: { value:string; onChange:(url:string)=>void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await scrApi.uploadImage(file);
      onChange(url);
    } catch { /* silent — slot stays empty */ }
    finally { setUploading(false); }
  }

  return (
    <label style={{ aspectRatio:"1", border:"1.5px dashed var(--border2)", borderRadius:"8px",
      display:"flex", alignItems:"center", justifyContent:"center", cursor: uploading ? "wait" : "pointer",
      background:"var(--bg)", overflow:"hidden", transition:"border-color 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor="rgba(91,230,178,0.4)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor="var(--border2)")}>
      <input type="file" accept="image/*" style={{ display:"none" }} disabled={uploading}
        onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
      {value
        ? <img src={value} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        : uploading
        ? <span style={{ fontSize:"10px", color:"var(--muted)" }}>…</span>
        : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
      }
    </label>
  );
}

/* ── Step 5: Publish ── */
function S5({ form, set }: { form:Draft; set:React.Dispatch<React.SetStateAction<Draft>> }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

      <div className={styles.scrCard}>
        <p style={SEC}>Event Guide</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"22px" }}>
          <div>
            <span style={LBL}>Languages Supported</span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"4px" }}>
              {LANGUAGES.map(lang => (
                <Chip key={lang} label={lang} active={form.languages.includes(lang)} onToggle={() =>
                  set(f => ({ ...f, languages:f.languages.includes(lang)
                    ? f.languages.filter(l => l!==lang)
                    : [...f.languages, lang] }))
                } />
              ))}
            </div>
          </div>
          <div className={styles.scrGrid2}>
            <div>
              <span style={LBL}>Minimum Age (Entry)</span>
              <input style={INP} type="number" placeholder="0 = no restriction" min="0"
                value={form.minAgeEntry} onChange={e => set(f => ({ ...f, minAgeEntry:e.target.value }))} />
            </div>
            <div>
              <span style={LBL}>Minimum Age (Paid Ticket)</span>
              <input style={INP} type="number" placeholder="0 = no restriction" min="0"
                value={form.minAgePaid} onChange={e => set(f => ({ ...f, minAgePaid:e.target.value }))} />
            </div>
            <TriToggle label="Indoor or Outdoor?"  value={form.isIndoor}    onChange={v => set(f => ({ ...f, isIndoor:v }))}    yesText="Indoor"  noText="Outdoor"  />
            <TriToggle label="Seated or Standing?" value={form.isSeated}    onChange={v => set(f => ({ ...f, isSeated:v }))}    yesText="Seated"  noText="Standing" />
            <TriToggle label="Kid Friendly?"        value={form.kidFriendly} onChange={v => set(f => ({ ...f, kidFriendly:v }))} />
            <TriToggle label="Pet Friendly?"        value={form.petFriendly} onChange={v => set(f => ({ ...f, petFriendly:v }))} />
          </div>
        </div>
      </div>

      <div className={styles.scrCard}>
        <p style={SEC}>Add More Sections</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {EXTRA_SECS.map(sec => {
            const active = form.extraSections.includes(sec);
            return (
              <button key={sec} type="button"
                onClick={() => set(f => ({ ...f, extraSections:active
                  ? f.extraSections.filter(s => s!==sec)
                  : [...f.extraSections, sec] }))}
                style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"8px 16px",
                  borderRadius:"999px", fontSize:"12px", fontWeight:700, cursor:"pointer", border:"1.5px solid", transition:"all 0.15s",
                  background:active?"rgba(91,230,178,0.12)":"var(--bg)",
                  borderColor:active?"rgba(91,230,178,0.5)":"var(--border)",
                  color:active?"#5be6b2":"var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  {active ? <path d="M5 13l4 4L19 7"/> : <path d="M12 5v14M5 12h14"/>}
                </svg>
                {sec}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review summary */}
      <div className={styles.scrCard} style={{ border:"1px solid rgba(91,230,178,0.15)", background:"rgba(91,230,178,0.03)" }}>
        <p style={SEC}>Review</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {[
            { label:"Event",        value:form.name || "—" },
            { label:"Categories",   value:form.categories.join(", ") || "—" },
            { label:"Venue",        value:form.venueLocation || "—" },
            { label:"Shows",        value:form.shows.length ? `${form.shows.length} show(s)` : "None" },
            { label:"Ticket tiers", value:form.tiers.length
              ? form.tiers.map(t => `${t.name} (₹${Number(t.price).toLocaleString()})`).join(", ")
              : "None" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display:"flex", gap:"16px" }}>
              <span style={{ width:"110px", flexShrink:0, fontSize:"11px", fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
              <span style={{ fontSize:"13px", fontWeight:600, color:"var(--white)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildPayload(form: Draft): CreateScrEventPayload {
  return {
    title:           form.name,
    description:     form.description,
    categories:      form.categories,
    subCategories:   form.subCategory ? [form.subCategory] : [],
    languages:       form.languages,
    venueName:       form.venueLocation,
    location:        form.venueLocation,
    ownRestaurant:   form.ownRestaurant,
    venueInstagram:  form.instagramLink,
    gatesOpenBefore: Number(form.gatesOpenBefore) || 0,
    isIndoor:        form.isIndoor,
    isSeated:        form.isSeated,
    kidFriendly:     form.kidFriendly,
    petFriendly:     form.petFriendly,
    minAgeEntry:     Number(form.minAgeEntry) || 0,
    minAgePaid:      Number(form.minAgePaid) || 0,
    shows:           form.shows.map(s => ({ date: s.date, startTime: s.startTime, endTime: s.endTime })),
    tiers:           form.tiers.map(t => ({
      name:        t.name,
      pricePaise:  Math.round(Number(t.price) * 100),
      capacity:    Number(t.capacity) || 1,
      description: t.desc,
    })),
    contacts:       form.pocs,
    payout: {
      gstin:         form.gstin,
      accountNumber: form.accountNumber,
      ifsc:          form.ifsc,
      accountType:   form.accountType,
    },
    extraSections:  form.extraSections.map(type => ({ type, content: '' })),
    image:          form.image,
    poster:         form.poster,
    videoUrl:       form.videoUrl,
    galleryImages:  form.galleryImages,
  };
}

/* ── Main component ── */
export function ScrCreateEventForm({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit?: (payload: CreateScrEventPayload, status: 'draft' | 'published') => Promise<void>;
}) {
  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState<Draft>(INIT);
  const [submitting, setSubmitting] = useState(false);

  const goNext = useCallback(() => setStep(s => Math.min(s + 1, 5)), []);
  const goPrev = useCallback(() => setStep(s => Math.max(s - 1, 1)), []);

  const handlePublish = useCallback(async (status: 'draft' | 'published') => {
    if (!onSubmit || submitting) return;
    if (!form.name.trim()) { alert('Event name is required.'); return; }
    setSubmitting(true);
    try {
      await onSubmit(buildPayload(form), status);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, submitting, form]);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"20px", flexWrap:"wrap" }}>
        <button type="button" onClick={step === 1 ? onBack : goPrev} style={backBtnStyle}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {step === 1 ? "Back" : `← ${STEPS[step - 2].label}`}
        </button>
        <div>
          <p style={{ margin:"0 0 2px", fontSize:"10px", fontWeight:800, color:"#5be6b2", letterSpacing:"0.15em", textTransform:"uppercase" }}>Streaming Events</p>
          <h2 style={{ margin:0, fontSize:"20px", fontWeight:800, color:"var(--white)" }}>Create New Event</h2>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"14px", padding:"20px 24px", marginBottom:"24px" }}>
        <div style={{ display:"flex", alignItems:"center", position:"relative" }}>
          {STEPS.map((s, i) => {
            const isDone   = s.num < step;
            const isActive = s.num === step;
            return (
              <React.Fragment key={s.num}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px",
                  flex:i === STEPS.length-1 ? "0 0 auto" : "1", position:"relative", zIndex:1 }}>
                  <button type="button"
                    onClick={() => { if (s.num <= step) setStep(s.num); }}
                    style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"13px", fontWeight:800, transition:"all 0.2s", border:"2px solid",
                      cursor:s.num <= step ? "pointer" : "default",
                      background:isActive?"rgba(91,230,178,0.15)":isDone?"rgba(91,230,178,0.08)":"var(--bg)",
                      borderColor:isActive?"#5be6b2":isDone?"rgba(91,230,178,0.4)":"var(--border)",
                      color:isActive?"#5be6b2":isDone?"rgba(91,230,178,0.7)":"var(--muted2)" }}>
                    {isDone
                      ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                      : s.num
                    }
                  </button>
                  <span style={{ fontSize:"11px", fontWeight:isActive?700:500, color:isActive?"#5be6b2":"var(--muted)", whiteSpace:"nowrap" }}>{s.label}</span>
                </div>
                {i < STEPS.length-1 && (
                  <div style={{ flex:1, height:"2px", margin:"0 4px", marginBottom:"20px", borderRadius:"999px",
                    background:isDone?"rgba(91,230,178,0.4)":"var(--border)", transition:"background 0.2s" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      {step === 1 && <S1 form={form} set={setForm} />}
      {step === 2 && <S2 form={form} set={setForm} />}
      {step === 3 && <S3 form={form} set={setForm} />}
      {step === 4 && <S4 form={form} set={setForm} />}
      {step === 5 && <S5 form={form} set={setForm} />}

      {/* Navigation */}
      <div style={{ display:"flex", justifyContent:"space-between", gap:"12px", padding:"24px 0 48px" }}>
        <button type="button" onClick={step === 1 ? onBack : goPrev}
          style={{ padding:"11px 24px", background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:"10px", color:"var(--muted)", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
          {step === 1 ? "Cancel" : "← Back"}
        </button>
        {step < 5 ? (
          <button type="button" onClick={goNext}
            style={{ padding:"11px 28px", background:"rgba(91,230,178,0.12)", border:"1.5px solid rgba(91,230,178,0.4)",
              borderRadius:"10px", color:"#5be6b2", fontSize:"13px", fontWeight:800, cursor:"pointer", letterSpacing:"0.03em" }}>
            Next →
          </button>
        ) : (
          <div style={{ display:"flex", gap:"10px" }}>
            <button type="button" disabled={submitting} onClick={() => handlePublish('draft')}
              style={{ padding:"11px 24px", background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:"10px", color:"var(--muted)", fontSize:"13px", fontWeight:700,
                cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Saving…" : "Save as Draft"}
            </button>
            <button type="button" disabled={submitting} onClick={() => handlePublish('published')}
              style={{ padding:"11px 28px", background:"rgba(91,230,178,0.12)", border:"1.5px solid rgba(91,230,178,0.4)",
                borderRadius:"10px", color:"#5be6b2", fontSize:"13px", fontWeight:800,
                cursor: submitting ? "not-allowed" : "pointer", letterSpacing:"0.03em",
                opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Publishing…" : "Publish Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
