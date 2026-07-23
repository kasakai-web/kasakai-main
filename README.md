# Kasa Kai — Player App (user-frontend)

Player-facing web application for the Kasa Kai football event management platform. Players browse open games, register, manage guests, top up their wallet, and track post-game stats and ratings.

> **Port:** `3000`  
> **Audience:** Players

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Key Screens & Routes](#key-screens--routes)
- [Authentication Flow](#authentication-flow)
- [Real-Time Updates](#real-time-updates)
- [Wallet & Payments](#wallet--payments)
- [Screening / Streaming Events](#screening--streaming-events)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2 |
| UI library | React | 19.2 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 · custom CSS modules |
| Animation | Motion (Framer Motion successor) | 12 |
| Icons | Lucide React | 1.14 |
| Real-time | Socket.io client | 4.8 |
| Linter | ESLint + eslint-config-next | 9 / 16.2 |

---

## Features

### Football games
- Browse all open / confirmed games with live spot counts
- Register for a game (fee deducted from wallet)
- At booking, choose **"comfortable with a format change?" Yes/No** (`willingIfFormatChange`) — drives the confirmation algorithm:
  if the game later switches format, **Yes** players stay; **No** players are auto opted-out + refunded + notified they can rejoin
- Add / remove guests after registration
- Join the waitlist when a game is full
- Opt out of attending (guests stay registered)
- Opt back in — joins rejoin waitlist if game is still full
- Cancel registration with automatic wallet refund

### Waitlist
- Standard waitlist: join when full, get notified when a slot opens
- Guest waitlist: add a guest when full, confirm (and pay) when notified
- Rejoin waitlist: opted-out players who try to return on a full game
- Leave waitlist at any time

### Post-game
- Submit star ratings for the game, organiser, and venue
- Tag-based feedback (too rough, great atmosphere, etc.)
- View own submitted feedback
- Auto-popup prompting feedback after game completion
- **Redesigned feedback modal** — high-contrast text, visible empty/filled stars, clear Submit vs Skip buttons, and a mobile bottom-sheet layout

### Shareable join links
- Game links are human-readable: `/join/<game-name>-<date>-<id>` (e.g. `/join/thursday-morning-game-12-jun-2026-<id>`)
- The join page extracts the game id from the link and opens that exact game (logged-in players go straight to it; otherwise they log in and return)
- Backward-compatible: old bare-id links (already shared / in emails) still work

### Profile & wallet
- View and update profile and position preferences
- Wallet balance with locked/available breakdown
- Top up via Razorpay (UPI, cards, net banking)
- Full transaction history

### Screening events
- Browse upcoming streaming / cinema events
- Book tickets with Razorpay payment
- View ticket history and booking confirmations

### Notifications
- Real-time in-app notification bell (Socket.io)
- Mark individual or all notifications as read

---

## Architecture

```
user-frontend/
└── src/
    ├── app/                         # Next.js 16 App Router
    │   ├── layout.tsx               # Root layout — includes SocketClient
    │   ├── SocketClient.tsx         # Socket.io connection, relays events as DOM CustomEvents
    │   ├── page.tsx                 # Landing page
    │   ├── login/                   # Login + registration pages
    │   ├── dashboard/
    │   │   └── player/[id]/         # Main player dashboard
    │   │       ├── page.tsx         # Games, My Games, Cancelled, Completed tabs
    │   │       ├── wallet/          # Wallet page
    │   │       ├── notifications/   # Notifications list
    │   │       ├── profile/         # Profile settings
    │   │       └── ratings/         # My ratings
    │   ├── join/[gameId]/           # Deep link entry — opens game detail
    │   └── screening/               # Screening/streaming event browser + booking
    ├── components/
    │   ├── auth/                    # Registration steps, OTP verification, login forms
    │   ├── dashboard/               # EventCard, BookingModal, GameFeedbackModal
    │   ├── layout/                  # Header, navigation
    │   ├── notifications/           # NotificationBell component
    │   ├── screening/               # Full screening UI (events, booking, QR)
    │   ├── sections/                # Landing page sections
    │   └── ui/                      # ConfirmationModal, Toast, shared primitives
    ├── hooks/
    │   ├── useAuthGuard.ts          # JWT validation + role check; redirects unauthorised users
    │   └── useAutoRefresh.ts        # Poll + focus + visibility refresh helper
    └── utils/
        ├── api.ts                   # buildApiUrl(), getSession(), clearSession()
        └── screening-api.ts         # Screening-specific API helpers
```

### Shared patterns

| Pattern | File | Purpose |
|---|---|---|
| Auth guard | `hooks/useAuthGuard.ts` | Include in every protected page — checks JWT + role, redirects to `/login` |
| API URL builder | `utils/api.ts → buildApiUrl()` | Prepends `NEXT_PUBLIC_API_BASE_URL` to any path |
| Session helpers | `utils/api.ts → getSession() / clearSession()` | Read / clear JWT + userId from localStorage |
| Socket relay | `app/SocketClient.tsx` | Single socket per tab; relays `wallet-update`, `new-notification`, `game-update` as DOM CustomEvents |
| Auto refresh | `hooks/useAutoRefresh.ts` | Polls every N ms, re-fetches on window focus and tab visible |

---

## Directory Structure (key files)

```
src/app/dashboard/player/[id]/
├── page.tsx          # Main dashboard — all tabs, modals, opt-out/in, guest CRUD
└── player-dashboard.css

src/components/dashboard/
├── EventCard.tsx        # Game card on the browse/my-games grid
├── BookingModal.tsx     # Register or join waitlist (guests, team preference)
└── GameFeedbackModal.tsx

src/components/auth/
├── PlayerSignUpStep1.tsx   # Email, phone, password
├── PlayerSignUpStep2.tsx   # Name, DOB, city
├── PlayerSignUpPreferences.tsx  # Position preferences
├── OTPVerification.tsx    # 6-digit OTP input
└── PlayerLoginForm.tsx
```

---

## Environment Variables

Create `user-frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

In production replace with your deployed backend URL:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.kasakai.in/api/v1
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Backend server running on port 5000 (see `kasakai-backend/README.md`)

### Install

```bash
cd user-frontend
npm install
```

### Run in development

```bash
npm run dev:3000      # Recommended — explicitly binds to port 3000
# or
npm run dev           # Uses Next.js default port (may conflict with organiser-portal)
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## Key Screens & Routes

| Route | Description |
|---|---|
| `/` | Landing page with hero, features, CTA |
| `/login` | Player login / registration |
| `/dashboard/player/[id]` | Main dashboard (All Games, My Games, Cancelled, Completed) |
| `/dashboard/player/[id]/wallet` | Wallet balance, top-up, transaction history |
| `/dashboard/player/[id]/notifications` | All notifications |
| `/dashboard/player/[id]/profile` | Edit profile and preferences |
| `/dashboard/player/[id]/ratings` | Ratings received from organisers |
| `/join/[gameId]` | Deep link from email — opens the game detail directly |
| `/screening` | Browse streaming / cinema events |
| `/screening/[id]` | Screening event detail + ticket booking |

---

## Authentication Flow

### Registration (new player)

1. **Step 1** — Enter email, phone number, and password  
2. **Step 2** — Enter name, date of birth, city  
3. **Preferences** — Choose preferred positions (GK, DEF, MID, FWD)  
4. **OTP Verification** — Enter 6-digit code sent to email and WhatsApp (Aisensy)  
5. JWT returned → stored in `localStorage` as `authToken`

### Login

1. Enter email + password
2. JWT returned → stored in `localStorage`

### Auth guard

Every protected page includes `useAuthGuard({ requiredRole: "player", routeUserId: id })`:
- Reads JWT from `localStorage`
- Validates expiry and role
- Redirects to `/login?role=player` if invalid, expired, or wrong role
- Redirects to correct user's dashboard if `routeUserId` doesn't match JWT subject

### Logout

Calling `clearSession()` removes `authToken` from localStorage and dispatches `kk-auth-changed` so `SocketClient` disconnects the socket immediately.

---

## Real-Time Updates

`app/SocketClient.tsx` maintains one Socket.io connection per browser tab and bridges server events to the rest of the app via DOM `CustomEvent`:

| Server event | DOM event dispatched | Who listens |
|---|---|---|
| `wallet-update` | `kk-wallet-update` | Wallet page — updates balance display instantly |
| `new-notification` | `kk-new-notification` | NotificationBell — bumps unread badge |
| `game-update` | `kk-game-update` | Player dashboard — patches `spotsRemaining` + `totalSlots` on matching game in state immediately |

The `game-update` event means every player on the browse page sees an accurate spot count the moment someone else registers — no waiting for the 20-second poll.

---

## Wallet & Payments

All fees are displayed in **rupees** on the UI but all API calls send and receive **paise** (Rs × 100).

### Top-up flow

1. Player taps "Top Up" → chooses amount
2. App calls `POST /api/v1/players/me/wallet/topup` → receives Razorpay `order_id`
3. Razorpay checkout opens in-browser
4. Player completes payment
5. Razorpay notifies backend via webhook
6. Backend credits wallet and emits `wallet-update` via Socket.io
7. `kk-wallet-update` DOM event updates the balance display immediately

### Game fee flow

- **Register** — fee locked from wallet; available balance decreases
- **Backout before cutoff** — full refund, locked amount released
- **Game cancelled by organiser** — automatic refund to all players
- **Game completed** — locked amount settled (no change to displayed balance)

---

## Screening / Streaming Events

A separate module for cinema-style and live-streaming events:

- Events listed at `/screening`
- Each event shows date, venue, ticket tiers, and availability
- Booking opens a Razorpay checkout
- After payment verification the backend issues a ticket with a QR token
- Players can view their bookings and ticket history at `/screening` (My Bookings tab)

---

## Deployment

### Environment (production)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.kasakai.in/api/v1
```

### Build

```bash
npm run build    # outputs to .next/
npm start        # starts the Next.js production server
```

### Azure Static Web Apps / App Service

- Set `NEXT_PUBLIC_API_BASE_URL` as an application setting in Azure Portal
- The app is fully SSR-capable (Next.js App Router); deploy to Azure App Service (Node runtime) for server-side rendering
- For static export (if no SSR features are used): `next export` outputs to `out/`

### CORS note

The production backend `CORS_ORIGIN` must include the deployed player app URL, e.g. `https://wwww.kasakai.in`.