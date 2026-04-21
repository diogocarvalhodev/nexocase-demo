# NexoCase Demo

Security-Aware Incident Operations Platform Demo for Engineering, SRE, and Cybersecurity Portfolios.

## Overview

NexoCase Demo is a portfolio-safe version of an incident management platform designed for operational environments that need structured case intake, auditability, role-based workflows, and actionable visibility.

This public build is intentionally curated to demonstrate production-style engineering decisions without exposing sensitive commercial logic, customer data, or proprietary integrations.

## Problem

Operational teams often handle security events, infrastructure failures, and service-impacting incidents across multiple channels such as spreadsheets, email, chat, and manual logs. That creates slow response cycles, weak traceability, inconsistent classification, and poor historical visibility.

For teams moving toward reliability engineering or security operations, the missing layer is usually not just ticket creation. It is a structured operational workflow with authentication controls, role boundaries, audit logs, retention visibility, and reporting surfaces that make incidents reviewable and defensible.

## Solution

NexoCase Demo centralizes the incident lifecycle in a single platform:

- structured incident creation
- role-based validation and approval
- dashboard analytics for operational visibility
- activity logging and request tracing
- export and reporting workflows
- retention-aware health monitoring

The result is a realistic demo that behaves like an internal incident operations tool while remaining safe for public GitHub distribution.

## Demo Scope

This repository is a demo version intended for portfolio and interview use.

Included in this demo:

- synthetic users, schools, incidents, and logs auto-seeded on startup
- mocked outbound email behavior in demo mode
- local Docker-based setup with minimal configuration
- realistic observability and security controls already present in the application

Deliberately not included:

- real tenant or customer data
- real notification routing or SMTP credentials
- proprietary detection logic or commercial automation flows
- private deployment assumptions or customer-specific workflows

## Architecture

```text
Next.js frontend
                -> calls FastAPI backend through /backend
FastAPI backend
                -> handles auth, incident workflows, dashboard analytics, reporting, admin settings
PostgreSQL
                -> stores tenants, users, incidents, presets, audit logs, refresh sessions, configuration
```

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS, Recharts
- Database: PostgreSQL 15
- Auth: JWT, refresh token rotation, CSRF protection
- Infra: Docker Compose
- Document automation: Jinja2, WeasyPrint

## Security Perspective

Implemented controls already visible in the codebase include:

- JWT access tokens with token version invalidation
- refresh token rotation stored server-side
- CSRF protection for refresh/logout flows
- account lockout after repeated failed logins
- request-scoped tenant isolation
- rate limiting on sensitive routes
- hard security headers at the API layer
- audit retention scheduling and health reporting

## Local Run

### 1. Prepare environment

Copy the example environment file and keep the demo defaults:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Start the stack

```bash
docker compose up --build
```

### 3. Access the services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- OpenAPI docs: http://localhost:8000/docs
- Health endpoint: http://localhost:8000/health

## Vercel Showcase Mode

If you only want a portfolio showcase on Vercel without deploying the backend, use client-side synthetic data mode.

Set these Vercel environment variables:

- NEXT_PUBLIC_SHOWCASE_MODE=true
- NEXT_PUBLIC_DEMO_MODE=true
- NEXT_PUBLIC_DEFAULT_TENANT=default

Behavior in showcase mode:

- Login works with demo credentials using mocked responses
- Dashboard, filters, charts, and sidebar counters use synthetic data
- Report download returns a placeholder file
- No real backend dependency for core demo flows

## Deploy on Vercel

This is a Next.js frontend-only deploy using client-side synthetic data (showcase mode).

### 1. Import the repository in Vercel

- Create a new Vercel project and connect this GitHub repository.
- In the project settings, set **Root Directory** to `frontend`.

### 2. Set environment variables in Vercel

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SHOWCASE_MODE` | `true` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |
| `NEXT_PUBLIC_DEFAULT_TENANT` | `default` |

### 3. Deploy

- Vercel detects Next.js automatically with the `frontend/vercel.json` config.
- No backend required: all API calls are intercepted client-side in showcase mode.

### Notes

- Login works with demo credentials (see Demo Accounts section).
- Dashboard, charts, sidebar, and incident list use synthetic data.
- For full-stack deployment with a real backend, set `NEXT_PUBLIC_SHOWCASE_MODE=false` and configure `INTERNAL_API_URL` pointing to the deployed backend.

Recommended credentials for showcase mode:

- admin / admin
- demo.admin / DemoAdmin!234

## Demo Accounts

These users are auto-created when demo mode is enabled.

- Admin: demo.admin / DemoAdmin!234
- Operator: demo.operator / DemoOperator!234
- Director: demo.director / DemoDirector!234
- Incident Lead: demo.lead / DemoLead!234

## Repository Structure

```text
backend/
        app/
                models/
                routers/
                schemas/
                services/
                utils/
        alembic/

frontend/
        src/
                app/
                components/
                config/
                lib/
                types/

docs/
        PORTFOLIO_DEMO_STRATEGY.md

scripts/
```

## License

This repository includes a public demo version of the project for portfolio use. Review the existing license file before commercial reuse.
