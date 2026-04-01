"use client";

import React, { useState } from "react";
import { EventCard, EventStatus } from "@/components/dashboard/EventCard";
import { BookingModal } from "@/components/dashboard/BookingModal";

const mockGames = [
  {
    id: 1,
    status: "confirmed" as EventStatus,
    venue: "Urban Turf, Mumbai",
    date: "2026-03-27",
    time: "20:00",
    format: "5v5",
    fee: 350,
    spotsTotal: 10,
    spotsLeft: 2,
    players: [
      { name: "Arjun K.", initials: "AK", pos: "MID" },
      { name: "Rahul N.", initials: "RN", pos: "FWD" },
      { name: "Priya S.", initials: "PS", pos: "DEF" },
      { name: "Kartik M.", initials: "KM", pos: "GK" },
      { name: "Shreya V.", initials: "SV", pos: "MID" },
      { name: "Dev T.", initials: "DT", pos: "FWD" },
      { name: "Neha R.", initials: "NR", pos: "DEF" },
      { name: "Aditya M.", initials: "AM", pos: "MID" },
    ]
  },
  {
    id: 2,
    status: "confirmed" as EventStatus,
    venue: "Kick Turf, Bandra",
    date: "2026-03-28",
    time: "18:00",
    format: "7v7",
    fee: 400,
    spotsTotal: 14,
    spotsLeft: 0,
    players: [
      { name: "Mihir K.", initials: "MK", pos: "GK" },
      { name: "Sanya B.", initials: "SB", pos: "DEF" },
      { name: "Vivek R.", initials: "VR", pos: "MID" },
      { name: "Tanya R.", initials: "TR", pos: "FWD" },
    ]
  },
  {
    id: 3,
    status: "tentative" as EventStatus,
    venue: "Playz Arena, Andheri",
    date: "2026-03-29",
    time: "19:30",
    format: "6v6",
    fee: 300,
    spotsTotal: 12,
    spotsLeft: 5,
    players: [
      { name: "Jay S.", initials: "JS", pos: "FWD" },
      { name: "Kirti P.", initials: "KP", pos: "MID" },
    ]
  }
];

export default function PlayerDashboard({ params }: { params: { id: string } }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(1250);

  const filteredGames = mockGames.filter(g => {
    if (search && !g.venue.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "confirmed") return g.status === "confirmed";
    if (filter === "tentative") return g.status === "tentative";
    if (filter === "available") return g.spotsLeft > 0;
    if (filter === "today") return false; // demo
    return true;
  });

  const handleBook = (game: any) => {
    setSelectedGame(game);
  };

  const handleConfirmBooking = (game: any, plusOne: boolean) => {
    const total = game.fee * (plusOne ? 2 : 1);
    if (!game.waitlist) {
      setWalletBalance(prev => prev - total);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">Mumbai Community</div>
          <div className="page-title">Upcoming <span>Games</span></div>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input 
              type="text" 
              placeholder="Search venue..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filter-bar">
        {["all", "confirmed", "tentative", "available", "today"].map(f => (
          <button 
            key={f}
            className={`filter-chip ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace("Available", "Spots Available")}
          </button>
        ))}
      </div>

      <div className="events-grid">
        {filteredGames.map(game => (
          <EventCard
            key={game.id}
            {...game}
            onBook={handleBook}
          />
        ))}
      </div>

      {selectedGame && (
        <BookingModal 
          game={selectedGame}
          walletBalance={walletBalance}
          onClose={() => setSelectedGame(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
}
