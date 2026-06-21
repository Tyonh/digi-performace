// Branded types — garantem em compile-time que você não passa um número qualquer onde espera um PseScore
// Ex: createPseScore(11) falha, createPseScore(7) funciona e retorna tipo PseScore (não number genérico)

export type UserId = string & { readonly _brand: 'UserId' }
export type DigimonId = string & { readonly _brand: 'DigimonId' }
export type ISODate = string & { readonly _brand: 'ISODate' }

// PSE Score: escala 0–10 conforme documentado em domain-model
export type PseScore = number & { readonly _brand: 'PseScore' }

export function createPseScore(value: number): PseScore {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new Error(`PSE score inválido: ${value}. Deve ser inteiro entre 0 e 10.`)
  }
  return value as PseScore
}

// Chave visual do sprite (= nome da pasta em assets/digimon).
// egg1 e egg2 são as fases do ovo — COMPARTILHADAS por todas as linhas evolutivas
// (todo Digimon nasce do mesmo ovo, independente do que vai se tornar).
// Demais valores são a linha evolutiva do Agumon: bebê → mega.
export type DigimonSpecies =
  | 'egg1'
  | 'egg2'
  | 'botamon'
  | 'koromon'
  | 'agumon'
  | 'greymon'
  | 'metalgreymon'
  | 'wargreymon'

export type DigimonStatus =
  | 'healthy'
  | 'hungry'
  | 'tired'
  | 'sick'
  | 'sleeping'
  | 'critical'
  | 'dead'

export type DigimonSlot = 1 | 2 | 3
