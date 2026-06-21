# Digivice — Engineering OS

> **Última atualização:** 2026-06-20
> **Status do Projeto:** `PRE-MVP — Setup de Infraestrutura`

---

## Navegação Principal

| Área | Arquivo | Descrição |
|------|---------|-----------|
| 🎯 Visão Geral | [[00-context/project-overview]] | Objetivos, Golden Path, restrições de negócio |
| 🛠️ Stack | [[00-context/tech-stack]] | Tecnologias, padrões de código, estrutura de pastas |
| 🧬 Domínio | [[02-domain/domain-model]] | Bounded Contexts, Entidades, Agregados (DDD) |
| 📋 Produto | [[01-product/PRD]] | User Stories, requisitos funcionais e não-funcionais |
| 🏛️ Decisões | [[04-architecture/decisions]] | ADRs — por que cada tecnologia foi escolhida |
| 🗄️ Dados | [[05-data/schema]] | Schema PostgreSQL, queries históricas e Read Models |
| 🔒 Segurança | [[06-security/security-model]] | RLS, LGPD, autenticação, proteção de dados |
| 📊 Observabilidade | [[08-observability/observability]] | Logs, métricas, alertas, runbooks |
| ✅ Tasks | [[03-specifications/tasks]] | Backlog completo com DoD por task |

---

## Status Rápido

### Próximas Tasks (P0)

- [ ] [[03-specifications/tasks#TASK-INFRA-001]] — Setup do repositório e tooling
- [ ] [[03-specifications/tasks#TASK-INFRA-002]] — Setup Supabase
- [ ] [[03-specifications/tasks#TASK-TEST-001]] — Setup Vitest + Playwright
- [ ] [[03-specifications/tasks#TASK-SEC-001]] — Consentimento LGPD *(requerido antes do go-live)*

### ADRs Pendentes de Decisão

- [ ] [[04-architecture/decisions#ADR-005]] — Formato de sprites (PNG vs Lottie)
- [ ] [[04-architecture/decisions#ADR-007]] — Estratégia de cache
- [ ] [[04-architecture/decisions#ADR-008]] — Push notifications

---

## Bounded Contexts do Domínio

```
Identity → Wellbeing Assessment → Digimon Care → Growth & Evolution
                                        ↑
                              GitHub Integration
```

Ver detalhes em [[02-domain/domain-model]].
