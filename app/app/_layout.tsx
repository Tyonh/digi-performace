import { useEffect } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { NavigationBar } from 'expo-navigation-bar'
import { SessionProvider, useSession } from '@/lib/session/SessionProvider'
import { registerForPushNotifications } from '@/lib/notifications/register'

// ─────────────────────────────────────────────────────────────────────────────
// A navegação é declarativa: cada grupo só EXISTE quando seu guard é verdadeiro.
//
// Stack.Protected (Expo Router) faz todo o trabalho: quando o estado muda e a
// tela atual deixa de estar disponível, o router redireciona sozinho para a
// primeira tela acessível. Não escrevemos um único <Redirect> manual — é isso
// que evita os loops de redirect (cada tela mandando pra outra infinitamente).
//
// Regra de ouro: em qualquer momento, exatamente UM guard é verdadeiro.
// ─────────────────────────────────────────────────────────────────────────────
function RootNavigator() {
  const { state } = useSession()

  // Hooks SEMPRE antes de qualquer return condicional (Rules of Hooks).
  useEffect(() => {
    if (state.phase === 'ready') registerForPushNotifications()
  }, [state.phase])

  // Enquanto o Supabase verifica se há sessão salva, nenhum guard é verdadeiro —
  // mostramos um splash para não renderizar um Stack sem telas disponíveis.
  if (state.phase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center' }}>
        <ActivityIndicator color="#e94560" />
      </View>
    )
  }

  const isAnonymous = state.phase === 'anonymous'
  const inOnboarding = state.phase === 'needs-consent' || state.phase === 'needs-digimon'
  const isHatching = state.phase === 'needs-hatch-choice'
  const isReady = state.phase === 'ready'

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAnonymous}>
        <Stack.Screen name="(auth)/login" />
      </Stack.Protected>

      <Stack.Protected guard={inOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={isHatching}>
        <Stack.Screen name="hatch" />
      </Stack.Protected>

      <Stack.Protected guard={isReady}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  // Esconde a barra de navegação do Android (modo tela cheia/imersivo). O config
  // plugin já nasce escondida no build; esta chamada garante em runtime (e cobre
  // o Expo Go, onde o plugin não roda). Android-only — no-op em web/iOS.
  useEffect(() => {
    if (Platform.OS === 'android') NavigationBar.setHidden(true)
  }, [])

  return (
    <SessionProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SessionProvider>
  )
}
