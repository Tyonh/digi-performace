import { supabase } from '@/lib/supabase/client'
import { localDateString } from '@/lib/date'
import { calculateWellbeingIndex, wellbeingToHealth } from '@/domain/checkin/wellbeing'
import { resolveStatus } from '@/domain/digimon/state'
import { EVOLUTION_LINES, resolveSpeciesForXp } from '@/domain/digimon/evolution'
import { pickStarterLineId } from '@/domain/digimon/starter'
import type { PseResponses } from '@/domain/checkin/types'
import type { ActiveDigimon } from '@/lib/session/types'

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'already-done' | 'error'; message?: string }

// Envia o check-in do dia e reflete no Digimon IMEDIATAMENTE (ADR-013).
export async function submitCheckin(
  userId: string,
  digimon: ActiveDigimon,
  responses: PseResponses,
): Promise<SubmitResult> {
  const wellbeingIndex = calculateWellbeingIndex(responses)
  const date = localDateString()

  // 1) Grava o check-in bruto (fonte da verdade). UNIQUE(user_id, date) garante
  //    1 por dia — uma segunda tentativa volta como 'already-done' (código 23505).
  const { error: insertError } = await supabase.from('daily_checkins').insert({
    user_id: userId,
    date,
    sleep_quality: responses.sleepQuality,
    fatigue: responses.fatigue,
    stress: responses.stress,
    nutrition: responses.nutrition,
    motivation: responses.motivation,
    mood: responses.mood,
    physical_pain: responses.physicalPain,
    wellbeing_index: wellbeingIndex,
  })
  if (insertError) {
    if (insertError.code === '23505') return { ok: false, reason: 'already-done' }
    return { ok: false, reason: 'error', message: insertError.message }
  }

  // 2) O check-in ALIMENTA e CUIDA do pet: enche fome/energia e reseta o
  //    relógio de abandono (last_cared_at). É isso que o mantém vivo — sem
  //    check-in por 72h, o job pg_cron o mata por abandono.
  const now = new Date().toISOString()

  // health do PSE tem PISO 1: um dia ruim deixa o pet doente/crítico, mas NÃO
  // mata (morte é só pela negligência — ADR-013). Como acabamos de alimentar,
  // fome/energia estão cheias (100) — o status fica por conta do health.
  const health = Math.max(1, wellbeingToHealth(wellbeingIndex))
  const status = resolveStatus({ health, hunger: 100, energy: 100, mood: 100, happiness: 100 }, false)

  // 3) Crédito de XP: check-in rende entre 10 (dia ruim) e 20 (dia perfeito) XP.
  //    O nível NUNCA é gravado — sempre derivado do SUM(xp_ledger.amount).
  const xpEarned = 10 + Math.round(wellbeingIndex)
  const { error: xpError } = await supabase.from('xp_ledger').insert({
    digimon_id: digimon.id,
    user_id: userId,
    amount: xpEarned,
    source: 'daily_checkin',
  })
  if (xpError) {
    // eslint-disable-next-line no-console
    console.error('[xp_ledger] insert falhou:', xpError.message, xpError.code)
    return { ok: false, reason: 'error', message: `XP não registrado: ${xpError.message}` }
  }

  // 4) Eclosão/evolução: soma o XP total pós-check-in para resolver a forma NOVA.
  //    A cada check-in a forma é RE-RESOLVIDA pelo nível atual. No 1º check-in
  //    (nível 0→ novo) o ovo choca. Quando o nível cruzar um limiar, evolui sozinho.
  const { data: xpRows } = await supabase
    .from('xp_ledger')
    .select('amount')
    .eq('digimon_id', digimon.id)
    .eq('user_id', userId)
  const totalXp = (xpRows ?? []).reduce((sum, r) => sum + (r.amount as number), 0)

  const { data: dig } = await supabase
    .from('digimons')
    .select('evolution_line_id')
    .eq('id', digimon.id)
    .single()
  const lineId = (dig?.evolution_line_id as string) ?? pickStarterLineId()
  const line = EVOLUTION_LINES[lineId]
  // null = XP < 30, mantém egg1; caso contrário usa a espécie resolvida
  const resolved = line ? resolveSpeciesForXp(line, totalXp) : null
  const species = resolved ?? 'egg1'

  await supabase
    .from('digimons')
    .update({
      health,
      status,
      species,
      evolution_line_id: lineId,
      // alimentar + descansar + cuidar (lazy eval: base + timestamp)
      hunger_base: 100,
      hunger_updated_at: now,
      energy_base: 100,
      energy_updated_at: now,
      last_cared_at: now,
    })
    .eq('id', digimon.id)
  return { ok: true }
}

// Já existe check-in de hoje? (para a tela mostrar o estado "concluído").
export async function hasCheckinToday(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('daily_checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('date', localDateString())
    .maybeSingle()
  return !!data
}
