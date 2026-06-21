# Architecture Decision Records (ADRs)

> **Projeto:** Digivice
> **Última atualização:** 2026-06-20
> **Formato:** MADR (Markdown Any Decision Record)
> **Relacionado:** [[00-context/tech-stack]] | [[02-domain/domain-model]]

---

## ADR-001 — Expo (React Native) como Plataforma Mobile

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
O Digivice é um app de pet virtual com mecânicas de cuidado (Tamagotchi). Sessões são curtas e frequentes, push notifications de cuidado são críticas, e animações do Digimon precisam de 60fps consistentes. Web/PWA apresenta limitações sérias nesses três pontos no iOS.

### Decisão
**Expo SDK 52+ (Managed Workflow)** como plataforma primária.

### Consequências
- ✅ Push notifications nativas via Expo Push Service — funcionam em iOS e Android
- ✅ Expo Router replica a DX do Next.js App Router — mesma filosofia de file-based routing
- ✅ EAS Build gera binários iOS/Android sem necessidade de Mac para builds de CI
- ✅ EAS Update permite hotfixes sem submissão à store (para JS changes)
- ⚠️ Managed workflow limita módulos nativos customizados — se precisar de módulo nativo não suportado, migrar para Bare Workflow
- ⚠️ Tamanho de bundle inicial maior que web — otimizar com lazy loading de assets Lottie

---

## ADR-002 — Supabase como Database, Auth e BaaS

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
O app mobile precisa se comunicar com um backend. As opções eram: backend dedicado (Node/Go) + Supabase apenas como DB, ou comunicação direta app → Supabase com RLS.

### Decisão
**Comunicação direta app mobile → Supabase** via `@supabase/supabase-js`. RLS é a camada de autorização — não há backend intermediário em v1.

### Justificativa
- App mobile se autentica via Supabase Auth → JWT gerado
- Toda query SQL passa pela RLS com `auth.uid()` — dados são isolados no banco
- Elimina um hop de rede (app → API → Supabase vira app → Supabase)
- Reduz superfície de ataque e custo de infra em v1

### Consequências
- ✅ Zero servidores gerenciados para operações CRUD
- ✅ Realtime subscriptions para sync de estado entre devices
- ⚠️ Lógica de negócio crítica (cálculo de morte, creditar XP) NÃO pode estar no cliente — deve ir para Supabase Edge Functions ou Inngest
- ⚠️ Se RLS tiver bug, dados de usuários podem vazar — testes de RLS são obrigatórios antes do deploy

---

## ADR-003 — pg_cron + Supabase Edge Functions para Background Jobs

**Status:** `ACEITO`
**Data:** 2026-06-20 (revisado: complexidade reduzida)

### Contexto
Jobs recorrentes necessários: sync GitHub (24h), decaimento de stats (1h), verificação de morte (1h). No contexto mobile serverless, esses jobs precisam rodar no servidor.

A proposta anterior usava Inngest como intermediário, criando 4 hops desnecessários para operações que são essencialmente SQL puro.

### Decisão
**Supabase `pg_cron`** para jobs de banco puro. **Supabase Edge Functions** apenas para o GitHub sync (única operação que chama API externa).

### Fluxo por tipo de job

```
JOBS DE BANCO PURO (morte, status crítico):
pg_cron → SQL function no Postgres → done
Hops: 1

GITHUB SYNC (API externa):
pg_cron (24h) → Edge Function → GitHub API → INSERT xp_ledger
Hops: 3
```

### Por que não Inngest em v1
- Decaimento e morte são `UPDATE` SQL — não precisam sair do banco
- GitHub sync via Edge Function já tem comportamento de retry no próximo ciclo do pg_cron
- Inngest adiciona uma dependência externa e billing sem resolver problema real em v1
- **Inngest faz sentido quando:** fan-out de jobs (1 evento → N sub-jobs), retry granular por usuário, ou observabilidade detalhada de falhas em alta escala

### Migração futura para Inngest
Se o volume crescer e o log do Supabase não for suficiente para debugar falhas de GitHub sync, extrair apenas esse job para Inngest. Não migrar os jobs de banco puro — pg_cron é suficiente para sempre.

### Consequências
- ✅ Zero dependências externas além do Supabase
- ✅ Jobs de morte e decay são SQL atomico — sem estado externo para reconciliar
- ✅ Sem custo adicional (pg_cron incluso no Supabase)
- ⚠️ Observabilidade de jobs limitada ao `cron.job_run_details` do Supabase — suficiente para v1
- ⚠️ GitHub sync sem retry inteligente — falha aguarda o próximo ciclo de 24h

