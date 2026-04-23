# NexoCase Demo

Security-aware incident operations demo designed to make backend and full stack engineering capabilities immediately visible in hiring and technical screening.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel)](https://nexocase-demo.vercel.app/)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![Interview Ready](https://img.shields.io/badge/Portfolio-Interview%20Ready-success)

Live demo: https://nexocase-demo.vercel.app/

License: non-commercial technical evaluation is permitted (clone, build, and local run). Reuse, redistribution, and commercial usage require prior written authorization. See [LICENSE](LICENSE).

Portuguese version: [README.md](README.md)

## 30-second scan

### Business problem
Operational and security teams often manage incidents across fragmented channels (spreadsheets, chat, email), which slows response cycles and weakens auditability.

### Proposed solution
NexoCase centralizes the incident lifecycle into a single workflow: structured intake, role-based triage, validation, audit trail, and reporting.

### Operational impact
- Faster response through standardized operational flow
- Stronger governance through traceability and retention visibility
- Lower operational risk with secure session controls and tenant boundaries

### Architecture summary
```text
Next.js frontend
  -> /backend
FastAPI backend
  -> SQLAlchemy + Alembic
PostgreSQL 15
```

### Stack
- Backend: FastAPI, SQLAlchemy 2, Alembic, Pydantic
- Frontend: Next.js 14, React 18, TypeScript, Tailwind
- Database: PostgreSQL 15
- Security: JWT, rotating refresh tokens, CSRF, rate limiting, account lockout
- Infra: Docker Compose

## Engineering evidence

### Security implementation
- Access JWT with token-version invalidation strategy
- Server-side refresh token persistence and rotation
- CSRF protection for refresh/logout session boundaries
- Account lockout after repeated failed login attempts
- Per-route and per-IP rate limiting middleware
- API security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Tenant isolation at request scope and token validation layers

### Observability implementation
- Request correlation with X-Request-ID in API responses
- Structured request logging (method, path, status, latency, IP)
- Authentication and administrative activity logs
- Health endpoint with retention routine status
- Automated audit-retention routine with execution metadata

### Architecture decisions and trade-offs
- Monorepo split by frontend/backend to show end-to-end ownership
- Demo mode with synthetic seed data for safe public portfolio usage
- Security controls enabled by default in local setup for technical credibility
- Docker Compose for reproducibility, trading off full cloud deployment complexity
- Modular backend layers (routers/schemas/services/utils) for maintainability

## What I delivered as an engineer

- Reproducible full stack architecture that can be validated locally in minutes.
- Security-first authentication lifecycle aligned with real operational constraints.
- Actionable observability with request correlation and operational health signals.
- Layered backend structure that supports maintainability and controlled evolution.
- Interview-ready product narrative with a 90-second walkthrough flow.

## 90-second demo flow

### 0-20s
Log in as admin, open the dashboard, and highlight severity and trend visibility.

### 20-45s
Switch to operator, create or review an incident, and show structured intake fields.

### 45-65s
Switch to lead/director, validate or reject an incident, and demonstrate role boundaries.

### 65-90s
Open /health and close with governance signals (retention + traceability).

## Quick run

```powershell
Copy-Item .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Demo accounts
- admin / admin
- demo.admin / DemoAdmin!234
- demo.operator / DemoOperator!234
- demo.lead / DemoLead!234
- demo.director / DemoDirector!234

## Interview-ready checklist

Quick checklist for recruiters and interviewers to validate in a few minutes:

- [ ] Application starts with a single command: docker compose up --build
- [ ] Login, refresh, and logout flows work with session cookies and CSRF
- [ ] Account lockout is triggered after repeated failed attempts
- [ ] Rate limiting returns HTTP 429 when the threshold is exceeded
- [ ] X-Request-ID header is present in API responses
- [ ] /health returns service status and retention signals
- [ ] Role-based flow (operator x leadership x admin) is demonstrable
- [ ] Alembic migrations and modular backend structure are traceable

## Documentation map

- [docs/README.md](docs/README.md)
- [docs/VISAO_EXECUTIVA.md](docs/VISAO_EXECUTIVA.md)
- [docs/VISAO_TECNICA.md](docs/VISAO_TECNICA.md)
- [docs/ROADMAP_CURTO.md](docs/ROADMAP_CURTO.md)

## License

Public portfolio/demo usage under [LICENSE](LICENSE). Review legal requirements before commercial reuse.
