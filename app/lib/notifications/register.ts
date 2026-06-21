import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase/client'

// Push notifications requerem development build (foram removidas do Expo Go no SDK 53).
// Este módulo detecta o ambiente e falha silenciosamente quando não disponível.

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return

  try {
    // Importação dinâmica: se o módulo lançar no Expo Go, capturamos e ignoramos.
    const [Device, Notifications] = await Promise.all([
      import('expo-device'),
      import('expo-notifications'),
    ])

    if (!Device.default.isDevice) return

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('digivice', {
        name: 'Digivice',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync()
    if (!token) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('users').update({ push_token: token }).eq('id', user.id)
  } catch {
    // Expo Go ou ambiente sem suporte — ignora silenciosamente.
  }
}
