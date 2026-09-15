import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Text,
  useColorScheme,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { ChevronLeft, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserMenu from './UserMenu';
import authService from '../../services/authService';
import './Header.css';

interface HeaderBackAction {
  label?: string;
  onClick: () => void;
}

interface HeaderProps {
  back?: HeaderBackAction;
  contextLabel?: string;
}

export function Header({ back, contextLabel }: HeaderProps) {
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useColorScheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(() => authService.getCurrentUser());
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const pageContext = useMemo(() => {
    const routeLabels: Array<[string, string]> = [
      ['/dashboard', 'Visão geral'],
      ['/bi', 'BI Gestão'],
      ['/e2e-fluxos', 'Cobertura de fluxos'],
      ['/agendamento', 'Agendamento'],
      ['/pre-atendimento', 'Pré-atendimento'],
      ['/autorizacao-e-recepcao', 'Autorização e recepção'],
      ['/consulta', 'Consulta'],
      ['/execucao-exames', 'Execução de exames'],
      ['/laudo-exames', 'Laudos por exame'],
      ['/autorizacao-convenio', 'Autorização de convênio'],
      ['/tea', 'Módulo Terapias'],
      ['/cadastro-paciente', 'Cadastro de pacientes'],
      ['/cadastro-medico', 'Cadastro de profissionais'],
      ['/cadastro-procedimento', 'Cadastro de procedimentos'],
      ['/cadastro-convenio', 'Cadastro de convênios'],
      ['/cadastro-sala', 'Cadastro de salas'],
      ['/cadastro-equipamento', 'Cadastro de equipamentos'],
      ['/cadastro-modalidade', 'Cadastro de modalidades'],
      ['/cadastro-especialidade', 'Cadastro de especialidades'],
      ['/cadastro-anamnese', 'Cadastro de anamnese'],
      ['/cadastro-enfermagem', 'Cadastro de enfermagem'],
      ['/cadastro-agenda', 'Cadastro de agendas'],
      ['/entrega', 'Entrega'],
      ['/estoque', 'Estoque'],
      ['/financeiro', 'Financeiro'],
      ['/faturamento', 'Faturamento'],
      ['/conversas', 'Conversas'],
      ['/whatsapp', 'WhatsApp'],
      ['/meus-chamados', 'Meus chamados'],
      ['/settings', 'Configurações'],
    ];
    return routeLabels.find(([route]) => location.pathname === route || location.pathname.startsWith(`${route}/`))?.[1] || 'Painel de gestão';
  }, [location.pathname]);

  const isAdmHubOnly = Boolean((currentUser as any)?.isAdmHubOnly);
  const homeRoute = isAdmHubOnly ? '/adm-hub' : '/dashboard';

  const timeStr = useMemo(() => {
    return currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const dateStr = useMemo(() => {
    const day = currentTime.getDate().toString().padStart(2, '0');
    const month = currentTime.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase());
    const year = currentTime.getFullYear();
    return `${day} de ${month}, ${year}`;
  }, [currentTime]);

  const userDisplayName = useMemo(() => {
    const user = currentUser as any;
    const name = String(user?.name || '').trim();
    if (name) return name;
    const email = String(user?.email || '').trim();
    if (!email) return 'Usuário';
    return email.split('@')[0] || 'Usuário';
  }, [currentUser]);

  const companyDisplayName = useMemo(() => {
    const user = currentUser as any;
    return String(
      user?.sector?.branch?.company?.tradeName
      || user?.sector?.branch?.company?.legalName
      || user?.company?.tradeName
      || user?.company?.legalName
      || user?.branch?.company?.tradeName
      || user?.branch?.company?.legalName
      || user?.sector?.branch?.tradeName
      || user?.branch?.tradeName
      || '',
    ).trim();
  }, [currentUser]);

  const resolvedPageContext = contextLabel || pageContext;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener('auth:changed', refreshUser);
    window.addEventListener('auth:user-updated', refreshUser as EventListener);
    window.addEventListener('storage', refreshUser);
    return () => {
      window.removeEventListener('auth:changed', refreshUser);
      window.removeEventListener('auth:user-updated', refreshUser as EventListener);
      window.removeEventListener('storage', refreshUser);
    };
  }, []);

  return (
    <Box
      className="saudy-header"
      data-color-scheme={colorScheme}
    >
      <Group className="saudy-header__inner" justify="space-between" wrap="nowrap">
        <Group gap={isMobile ? 'xs' : 'md'} wrap="nowrap" style={{ minWidth: 0 }}>
          {isMobile ? (
            <ActionIcon
              className="saudy-header__menu-trigger"
              variant="subtle"
              size={42}
              onClick={() => window.dispatchEvent(new Event('saudy:sidebar-toggle'))}
              aria-label="Abrir menu principal"
            >
              <Menu size={21} strokeWidth={2.1} />
            </ActionIcon>
          ) : null}

          <Group
            className="saudy-header__brand"
            onClick={() => navigate(homeRoute)}
            gap="sm"
            wrap="nowrap"
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            <Box className="saudy-header__brand-mark">
              <img src="/logo.png" alt="Saudy" />
            </Box>
            <Box className="saudy-header__brand-copy">
              <Text fw={700} size="sm">Saudy Gestão</Text>
              <Text size="xs">Operação clínica</Text>
            </Box>
          </Group>

          {back ? (
            <Button
              className="saudy-header__back"
              variant="default"
              size="sm"
              leftSection={<ChevronLeft size={16} aria-hidden="true" />}
              onClick={back.onClick}
              aria-label={back.label || 'Voltar'}
            >
              {back.label || 'Voltar'}
            </Button>
          ) : null}

          <Box className="saudy-header__context" aria-label={`Tela atual: ${resolvedPageContext}`}>
            <Text size="xs">PAINEL DE GESTÃO</Text>
            <Text fw={600} size="sm">{resolvedPageContext}</Text>
          </Box>
        </Group>

        <Group className="saudy-header__actions" gap={isMobile ? 'xs' : 'md'} wrap="nowrap">
          {!isMobile ? (
            <Box className="saudy-header__clock" ta="right">
              <Text size="sm" fw={650}>{timeStr}</Text>
              <Text size="xs">{dateStr}</Text>
            </Box>
          ) : null}

          <Box className="saudy-header__user-summary" ta="right" maw={260}>
            <Text size="sm" fw={600} truncate>{userDisplayName}</Text>
            <Text size="xs" truncate title={companyDisplayName || undefined}>
              {companyDisplayName || 'Acesso interno'}
            </Text>
          </Box>

          <Box className="saudy-header__divider" aria-hidden="true" />
          <UserMenu />
          <ActionIcon
            className="saudy-header__logout"
            variant="subtle"
            size={42}
            onClick={() => {
              authService.logout();
              window.location.href = '/login';
            }}
            aria-label="Sair do sistema"
          >
            <LogOut size={18} strokeWidth={2} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}
