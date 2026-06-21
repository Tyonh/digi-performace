import type { PseResponses } from './types'

// Pesos por dimensão — sono e estresse têm maior impacto no estado do Digimon
const WEIGHTS = {
  sleepQuality: 1.5,
  fatigue: 1.2,
  stress: 1.2,
  nutrition: 1.0,
  motivation: 1.0,
  mood: 1.0,
  physicalPain: 0.8,
} as const

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0)

export function calculateWellbeingIndex(responses: PseResponses): number {
  // Dimensões NEGATIVAS (valor alto = ruim) são invertidas (10 - v) para que,
  // no índice, "mais seja sempre melhor". Os valores BRUTOS continuam sendo
  // armazenados como o usuário respondeu (estresse 8 = muito estressado) —
  // a inversão é só para o cálculo do índice.
  const sleep = responses.sleepQuality
  const fatigue = 10 - responses.fatigue
  const stress = 10 - responses.stress
  const nutrition = responses.nutrition
  const motivation = responses.motivation
  const mood = responses.mood
  const pain = 10 - responses.physicalPain

  const weighted =
    sleep * WEIGHTS.sleepQuality +
    fatigue * WEIGHTS.fatigue +
    stress * WEIGHTS.stress +
    nutrition * WEIGHTS.nutrition +
    motivation * WEIGHTS.motivation +
    mood * WEIGHTS.mood +
    pain * WEIGHTS.physicalPain

  return Math.round((weighted / TOTAL_WEIGHT) * 10) / 10
}

// Converte wellbeing_index (0–10) para health do Digimon (0–100)
export function wellbeingToHealth(index: number): number {
  return Math.round(index * 10)
}
