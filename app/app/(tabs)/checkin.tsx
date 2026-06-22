import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '@/lib/session/SessionProvider'
import { PseStepper } from '@/components/checkin/PseStepper'
import { submitCheckin, hasCheckinToday } from '@/lib/checkin/submit'
import { createPseScore } from '@/domain/shared/types'
import type { PseResponses } from '@/domain/checkin/types'

type PseKey = keyof PseResponses
type IconName = keyof typeof Ionicons.glyphMap

// As 7 dimensões PSE, com a direção da escala explícita (importante: cansaço,
// estresse e dor são "negativas" — 10 é o pior).
const QUESTIONS: { key: PseKey; label: string; hint: string; icon: IconName }[] = [
  { key: 'sleepQuality', label: 'Qualidade do sono', hint: '0 = péssima · 10 = ótima', icon: 'moon' },
  { key: 'fatigue', label: 'Cansaço', hint: '0 = descansado · 10 = exausto', icon: 'battery-half' },
  { key: 'stress', label: 'Estresse', hint: '0 = tranquilo · 10 = muito estressado', icon: 'pulse' },
  { key: 'nutrition', label: 'Alimentação', hint: '0 = ruim · 10 = ótima', icon: 'restaurant' },
  { key: 'motivation', label: 'Motivação', hint: '0 = nenhuma · 10 = muita', icon: 'rocket' },
  { key: 'mood', label: 'Humor', hint: '0 = péssimo · 10 = ótimo', icon: 'happy' },
  { key: 'physicalPain', label: 'Dor física', hint: '0 = nenhuma · 10 = muita', icon: 'medkit' },
]

const INITIAL: Record<PseKey, number> = {
  sleepQuality: 5,
  fatigue: 5,
  stress: 5,
  nutrition: 5,
  motivation: 5,
  mood: 5,
  physicalPain: 5,
}

export default function CheckinScreen() {
  const { state, refresh } = useSession()
  const [values, setValues] = useState<Record<PseKey, number>>(INITIAL)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const userId = state.phase === 'ready' ? state.user.id : null

  // Ao abrir, verifica se já houve check-in hoje (1 por dia).
  useEffect(() => {
    if (!userId) return
    hasCheckinToday(userId).then((already) => {
      setDone(already)
      setLoading(false)
    })
  }, [userId])

  if (state.phase !== 'ready') return null

  async function handleSubmit() {
    if (state.phase !== 'ready') return
    setSubmitting(true)
    setErrorMsg(null)
    const responses: PseResponses = {
      sleepQuality: createPseScore(values.sleepQuality),
      fatigue: createPseScore(values.fatigue),
      stress: createPseScore(values.stress),
      nutrition: createPseScore(values.nutrition),
      motivation: createPseScore(values.motivation),
      mood: createPseScore(values.mood),
      physicalPain: createPseScore(values.physicalPain),
    }
    const result = await submitCheckin(state.user.id, state.activeDigimon, responses)
    setSubmitting(false)
    if (result.ok || result.reason === 'already-done') {
      setDone(true)
      await refresh() // atualiza o dashboard com o novo estado do Digimon
    } else {
      setErrorMsg(result.message ?? 'Não foi possível enviar. Tente de novo.')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" />
      </View>
    )
  }

  if (done) {
    return (
      <View style={styles.center}>
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark-done" size={40} color="#38bdf8" />
        </View>
        <Text style={styles.doneTitle}>Check-in de hoje concluído</Text>
        <Text style={styles.doneText}>
          Seu Digimon já reflete como você está. Volte amanhã para o próximo.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBadge}>
        <Ionicons name="clipboard" size={22} color="#7dd3fc" />
      </View>
      <Text style={styles.title}>Como foi seu dia?</Text>
      <Text style={styles.subtitle}>Responda as 7 perguntas. Seu Digimon reflete o resultado.</Text>

      <View style={styles.list}>
        {QUESTIONS.map((q) => (
          <PseStepper
            key={q.key}
            label={q.label}
            hint={q.hint}
            icon={q.icon}
            value={values[q.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [q.key]: v }))}
          />
        ))}
      </View>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        <Ionicons name="paper-plane" size={18} color="#f0f9ff" />
        <Text style={styles.buttonText}>{submitting ? 'Enviando...' : 'Enviar check-in'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1124' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: '#0a1124',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },

  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0c1d3a',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f0f9ff' },
  subtitle: { fontSize: 14, color: '#7c93b3', marginTop: 4, marginBottom: 22 },

  list: { gap: 0 },

  error: { color: '#f87171', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#f0f9ff', fontSize: 16, fontWeight: '700' },

  doneBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0c1d3a',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 20, fontWeight: 'bold', color: '#f0f9ff', textAlign: 'center' },
  doneText: { fontSize: 15, color: '#7c93b3', textAlign: 'center', lineHeight: 22 },
})
