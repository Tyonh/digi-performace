import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type IconName = keyof typeof Ionicons.glyphMap

// Um item do check-in: ícone + rótulo + dica da escala, o controle de número
// central com setas (− / +) de 0 a 10, e uma barra que enche conforme o valor.
// Paleta fria (azul) para diferenciar a área de check-in. Pensado para o polegar.
interface PseStepperProps {
  label: string
  hint: string
  icon: IconName
  value: number
  onChange: (value: number) => void
}

export function PseStepper({ label, hint, icon, value, onChange }: PseStepperProps) {
  const atMin = value <= 0
  const atMax = value >= 10
  const fillPct = (value / 10) * 100

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={18} color="#7dd3fc" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>

      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => onChange(value - 1)}
          disabled={atMin}
          style={[styles.arrow, atMin && styles.arrowDisabled]}
          accessibilityLabel={`Diminuir ${label}`}
        >
          <Ionicons name="remove" size={24} color="#e0f2fe" />
        </TouchableOpacity>

        <Text style={styles.value}>{value}</Text>

        <TouchableOpacity
          onPress={() => onChange(value + 1)}
          disabled={atMax}
          style={[styles.arrow, atMax && styles.arrowDisabled]}
          accessibilityLabel={`Aumentar ${label}`}
        >
          <Ionicons name="add" size={24} color="#e0f2fe" />
        </TouchableOpacity>
      </View>

      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${fillPct}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#13203b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 16,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0c1d3a',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: '#f0f9ff' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 1 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginTop: 14,
    marginBottom: 14,
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0e2a52',
    borderWidth: 1,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.3, borderColor: '#1e3a5f' },
  value: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#38bdf8',
    minWidth: 56,
    textAlign: 'center',
  },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0c1d3a',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
})
