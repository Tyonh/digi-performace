# Observability — Digivice

> **Status:** `DRAFT`
> **Última atualização:** 2026-06-20
> **Relacionado:** [[04-architecture/decisions]] | [[06-security/security-model]]

---

## Estratégia de Observabilidade

O sistema segue os três pilares: **Logs, Métricas e Traces**.

Para v1 (serverless + Supabase), a stack é intencional e leve:

| Pilar | Ferramenta v1 | Ferramenta v2 (escala) |
|-------|--------------|----------------------|
| Logs | **Vercel Logs** + console estruturado | Axiom / Datadog |
| Métricas | **Inngest Dashboard** + Supabase Stats | Prometheus + Grafana |
| Traces | **Sentry** (erros + performance) | OpenTelemetry + Jaeger |
| Alertas | **Sentry Alerts** + Uptime Robot | PagerDuty |

---

## Logs

### Padrão de Log Estruturado

Todo log deve ser JSON estruturado para permitir filtros e queries eficientes:

```typescript
// lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error'
  event: string          // namespace.action — ex: 'checkin.created'
  userId?: string        // nunca logar dados PSE diretamente
  digimonId?: string
  duration?: number      // ms — para operações temporizadas
  error?: string         // message do erro, nunca stack trace com dados pessoais
  meta?: Record<string, unknown>
}

// Uso
logger.info({
  event: 'checkin.created',
  userId: user.id,
  digimonId: digimon.id,
  duration: 45,           // ms para processar
})

// ❌ NUNCA logar
logger.info({ pse_sleep: 2, pse_stress: 8 })  // dados de saúde nos logs
```

### Eventos Críticos a Logar

| Evento | Nível | Campos Obrigatórios |
|--------|-------|-------------------|
| `auth.login` | info | userId, githubHandle |
| `auth.logout` | info | userId |
| `checkin.created` | info | userId, date, duration |
| `checkin.duplicate_attempt` | warn | userId, date |
| `digimon.created` | info | userId, digimonId, species |
| `digimon.died` | warn | digimonId, userId, cause, daysAlive |
| `digimon.evolved` | info | digimonId, fromSpecies, toSpecies, level |
| `github.sync.started` | info | userId, jobId |
| `github.sync.completed` | info | userId, commitCount, xpEarned, duration |
| `github.sync.failed` | error | userId, jobId, errorCode |
| `nurse_action.performed` | info | digimonId, actionType |
| `rls.violation_attempt` | error | requestUserId, targetUserId, table | ← via Supabase hooks |

---

## Métricas

### Métricas de Negócio (KPIs)

Rastreadas via eventos de domínio → agregados em tabela `metrics_snapshots`:

```typescript
interface MetricSnapshot {
  date: ISODate
  dailyActiveUsers: number
  checkInsCompletedToday: number
  digimonDeathsToday: number
  evolutionsToday: number
  githubSyncsCompleted: number
  githubSyncsFailed: number
  averagePseScore: number   // média global — sem identificação
}
```

### Métricas de Performance

Capturadas via Sentry Performance:

| Métrica | Target | Alerta se |
|---------|--------|-----------|
| LCP da dashboard | < 2.5s | > 3s |
| Duração do check-in (Server Action) | < 300ms | > 1s |
| Duração do GitHub sync job | < 30s | > 60s |
| DigimonState recalculation | < 100ms | > 500ms |
| Supabase query P99 | < 200ms | > 500ms |

### Alertas de Quota {#alertas-de-quota}

Monitorar limites do tier gratuito do Supabase:

| Recurso | Limite Free | Alerta em |
|---------|------------|----------|
| Database size | 500MB | 400MB (80%) |
| MAU (Auth) | 50.000 | 40.000 (80%) |
| Storage | 1GB | 800MB (80%) |
| Realtime messages | 2M/mês | 1.5M (75%) |

---

## Traces e Erros

### Sentry — Configuração

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Filtrar dados sensíveis antes de enviar
  beforeSend(event) {
    // Remover qualquer campo PSE que vaze para o erro
    if (event.extra) {
      delete event.extra.pse_responses
      delete event.extra.sleepQuality
      delete event.extra.stress
    }
    return event
  },
})
```

### Erros de Domínio vs Erros de Infraestrutura

```typescript
// Erros de domínio NÃO devem ir ao Sentry — são esperados
class CheckInAlreadyExistsError extends DomainError {}
class DigimonSlotFullError extends DomainError {}
class PseScoreOutOfRangeError extends DomainError {}

// Erros de infraestrutura DEVEM ir ao Sentry
class DatabaseConnectionError extends InfrastructureError {}
class GitHubApiUnavailableError extends InfrastructureError {}
class InngestJobFailedError extends InfrastructureError {}
```

---

## Health Checks

### Endpoints de Saúde

```
GET /api/health
→ { status: 'ok', timestamp: '...', services: { db: 'ok', github: 'ok' } }

GET /api/health/deep
→ Verifica conexão ativa com Supabase + GitHub API (apenas para monitoramento interno)
```

### Uptime Robot

Monitorar a cada 5 minutos:
- `GET /api/health` — deve retornar 200
- Alerta por email/Slack se down por > 2 checagens consecutivas

---

## Runbooks

### Digimon não está decaindo stats

```
1. Verificar Inngest Dashboard — job 'digimon.decay.hourly' está executando?
2. Se job falhando: verificar INNGEST_EVENT_KEY em variáveis de ambiente
3. Se job rodando mas stats não mudam: verificar lógica lazy evaluation
   → hungerLastUpdatedAt está sendo atualizado corretamente?
4. Escalar: reiniciar o job via Inngest UI se stuck
```

### GitHub sync falhando para usuário específico

```
1. Verificar log: github.sync.failed com userId e errorCode
2. Se errorCode = 401: token GitHub expirou — usuário precisa re-autenticar
3. Se errorCode = 403: rate limit da API GitHub (5000 req/h) — aguardar
4. Se errorCode = 404: repositório privado sem permissão — verificar scopes
5. Marcar job para retry manual via Inngest se necessário
```

### Digimon morreu inesperadamente

```
1. Buscar evento digimon.died nos logs com digimonId
2. Verificar campo 'cause': abandonment | starvation | poor_health
3. Verificar lastCaredAt e hungerLastUpdatedAt no banco
4. Se morte incorreta (bug): rollback manual via SERVICE_ROLE no Supabase
   → UPDATE digimons SET is_alive = true, died_at = null WHERE id = ?
5. Notificar usuário via email com explicação
```

---

## Dashboard de Observabilidade (v1)

Combinação de dashboards nativos:

| Dashboard | URL | Responsável por |
|-----------|-----|----------------|
| Vercel Analytics | vercel.com/dashboard | LCP, INP, visitors |
| Inngest Dashboard | app.inngest.com | Background jobs, falhas |
| Supabase Dashboard | supabase.com/dashboard | Queries, RLS, storage |
| Sentry | sentry.io | Erros, traces, alerts |

---

## Links

- [[04-architecture/decisions#ADR-003]] — Inngest como plataforma de jobs
- [[06-security/security-model]] — Restrições de dados em logs
- [[03-specifications/tasks#TASK-OBS-001]] — Task de setup de Sentry
