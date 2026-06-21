# Data Schema & Padrões de Leitura — Digivice

> **Status:** `DRAFT v0.1`
> **Última atualização:** 2026-06-20
> **Relacionado:** [[02-domain/domain-model]] | [[04-architecture/decisions#ADR-002]]

---

## Visão Geral do Fluxo de Dados

```
[Usuário responde PSE no app]
        │
        ▼
[Edge Function: process-checkin]
        │
        ├──► INSERT daily_checkins         ← fonte da verdade histórica
        │
        ├──► UPSERT wellbeing_aggregates   ← leitura rápida de médias (Read Model)
        │
        └──► UPDATE digimons (state)       ← estado atual do pet
                    │
                    └──► Realtime → app recebe update imediato
```

A separação entre **fonte da verdade** (dados brutos, imutáveis) e **Read Models** (agregações pré-calculadas) é a decisão arquitetural central que garante:
- Histórico íntegro e auditável
- Queries de análise rápidas sem re-computar 365 registros a cada tela

---

## Schema PostgreSQL Completo

### Tabela: `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  github_id     TEXT NOT NULL UNIQUE,
  github_handle TEXT NOT NULL,
  consent_given_at TIMESTAMPTZ,        -- LGPD: consentimento para coleta de saúde
  consent_version  TEXT,               -- ex: 'v1.0' — rastrear versão do termo
  push_token    TEXT,                  -- Expo Push Token para notificações
  timezone      TEXT NOT NULL DEFAULT 'UTC',  -- para cálculo correto de "dia local"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Por que `timezone`?** Um check-in é "do dia de hoje" para o usuário — não em UTC. Um usuário em UTC-3 que faz check-in às 23h não pode ter bloqueado o check-in do "próximo dia" UTC.

---

### Tabela: `daily_checkins` ← Fonte da Verdade Histórica

```sql
CREATE TABLE daily_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,                   -- data LOCAL do usuário (não UTC)

  -- As 7 dimensões PSE (0–10)
  sleep_quality   SMALLINT NOT NULL CHECK (sleep_quality BETWEEN 0 AND 10),
  fatigue         SMALLINT NOT NULL CHECK (fatigue BETWEEN 0 AND 10),
  stress          SMALLINT NOT NULL CHECK (stress BETWEEN 0 AND 10),
  nutrition       SMALLINT NOT NULL CHECK (nutrition BETWEEN 0 AND 10),
  motivation      SMALLINT NOT NULL CHECK (motivation BETWEEN 0 AND 10),
  mood            SMALLINT NOT NULL CHECK (mood BETWEEN 0 AND 10),
  physical_pain   SMALLINT NOT NULL CHECK (physical_pain BETWEEN 0 AND 10),

  -- Índice calculado no momento da inserção (média ponderada — ver nota)
  wellbeing_index NUMERIC(4,2) NOT NULL,

  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garante 1 check-in por usuário por dia
  UNIQUE (user_id, date)
);

-- Índice para queries históricas por usuário em range de datas
CREATE INDEX idx_checkins_user_date ON daily_checkins (user_id, date DESC);
```

**Cálculo do `wellbeing_index`:**
```
wellbeing_index = (
  (sleep_quality  × 1.5) +   -- sono tem peso maior (impacto cascata)
  (fatigue        × 1.2) +   -- fadiga afeta tudo
  (stress         × 1.2) +   -- estresse crônico é indicador crítico
  (nutrition      × 1.0) +
  (motivation     × 1.0) +
  (mood           × 1.0) +
  (physical_pain  × 0.8)     -- dor pontual tem peso menor
) / 7.7                       -- normaliza para escala 0–10
```

> Este índice alimenta diretamente o `health` do [[DigimonState]].

---

### Tabela: `wellbeing_aggregates` ← Read Model para Analytics

```sql
-- Agregações pré-calculadas por semana/mês — evita re-computar histórico completo
CREATE TABLE wellbeing_aggregates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type     TEXT NOT NULL CHECK (period_type IN ('week', 'month')),
  period_start    DATE NOT NULL,           -- início da semana (segunda) ou mês

  -- Médias por dimensão no período
  avg_sleep       NUMERIC(4,2),
  avg_fatigue     NUMERIC(4,2),
  avg_stress      NUMERIC(4,2),
  avg_nutrition   NUMERIC(4,2),
  avg_motivation  NUMERIC(4,2),
  avg_mood        NUMERIC(4,2),
  avg_pain        NUMERIC(4,2),
  avg_wellbeing   NUMERIC(4,2),            -- média do wellbeing_index

  -- Metadata do período
  checkin_count   SMALLINT NOT NULL,       -- quantos check-ins no período (de 7 possíveis na semana)
  streak_days     SMALLINT NOT NULL,       -- dias consecutivos de check-in
  best_day        DATE,                    -- dia com maior wellbeing_index
  worst_day       DATE,                    -- dia com menor wellbeing_index

  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, period_type, period_start)
);

CREATE INDEX idx_aggregates_user_period ON wellbeing_aggregates (user_id, period_type, period_start DESC);
```

> **Por que pré-calcular?** Para um gráfico de "últimos 12 meses por semana" (52 períodos), a alternativa seria `GROUP BY` em até 365 linhas — ok para poucos usuários, mas pré-calcular garante < 10ms de query em qualquer escala.

---

### Tabela: `digimons`

```sql
CREATE TABLE digimons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot            SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 3),
  name            TEXT NOT NULL,
  species         TEXT NOT NULL,           -- 'Botamon', 'Koromon', 'Agumon', ...

  -- Estado atual (lazy evaluation — ver ADR-006)
  hunger_base     SMALLINT NOT NULL DEFAULT 80,
  hunger_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hunger_decay_rate NUMERIC(3,1) NOT NULL DEFAULT 5.0,   -- pts/hora

  energy_base     SMALLINT NOT NULL DEFAULT 100,
  energy_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  energy_decay_rate NUMERIC(3,1) NOT NULL DEFAULT 3.0,   -- pts/hora

  health          SMALLINT NOT NULL DEFAULT 100,  -- derivado do wellbeing_index
  mood            SMALLINT NOT NULL DEFAULT 80,
  happiness       SMALLINT NOT NULL DEFAULT 80,

  status          TEXT NOT NULL DEFAULT 'healthy'
                  CHECK (status IN ('healthy','hungry','tired','sick','sleeping','critical','dead')),

  is_alive        BOOLEAN NOT NULL DEFAULT true,
  is_sleeping     BOOLEAN NOT NULL DEFAULT false,
  sleep_started_at TIMESTAMPTZ,

  last_cared_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  born_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  died_at         TIMESTAMPTZ,
  death_cause     TEXT CHECK (death_cause IN ('abandonment','starvation','poor_health')),

  UNIQUE (user_id, slot)
);
```

---

### Tabela: `xp_ledger`

```sql
-- Ledger imutável — nunca deletar entradas, apenas acumular
CREATE TABLE xp_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digimon_id    UUID NOT NULL REFERENCES digimons(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN (
                  'github_commit', 'daily_checkin', 'nurse_action', 'streak_bonus'
                )),
  amount        INTEGER NOT NULL CHECK (amount > 0),
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Metadata por source
  repo_name     TEXT,                       -- para github_commit
  commit_count  INTEGER,                    -- para github_commit
  repo_category TEXT,                       -- para github_commit
  action_type   TEXT                        -- para nurse_action
);

CREATE INDEX idx_xp_digimon ON xp_ledger (digimon_id, earned_at DESC);
CREATE INDEX idx_xp_user    ON xp_ledger (user_id, earned_at DESC);
```

> O nível atual é sempre **computado** como `SUM(amount)` com a curva de XP — nunca armazenado. Isso garante que ajustes na curva retroagem corretamente.

---

### Tabela: `nurse_actions`

```sql
CREATE TABLE nurse_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digimon_id    UUID NOT NULL REFERENCES digimons(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('feed','sleep','wake','play','medicine')),
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Snapshot do estado antes da ação (para auditoria e histórico)
  state_before  JSONB,
  state_after   JSONB
);

CREATE INDEX idx_nurse_digimon ON nurse_actions (digimon_id, performed_at DESC);
```

---

### Tabela: `git_activities`

```sql
CREATE TABLE git_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  digimon_id      UUID NOT NULL REFERENCES digimons(id),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_date     DATE NOT NULL,             -- dia da atividade
  repo_name       TEXT NOT NULL,
  repo_category   TEXT NOT NULL,
  languages       TEXT[] NOT NULL,
  commit_count    INTEGER NOT NULL,
  xp_earned       INTEGER NOT NULL,

  UNIQUE (user_id, period_date, repo_name)   -- evita duplicar sync do mesmo dia/repo
);
```

---

## Padrões de Query

### 1. Buscar histórico dos últimos 30 dias (tela de análise)

```sql
-- Query direta nos raw data — rápida para 30 registros
SELECT
  date,
  sleep_quality,
  fatigue,
  stress,
  nutrition,
  motivation,
  mood,
  physical_pain,
  wellbeing_index
FROM daily_checkins
WHERE
  user_id = $1
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**No app (React Query / TanStack Query):**
```typescript
const { data } = useQuery({
  queryKey: ['checkins', 'history', '30d', userId],
  queryFn: () =>
    supabase
      .from('daily_checkins')
      .select('date, sleep_quality, fatigue, stress, nutrition, motivation, mood, physical_pain, wellbeing_index')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true }),
  staleTime: 1000 * 60 * 5,   // 5 min — histórico não muda com frequência
})
```

---

### 2. Médias semanais para gráfico de evolução (12 semanas)

```sql
-- Usar o Read Model — instantâneo
SELECT
  period_start,
  avg_sleep,
  avg_stress,
  avg_wellbeing,
  checkin_count,
  streak_days
