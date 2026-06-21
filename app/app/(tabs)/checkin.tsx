import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSession } from '@/lib/session/SessionProvider'
import { PseStepper } from '@/components/checkin/PseStepper'
import { submitCheckin, hasCheckinToday } from '@/lib/checkin/submit'
import { createPseScore } from '@/domain/shared/types'
import type { PseResponses } from '@/domain/checkin/types'

type PseKey = keyof PseResponses

// As 7 dimensões PSE, com a direção da escala explícita (importante: cansaço,
// estresse e dor são "negativas" — 10 é o pior).
const QUESTIONS: { key: PseKey; label: string; hint: string }[] = [
  { key: 'sleepQuality', label: 'Qualidade do sono', hint: '0 = péssima · 10 = ótima' },
  { key: 'fatigue', label: 'Cansaço', hint: '0 = descansado · 10 = exausto' },
  { key: 'stress', label: 'Estresse', hint: '0 = tranquilo · 10 = muito estressado' },
  { key: 'nutrition', label: 'Alimentação', hint: '0 = ruim · 10 = ótima' },
  { key: 'motivation', label: 'Motivação', hint: '0 = nenhuma · 10 = muita' },
  { key: 'mood', label: 'Humor', hint: '0 = péssimo · 10 = ótimo' },
  { key: 'physicalPain', label: 'Dor física', hint: '0 = nenhuma · 10 = muita' },
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
        <ActivityIndicator color="#e94560" />
      </View>
    )
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Check-in de hoje concluído</Text>
        <Text style={styles.doneText}>
          Seu Digimon já reflete como você está. Volte amanhã para o próximo.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Como foi seu dia?</Text>
      <Text style={styles.subtitle}>Responda as 7 perguntas. Seu Digimon reflete o resultado.</Text>

      {QUESTIONS.map((q) => (
        <PseStepper
          key={q.key}
          label={q.label}
          hint={q.hint}
          value={values[q.key]}
          onChange={(v) => setValues((prev) => ({ ...prev, [q.key]: v }))}
        />
      ))}

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? 'Enviando...' : 'Enviar check-in'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4, marginBottom: 20 },
  error: { color: '#e94560', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  doneTitle: { fontSize: 20, fontWeight: 'bold', color: '#4ade80', textAlign: 'center' },
  doneText: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
})
