"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Calendar, ChevronDown, LoaderCircle, MapPin, Star, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { resolveImageUrl } from "@/utils/api";
import { avatarInitials } from "@/utils/avatar";
import {
  fetchOrganiserProfile, useOrganiserEvents,
  type EventPagination, type OrganiserEventScope, type ProfileEvent,
} from "@/hooks/useOrganiserEvents";
import "./OrganiserProfile.css";

type OrganiserProfile = {
  name: string;
  profileImage: string | null;
  averageRating: number;
  ratingsCount: number;
  upcomingEvents: ProfileEvent[];
  pastEvents: ProfileEvent[];
  attendedEvents: ProfileEvent[];
  pagination?: Record<OrganiserEventScope, EventPagination>;
};

function EventList({ title, description, events, empty, organiserId, currentGameId, scope, pagination, expanded, onToggle }: {
  title: string; description: string; events: ProfileEvent[]; empty: string;
  organiserId: string; currentGameId: string; scope: OrganiserEventScope; pagination?: EventPagination;
  expanded: boolean; onToggle: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const contentId = useId();
  const reducedMotion = useReducedMotion();
  const { events: visibleEvents, pagination: pageInfo, loading, error, loadMore, scrollRef, sentinelRef } =
    useOrganiserEvents({ organiserId, currentGameId, scope, initialEvents: events, pagination, enabled: expanded });

  return (
    <section className="opl-section">
      <h3 className="opl-section-heading">
        <button type="button" id={titleId} className="opl-section-toggle" onClick={onToggle}
          aria-expanded={expanded} aria-controls={contentId}>
          <span className="opl-section-label">{title}<span className="opl-count">{pageInfo.total}</span></span>
          <ChevronDown size={18} className={`opl-chevron ${expanded ? "opl-chevron-open" : ""}`} aria-hidden="true" />
        </button>
      </h3>
      <motion.div id={contentId} initial={false} animate={{ height: expanded ? "auto" : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeInOut" }}
        className="opl-accordion-content" aria-hidden={!expanded} inert={!expanded}>
        <p id={descriptionId} className="opl-sr-only">{description}</p>
        <div ref={scrollRef} className="opl-event-viewport" role="region" aria-labelledby={titleId}
          aria-describedby={descriptionId} tabIndex={expanded ? 0 : -1}>
          {visibleEvents.length === 0 ? <p className="opl-empty">{empty}</p> : (
            <ul className="opl-events" aria-busy={loading}>
              {visibleEvents.map((event) => (
                <li key={event.id} className={scope === "upcoming" ? "opl-upcoming-card" : "opl-history-card"}>
                  <div className="opl-event-details">
                    <h4>{event.title}</h4>
                    <div className="opl-event-meta">
                      <time dateTime={event.date}>
                        <Calendar size={14} aria-hidden="true" />
                        {new Date(event.date).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })} IST
                      </time>
                      <span><MapPin size={14} aria-hidden="true" />{event.location}</span>
                    </div>
                  </div>
                  {scope !== "upcoming" && <span className="opl-event-status">{scope === "past" ? "Completed" : "Attended"}</span>}
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="opl-list-error">{error}</p>}
          {pageInfo.hasMore ? (
            <div ref={sentinelRef} className="opl-list-footer">
              <button type="button" className="opl-load-more" disabled={loading} onClick={() => void loadMore()}
                aria-label={`${error ? "Retry loading" : "Load more"} ${title.toLowerCase()}`}>
                {loading ? <><LoaderCircle className="opl-spinner" size={16} aria-hidden="true" />Loading events…</>
                  : error ? "Try again" : "Load more"}
              </button>
            </div>
          ) : visibleEvents.length > 0 ? <p className="opl-end-of-list">You’re all caught up</p> : null}
        </div>
        <p className="opl-list-progress" role="status" aria-atomic="true">
          {loading ? "Loading more events…" : `${visibleEvents.length} of ${pageInfo.total} events`}
        </p>
      </motion.div>
    </section>
  );
}


export function OrganiserProfileDialog({ organiserId, currentGameId, onClose }: {
  organiserId: string; currentGameId: string; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [profile, setProfile] = useState<OrganiserProfile | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [activeSection, setActiveSection] = useState<OrganiserEventScope | "">("upcoming");
  const toggleSection = (scope: OrganiserEventScope) => setActiveSection((current) => current === scope ? "" : scope);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchProfile() {
      try {
        const result = await fetchOrganiserProfile<OrganiserProfile>(organiserId, currentGameId, controller.signal);
        if (!controller.signal.aborted) setProfile(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Couldn't load this profile.");
      }
    }
    void fetchProfile();
    return () => controller.abort();
  }, [organiserId, currentGameId, attempt]);

  return createPortal(
    <dialog ref={dialogRef} className="opl-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <div className="opl-panel">
        <header className="opl-header">
          <button type="button" className="opl-close" onClick={onClose} aria-label="Close organiser profile"><X size={20} aria-hidden="true" /></button>
          {profile ? (
            <div className="opl-identity">
              <div className="opl-avatar">
                {profile.profileImage && !imageFailed ? (
                  <Image src={resolveImageUrl(profile.profileImage)} alt="" width={64} height={64} onError={() => setImageFailed(true)} />
                ) : avatarInitials(profile.name)}
              </div>
              <div className="opl-identity-details">
                <h2 id={titleId}>{profile.name}</h2>
                <div className="opl-identity-meta">
                  <span className="opl-organiser-badge">Organiser</span>
                  <span className="opl-rating" aria-label={profile.ratingsCount > 0
                    ? `Average organiser rating ${profile.averageRating.toFixed(1)} out of 5, from ${profile.ratingsCount} player ratings`
                    : "Not rated yet"}>
                    <Star size={14} className="opl-star" aria-hidden="true" />
                    {profile.ratingsCount > 0 ? <><strong>{profile.averageRating.toFixed(1)}</strong><span>({profile.ratingsCount})</span></> : <span>Not rated yet</span>}
                  </span>
                </div>
              </div>
            </div>
          ) : <h2 id={titleId}>Organiser profile</h2>}
        </header>
        <div className="opl-body">
          {error ? (
            <div role="alert" className="opl-empty">
              <p>{error}</p>
              <button type="button" className="opl-retry" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Try again</button>
            </div>
          ) : !profile ? <p role="status" className="opl-empty">Loading organiser profile…</p> : (
            <>
              <EventList title="Upcoming events" description="Games they are conducting, excluding the game you're viewing."
                events={profile.upcomingEvents} empty="No other upcoming events." scope="upcoming"
                expanded={activeSection === "upcoming"} onToggle={() => toggleSection("upcoming")}
                organiserId={organiserId} currentGameId={currentGameId} pagination={profile.pagination?.upcoming} />
              <EventList title="Previously organised" description="Completed games they have conducted."
                events={profile.pastEvents} empty="No completed organised events yet." scope="past"
                expanded={activeSection === "past"} onToggle={() => toggleSection("past")}
                organiserId={organiserId} currentGameId={currentGameId} pagination={profile.pagination?.past} />
              <EventList title="Events attended" description="Completed games they conducted, played in, or both. Each game is counted once."
                events={profile.attendedEvents} empty="No past events attended yet." scope="attended"
                expanded={activeSection === "attended"} onToggle={() => toggleSection("attended")}
                organiserId={organiserId} currentGameId={currentGameId} pagination={profile.pagination?.attended} />
            </>
          )}
        </div>
      </div>
    </dialog>, document.body,
  );
}
