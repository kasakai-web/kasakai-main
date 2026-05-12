"use client";

import { useState, useEffect, useCallback, useReducer } from "react";
import dynamic from "next/dynamic";
import { getSession } from "@/utils/api";

import { useScreeningEvents } from "@/hooks/useScreeningEvents";
import { useMyTickets }       from "@/hooks/useMyTickets";
import { ScreeningHeader }     from "@/components/screening/ScreeningHeader";
import { ScreeningEventsView } from "@/components/screening/ScreeningEventsView";
import { ScreeningMyBookings } from "@/components/screening/ScreeningMyBookings";
import { ScreeningHistory }    from "@/components/screening/ScreeningHistory";
import { ScreeningBottomNav }  from "@/components/screening/ScreeningBottomNav";

// ── Lazy-load heavy modal/sheet components (not needed on first paint) ────────
const ScreeningQuantitySheet = dynamic(
  () => import("@/components/screening/ScreeningQuantitySheet").then(m => m.ScreeningQuantitySheet),
  { ssr: false }
);
const ScreeningPaymentSheet = dynamic(
  () => import("@/components/screening/ScreeningPaymentSheet").then(m => m.ScreeningPaymentSheet),
  { ssr: false }
);
const ScreeningConfirmation = dynamic(
  () => import("@/components/screening/ScreeningConfirmation").then(m => m.ScreeningConfirmation),
  { ssr: false }
);
const ScreeningLoginModal = dynamic(
  () => import("@/components/screening/ScreeningLoginModal").then(m => m.ScreeningLoginModal),
  { ssr: false }
);

import type { BookingStep, ViewType, BookingData, Screening } from "@/components/screening/types";
import "@/components/screening/screening.css";

// ── Reducer ──────────────────────────────────────────────────────────────────
type State = {
  isLoggedIn: boolean;
  loginModalOpen: boolean;
  pendingScreening: Screening | null;
  step: BookingStep;
  currentView: ViewType;
  lastEntryCode: string;
  bookingData: BookingData;
};

type Action =
  | { type: "SET_LOGGED_IN";    payload: boolean }
  | { type: "OPEN_LOGIN";       payload: Screening }
  | { type: "CLOSE_LOGIN" }
  | { type: "START_BOOKING";    payload: Screening }
  | { type: "UPDATE_QTY";       payload: { tierId: string; delta: number } }
  | { type: "PAYMENT_SUCCESS";  payload: { code: string } }
  | { type: "SET_STEP";         payload: BookingStep }
  | { type: "NAV";              payload: ViewType };

