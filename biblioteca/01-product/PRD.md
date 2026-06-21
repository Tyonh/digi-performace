# PRD — Product Requirements Document

> **Projeto:** Digivice
> **Versão:** 0.1.0
> **Status:** `DRAFT`
> **Última atualização:** 2026-06-20
> **Relacionado:** [[02-domain/domain-model]] | [[03-specifications/tasks]]

---

## Contexto do Produto

Digivice resolve dois problemas reais de desenvolvedores:
1. **Ausência de auto-monitoramento de bem-estar** — a maioria ignora fadiga, sono e estresse até entrar em burnout
2. **Falta de feedback visual sobre produtividade** — commits existem no GitHub, mas sem representação emocional/gamificada

A solução usa o vínculo emocional com um pet virtual para criar um hábito diário de check-in de saúde, com o GitHub como sistema de progressão.

---

## Requisitos Funcionais — User Stories

### Épico 1: Autenticação e Onboarding

```
US-001: Como novo usuário, quero fazer login com GitHub OAuth
        para que meu histórico de commits seja acessível automaticamente.

  Critérios de Aceite:
  - Login via GitHub OAuth 2.0
  - Permissões solicitadas: read:user, repo (read-only)
  - Após login, redirecionar para criação do primeiro Digimon
  - Sessão persistida via Supabase Auth

US-002: Como novo usuário, quero criar meu primeiro Digimon
        para que eu possa começar a cuidar dele.

  Critérios de Aceite:
  - Usuário dá um nome ao Digimon (3–20 chars)
  - Digimon nasce como espécie inicial (ex: Botamon)
  - Estado inicial: health=100, hunger=50, energy=100, mood=80
  - Slot 1 ocupado automaticamente
  - Tutorial de 3 cards explicando mecânicas básicas
```

### Épico 2: Dashboard e Visualização do Digimon

```
US-003: Como usuário, quero ver o estado atual do meu Digimon ativo
        para que eu saiba se ele precisa de cuidados.

  Critérios de Aceite:
  - Exibe sprite animado do Digimon (idle/sick/sleeping/happy)
  - Barras de status: Saúde, Humor, Fome, Energia
  - Badge de status (Saudável / Com Fome / Cansado / Doente)
  - Indicador de XP e nível atual
  - Última vez que foi cuidado (ex: "há 3 horas")

US-004: Como usuário com múltiplos Digimons, quero alternar entre eles
        para que eu possa cuidar de cada um.

  Critérios de Aceite:
  - Tabs ou carousel com até 3 slots (occupied/empty)
  - Slot vazio exibe CTA "Adotar novo Digimon"
  - Troca de Digimon ativo em no máximo 2 toques
  - Estado de todos os Digimons atualizado em background
```

### Épico 3: Check-in Diário (Alimentação do Digimon)

```
US-005: Como usuário, quero responder o questionário PSE diário
        para que meu Digimon receba alimentação e seu estado seja atualizado.

  Critérios de Aceite:
  - 7 perguntas em escala 0–10 (slider ou botões numéricos)
  - Perguntas: Sono / Fadiga / Estresse / Alimentação / Motivação / Humor / Dor Física
  - Completar o formulário = 1 NurseAction de tipo 'feed'
  - Após envio: animação de Digimon "comendo" + update de estado
  - Limite: 1 check-in por dia por usuário (UTC)
  - Notificação se check-in não feito até 20h local

US-006: Como usuário, quero ver o histórico dos meus check-ins
        para que eu acompanhe minha evolução de bem-estar ao longo do tempo.

  Critérios de Aceite:
  - Gráfico de linha por dimensão PSE — toggle 7, 30 e 90 dias
  - Cada dimensão com cor distinta (sono, estresse, fadiga, etc.)
  - Indicador de streak de check-ins consecutivos com recorde pessoal
  - Mini-card de tendência: "Esta semana vs semana passada" com delta (+/-)
  - Tap em um ponto do gráfico abre o check-in completo daquele dia
```

### Épico 3b: Análise de Desenvolvimento Pessoal

```
US-013: Como usuário, quero ver um relatório semanal de bem-estar
        para que eu entenda meus padrões ao longo das semanas.

  Critérios de Aceite:
  - Card semanal com médias das 7 dimensões PSE
  - Comparação com semana anterior — seta ↑↓ por dimensão com delta numérico
  - Destaque automático para dimensão mais baixa: "Atenção: sono em queda"
  - Destaque automático para dimensão mais alta: "Destaque: motivação em alta"
  - Últimas 12 semanas navegáveis (scroll horizontal)
  - Dados vêm de wellbeing_aggregates — leitura < 50ms

US-014: Como usuário, quero ver a correlação entre minha produtividade e meu bem-estar
        para que eu entenda como minha saúde afeta meus commits no dia a dia.

  Critérios de Aceite:
  - Gráfico dual-axis: wellbeing_index (linha) + commits/dia (barras) sobrepostos
  - Toggle de período: 30 ou 90 dias
  - Insights automáticos calculados (exemplos):
    "Nos seus 10 piores dias de estresse, você commitou 40% menos"
    "Sua produtividade é mais alta quando sono ≥ 7"
    "Semanas com wellbeing > 7 têm 2x mais commits"
  - Seção só aparece se GitHub OAuth conectado
  - Dados da query de correlação: [[05-data/schema#3-correlação-xp-vs-bem-estar]]

US-015: Como usuário, quero ver a linha do tempo do meu Digimon
        para que eu reveja os marcos da nossa história juntos.

  Critérios de Aceite:
  - Timeline vertical cronológica por Digimon (incluindo mortos)
  - Eventos marcados: nascimento, evoluções, dias críticos (PSE < 3), morte
  - Para cada evolução: level atingido, data, categoria de projeto que contribuiu
  - Dias com wellbeing_index < 4 marcados visualmente como "dia difícil"
  - Digimons mortos aparecem em seção separada "Memorial"
```

