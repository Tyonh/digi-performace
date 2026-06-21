import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSession } from '@/lib/session/SessionProvider'

// Tela de login. O OAuth real com GitHub entra na TASK-AUTH-001; hoje
// signInWithGitHub é mock. A tela só dispara a ação: ao mudar o estado, o
// RootNavigator (Stack.Protected) avança sozinho para o próximo passo.
export default function LoginScreen() {
  const { signInWithGitHub } = useSession()

  async function handleLogin() {
    await signInWithGitHub()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digivice</Text>
      <Text style={styles.subtitle}>Seu companheiro digital</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar com GitHub</Text>
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
    gap: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#e94560',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