---

## ADR-004 — Migrations SQL nativas do Supabase (substitui Drizzle)

**Status:** `ACEITO`
**Data:** 2026-06-20 (revisado: Drizzle removido)

### Contexto
O schema do banco evolui com o domínio. Precisamos de migrations versionadas e documentação do schema em código. A proposta original era **Drizzle ORM**, mas, ao detalhar a arquitetura, ficou claro que:
- O app mobile usa `@supabase/supabase-js` direto — **não** o client do Drizzle.
- Os tipos do app vêm de `supabase gen types`, **não** do Drizzle.
- RLS policies, pg_cron e funções SQL **precisam ser escritos em SQL puro** de qualquer forma (Drizzle não os gerencia bem).

Ou seja: o Drizzle só definiria as tabelas em TypeScript, enquanto metade do banco (a metade de segurança e jobs) continuaria em SQL — **fonte da verdade partida em dois lugares**, sem benefício real para este desenho.

### Decisão
**Migrations SQL nativas do Supabase** (`supabase/migrations/*.sql`, aplicadas via Supabase CLI). Tabelas, RLS, pg_cron e funções ficam todos em SQL — uma fonte da verdade única. Tipos do app gerados por `supabase gen types typescript`.

### Consequências
- ✅ Schema como código — `git diff` mostra exatamente o que muda no banco
- ✅ Tabelas, RLS, cron e funções no mesmo lugar e na mesma linguagem (SQL)
- ✅ Zero dependência/camada extra — alinhado com a redução de complexidade do ADR-003
- ✅ Tipos TypeScript do app via `supabase gen types` (fonte = o banco real, sem divergência)
- ⚠️ Sem ORM: as queries do app são via supabase-js (tipadas pelos types gerados); queries em Edge Functions são SQL/supabase-js
- ⚠️ Escrever RLS exige cuidado manual — testes de RLS obrigatórios antes do deploy (ver [[06-security/security-model]])

---

## ADR-005 — PNGs individuais por estado (v1) → Sprites customizados (v2)

**Status:** `ACEITO`
**Data:** 2026-06-20 (revisado: sprites reais do Digivice em v1)

### Contexto
Os sprites são do **Digital Monster Ver. 20th** — 15 frames numerados (0–14) por espécie, seguindo o padrão dos V-Pets originais. Esse padrão não define estados como "arquivos de estado", mas sim **frames de animação de movimento** que dão vida ao pet. Estados especiais (sono, doença, morte) são mostrados por **símbolos sobrepostos** (overlays), não por sprites próprios.

### Decisão
Replicar o modelo autêntico do Digital Monster:
- **A "vida" vem da animação** — alternar entre frames idle (0↔1) cria a respiração do pet
- **Estados especiais usam overlays** extraídos da seção "UI Elements" da spritesheet:
  - Sono → sprite deitado + **Zzz**
  - Doença → sprite deitado + **caveira** (skull)
  - Morte → **lápide** (grave) substitui o Digimon
- **v2:** sprites customizados substituem só os assets — o modelo de animação não muda

### Significado dos 15 frames (analisado do Agumon)

| Frame | Significado | | Frame | Significado |
|-------|-------------|-|-------|-------------|
| 0 | idle A (parado) | | 8 | recusa / triste |
| 1 | idle B (respiração) | | 9 | cabeça baixa |
| 2 | feliz | | 10 | cansado / sentado |
| 3 | ataque / rugido | | 11 | dormindo A |
| 4 | de frente (chamando) | | 12 | dormindo B |
| 5 | andar A | | 13 | piscar (olhos fechados) |
| 6 | andar B | | 14 | comendo (olhos fechados) |
| 7 | comendo / chamando | | | |

### Mapeamento estado → animação + overlay

| Status | frames (alternam) | overlay | fps |
|--------|-------------------|---------|-----|
| healthy | 0 ↔ 1 | — | 1.5 |
| hungry | 8 ↔ 9 | — | 1.5 |
| tired | 10 ↔ 0 | — | 1 |
| sleeping | 11 ↔ 12 | Zzz | 0.8 |
| sick | 11 ↔ 12 | caveira | 0.8 |
| critical | 8 ↔ 10 | caveira | 3 (pisca) |
| dead | — | lápide | — |

### Arquitetura em 3 camadas

