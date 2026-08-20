/**
 * Catálogo único de macros (seções) e micros (módulos) do app.
 *
 * Fonte de verdade consumida pela sidebar do shell, pelo dashboard (blocos por
 * seção) e por qualquer lugar que precise listar módulos respeitando as
 * permissões do usuário (Access/Module), o module_type da empresa e as regras
 * de visão do médico. Antes essa definição vivia duplicada em
 * WorkflowSections e Header.
 */
import { useMemo, type ElementType } from 'react';
import {
  UserPlus,
  Calendar,
  CalendarCheck,
  ClipboardList,
  ClipboardPenLine,
  ClipboardCheck,
  Stethoscope,
  FileText,
  Package,
  Warehouse,
  ScanLine,
  Wallet,
  DollarSign,
  Brain,
  BarChart3,
  ShieldCheck,
  MessageCircle,
  Route,
  LayoutDashboard,
  Tag,
  Layers3,
  CalendarClock,
} from 'lucide-react';
import { useCurrentUserProfileQuery } from '../hooks/useCurrentUserProfileQuery';
import { filterModulesForCompanyType, normalizeCompanyModuleType } from '../utils/moduleTypeAccess';
import { isDoctorUser } from '../utils/userRole';

export type ModuleItem = {
  icon: ElementType;
  label: string;
  desc: string;
  route: string;
  moduleName: string;
  fallbackModuleNames?: string[];
};

export type MacroSection = {
  key: string;
  title: string;
  icon: ElementType;
  items: ModuleItem[];
};

export const OVERVIEW_SECTION_KEY = 'visao-geral';

export const OVERVIEW_ENTRY = {
  key: OVERVIEW_SECTION_KEY,
  title: 'Visão Geral',
  icon: LayoutDashboard,
};

