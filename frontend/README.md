# ReferGrow

Full-stack referral + BV income demo.

## Tech

- Next.js (App Router)
- Backend (Express) owns MongoDB + Mongoose
- JWT auth (email/password), stored in an httpOnly cookie
- Roles: `admin`, `user`

## Setup

1) Install dependencies

```bash
npm install
```

2) Create env file

Frontend does not connect to MongoDB.

Optionally set one of these to point the frontend API proxy at your backend:

- `BACKEND_API_BASE_URL` (server-only)
- `NEXT_PUBLIC_API_BASE_URL` (exposed to browser; only needed if you want non-default)

Default backend base is `http://localhost:4000`.

Quickstart:

```bash
cp .env.example .env.local
```

3) Start dev server

```bash
npm run dev
```

Open http://localhost:3000

## Deploy (Netlify)

This repo is a monorepo (`backend/` + `frontend/`). Netlify must build from the `frontend/` folder and use the Next.js runtime.

Required environment variables in your Netlify site:

- `BACKEND_API_BASE_URL`: the publicly reachable URL of your deployed backend (for example `https://api.example.com`).

Without this, the Next.js API proxy routes under `/api/*` cannot reach your backend in production.

## One-time admin bootstrap

Create the first admin (only works if no admin exists):

`POST /api/admin/setup`

Body:

```json
{
	"secret": "<ADMIN_SETUP_SECRET>",
	"email": "admin@example.com",
	"password": "very-strong-password"
}
```

Then sign in at `/login` using the same **email + password** (login does not accept user id).

The setup response includes the admin's `referralCode` — give that code to new users.

## Core flow

1) Admin creates an active rule

- `POST /api/admin/rules`
- `basePayoutPerBV`: Level-1 payout = `purchaseBV * basePayoutPerBV`
- Each next level gets half the previous level

2) Admin creates services

- `POST /api/admin/services` (each has a fixed `bv`)

3) Users register using a referral code

- `POST /api/auth/register` requires `referralCode` once at least one user exists.
- On a completely fresh database (0 users), `referralCode` can be omitted for the first signup.

4) User buys a service

- `POST /api/purchases` with `{ "serviceId": "..." }`
- Creates a purchase and writes `Income` entries to uplines (up to `maxLevels`)

## Notes

- The referral tree supports unlimited depth in the data model. The UI/API tree view is intentionally depth-limited for response safety.
- If your MongoDB doesn’t support transactions (common in local dev), the purchase + income write falls back to non-transactional writes.
