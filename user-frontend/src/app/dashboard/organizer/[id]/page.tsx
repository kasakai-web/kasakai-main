"use client";

import React, { useState } from "react";
import { CreateEventModal } from "@/components/dashboard/CreateEventModal";
import { OrganizerEventCard } from "@/components/dashboard/OrganizerEventCard";

const mockOrgGames = [
  {
    id: 1,
    title: "Friday Night 5v5",
    status: "confirmed" as const,
    venue: "Urban Turf, Mumbai",
    date: "2026-03-27",
    time: "20:00",
    format: "5v5",
    fee: 350,
    spotsTotal: 10,
    spotsLeft: 2,
    players: [
      { name: "Rahul N.", initials: "RN", pos: "MID" },
      { name: "Aman D.", initials: "AD", pos: "DEF" },
      { name: "Kunal G.", initials: "KG", pos: "GK" },
      { name: "Rohit P.", initials: "RP", pos: "FWD" },
      { name: "Vikram S.", initials: "VS", pos: "MID" },
      { name: "Aditya M.", initials: "AM", pos: "FWD" },
      { name: "Priya S.", initials: "PS", pos: "DEF" },
      { name: "Nishant B.", initials: "NB", pos: "MID" },
    ]
  },
  {
    id: 2,
    title: "Weekend League Practice",
    status: "tentative" as const,
    venue: "Playz Arena, Andheri",
    date: "2026-03-29",
    time: "19:30",
    format: "6v6",
    fee: 300,
    spotsTotal: 12,
    spotsLeft: 7,
    players: [
      { name: "Jay S.", initials: "JS", pos: "FWD" },
      { name: "Kirti P.", initials: "KP", pos: "MID" },
      { name: "Varun S.", initials: "VS", pos: "GK" },
      { name: "Ravi K.", initials: "RK", pos: "DEF" },
      { name: "Suresh L.", initials: "SL", pos: "MID" },
    ]
  }
];

export default function OrganizerDashboard({ params }: { params: { id: string } }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  const handleCreateEvent = (data: any) => {
    console.log(`Event Created by Organizer ${params.id}:`, data);
    setShowCreateModal(false);
    // Here you would trigger the API call to your backend
  };

  return (
    <div className="organiser-view show">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">Mumbai Community</div>
          <div className="page-title">Organiser <span>Dashboard</span></div>
        </div>
        <div className="page-actions">
          <button className="create-game-btn" onClick={() => setShowCreateModal(true)}>
            <span>+ Create Event</span>
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Active Games</div>
          <div className="stat-value">2</div>
          <div className="stat-sub">1 confirmed, 1 tentative</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Players Managed</div>
          <div className="stat-value">13</div>
          <div className="stat-sub">Across 2 games</div>
        </div>
      </div>

      <div className="section-tabs">
        <button className={`sec-tab ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
        <button className={`sec-tab ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>Past Games</button>
      </div>

      {activeTab === 'upcoming' && (
        <div id="orgUpcoming">
          <div style={{ fontFamily: "var(--mono)", fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "16px" }}>
            My Events
          </div>
          {mockOrgGames.map(game => (
            <OrganizerEventCard key={game.id} {...game} />
          ))}
        </div>
      )}

      {activeTab === 'past' && (
        <div id="orgPast">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">Past games</div>
            <div className="empty-sub">Completed games with attendance and ratings will appear here.</div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateEventModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
        />
      )}
    </div>
  );
}
