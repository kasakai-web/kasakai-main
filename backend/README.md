# Backend Setup

This folder contains a scalable Node.js + Express backend starter structure.

## Scripts

- `npm run dev`: Start development server with auto-reload
- `npm start`: Start server in normal mode
- `npm run lint`: Run ESLint
- `npm test`: Run Node.js test suite

## Environment

Edit `.env` for local values.

### OTP Email Setup (GoDaddy)

Set these SMTP variables in `.env`:

- `SMTP_HOST=smtpout.secureserver.net`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=your-business-email@yourdomain.com`
- `SMTP_PASS=your-email-password`
- `SMTP_FROM=Kasa Kai <your-business-email@yourdomain.com>`

Registration OTP is now sent to email for both player and organiser flows.

## Folder Structure

```text
backend/
  docs/
  scripts/
  src/
    config/
    controllers/
    middlewares/
    models/
    routes/
    services/
    utils/
    validations/
    app.js
    server.js
  tests/
  .env
  .env.example
  package.json
```