```
frames.ts          → require() estático de todos os 15 PNGs por espécie + overlays
animation-map.ts   → significado dos frames + mapa status → {frames, fps, overlay}
DigimonSprite.tsx  → cicla os frames (setInterval) e sobrepõe o overlay
```

### Por que require() precisa ser estático

O Metro (bundler do Expo) analisa todos os `require()` em tempo de compilação. Não dá para montar o path dinamicamente:

```typescript
require(`@/assets/digimon/${species}/${i}.png`)  // ❌ Metro não resolve
require('@/assets/digimon/agumon/0.png')          // ✅ path literal
```

Por isso `frames.ts` lista cada arquivo explicitamente (15 por espécie). Verboso, mas é o único jeito.

### Limitação conhecida (pixel art no native)

React Native escala imagens com interpolação bilinear por padrão — pixel art pode ficar levemente borrado ao ampliar 6x. Não há um `image-rendering: pixelated` cross-platform confiável no native. Aceitável para v1; se incomodar, pré-escalar os PNGs no tamanho de exibição resolve.

### Consequências
- ✅ Uma única imagem carregada uma vez — eficiente em memória
- ✅ Zero dependência externa — só `Image` nativo do React Native
- ✅ Funciona imediatamente com a spritesheet disponível
- ✅ Migração para sprites customizados isolada em um único componente
- ⚠️ Coordenadas da spritesheet precisam ser mapeadas manualmente por espécie — trabalho inicial de uma vez só
- ⚠️ Sprites de terceiros não podem ir para produção pública (direitos autorais) — substituir pelos customizados antes do lançamento na store
- ⚠️ Sprites pixel art são pequenos — escalar com `transform: scale(3)` para ficarem visíveis em telas modernas; sem `resizeMode` que borre pixels (`image-rendering: pixelated` equivalente no RN é `resizeMode="contain"` + escala manual)

---

## ADR-006 — Lazy Evaluation para Decaimento de Stats

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
`hunger` e `energy` decaem com o tempo. Escrever no banco a cada hora para cada Digimon ativo é custoso e desnecessário.

### Decisão
**Lazy Evaluation** — armazenar valor base + timestamp + taxa de decaimento. Calcular valor atual on-read.

```typescript
// No banco: armazenado
{ hungerBase: 80, hungerUpdatedAt: '2026-06-20T10:00Z', hungerDecayRate: 5 }  // 5pts/hora

// No cliente: calculado
const hoursElapsed = (Date.now() - new Date(hungerUpdatedAt).getTime()) / 3600000
const currentHunger = Math.max(0, hungerBase - (hoursElapsed * hungerDecayRate))
```

### Consequências
- ✅ Zero writes periódicos — banco escala com interações, não com tempo
- ✅ Valor sempre preciso no momento da leitura no device
- ⚠️ Lógica duplicada: calculada no app (exibição) e no job Inngest (verificação de morte)
- ⚠️ Clocks do device e do servidor podem divergir — usar sempre `Date.now()` do servidor para verificações críticas de morte

---

## ADR-007 — Expo Notifications para Push Notifications

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
Push notifications são críticas para o loop de retenção: "Seu Digimon está com fome", "Faltam 24h para ele morrer". No iOS, Web Push não é confiável. Push nativo requer APNs (iOS) e FCM (Android).

### Decisão
**Expo Notifications** com **Expo Push Service** como abstração sobre APNs + FCM.

### Fluxo de Notificação
```
[Job Inngest detecta evento crítico]
        │
        └──► [Busca Expo Push Token do usuário no banco]
                        │
                        └──► [POST api.expo.dev/v2/push/send]
                                        │
                                        └──► [APNs / FCM → device]
```

### Consequências
- ✅ Única API para iOS e Android
- ✅ Sem necessidade de gerenciar certificados APNs diretamente
- ✅ `expo-notifications` lida com permissão, token e deep link
- ⚠️ Expo Push Service tem limite de 600 notificações/segundo no plano gratuito
- ⚠️ Se app sair do Expo ecosystem no futuro, migrar para `react-native-firebase` (FCM direto)

---

## ADR-008 — Armazenamento Seguro de Tokens no Device

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
A sessão Supabase (JWT) e o token GitHub precisam persistir entre sessões do app. `AsyncStorage` é texto plano — inaceitável para tokens.

### Decisão
**`expo-secure-store`** para armazenamento de tokens sensíveis (iOS Keychain / Android Keystore).

