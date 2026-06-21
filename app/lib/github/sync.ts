import { supabase } from '@/lib/supabase/client'

export interface GithubSyncResult {
  xpEarned: number
  activitiesSynced: number
}

// Dispara o sync de commits do GitHub → XP. Passa o provider_token da sessão
// atual para a Edge Function autenticar com a API do GitHub.
// Retorna silenciosamente se não houver token (sessão expirou ou foi renovada
// sem o provider_token — o usuário precisa fazer login de novo para reativar).
export async function syncGithubActivity(): Promise<GithubSyncResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token) return { xpEarned: 0, activitiesSynced: 0 }

  const { data, error } = await supabase.functions.invoke('github-sync', {
    body: { githubToken: session.provider_token },
  })

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('github-sync:', error.message)
    return { xpEarned: 0, activitiesSynced: 0 }
  }

  return {
    xpEarned: (data?.totalXp as number) ?? 0,
    activitiesSynced: (data?.activitiesSynced as number) ?? 0,
  }
}
