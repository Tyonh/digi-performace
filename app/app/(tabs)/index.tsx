import { useEffect } from 'react'
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native'
import { DigimonSprite } from '@/components/digimon/DigimonSprite'
import { useSession } from '@/lib/session/SessionProvider'
import { useLiveDigimonStatus } from '@/lib/digimon/useLiveDigimonStatus'
import { syncGithubActivity } from '@/lib/github/sync'
import type { DigimonStatus } from '@/domain/shared/types'

const BG = require('@/assets/backgrounds/sky.png')
const { width: SW, height: SH } = Dimensions.get('window')

const STATUS_LABEL: Record<DigimonStatus, string> = {
  healthy:  'Saudável',
  hungry:   'Com fome',
  tired:    'Cansado',
  sick:     'Doente',
  sleeping: 'Dormindo',
  critical: 'Crítico',
  dead:     'Morreu',
}

const STATUS_COLOR: Record<DigimonStatus, string> = {
  healthy:  '#4ade80',
  hungry:   '#facc15',
  tired:    '#facc15',
  sick:     '#fb923c',
  sleeping: '#818cf8',
  critical: '#e94560',
  dead:     '#64748b',
}

export default function DashboardScreen() {
  const { state, refresh } = useSession()
  if (state.phase !== 'ready') return null

  const { activeDigimon } = state
  const live = useLiveDigimonStatus(activeDigimon)
  const isEgg = activeDigimon.species === 'egg1' || activeDigimon.species === 'egg2'

  useEffect(() => {
    syncGithubActivity().then(({ xpEarned }) => {
      if (xpEarned > 0) refresh()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusColor = STATUS_COLOR[isEgg ? 'healthy' : live.status]

  return (
    <View style={styles.root}>
      {/* Imagem esticada para cobrir exatamente a tela, sem corte */}
      <Image source={BG} style={styles.bg} resizeMode="stretch" />

      {/* Painel de identidade no topo */}
      <View style={styles.nameTag}>
        <Text style={styles.name}>{isEgg ? '???' : activeDigimon.name}</Text>
        <Text style={styles.level}>Nv.{activeDigimon.level}  {activeDigimon.xp} XP</Text>
      </View>

      {/* Digimon ancorado embaixo (de pé perto da grama) */}
      <View style={styles.spriteWrap}>
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isEgg ? 'Chocando...' : STATUS_LABEL[live.status]}
          </Text>
        </View>

        <View style={styles.petGroup}>
          {/* brilho suave atrás pra destacar do fundo */}
          <View style={styles.petGlow} />
          <DigimonSprite
            species={activeDigimon.species}
            status={isEgg ? 'healthy' : live.status}
            size={120}
          />
          {/* sombra no chão pra parecer apoiado */}
          <View style={styles.groundShadow} />
        </View>
      </View>

      {/* Painel de stats — só aparece depois que o ovo choca */}
      {!isEgg && (
        <View style={styles.panel}>
          <StatBar label="Fome" value={live.hunger} />
          <StatBar label="Energia" value={live.energy} />
          <StatBar label="Saúde" value={activeDigimon.health} />
        </View>
      )}

    </View>
  )
}

function StatBar({ label, value }: { label: string; value: number }) {
  const color = value >= 50 ? '#4ade80' : value >= 20 ? '#facc15' : '#e94560'
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${value}%` as `${number}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.barValue, { color }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW,
    height: SH,
  },
  nameTag: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  level: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  spriteWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
    gap: 14,
  },
  petGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(180,200,255,0.12)',
  },
  groundShadow: {
    width: 86,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.30)',
    marginTop: -10,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Painel (overlay no rodapé, deixa o céu aparecer atrás) ────
  panel: {
    width: '100%',
    backgroundColor: 'rgba(13,13,26,0.85)',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  eggHint: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 52,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barValue: {
    width: 28,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
})
