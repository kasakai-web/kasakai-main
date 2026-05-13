"use client";

import type { BookingData } from "./types";

interface Props {
  bookingData: BookingData;
  onUpdateQty: (tierId: string, delta: number) => void;
  onProceed: () => void;
  onClose: () => void;
  total: number;
  totalTickets: number;
}

export function ScreeningQuantitySheet({ bookingData, onUpdateQty, onProceed, onClose, total, totalTickets }: Props) {
  return (
    /* fixed overlay — works on any screen width */
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center px-0 md:px-4 scr-sheet-overlay">
      {/* Panel: full-width sheet on mobile, max-w modal on desktop */}
      <div className="w-full md:max-w-lg bg-[#111111] md:rounded-[24px] rounded-t-[24px] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] scr-sheet">

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-[#c8f135] uppercase tracking-widest">Select Tickets</p>
            <h2 className="text-xl font-black text-white leading-tight">{bookingData.screening?.matchTitle}</h2>
            <p className="text-zinc-500 text-xs leading-relaxed italic border-l-2 border-[#c8f135]/30 pl-3 py-0.5">
              {bookingData.screening?.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 mt-0.5"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tier list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scr-scroll">
          {bookingData.screening?.tiers.map((tier) => (
            <div
              key={tier.id}
              className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between hover:border-[#c8f135]/20 transition-all"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{tier.name}</span>
                  <span className="text-xs font-black text-[#c8f135]">₹{tier.price}</span>
                </div>
                {tier.description && (
                  <p className="text-[10px] text-zinc-500">{tier.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 bg-black/50 p-1.5 rounded-xl border border-white/5">
                <button
                  onClick={() => onUpdateQty(tier.id, -1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <span className="text-sm font-black w-5 text-center text-white">
                  {bookingData.tierQuantities[tier.id] || 0}
                </span>
                <button
                  onClick={() => onUpdateQty(tier.id, 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#c8f135] hover:bg-[#c8f135]/10 transition-all"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/30 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Total Amount</span>
              <span className="text-2xl font-black text-white">₹{total}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Selected</span>
              <span className="text-sm font-black text-zinc-300">{totalTickets} Ticket{totalTickets !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <button
            disabled={totalTickets === 0}
            onClick={onProceed}
            className="w-full py-4 bg-[#c8f135] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-black text-sm rounded-2xl uppercase tracking-widest shadow-lg shadow-[#c8f135]/20 active:scale-[0.98] transition-all"
          >
            Proceed to Pay
          </button>
        </div>
      </div>
    </div>
  );
}
