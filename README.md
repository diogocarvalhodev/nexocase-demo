# NexoCase Demo

Plataforma demo de operações de incidentes com foco em segurança, governança e execução full stack.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel)](https://nexocase-demo.vercel.app/)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![Interview Ready](https://img.shields.io/badge/Portfolio-Interview%20Ready-success)

Demo online: https://nexocase-demo.vercel.app/

Licença: uso permitido para avaliação técnica não comercial (clone, build e execução local). Reuso, redistribuição e uso comercial exigem autorização prévia por escrito. Consulte [LICENSE](LICENSE).

Versão em inglês: [README.en.md](README.en.md)

## Triagem em 30 segundos

### Problema de negócio
Times de operação e segurança lidam com incidentes em canais fragmentados (planilha, chat, e-mail), gerando lentidão de resposta, baixa rastreabilidade e dificuldade de auditoria.

### Solução proposta
NexoCase centraliza o ciclo de incidente em um fluxo único: abertura estruturada, triagem por perfil, validação, auditoria e relatórios.

### Impacto operacional
- Menor tempo de resposta com fluxo padronizado
- Maior governança com trilha auditável e políticas de retenção
- Menor risco operacional com controles de autenticação e isolamento por tenant

### Arquitetura resumida
```text
Next.js (frontend)
  -> /backend
FastAPI (API)
  -> SQLAlchemy + Alembic
PostgreSQL 15
```

### Stack
- Backend: FastAPI, SQLAlchemy 2, Alembic, Pydantic
- Frontend: Next.js 14, React 18, TypeScript, Tailwind
- Banco: PostgreSQL 15
- Segurança: JWT, refresh token com rotação, CSRF, rate limit, account lockout
- Infra: Docker Compose

## Como rodar

### 1. Preparar ambiente
```powershell
Copy-Item .env.example .env
```

### 2. Subir aplicação
```bash
docker compose up --build
```

### 3. Endpoints
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Contas de demo
- admin / admin
- demo.admin / DemoAdmin!234
- demo.operator / DemoOperator!234
- demo.lead / DemoLead!234
- demo.director / DemoDirector!234

## Fluxo de demo em 90 segundos

### 0-20s
Entrar com demo.admin, abrir dashboard e mostrar volume, severidade e tendência de incidentes.

### 20-45s
Entrar com demo.operator, criar ou revisar incidente para evidenciar formulário estruturado e classificação.

### 45-65s
Entrar com demo.director ou demo.lead, validar/rejeitar incidente para mostrar controle por papel.

### 65-90s
Mostrar /health e trilhas administrativas para reforçar observabilidade, retenção e governança.

## Provas de engenharia

### Segurança implementada
- JWT com versão de token para invalidação de sessões antigas
- Refresh token persistido e rotacionado no servidor
- CSRF por dupla validação (cookie + header) nas rotas sensíveis de sessão
- Bloqueio de conta após tentativas de login inválidas
- Rate limiting por rota e por IP em middleware
- Cabeçalhos de segurança na API (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- Isolamento por tenant no escopo da requisição e validação de tenant no token

### Observabilidade
- Correlação por requisição com X-Request-ID em todas as respostas
- Logging estruturado de requisição (método, path, status, latência, IP)
- Logs de atividade de autenticação e operações administrativas
- Endpoint /health com estado da rotina de retenção
- Rotina automática de retenção de auditoria com metadados da última execução

### Decisões arquiteturais e trade-offs
- Monorepo com frontend e backend separados: simplifica onboarding e demonstra ownership full stack
- Modo demo com seed sintético: acelera avaliação técnica sem depender de dados sensíveis
- Segurança ativa por padrão em ambiente local: aumenta credibilidade técnica para entrevista
- Docker Compose para reprodução rápida: trade-off de não refletir toda a complexidade de deploy cloud
- API modular por routers/schemas/services: melhora a manutenção, com custo de mais arquivos e disciplina de padrão

## O que eu entreguei como engenheiro

- Estruturei uma arquitetura full stack reproduzível em ambiente local com Docker Compose para acelerar onboarding técnico.
- Implementei autenticação com foco em segurança operacional (JWT + refresh token rotativo + CSRF + lockout + rate limit).
- Criei trilhas de observabilidade acionáveis (X-Request-ID, logs de requisição, health com status de retenção).
- Mantive separação clara por camadas no backend (routers, schemas, services, utils), favorecendo manutenção e evolução.
- Entreguei fluxo de demonstração em 90 segundos para validação rápida por recrutador, tech lead e stakeholder de produto.

## Pronto para entrevista técnica

Checklist rápido para recrutador e entrevistador validar em poucos minutos:

- [ ] Aplicação sobe com um comando: docker compose up --build
- [ ] Login, refresh e logout funcionam com cookies de sessão e CSRF
- [ ] Bloqueio de conta ocorre após tentativas inválidas repetidas
- [ ] Limite de taxa retorna HTTP 429 quando estourado
- [ ] Cabeçalho X-Request-ID presente nas respostas da API
- [ ] Endpoint /health retorna estado de saúde e dados de retenção
- [ ] Fluxo por perfil (operador x liderança x admin) pode ser demonstrado
- [ ] Migrações Alembic e estrutura modular de backend são rastreáveis

## Estrutura de documentação (padrão)

- [docs/README.md](docs/README.md)
- [docs/VISAO_EXECUTIVA.md](docs/VISAO_EXECUTIVA.md)
- [docs/VISAO_TECNICA.md](docs/VISAO_TECNICA.md)
- [docs/ROADMAP_CURTO.md](docs/ROADMAP_CURTO.md)

## Licença

Uso público para portfólio/demo conforme [LICENSE](LICENSE). Avalie requisitos legais antes de reutilização comercial.