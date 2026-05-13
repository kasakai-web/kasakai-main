"use client";

import type { BookingData } from "./types";

interface Props {
  bookingData: BookingData;
  totalAmount: number;
  entryCode: string;
  onViewBookings: () => void;
  onBackToEvents: () => void;
}

export function ScreeningConfirmation({ bookingData, totalAmount, entryCode, onViewBookings, onBackToEvents }: Props) {
  const { screening, tierQuantities } = bookingData;
  const totalTickets = Object.values(tierQuantities).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md scr-confirm-animate">
        {/* Success icon */}
        <div className="flex flex-col items-center text-center gap-4 mb-8">
          <div className="w-24 h-24 bg-[#c8f135]/15 rounded-full flex items-center justify-center border-4 border-[#c8f135] shadow-[0_0_48px_rgba(200,241,53,0.25)]">
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight">Confirmed!</h1>
            <p className="text-zinc-500 text-sm italic mt-1">Your spot is reserved at the venue</p>
            {totalTickets > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ background: "rgba(200,241,53,0.08)", border: "1px solid rgba(200,241,53,0.2)" }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <span style={{ fontSize: "11px", fontWeight: 900, color: "#c8f135", letterSpacing: ".14em", textTransform: "uppercase" }}>
                  {totalTickets} {totalTickets === 1 ? "Ticket" : "Tickets"} · {totalTickets === 1 ? "Just you" : `You + ${totalTickets - 1} friend${totalTickets - 1 > 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ticket card */}
        <div className="bg-[#111111] rounded-[28px] border-2 border-dashed border-white/10 p-7 space-y-6 relative overflow-hidden shadow-2xl mb-6">
          {/* Corner punch-outs */}
          <div className="absolute top-0 left-0 w-8 h-8 bg-black rounded-br-2xl -translate-x-4 -translate-y-4" />
          <div className="absolute top-0 right-0 w-8 h-8 bg-black rounded-bl-2xl translate-x-4 -translate-y-4" />
          <div className="absolute bottom-0 left-0 w-8 h-8 bg-black rounded-tr-2xl -translate-x-4 translate-y-4" />
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-tl-2xl translate-x-4 translate-y-4" />

          <div className="pb-5 border-b border-white/5">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Match Event</p>
            <h3 className="text-xl font-black text-white leading-tight">{screening?.matchTitle}</h3>
          </div>

          <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-left">
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Venue</p>
              <p className="text-sm font-black text-[#c8f135]">{screening?.venueName}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Time</p>
              <p className="text-sm font-black text-white">{screening?.time}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Booking</p>
              <div className="space-y-1">
                {screening?.tiers
                  ?.filter((t) => (tierQuantities[t.id] || 0) > 0)
                  .map((t) => (
                    <p key={t.id} className="text-[11px] font-bold text-white">
                      {tierQuantities[t.id]}× {t.name}
                    </p>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Total Paid</p>
              <p className="text-sm font-black text-white">₹{totalAmount}</p>
            </div>
          </div>

          {/* Entry code */}
          <div className="pt-5 border-t border-white/5 space-y-3">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Entry Verification Hash</p>
            <div className="bg-[#c8f135] py-5 rounded-xl flex items-center justify-center shadow-[0_0_28px_rgba(200,241,53,0.2)]">
              <span className="text-black font-black text-2xl tracking-[0.25em]">{entryCode}</span>
            </div>
            <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest text-center leading-relaxed">
              Valid for one-time admission · Present at gate
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={onViewBookings}
            className="w-full py-4 bg-[#c8f135] text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-[#c8f135]/20 hover:bg-[#b5d42a] transition-colors"
          >
            View in My Bookings
          </button>
          <button
            onClick={onBackToEvents}
            className="w-full py-3.5 border border-white/10 rounded-xl font-black text-[11px] text-zinc-500 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    </div>
  );
}