export const MACRO_SECTIONS: MacroSection[] = [
  {
    key: 'jornada-do-paciente',
    title: 'Jornada do Paciente',
    icon: Route,
    items: [
      { icon: Calendar, label: 'Agendamento', desc: 'Consultas e exames', route: '/agendamento', moduleName: 'agendamento' },
      { icon: CalendarCheck, label: 'Pré-atendimento', desc: 'Pré-autorização e documentos', route: '/pre-atendimento', moduleName: 'pre-agendamento', fallbackModuleNames: ['pre-atendimento'] },
      { icon: UserPlus, label: 'Autorização e Recepção', desc: 'Check-in, checklist e recepção', route: '/autorizacao-e-recepcao', moduleName: 'pre-atendimento', fallbackModuleNames: ['autorizacao-e-recepcao'] },
    ],
  },
  {
    key: 'operacao-clinica',
    title: 'Operação Clínica',
    icon: Stethoscope,
    items: [
      { icon: Stethoscope, label: 'Consulta', desc: 'Atendimento médico', route: '/consulta', moduleName: 'consulta' },
      { icon: ClipboardCheck, label: 'Execução de Exames', desc: 'Triagem e andamento do exame', route: '/execucao-exames', moduleName: 'execucao-exames' },
      { icon: FileText, label: 'Laudo por Exame', desc: 'Fila com editor de laudo', route: '/laudo-exames', moduleName: 'laudo' },
      { icon: ShieldCheck, label: 'Autorização Convênio', desc: 'Autorizações pendentes', route: '/autorizacao-convenio', moduleName: 'autorizacao-convenio' },
      { icon: Brain, label: 'Módulo TEA', desc: 'Cadastro e acompanhamento', route: '/tea', moduleName: 'modulo-tea' },
    ],
  },
  {
    key: 'cadastros-clinicos',
    title: 'Cadastros Clínicos',
    icon: ClipboardList,
    items: [
      { icon: UserPlus, label: 'Cadastro de Paciente', desc: 'Registro de pacientes', route: '/cadastro-paciente', moduleName: 'cadastro-paciente' },
      { icon: UserPlus, label: 'Cadastro de Profissional', desc: 'Registro de profissionais', route: '/cadastro-medico', moduleName: 'cadastro-medico' },
      { icon: ClipboardList, label: 'Cadastro de Procedimentos', desc: 'Procedimentos e modalidades', route: '/cadastro-procedimento', moduleName: 'cadastro-procedimento' },
      { icon: FileText, label: 'Cadastro de Convênio', desc: 'Convênios aceitos', route: '/cadastro-convenio', moduleName: 'cadastro-convenio' },
      { icon: Warehouse, label: 'Cadastro de Salas', desc: 'Salas por filial', route: '/cadastro-sala', moduleName: 'cadastro-sala' },
      { icon: ScanLine, label: 'Cadastro de Equipamentos', desc: 'Modalidades e DICOM', route: '/cadastro-equipamento', moduleName: 'cadastro-equipamento' },
      { icon: Tag, label: 'Cadastro de Modalidades', desc: 'Tipos de exame (Tomografia, RM, US...)', route: '/cadastro-modalidade', moduleName: 'cadastro-modalidade' },
      { icon: Layers3, label: 'Cadastro de Especialidades', desc: 'Especialidades e métodos por modalidade', route: '/cadastro-especialidade', moduleName: 'cadastro-especialidade' },
      { icon: ClipboardPenLine, label: 'Cadastro de Anamnese', desc: 'Perguntas por procedimento', route: '/cadastro-anamnese', moduleName: 'cadastro-anamnese' },
      { icon: ClipboardCheck, label: 'Cadastro de Enfermagem', desc: 'Triagens por procedimento', route: '/cadastro-enfermagem', moduleName: 'cadastro-enfermagem' },
      { icon: CalendarClock, label: 'Cadastro de Agendas', desc: 'Agendas de profissionais por unidade, dia e turno', route: '/cadastro-agenda', moduleName: 'cadastro-agenda' },
      { icon: FileText, label: 'Configurações de Laudo', desc: 'Padrões, frases e parâmetros', route: '/laudo-configuracoes', moduleName: 'laudo' },
    ],
  },
  {
    key: 'gestao-e-apoio',
    title: 'Gestão e Apoio',
    icon: BarChart3,
    items: [
      { icon: BarChart3, label: 'BI Gestão', desc: 'Indicadores executivos', route: '/bi', moduleName: 'bi-gestao' },
      { icon: Package, label: 'Entrega', desc: 'Controle de entregas', route: '/entrega', moduleName: 'entrega' },
      { icon: Warehouse, label: 'Estoque', desc: 'Materiais e insumos', route: '/estoque', moduleName: 'estoque' },
      { icon: Wallet, label: 'Financeiro', desc: 'Gestão financeira', route: '/financeiro', moduleName: 'financeiro' },
      { icon: DollarSign, label: 'Faturamento', desc: 'Cobranças e NFs', route: '/faturamento', moduleName: 'faturamento' },
      { icon: MessageCircle, label: 'Meus Chamados', desc: 'Acompanhe seus tickets', route: '/meus-chamados', moduleName: 'meus-chamados' },
    ],
  },
  {
    key: 'comunicacao',
    title: 'Comunicação',
    icon: MessageCircle,
    items: [
      { icon: MessageCircle, label: 'Conversas', desc: 'Atendimento humanizado do WhatsApp', route: '/conversas', moduleName: 'conversas', fallbackModuleNames: ['whatsapp-config'] },
      { icon: MessageCircle, label: 'WhatsApp', desc: 'Mensagens, templates e configuração', route: '/whatsapp', moduleName: 'whatsapp-config' },
    ],
  },
];

export const normalizeModuleKey = (value: unknown) => {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, ' ').trim();
  const aliases: Record<string, string> = {
    'agendamento': 'agendamento',
    'pre agendamento': 'pre-agendamento',
    'pre-atendimento': 'pre-atendimento',
    'pre atendimento': 'pre-atendimento',
    'autorizacao e recepcao': 'pre-atendimento',
    'consulta': 'consulta',
    'teleconsulta': 'consulta',
    'execucao de exames': 'execucao-exames',
    'laudo': 'laudo',
    'laudo por exame': 'laudo',
    'autorizacao convenio': 'autorizacao-convenio',
    'modulo tea': 'modulo-tea',
    'cadastro de paciente': 'cadastro-paciente',
    'cadastro de medico': 'cadastro-medico',
    'cadastro de procedimentos': 'cadastro-procedimento',
    'cadastro de procedimento': 'cadastro-procedimento',
    'cadastro de convenio': 'cadastro-convenio',
    'cadastro de salas': 'cadastro-sala',
    'cadastro de equipamentos': 'cadastro-equipamento',
    'cadastro de modalidades': 'cadastro-modalidade',
    'modalidades': 'cadastro-modalidade',
    'modalidade': 'cadastro-modalidade',
    'cadastro de especialidades': 'cadastro-especialidade',
    'especialidades': 'cadastro-especialidade',
    'especialidade': 'cadastro-especialidade',
    'cadastro de anamnese': 'cadastro-anamnese',
    'cadastro de enfermagem': 'cadastro-enfermagem',
    'cadastro de agendas': 'cadastro-agenda',
    'cadastro de agenda': 'cadastro-agenda',
    'agendas': 'cadastro-agenda',
    'entrega': 'entrega',
    'estoque': 'estoque',
    'financeiro': 'financeiro',
    'faturamento': 'faturamento',
    'whatsapp': 'whatsapp-config',
    'conversas': 'whatsapp-config',
    'meus chamados': 'meus-chamados',
    'configuracoes de laudo': 'laudo',
    'bi': 'bi-gestao',
    'bi gestao': 'bi-gestao',
    'business intelligence': 'bi-gestao',
  };

  if (aliases[compact]) return aliases[compact];
  return compact.replace(/\s+/g, '-');
};

