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
| Histórico | Consulta do histórico e abertura do prontuário | Profissional, Recepção | Sim | Aprovado |
| Teleconsulta | Início e execução de teleconsulta | Profissional | Sim | Aprovado |
| Exames | Fila e execução de exames | Operação clínica | Sim | Aprovado |
| Laudos | Laudo por exame: redação, revisão e finalização | Radiologista, Revisor | Sim | Aprovado |
| Formulários | Proteção contra perda de alterações não salvas | Todos | Sim | Aprovado |
| Suporte | Abertura e acompanhamento de chamado | Todos | Não | Aprovado |
| Cadastros clínicos | Cadeia de cadastro clínico: modalidade, especialidade e procedimento | Administrador local | Sim | Aprovado |
| Terapias | Registro de evolução e consulta de relatório TEA | Profissional | Sim | Aprovado |
| Cadastros clínicos | Cadastro de sala vinculada à modalidade e especialidade | Administrador local | Sim | Aprovado |
| Cadastros clínicos | Configuração de triagem por procedimento | Administrador local | Sim | Aprovado |
| Cadastros clínicos | Configuração de anamnese por procedimento | Administrador local | Sim | Aprovado |
| Cadastros clínicos | Cadastro de equipamento operacional | Administrador local | Não | Aprovado |
| Estoque | Cadastro de item e controle inicial de estoque | Administrador local | Sim | Aprovado |
| BI Gestão | Consulta de indicadores e filtros do BI | Administrador local | Não | Aprovado |
| Financeiro | Registro e localização de lançamento financeiro | Administrador local | Sim | Aprovado |
| Entrega | Registro e entrega de documento ao paciente | Recepção | Sim | Aprovado |
| Laudos | Configuração das regras de revisão de laudo | Administrador local | Sim | Aprovado |
| Convênios | Cadastro de convênio e vínculo de procedimento | Administrador local | Sim | Aprovado |
| Estagiários | Cadastro de estagiário com vínculos clínicos | Administrador local | Não | Aprovado |
| Faturamento | Emissão e localização de fatura | Administrador local | Sim | Aprovado |
| Recepção | Checklist de recepção de paciente agendado | Recepção | Sim | Aprovado |
| Terapias | Cadastro de plano terapêutico | Profissional | Sim | Aprovado |
| Terapias | Atualização e persistência do PIT | Profissional | Sim | Aprovado |

Na última rodada: 36 fluxos do catálogo estão automatizados e aprovados. Eles geraram 44 cenários Playwright, executados em desktop e mobile, totalizando 88 verificações aprovadas. O fluxo TEA, inclusive, autoriza a pré-reserva pela tela de Autorização de Convênio; os testes não usam chamada direta à API para executar ações de negócio.

Isso não equivale a dizer que cada possibilidade do sistema está coberta. A suíte também faz smoke das rotas autenticadas e públicas para detectar login indevido, 404 e tela vazia, mas algumas áreas ainda não têm jornada funcional completa: integrações reais de WhatsApp, OTP/portal e check-in com dispositivos, pipeline DICOM real, regras avançadas de TISS/convênio, permissões entre perfis e tarefas assíncronas externas. Essas fronteiras precisam de ambiente e credenciais próprios para serem validadas sem falsos positivos no banco descartável.

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
