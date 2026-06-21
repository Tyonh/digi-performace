import { Tabs } from 'expo-router'

// O grupo (tabs) é montado pelo RootNavigator apenas quando phase === 'ready'
// (Stack.Protected), então aqui já podemos assumir que existe um Digimon ativo.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#0f3460' },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Digimon' }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico' }} />
    </Tabs>
  )
}
