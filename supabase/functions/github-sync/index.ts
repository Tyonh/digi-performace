import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const XP_PER_COMMIT = 5
const XP_CAP_PER_REPO = 25

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Preflight CORS — o browser manda OPTIONS antes do POST real.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── 1. Autenticar o usuário pelo JWT do Supabase ──────────────────────────
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return json({ error: 'Unauthorized' }, 401)

  // Service role: ignora RLS para poder escrever em qualquer linha do banco.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  // ── 2. Pegar o token do GitHub do corpo da requisição ────────────────────
  const body = await req.json().catch(() => ({}))
  const githubToken: string | undefined = body.githubToken
  if (!githubToken) return json({ error: 'Missing githubToken' }, 400)

  // ── 3. Ler perfil e Digimon ativo do banco ───────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('github_handle')
    .eq('id', user.id)
    .single()

  if (!profile?.github_handle) return json({ error: 'No GitHub handle' }, 400)

  const { data: digimon } = await supabase
    .from('digimons')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_alive', true)
    .order('slot', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!digimon) return json({ error: 'No active Digimon' }, 400)

  // ── 4. Buscar eventos do GitHub (últimos 100) ────────────────────────────
  const ghRes = await fetch(
    `https://api.github.com/users/${profile.github_handle}/events?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'Digivice-App/1.0',
        Accept: 'application/vnd.github+json',
      },
    },
  )
  if (!ghRes.ok) return json({ error: `GitHub API: ${ghRes.status}` }, 502)

  const events: GithubEvent[] = await ghRes.json()

  // ── 5. Agrupar PushEvents por (repo, dia) ────────────────────────────────
  // Cada push para o mesmo repo no mesmo dia soma os commits — evita criar
  // uma linha por push e simplifica a deduplicação (unique repo+date).
  type Entry = { repoName: string; periodDate: string; commitCount: number }
  const map = new Map<string, Entry>()

  for (const event of events) {
    if (event.type !== 'PushEvent') continue
    const periodDate = event.created_at.slice(0, 10) // YYYY-MM-DD
    const key = `${periodDate}:${event.repo.name}`
    const commits = event.payload.commits?.length ?? 0
    const existing = map.get(key)
    if (existing) {
      existing.commitCount += commits
    } else {
      map.set(key, { repoName: event.repo.name, periodDate, commitCount: commits })
    }
  }

  // ── 6. Inserir apenas as atividades novas (unique constraint ignora dups) ─
  let totalXp = 0

  for (const entry of map.values()) {
    const xpEarned = Math.min(entry.commitCount * XP_PER_COMMIT, XP_CAP_PER_REPO)

    const { error: insertErr } = await supabase.from('git_activities').insert({
      user_id: user.id,
      digimon_id: digimon.id,
      period_date: entry.periodDate,
      repo_name: entry.repoName,
      repo_category: 'code',
      languages: [],
      commit_count: entry.commitCount,
      xp_earned: xpEarned,
    })

    // 23505 = unique violation → já sincronizado, ignora.
    if (insertErr && insertErr.code !== '23505') continue

    if (!insertErr) {
      await supabase.from('xp_ledger').insert({
        digimon_id: digimon.id,
        user_id: user.id,
        source: 'github_commit',
        amount: xpEarned,
        repo_name: entry.repoName,
        commit_count: entry.commitCount,
      })
      totalXp += xpEarned
    }
  }

  return json({ ok: true, totalXp, activitiesSynced: map.size })
})

// ── Tipos mínimos da API do GitHub ──────────────────────────────────────────
interface GithubEvent {
  type: string
  created_at: string
  repo: { name: string }
  payload: { commits?: unknown[] }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