### Épico 4: Ações de Cuidado (NurseActions)

```
US-007: Como usuário, quero colocar meu Digimon para dormir
        para que ele recupere energia.

  Critérios de Aceite:
  - Botão "Dormir" disponível quando energy < 40 ou manualmente
  - Status muda para 'sleeping'
  - Energia recupera +X por hora enquanto dormindo
  - Acordar manualmente disponível após 6h de sono mínimo
  - Digimon não pode ser alimentado enquanto dorme

US-008: Como usuário, quero receber alertas quando meu Digimon precisa de atenção
        para que eu não esqueça de cuidar dele.

  Critérios de Aceite:
  - Push notification quando hunger < 20
  - Push notification quando energy < 15
  - Push notification 24h antes do threshold de morte por abandono
  - Usuário pode configurar horários de notificação
```

### Épico 5: Evolução e Progressão

```
US-009: Como usuário, quero ver meu Digimon evoluir conforme faço commits
        para que sinta que minha produtividade impacta o pet.

  Critérios de Aceite:
  - GitHub sync automático a cada 24h (background job)
  - Commit = XP creditado (10 XP base)
  - Barra de XP visível no dashboard
  - Ao atingir threshold de level: animação de evolução
  - Notificação de evolução com espécie anterior → nova

US-010: Como usuário, quero entender por que meu Digimon evoluiu para determinada forma
        para que eu compreenda a conexão entre meus projetos e a evolução.

  Critérios de Aceite:
  - Card pós-evolução explicando: "Você fez 47 commits em projetos de sistemas"
  - Histórico de evoluções acessível no perfil do Digimon
  - Tooltip nas espécies explicando os requisitos de evolução
```

### Épico 6: Morte e Gestão de Slots

```
US-011: Como usuário, quero ser notificado antes do meu Digimon morrer
        para que eu possa agir a tempo.

  Critérios de Aceite:
  - Notificação crítica 24h antes do threshold de morte
  - Status visual 'critical' com animação de alerta
  - Sem possibilidade de reviver — morte é permanente (explicitado na UI)

US-012: Como usuário, quero adotar um novo Digimon após uma morte
        para que eu possa recomeçar.

  Critérios de Aceite:
  - Slot libera imediatamente após morte
  - Tela de "memorial" exibindo stats do Digimon morto (dias vividos, level, evoluções)
  - CTA para adotar novo Digimon no slot liberado
  - XP total do usuário não é resetado (persiste no perfil)
```

---

## Requisitos Não-Funcionais

### Performance

| Requisito | Target | Prioridade |
|-----------|--------|------------|
| App launch (cold start) | < 3s no device mid-range | Alta |
| Animação do Digimon | 60fps constante — zero jank | Alta |
| Atualização de estado após NurseAction | < 500ms (Supabase round-trip) | Alta |
| GitHub sync background job | < 60s por usuário | Média |
| Time to First Check-in | < 3 min desde o install | Alta |
| Tamanho do bundle inicial | < 50MB (iOS IPA / Android APK) | Média |

**Gargalo potencial:** Lottie files grandes (+200KB cada) carregados simultaneamente no dashboard podem causar jank no mount. Pré-carregar apenas o estado atual, lazy-load os demais estados. Ver [[04-architecture/decisions#ADR-005]].

### Segurança

- Dados PSE são **dados sensíveis de saúde** — criptografia at-rest obrigatória
- RLS no Supabase: usuário só acessa seus próprios dados — ver [[06-security/security-model]]
- GitHub token armazenado criptografado, nunca em localStorage
- Rate limiting nas APIs de check-in e NurseAction

### Escalabilidade

| Cenário | Estratégia |
|---------|-----------|
| 1.000 usuários ativos | Serverless padrão — sem mudanças |
| 10.000 usuários | Inngest queue + Supabase connection pooling (PgBouncer) |
| 100.000 usuários | Read replicas + separação de Read Models (CQRS) para histórico PSE |

### Acessibilidade

- WCAG 2.1 nível AA
- Sprites com `aria-label` descritivos (ex: "Agumon — Saudável, nível 12")
- Formulário PSE navegável por teclado
- Contraste mínimo 4.5:1 em todos os textos

### Disponibilidade

- SLA target: 99.5% uptime (downtime tolerado: ~3.6h/mês)
- Background jobs de GitHub sync são não-críticos — falha não impacta UX imediata

---

## Out of Scope (v1)

- Versão web/PWA — foco total no app mobile
- Batalhas entre Digimons de usuários diferentes
- Integração com wearables (Apple Watch, Garmin) para dados automáticos de sono
- Marketplace de skins/acessórios
- Modo offline com sync posterior

---

## Links

- [[02-domain/domain-model]] — Entidades referenciadas nas User Stories
- [[03-specifications/tasks]] — Tasks derivadas deste PRD
- [[04-architecture/decisions]] — Decisões técnicas que impactam os requisitos
- [[06-security/security-model]] — Detalhes de proteção de dados PSE
