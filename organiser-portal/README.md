# Kasakai Organiser Portal

Organiser-facing dashboard for creating and managing games, participants, and profile settings.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript

## Scripts

- `npm run dev` - start dev server on port 3001
- `npm run build` - create production build
- `npm run start` - run production build
- `npm run lint` - run ESLint

## Environment

Create `.env`:

```bash
NEXT_PUBLIC_APP_NAME=Kasakai Organiser Portal
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

## Local Run

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3001`

## Core Routes

- `/`
- `/login`
- `/dashboard`
- `/dashboard/organizer/[id]`
- `/dashboard/organizer/[id]/profile`

## Backend Integration

- Uses shared backend API at `/api/v1`.
- Requires valid organiser authentication token in local storage.
- Includes realtime-style dashboard/profile refresh on interval/focus/visibility.

## CORS Requirement

Ensure backend allows organiser origin in `CORS_ORIGIN`, for example:

```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

## Production Notes

- Set `NEXT_PUBLIC_API_BASE_URL` to deployed backend API URL.
- Run `npm run build` in CI before release.
- Keep organiser and backend versions in sync for dashboard features.
