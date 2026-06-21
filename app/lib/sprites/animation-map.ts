import type { DigimonStatus } from '@/domain/shared/types'
import type { OverlayKey } from './types'

// ============================================================================
// SIGNIFICADO DOS 15 FRAMES (padrão Digital Monster Ver. 20th)
// Analisado a partir dos sprites do Agumon — a ordem é a mesma para todas as espécies.
// ============================================================================
export const FRAME = {
  IDLE_A: 0,        // parado, postura neutra
  IDLE_B: 1,        // parado, variação (cabeça erguida) — alterna com IDLE_A = "respiração"
  HAPPY: 2,         // animado / contente (boca aberta pra cima)
  ATTACK: 3,        // ataque / rugido (boca bem aberta)
  FRONT: 4,         // de frente, olhando pro usuário (chamando atenção)
  WALK_A: 5,        // andando frame A
  WALK_B: 6,        // andando frame B — alterna com WALK_A = "caminhada"
  EAT: 7,           // comendo / chamando (boca aberta)
  REFUSE: 8,        // recusa / triste (encolhido)
  DOWN: 9,          // negativo / cabeça baixa
  TIRED: 10,        // cansado / sentado no chão
  SLEEP_A: 11,      // dormindo na cama frame A
  SLEEP_B: 12,      // dormindo na cama frame B — alterna com SLEEP_A
  BLINK: 13,        // olhos fechados (piscar / feliz)
  EAT_CLOSED: 14,   // comendo de olhos fechados / satisfeito
} as const

// ============================================================================
// MODELO DE ESTADOS (Digital Monster: a "vida" vem da animação dos frames;
// estados especiais são mostrados por símbolos sobrepostos — overlays)
// ============================================================================
export interface AnimationSpec {
  frames: number[]      // índices que alternam para dar vida ao pet
  fps: number           // trocas por segundo (velocidade da animação)
  overlay?: OverlayKey  // símbolo sobreposto (caveira, zzz, lápide)
  hideSprite?: boolean  // se true, esconde o Digimon e mostra só o overlay (morte = lápide)
}

export const ANIMATION_BY_STATUS: Record<DigimonStatus, AnimationSpec> = {
  // Saudável: respiração suave alternando idle A/B — é isso que dá "vida"
  healthy: { frames: [FRAME.IDLE_A, FRAME.IDLE_B], fps: 1.5 },

  // Com fome: encolhido/triste procurando comida
  hungry: { frames: [FRAME.REFUSE, FRAME.DOWN], fps: 1.5 },

  // Cansado: sentado no chão, alterna com idle
  tired: { frames: [FRAME.TIRED, FRAME.IDLE_A], fps: 1 },

  // Dormindo: sprite na cama + Zzz por cima
  sleeping: { frames: [FRAME.SLEEP_A, FRAME.SLEEP_B], fps: 0.8, overlay: 'zzz' },

  // Doente: deitado (sprite de dormir) + caveira por cima — conforme padrão do V-Pet
  sick: { frames: [FRAME.SLEEP_A, FRAME.SLEEP_B], fps: 0.8, overlay: 'skull' },

  // Crítico: encolhido + caveira piscando rápido (urgência)
  critical: { frames: [FRAME.REFUSE, FRAME.TIRED], fps: 3, overlay: 'skull' },

  // Morto: lápide substitui o Digimon (não há sprite do pet)
  dead: { frames: [], fps: 0, overlay: 'grave', hideSprite: true },
}
