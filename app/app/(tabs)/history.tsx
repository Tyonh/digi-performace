import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useSession } from '@/lib/session/SessionProvider'
import {
  fetchWellbeingHistory,
  summarize,
  type CheckinPoint,
  type HistorySummary,
} from '@/lib/checkin/history'
import { RadarChart } from '@/components/charts/RadarChart'
import { DimensionCard } from '@/components/charts/DimensionCard'

const PERIODS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function HistoryScreen() {
  const { state } = useSession()
  const [period, setPeriod] = useState(30)
  const [summary, setSummary] = useState<HistorySummary | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = state.phase === 'ready' ? state.user.id : null

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setSummary(null)

    // Busca período atual + período anterior (para calcular deltas)
    Promise.all([
      fetchWellbeingHistory(userId, period),
      fetchWellbeingHistory(userId, period * 2),
    ]).then(([current, all]) => {
      // "prev" = registros que estão no dobro do período mas não no período atual
      const currentDates = new Set(current.map((p: CheckinPoint) => p.date))
      const prev = all.filter((p: CheckinPoint) => !currentDates.has(p.date))
      setSummary(summarize(current, prev))
      setLoading(false)
    })
  }, [userId, period])

  if (state.phase !== 'ready') return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabeçalho */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Análise de Desempenho</Text>
          <Text style={styles.subtitle}>Relatório do atleta</Text>
        </View>
        <View style={styles.periodPicker}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.days}
              style={[styles.periodBtn, period === p.days && styles.periodBtnActive]}
              onPress={() => setPeriod(p.days)}
            >
              <Text style={[styles.periodLabel, period === p.days && styles.periodLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#e94560" size="large" />
        </View>
      )}

      {!loading && summary !== null && summary.count === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Sem dados no período</Text>
          <Text style={styles.emptyText}>Faça check-ins diários para ver sua análise aqui.</Text>
        </View>
      )}

      {!loading && summary !== null && summary.count > 0 && (
        <>
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KpiCard
              label="Bem-estar geral"
              value={summary.avgIndex !== null ? `${summary.avgIndex}` : '—'}
              unit="/ 10"
              color="#e94560"
            />
            <KpiCard
              label="Sequência"
              value={`${summary.streak}`}
              unit="dias"
              color="#facc15"
            />
            <KpiCard
              label="Check-ins"
              value={`${summary.count}`}
              unit="total"
              color="#4ade80"
            />
          </View>

          {/* Média 7d se o período for maior */}
          {period > 7 && summary.avg7d !== null && (
            <View style={styles.avg7dCard}>
              <Text style={styles.avg7dLabel}>Média últimos 7 dias</Text>
              <Text style={styles.avg7dValue}>{summary.avg7d} / 10</Text>
            </View>
          )}

          {/* Radar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Perfil Geral</Text>
            <Text style={styles.sectionSub}>Visão radar de todas as dimensões</Text>
            <View style={styles.radarWrap}>
              <RadarChart dimensions={summary.dimensions} size={240} />
            </View>

            {/* Legenda do radar */}
            <View style={styles.legend}>
              {summary.dimensions.map((d) => (
                <View key={d.meta.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: d.meta.color }]} />
                  <Text style={styles.legendLabel}>{d.meta.label}</Text>
                  <Text style={[
                    styles.legendScore,
                    { color: d.score >= 7 ? '#4ade80' : d.score >= 4 ? '#facc15' : '#e94560' },
                  ]}>
                    {d.score.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cards por dimensão */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dimensões Individuais</Text>
            <Text style={styles.sectionSub}>
              {period > 7 ? 'Δ vs período anterior · ' : ''}
              Score normalizado 0–10 (maior = melhor)
            </Text>
            <View style={styles.dimCards}>
              {summary.dimensions.map((d) => (
                <DimensionCard key={d.meta.key} stat={d} />
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

function KpiCard({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiUnit}>{unit}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 20 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 2 },

  periodPicker: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  periodBtnActive: { backgroundColor: '#e94560' },
  periodLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  periodLabelActive: { color: '#ffffff' },

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyWrap: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20 },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  kpiValue: { fontSize: 26, fontWeight: 'bold' },
  kpiUnit: { fontSize: 10, color: '#475569' },
  kpiLabel: { fontSize: 10, color: '#64748b', textAlign: 'center' },

  avg7dCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#818cf8',
  },
  avg7dLabel: { fontSize: 13, color: '#94a3b8' },
  avg7dValue: { fontSize: 18, fontWeight: 'bold', color: '#818cf8' },

  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#e2e8f0' },
  sectionSub: { fontSize: 11, color: '#475569', marginTop: -8 },

  radarWrap: { alignItems: 'center', paddingVertical: 8 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '45%',
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#94a3b8', flex: 1 },
  legendScore: { fontSize: 12, fontWeight: '700' },

  dimCards: { gap: 12 },
})