export const extractAllowedModules = (user: any): string[] => {
  const modules: string[] = [];
  const accesses = Array.isArray(user?.accesses)
    ? user.accesses
    : Array.isArray(user?.access)
      ? user.access
      : [];

  accesses.forEach((access: any) => {
    (access.modules || []).forEach((module: any) => {
      const moduleKey = normalizeModuleKey(module?.name);
      if (moduleKey && !modules.includes(moduleKey)) modules.push(moduleKey);
    });
  });

  (Array.isArray(user?.modules) ? user.modules : []).forEach((module: any) => {
    const moduleName = typeof module === 'string' ? module : module?.name;
    const moduleKey = normalizeModuleKey(moduleName);
    if (moduleKey && !modules.includes(moduleKey)) modules.push(moduleKey);
  });

  return modules;
};

const DOCTOR_DEFAULT_MODULES = ['consulta', 'laudo'];
const DOCTOR_BLOCKED_MODULES = new Set(['agendamento', 'pre-agendamento', 'pre-atendimento']);

export const filterSectionsForUser = (user: any): MacroSection[] => {
  const allowedModules = extractAllowedModules(user);
  const companyModuleType = normalizeCompanyModuleType(user?.sector?.branch?.company?.module_type);
  const visibleAllowedModules = filterModulesForCompanyType(
    allowedModules.map((name) => ({ name })),
    companyModuleType,
  ).map((module) => String(module.name));
  const doctorView = isDoctorUser(user);

  return MACRO_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (doctorView && DOCTOR_BLOCKED_MODULES.has(String(item.moduleName || ''))) return false;

      return item.moduleName === 'meus-chamados'
        || (visibleAllowedModules.length === 0 && doctorView && DOCTOR_DEFAULT_MODULES.includes(item.moduleName))
        || (visibleAllowedModules.length === 0 && !doctorView)
        || visibleAllowedModules.includes(item.moduleName)
        || (Array.isArray(item.fallbackModuleNames) && item.fallbackModuleNames.some((moduleName) => visibleAllowedModules.includes(moduleName)));
    }),
  })).filter((section) => section.items.length > 0);
};

export const useVisibleSections = () => {
  const { data: currentUser, isLoading, isFetching, refetch } = useCurrentUserProfileQuery();

  const sections = useMemo(() => filterSectionsForUser(currentUser), [currentUser]);

  const hasResolvedAccessData = useMemo(() => {
    const user = currentUser as any;
    return Array.isArray(user?.accesses) || Array.isArray(user?.access) || Array.isArray(user?.modules);
  }, [currentUser]);

  const visibleAllowedModules = useMemo(() => {
    const allowed = extractAllowedModules(currentUser);
    const companyModuleType = normalizeCompanyModuleType((currentUser as any)?.sector?.branch?.company?.module_type);
    return filterModulesForCompanyType(allowed.map((name) => ({ name })), companyModuleType).map((m) => String(m.name));
  }, [currentUser]);

  return {
    sections,
    currentUser,
    doctorView: isDoctorUser(currentUser),
    visibleAllowedModules,
    hasResolvedAccessData,
    isLoading,
    isFetching,
    refetch,
  };
};

/** Resolve qual macro contém a rota atual, para destacar o item na sidebar. */
export const findSectionKeyForPath = (pathname: string): string | null => {
  if (!pathname || pathname === '/' || pathname === '/dashboard') return OVERVIEW_SECTION_KEY;
  for (const section of MACRO_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.route || pathname.startsWith(`${item.route}/`)) return section.key;
    }
  }
  return null;
};