const INIT: State = {
  isLoggedIn: false,
  loginModalOpen: false,
  pendingScreening: null,
  step: "HOME",
  currentView: "LIVE_EVENTS",
  lastEntryCode: "",
  bookingData: { screening: null, tierQuantities: {} },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LOGGED_IN":
      return { ...state, isLoggedIn: action.payload };
    case "OPEN_LOGIN":
      return { ...state, loginModalOpen: true, pendingScreening: action.payload };
    case "CLOSE_LOGIN":
      return { ...state, loginModalOpen: false };
    case "START_BOOKING": {
      const s = action.payload;
      return {
        ...state,
        bookingData: {
          screening: s,
          tierQuantities: s.tiers.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.id]: 0 }), {}),
        },
        step: "QUANTITY",
      };
    }
    case "UPDATE_QTY": {
      const { tierId, delta } = action.payload;
      const prev = state.bookingData.tierQuantities[tierId] ?? 0;
      return {
        ...state,
        bookingData: {
          ...state.bookingData,
          tierQuantities: { ...state.bookingData.tierQuantities, [tierId]: Math.max(0, prev + delta) },
        },
      };
    }
    case "PAYMENT_SUCCESS":
      return {
        ...state,
        lastEntryCode: action.payload.code,
        step: "CONFIRMATION",
      };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "NAV":
      return { ...state, currentView: action.payload, step: "HOME" };
    default:
      return state;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ScreeningPage() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const { isLoggedIn, loginModalOpen, pendingScreening, step, currentView, lastEntryCode, bookingData } = state;

  const { screenings, loading: eventsLoading, error: eventsError, refetch: refetchEvents } = useScreeningEvents();
  const { confirmed: myBookings, history: myHistory, loading: ticketsLoading, error: ticketsError, refetch: refetchMyTickets } = useMyTickets(isLoggedIn);

  useEffect(() => {
    const { token } = getSession();
    dispatch({ type: "SET_LOGGED_IN", payload: !!token });
  }, []);

  // Derived totals — computed inline (not useMemo'd JSX, just numbers)
  const total = bookingData.screening
    ? bookingData.screening.tiers.reduce((sum, t) => sum + t.price * (bookingData.tierQuantities[t.id] || 0), 0)
    : 0;
  const totalTickets = Object.values(bookingData.tierQuantities).reduce((a: number, b: number) => a + b, 0);

  const handleBookNow = useCallback((screening: Screening) => {
    if (!isLoggedIn) { dispatch({ type: "OPEN_LOGIN", payload: screening }); return; }
    dispatch({ type: "START_BOOKING", payload: screening });
  }, [isLoggedIn]);

  const handleUpdateQty = useCallback((tierId: string, delta: number) => {
    dispatch({ type: "UPDATE_QTY", payload: { tierId, delta } });
  }, []);

  const handlePaymentSuccess = useCallback((entryCode: string) => {
    dispatch({ type: "PAYMENT_SUCCESS", payload: { code: entryCode } });
    refetchMyTickets();
  }, [refetchMyTickets]);

  const handleNav       = useCallback((view: ViewType)  => dispatch({ type: "NAV",      payload: view }),       []);
  const handleCloseLogin= useCallback(()                 => dispatch({ type: "CLOSE_LOGIN" }),                  []);
  const goToQuantity    = useCallback(()                 => dispatch({ type: "SET_STEP", payload: "QUANTITY" }), []);
  const goToPayment     = useCallback(()                 => dispatch({ type: "SET_STEP", payload: "PAYMENT" }),  []);
  const goToHome        = useCallback(()                 => dispatch({ type: "SET_STEP", payload: "HOME" }),     []);
  const goToMyBookings  = useCallback(()                 => handleNav("MY_BOOKINGS"),                           [handleNav]);
  const goToLiveEvents  = useCallback(()                 => handleNav("LIVE_EVENTS"),                           [handleNav]);

  return (
    <div
      className="min-h-screen text-white selection:bg-[#c8f135]/30"
      style={{ background: "radial-gradient(ellipse 70% 35% at 60% 0%, rgba(200,241,53,0.05) 0%, transparent 70%), #050505" }}
    >
      {step === "HOME" && (
        <div className="flex flex-col h-screen">
          <ScreeningHeader isLoggedIn={isLoggedIn} />
          <div className="flex-1 overflow-y-auto scr-scroll pb-6">
            {currentView === "LIVE_EVENTS" && (
              <ScreeningEventsView
                screenings={screenings}
                onBook={handleBookNow}
                loading={eventsLoading}
                error={eventsError}
                onRetry={refetchEvents}
              />
            )}
            {currentView === "MY_BOOKINGS" && (
              <ScreeningMyBookings
                bookings={myBookings}
                onFindEvents={goToLiveEvents}
                loading={ticketsLoading}
                error={ticketsError}
              />
            )}
            {currentView === "HISTORY" && (
              <ScreeningHistory
                history={myHistory}
                onFindEvents={goToLiveEvents}
                loading={ticketsLoading}
                error={ticketsError}
              />
            )}
          </div>
          <ScreeningBottomNav currentView={currentView} onNav={handleNav} />
        </div>
      )}

      {step === "QUANTITY" && (
        <ScreeningQuantitySheet
          bookingData={bookingData}
          onUpdateQty={handleUpdateQty}
          onProceed={goToPayment}
          onClose={goToHome}
          total={total}
          totalTickets={totalTickets}
        />
      )}

      {step === "PAYMENT" && (
        <ScreeningPaymentSheet
          total={total}
          eventId={bookingData.screening?.id ?? ""}
          tierQuantities={bookingData.tierQuantities}
          onSuccess={(entryCode) => handlePaymentSuccess(entryCode)}
          onBack={goToQuantity}
        />
      )}

      {step === "CONFIRMATION" && (
        <div className="min-h-screen overflow-y-auto scr-scroll flex flex-col">
          <ScreeningConfirmation
            bookingData={bookingData}
            totalAmount={total}
            entryCode={lastEntryCode}
            onViewBookings={goToMyBookings}
            onBackToEvents={goToLiveEvents}
          />
        </div>
      )}

      {/* Rendered in-tree always so it can animate in — mounts lazily on first open */}
      {loginModalOpen && (
        <ScreeningLoginModal
          open={loginModalOpen}
          onClose={handleCloseLogin}
          screening={pendingScreening}
        />
      )}
    </div>
  );
}
