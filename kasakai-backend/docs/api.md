# API Notes

Base URL (local): `http://localhost:5000/api/v1`

## Health

- `GET /health`

## Auth

- `POST /auth/login`
  - Body: `{ "email": "user@example.com", "password": "secret" }`

## Users

- `GET /users`
- `POST /users`
  - Body: `{ "name": "Nisha", "email": "nisha@example.com" }`
