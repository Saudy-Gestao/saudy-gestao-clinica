import { Box, Text, SimpleGrid, Paper, Group, ThemeIcon, useMantineColorScheme } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import userService from '../../services/userService';
import {
  UserPlus,
  Calendar,
  ClipboardList,
  HeartPulse,
  Stethoscope,
  FileText,
  Mail,
  Folder,
  Package,
  Warehouse,
  Wallet,
  DollarSign,
  Brain,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';

export function WorkflowSections() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const accentColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;

  const extractModulesFromAccesses = (accesses: any[]) => {
    const modules: string[] = [];

    (accesses || []).forEach((access: any) => {
      (access.modules || []).forEach((module: any) => {
        if (module?.name && !modules.includes(module.name)) {
          modules.push(module.name);
        }
      });
    });

    return modules;
  };

  const fetchUserModules = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setAllowedModules([]);
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user?.id) {
        setAllowedModules([]);
        return;
      }

      const freshUser = await userService.getUser(user.id);
      localStorage.setItem('user', JSON.stringify(freshUser));
      setAllowedModules(extractModulesFromAccesses(freshUser.accesses || []));
    } catch (error) {
      try {
        const cachedUser = JSON.parse(userStr);
        setAllowedModules(extractModulesFromAccesses(cachedUser.accesses || []));
      } catch {
        setAllowedModules([]);
      }
    }
  };

  useEffect(() => {
    fetchUserModules();

    const onUserUpdated = () => {
      fetchUserModules();
    };

    window.addEventListener('auth:user-updated', onUserUpdated);

    return () => {
      window.removeEventListener('auth:user-updated', onUserUpdated);
    };
  }, []);

  const sections = [
    {
      title: 'Fluxo do Paciente',
      items: [
        { icon: Calendar, label: 'Agendamento', desc: 'Consultas e exames', route: '/agendamento', moduleName: 'agendamento' },
        { icon: ClipboardList, label: 'Anamnese', desc: 'Histórico médico', route: '/anamnese', moduleName: 'anamnese' },
        { icon: UserPlus, label: 'Autorização e Recepção', desc: 'Recepção e cadastro', route: '/pre-atendimento', moduleName: 'pre-atendimento' },
        { icon: HeartPulse, label: 'Enfermagem', desc: 'Triagem e sinais vitais', route: '/enfermagem', moduleName: 'enfermagem' },
      ]
    },
    {
      title: 'Suporte Clínico',
      items: [
        { icon: Stethoscope, label: 'Consulta', desc: 'Atendimento médico', route: '/consulta', moduleName: 'consulta' },
        { icon: FileText, label: 'Laudo', desc: 'Emissão de laudos', route: '/laudo', moduleName: 'laudo' },
        { icon: FileText, label: 'Laudo por Exame', desc: 'Fila com editor de laudo', route: '/laudo-exames', moduleName: 'laudo' },
        { icon: FileText, label: 'Configurações de Laudo', desc: 'Padrões e frases', route: '/laudo-configuracoes', moduleName: 'laudo' },
        { icon: Mail, label: 'Envelopamento', desc: 'Preparação de docs', route: '/envelopamento', moduleName: 'envelopamento' },
        { icon: ShieldCheck, label: 'Autorização Convênio', desc: 'Autorizações pendentes', route: '/autorizacao-convenio', moduleName: 'autorizacao-convenio' },
        { icon: Brain, label: 'Módulo TEA', desc: 'Cadastro e acompanhamento', route: '/tea', moduleName: 'modulo-tea' },
        { icon: Folder, label: 'Documentos', desc: 'Gestão documental', moduleName: 'documentos' },
      ]
    },
    {
      title: 'Administrativo',
      items: [
        { icon: Package, label: 'Entrega', desc: 'Controle de entregas', route: '/entrega', moduleName: 'entrega' },
        { icon: Warehouse, label: 'Estoque', desc: 'Materiais e insumos', route: '/estoque', moduleName: 'estoque' },
        { icon: Wallet, label: 'Financeiro', desc: 'Gestão financeira', route: '/financeiro', moduleName: 'financeiro' },
        { icon: DollarSign, label: 'Faturamento', desc: 'Cobranças e NFs', route: '/faturamento', moduleName: 'faturamento' },
        { icon: UserPlus, label: 'Cadastro de Médico', desc: 'Registro de médicos', route: '/cadastro-medico', moduleName: 'cadastro-medico' },
        { icon: ClipboardList, label: 'Cadastro de Procedimentos', desc: 'Procedimentos e modalidades', route: '/cadastro-procedimento', moduleName: 'cadastro-procedimento' },
        { icon: FileText, label: 'Cadastro de Convênio', desc: 'Convênios aceitos', route: '/cadastro-convenio', moduleName: 'cadastro-convenio' },
        { icon: UserPlus, label: 'Cadastro de Paciente', desc: 'Registro de pacientes', route: '/cadastro-paciente', moduleName: 'cadastro-paciente' },
        { icon: Warehouse, label: 'Cadastro de Salas', desc: 'Salas por filial', route: '/cadastro-sala', moduleName: 'cadastro-sala' },
      ]
    }
  ];

  // Filtra as seções para mostrar apenas módulos permitidos
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      allowedModules.length === 0 || allowedModules.includes(item.moduleName)
    )
  })).filter(section => section.items.length > 0); // Remove seções vazias

  return (
    <>
      {allowedModules.length === 0 ? (
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
                      <Text fw={500} size="sm" lineClamp={1}>{item.label}</Text>
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
