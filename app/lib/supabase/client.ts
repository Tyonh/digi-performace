import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// SecureStore guarda o token no Keychain (iOS) / Keystore (Android).
// IMPORTANTE: SecureStore NÃO existe no web — lá deixamos o supabase-js usar o
// localStorage padrão. Por isso o adapter só é aplicado no nativo.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const isWeb = Platform.OS === 'web'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // nativo: SecureStore. web: localStorage (default do supabase-js).
    ...(isWeb ? {} : { storage: ExpoSecureStoreAdapter }),
    autoRefreshToken: true,
    persistSession: true,
    // PKCE: fluxo OAuth recomendado p/ apps públicos (o "code verifier" fica
    // no storage e nunca trafega; só o app que iniciou consegue trocar o code).
    flowType: 'pkce',
    // web: ao voltar do GitHub, o supabase-js lê o ?code= da URL e troca pela
    // sessão sozinho. nativo: fazemos isso à mão (exchangeCodeForSession).
    detectSessionInUrl: isWeb,
  },
})
