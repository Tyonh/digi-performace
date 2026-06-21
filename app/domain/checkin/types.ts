import type { UserId, ISODate, PseScore } from '@/domain/shared/types'

export interface PseResponses {
  sleepQuality: PseScore
  fatigue: PseScore
  stress: PseScore
  nutrition: PseScore
  motivation: PseScore
  mood: PseScore
  physicalPain: PseScore
}

export interface DailyCheckIn {
  id: string
  userId: UserId
  date: ISODate
  responses: PseResponses
  wellbeingIndex: number
  completedAt: Date
}