FROM wellbeing_aggregates
WHERE
  user_id = $1
  AND period_type = 'week'
  AND period_start >= CURRENT_DATE - INTERVAL '84 days'   -- 12 semanas
ORDER BY period_start ASC;
```

---

### 3. Correlação XP (produtividade) vs Bem-estar (análise pessoal avançada)

```sql
-- Join entre check-ins diários e XP do mesmo dia
SELECT
  c.date,
  c.wellbeing_index,
  c.stress,
  c.fatigue,
  COALESCE(SUM(x.amount), 0) AS xp_earned_on_day,
  COALESCE(SUM(x.commit_count), 0) AS commits_on_day
FROM daily_checkins c
LEFT JOIN git_activities x
  ON x.user_id = c.user_id
  AND x.period_date = c.date
WHERE c.user_id = $1
  AND c.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.date, c.wellbeing_index, c.stress, c.fatigue
ORDER BY c.date ASC;
```

> Esta query permite visualizar: "nos dias em que meu estresse estava acima de 7, eu commitei menos?" — o tipo de insight de desenvolvimento pessoal que o app deve oferecer.

---

### 4. Estado atual do Digimon (com lazy evaluation)

```sql
-- Buscar o Digimon e calcular hunger/energy no servidor
SELECT
  id, name, species, status, health, mood, happiness,
  is_alive, is_sleeping, born_at, last_cared_at,
  -- Calcula hunger atual no banco (evita round-trip extra)
  GREATEST(0,
    hunger_base - (
      EXTRACT(EPOCH FROM (now() - hunger_updated_at)) / 3600.0
      * hunger_decay_rate
    )
  )::SMALLINT AS hunger_current,
  GREATEST(0,
    energy_base - (
      EXTRACT(EPOCH FROM (now() - energy_updated_at)) / 3600.0
      * energy_decay_rate
    )
  )::SMALLINT AS energy_current
