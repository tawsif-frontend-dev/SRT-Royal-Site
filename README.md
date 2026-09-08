# SRT Royal Design

**Live site:** https://srt-royal-site.vercel.app
[![CI](https://github.com/tawsifgaming373-bot/SRT-Royal-Site/actions/workflows/ci.yml/badge.svg)](https://github.com/tawsifgaming373-bot/SRT-Royal-Site/actions/workflows/ci.yml)

SRT Royal Design is a frontend development studio's personal portfolio, built as a full hiring platform: clients discover and hire frontend designers, projects move through a real workflow, payments split automatically between designer and platform, and completed work earns a public star rating. The owner runs everything from a dedicated admin portal.

---

## What it actually does

**For clients**
- Browse and search designers by skill, category, and rating
- Submit a hire request to a specific designer, or a general inquiry that auto-assigns the top-rated one
- Track project status end-to-end (pending → accepted → in progress → completed)
- Pay for a completed project and see the payment recorded
- Leave a star rating + written review once a project is done — reviews are what feed the "Developer Rating" shown on every designer's public profile and card
- Get notified when a request is accepted, a project moves forward, or a message arrives

**For designers**
- Apply with a professional profile (bio, skills, categories, pricing, portfolio)
- Profiles start `pending` and only appear publicly once an admin approves them — no unreviewed profile goes live
- Accept/reject hire requests, manage active projects
- Rating is calculated from real client reviews only, never fabricated

**For the owner (admin)**
- Separate admin portal (`/admin-portal.html`), gated by role — not just a hidden button on the client page
- Approve or reject designer applications
- Full visibility into every payment and the platform's revenue split (`/api/admin/revenue`)
- See every contact-form submission, hire request, project, and user in one place
- Review moderation

**Revenue model**
- Every completed payment splits 50% designer / 50% platform, calculated **only on the server** (`server/config/businessRules.js`) — a client can never influence the amount they're charged or how it's split by editing a request
- The amount charged is always pulled from the project's own record, never trusted from the browser
- No payment gateway is faked. Until a real one (bKash/Nagad/SSLCommerz) is wired up with verified webhooks, payments are recorded pending and confirmed manually by an admin — clearly labeled as such, never presented as a live transaction

---

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt
- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Security:** Helmet (real CSP, not disabled), rate limiting (stricter on auth endpoints), centralized error handling, server-side financial validation
- **Hosting:** Vercel (serverless), with its own static-file layer that mirrors Express's security headers and caching rules
- **Tests:** Node's built-in test runner + Supertest, against a real MongoDB (Docker service in CI, `mongodb-memory-server` locally)

## Architecture

```text
server.js                 Local dev entrypoint
api/index.js               Vercel serverless entrypoint (also serves /public directly)
server/app.js               Express app factory: security headers, rate limits, routes
server/config/               Env validation, centralized revenue-split rule
server/middleware/           Auth, role checks, input validation
server/models/                User, Designer, Project, HireRequest, Payment, Review, Notification, ContactMessage
server/routes/                 REST API, grouped by domain
server/services/                Email, notifications, payment-gateway abstraction
public/                          Frontend — portfolio, marketplace, dashboards
tests/                              Integration tests (real HTTP requests, real DB)
```

## Configuration

Copy `.env.example` to `.env`. Required for production:

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<at least 32 random characters>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-deployed-domain
RESEND_API_KEY=...
EMAIL_FROM="SRT Royal <noreply@yourdomain.com>"
OWNER_EMAIL=you@example.com
```

Production start-up refuses to boot without `MONGODB_URI` and a `JWT_SECRET` of at least 32 characters — it will not silently fall back to an insecure default.

### Create the first admin

Public sign-up never grants the admin role. Set `MONGODB_URI`, `ADMIN_NAME`, `ADMIN_EMAIL`, and a password of at least 12 characters in your shell, then run:

```bash
npm run create-admin
```

To intentionally promote an existing account after checking the email address, add `-- --promote-existing`. Do not put `ADMIN_PASSWORD` in a committed `.env` file.

## Development

```bash
npm install
npm run dev
```

Serves the site at `http://localhost:3000`. Local development doesn't require a database connection to boot, but most routes will fail without one.

## Testing

```bash
npm test
```

Runs real HTTP requests against the actual Express app and a real MongoDB instance — nothing is mocked at the route layer. CI runs this on every push against a `mongo:7` Docker service (see `.github/workflows/ci.yml`); locally it falls back to `mongodb-memory-server`, which downloads its own binary on first run.

Current coverage includes: auth flows, role-based access control, the developer-approval workflow (a pending designer is not publicly searchable; an approved one is), hire-request validation (an invalid designer ID is rejected, not silently reassigned), and the full payment/revenue-split path (tampered amounts are ignored, unconfigured gateways are rejected, only an admin can confirm a manual payment).

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, Google/GitHub OAuth |
| Users | `GET /api/users/me`, `PUT /api/users/profile`, `PATCH /api/users/password` |
| Designers | `GET /api/designers` (public, approved-only), `GET /api/designers/:id`, `POST/PATCH /api/designers/:id` |
| Hire requests | `GET/POST /api/hire-requests`, `PATCH /api/hire-requests/:id` |
| Projects | `GET /api/projects`, `GET /api/projects/:id`, status updates |
| Reviews | `GET/POST /api/reviews` — this is what powers designer ratings |
| Payments | `POST /api/payments` (amount always server-derived), `PATCH /api/payments/:id/confirm` (admin-only) |
| Admin | `/api/admin/users`, `/designers`, `/designers/:id/status` (approve/reject), `/hire-requests`, `/payments`, `/revenue`, `/contact-messages` |
| Notifications | `GET /api/notifications`, mark read |
| Health | `GET /api/health` |

All protected routes require `Authorization: Bearer <token>`. List endpoints accept `page`/`limit` (max 50).

## Security notes

- Every financial value (amount, developer share, platform share) is calculated server-side from `server/config/businessRules.js` — the single source of truth for the revenue split percentage
- Real Content-Security-Policy, not `contentSecurityPolicy: false`
- Auth endpoints (login/signup/password reset) have a dedicated stricter rate limit against brute-force attempts
- Designer profiles require admin approval before they're publicly visible or searchable
- Sensitive actions (admin routes, payment confirmation) check the role on the server via JWT, never trust a role sent from the browser

## Deployment

Live on Vercel, deployed from `main`. `api/index.js` handles both the API routes and serving `/public` directly (Vercel doesn't run Express's static middleware for non-API paths). Required environment variables are the same as local `.env`, set in the Vercel project settings.

## External requirements not yet configured

- A real payment gateway (bKash/Nagad/SSLCommerz) with verified webhook signature checking — payments currently require manual admin confirmation
- Cloud storage (Cloudinary/S3) for designer portfolio image uploads at scale
