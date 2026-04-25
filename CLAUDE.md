# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kasakai is a football event management platform — a monorepo with three independent Next.js 16 frontends and a Node.js/Express backend.

| App | Port | Audience |
|-----|------|----------|
| `user-frontend` | 3000 | Players — browse, join, pay for games |
| `organiser-portal` | 3001 | Organisers — create and manage games |
| `admin-portal` | 3002 | Admins — platform monitoring and settings |
| `kasakai-backend` | 5000 | REST API + Socket.io server |

## Commands

### Backend (`kasakai-backend/`)
```bash
npm run dev     # Start with nodemon (development)
npm start       # Production start
npm run lint    # ESLint
npm test        # Node native test runner
```

### Each Frontend (`user-frontend/`, `organiser-portal/`, `admin-portal/`)
```bash
npm run dev           # Dev server (organiser-portal hardcodes port 3001)
npm run dev:3000      # user-frontend explicit port (use this over npm run dev)
npm run build         # Production build
npm run lint          # ESLint
```

### Environment Setup
```bash
# Backend
cp kasakai-backend/.env.example kasakai-backend/.env
# Fill in: MONGO_URI, JWT_SECRET, CORS_ORIGIN, SMTP_*, RAZORPAY_*

# Each frontend — create .env with:
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

## Architecture

### Backend (`kasakai-backend/src/`)

Feature-based module structure — each module owns its controller and routes:

```
modules/auth/        Register, OTP verify, login, password reset
modules/game/        Game CRUD, registration, attendance, team assignment, ratings
modules/player/      Player profile, stats
modules/organiser/   Organiser profile, game management
modules/wallet/      Wallet balance, top-up, transactions
modules/notification/ In-app notifications
modules/webhook/     Razorpay payment webhooks
modules/admin/       Platform-wide admin controls
```

Key singleton files:
- `socket.js` — exports `getIo()`/`setIo()`; import this everywhere you need to emit events, not the server directly
- `services/notificationService.js` — the one place that writes to `Notification` model AND emits via Socket.io; always go through this for notifications

### Frontend (Next.js 16 App Router)

**⚠️ Next.js 16 has breaking changes from prior versions.** Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. APIs, conventions, and file structure may differ from training data.

All three frontends share the same patterns:
- Path alias `@/*` → `./src/*`
- `src/utils/api.ts` — API URL builder and localStorage session helpers; use these rather than raw `fetch`/`localStorage`
- `src/hooks/useAuthGuard.ts` — checks JWT validity and role, redirects unauthorized users; include in every protected page
- `src/app/SocketClient.tsx` (user-frontend/organiser-portal) — global Socket.io client initialized in root layout; reads token from localStorage and authenticates the socket connection

### Database Models

MongoDB via Mongoose. Key relationships:
- `Game` embeds a `registrations` array (players, position preferences, payment status, attendance) — no separate Registrations collection
- `Wallet` holds `balancePaise` (spendable) and `lockedPaise` (reserved for upcoming registered games); always work in paise (₹ × 100)
- Notifications are written to `Notification` model and emitted via Socket.io room named by user ID

## Key Patterns

### Authentication
JWT stored in localStorage. Registration requires phone + email + password, followed by OTP verification (6-digit, 10-minute TTL, sent via email). `auth.middleware.js` decodes the JWT and detects role by checking Player vs. Organiser model — the role field in the token determines which model to query.

### Game Lifecycle
Create → Open for registration → Players join (payment locks funds) → Organiser marks attendance post-game → Players submit feedback and ratings → Funds settled/refunded

### Payments (Razorpay)
Indian payment gateway. Wallet top-up flow: create Razorpay order → frontend opens checkout → Razorpay POSTs webhook to `/api/v1/webhooks/razorpay` → backend credits wallet. Always verify webhook signature before crediting.

### Real-time Notifications
Backend: `notificationService.js` creates DB record then calls `getIo().to(userId).emit('new-notification', ...)`. Frontend: `SocketClient.tsx` connects with `auth: { token }` and listens for `'new-notification'`. A hardcoded test notification fires 5 seconds after server startup — this is intentional for development testing.

### Team Distribution
`utils/teamDistributor.js` auto-assigns players to balanced teams based on position preferences and skill level. Called by the organiser when finalising team sheets.

### API Response Format
All backend responses go through `utils/response.js` — use its helpers to keep response shape consistent (`{ success, message, data }`).
