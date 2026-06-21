import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

// Um item do check-in: rótulo + dica da escala, e o controle de número central
// com setas (− / +) para ajustar de 0 a 10. Pensado para o polegar no mobile.
interface PseStepperProps {
  label: string
  hint: string
  value: number
  onChange: (value: number) => void
}

export function PseStepper({ label, hint, value, onChange }: PseStepperProps) {
  const atMin = value <= 0
  const atMax = value >= 10

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>

      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => onChange(value - 1)}
          disabled={atMin}
          style={[styles.arrow, atMin && styles.arrowDisabled]}
          accessibilityLabel={`Diminuir ${label}`}
        >
          <Text style={styles.arrowText}>−</Text>
        </TouchableOpacity>

        <Text style={styles.value}>{value}</Text>

        <TouchableOpacity
          onPress={() => onChange(value + 1)}
          disabled={atMax}
          style={[styles.arrow, atMax && styles.arrowDisabled]}
          accessibilityLabel={`Aumentar ${label}`}
        >
          <Text style={styles.arrowText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  label: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 26, color: '#ffffff', lineHeight: 28 },
  value: { fontSize: 40, fontWeight: 'bold', color: '#e94560', minWidth: 56, textAlign: 'center' },
})
