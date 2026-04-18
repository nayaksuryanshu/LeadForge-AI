# LeadForge AI

LeadForge AI is a full-stack lead intelligence and outreach platform for finding local businesses, analyzing their AI opportunity gaps, and running personalized outreach campaigns.

It combines:
- Google Maps scraping for lead discovery
- CRM-style lead management with notes and Kanban workflow
- AI-powered website analysis using Groq
- AI-assisted email drafting with a two-step Generate -> Send flow
- Per-user data isolation and authenticated access

## Core Features

- Authentication and session management with JWT
- User profile with required business speciality
- Google Maps scraping with configurable max results and optional enrichment
- Lead pipeline statuses: new, contacted, qualified, lost
- Lead details modal with edit, delete, analyze, notes, and outreach actions
- Website analysis tailored by business speciality
- Email templates (default + editable)
- Two-step email workflow:
  - Generate draft first
  - Send draft after review
- Sent email log with delivery status and metadata
- Owner-scoped lead, note, and sent-email access

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Puppeteer scraping
- Nodemailer email delivery
- Groq chat completions for analysis and copy generation

### Frontend
- React
- Vite
- React Router
- Axios

## Monorepo Structure

```text
LeadForge AI/
  Backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    package.json
    server.js
  Frontend/
    src/
    public/
    package.json
    vite.config.js
  .gitignore
  README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB database (local or cloud)

## Environment Variables

Create Backend/.env with the following values.

### Required
- MONGODB_URI: MongoDB connection string
- JWT_SECRET: JWT signing secret

### Recommended / Optional
- PORT: Backend port (default: 5000)
- GROQ_API_KEY: Required for AI generation; fallback mode is used without it
- GROQ_MODEL: Analysis model (default resolves to llama-3.1-8b-instant)
- GROQ_EMAIL_MODEL: Optional override model for email generation
- FRONTEND_ORIGIN: Comma-separated allowed frontend origins for CORS (for example: https://lead-forge-ai-zeta.vercel.app,http://localhost:5173)
- BROWSERLESS_API_KEY: Required for scraping (Google Maps + website enrichment) through Browserless remote Chrome

### SMTP (Option 1)
- SMTP_HOST
- SMTP_PORT (default: 587)
- SMTP_USER
- SMTP_PASS
- SMTP_SECURE (true/false)
- SMTP_FROM or MAIL_FROM

### Resend SMTP (Option 2)
- RESEND_API_KEY
- RESEND_FROM or MAIL_FROM

If no SMTP credentials are configured, the app uses an Ethereal test account for development previews.

### Frontend env (optional)
Create Frontend/.env only if needed:
- VITE_API_BASE_URL

By default, Vite proxies /api to http://localhost:5000.

## Installation

From the repo root:

```bash
npm --prefix Backend install
npm --prefix Frontend install
```

## Run in Development

Start backend:

```bash
cd Backend
npm run dev
```

Start frontend in a second terminal:

```bash
cd Frontend
npm run dev
```

Open frontend at the Vite URL shown in terminal (typically http://localhost:5173).

## Build for Production

Frontend build:

```bash
cd Frontend
npm run build
npm run preview
```

Backend start:

```bash
cd Backend
npm start
```

## API Overview

Base URL: /api

### Auth
- POST /auth/register
- POST /auth/login
- GET /auth/me

### Scraper
- POST /scraper/start

Request body example:

```json
{
  "query": "restaurants in indore",
  "maxResults": 20,
  "headless": true,
  "enrich": false
}
```

### Leads
- GET /leads
- GET /leads/:id
- PATCH /leads/:id
- DELETE /leads/:id
- DELETE /leads/query/:scrapeQuery

### Notes
- GET /notes/:leadId
- POST /notes/:leadId

### AI Analysis
- POST /ai/analyze/:leadId

### Email
- GET /email/templates
- PUT /email/templates/:templateId
- GET /email/sent-emails
- POST /email/generate-email/:leadId
- POST /email/send-email/:leadId

## Two-Step Email Workflow

LeadForge AI now supports a strict two-step process:

1. Generate draft
- Endpoint: POST /email/generate-email/:leadId
- Produces subject/body using lead context, analysis, template, and business speciality
- Does not send email

2. Send draft
- Endpoint: POST /email/send-email/:leadId
- Accepts recipientEmail and optional draft payload:
  - subject
  - body
  - source
- Sends through configured SMTP provider and stores delivery result

If subject/body are not provided, backend can generate a draft server-side before sending. UI flow is configured as Generate first, Send second.

## Data Model Summary

### User
- name
- email
- password (hashed)
- role
- businessSpeciality

### Lead
- ownerId
- name
- location
- phone
- email
- website
- scrapeQuery
- status
- aiAnalysis
- aiGap
- lastAnalyzed

### Note
- leadId
- note

### EmailTemplate
- name
- subject
- body
- description
- isDefault
- createdBy

### SentEmail
- leadId
- userId
- templateId
- recipientEmail
- subject
- body
- status
- provider
- providerMessageId
- errorMessage
- sentAt

## Security and Privacy

- All protected routes require JWT bearer authentication
- Owner-based filtering ensures users only access their own leads and related records
- Sensitive files are ignored by root .gitignore
- Never commit Backend/.env or any API keys

## Troubleshooting

### Backend does not reflect recent code changes
- Stop all Node processes and restart backend once
- Ensure only one backend server instance is running on the configured PORT

### Analysis/email feels generic
- Confirm businessSpeciality is set in user profile
- Re-run lead analysis before generating email
- Verify GROQ_API_KEY is configured for AI generation

### Email not delivered
- Check SMTP or Resend credentials
- Review sent email status in /api/email/sent-emails
- In dev without SMTP, use Ethereal preview URL returned by nodemailer

### Frontend API errors (ECONNREFUSED)
- Ensure backend is running on http://localhost:5000
- Verify Vite proxy config in Frontend/vite.config.js

## Suggested Next Improvements

- Add pagination and filters for large lead sets
- Add retry policies and rate limiting for scraper and AI calls
- Add unit/integration tests for controllers and services
- Add Docker and CI pipeline for easier deployment

## License

No license file is currently defined in this repository. Add a LICENSE file before public distribution.