```typescript
// Supabase configurado para usar SecureStore
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(url, anonKey, {
  auth: { storage: ExpoSecureStoreAdapter, autoRefreshToken: true },
})
```

### Consequências
- ✅ JWT e tokens protegidos pelo Keychain/Keystore do OS
- ✅ Token GitHub nunca em `AsyncStorage` ou logs
- ⚠️ `expo-secure-store` tem limite de 2KB por item — suficiente para tokens JWT

---

## ADR-009 — Supabase Edge Functions para Lógica Server-Side

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
Operações que não podem estar no cliente: creditar XP (manipulação de ledger), verificação de threshold de evolução, acionamento do Inngest. Em v1 não há servidor Node dedicado.

### Decisão
**Supabase Edge Functions (Deno)** para lógica server-side que requer `service_role` ou processamento seguro.

### Edge Functions necessárias
| Function | Trigger | Responsabilidade |
|----------|---------|-----------------|
| `process-checkin` | HTTP (app) | Valida check-in, atualiza DigimonState, credita XP |
| `github-sync` | Inngest job | Busca commits, calcula XP, chama evolução se necessário |
| `digimon-decay-check` | Cron Supabase | Verifica deaths e triggers notificações |
| `trigger-inngest` | Database trigger | Enfileira jobs no Inngest |

### Consequências
- ✅ Sem servidor gerenciado — Edge Functions sobem em milissegundos
- ✅ Acesso a `service_role` sem expor a chave ao cliente
- ⚠️ Deno runtime — algumas libs Node.js não são compatíveis; usar `npm:` specifier
- ⚠️ Cold start de Edge Functions pode ser perceptível — usar `keep_alive` para funções críticas

---

## ADR-013 — Check-in reflete o bem-estar imediatamente (espelho); health estável entre check-ins

**Status:** `ACEITO`
**Data:** 2026-06-20

### Contexto
O coração do Digivice é "o Digimon reflete o seu estado". Ao enviar o check-in PSE diário, precisávamos decidir COMO e QUANDO isso afeta o pet. Alternativas: (a) o pet muda na hora; (b) o pet escorrega gradualmente ao longo do dia até o alvo.

### Decisão
**Espelho imediato.** No envio do check-in:
1. `calculateWellbeingIndex()` (média ponderada; dimensões negativas — fadiga, estresse, dor — invertidas, valores brutos preservados) → `wellbeing_index` (0–10).
2. `wellbeingToHealth()` → `health` (0–100), gravado na hora em `digimons`.
3. `resolveStatus(health, fome, energia, dormindo)` → `status`, gravado na hora.

O `health` é **estável entre check-ins** (não decai) — o estado de uma pessoa não muda de hora em hora. Quem decai com o tempo é fome/energia (mecânica separada, ADR-006 + TASK-CARE-003).

`health` vindo do PSE é **limitado a um piso (≥1)**: um único dia ruim deixa o Digimon `sick`/`critical` (expressivo), mas **não o mata**. Morte vem só da mecânica de negligência (causas: abandonment/starvation/poor_health sustentada), nunca de um check-in isolado.

### Consequências
- ✅ Fiel à premissa do produto: o pet É um espelho, reage na hora
- ✅ Simples em v1: grava `health` e `status` no envio (snapshot)
- ⚠️ Enquanto fome/energia não decaem, o `status` gravado não fica "velho". Quando a mecânica de decaimento entrar, migrar `status` para cálculo on-read (a partir de health+fome+energia), mantendo o snapshot só para jobs/notificações server-side
- ⚠️ A curva `wellbeingToHealth` é linear (index×10) em v1 — ajustável se o balanceamento pedir

---

## ADRs Pendentes

| # | Decisão | Prazo | Critério |
|---|---------|-------|---------|
| ADR-010 | Rive vs Lottie para evolução (Rive tem interatividade nativa) | Antes do TASK-UI-001 | Depende do designer |
| ADR-011 | Offline-first: Supabase offline sync vs sem offline | Pós-MVP | Feedback de usuários |
| ADR-012 | Monetização: freemium com 3 slots vs free total | Pré-launch | Decisão de produto |

---

## Links

- [[00-context/tech-stack]] — Stack consolidada após ADRs
- [[02-domain/domain-model]] — Modelo impactado pelos ADRs
- [[06-security/security-model]] — ADR-008 impacta armazenamento seguro
- [[08-observability/observability]] — Métricas de validação dos ADRs
