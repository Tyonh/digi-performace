# Project Overview — Digivice

> **Status:** `ACTIVE — Pre-MVP`
> **Versão:** 0.1.0
> **Owner:** [@camelogeovane1](mailto:camelogeovane1@gmail.com)
> **Última atualização:** 2026-06-20

---

## Visão

Digivice é uma aplicação de **pet virtual terapêutico** onde o estado de saúde física, mental e psicológica do personagem — um Digimon — espelha diretamente os dados de bem-estar coletados diariamente do usuário.

O sistema combina três pilares:
1. **Self-tracking de bem-estar** — coleta diária via questionário PSE (0–10)
2. **Mecânicas de cuidado** — modelo Tamagotchi com alimentação, sono e atenção
3. **Gamificação por produtividade** — atividade no GitHub como fonte primária de XP e evolução

O Digimon não é cosmético. Ele é um espelho do usuário. Se o usuário dorme mal, o Digimon fica doente. Se o usuário não commita por dias, o Digimon perde XP. Se o usuário é esquecido, o Digimon morre.

---

## Objetivos de Negócio

| # | Objetivo | Métrica de Sucesso |
|---|----------|-------------------|
| O1 | Engajar o usuário em check-ins diários de bem-estar | ≥ 80% de check-ins nos primeiros 30 dias |
| O2 | Criar vínculo emocional com o pet via mecânicas de cuidado | Taxa de morte de Digimon < 15% no primeiro mês |
| O3 | Refletir produtividade técnica via GitHub | Correlação visual entre commit streak e nível do Digimon |
| O4 | Suportar múltiplos pets sem fricção de UX | Usuário alterna entre 3 Digimons em < 3 toques |

---

## Golden Path — Fluxo Principal do Sistema

```
[Usuário acessa o app]
        │
        ▼
[Dashboard — Digimon ativo exibido com estado atual]
        │
        ├──► [Digimon precisa de atenção?]
        │           │
        │    SIM ──► [Card de Cuidado: Alimentar / Colocar pra dormir]
        │           │        │
        │           │        └──► [Trigger: Formulário PSE diário]
        │           │                    │
        │           │                    └──► [Salva DailyCheckIn]
        │           │                                │
        │           │                                └──► [Recalcula DigimonState]
        │           │
        │    NÃO ──► [Exibe estado atual — animação idle]
        │
        ├──► [GitHub sync background job]
        │           │
        │           └──► [Busca commits das últimas 24h]
        │                       │
        │                       └──► [Calcula XP delta]
        │                                   │
        │                                   └──► [Verifica threshold de evolução]
        │                                               │
        │                                        SIM ──► [Trigger: Evolution Event]
        │                                        NÃO ──► [Atualiza level bar]
        │
        └──► [Usuário alterna entre Digimons (max 3)]
```

---

## Conceitos-Chave do Domínio

| Conceito | Descrição |
|----------|-----------|
| [[DigimonState]] | Snapshot do estado atual do Digimon (saúde, humor, fome, sono) |
| [[DailyCheckIn]] | Questionário PSE diário — alimentação primária do Digimon |
| [[GitActivity]] | Commits e tipo de projetos como fonte de XP |
| [[Evolution]] | Evento de transformação do Digimon baseado em XP + tipo de atividade |
| [[NurseAction]] | Ações de cuidado do usuário: alimentar, dormir, brincar |
| [[DigimonDeath]] | Estado terminal — Digimon não cuidado por N dias consecutivos |

---

## Restrições de Negócio

- **Máximo de 3 Digimons** por usuário simultaneamente
- **Sem recuperação de Digimon morto** — perda permanente (core mechanic)
- **Check-in diário obrigatório** para manter o Digimon vivo (grace period: 48h)
- **GitHub OAuth obrigatório** para funcionalidades de evolução por commits
- **Dados de bem-estar são pessoais e sensíveis** — escopo [[06-security/security-model]]

---

## Links Internos

- [[00-context/tech-stack]] — Stack e padrões de desenvolvimento
- [[01-product/PRD]] — Requisitos funcionais e não-funcionais
- [[02-domain/domain-model]] — Bounded Contexts e Agregados DDD
- [[04-architecture/decisions]] — ADRs
- [[03-specifications/tasks]] — Backlog de execução
