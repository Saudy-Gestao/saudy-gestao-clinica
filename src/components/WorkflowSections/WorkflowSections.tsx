import { Box, Text, SimpleGrid, Paper, Group, ThemeIcon, useMantineColorScheme, Skeleton, Stack, Badge } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
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
  ShieldCheck,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import { useCurrentUserProfileQuery } from '../../hooks/useCurrentUserProfileQuery';
import {
  filterModulesForCompanyType,
  normalizeCompanyModuleType,
} from '../../utils/moduleTypeAccess';
import { useMyTicketsQuery } from '../../hooks/useMyTicketsQuery';
import { isDoctorUser } from '../../utils/userRole';

export function WorkflowSections() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const accentColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const { data: currentUser, isLoading, isFetching, refetch } = useCurrentUserProfileQuery();
  const { data: myTicketsData } = useMyTicketsQuery();
  const unreadMyTickets = Number(myTicketsData?.unreadCount || 0);

  const normalizeModuleKey = (value: unknown) => {
    const raw = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
      'cadastro de anamnese': 'cadastro-anamnese',
      'cadastro de enfermagem': 'cadastro-enfermagem',
      'entrega': 'entrega',
      'estoque': 'estoque',
      'financeiro': 'financeiro',
      'faturamento': 'faturamento',
      'whatsapp': 'whatsapp-config',
      'conversas': 'whatsapp-config',
      'meus chamados': 'meus-chamados',
      'configuracoes de laudo': 'laudo',
    };

    if (aliases[compact]) return aliases[compact];
    return compact.replace(/\s+/g, '-');
  };

  const extractAllowedModules = (user: any) => {
    const modules: string[] = [];
    const accesses = Array.isArray(user?.accesses)
      ? user.accesses
      : Array.isArray(user?.access)
        ? user.access
        : [];

    accesses.forEach((access: any) => {
      (access.modules || []).forEach((module: any) => {
        const moduleKey = normalizeModuleKey(module?.name);
        if (moduleKey && !modules.includes(moduleKey)) {
          modules.push(moduleKey);
        }
      });
    });

    (Array.isArray(user?.modules) ? user.modules : []).forEach((module: any) => {
      const moduleName = typeof module === 'string' ? module : module?.name;
      const moduleKey = normalizeModuleKey(moduleName);
      if (moduleKey && !modules.includes(moduleKey)) {
        modules.push(moduleKey);
      }
    });

    return modules;
  };

  const allowedModules = useMemo(
    () => extractAllowedModules(currentUser),
    [currentUser],
  );
  const companyModuleType = useMemo(
    () => normalizeCompanyModuleType((currentUser as any)?.sector?.branch?.company?.module_type),
    [currentUser],
  );
  const visibleAllowedModules = useMemo(
    () => filterModulesForCompanyType(allowedModules.map((name) => ({ name })), companyModuleType).map((module) => String(module.name)),
    [allowedModules, companyModuleType],
  );
  const doctorView = isDoctorUser(currentUser);
  const doctorDefaultModules = ['consulta', 'laudo'];
  const doctorBlockedModules = new Set(['agendamento', 'pre-agendamento', 'pre-atendimento']);

  const hasResolvedAccessData = useMemo(() => {
      const user = currentUser as any;
      return Array.isArray(user?.accesses) || Array.isArray(user?.access) || Array.isArray(user?.modules);
  }, [currentUser]);

  useEffect(() => {
    const onUserUpdated = () => {
      refetch();
    };

    window.addEventListener('auth:changed', onUserUpdated);
    window.addEventListener('auth:user-updated', onUserUpdated);

    return () => {
      window.removeEventListener('auth:changed', onUserUpdated);
      window.removeEventListener('auth:user-updated', onUserUpdated);
    };
  }, [refetch]);

  const sections = [
    {
      title: 'Jornada do Paciente',
      items: [
        { icon: Calendar, label: 'Agendamento', desc: 'Consultas e exames', route: '/agendamento', moduleName: 'agendamento' },
        { icon: CalendarCheck, label: 'Pré-atendimento', desc: 'Pré-autorização e documentos', route: '/pre-atendimento', moduleName: 'pre-agendamento', fallbackModuleNames: ['pre-atendimento'] },
        { icon: UserPlus, label: 'Autorização e Recepção', desc: 'Check-in, checklist e recepção', route: '/autorizacao-e-recepcao', moduleName: 'pre-atendimento', fallbackModuleNames: ['autorizacao-e-recepcao'] },
      ]
    },
    {
      title: 'Operação Clínica',
      items: [
        { icon: Stethoscope, label: 'Consulta', desc: 'Atendimento médico', route: '/consulta', moduleName: 'consulta' },
        { icon: ClipboardCheck, label: 'Execução de Exames', desc: 'Triagem e andamento do exame', route: '/execucao-exames', moduleName: 'execucao-exames' },
        { icon: FileText, label: 'Laudo por Exame', desc: 'Fila com editor de laudo', route: '/laudo-exames', moduleName: 'laudo' },
        { icon: ShieldCheck, label: 'Autorização Convênio', desc: 'Autorizações pendentes', route: '/autorizacao-convenio', moduleName: 'autorizacao-convenio' },
        { icon: Brain, label: 'Módulo TEA', desc: 'Cadastro e acompanhamento', route: '/tea', moduleName: 'modulo-tea' },
      ]
    },
    {
      title: 'Cadastros Clínicos',
      items: [
        { icon: UserPlus, label: 'Cadastro de Paciente', desc: 'Registro de pacientes', route: '/cadastro-paciente', moduleName: 'cadastro-paciente' },
        { icon: UserPlus, label: 'Cadastro de Médico', desc: 'Registro de médicos', route: '/cadastro-medico', moduleName: 'cadastro-medico' },
        { icon: ClipboardList, label: 'Cadastro de Procedimentos', desc: 'Procedimentos e modalidades', route: '/cadastro-procedimento', moduleName: 'cadastro-procedimento' },
        { icon: FileText, label: 'Cadastro de Convênio', desc: 'Convênios aceitos', route: '/cadastro-convenio', moduleName: 'cadastro-convenio' },
        { icon: Warehouse, label: 'Cadastro de Salas', desc: 'Salas por filial', route: '/cadastro-sala', moduleName: 'cadastro-sala' },
        { icon: ScanLine, label: 'Cadastro de Equipamentos', desc: 'Modalidades e DICOM', route: '/cadastro-equipamento', moduleName: 'cadastro-equipamento' },
        { icon: ClipboardPenLine, label: 'Cadastro de Anamnese', desc: 'Perguntas por procedimento', route: '/cadastro-anamnese', moduleName: 'cadastro-anamnese' },
        { icon: ClipboardCheck, label: 'Cadastro de Enfermagem', desc: 'Triagens por procedimento', route: '/cadastro-enfermagem', moduleName: 'cadastro-enfermagem' },
        { icon: FileText, label: 'Configurações de Laudo', desc: 'Padrões, frases e parâmetros', route: '/laudo-configuracoes', moduleName: 'laudo' },
      ]
    },
    {
      title: 'Gestão e Apoio',
      items: [
        { icon: Package, label: 'Entrega', desc: 'Controle de entregas', route: '/entrega', moduleName: 'entrega' },
        { icon: Warehouse, label: 'Estoque', desc: 'Materiais e insumos', route: '/estoque', moduleName: 'estoque' },
        { icon: Wallet, label: 'Financeiro', desc: 'Gestão financeira', route: '/financeiro', moduleName: 'financeiro' },
        { icon: DollarSign, label: 'Faturamento', desc: 'Cobranças e NFs', route: '/faturamento', moduleName: 'faturamento' },
        { icon: MessageCircle, label: 'Meus Chamados', desc: 'Acompanhe seus tickets', route: '/meus-chamados', moduleName: 'meus-chamados' },
      ]
    },
    {
      title: 'Comunicação',
      items: [
        { icon: MessageCircle, label: 'Conversas', desc: 'Atendimento humanizado do WhatsApp', route: '/conversas', moduleName: 'conversas', fallbackModuleNames: ['whatsapp-config'] },
        { icon: MessageCircle, label: 'WhatsApp', desc: 'Mensagens, templates e configuração', route: '/whatsapp', moduleName: 'whatsapp-config' },
      ]
    }
  ];

  // Filtra as seções para mostrar apenas módulos permitidos
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (doctorView && doctorBlockedModules.has(String(item.moduleName || ''))) {
        return false;
      }

      return item.moduleName === 'meus-chamados'
        || (visibleAllowedModules.length === 0 && doctorView && doctorDefaultModules.includes(item.moduleName))
        || (visibleAllowedModules.length === 0 && !doctorView)
        || visibleAllowedModules.includes(item.moduleName)
        || (Array.isArray((item as any).fallbackModuleNames) && (item as any).fallbackModuleNames.some((moduleName: string) => visibleAllowedModules.includes(moduleName)));
    }),
  })).filter(section => section.items.length > 0); // Remove seções vazias

  return (
    <>
      {(isLoading && !currentUser) || (isFetching && !hasResolvedAccessData) ? (
        <Box py="xl">
          <Stack gap="xl">
            {Array.from({ length: 3 }).map((_, sectionIndex) => (
              <Box key={sectionIndex}>
                <Skeleton height={22} width={180} radius="xl" mb="md" />
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                  {Array.from({ length: 4 }).map((__, cardIndex) => (
                    <Paper
                      key={cardIndex}
                      p="xs"
                      withBorder
                      style={{
                        borderColor: 'var(--mantine-color-default-border)',
                        minHeight: 60,
                      }}
                    >
                      <Group justify="space-between" align="flex-start">
                        <Group gap="xs" align="flex-start">
                          <Skeleton height={32} width={32} radius="md" />
                          <Box>
                            <Skeleton height={14} width={120} radius="xl" mb={6} />
                            <Skeleton height={11} width={90} radius="xl" />
                          </Box>
                        </Group>
                        <Skeleton height={14} width={14} radius="xl" />
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : visibleAllowedModules.length === 0 && !doctorView ? (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text size="lg" c="dimmed" mb="xs">
            🔒 Você ainda não possui acessos configurados
          </Text>
          <Text size="sm" c="dimmed">
            Entre em contato com o administrador do sistema para solicitar permissões
          </Text>
        </Box>
      ) : filteredSections.length === 0 ? (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text size="lg" c="dimmed" mb="xs">
            🔒 Nenhum módulo disponível
          </Text>
          <Text size="sm" c="dimmed">
            Seus acessos não correspondem a nenhum módulo do sistema
          </Text>
        </Box>
      ) : (
        <>
          {filteredSections.map((section, idx) => (
        <Box key={idx} mb={30}>
          <Text fw={600} size="lg" c="dimmed" mb="md">{section.title}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {section.items.map((item, i) => (
              <Paper 
                key={i} 
                p="xs" 
                withBorder 
                className={colorScheme === 'dark' ? 'module-card-dark' : undefined}
                style={{
                  cursor: item.route ? 'pointer' : 'default',
                  borderColor: 'var(--mantine-color-default-border)',
                  minHeight: 60,
                  height: '100%'
                }}
                onClick={() => {
                  if (!item.route) return;
                  if (item.moduleName === 'modulo-tea') {
                    navigate(item.route, { state: { fromModuleHub: true } });
                    return;
                  }
                  navigate(item.route);
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Group gap="xs">
                    <ThemeIcon size="md" variant="transparent" color="darkBlue" bg="transparent" style={{ border: `1px solid ${accentColor}`, borderRadius: '6px' }}>
                      <item.icon size={18} color={accentColor} />
                    </ThemeIcon>
                    <Box>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={500} size="sm" lineClamp={1}>{item.label}</Text>
                        {item.moduleName === 'meus-chamados' && unreadMyTickets > 0 ? (
                          <Badge color="red" size="xs">{unreadMyTickets}</Badge>
                        ) : null}
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={1}>{item.desc}</Text>
                    </Box>
                  </Group>
                  {item.route && <ChevronRight size={16} color="var(--mantine-color-dimmed)" />}
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      ))}
        </>
      )}
    </>
  );
}
