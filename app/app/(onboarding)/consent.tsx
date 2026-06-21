import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useSession } from '@/lib/session/SessionProvider'

// Consentimento LGPD. O check-in PSE coleta dados de saúde (sono, dor, humor),
// que são dados sensíveis — exigem consentimento EXPLÍCITO antes da coleta.
// Ao aceitar, o estado muda e o navegador avança sozinho para criar o Digimon.
export default function ConsentScreen() {
  const { giveConsent } = useSession()
  const [submitting, setSubmitting] = useState(false)

  async function handleAccept() {
    setSubmitting(true)
    await giveConsent()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacidade</Text>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.paragraph}>
          O Digivice registra um check-in diário sobre seu bem-estar — sono, cansaço,
          estresse, alimentação, motivação, humor e dor física.
        </Text>
        <Text style={styles.paragraph}>
          Esses são <Text style={styles.emph}>dados sensíveis de saúde</Text>. Eles ficam
          ligados só à sua conta, nunca são compartilhados, e você pode exportá-los ou
          apagá-los a qualquer momento.
        </Text>
        <Text style={styles.paragraph}>
          O estado do seu Digimon reflete esses dados. Ao continuar, você consente com a
          coleta para essa finalidade.
        </Text>
      </ScrollView>
      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleAccept}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>Aceito e quero continuar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 80 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  body: { flex: 1 },
  bodyContent: { gap: 16 },
  paragraph: { fontSize: 15, lineHeight: 22, color: '#cbd5e1' },
  emph: { color: '#ffffff', fontWeight: '600' },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
})
