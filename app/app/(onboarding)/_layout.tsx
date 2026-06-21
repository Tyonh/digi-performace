import { Stack } from 'expo-router'
import { useSession } from '@/lib/session/SessionProvider'

// Dentro do onboarding, o mesmo padrão: cada passo é uma tela protegida por
// guard. Aceitar o consentimento muda o estado para 'needs-digimon', o guard
// de consent vira falso e o router avança sozinho para create.
export default function OnboardingLayout() {
  const { state } = useSession()

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={state.phase === 'needs-consent'}>
        <Stack.Screen name="consent" />
      </Stack.Protected>

      <Stack.Protected guard={state.phase === 'needs-digimon'}>
        <Stack.Screen name="create" />
      </Stack.Protected>
    </Stack>
  )
}