FROM digimons
WHERE user_id = $1 AND is_alive = true
ORDER BY slot ASC;
```

> A lazy evaluation acontece **na query SQL**, não no cliente — o app recebe o valor já calculado, sem precisar fazer a conta em TypeScript.

---

### 5. Histórico de evoluções do Digimon

```sql
-- Para a tela "Linha do Tempo" do Digimon
SELECT
  xl.earned_at,
  xl.source,
  xl.amount,
  xl.repo_name,
  xl.repo_category,
  xl.commit_count
FROM xp_ledger xl
WHERE xl.digimon_id = $1
ORDER BY xl.earned_at DESC
LIMIT 100;
```

---

## Views PostgreSQL para Analytics

```sql
-- View para dashboard de análise pessoal — calculada on-demand
CREATE VIEW user_wellbeing_insights AS
SELECT
  user_id,
  -- Streak atual de check-ins consecutivos
  COUNT(*) FILTER (
    WHERE date > CURRENT_DATE - (
      SELECT COALESCE(
        (SELECT date FROM daily_checkins d2
         WHERE d2.user_id = d1.user_id
           AND d2.date < CURRENT_DATE
           AND NOT EXISTS (
             SELECT 1 FROM daily_checkins d3
             WHERE d3.user_id = d2.user_id
               AND d3.date = d2.date - 1
           )
         ORDER BY date DESC LIMIT 1),
        CURRENT_DATE - 365
      )
    )
  ) AS current_streak,
  -- Médias últimos 7 dias
  AVG(wellbeing_index) FILTER (WHERE date >= CURRENT_DATE - 7)  AS avg_wellbeing_7d,
  AVG(stress)          FILTER (WHERE date >= CURRENT_DATE - 7)  AS avg_stress_7d,
  AVG(sleep_quality)   FILTER (WHERE date >= CURRENT_DATE - 7)  AS avg_sleep_7d,
  -- Tendência: comparar últimos 7 dias vs 7 dias anteriores
  AVG(wellbeing_index) FILTER (WHERE date >= CURRENT_DATE - 7)
    - AVG(wellbeing_index) FILTER (WHERE date BETWEEN CURRENT_DATE - 14 AND CURRENT_DATE - 8)
  AS wellbeing_trend_delta   -- positivo = melhorando, negativo = piorando
