import { View, Text, StyleSheet } from 'react-native'
import type { CheckinPoint } from '@/lib/checkin/history'

// Gráfico de barras do índice de bem-estar (0–10), feito só com View — sem
// biblioteca de chart. Cada barra é um dia; a cor indica a faixa (verde = bom,
// âmbar = médio, vermelho = ruim).
interface WellbeingChartProps {
  points: CheckinPoint[]
}

const CHART_HEIGHT = 160

function barColor(index: number): string {
  if (index >= 7) return '#4ade80' // bom
  if (index >= 4) return '#fbbf24' // médio
  return '#e94560' // ruim
}

// Mostra "dd/mm" só em alguns pontos para não poluir o eixo.
function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

export function WellbeingChart({ points }: WellbeingChartProps) {
  // Em janelas longas, rotula só ~6 marcos para o eixo não embolar.
  const labelStep = Math.max(1, Math.ceil(points.length / 6))

  return (
    <View>
      <View style={[styles.plot, { height: CHART_HEIGHT }]}>
        {points.map((p) => (
          <View key={p.date} style={styles.column}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(3, (p.wellbeingIndex / 10) * CHART_HEIGHT),
                  backgroundColor: barColor(p.wellbeingIndex),
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.axis}>
        {points.map((p, i) => (
          <View key={p.date} style={styles.column}>
            <Text style={styles.axisLabel}>{i % labelStep === 0 ? shortDate(p.date) : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  column: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderRadius: 3, minWidth: 6 },
  axis: { flexDirection: 'row', gap: 4, marginTop: 6 },
  axisLabel: { fontSize: 9, color: '#64748b' },
})
