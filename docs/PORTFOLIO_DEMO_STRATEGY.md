# Portfolio Demo Strategy

## Objective

This repository is intentionally curated as a public-facing demo for software engineering, SRE, and cybersecurity-oriented roles. The goal is to demonstrate strong backend design, operational thinking, monitoring-aware workflows, and secure system behavior without exposing private business assumptions or commercial implementation details.

## What Stays In The Demo

- Multi-service architecture with FastAPI, Next.js, PostgreSQL, and Docker
- Incident lifecycle management with role-aware workflows
- Audit logging, request tracing, and retention health visibility
- Dashboard analytics for incident volume, severity, geography, and operator activity
- Document generation as an example of workflow automation
- Security controls already present in the codebase: JWT rotation, CSRF protection, rate limiting, account lockout, tenant scoping, security headers

## What Was Simplified Or Mocked

- SMTP delivery is simulated in demo mode to avoid real external email dependencies
- Synthetic demo users and incidents are auto-seeded at startup for a zero-friction walkthrough
- Example locations, categories, and impact levels are portfolio-oriented and not tied to any private customer deployment
- Demo credentials are intentionally public and scoped only to the local demo environment

## What Should Stay Out Of A Public Portfolio Build

- Real tenants, customer names, internal terminology, or actual operational locations
- Production secrets, SMTP credentials, export targets, or customer-specific notification routing
- Proprietary detection heuristics, internal scoring models, or downstream commercial integrations
- Infrastructure assumptions that reveal private network ranges, VPN design, or client-specific access controls

## Feature Curation

The most compelling recruiter-facing path is:

1. Log in as Admin and show dashboard and admin observability surfaces.
2. Log in as Operator and create or review incidents.
3. Log in as Director and demonstrate validation or rejection flow.
4. Show health endpoint, retention visibility, audit logs, and role-aware access boundaries.