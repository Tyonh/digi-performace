import type { DigimonSpecies, DigimonStatus } from '@/domain/shared/types'

// O usuário do Digivice é uma MÁQUINA DE ESTADOS. A qualquer momento ele está
// em exatamente uma destas fases — e é isso que decide para qual tela ele vai.
// Modelar como union discriminada (campo `phase`) faz o TypeScript garantir que
// só acessamos `user`/`activeDigimon` quando eles realmente existem.
export type OnboardingState =
  | { phase: 'loading' } //          ainda verificando se há sessão salva
  | { phase: 'anonymous' } //        sem sessão → precisa logar
  | { phase: 'needs-consent'; user: SessionUser } //   logou, falta aceitar LGPD
  | { phase: 'needs-digimon'; user: SessionUser } //   consentiu, falta criar o pet
  // ovo chegou ao XP de choco mas o jogador ainda não escolheu a linha inicial
  | { phase: 'needs-hatch-choice'; user: SessionUser; activeDigimon: ActiveDigimon }
  | { phase: 'ready'; user: SessionUser; activeDigimon: ActiveDigimon } // tudo pronto

// Quem é o dono. Vem do GitHub (login OAuth).
export interface SessionUser {
  id: string
  githubLogin: string
  avatarUrl?: string
}

// O Digimon ativo no slot atual. (No futuro: até 3 slots por usuário.)
// Os campos *Base/*UpdatedAt/*DecayRate são os dados brutos para lazy eval —
// o status REAL é calculado no cliente pelo hook useLiveDigimonStatus.
export interface ActiveDigimon {
  id: string
  name: string
  species: DigimonSpecies
  level: number
  xp: number
  status: DigimonStatus   // snapshot do banco; prefira useLiveDigimonStatus no UI
  health: number
  hungerBase: number
  hungerUpdatedAt: string // ISO
  hungerDecayRate: number
  energyBase: number
  energyUpdatedAt: string // ISO
  energyDecayRate: number
  isSleeping: boolean
}

// O contrato que TODA tela enxerga. As telas dependem desta interface —
// não do Supabase. Trocar o mock pelo backend real é trocar só a implementação.
export interface SessionContextValue {
  state: OnboardingState
  signInWithGitHub: () => Promise<void>
  giveConsent: () => Promise<void>
  // lineId opcional: se vier (futura tela de "escolha seu inicial"), usa essa
  // linha; se não, o sistema de starter sorteia. Ver domain/digimon/starter.ts.
  createDigimon: (name: string, lineId?: string) => Promise<void>
  // Define a linha evolutiva no momento do choco (tela de escolha do inicial).
  chooseStarterLine: (lineId: string) => Promise<void>
  signOut: () => Promise<void>
  // Recalcula o estado a partir do banco (ex: após um check-in mudar o Digimon).
  refresh: () => Promise<void>
}
