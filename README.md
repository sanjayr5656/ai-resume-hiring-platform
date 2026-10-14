# Hirewise — Smart Resume Screener

A two-sided hiring platform built with Express, MongoDB, React, and Gemini. The original `Candidate` collection and `/api/process` + `/api/candidates` screening API remain available for existing records. The marketplace uses separate `User`, `Job`, and `Application` collections; no legacy records are deleted or migrated.

## Run on Windows

Prerequisites: Node.js 18+, MongoDB running locally or a MongoDB connection string, and a Gemini API key for resume extraction and job skill suggestions.

1. In PowerShell, from the project folder, copy `.env.example` to `.env` and set a private `JWT_SECRET`, `MONGO_URI`, and `LLM_API_KEY`.
2. Install backend packages: `npm install`
3. (Optional) Add demo recruiter, candidate, and two jobs: `npm run seed`. Both accounts use `DemoPass123!`.
4. Start the API: `npm start` (binds to `0.0.0.0` at `PORT`, default 3000).
5. In a second PowerShell window: `cd frontend; npm install; npm run dev -- --host 0.0.0.0`.
6. For phone access, create `frontend/.env` with `VITE_API_URL=http://YOUR-PC-LAN-IP:3000` (no `/api` suffix), then restart Vite. Open the Vite network URL from the phone. The Vite page and API must be reachable through Windows Firewall on your private network.

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | API listening port | `3000` |
| `MONGO_URI` | MongoDB connection | required |
| `LLM_API_KEY` | Gemini API key | required for AI routes |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-3.8-flash` |
| `JWT_SECRET` | Signs seven-day auth tokens | required; set a long random value |
| `DUPLICATE_THRESHOLD` | Near duplicate Jaccard threshold from 0 to 1 | `0.85` |
| `VITE_API_URL` | Frontend API origin, set in `frontend/.env` | `http://localhost:3000` |

## Test checklist

1. **Auth and roles:** Register a candidate and recruiter; verify duplicate email and invalid inputs fail; login, refresh, logout; candidate-only and recruiter-only views/API calls reject the other role. Check `/api/auth/me` with `Authorization: Bearer <token>`.
2. **Jobs:** Create, edit with `PUT /api/jobs/:id`, and close a recruiter job; search `/api/jobs?search=...` as a candidate; confirm closed jobs disappear. Required weights must sum to 100. `POST /api/recruiter/extract-skills` optionally extracts skill lists.
3. **Applications and fit:** Apply to an open role with one PDF (`resume` multipart field, maximum 8 MB), check matched/missing skills, then attempt a second application and confirm HTTP 409. View My Applications and a fit report.
4. **Ranking:** Apply with multiple candidate accounts; use `GET /api/recruiter/jobs/:id/applicants?status=applied&minScore=40`; confirm scores sort descending and explain component/reason fields.
5. **Proof:** Upload a PDF/image or HTTPS credential link to `/api/jobs/applications/:applicationId/certifications/:certificationId/proof`; verify/reject as the owning recruiter and confirm the updated score. Proof access is checked against the candidate/recruiter owner.
6. **Duplicates:** Apply with an identical PDF, matching contact data, and similar text; call `POST /api/recruiter/jobs/:id/duplicates`; confirm only flagged groups are returned and no application is automatically rejected.
7. **Responsive UI and LAN:** Check job browse/apply, status tracking, recruiter applicant review, loading/empty/error states, and narrow mobile layout. Use `VITE_API_URL` set to the PC LAN address and confirm requests from a phone reach the API.

## API overview

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Jobs: `GET /api/jobs`, `GET /api/jobs/:id`, recruiter `POST/PUT /api/jobs`, `POST /api/jobs/:id/close`, candidate `POST /api/jobs/:id/apply`, `GET /api/jobs/my/applications`
- Recruiter: `GET /api/recruiter/jobs/:id/applicants`, `PATCH /api/recruiter/applications/:id/status`, proof verification/access, `POST /api/recruiter/jobs/:id/duplicates`
- Legacy screening: `POST /api/process`, `GET /api/candidates`

Uploaded resumes are currently retained as extracted text and original filename, not persisted as downloadable resume files. Certification proof bytes are stored with the application for authenticated serving. Keep `.env` private.
