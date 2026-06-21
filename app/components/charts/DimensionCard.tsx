import { View, Text, StyleSheet } from 'react-native'
import { LineChart } from './LineChart'
import type { DimensionStats } from '@/lib/checkin/history'

interface Props {
  stat: DimensionStats
}

export function DimensionCard({ stat }: Props) {
  const { meta, avg, avgPrev, best, worst, points, dates, score } = stat

  const delta = avgPrev !== null ? Math.round((avg - avgPrev) * 10) / 10 : null
  const deltaIsGood = meta.inverted ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0
  const deltaStr =
    delta === null ? null
    : delta === 0 ? '='
    : `${delta > 0 ? '+' : ''}${delta}`

  const scoreColor =
    score >= 7 ? '#4ade80'
    : score >= 4 ? '#facc15'
    : '#e94560'

  const bestDisplay  = meta.inverted ? Math.min(...points) : Math.max(...points)
  const worstDisplay = meta.inverted ? Math.max(...points) : Math.min(...points)

  return (
    <View style={styles.card}>
      {/* Cabeçalho: nome + score + delta */}
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
        <Text style={styles.label}>{meta.label}</Text>
        <View style={styles.spacer} />
        {deltaStr !== null && (
          <Text style={[styles.delta, { color: deltaIsGood ? '#4ade80' : '#e94560' }]}>
            {deltaStr}
          </Text>
        )}
        <Text style={[styles.score, { color: scoreColor }]}>{score.toFixed(1)}</Text>
        <Text style={styles.scoreMax}>/10</Text>
      </View>

      {/* Barra de média */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${score * 10}%` as `${number}%`, backgroundColor: meta.color },
          ]}
        />
      </View>

      {/* Gráfico de linha — elemento principal */}
      <View style={styles.chartWrap}>
        <LineChart points={points} dates={dates} color={meta.color} height={110} />
      </View>

      {/* Estatísticas da linha de rodapé */}
      <View style={styles.stats}>
        <StatPill label="Média" value={avg.toFixed(1)} color="#94a3b8" />
        <StatPill label="Melhor" value={String(bestDisplay)} color="#4ade80" />
        <StatPill label="Pior" value={String(worstDisplay)} color="#e94560" />
        <StatPill label="Dias" value={String(points.length)} color="#475569" />
      </View>
    </View>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.3,
  },
  spacer: { flex: 1 },
  delta: {
    fontSize: 12,
    fontWeight: '600',
  },
  score: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 11,
    color: '#334155',
    marginTop: 4,
  },
  barTrack: {
    height: 3,
    backgroundColor: '#0f172a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartWrap: {
    marginHorizontal: -4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  pill: {
    alignItems: 'center',
    gap: 2,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillLabel: {
    fontSize: 9,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})
