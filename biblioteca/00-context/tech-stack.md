# Tech Stack — Digivice

> **Status:** `DEFINIDO`
> **Última atualização:** 2026-06-20
> **Plataforma:** Mobile-first (iOS + Android)
> **Relacionado:** [[04-architecture/decisions]]

---

## Decisão de Plataforma

O Digivice é um **aplicativo mobile nativo** construído com Expo (React Native).

**Por que não PWA/Next.js mobile:**
- Push notifications confiáveis exigem native runtime — Web Push tem suporte limitado no iOS
- Animações do Digimon (idle, sleeping, evolução) precisam de 60fps garantidos — canvas nativo é superior ao browser
- Acesso a background tasks para alertas de cuidado requer APIs nativas
- A mecânica de cuidado (Tamagotchi) cria sessões curtas e frequentes — padrão de uso tipicamente mobile

---

## Stack Principal

### App Mobile

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Runtime | **Expo SDK 52+** | Managed workflow — builds iOS/Android sem Xcode/Android Studio localmente |
| Framework | **Expo Router v4** | File-based routing igual ao Next.js App Router — curva zero para quem conhece Next |
| Linguagem | **TypeScript 5.x (strict mode)** | Obrigatório — domínio complexo exige tipagem forte |
| Estilização | **NativeWind v4** | Tailwind CSS para React Native — mesma DX do web |
| Componentes | **React Native core + custom** | Sem dependência de UI lib de terceiro no core |
| Animações de UI | **Animated API** (nativa do RN) | Barras de status, efeitos simples — já vem no React Native, sem instalação |
| Sprites v1 | **Image** (nativa do RN) | Recorte de spritesheet V-Pet via `overflow:hidden` + `transform translateX/Y` |
| Sprites v2 | **lottie-react-native** | Substituição futura por animações customizadas — isolada em `DigimonSprite.tsx` |
| Animações avançadas | **React Native Reanimated 3** | Adicionado apenas se a Animated API apresentar jank real em uso — não em v1 |
| Navegação | **Expo Router** (file-based) | Stack, Tabs e Modals declarativos |

### Backend / BaaS

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Database + Auth | **Supabase** | PostgreSQL gerenciado, RLS nativo, GitHub OAuth built-in |
| Client SDK | **@supabase/supabase-js** | Client direto do app — RLS garante isolamento sem backend intermediário |
| ORM (migrations) | **Drizzle ORM** | Migrations versionadas em código; Drizzle Studio para inspeção local |
| Background Jobs | **Supabase pg_cron** | Jobs de banco puro: morte do Digimon, verificação de status crítico |
| Jobs externos | **Supabase Edge Functions** | GitHub sync — única operação que chama API externa |
| Push Notifications | **Expo Notifications + EAS** | Push nativo iOS/Android via Expo Push Service |

> **Nota arquitetural:** O app mobile se comunica **diretamente com Supabase** para operações de dados (RLS enforça isolamento). Jobs recorrentes rodam via `pg_cron` dentro do próprio Postgres para operações de banco, e via Edge Functions apenas quando precisam chamar APIs externas (GitHub). Zero servidores externos em v1.

### Integrações Externas

| Serviço | Uso |
|---------|-----|
| **GitHub OAuth** | Login via Supabase Auth |
| **GitHub REST API v3** | Commits e repositórios para XP |
| **GitHub GraphQL API** | Contribution calendar e linguagens de projetos |
| **Expo Push Service** | Notificações de cuidado do Digimon |

### Build e Distribuição

| Ferramenta | Uso |
|-----------|-----|
| **EAS Build** | CI/CD de builds iOS e Android na nuvem |
| **EAS Submit** | Submit automático para App Store e Google Play |
| **EAS Update** | OTA updates — bugfixes sem nova submissão às stores |

---

## Qualidade de Código

| Ferramenta | Configuração |
|-----------|-------------|
| **ESLint** | `eslint-config-expo` + regras do projeto |
| **Prettier** | Formatação automática |
| **Husky + lint-staged** | Pre-commit: lint + type-check |
| **Commitlint** | Conventional Commits (`feat:`, `fix:`, `chore:`) |
| **Vitest** | Testes de domínio puro (sem dependência de React Native) |
| **Maestro** | E2E mobile — fluxos críticos no simulador/device |

