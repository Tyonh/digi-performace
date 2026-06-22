import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '@/lib/session/SessionProvider'
import { DigimonSprite } from '@/components/digimon/DigimonSprite'
import { listStarterOptions } from '@/domain/digimon/evolution'

const OPTIONS = listStarterOptions()

// Tela de choco: aparece quando o ovo atinge o XP de eclosão sem linha escolhida
// (phase 'needs-hatch-choice'). Mostra a forma BEBÊ de cada linha para o jogador
// escolher seu parceiro. Ao confirmar, a linha é gravada e o ovo choca de fato.
export default function HatchScreen() {
  const { state, chooseStarterLine } = useSession()
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.phase !== 'needs-hatch-choice') return null

  async function handleConfirm() {
    if (!selected || submitting) return
    setSubmitting(true)
    await chooseStarterLine(selected)
    // refresh() dentro de chooseStarterLine leva o estado para 'ready' e o
    // router troca de tela sozinho — não precisa navegar à mão.
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBadge}>
          <Ionicons name="egg" size={26} color="#7dd3fc" />
        </View>
        <Text style={styles.title}>Seu ovo está chocando!</Text>
        <Text style={styles.subtitle}>
          Escolha o parceiro que vai nascer. Essa decisão define toda a linha de evolução.
        </Text>

        <View style={styles.grid}>
          {OPTIONS.map((opt) => {
            const isSel = selected === opt.lineId
            return (
              <TouchableOpacity
                key={opt.lineId}
                style={[styles.card, isSel && styles.cardSelected]}
                onPress={() => setSelected(opt.lineId)}
                activeOpacity={0.8}
              >
                <DigimonSprite species={opt.baby} status="healthy" size={64} />
                <Text style={[styles.cardName, isSel && styles.cardNameSelected]}>
                  {opt.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (!selected || submitting) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!selected || submitting}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={18} color="#f0f9ff" />
          <Text style={styles.buttonText}>
            {submitting ? 'Chocando...' : 'Confirmar escolha'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1124' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 24, alignItems: 'center' },

  headerBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0c1d3a',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f0f9ff', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#7c93b3',
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    rowGap: 12,
  },
  card: {
    width: '31%',
    backgroundColor: '#13203b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1e3a5f',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  cardSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0e2a52',
  },
  cardName: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  cardNameSelected: { color: '#7dd3fc' },

  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#13203b',
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(14,165,233,0.4)' },
      default: {
        shadowColor: '#0ea5e9',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      },
    }),
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#f0f9ff', fontSize: 16, fontWeight: '700' },
})
