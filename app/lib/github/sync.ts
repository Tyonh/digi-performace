import { supabase } from '@/lib/supabase/client'

export interface GithubSyncResult {
  xpEarned: number
  activitiesSynced: number
}

export async function syncGithubActivity(): Promise<GithubSyncResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { xpEarned: 0, activitiesSynced: 0 }

  // provider_token só existe logo após o login — lemos do banco como fallback.
  let githubToken = session.provider_token ?? null
  if (!githubToken) {
    const { data: profile } = await supabase
      .from('users')
      .select('github_token')
      .eq('id', session.user.id)
      .single()
    githubToken = (profile?.github_token as string | null) ?? null
  }

  if (!githubToken) return { xpEarned: 0, activitiesSynced: 0 }

  const { data, error } = await supabase.functions.invoke('github-sync', {
    body: { githubToken },
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
