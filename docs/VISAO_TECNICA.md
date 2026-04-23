# Visão Técnica

## Arquitetura
```text
frontend (Next.js)
  -> proxy /backend
backend (FastAPI)
  -> routers + schemas + services
persistência (PostgreSQL)
  -> SQLAlchemy + Alembic
```

## Componentes
- Frontend: interface operacional, dashboard e fluxos por perfil
- Backend: autenticação, autorização, incidentes, relatórios, administração
- Banco: entidades de usuário, tenant, incidente, configuração e trilha de atividade

## Segurança implementada
- JWT de acesso com versão de token
- Refresh token com armazenamento e rotação
- CSRF para refresh/logout
- Account lockout configurável
- Rate limiting por rota/IP
- Cabeçalhos de segurança e CORS configurável
- Tenant scoping por requisição e token

## Observabilidade
- Middleware de requisição com correlação X-Request-ID
- Logs estruturados de latência e status HTTP
- Registro de eventos de autenticação e administração
- Endpoint /health com saúde da rotina de retenção
- Scheduler de retenção com metadados de última execução

## Qualidade de engenharia percebida
- Separação por camadas (routers, schemas, services, utils)
- Migrations versionadas com Alembic
- Configuração orientada a variáveis de ambiente
- Execução reproduzível por Docker Compose

## Trade-offs técnicos
- Modo demo acelera onboarding, mas não substitui validação em dados reais
- Compose simplifica execução local, mas abstrai aspectos de operação cloud
- Seed sintético melhora narrativa de demo, com menor fidelidade de volume real
