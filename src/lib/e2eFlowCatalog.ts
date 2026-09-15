export type E2EFlowResult = 'approved' | 'rejected' | 'pending';
export type E2EFlowAutomationStatus = 'automated' | 'planned';

export type E2EFlow = {
  id: string;
  title: string;
  area: string;
  profiles: string[];
  critical: boolean;
  automationStatus: E2EFlowAutomationStatus;
  result: E2EFlowResult;
};

/**
 * Catálogo funcional dos fluxos que precisam ser cobertos pela regressão E2E.
 *
 * A lista é compartilhada pela suíte Playwright e pela tela de cobertura para
 * que o produto e a documentação não criem inventários divergentes.
 */
export const flowCatalog: E2EFlow[] = [
  { id: 'auth.login', title: 'Login e carregamento do contexto da clínica', area: 'Autenticação', profiles: ['Administrador local'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'scheduling.conventional', title: 'Agendamento convencional completo', area: 'Agendamento', profiles: ['Recepção', 'Administrador local'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'scheduling.week-view', title: 'Consulta de disponibilidade na visão semanal', area: 'Agendamento', profiles: ['Recepção'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'scheduling.recurrence', title: 'Agendamento recorrente', area: 'Agendamento', profiles: ['Recepção'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'scheduling.simultaneous', title: 'Agendamento simultâneo de procedimentos', area: 'Agendamento', profiles: ['Recepção'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'scheduling.ai-draft', title: 'Preparação de agendamento por IA', area: 'Agendamento', profiles: ['Recepção'], critical: false, automationStatus: 'automated', result: 'approved' },
  { id: 'agenda.create', title: 'Cadastro de agenda com especialidades, salas e regras', area: 'Agendas', profiles: ['Administrador local'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'agenda.conflict', title: 'Validação de conflito real de agenda', area: 'Agendas', profiles: ['Administrador local'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'therapy.weekly-agenda', title: 'Visualização da agenda semanal de terapias', area: 'Terapias', profiles: ['Recepção', 'Administrador local'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'tea.pre-reservation', title: 'Pré-reserva e conversão do fluxo TEA', area: 'TEA', profiles: ['Recepção'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'patient.create', title: 'Cadastro e edição de paciente', area: 'Pacientes', profiles: ['Recepção'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'professional.create', title: 'Cadastro de profissional e vínculos', area: 'Profissionais', profiles: ['Administrador local'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'consultation.execute', title: 'Execução e finalização de consulta', area: 'Consulta', profiles: ['Profissional'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'teleconsultation.execute', title: 'Início e execução de teleconsulta', area: 'Teleconsulta', profiles: ['Profissional'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'exams.execute', title: 'Fila e execução de exames', area: 'Exames', profiles: ['Operação clínica'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'reports.workflow', title: 'Laudo por exame: redação, revisão e finalização', area: 'Laudos', profiles: ['Radiologista', 'Revisor'], critical: true, automationStatus: 'automated', result: 'approved' },
  { id: 'forms.unsaved-changes', title: 'Proteção contra perda de alterações não salvas', area: 'Formulários', profiles: ['Todos'], critical: true, automationStatus: 'automated', result: 'approved' },
];

export const getFlow = (id: string) => {
  const flow = flowCatalog.find((item) => item.id === id);
  if (!flow) throw new Error(`E2E flow not found: ${id}`);
  return flow;
};
