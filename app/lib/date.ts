// "Hoje" na data LOCAL do usuário (YYYY-MM-DD). Um check-in é do dia DELE, não
// em UTC — alguém em UTC-3 às 23h ainda está "hoje". (Refinamento por timezone
// do perfil fica para depois.)
export function localDateString(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
