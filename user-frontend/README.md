# Kasakai User Frontend

Player-facing web app for browsing, joining, and managing football games.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript

## Scripts

- `npm run dev` - run local dev server
- `npm run dev:3000` - run on port 3000
- `npm run build` - create production build
- `npm run start` - run production build
- `npm run lint` - run ESLint

## Environment

Create `.env` and set API URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

Fallback behavior in code supports `/api/v1` proxy style if env is omitted, but explicit `NEXT_PUBLIC_API_BASE_URL` is recommended for production.

## Local Run

```bash
npm install
npm run dev:3000
```

Open:

- `http://localhost:3000`

## Core Routes

- `/`
- `/login`
- `/dashboard`
- `/dashboard/player/[id]`
- `/dashboard/player/[id]/profile`
- `/dashboard/player/[id]/wallet`
- `/dashboard/player/[id]/notifications`
- `/join/[gameId]`

## Production Notes

- Ensure backend CORS allows this domain.
- Ensure `NEXT_PUBLIC_API_BASE_URL` points to deployed backend `/api/v1`.
- Run `npm run build` in CI before deployment.

## Deployment

This app can be deployed to any Next.js-compatible host (Vercel, Azure, etc.).
