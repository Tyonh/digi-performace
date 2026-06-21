import { supabase } from '@/lib/supabase/client'
import { localDateString } from '@/lib/date'

export interface CheckinPoint {
  date: string
  wellbeingIndex: number
  sleepQuality: number
  fatigue: number
  stress: number
  nutrition: number
  motivation: number
  mood: number
  physicalPain: number
}

export type DimensionKey =
  | 'sleepQuality'
  | 'fatigue'
  | 'stress'
  | 'nutrition'
  | 'motivation'
  | 'mood'
  | 'physicalPain'

export interface DimensionMeta {
  key: DimensionKey
  label: string
  inverted: boolean // true = maior é pior (fatigue, stress, physicalPain)
  color: string
}

export const DIMENSIONS: DimensionMeta[] = [
  { key: 'sleepQuality', label: 'Sono',        inverted: false, color: '#818cf8' },
  { key: 'fatigue',      label: 'Cansaço',     inverted: true,  color: '#fb923c' },
  { key: 'stress',       label: 'Estresse',    inverted: true,  color: '#e94560' },
  { key: 'nutrition',    label: 'Alimentação', inverted: false, color: '#4ade80' },
  { key: 'motivation',   label: 'Motivação',   inverted: false, color: '#facc15' },
  { key: 'mood',         label: 'Humor',       inverted: false, color: '#38bdf8' },
  { key: 'physicalPain', label: 'Dor física',  inverted: true,  color: '#a78bfa' },
]

export async function fetchWellbeingHistory(
  userId: string,
  days = 30,
): Promise<CheckinPoint[]> {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))

  const { data } = await supabase
    .from('daily_checkins')
    .select('date, wellbeing_index, sleep_quality, fatigue, stress, nutrition, motivation, mood, physical_pain')
    .eq('user_id', userId)
    .gte('date', localDateString(since))
    .order('date', { ascending: true })

  return (data ?? []).map((r) => ({
    date: r.date as string,
    wellbeingIndex: Number(r.wellbeing_index),
    sleepQuality:  Number(r.sleep_quality),
    fatigue:       Number(r.fatigue),
    stress:        Number(r.stress),
    nutrition:     Number(r.nutrition),
    motivation:    Number(r.motivation),
    mood:          Number(r.mood),
    physicalPain:  Number(r.physical_pain),
  }))
}

export interface DimensionStats {
  meta: DimensionMeta
  avg: number
  avgPrev: number | null
  best: number
  worst: number
  points: number[]   // série de valores (mesmo índice que dates)
  dates: string[]    // série de datas YYYY-MM-DD
  score: number      // 0–10 normalizado (invertido se necessário)
}

export interface HistorySummary {
  count: number
  streak: number
  avg7d: number | null
  avgIndex: number | null
  dimensions: DimensionStats[]
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
}

// Normaliza para 0–10 "quanto melhor". Dimensões invertidas: score = 10 - valor.
function toScore(value: number, inverted: boolean): number {
  return inverted ? 10 - value : value
}

export function summarize(current: CheckinPoint[], prev: CheckinPoint[]): HistorySummary {
  const dates = new Set(current.map((p) => p.date))

  let streak = 0
  const cursor = new Date()
  if (!dates.has(localDateString(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(localDateString(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const recent = current.filter((p) => p.date >= localDateString(sevenDaysAgo))
  const avg7d =
    recent.length > 0 ? avg(recent.map((p) => p.wellbeingIndex)) : null

  const avgIndex = current.length > 0 ? avg(current.map((p) => p.wellbeingIndex)) : null

  const dimensions: DimensionStats[] = DIMENSIONS.map((meta) => {
    const vals = current.map((p) => p[meta.key])
    const dates = current.map((p) => p.date)
    const prevVals = prev.map((p) => p[meta.key])
    const a = avg(vals)
    const score = toScore(a, meta.inverted)
    return {
      meta,
      avg: a,
      avgPrev: prevVals.length > 0 ? avg(prevVals) : null,
      best: vals.length > 0 ? Math.max(...vals) : 0,
      worst: vals.length > 0 ? Math.min(...vals) : 0,
      points: vals,
      dates,
      score: Math.round(score * 10) / 10,
    }
  })

  return { count: current.length, streak, avg7d, avgIndex, dimensions }
}
