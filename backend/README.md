# Kasakai Backend

Backend service for Kasakai, built with Express and MongoDB.

## Stack

- Node.js + Express 5
- MongoDB + Mongoose
- JWT authentication
- CORS + rate limiting + Helmet
- Nodemailer email notifications

## API Base

- Base path: `/api/v1`
- Health endpoint: `/health`

Main route groups:

- `/api/v1/auth`
- `/api/v1/players`
- `/api/v1/organisers`
- `/api/v1/admin`
- `/api/v1/games`
- `/api/v1/turfs`

## Scripts

- `npm run dev` - start dev server with Nodemon
- `npm start` - start production server
- `npm run lint` - run ESLint
- `npm test` - run Node test runner

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required/important keys:

- `PORT=5000`
- `NODE_ENV=development`
- `MONGO_URI=<your-mongodb-uri>`
- `JWT_SECRET=<strong-secret>`
- `CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002`
- `PLAYER_FRONTEND_URL=http://localhost:3000`

Email/SMTP keys:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Optional:

- `FAST2SMS_API_KEY`
- `ADMIN_LOGIN_EMAIL`

### 3. Run

```bash
npm run dev
```

## Production Checklist

- Set `NODE_ENV=production`
- Set strict `JWT_SECRET`
- Set real `MONGO_URI`
- Set all SMTP variables for email delivery
- Set exact `CORS_ORIGIN` values for deployed frontends

## Deployment

This repository includes Azure deployment workflow:

- `.github/workflows/main_kasakai-api.yml`

The workflow builds and deploys the `backend` folder to Azure Web App `kasakai-backend`.

## Project Structure

```text
backend/
  scripts/
  src/
    config/
    middlewares/
    models/
    modules/
    utils/
    app.js
    server.js
  .env.example
  package.json
```
