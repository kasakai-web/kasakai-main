# Kasakai Monorepo

Kasakai is a multi-app football event platform with separate experiences for players, organisers, and admins, backed by a shared Node.js API.

## Repositories In This Workspace

- `backend` - Express + MongoDB API (`/api/v1`)
- `user-frontend` - Player-facing Next.js app
- `organiser-portal` - Organiser-facing Next.js app
- `admin-portal` - Admin-facing Next.js app

## Tech Stack

- Backend: Node.js, Express 5, MongoDB (Mongoose), JWT, Nodemailer
- Frontend: Next.js 16 (App Router), React 19, TypeScript
- CI/CD: GitHub Actions, Azure Web App (backend)

## Local Development

### 1. Prerequisites

- Node.js 22+
- npm 10+
- MongoDB instance (local or hosted)

### 2. Install Dependencies

Run in each project folder:

```bash
cd backend && npm install
cd ../user-frontend && npm install
cd ../organiser-portal && npm install
cd ../admin-portal && npm install
```

### 3. Configure Environment

- Backend: copy `backend/.env.example` to `backend/.env` and fill values.
- Frontends: create `.env` in each frontend if you need custom API base URL.

Recommended frontend variable:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

### 4. Run Apps

In separate terminals:

```bash
# API
cd backend
npm run dev

# Player app (3000)
cd user-frontend
npm run dev:3000

# Organiser app (3001)
cd organiser-portal
npm run dev

# Admin app (recommended 3002 to avoid conflicts)
cd admin-portal
npm run dev -- -p 3002
```

## Production Build Commands

```bash
cd backend && npm run lint && npm test
cd ../user-frontend && npm run build
cd ../organiser-portal && npm run build
cd ../admin-portal && npm run build
```

## Deployment Notes

- Backend Azure workflow: `.github/workflows/main_kasakai-api.yml`
- Backend workflow triggers on changes under `backend/**` and deploys app `kasakai-backend`.
- Frontends can be deployed independently (for example on Vercel/Netlify/Azure Static Web Apps).

## API Base Paths

Backend serves:

- `/api/v1/auth`
- `/api/v1/players`
- `/api/v1/organisers`
- `/api/v1/admin`
- `/api/v1/games`
- `/api/v1/turfs`

Health endpoint:

- `/health`

## Documentation Per App

- See `backend/README.md`
- See `user-frontend/README.md`
- See `organiser-portal/README.md`
- See `admin-portal/README.md`
