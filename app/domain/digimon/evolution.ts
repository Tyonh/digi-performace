import type { DigimonSpecies } from '@/domain/shared/types'

export type EvolutionStage =
  | 'egg'
  | 'baby'
  | 'in-training'
  | 'rookie'
  | 'champion'
  | 'ultimate'
  | 'mega'

export const EGG_STAGES: DigimonSpecies[] = ['egg1', 'egg2']

export interface EvolutionLine {
  id: string
  stages: { stage: EvolutionStage; species: DigimonSpecies; minXp: number }[]
}

export const AGUMON_LINE: EvolutionLine = {
  id: 'agumon-line',
  stages: [
    { stage: 'egg',         species: 'egg2',        minXp: 30   },
    { stage: 'baby',        species: 'botamon',     minXp: 80   },
    { stage: 'in-training', species: 'koromon',     minXp: 200  },
    { stage: 'rookie',      species: 'agumon',      minXp: 450  },
    { stage: 'champion',    species: 'greymon',     minXp: 900  },
    { stage: 'ultimate',    species: 'metalgreymon',minXp: 1600 },
    { stage: 'mega',        species: 'wargreymon',  minXp: 2500 },
  ],
}

export const EVOLUTION_LINES: Record<string, EvolutionLine> = {
  [AGUMON_LINE.id]: AGUMON_LINE,
}

// Retorna a espécie correspondente ao XP total acumulado.
// Antes de 30 XP: ainda egg1 (retorna null — o caller mantém egg1).
export function resolveSpeciesForXp(line: EvolutionLine, xp: number): DigimonSpecies | null {
  const reached = line.stages.filter((s) => xp >= s.minXp)
  if (reached.length === 0) return null   // ainda egg1
  return reached[reached.length - 1].species
}
