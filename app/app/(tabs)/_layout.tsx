import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// O grupo (tabs) é montado pelo RootNavigator apenas quando phase === 'ready'
// (Stack.Protected), então aqui já podemos assumir que existe um Digimon ativo.
//
// Cada aba tem um ícone do Ionicons (vem com @expo/vector-icons, já embutido no
// build). Versão preenchida quando ativa, contorno quando inativa.
type IconName = keyof typeof Ionicons.glyphMap

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color as string} />
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f1b35',
          borderTopColor: '#1e3a5f',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Digimon', tabBarIcon: tabIcon('egg', 'egg-outline') }}
      />
      <Tabs.Screen
        name="checkin"
        options={{ title: 'Check-in', tabBarIcon: tabIcon('create', 'create-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Histórico', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  )
}
