# Catálogo de fluxos E2E

Este arquivo é o mapa funcional dos fluxos críticos do Saudy Gestão. A fonte compartilhada do catálogo é [`src/lib/e2eFlowCatalog.ts`](../src/lib/e2eFlowCatalog.ts); a suíte Playwright e a tela `/e2e-fluxos` consomem o mesmo inventário.

Com o front local em execução, o painel pode ser aberto em `http://localhost:4173/e2e-fluxos`.

## Status

- `Aprovado`: possui cenário Playwright executável e passou na última rodada local.
- `Pendente`: fluxo catalogado, aguardando cenário e dados específicos.
- `Reprovado`: cenário executado com falha aberta.

| Área | Fluxo | Perfil | Crítico | Status |
| --- | --- | --- | :---: | --- |
| Autenticação | Login e carregamento do contexto da clínica | Administrador local | Sim | Aprovado |
| Agendamento | Agendamento convencional completo | Recepção, Administrador local | Sim | Aprovado |
| Agendamento | Consulta de disponibilidade na visão semanal | Recepção | Sim | Aprovado |
| Agendamento | Agendamento recorrente | Recepção | Sim | Aprovado |
| Agendamento | Agendamento simultâneo de procedimentos | Recepção | Sim | Aprovado |
| Agendamento | Preparação de agendamento por IA | Recepção | Não | Aprovado |
| Agendas | Cadastro de agenda com especialidades, salas e regras | Administrador local | Sim | Aprovado |
| Agendas | Validação de conflito real de agenda | Administrador local | Sim | Aprovado |
| Terapias | Visualização da agenda semanal de terapias | Recepção, Administrador local | Sim | Aprovado |
| TEA | Pré-reserva e conversão do fluxo TEA | Recepção | Sim | Aprovado |
| Pacientes | Cadastro e edição de paciente | Recepção | Sim | Aprovado |
| Profissionais | Cadastro de profissional e vínculos | Administrador local | Sim | Aprovado |
| Consulta | Execução e finalização de consulta | Profissional | Sim | Aprovado |
| Teleconsulta | Início e execução de teleconsulta | Profissional | Sim | Aprovado |
| Exames | Fila e execução de exames | Operação clínica | Sim | Aprovado |
| Laudos | Laudo por exame: redação, revisão e finalização | Radiologista, Revisor | Sim | Aprovado |
| Formulários | Proteção contra perda de alterações não salvas | Todos | Sim | Aprovado |

Na rodada atual: 17 fluxos do catálogo estão automatizados e aprovados, não há pendências nem reprovações abertas.

## Como executar

Na raiz do front:

```bash
yarn e2e
```

O comando sobe o banco isolado, aplica todas as migrations, recria os dados determinísticos e executa os cenários em desktop e mobile.

Para abrir o Playwright em modo interativo:

```bash
yarn e2e:ui
```

O banco de testes fica no container `saudy-e2e-db`, na porta `55433`, separado dos bancos locais existentes. A preparação pode ser executada sem rodar a suíte:

```bash
yarn e2e:prepare
```

Credencial exclusiva dos testes: `e2e@saudy.test` / `E2e!Test123`.

Para parar somente o banco E2E:

```bash
yarn e2e:db:down
```

Os dados do E2E são descartáveis e nunca devem apontar para homologação ou produção.
