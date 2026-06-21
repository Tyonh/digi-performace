// Smoke test: conecta no Supabase com a anon key e confirma que cada tabela
// existe e responde. Com RLS ligada e sem sessão, o esperado é data:[] (a
// policy auth.uid()=user_id nega tudo p/ anônimo) — isso PROVA tabela+RLS ok.
// Tabela inexistente devolve erro 42P01. Uso temporário; pode apagar depois.
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Parse simples do .env.local (Node não carrega sozinho)
const env = {}
const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
)

const tables = [
  'users',
  'digimons',
  'daily_checkins',
  'wellbeing_aggregates',
  'xp_ledger',
  'nurse_actions',
  'git_activities',
]

;(async () => {
  console.log('URL:', env.EXPO_PUBLIC_SUPABASE_URL)
  let allOk = true
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(1)
    if (error) {
      allOk = false
      console.log(`  ✗ ${t.padEnd(22)} ERRO: ${error.code || ''} ${error.message}`)
    } else {
      console.log(`  ✓ ${t.padEnd(22)} existe + responde (RLS ativa)`)
    }
  }
  console.log(allOk ? '\nTudo certo.' : '\nAlgo falhou — ver acima.')
  process.exit(allOk ? 0 : 1)
})()
