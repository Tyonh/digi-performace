# Tasks — Quadro de Execução

> **Projeto:** Digivice
> **Última atualização:** 2026-06-20
> **Convenção:** `TASK-[ÁREA]-[NNN]` | Areas: INFRA, AUTH, DOMAIN, UI, CARE, EVOLV, GITHUB, SEC, OBS, TEST
> **Relacionado:** [[01-product/PRD]] | [[02-domain/domain-model]]

---

## DONE ✅

*(Nenhuma task concluída ainda — projeto em setup inicial)*

---

## EM EXECUÇÃO 🔄

*(Nenhuma task em andamento — aguardando setup de ambiente)*

---

## BACKLOG 📋

### 🏗️ INFRA — Infraestrutura e Setup

---

#### TASK-INFRA-001 — Setup do Repositório e Tooling

**Prioridade:** `P0 — Bloqueador`
**Relacionado:** [[00-context/tech-stack]] | [[04-architecture/decisions#ADR-001]]
**Depende de:** nada
**Bloqueia:** todas as outras tasks

**Descrição:**
Configurar o projeto Expo com TypeScript strict, ESLint, Prettier, Husky e Commitlint.

**Checklist de Implementação:**
- [ ] `npx create-expo-app@latest digivice --template tabs` com TypeScript
- [ ] Migrar para Expo Router v4 (file-based routing)
- [ ] Configurar `tsconfig.json` com `strict: true` e path aliases (`@/`)
- [ ] Instalar e configurar ESLint com `eslint-config-expo`
- [ ] Configurar Prettier com `.prettierrc`
- [ ] Instalar Husky + lint-staged (pre-commit: lint + type-check)
- [ ] Instalar Commitlint com config Conventional Commits
- [ ] Instalar NativeWind v4 + configurar `tailwind.config.ts`
- [ ] Criar estrutura de pastas conforme [[00-context/tech-stack#estrutura-de-pastas]]
- [ ] `.env.local.example` com todas as variáveis necessárias documentadas
- [ ] Configurar EAS (`eas.json`) com profiles: development, preview, production

**Definition of Done (DoD):**
- [ ] `tsc --noEmit` passa sem erros
- [ ] `eslint .` passa sem warnings
- [ ] Commit com mensagem inválida é bloqueado pelo Commitlint
- [ ] `npx expo start` abre no simulador iOS e Android
- [ ] `npx expo start --tunnel` abre no device físico via Expo Go
- [ ] `eas build --profile development --platform ios` conclui sem erro

---

#### TASK-INFRA-002 — Setup Supabase (Database + Auth)

**Prioridade:** `P0 — Bloqueador`
**Relacionado:** [[04-architecture/decisions#ADR-002]] | [[06-security/security-model]]
**Depende de:** TASK-INFRA-001
**Bloqueia:** TASK-AUTH-001, TASK-DOMAIN-001

**Descrição:**
Criar projeto Supabase, configurar GitHub OAuth, schema inicial com Drizzle, e integrar `expo-secure-store` como storage da sessão.

**Checklist de Implementação:**
- [ ] Criar projeto no Supabase
- [ ] Configurar GitHub OAuth provider no Supabase Auth (redirect URL: `digivice://auth/callback`)
- [ ] Instalar `@supabase/supabase-js` + `expo-secure-store`
- [ ] Configurar client Supabase com `ExpoSecureStoreAdapter` (ADR-008)
- [ ] Instalar Drizzle ORM + `drizzle-kit` (somente para migrations — não usado no app)
- [ ] Criar schemas Drizzle: `users`, `digimons`, `daily_checkins`, `xp_ledger`, `xp_entries`, `nurse_actions`, `git_activities`
- [ ] Habilitar RLS em todas as tabelas
- [ ] Criar políticas RLS conforme [[06-security/security-model#row-level-security]]
- [ ] Rodar primeira migration
- [ ] Gerar types TypeScript via `supabase gen types typescript`

**Definition of Done (DoD):**
- [ ] Todas as tabelas existem com schemas corretos
- [ ] RLS testado: request com JWT de outro usuário retorna 0 rows
- [ ] Migration versionada em `db/migrations/`
- [ ] Token de sessão salvo no Keychain (verificar via `expo-secure-store` inspector)
- [ ] App reconecta sessão após fechar e reabrir — sem re-login

---

#### TASK-INFRA-003 — Setup Inngest para Background Jobs

**Prioridade:** `P1`
**Relacionado:** [[04-architecture/decisions#ADR-003]]
**Depende de:** TASK-INFRA-001
**Bloqueia:** TASK-GITHUB-001, TASK-CARE-003

**Checklist de Implementação:**
- [ ] Instalar `inngest`
- [ ] Criar Route Handler `app/api/inngest/route.ts`
- [ ] Configurar `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY`
- [ ] Criar função de teste: `hello-world` job que loga e retorna sucesso
- [ ] Verificar no Inngest Dashboard que job aparece

**Definition of Done (DoD):**
- [ ] Job `hello-world` executa com sucesso no Inngest Dashboard
- [ ] Retry automático funciona quando job falha artificialmente
- [ ] Logs estruturados aparecem no output do job

---

### 🔐 AUTH — Autenticação

---

#### TASK-AUTH-001 — Login com GitHub OAuth (Deep Link)

**Prioridade:** `P0`
**User Story:** [[01-product/PRD#US-001]]
**Depende de:** TASK-INFRA-002
**Relacionado:** [[04-architecture/decisions#ADR-008]]

**Checklist de Implementação:**
- [ ] Instalar `expo-web-browser` + `expo-linking`
- [ ] Configurar deep link scheme no `app.json`: `scheme: "digivice"`
- [ ] Tela `app/(auth)/login.tsx` com botão "Entrar com GitHub"
- [ ] Fluxo OAuth com `supabase.auth.signInWithOAuth` + `expo-web-browser`
- [ ] Handler de deep link `digivice://auth/callback` para capturar o token
- [ ] `_layout.tsx` raiz com listener de `onAuthStateChange` — redirect automático
- [ ] Tela de logout com `supabase.auth.signOut()` + limpeza do SecureStore
- [ ] Proteção de rotas: `app/(tabs)/_layout.tsx` verifica sessão

**Definition of Done (DoD):**
- [ ] Fluxo completo no simulador: tap login → browser GitHub → callback → dashboard
- [ ] Fluxo completo no device físico com deep link funcionando
- [ ] Sessão persiste após fechar o app completamente (kill + reopen)
- [ ] Logout limpa SecureStore e redireciona para `/login`
- [ ] Rota de tabs sem sessão redireciona para `/login`
- [ ] Teste E2E (Maestro) do fluxo de login

---

### 🧬 DOMAIN — Lógica de Domínio

---

#### TASK-DOMAIN-001 — Implementar Entidades e Value Objects do Domínio

**Prioridade:** `P0`
**Relacionado:** [[02-domain/domain-model]]
**Depende de:** TASK-INFRA-001

**Descrição:**
Implementar as entidades puras de domínio (sem dependência de framework) conforme o [[02-domain/domain-model]].

**Checklist de Implementação:**
- [ ] `domain/shared/types.ts` — branded types: `UserId`, `DigimonId`, `PseScore`, `ISODate`
- [ ] `domain/shared/errors.ts` — `DomainError`, `InfrastructureError` e subclasses
- [ ] `domain/checkin/` — `DailyCheckIn`, `PseResponses`, factory `createDailyCheckIn()`
- [ ] `domain/digimon/` — `Digimon`, `DigimonState`, `DigimonStatus`, lazy evaluation helpers
- [ ] `domain/digimon/death-rules.ts` — regras de morte documentadas como funções puras
- [ ] `domain/growth/` — `XpLedger`, `XpEntry`, `EvolutionRule`
- [ ] `domain/github/` — `GitActivity`, `CommitBatch`, `RepoCategory` classifier

**Definition of Done (DoD):**
- [ ] Todas as entidades com tipos strict — zero `any`
- [ ] `createPseScore(11)` lança `PseScoreOutOfRangeError`
- [ ] Regras de morte têm testes unitários cobrindo os 3 cenários (abandono, fome, saúde)
- [ ] Cobertura de testes: ≥ 90% nas funções de domínio puro
- [ ] Zero dependências de framework em `domain/` (sem imports de `next`, `supabase`, etc.)

---

### 🎮 CARE — Mecânicas de Cuidado

---

#### TASK-CARE-001 — Criação e Dashboard do Digimon

**Prioridade:** `P1`
**User Stories:** [[01-product/PRD#US-002]] | [[01-product/PRD#US-003]]
**Depende de:** TASK-AUTH-001, TASK-DOMAIN-001, TASK-INFRA-002

**Checklist de Implementação:**
- [ ] Página `app/(dashboard)/digimon/create/page.tsx` — form de nome + escolha de slot
- [ ] Server Action `createDigimon()` com validação Zod
- [ ] Página `app/(dashboard)/page.tsx` — dashboard com Digimon ativo
- [ ] Componente `DigimonCard` — sprite + barras de status
- [ ] Componente `StatusBar` — hunger, energy, health, mood com cores de alerta
- [ ] Lógica lazy evaluation de decaimento de stats no read

**Definition of Done (DoD):**
- [ ] Usuário cria Digimon em < 3 cliques após login
- [ ] Dashboard carrega em < 2.5s (LCP medido no Sentry)
- [ ] Stats decaem corretamente na leitura (sem writes periódicos)
- [ ] Slot cheio (3 Digimons) bloqueia criação com mensagem de erro

---

#### TASK-CARE-002 — Formulário de Check-in PSE (Alimentação)

**Prioridade:** `P1`
**User Story:** [[01-product/PRD#US-005]]
**Depende de:** TASK-CARE-001, TASK-DOMAIN-001

**Checklist de Implementação:**
- [ ] Página `app/(dashboard)/checkin/page.tsx`
- [ ] Componente `PseQuestion` — slider 0–10 com label descritivo
- [ ] 7 perguntas conforme [[02-domain/domain-model#bc-2--wellbeing-assessment]]
- [ ] Server Action `submitCheckIn()` com validação Zod + regra de 1/dia
- [ ] Emitir evento `checkin.completed` → atualizar `DigimonState`
- [ ] Animação de Digimon "comendo" após submit (aguarda TASK-UI-001)

**Definition of Done (DoD):**
- [ ] Submit com todos os campos válidos cria `DailyCheckIn` no banco
- [ ] Segundo submit no mesmo dia retorna erro `CheckInAlreadyExistsError` com mensagem amigável
- [ ] `DigimonState.health` e `mood` são atualizados após check-in
- [ ] Teste unitário: `createDailyCheckIn()` com data duplicada lança erro esperado
- [ ] Teste E2E: fluxo completo de check-in

---

#### TASK-CARE-003 — Decaimento de Stats e Morte por Cron

**Prioridade:** `P1`
**Relacionado:** [[04-architecture/decisions#ADR-006]] | [[02-domain/domain-model#regras-de-morte]]
**Depende de:** TASK-INFRA-003, TASK-DOMAIN-001

**Checklist de Implementação:**
- [ ] Inngest function `digimon.decay.check` — roda a cada hora
- [ ] Calcular Digimons em estado crítico via lazy evaluation
- [ ] Inngest function `digimon.death.check` — aplicar morte quando threshold ultrapassado
- [ ] Emitir evento `digimon.died` com cause
- [ ] Soft-delete: `is_alive = false`, `died_at = now()`
- [ ] Notificação push/email 24h antes da morte (stub para v1)

**Definition of Done (DoD):**
- [ ] Digimon com `lastCaredAt` > 72h tem `is_alive = false` após próxima execução do job
- [ ] Evento `digimon.died` é registrado nos logs com `cause` correto
- [ ] Teste de integração: simular tempo via `hungerLastUpdatedAt` alterado manualmente
- [ ] Job falha graciosamente (sem crash) se Supabase estiver indisponível

---

### 🐙 GITHUB — Integração GitHub

---

#### TASK-GITHUB-001 — Sync de Commits e Cálculo de XP

**Prioridade:** `P1`
**User Story:** [[01-product/PRD#US-009]]
**Depende de:** TASK-INFRA-003, TASK-DOMAIN-001, TASK-AUTH-001

**Checklist de Implementação:**
- [ ] Adapter `lib/github/client.ts` — wrapper do GitHub REST API v3
- [ ] Query de contribution calendar via GitHub GraphQL API
- [ ] Classificador de `RepoCategory` por linguagem e topics do repo
- [ ] Inngest function `github.sync` — diário por usuário ativo
- [ ] Regras de XP: base 10xp/commit, modificadores por categoria
- [ ] Creditar XP no `XpLedger` com `XpEntry` por batch

**Definition of Done (DoD):**
- [ ] Sync completo executa em < 60s para usuário com 365 dias de histórico
- [ ] XP creditado corretamente: 5 commits TypeScript = 50 XP base
- [ ] Categorias corretas: repo com `language: Rust` → `RepoCategory.systems`
- [ ] Erro 401 do GitHub é logado e não causa crash do job
- [ ] Teste unitário do classificador `RepoCategory`

---

### 📊 HISTORY — Histórico e Análise Pessoal

---

#### TASK-HISTORY-001 — Tela de Histórico de Check-ins (Gráfico por Dimensão)

**Prioridade:** `P1`
**User Stories:** [[01-product/PRD#US-006]]
**Depende de:** TASK-CARE-002
**Relacionado:** [[05-data/schema#1-buscar-histórico-dos-últimos-30-dias]]

**Descrição:**
Tela de histórico com gráfico de linhas por dimensão PSE — a principal tela de análise de bem-estar.

**Checklist de Implementação:**
- [ ] Instalar `victory-native` (gráficos otimizados para React Native) ou `react-native-gifted-charts`
- [ ] Query: `daily_checkins` filtrado por `user_id` + range de datas — ver [[05-data/schema#query-1]]
- [ ] Componente `WellbeingChart` — linha por dimensão, cores distintas
- [ ] Toggle de período: 7d / 30d / 90d
- [ ] Componente `StreakBadge` — streak atual + recorde pessoal
- [ ] Componente `WeeklyDelta` — comparação desta semana vs anterior
- [ ] Tap em ponto do gráfico → bottom sheet com check-in completo daquele dia
- [ ] Cache da query com TanStack Query (`staleTime: 5min`)

**Definition of Done (DoD):**
- [ ] Gráfico renderiza 90 pontos sem jank (testar em device mid-range)
- [ ] Toggle de período recarrega dados sem flash de conteúdo
- [ ] Tap em ponto exibe todos os 7 valores do dia corretamente
- [ ] Estado vazio ("Nenhum check-in ainda") com CTA para fazer o primeiro
- [ ] Testes unitários: cálculo de streak retorna valor correto com gaps de dias

---

#### TASK-HISTORY-002 — Relatório Semanal de Bem-estar

**Prioridade:** `P1`
**User Story:** [[01-product/PRD#US-013]]
**Depende de:** TASK-HISTORY-001
**Relacionado:** [[05-data/schema#2-médias-semanais]]

**Descrição:**
Cards de resumo semanal navegáveis horizontalmente, com comparação entre semanas.

**Checklist de Implementação:**
- [ ] Query: `wellbeing_aggregates` com `period_type = 'week'` — últimas 12 semanas
- [ ] Componente `WeeklyReportCard` — médias por dimensão + setas de tendência
- [ ] Lógica de destaque: dimensão mais baixa (alerta) e mais alta (conquista)
- [ ] Scroll horizontal de 12 semanas com paginação suave
- [ ] Edge Function: `compute-weekly-aggregate` — recalcula Read Model ao final da semana
- [ ] Cron Supabase: dispara `compute-weekly-aggregate` toda segunda-feira 00:05 UTC

**Definition of Done (DoD):**
- [ ] Card da semana atual reflete dados reais do banco
- [ ] Delta numérico correto: se stress foi 6.5 esta semana e 8.0 na anterior → "-1.5 ↓"
- [ ] Cron dispara e agregado é criado (verificar no Supabase logs)
- [ ] Sem dados de semana anterior: delta não aparece (não exibe "NaN" ou "-")

---

#### TASK-HISTORY-003 — Correlação Produtividade vs Bem-estar

**Prioridade:** `P2`
**User Story:** [[01-product/PRD#US-014]]
**Depende de:** TASK-HISTORY-001, TASK-GITHUB-001
**Relacionado:** [[05-data/schema#3-correlação-xp-vs-bem-estar]]

**Descrição:**
Gráfico dual-axis cruzando `wellbeing_index` com commits diários — a análise de desenvolvimento pessoal mais sofisticada do app.

**Checklist de Implementação:**
- [ ] Query de correlação: JOIN `daily_checkins` + `git_activities` por `user_id + date`
- [ ] Componente `CorrelationChart` — dual-axis (linha + barras sobrepostas)
- [ ] Algoritmo de insights automáticos:
  - Calcular média de commits nos dias com stress > 7 vs resto
  - Calcular limiar de sono onde commits são maiores
  - Calcular semanas high-wellbeing vs semanas low-wellbeing e média de commits
- [ ] Componente `InsightCard` — exibe top 2 insights calculados
- [ ] Seção bloqueada com CTA de conexão GitHub se não autenticado

**Definition of Done (DoD):**
- [ ] Gráfico dual-axis renderiza sem sobreposição de labels
- [ ] Insights calculados matematicamente corretos (testar com dataset mock)
- [ ] Usuário sem dados GitHub vê estado vazio adequado, não erro
- [ ] Teste unitário: algoritmo de insights retorna `null` para dataset com < 7 dias

---

#### TASK-HISTORY-004 — Timeline do Digimon

**Prioridade:** `P2`
**User Story:** [[01-product/PRD#US-015]]
**Depende de:** TASK-EVOLV-001, TASK-CARE-003

**Checklist de Implementação:**
- [ ] Query: JOIN `xp_ledger` + `digimons` + `daily_checkins` para montar eventos cronológicos
- [ ] Tipos de evento: `born` | `evolution` | `difficult_day` | `died`
- [ ] Componente `DigimonTimeline` — FlatList vertical com ícone por tipo de evento
- [ ] Lógica de "dia difícil": `wellbeing_index < 4` no `daily_checkins` do dia
- [ ] Seção "Memorial" para Digimons `is_alive = false`
- [ ] Botão de share: screenshot da timeline via `expo-view-shot`

**Definition of Done (DoD):**
- [ ] Timeline de Digimon com 3+ evoluções renderiza corretamente
- [ ] Dias difíceis marcados com cor/ícone distinto
- [ ] Digimon morto aparece no Memorial com causa da morte legível
- [ ] Share screenshot funciona no iOS e Android

---

### 📈 EVOLV — Evolução

---

#### TASK-EVOLV-001 — Sistema de XP e Level Up

**Prioridade:** `P2`
**User Story:** [[01-product/PRD#US-009]]
**Depende de:** TASK-GITHUB-001

**Checklist de Implementação:**
- [ ] Função `calculateLevel(totalXp: number): number` com curva de XP
- [ ] Verificação de threshold pós-crediting de XP
- [ ] Se threshold atingido: verificar `EvolutionRule` aplicável
- [ ] Emitir `digimon.evolved` e atualizar `species` no banco
- [ ] UI: barra de XP no dashboard com animação de fill

**Definition of Done (DoD):**
- [ ] Level up ocorre automaticamente após XP threshold sem ação do usuário
- [ ] Evolução só ocorre se `EvolutionRule` compatível existe
- [ ] Evento `digimon.evolved` aparece nos logs com `fromSpecies` e `toSpecies`
- [ ] Teste: `calculateLevel()` retorna values corretos em múltiplos thresholds

---

### 🔒 SEC — Segurança

---

#### TASK-SEC-001 — Consentimento LGPD no Onboarding

**Prioridade:** `P0` *(legal — não pode ir a produção sem isso)*
**Relacionado:** [[06-security/security-model#lgpd--direitos-do-titular]]
**Depende de:** TASK-AUTH-001

**Checklist de Implementação:**
- [ ] Modal/tela de consentimento após primeiro login
- [ ] Checkbox explícito: "Concordo com a coleta de dados de saúde (PSE)" — não pré-marcado
- [ ] Link para Política de Privacidade (deve existir antes do launch)
- [ ] Salvar `consent_given_at` no perfil do usuário
- [ ] Bloquear acesso ao check-in PSE se consentimento não dado

**Definition of Done (DoD):**
- [ ] Usuário sem consentimento não consegue acessar `/checkin`
- [ ] `consent_given_at` salvo corretamente no banco
- [ ] Consentimento é registrado com timestamp e versão do termo
- [ ] Revisão jurídica do texto de consentimento realizada *(documentar data)*

---

### 📊 OBS — Observabilidade

---

#### TASK-OBS-001 — Setup Sentry

**Prioridade:** `P1`
**Relacionado:** [[08-observability/observability]]
**Depende de:** TASK-INFRA-001

**Checklist de Implementação:**
- [ ] Instalar `@sentry/nextjs`
- [ ] Configurar `sentry.server.config.ts` e `sentry.client.config.ts`
- [ ] Filtro `beforeSend` para remover campos PSE de erros
- [ ] Configurar `tracesSampleRate: 0.1` em produção
- [ ] Criar alert: error rate > 1% → email + Slack

**Definition of Done (DoD):**
- [ ] Erro de teste capturado e aparece no dashboard Sentry
- [ ] Campos PSE (`sleepQuality`, `stress`, etc.) não aparecem em nenhum evento Sentry
- [ ] Alert de error rate configurado e testado

---

### 🧪 TEST — Testes

---

#### TASK-TEST-001 — Setup Vitest + Maestro (E2E Mobile)

**Prioridade:** `P0`
**Depende de:** TASK-INFRA-001

**Checklist de Implementação:**
- [ ] Instalar Vitest para testes de domínio puro (zero React Native dependency)
- [ ] Configurar `vitest.config.ts` com environment `node` (não jsdom)
- [ ] Instalar Maestro CLI para E2E no simulador
- [ ] Criar flow Maestro de smoke: app abre, tela de login exibida
- [ ] Scripts: `npm run test` (Vitest unit), `npm run test:e2e` (Maestro)
- [ ] GitHub Actions: rodar Vitest unit tests em cada PR

**Definition of Done (DoD):**
- [ ] `npm run test` roda todos os testes unitários de domínio
- [ ] Coverage report com Vitest (`--coverage`) gerado
- [ ] Maestro flow de smoke passa no simulador iOS
- [ ] CI roda Vitest em cada PR via GitHub Actions

---

## Legenda de Prioridade

| Prioridade | Significado |
|-----------|------------|
| P0 | Bloqueador — não pode avançar sem isso |
| P1 | Alta — deve estar no MVP |
| P2 | Média — importante mas não bloqueia MVP |
| P3 | Baixo — nice-to-have pós-MVP |

## Links

- [[01-product/PRD]] — User Stories que originam as tasks
- [[02-domain/domain-model]] — Entidades referenciadas
- [[04-architecture/decisions]] — ADRs que condicionam implementação
- [[06-security/security-model]] — Requisitos de segurança por task
