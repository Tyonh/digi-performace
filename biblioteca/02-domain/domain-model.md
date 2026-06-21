# Domain Model — Digivice

> **Status:** `DRAFT v0.2`
> **Última atualização:** 2026-06-20
> **Abordagem:** Domain-Driven Design (DDD) — Tactical Patterns
> **Relacionado:** [[00-context/project-overview]] | [[01-product/PRD]]

---

## Bounded Contexts

O sistema é dividido em 5 contextos delimitados com responsabilidades isoladas. A comunicação entre contextos ocorre via **eventos de domínio**, nunca por referência direta de repositório.

```
┌─────────────────────────────────────────────────────────────┐
│                        DIGIVICE SYSTEM                       │
│                                                             │
│  ┌──────────────┐    ┌──────────────────┐                   │
│  │   IDENTITY   │    │   WELLBEING      │                   │
│  │              │───►│                  │                   │
│  │  User        │    │  DailyCheckIn    │                   │
│  │  Session     │    │  PseScore        │                   │
│  │  GitHubOAuth │    │  WellbeingReport │                   │
│  └──────┬───────┘    └────────┬─────────┘                   │
│         │                     │                             │
│         │    eventos          │ eventos                     │
│         ▼                     ▼                             │
│  ┌──────────────────────────────────────┐                   │
│  │           DIGIMON CARE               │                   │
│  │                                      │                   │
│  │  Digimon (AR)   DigimonState         │                   │
│  │  NurseAction    DigimonSlot          │                   │
│  │  DigimonDeath                        │                   │
│  └──────────────────┬───────────────────┘                   │
│                     │                                       │
│                     │ eventos                               │
│                     ▼                                       │
│  ┌──────────────┐   ┌──────────────────┐                   │
│  │  GITHUB      │   │   GROWTH &       │                   │
│  │  INTEGRATION │──►│   EVOLUTION      │                   │
│  │              │   │                  │                   │
│  │  GitActivity │   │  XpLedger        │                   │
│  │  CommitBatch │   │  EvolutionRule   │                   │
│  │  RepoProfile │   │  Evolution       │                   │
│  └──────────────┘   └──────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## BC 1 — Identity

**Responsabilidade:** Autenticação, sessão e vinculação com GitHub.

### Entidades e Value Objects

```typescript
// Aggregate Root
interface User {
  id: UserId                  // UUID — chave primária
  email: Email                // Value Object — validado
  githubId: string            // ID externo GitHub
  githubHandle: string        // ex: @cameldev
  createdAt: Date
  digimonSlots: DigimonSlot[] // máx 3 — enforced no AR
}

// Value Object
type Email = string & { readonly brand: 'Email' }
type UserId = string & { readonly brand: 'UserId' }
```

**Invariantes:**
- Um usuário possui no máximo **3 slots** de Digimon ativos
- Email único no sistema
- `githubId` único — um usuário por conta GitHub

---

## BC 2 — Wellbeing Assessment

**Responsabilidade:** Coleta e armazenamento dos dados PSE diários.

### Entidades e Value Objects

```typescript
// Aggregate Root
interface DailyCheckIn {
  id: CheckInId
  userId: UserId
  date: ISODate             // chave de unicidade por usuário/dia
  responses: PseResponses   // Value Object
  completedAt: Date
}

// Value Object — imutável após criação
interface PseResponses {
  sleepQuality: PseScore    // Como foi seu sono? 0–10
  fatigue: PseScore         // Nível de fadiga? 0–10
  stress: PseScore          // Nível de estresse? 0–10
  nutrition: PseScore       // Como foi sua alimentação? 0–10
  motivation: PseScore      // Nível de motivação? 0–10
  mood: PseScore            // Como está seu humor? 0–10
  physicalPain: PseScore    // Dor física? 0–10
}

// Branded type — garante range em compile-time + runtime
type PseScore = number & { readonly brand: 'PseScore' }
function createPseScore(n: number): PseScore {
  if (n < 0 || n > 10) throw new DomainError('PSE score fora do range 0–10')
  return n as PseScore
}

// Evento de domínio emitido após check-in completado
interface CheckInCompleted {
  type: 'checkin.completed'
  userId: UserId
  checkInId: CheckInId
  wellbeingIndex: number    // média ponderada calculada internamente
  date: ISODate
}
```

**Invariantes:**
- **Um check-in por usuário por dia** (UTC) — violação retorna `CheckInAlreadyExistsError`
- Todas as 7 perguntas são obrigatórias
- Check-in não pode ser editado após `completedAt` (imutabilidade)
- Score 0 em qualquer campo não bloqueia o check-in, mas pode acionar alerta no [[DigimonState]]

**Gargalo potencial:** A agregação de check-ins para relatórios históricos (ex: gráfico de 30 dias) pode requerer uma **Read Model** separada (CQRS) quando usuário tiver > 365 registros.

---

## BC 3 — Digimon Care

**Responsabilidade:** Estado atual do Digimon, ações de cuidado e lógica de morte.

### Aggregate Root: Digimon

```typescript
interface Digimon {
  id: DigimonId
  userId: UserId
  slot: DigimonSlot           // 1 | 2 | 3
  name: string                // nome dado pelo usuário
  species: DigimonSpecies     // 'Botamon' | 'Koromon' | ... (a definir)
  state: DigimonState         // Value Object — snapshot atual
  isAlive: boolean
  bornAt: Date
  diedAt?: Date
  lastCaredAt: Date           // usado para cálculo de morte por abandono
}