---

## Padrões Obrigatórios

### TypeScript

```typescript
// ✅ Correto — tipos explícitos nas interfaces de domínio
interface DigimonState {
  id: string
  health: PseScore        // branded type 0–10
  mood: PseScore
  hunger: number          // 0–100, lazy evaluated
  energy: number          // 0–100, lazy evaluated
  status: DigimonStatus
}

// ❌ Proibido em qualquer camada
function updateState(data: any) {}
```

### Animações (Reanimated)

```typescript
// ✅ Correto — worklet no thread nativo
const animatedStyle = useAnimatedStyle(() => ({
  opacity: withSpring(isVisible.value ? 1 : 0),
}))

// ❌ Proibido — setState em loop de animação causa jank
setOpacity(isVisible ? 1 : 0)
```

### Nomenclatura

| Padrão | Uso |
|--------|-----|
| `PascalCase` | Componentes, Classes, Tipos, Interfaces |
| `camelCase` | Funções, variáveis, props, hooks |
| `kebab-case` | Arquivos de rota do Expo Router (`app/checkin/index.tsx`) |
| `SCREAMING_SNAKE` | Constantes de configuração e env vars |
| `use` prefix | Custom hooks exclusivamente |

---

## Estrutura de Pastas

```
digivice/
├── app/                          # Expo Router — file-based routing
│   ├── (auth)/
│   │   └── login.tsx             # Tela de login
│   ├── (tabs)/                   # Bottom tabs — área logada
│   │   ├── index.tsx             # Dashboard — Digimon ativo
│   │   ├── checkin.tsx           # Formulário PSE diário
│   │   └── history.tsx           # Histórico de bem-estar
│   ├── digimon/
│   │   ├── create.tsx            # Criação de novo Digimon
│   │   └── [id]/
│   │       ├── index.tsx         # Detalhe do Digimon
│   │       └── care.tsx          # Ações de cuidado
│   └── _layout.tsx               # Root layout + providers
├── domain/                       # Lógica de domínio pura (zero RN dependency)
│   ├── digimon/
│   ├── checkin/
│   └── github/
├── lib/                          # Infraestrutura e adapters
│   ├── supabase/                 # Client config
│   ├── github/                   # GitHub API adapter
│   └── notifications/            # Expo Notifications helper
├── components/                   # UI Components
│   ├── digimon/
│   │   ├── DigimonSprite.tsx     # Lottie + estado visual
│   │   ├── StatusBars.tsx        # Hunger, energy, health
│   │   └── EvolutionModal.tsx    # Animação de evolução
│   └── ui/                       # Componentes base reutilizáveis
├── hooks/                        # Custom hooks
├── db/                           # Drizzle schema + migrations
└── assets/
    ├── digimon/                  # 15 frames numerados (0-14) por espécie
    │   ├── egg1/  egg2/          # fases de nascimento (ovo)
    │   ├── botamon/ koromon/ agumon/ greymon/ metalgreymon/
    └── ui/                       # overlays de estado: skull, zzz, grave
└── lib/
    └── sprites/
        ├── frames.ts            # require() estático dos 15 frames por espécie
        ├── animation-map.ts     # status → {frames, fps, overlay}
        └── types.ts             # SpriteSource, OverlayKey
```

---

## Decisões Pendentes

- [ ] **ADR-010** — Supabase Edge Functions vs servidor Next.js para jobs Inngest — [[04-architecture/decisions#ADR-010]]
- [ ] **ADR-011** — Armazenamento seguro de token GitHub no device: `expo-secure-store` vs Supabase session only — [[04-architecture/decisions#ADR-011]]

---

## Links

- [[00-context/project-overview]] — Visão geral do projeto
- [[04-architecture/decisions]] — ADRs relacionados à stack
- [[06-security/security-model]] — Segurança mobile + dados sensíveis
