import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useSession } from '@/lib/session/SessionProvider'
import { DigimonSprite } from '@/components/digimon/DigimonSprite'

// Criação do Digimon: o usuário dá um nome ao pet. Todo Digimon nasce do mesmo
// ovo (egg1) — a linha evolutiva só é assumida quando ele choca. Ao confirmar,
// o estado vira 'ready' e o navegador avança sozinho para o app principal.
export default function CreateDigimonScreen() {
  const { createDigimon } = useSession()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trimmed = name.trim()
  const canSubmit = trimmed.length >= 2 && !submitting

  async function handleCreate() {
    if (!canSubmit) return
    setSubmitting(true)
    await createDigimon(trimmed)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seu ovo chegou</Text>
      <Text style={styles.subtitle}>Dê um nome ao seu companheiro.</Text>

      <View style={styles.spriteContainer}>
        <DigimonSprite species="egg1" status="healthy" />
      </View>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nome do Digimon"
        placeholderTextColor="#64748b"
        maxLength={16}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>Chocar ovo</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 16 },
  spriteContainer: { marginVertical: 24 },
  input: {
    width: '100%',
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
})
