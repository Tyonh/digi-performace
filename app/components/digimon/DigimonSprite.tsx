import { useEffect, useState } from 'react'
import { Image, View, StyleSheet } from 'react-native'
import { FRAMES, OVERLAYS } from '@/lib/sprites/frames'
import { ANIMATION_BY_STATUS } from '@/lib/sprites/animation-map'
import type { DigimonSpecies, DigimonStatus } from '@/domain/shared/types'

interface Props {
  species: DigimonSpecies
  status: DigimonStatus
  size?: number
}

// Renderiza o Digimon com "vida": alterna entre frames de animação no ritmo (fps)
// definido por estado, e sobrepõe um símbolo (caveira/zzz/lápide) quando aplicável.
// Modelo baseado no Digital Monster Ver. 20th — ver lib/sprites/animation-map.ts
export function DigimonSprite({ species, status, size = 96 }: Props) {
  const spec = ANIMATION_BY_STATUS[status]
  const [frameIdx, setFrameIdx] = useState(0)

  // Anima ciclando os frames. Reinicia sempre que espécie ou estado muda.
  useEffect(() => {
    setFrameIdx(0)
    if (spec.frames.length <= 1 || spec.fps <= 0) return

    const intervalMs = 1000 / spec.fps
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % spec.frames.length)
    }, intervalMs)

    return () => clearInterval(id)
  }, [species, status, spec.frames.length, spec.fps])

  // Morte: mostra só a lápide, sem o Digimon
  if (spec.hideSprite && spec.overlay) {
    return (
      <Image
        source={OVERLAYS[spec.overlay]}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    )
  }

  const currentFrame = spec.frames[frameIdx] ?? 0
  const baseSource = FRAMES[species][currentFrame]

  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={baseSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {spec.overlay && (
        <Image
          source={OVERLAYS[spec.overlay]}
          style={[styles.overlay, { width: size * 0.4, height: size * 0.4 }]}
          resizeMode="contain"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
})
