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

// XP em que o ovo evolui de egg1 → egg2 e em que ele CHOCA (egg2 → bebê).
// São iguais em todas as linhas (o ovo é compartilhado), por isso ficam aqui
// como constantes — e é em HATCH_XP que a tela de escolha do inicial aparece.
export const EGG2_XP = 30
export const HATCH_XP = 80

export interface EvolutionLine {
  id: string
  name: string // nome reconhecível da linha (forma rookie), ex: 'Agumon'
  stages: { stage: EvolutionStage; species: DigimonSpecies; minXp: number }[]
}

export const AGUMON_LINE: EvolutionLine = {
  id: 'agumon-line',
  name: 'Agumon',
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

export const GABUMON_LINE: EvolutionLine = {
  id: 'gabumon-line',
  name: 'Gabumon',
  stages: [
    { stage: 'egg',         species: 'egg2',          minXp: 30   },
    { stage: 'baby',        species: 'punimon',        minXp: 80   },
    { stage: 'in-training', species: 'tsunomon',       minXp: 200  },
    { stage: 'rookie',      species: 'gabumon',        minXp: 450  },
    { stage: 'champion',    species: 'garurumon',      minXp: 900  },
    { stage: 'ultimate',    species: 'weregarurumon',  minXp: 1600 },
    { stage: 'mega',        species: 'metalgarurumon', minXp: 2500 },
  ],
}

export const PATAMON_LINE: EvolutionLine = {
  id: 'patamon-line',
  name: 'Patamon',
  stages: [
    { stage: 'egg',         species: 'egg2',        minXp: 30   },
    { stage: 'baby',        species: 'poyomon',     minXp: 80   },
    { stage: 'in-training', species: 'tokomon',     minXp: 200  },
    { stage: 'rookie',      species: 'patamon',     minXp: 450  },
    { stage: 'champion',    species: 'angemon',     minXp: 900  },
    { stage: 'ultimate',    species: 'magnaangemon', minXp: 1600 },
    { stage: 'mega',        species: 'seraphimon',  minXp: 2500 },
  ],
}

export const TENTOMON_LINE: EvolutionLine = {
  id: 'tentomon-line',
  name: 'Tentomon',
  stages: [
    { stage: 'egg',         species: 'egg2',                minXp: 30   },
    { stage: 'baby',        species: 'pabumon',             minXp: 80   },
    { stage: 'in-training', species: 'motimon',             minXp: 200  },
    { stage: 'rookie',      species: 'tentomon',            minXp: 450  },
    { stage: 'champion',    species: 'kabuterimon',         minXp: 900  },
    { stage: 'ultimate',    species: 'megakabuterimon',     minXp: 1600 },
    { stage: 'mega',        species: 'herculeskabuterimon', minXp: 2500 },
  ],
}

export const PALMON_LINE: EvolutionLine = {
  id: 'palmon-line',
  name: 'Palmon',
  stages: [
    { stage: 'egg',         species: 'egg2',    minXp: 30   },
    { stage: 'baby',        species: 'yuramon', minXp: 80   },
    { stage: 'in-training', species: 'tanemon', minXp: 200  },
    { stage: 'rookie',      species: 'palmon',  minXp: 450  },
    { stage: 'champion',    species: 'togemon', minXp: 900  },
    { stage: 'ultimate',    species: 'lillymon',minXp: 1600 },
    { stage: 'mega',        species: 'rosemon', minXp: 2500 },
  ],
}

export const GOMAMON_LINE: EvolutionLine = {
  id: 'gomamon-line',
  name: 'Gomamon',
  stages: [
    { stage: 'egg',         species: 'egg2',      minXp: 30   },
    { stage: 'baby',        species: 'pichimon',  minXp: 80   },
    { stage: 'in-training', species: 'bukamon',   minXp: 200  },
    { stage: 'rookie',      species: 'gomamon',   minXp: 450  },
    { stage: 'champion',    species: 'ikkakumon', minXp: 900  },
    { stage: 'ultimate',    species: 'zudomon',   minXp: 1600 },
    { stage: 'mega',        species: 'plesiomon', minXp: 2500 },
  ],
}

export const BIYOMON_LINE: EvolutionLine = {
  id: 'biyomon-line',
  name: 'Biyomon',
  stages: [
    { stage: 'egg',         species: 'egg2',      minXp: 30   },
    { stage: 'baby',        species: 'nyokimon',  minXp: 80   },
    { stage: 'in-training', species: 'yokomon',   minXp: 200  },
    { stage: 'rookie',      species: 'biyomon',   minXp: 450  },
    { stage: 'champion',    species: 'birdramon', minXp: 900  },
    { stage: 'ultimate',    species: 'garudamon', minXp: 1600 },
    { stage: 'mega',        species: 'phoenixmon',minXp: 2500 },
  ],
}

export const SALAMON_LINE: EvolutionLine = {
  id: 'salamon-line',
  name: 'Salamon',
  stages: [
    { stage: 'egg',         species: 'egg2',       minXp: 30   },
    { stage: 'baby',        species: 'zurumon',    minXp: 80   },
    { stage: 'in-training', species: 'viximon',    minXp: 200  },
    { stage: 'rookie',      species: 'salamon',    minXp: 450  },
    { stage: 'champion',    species: 'gatomon',    minXp: 900  },
    { stage: 'ultimate',    species: 'angewomon',  minXp: 1600 },
    { stage: 'mega',        species: 'magnadramon',minXp: 2500 },
  ],
}

export const GUILMON_LINE: EvolutionLine = {
  id: 'guilmon-line',
  name: 'Guilmon',
  stages: [
    { stage: 'egg',         species: 'egg2',       minXp: 30   },
    { stage: 'baby',        species: 'jyarimon',   minXp: 80   },
    { stage: 'in-training', species: 'gigimon',    minXp: 200  },
    { stage: 'rookie',      species: 'guilmon',    minXp: 450  },
    { stage: 'champion',    species: 'growlmon',   minXp: 900  },
    { stage: 'ultimate',    species: 'wargrowlmon',minXp: 1600 },
    { stage: 'mega',        species: 'gallantmon', minXp: 2500 },
  ],
}

export const EVOLUTION_LINES: Record<string, EvolutionLine> = {
  [AGUMON_LINE.id]:   AGUMON_LINE,
  [GABUMON_LINE.id]:  GABUMON_LINE,
  [PATAMON_LINE.id]:  PATAMON_LINE,
  [TENTOMON_LINE.id]: TENTOMON_LINE,
  [PALMON_LINE.id]:   PALMON_LINE,
  [GOMAMON_LINE.id]:  GOMAMON_LINE,
  [BIYOMON_LINE.id]:  BIYOMON_LINE,
  [SALAMON_LINE.id]:  SALAMON_LINE,
  [GUILMON_LINE.id]:  GUILMON_LINE,
}

// Retorna a espécie correspondente ao XP total acumulado.
// Antes de 30 XP: ainda egg1 (retorna null — o caller mantém egg1).
export function resolveSpeciesForXp(line: EvolutionLine, xp: number): DigimonSpecies | null {
  const reached = line.stages.filter((s) => xp >= s.minXp)
  if (reached.length === 0) return null   // ainda egg1
  return reached[reached.length - 1].species
}

// Espécie do OVO pelo XP, sem depender de linha (o ovo é compartilhado).
// Usada enquanto o Digimon ainda não tem linha escolhida (pré-choco).
export function resolveEggSpecies(xp: number): 'egg1' | 'egg2' {
  return xp >= EGG2_XP ? 'egg2' : 'egg1'
}

// A forma bebê de uma linha (o que aparece logo após o choco).
export function babySpeciesOf(line: EvolutionLine): DigimonSpecies {
  const baby = line.stages.find((s) => s.stage === 'baby')
  return baby ? baby.species : line.stages[0].species
}

// Uma opção na tela de escolha do inicial: o sprite bebê a mostrar + o nome
// reconhecível da linha (forma rookie) para o jogador saber no que vai virar.
export interface StarterOption {
  lineId: string
  name: string
  baby: DigimonSpecies
}

export function listStarterOptions(): StarterOption[] {
  return Object.values(EVOLUTION_LINES).map((line) => ({
    lineId: line.id,
    name: line.name,
    baby: babySpeciesOf(line),
  }))
}