// Value Object — recalculado a cada evento
interface DigimonState {
  health: number              // 0–100 derivado da média PSE de saúde
  mood: number                // 0–100 derivado de humor + interação
  hunger: number              // 0–100 decai com o tempo (cron job)
  energy: number              // 0–100 decai sem sono, sobe ao dormir
  happiness: number           // 0–100 aumenta com NurseActions
  status: DigimonStatus
}

type DigimonStatus =
  | 'healthy'
  | 'hungry'
  | 'tired'
  | 'sick'         // PSE crítico (média < 3)
  | 'sleeping'
  | 'critical'     // múltiplos indicadores ruins
  | 'dead'

// Value Object
type DigimonSlot = 1 | 2 | 3
```

### Entidade: NurseAction

```typescript
interface NurseAction {
  id: string
  digimonId: DigimonId
  type: NurseActionType
  performedAt: Date
  stateDelta: Partial<DigimonState>  // o que mudou após a ação
}

type NurseActionType = 'feed' | 'sleep' | 'wake' | 'play' | 'medicine'
```

### Regras de Morte (DigimonDeath)

```
MORTE POR ABANDONO:
  SE (agora - lastCaredAt) > 48h → status = 'critical'
  SE (agora - lastCaredAt) > 72h → isAlive = false, diedAt = agora

MORTE POR NEGLIGÊNCIA DE SAÚDE:
  SE health < 10 por 3 dias consecutivos → isAlive = false

MORTE POR FOME:
  SE hunger === 0 por 24h → health decai 10pts/hora → morte quando health = 0
```

**Evento emitido:**
```typescript
interface DigimonDied {
  type: 'digimon.died'
  digimonId: DigimonId
  userId: UserId
  cause: 'abandonment' | 'starvation' | 'poor_health'
  diedAt: Date
}
```

**Gargalo potencial:** O decaimento de `hunger` e `energy` via cron job em escala pode se tornar custoso. Considerar **event sourcing leve** — armazenar o valor base + timestamp + taxa de decaimento, calculando o valor atual on-read, sem writes periódicos.

---

## BC 4 — GitHub Integration

**Responsabilidade:** Coletar atividade do GitHub e transformar em dados brutos de XP.

### Entidades

```typescript
interface GitActivity {
  id: string
  userId: UserId
  fetchedAt: Date
  periodStart: Date
  periodEnd: Date
  commits: CommitBatch[]
  totalXpEarned: number       // calculado no aggregate
}

interface CommitBatch {
  repoName: string
  repoLanguages: string[]     // ex: ['TypeScript', 'Rust']
  repoCategory: RepoCategory  // inferido das linguagens/topics
  commitCount: number
  xpPerCommit: number         // regra: base 10xp, modificada por categoria
}

type RepoCategory =
  | 'web-frontend'
  | 'web-backend'
  | 'mobile'
  | 'systems'       // C, Rust, Go — bônus de XP maior
  | 'data-science'
  | 'devops'
  | 'open-source'   // bônus adicional se repo público com stars
  | 'unknown'
```

**Evento emitido:**
```typescript
interface GitActivitySynced {
  type: 'github.activity.synced'
  userId: UserId
  totalXpEarned: number
  repoCategories: RepoCategory[]
  syncedAt: Date
}
```

---

## BC 5 — Growth & Evolution

**Responsabilidade:** Gerenciar XP, nível e eventos de evolução.

### Aggregate Root: XpLedger

```typescript
interface XpLedger {
  id: string
  digimonId: DigimonId
  totalXp: number           // soma de todos os créditos — nunca decai
  currentLevel: number      // calculado a partir do totalXp
  entries: XpEntry[]        // ledger imutável de créditos
}

interface XpEntry {
  id: string
  source: XpSource
  amount: number
  earnedAt: Date
  metadata: Record<string, unknown>   // ex: { repoName, commitCount }
}

type XpSource = 'github_commit' | 'daily_checkin' | 'nurse_action' | 'streak_bonus'
```

### Entidade: EvolutionRule

```typescript
interface EvolutionRule {
  id: string
  fromSpecies: DigimonSpecies
  toSpecies: DigimonSpecies
  minLevel: number
  requiredCategories?: RepoCategory[]  // ex: 'systems' para Agumon Metal
  minWellbeingIndex?: number           // PSE mínimo histórico (últimos 7 dias)
  conditions: string                   // descrição legível
}
```

**Exemplo de regra:**
```
Koromon → Agumon:
  - minLevel: 5
  - nenhuma categoria requerida

Agumon → Greymon:
  - minLevel: 15
  - sem restrição de categoria

Greymon → MetalGreymon:
  - minLevel: 30
  - requiredCategories: ['systems', 'devops']  // projetos de infra/systems
```

**Evento emitido:**
```typescript
interface DigimonEvolved {
  type: 'digimon.evolved'
  digimonId: DigimonId
  fromSpecies: DigimonSpecies
  toSpecies: DigimonSpecies
  triggeredAt: Date
  levelAtEvolution: number
}
```

---

## Mapa de Eventos de Domínio

| Evento | Produtor | Consumidor |
|--------|----------|------------|
| `checkin.completed` | Wellbeing | Digimon Care → atualiza health/mood |
| `github.activity.synced` | GitHub Integration | Growth → credita XP |
| `digimon.xp.threshold_reached` | Growth | Growth → verifica EvolutionRule |
| `digimon.evolved` | Growth | Digimon Care → atualiza species |
| `digimon.died` | Digimon Care | Identity → notifica usuário |
| `nurse_action.performed` | Digimon Care | Growth → credita XP de cuidado |

---

## Links

- [[00-context/project-overview]] — Visão geral e Golden Path
- [[01-product/PRD]] — User Stories derivadas deste modelo
- [[03-specifications/tasks]] — Tasks de implementação por BC
- [[04-architecture/decisions]] — ADRs que impactam este modelo
