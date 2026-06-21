import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Roda de hora em hora (agendado via pg_cron + pg_net).
// Decide QUEM notificar baseado no estado atual dos pets, sem guardar histórico
// de notificações. A janela de tempo evita notificar mais de uma vez:
//   • Com fome / cansado → dispara quando o pet entra nesse estado (hunger/energy < 20)
//   • Alerta de abandono → 48h–54h sem check-in (janela de 6h = notifica só 1x)
//   • Alerta final      → 66h–72h sem check-in (6h antes de morrer)

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Busca todos os pets vivos com dono que tem push_token.
  const { data: pets } = await supabase
    .from('digimons')
    .select(`
      id, name, status, health, is_sleeping,
      hunger_base, hunger_updated_at, hunger_decay_rate,
      energy_base,  energy_updated_at,  energy_decay_rate,
      last_cared_at,
      users!inner ( push_token )
    `)
    .eq('is_alive', true)
    .not('users.push_token', 'is', null)

  if (!pets?.length) return new Response('ok', { status: 200 })

  const messages: ExpoPushMessage[] = []
  const now = Date.now()

  for (const pet of pets) {
    const pushToken = (pet.users as { push_token: string }).push_token
    const lastCared = new Date(pet.last_cared_at as string).getTime()
    const hoursAbandoned = (now - lastCared) / 3_600_000

    // Valor atual de fome/energia via lazy eval (espelho do current_stat do SQL).
    const hunger = lazyValue(
      pet.hunger_base as number,
      pet.hunger_updated_at as string,
      pet.hunger_decay_rate as number,
    )
    const energy = lazyValue(
      pet.energy_base as number,
      pet.energy_updated_at as string,
      pet.energy_decay_rate as number,
    )

    // ── Alerta final: 6h antes da morte (janela 66h–72h) ─────────────────
    if (hoursAbandoned >= 66 && hoursAbandoned < 72) {
      messages.push({
        to: pushToken,
        title: `⚠️ ${pet.name} vai morrer!`,
        body: 'Faz um check-in agora — seu Digimon tem menos de 6h antes de partir.',
        sound: 'default',
      })
      continue // não empilha outros alertas
    }

    // ── Alerta de abandono: 48h–54h (janela = notifica 1x nesse período) ─
    if (hoursAbandoned >= 48 && hoursAbandoned < 54) {
      messages.push({
        to: pushToken,
        title: `😢 ${pet.name} está sozinho`,
        body: 'Você não faz um check-in há 2 dias. Seu Digimon está sentindo sua falta.',
        sound: 'default',
      })
      continue
    }

    // ── Com fome ──────────────────────────────────────────────────────────
    if (hunger < 20 && !pet.is_sleeping) {
      messages.push({
        to: pushToken,
        title: `🍖 ${pet.name} está com fome`,
        body: 'Faça seu check-in do dia para alimentar seu Digimon.',
        sound: 'default',
      })
    }

    // ── Cansado ───────────────────────────────────────────────────────────
    if (energy < 20 && !pet.is_sleeping && hunger >= 20) {
      messages.push({
        to: pushToken,
        title: `😴 ${pet.name} está exausto`,
        body: 'Seu Digimon precisa de energia. Faça um check-in!',
        sound: 'default',
      })
    }
  }

  if (!messages.length) return new Response('ok — nada a notificar', { status: 200 })

  // Expo aceita até 100 mensagens por lote.
  for (let i = 0; i < messages.length; i += 100) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    })
  }

  return new Response(
    JSON.stringify({ sent: messages.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function lazyValue(base: number, updatedAt: string, ratePerHour: number): number {
  const hoursElapsed = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000
  return Math.max(0, Math.round(base - hoursElapsed * ratePerHour))
}

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  sound: 'default' | null
}
