import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { pickStarterLineId } from '@/domain/digimon/starter'
import type { DigimonSpecies, DigimonStatus } from '@/domain/shared/types'
import type {
  ActiveDigimon,
  OnboardingState,
  SessionContextValue,
  SessionUser,
} from './types'

// Necessário no nativo para o navegador de auth fechar e devolver o controle.
WebBrowser.maybeCompleteAuthSession()

const CONSENT_VERSION = 'v1.0'

// Nível de display — só aparece na UI, não controla evolução (isso é feito por XP direto).
// Thresholds alinhados com os marcos evolutivos para o número fazer sentido visual.
function levelFromXp(xp: number): number {
  if (xp < 30)   return 0   // egg1
  if (xp < 80)   return 1   // egg2
  if (xp < 200)  return 2   // botamon
  if (xp < 450)  return 3   // koromon
  if (xp < 900)  return 4   // agumon
  if (xp < 1600) return 5   // greymon
  if (xp < 2500) return 6   // metalgreymon
  return 7                   // wargreymon
}

// ─────────────────────────────────────────────────────────────────────────────
// Deriva a fase do onboarding olhando os dados REAIS do usuário logado.
// Uma função só, reusada pelo onAuthStateChange (login) e pelo refresh
// (após gravar consentimento / criar Digimon). Sem duplicação.
//   sem consent_given_at  → needs-consent
//   sem Digimon vivo      → needs-digimon
//   tem Digimon ativo     → ready
// ─────────────────────────────────────────────────────────────────────────────
async function resolveStateForUser(user: User): Promise<OnboardingState> {
  const sessionUser: SessionUser = {
    id: user.id,
    githubLogin:
      (user.user_metadata?.user_name as string) ??
      (user.user_metadata?.preferred_username as string) ??
      '',
    avatarUrl: user.user_metadata?.avatar_url as string | undefined,
  }

  // 1) Consentimento (perfil criado pelo trigger). maybeSingle: 0 ou 1 linha.
  const { data: profile } = await supabase
    .from('users')
    .select('consent_given_at')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.consent_given_at) return { phase: 'needs-consent', user: sessionUser }

  // 2) Digimon ativo (slot mais baixo vivo). Inclui campos de lazy eval para
  //    o hook useLiveDigimonStatus calcular fome/energia no cliente.
  const { data: digimon } = await supabase
    .from('digimons')
    .select('id, name, species, status, health, is_sleeping, hunger_base, hunger_updated_at, hunger_decay_rate, energy_base, energy_updated_at, energy_decay_rate')
    .eq('user_id', user.id)
    .eq('is_alive', true)
    .order('slot', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!digimon) return { phase: 'needs-digimon', user: sessionUser }

  // 3) XP = soma do ledger (nível nunca é armazenado — sempre derivado).
  const { data: xpRows } = await supabase
    .from('xp_ledger')
    .select('amount')
    .eq('digimon_id', digimon.id)
  const xp = (xpRows ?? []).reduce((sum, r) => sum + (r.amount as number), 0)

  const activeDigimon: ActiveDigimon = {
    id: digimon.id,
    name: digimon.name,
    species: digimon.species as DigimonSpecies,
    level: levelFromXp(xp),
    xp,
    status: digimon.status as DigimonStatus,
    health: (digimon.health as number) ?? 100,
    hungerBase: (digimon.hunger_base as number) ?? 100,
    hungerUpdatedAt: (digimon.hunger_updated_at as string) ?? new Date().toISOString(),
    hungerDecayRate: (digimon.hunger_decay_rate as number) ?? 4,
    energyBase: (digimon.energy_base as number) ?? 100,
    energyUpdatedAt: (digimon.energy_updated_at as string) ?? new Date().toISOString(),
    energyDecayRate: (digimon.energy_decay_rate as number) ?? 3,
    isSleeping: (digimon.is_sleeping as boolean) ?? false,
  }
  return { phase: 'ready', user: sessionUser, activeDigimon }
}

// ─────────────────────────────────────────────────────────────────────────────
// FONTE ÚNICA DE VERDADE da sessão — ligada ao Supabase. A fase é DERIVADA dos
// dados reais, nunca setada à mão. onAuthStateChange reage a login/logout;
// refresh() recalcula após gravações que não mexem na sessão.
// ─────────────────────────────────────────────────────────────────────────────
const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({ phase: 'loading' })

  useEffect(() => {
    // Dispara INITIAL_SESSION no início (cobre o cold start) e depois a cada
    // login/logout. Chamadas ao supabase são adiadas (setTimeout 0) para não
    // travar no lock interno do auth — recomendação oficial do supabase-js.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState({ phase: 'anonymous' })
        return
      }
      setTimeout(() => {
        resolveStateForUser(session.user).then(setState)
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<SessionContextValue>(() => {
    // Recalcula a fase a partir da sessão atual (após gravar no banco).
    async function refresh() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setState({ phase: 'anonymous' })
        return
      }
      setState(await resolveStateForUser(data.user))
    }

    async function signInWithGitHub() {
      if (Platform.OS === 'web') {
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo: window.location.origin },
        })
        return
      }

      // No Expo Go o Android bloqueia redirecionamentos exp:// no Chrome Custom
      // Tabs. Usamos http://localhost como redirect: URL fixa (sem IP dinâmico),
      // o openAuthSessionAsync intercepta a navegação antes da página carregar.
      // Em produção (build nativo), digivice:// funciona normalmente.
      const isExpoGo = Constants.executionEnvironment === 'storeClient'
      const redirectTo = isExpoGo ? 'http://localhost' : Linking.createURL('/')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data?.url) return

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (res.type === 'success') {
        const { queryParams } = Linking.parse(res.url)
        const code = queryParams?.code as string | undefined
        if (code) await supabase.auth.exchangeCodeForSession(code)
      }
    }

    async function giveConsent() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return
      // upsert (não update): cria o perfil se ele ainda não existir e grava o
      // consentimento de uma vez. Robusto mesmo se o trigger não tiver rodado
      // para este usuário (ex: cadastro feito antes do trigger existir).
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email ?? `${user.id}@users.noreply.digivice`,
        github_id: (user.user_metadata?.provider_id as string) ?? null,
        github_handle: (user.user_metadata?.user_name as string) ?? null,
        consent_given_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      })
      if (error) {
        // eslint-disable-next-line no-console
        console.error('giveConsent falhou:', error.message)
        return
      }
      await refresh()
    }

    async function createDigimon(name: string, lineId?: string) {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      // Todo Digimon nasce do mesmo ovo (egg1), no slot 1. A LINHA evolutiva já
      // é decidida aqui (sorteada, ou a escolhida se vier por parâmetro) e fica
      // guardada — fica oculta na UI até o ovo chocar. Ver starter.ts.
      await supabase.from('digimons').insert({
        user_id: data.user.id,
        slot: 1,
        name: name.trim(),
        species: 'egg1',
        evolution_line_id: lineId ?? pickStarterLineId(),
      })
      await refresh()
    }

    async function signOut() {
      await supabase.auth.signOut()
      // onAuthStateChange cuida de voltar para 'anonymous'.
    }

    return { state, signInWithGitHub, giveConsent, createDigimon, signOut, refresh }
  }, [state])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>')
  return ctx
}
