# Kasakai Admin Portal

Admin-facing app for monitoring and managing platform data (players, organisers, games, and payments).

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript

## Scripts

- `npm run dev` - start dev server (default Next.js port)
- `npm run build` - create production build
- `npm run start` - run production build
- `npm run lint` - run ESLint

## Environment

Create `.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

## Local Run

```bash
npm install
npm run dev -- -p 3002
```

Recommended local URL:

- `http://localhost:3002`

## Core Routes

- `/`
- `/login`
- `/dashboard`

## Backend Integration

- Uses backend admin APIs under `/api/v1/admin`.
- Requires admin auth token/session.

## Production Notes

- Set `NEXT_PUBLIC_API_BASE_URL` to deployed backend API URL.
- Ensure backend CORS includes admin portal domain.
- Build before deploy using `npm run build`.
