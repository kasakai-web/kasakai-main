# Kasakai — Football Event Management Platform

Kasakai is a full-stack platform for organising and playing recreational football games. It is split into **three independent Next.js frontends** (players, organisers, admins) and a **Node.js / Express / MongoDB backend** with real-time Socket.io support and Razorpay-powered wallets.

This repository (`Kasakai/`) holds the three frontends. The backend lives in a separate repository (`kasakai-backend/`).

---

## Table of Contents

- [System Overview](#system-overview)
- [The Four Components](#the-four-components)
- [Tech Stack](#tech-stack)
- [Feature Matrix](#feature-matrix)
- [Architecture](#architecture)
- [Core Domain Model](#core-domain-model)
- [Key Flows](#key-flows)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Production Build & Deployment](#production-build--deployment)
- [Per-App Documentation](#per-app-documentation)
- [Roadmap](#roadmap)

---

## System Overview

| App | Port | Audience | Repo / Folder |
|-----|------|----------|---------------|
| **user-frontend** | 3000 | Players — browse, join, pay for games | `Kasakai/user-frontend` |
| **organiser-portal** | 3001 | Organisers — create & manage games, rate players, distribute teams | `Kasakai/organiser-portal` |
| **admin-portal** | 3002 | Admins — monitor users, finance, feedback, settings | `Kasakai/admin-portal` |
| **kasakai-backend** | 5000 | REST API + Socket.io server | separate repo |

All three frontends talk to the same backend at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:5000/api/v1`).

---

## The Four Components

### 1. Player app (`user-frontend`, :3000)
Players browse open/confirmed games, register (fee locked from wallet), add/remove guests, join/leave waitlists, opt out and back in, top up their wallet via Razorpay, and submit post-game feedback (game / organiser / venue ratings). Shareable join links open a game directly.

### 2. Organiser portal (`organiser-portal`, :3001)
Organisers create games (with alternate formats), manage registrations and the waitlist, mark attendance, **rate each player** (conduct + gameplay + GK affinity + position + play-with/against preferences), **auto-distribute balanced teams**, and copy a shareable game summary + registration link.

### 3. Admin portal (`admin-portal`, :3002)
Admins see all users and organisers (with profile photos), player wallets, organiser earnings, games, payments, feedback, and notifications. They can adjust wallets, approve/suspend organisers, manage player passes, and configure **wallet recharge offers**.

### 4. Backend API (`kasakai-backend`, :5000)
Express + MongoDB + Socket.io. Owns auth/OTP, the game lifecycle, wallet & Razorpay payments, notifications, ratings/feedback, team distribution, and admin operations. See `kasakai-backend/README.md` for the full API reference.

---

## Tech Stack

- **Frontends:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 + CSS Modules, Motion, Lucide icons, Socket.io client
- **Backend:** Node.js, Express 5, Mongoose 9 (MongoDB), JWT auth, Socket.io 4, Razorpay 2.9, Nodemailer (SMTP), AiSensy (WhatsApp OTP), Helmet, express-rate-limit
- **Money:** all amounts stored in **paise** (₹ × 100) to avoid floating-point errors

---

## Feature Matrix

### Player (user-frontend)
- Browse open / confirmed games with live spot counts
- Register (wallet fee lock), add/remove guests, cancel with auto-refund
- Waitlist: standard + guest waitlist + opted-out rejoin
- Opt out of attending (guests stay) / opt back in
- Wallet top-up via Razorpay; balance, locked funds, transaction history
- **Post-game feedback modal** (redesigned: high-contrast UI, mobile bottom-sheet) — rate game, organiser, venue + tags + private comment
- **Shareable join links** open the exact game (`/join/<name>-<date>-<id>`)

### Organiser (organiser-portal)
- Create / edit games (15-min time slots, alternate formats, reporting time)
- Manage registrations, guests, and the waitlist (approve, confirm)
- Mark attendance post-game
- **Rate players** — conduct, gameplay, GK affinity, preferred position, play-with / play-against (no default values; only real ratings are saved)
- **Auto team distribution** — balances by gameplay skill, GK affinity, position, and player preferences
- **Copy List** — shareable game summary + readable registration link

### Admin (admin-portal)
- **All Users / Organisers** tables with **profile photos** (click to enlarge in a lightbox)
- Player rating shown as **separate Conduct & Gameplay columns** (real averages only)
- **Finance**: player wallets, organiser earnings, manual wallet adjustment
- **Wallet Recharge Offers** — configurable flat bonus per recharge tier (₹500–999, ₹1000–1499, ₹1500–1999, ₹2000+), enable/disable toggle
- **Feedback** — player→platform & organiser→player tabs, filterable by organiser, turf, **game (name + date)**, and date range
- Games, payments, notifications log
- Organiser approval / suspension, player pass management

---

## Architecture

```
┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐
│  user-frontend  │   │ organiser-portal │   │  admin-portal  │
│      :3000      │   │      :3001       │   │     :3002      │
└────────┬────────┘   └────────┬─────────┘   └───────┬────────┘
         │                     │                     │
         └──────────── NEXT_PUBLIC_API_BASE_URL ──────┘
                              │  (HTTPS REST + Socket.io)
                    ┌─────────▼──────────┐
                    │  kasakai-backend   │  Express 5 + Socket.io
                    │       :5000        │
                    └─────────┬──────────┘
                  ┌───────────┼────────────┐
              ┌───▼───┐  ┌─────▼─────┐  ┌───▼────┐
              │MongoDB│  │  Razorpay │  │  SMTP  │
              └───────┘  └───────────┘  └────────┘
```

**Shared frontend conventions (all three apps):**
- Path alias `@/*` → `./src/*`
- `src/utils/api.ts` — API URL builder + localStorage session helpers (use these, not raw `fetch`/`localStorage`)
- `src/hooks/useAuthGuard.ts` — JWT + role check; include on every protected page
- `src/app/SocketClient.tsx` (user/organiser) — global Socket.io client, authenticates with the JWT and listens for `new-notification` / `wallet-update`

> **Next.js 16 note:** APIs and conventions differ from older versions. Read the guide in each app's `node_modules/next/dist/docs/` before writing Next.js code.

---

## Core Domain Model

- **Game** embeds its `registrations[]`, `waitlist[]`, and `guestWaitlist[]` (no separate collection). Holds format, fee, schedule, status, and team assignments.
- **Wallet** holds `balancePaise` (spendable) and `lockedPaise` (reserved for upcoming games). Always work in paise.
- **WalletTransaction** records every money movement: `topup`, `debit`, `refund`, `bonus`, `lock`, etc.
- **PlayerRating** — one per (player, game): organiser's `conductRating`, `gameplayRating`, `gkAffinity`, position, play-with/against.
- **GameFeedback** — one per (player, game): player's game/organiser/venue ratings + tags + comment.
- **AdminSetting** — key/value config store with change history (e.g. `wallet_recharge_offers`).

---

## Key Flows

### Game lifecycle
`Create → Open for registration → Players join (wallet locks fee) → Organiser confirms → Attendance marked post-game → Players rate (feedback) & organiser rates players → Funds settled / refunded`

### Confirmation algorithm (auto-pilot) — spec §3.1–3.3
A background engine reviews each game at two organiser-set **check times** and, based on player count vs the
main/alternate format minimums, **confirms, switches format, or cancels** — automatically (if the organiser
enabled automation) or by prompting them (WhatsApp + in-app + dashboard pop-up). Players choose **Yes/No to
format changes** at signup; on a switch, "No" players are opted out + refunded. **SOS** invites the venue's
regulars (rule-based). Off by default (`GAME_LIFECYCLE_LIVE=true` to enable). Full reference:
`kasakai-backend/docs/PART3_LIFECYCLE_HANDOFF.md`.

### Wallet recharge + offer bonus
`Player tops up via Razorpay → webhook/verify credits base amount → if a recharge offer is enabled, the tier bonus is added to the in-app wallet (never a bank account) → player notified`

### Team distribution
Organiser triggers distribution. The algorithm pulls each player's **average gameplay rating** (skill), **GK affinity**, **position**, and **play-with/against** preferences, then balances two teams by skill, GK, and position. Unrated players / guests contribute 0 skill (no fabricated defaults).

---

## Local Development

### Prerequisites
- Node.js 22+, npm 10+
- A running backend on port 5000 (or access to the deployed API)

### Install
```bash
# backend (separate repo)
cd kasakai-backend && npm install

# frontends
cd Kasakai/user-frontend   && npm install
cd ../organiser-portal     && npm install
cd ../admin-portal         && npm install
```

### Run (separate terminals)
```bash
# Backend (5000)
cd kasakai-backend && npm run dev

# Player app (3000)
cd Kasakai/user-frontend && npm run dev:3000

# Organiser app (3001)
cd Kasakai/organiser-portal && npm run dev

# Admin app (3002)
cd Kasakai/admin-portal && npm run dev
```

---

## Environment Variables

**Each frontend** — create `.env`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

**Backend** — see `kasakai-backend/.env.example` (MONGO_URI, JWT_SECRET, CORS_ORIGIN, SMTP_*, RAZORPAY_*, AISENSY_*).

---

## Production Build & Deployment

```bash
cd Kasakai/user-frontend   && npm run build
cd ../organiser-portal     && npm run build
cd ../admin-portal         && npm run build
```

- Each frontend deploys independently (Vercel / Netlify / Azure Static Web Apps).
- **Pushing to GitHub does not redeploy** a running app — trigger the host's build, then hard-refresh to clear the cached bundle.
- Backend deploys from its own repository.

---

## Per-App Documentation

- [`user-frontend/README.md`](user-frontend/README.md)
- [`organiser-portal/README.md`](organiser-portal/README.md)
- [`admin-portal/README.md`](admin-portal/README.md)
- Backend: `kasakai-backend/README.md`

---

## Roadmap

Planned next phase (in progress / upcoming):

### WhatsApp integration (AiSensy)
- Generalised template sender (beyond OTP)
- Triggered notifications: game confirmation, cancellation, format change, pre-game reminder
- Acknowledge button in WhatsApp linking back to the app
- Community group posting on sign-up changes (organiser-initiated)

### SOS (last-minute player fill)
- SOS trigger on the game page for organisers
- Push + WhatsApp notification to an eligible SOS pool (recent-attendance based + manual selection)
- One-tap "I'm in" acceptance

### Game confirmation / cancellation / modification
- Configurable threshold-based confirmation
- Format-change trigger with player opt-out
- Auto-cancellation below the minimum with immediate wallet refund
- Organiser override cancellation
- Post-modification opt-out without penalty

> Requires shared scheduler/cron infrastructure (pre-game reminders, cutoff auto-cancellation) and WhatsApp template approval (Meta-side lead time).
