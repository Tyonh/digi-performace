import { EVOLUTION_LINES } from './evolution'

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de escolha do Digimon inicial.
//
// A linha evolutiva de um novo Digimon NÃO é chumbada em lugar nenhum: ela vem
// daqui. Hoje a política é SORTEIO entre as linhas disponíveis no registro
// (EVOLUTION_LINES). Adicionar um Digimon novo = adicionar uma linha lá; ele já
// entra no sorteio automaticamente, sem tocar neste arquivo.
//
// Futuros possíveis, todos como mudança LOCALIZADA:
//   • Tela "escolha seu inicial"  → passar o lineId escolhido para createDigimon
//     (a assinatura já aceita); o sorteio vira o fallback.
//   • Regra por tipo de projeto (GitHub) → trocar pickStarterLineId por uma
//     função que decide pela categoria do repo.
// ─────────────────────────────────────────────────────────────────────────────

export function listStarterLineIds(): string[] {
  return Object.keys(EVOLUTION_LINES)
}

export function pickStarterLineId(): string {
  const ids = listStarterLineIds()
  return ids[Math.floor(Math.random() * ids.length)]
}
