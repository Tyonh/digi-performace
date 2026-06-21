import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useSession } from '@/lib/session/SessionProvider'

export default function ProfileScreen() {
  const { state, signOut } = useSession()
  if (state.phase !== 'ready') return null

  const { user, activeDigimon } = state

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      {/* Avatar + info do usuário */}
      <View style={styles.card}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {user.githubLogin?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <Text style={styles.username}>@{user.githubLogin}</Text>
      </View>

      {/* Info do Digimon */}
      <View style={styles.card}>
        <Row label="Digimon" value={activeDigimon.name} />
        <Row label="Espécie" value={activeDigimon.species} />
        <Row label="Nível" value={String(activeDigimon.level)} />
        <Row label="XP total" value={String(activeDigimon.xp)} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28, fontWeight: 'bold', color: '#e94560' },
  username: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  rowLabel: { fontSize: 13, color: '#475569' },
  rowValue: { fontSize: 13, color: '#e2e8f0', fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: '#fca5a5', fontSize: 15, fontWeight: '700' },
})
