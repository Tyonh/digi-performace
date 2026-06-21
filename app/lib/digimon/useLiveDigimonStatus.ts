import { useCallback, useEffect, useState } from 'react'
import { calculateCurrentValue, resolveStatus } from '@/domain/digimon/state'
import type { ActiveDigimon } from '@/lib/session/types'
import type { DigimonStatus } from '@/domain/shared/types'

interface LiveStatus {
  status: DigimonStatus
  hunger: number  // 0–100 calculado agora
  energy: number  // 0–100 calculado agora
}

// Calcula o status do Digimon em tempo real, sem esperar o cron de 1h.
// Recalcula imediatamente quando o digimon muda (ex: após check-in) e depois
// a cada minuto. Fome e energia são lazy eval: base + tempo decorrido × taxa.
export function useLiveDigimonStatus(digimon: ActiveDigimon): LiveStatus {
  const compute = useCallback((): LiveStatus => {
    const hunger = calculateCurrentValue({
      base: digimon.hungerBase,
      updatedAt: new Date(digimon.hungerUpdatedAt),
      decayRatePerHour: digimon.hungerDecayRate,
    })
    const energy = calculateCurrentValue({
      base: digimon.energyBase,
      updatedAt: new Date(digimon.energyUpdatedAt),
      decayRatePerHour: digimon.energyDecayRate,
    })
    const status = resolveStatus(
      { health: digimon.health, hunger, energy, mood: 100, happiness: 100 },
      digimon.isSleeping,
    )
    return { status, hunger, energy }
  }, [
    digimon.health,
    digimon.hungerBase,
    digimon.hungerUpdatedAt,
    digimon.hungerDecayRate,
    digimon.energyBase,
    digimon.energyUpdatedAt,
    digimon.energyDecayRate,
    digimon.isSleeping,
  ])

  const [live, setLive] = useState<LiveStatus>(compute)

  useEffect(() => {
    setLive(compute())
    const id = setInterval(() => setLive(compute()), 60_000)
    return () => clearInterval(id)
  }, [compute])

  return live
}
