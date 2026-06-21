# Security Model — Digivice

> **Status:** `DRAFT`
> **Última atualização:** 2026-06-20
> **Compliance:** LGPD (Lei 13.709/2018)
> **Relacionado:** [[00-context/tech-stack]] | [[04-architecture/decisions#ADR-002]]

---

## Classificação de Dados

Os dados do Digivice se enquadram em categorias distintas de sensibilidade:

| Dado | Classificação | Base Legal LGPD | Retenção |
|------|--------------|-----------------|----------|
| Email, nome de usuário | Pessoal | Contrato (Art. 7, V) | Enquanto conta ativa |
| GitHub handle, commits públicos | Pessoal — dado público | Legítimo interesse | Enquanto conta ativa |
| Respostas PSE (sono, estresse, dor física, humor) | **Dado de Saúde — Sensível** | Consentimento explícito (Art. 11, I) | 90 dias após solicitação de exclusão |
| Estado do Digimon (hunger, health, energy) | Derivado de dado sensível | Consentimento explícito | Exclusão com conta |
| GitHub OAuth Token | Credencial | Necessário para execução do contrato | Revogado no logout |

> ⚠️ **Dados PSE são dados de saúde.** Sob a LGPD, exigem consentimento específico, destacado e separado dos demais termos. O formulário de onboarding DEVE apresentar consentimento granular.

---

## Níveis de Acesso

### Roles no Sistema

```
ANON (não autenticado)
  └── Pode acessar: landing page, FAQ, tela de login
  └── Não pode acessar: nenhuma rota protegida

AUTHENTICATED (usuário logado)
  └── Pode acessar: seus próprios dados (Digimons, CheckIns, XpLedger)
  └── Não pode acessar: dados de outros usuários (enforced via RLS)

SERVICE_ROLE (backend — Inngest jobs)
  └── Pode acessar: todas as linhas (bypass RLS)
  └── Restrito a: ambiente server-side, nunca exposto ao cliente
  └── Usado para: sync GitHub, decaimento de stats, verificação de morte
```

### Row Level Security (Supabase RLS)

Toda tabela do banco possui RLS habilitado por padrão. Políticas obrigatórias:

```sql
-- Política padrão para todas as tabelas de usuário
-- Exemplo: tabela daily_checkins

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário só vê seus próprios registros
CREATE POLICY "users_select_own_checkins"
  ON daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: usuário só insere para si mesmo
CREATE POLICY "users_insert_own_checkins"
  ON daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: proibido para check-ins (imutabilidade do domínio)
-- DELETE: proibido — soft delete via campo deleted_at
```

**Tabelas que precisam de RLS:**
- `users` — SELECT/UPDATE próprio registro
- `digimons` — CRUD próprios
- `daily_checkins` — SELECT/INSERT (sem UPDATE/DELETE)
- `xp_ledger` — SELECT próprio (INSERT via SERVICE_ROLE apenas)
- `xp_entries` — SELECT próprio
- `nurse_actions` — INSERT/SELECT próprio
- `git_activities` — SELECT próprio (INSERT via SERVICE_ROLE)

---

## Autenticação

### Fluxo GitHub OAuth

```
[Usuário clica "Login com GitHub"]
        │
        ▼
[Supabase Auth → redirect para github.com/login/oauth/authorize]
  scopes: read:user, user:email, repo (read-only)
        │
        ▼
[GitHub retorna code → Supabase troca por access_token]
        │
        ▼
[Supabase cria sessão → JWT no cookie HttpOnly, Secure, SameSite=Lax]
        │
        ▼
[GitHub access_token armazenado em: supabase.auth.users (criptografado)]
        │
        ▼
[App Next.js lê sessão via createServerClient() em Server Components]
```

### Segurança do Token GitHub

- Token **nunca** vai para o cliente — processado apenas em Server Components ou Inngest jobs
- Token rotacionado automaticamente pelo Supabase Auth
- Em caso de revogação no GitHub: próximo sync falha, usuário é notificado para re-autenticar
- Permissões mínimas: `repo` read-only é necessário para commits privados — documentar no consentimento

### Session Management

```typescript
// Padrão obrigatório em todas as Server Components protegidas
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  // prosseguir com user.id garantido
}
```

**Nunca usar `getSession()` em Server Components** — não valida JWT contra o servidor.

---

## Proteção de Dados em Trânsito e Repouso

| Camada | Proteção |
|--------|---------|
| HTTPS | TLS 1.3 obrigatório — Vercel/Cloudflare enforça automaticamente |
| Banco (at rest) | AES-256 via Supabase (gerenciado) |
| Dados PSE em campo | Sem criptografia adicional além do RLS (suficiente para v1) |
| Cookies de sessão | `HttpOnly`, `Secure`, `SameSite=Lax` |
| Variáveis de ambiente | Supabase service key nunca em código — apenas em env server-side |

---

## Segurança Mobile

### Armazenamento Seguro no Device

| Dado | Armazenamento | Justificativa |
|------|--------------|---------------|
| JWT de sessão Supabase | `expo-secure-store` (Keychain/Keystore) | Nunca em AsyncStorage — texto plano |
| GitHub OAuth token | `expo-secure-store` | Acesso a dados de repositório — alta sensibilidade |
| Preferências UI, tema | `AsyncStorage` | Não sensível |
| Cache de sprites Lottie | FileSystem (`expo-file-system`) | Assets, não dados de usuário |

### Proteção contra Engenharia Reversa

- Variáveis de ambiente `EXPO_PUBLIC_*` são embutidas no bundle — **nunca colocar secrets nelas**
- `SUPABASE_ANON_KEY` é público por design (RLS é a proteção real) — pode ser `EXPO_PUBLIC_`
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** vai ao app — apenas nas Edge Functions server-side
- GitHub token do usuário fica no SecureStore, nunca em variável de ambiente do app

### Certificate Pinning (pós-MVP)

Para v1, TLS padrão é suficiente. Se o app evoluir para conter dados de saúde mais críticos, implementar certificate pinning via `react-native-ssl-pinning`.

---

## Proteções de API

### Rate Limiting

```
POST /api/checkin         → 1 request/dia por usuário (enforced no domínio + rate limit)
POST /api/digimon/action  → 10 requests/minuto por usuário
GET  /api/github/sync     → 1 request/hora por usuário
```

Implementação: middleware Next.js com **Upstash Ratelimit** ou verificação de último registro no banco (v1 simples).

### Input Validation

Toda entrada de usuário validada com **Zod** antes de tocar o domínio:

```typescript
const CheckInSchema = z.object({
  sleepQuality: z.number().int().min(0).max(10),
  fatigue:      z.number().int().min(0).max(10),
  stress:       z.number().int().min(0).max(10),
  nutrition:    z.number().int().min(0).max(10),
  motivation:   z.number().int().min(0).max(10),
  mood:         z.number().int().min(0).max(10),
  physicalPain: z.number().int().min(0).max(10),
})
```

### CSRF Protection

Next.js App Router com Server Actions ou Route Handlers usa o header `Origin` para validação automática. Para Route Handlers customizados:

```typescript
// Verificar que a requisição vem do mesmo origin
if (request.headers.get('origin') !== process.env.NEXT_PUBLIC_APP_URL) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## LGPD — Direitos do Titular

| Direito | Implementação | Status |
|---------|--------------|--------|
| Acesso aos dados | Endpoint `GET /api/user/data-export` (JSON completo) | `BACKLOG` |
| Correção | Tela de perfil editável | `BACKLOG` |
| Exclusão ("direito ao esquecimento") | `DELETE /api/user/account` — soft delete 30 dias, purge total | `BACKLOG` |
| Portabilidade | Mesmo endpoint de export | `BACKLOG` |
| Revogação de consentimento | Toggle na tela de configurações — para coleta de PSE | `BACKLOG` |
| Consentimento granular | Tela de onboarding com checkbox explícito para dados de saúde | `TASK-SEC-001` |

---

## Checklist de Segurança — Pré Go-Live

- [ ] RLS habilitado e testado em todas as tabelas
- [ ] GitHub token não aparece em logs (mascarado)
- [ ] Variáveis de ambiente auditadas (`SUPABASE_SERVICE_ROLE_KEY` nunca em `NEXT_PUBLIC_`)
- [ ] Política de cookies revisada pelo advogado/DPO
- [ ] Página de Política de Privacidade publicada mencionando coleta de dados de saúde
- [ ] Consentimento explícito implementado no onboarding
- [ ] Testes de penetração básico (OWASP Top 10) antes do go-live

---

## Links

- [[04-architecture/decisions#ADR-002]] — Justificativa do Supabase + RLS
- [[01-product/PRD#requisitos-não-funcionais]] — Requisitos de segurança do produto
- [[08-observability/observability]] — Logs de acesso e auditoria