FROM daily_checkins d1
GROUP BY user_id;
```

---

## Quando o Read Model é Atualizado

```
[Edge Function: process-checkin]
        │
        ├── 1. INSERT daily_checkins          (sempre)
        │
        ├── 2. UPSERT wellbeing_aggregates    (recalcula semana atual)
        │         WHERE period_type = 'week'
        │         AND period_start = date_trunc('week', hoje)
        │
        └── 3. No fim de cada semana (cron):
                  UPSERT wellbeing_aggregates para semana que fechou
                  UPSERT wellbeing_aggregates (period_type = 'month') se mês fechou
```

---

## Retenção e Exportação de Dados

| Tabela | Retenção | Motivo |
|--------|---------|--------|
| `daily_checkins` | Enquanto conta ativa + 90 dias após exclusão | Dado sensível LGPD — ver [[06-security/security-model]] |
| `wellbeing_aggregates` | Igual ao `daily_checkins` | Read model derivado |
| `xp_ledger` | Permanente (enquanto Digimon existe) | Histórico de progressão — não sensível |
| `git_activities` | 1 ano | Dado público (commits GitHub) |
| `nurse_actions` | 6 meses | Auditoria de cuidado |

**Exportação (LGPD — direito de portabilidade):**
```typescript
// Edge Function: export-user-data
// Retorna ZIP com:
// - checkins.json     ← todos os check-ins históricos
// - aggregates.json   ← médias semanais/mensais
// - digimons.json     ← histórico de pets (incluindo mortos)
// - xp_history.json   ← ledger de XP
```

---

## Links

- [[02-domain/domain-model]] — Entidades que mapeiam para estas tabelas
- [[04-architecture/decisions#ADR-002]] — Decisão de usar Supabase + RLS
- [[04-architecture/decisions#ADR-006]] — Lazy evaluation do hunger/energy
- [[06-security/security-model]] — RLS policies por tabela
- [[03-specifications/tasks#TASK-INFRA-002]] — Task de criação do schema
