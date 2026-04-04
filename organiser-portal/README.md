# Organiser Portal

This app now contains organiser-only authentication and organiser dashboard flows migrated from the user frontend.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment in `.env`:

```bash
NEXT_PUBLIC_APP_NAME=Kasakai Organiser Portal
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

3. Start backend (from `backend`):

```bash
npm run dev
```

4. Start organiser portal (from `organiser-portal`):

```bash
npm run dev
```

The organiser portal runs on `http://localhost:3001`.

## Backend CORS

Make sure backend `CORS_ORIGIN` allows both frontends during local development:

```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

## Available Organiser Routes

- `/login`
- `/dashboard`
- `/dashboard/organizer/[id]`
- `/dashboard/organizer/[id]/profile`
