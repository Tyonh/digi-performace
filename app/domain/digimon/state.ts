import type { DigimonStatus } from '@/domain/shared/types'

interface LazyStatField {
  base: number
  updatedAt: Date
  decayRatePerHour: number
}

// Calcula o valor atual de um campo que decai com o tempo (hunger, energy)
// O valor é calculado no momento da leitura — nada é escrito no banco a cada hora
export function calculateCurrentValue(field: LazyStatField): number {
  const hoursElapsed =
    (Date.now() - field.updatedAt.getTime()) / (1000 * 60 * 60)
  const decayed = field.base - hoursElapsed * field.decayRatePerHour
  return Math.round(Math.max(0, decayed))
}

interface DigimonStats {
  health: number    // 0–100
  hunger: number    // 0–100 (calculado via lazy evaluation)
  energy: number    // 0–100 (calculado via lazy evaluation)
  mood: number      // 0–100
  happiness: number // 0–100
}

// Determina o status do Digimon com base nos seus stats atuais
// A ordem das condições importa — verifica da mais grave para a menos grave
export function resolveStatus(stats: DigimonStats, isSleeping: boolean): DigimonStatus {
  if (stats.health <= 0) return 'dead'
  if (isSleeping) return 'sleeping'
  if (stats.health < 20 && stats.hunger < 20 && stats.energy < 20) return 'critical'
  if (stats.health < 30) return 'sick'
  if (stats.hunger < 20) return 'hungry'
  if (stats.energy < 20) return 'tired'
  return 'healthy'
}

// Quantas horas até o Digimon morrer por abandono a partir de agora
export function hoursUntilAbandonmentDeath(lastCaredAt: Date): number {
  const hoursAbandoned = (Date.now() - lastCaredAt.getTime()) / (1000 * 60 * 60)
  return Math.max(0, 72 - hoursAbandoned)
}
