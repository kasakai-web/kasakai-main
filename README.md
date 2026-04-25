# Kasakai Monorepo

Kasakai is a multi-app football event platform with separate experiences for players, organisers, and admins. The backend API now lives in a separate repository, while this workspace contains the three Next.js frontends.

## Repositories In This Workspace

- `user-frontend` - Player-facing Next.js app
- `organiser-portal` - Organiser-facing Next.js app
- `admin-portal` - Admin-facing Next.js app

## Tech Stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- API: External Node.js / MongoDB service exposed at `/api/v1`
- CI/CD: Frontend builds in GitHub Actions or host-specific pipelines

## Local Development

### 1. Prerequisites

- Node.js 22+
- npm 10+
- Access to the deployed backend API or a local backend running on port 5000

### 2. Install Dependencies

Run in each project folder:

```bash
cd backend && npm install
cd ../user-frontend && npm install
cd ../organiser-portal && npm install
cd ../admin-portal && npm install
```

### 3. Configure Environment

- Create `.env` in each frontend if you need a custom API base URL.

Recommended frontend variable:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

### 4. Run Apps

In separate terminals:

```bash
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
cd ../user-frontend && npm run build
cd ../organiser-portal && npm run build
cd ../admin-portal && npm run build
```

## Deployment Notes

- Frontends can be deployed independently (for example on Vercel/Netlify/Azure Static Web Apps).
- Backend deployment is handled in the separate API repository.

## API Base Paths

Backend API serves:

- `/api/v1/auth`
- `/api/v1/players`
- `/api/v1/organisers`
- `/api/v1/admin`
- `/api/v1/games`
- `/api/v1/turfs`

Health endpoint:

- `/health`

## Documentation Per App

- See `user-frontend/README.md`
- See `organiser-portal/README.md`
- See `admin-portal/README.md`
