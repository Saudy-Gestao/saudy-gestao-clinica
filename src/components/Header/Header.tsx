import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Box,
  Group,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { LogOut, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserMenu from './UserMenu';
import authService from '../../services/authService';
import { DARK_BLUE } from '../../themes/theme';

type ModuleUsageItem = {
  key: string;
  label: string;
  route: string;
};

type ModuleDefinition = ModuleUsageItem & {
  prefixes: string[];
};

const MODULES: ModuleDefinition[] = [
  { key: 'adm-hub', label: 'ADM Hub', route: '/adm-hub', prefixes: ['/adm-hub'] },
  { key: 'adm-leads', label: 'Possíveis Clientes', route: '/possiveis-clientes', prefixes: ['/possiveis-clientes'] },
  { key: 'adm-clientes', label: 'Cadastro de Cliente', route: '/cadastro-cliente', prefixes: ['/cadastro-cliente'] },
  { key: 'adm-clientes-edicao', label: 'Gestão de Clientes', route: '/adm-clientes', prefixes: ['/adm-clientes'] },
  { key: 'adm-tickets', label: 'Chamados', route: '/adm-tickets', prefixes: ['/adm-tickets'] },
  { key: 'pre-atendimento', label: 'Autorização e Recepção', route: '/autorizacao-e-recepcao', prefixes: ['/autorizacao-e-recepcao'] },
  { key: 'agendamento', label: 'Agendamento', route: '/agendamento', prefixes: ['/agendamento'] },
  { key: 'pre-agendamento', label: 'Pré-atendimento', route: '/pre-atendimento', prefixes: ['/pre-atendimento', '/pre-agendamento'] },
  { key: 'consulta', label: 'Consulta', route: '/consulta', prefixes: ['/consulta'] },
  { key: 'teleconsulta-preparacao', label: 'Teleconsulta', route: '/teleconsulta/preparacao', prefixes: ['/teleconsulta'] },
  { key: 'execucao-exames', label: 'Execução de Exames', route: '/execucao-exames', prefixes: ['/execucao-exames'] },
  { key: 'laudo', label: 'Laudo', route: '/laudo-exames', prefixes: ['/laudo'] },
  { key: 'autorizacao-convenio', label: 'Autorização Convênio', route: '/autorizacao-convenio', prefixes: ['/autorizacao-convenio'] },
  { key: 'modulo-tea', label: 'Módulo TEA', route: '/tea', prefixes: ['/tea'] },
  { key: 'entrega', label: 'Entrega', route: '/entrega', prefixes: ['/entrega'] },
  { key: 'estoque', label: 'Estoque', route: '/estoque', prefixes: ['/estoque'] },
  { key: 'financeiro', label: 'Financeiro', route: '/financeiro', prefixes: ['/financeiro'] },
  { key: 'faturamento', label: 'Faturamento', route: '/faturamento', prefixes: ['/faturamento'] },
  { key: 'cadastro-medico', label: 'Cadastro de Médico', route: '/cadastro-medico', prefixes: ['/cadastro-medico'] },
  { key: 'cadastro-procedimento', label: 'Cadastro de Procedimentos', route: '/cadastro-procedimento', prefixes: ['/cadastro-procedimento'] },
  { key: 'cadastro-convenio', label: 'Cadastro de Convênio', route: '/cadastro-convenio', prefixes: ['/cadastro-convenio'] },
  { key: 'cadastro-paciente', label: 'Cadastro de Paciente', route: '/cadastro-paciente', prefixes: ['/cadastro-paciente'] },
  { key: 'cadastro-sala', label: 'Cadastro de Salas', route: '/cadastro-sala', prefixes: ['/cadastro-sala'] },
  { key: 'cadastro-equipamento', label: 'Cadastro de Equipamentos', route: '/cadastro-equipamento', prefixes: ['/cadastro-equipamento'] },
  { key: 'cadastro-anamnese', label: 'Cadastro de Anamnese', route: '/cadastro-anamnese', prefixes: ['/cadastro-anamnese'] },
  { key: 'cadastro-enfermagem', label: 'Cadastro de Enfermagem', route: '/cadastro-enfermagem', prefixes: ['/cadastro-enfermagem'] },
  { key: 'meus-chamados', label: 'Meus Chamados', route: '/meus-chamados', prefixes: ['/meus-chamados'] },
  { key: 'conversas', label: 'Conversas', route: '/conversas', prefixes: ['/conversas'] },
];

const DEFAULT_QUICK_MODULE_KEYS = ['modulo-tea', 'agendamento', 'laudo', 'pre-agendamento', 'consulta'];

const resolveModuleByPath = (pathname: string): ModuleDefinition | null => {
  if (!pathname || pathname === '/dashboard') return null;
  return MODULES.find((item) => item.prefixes.some((prefix) => pathname.startsWith(prefix))) || null;
};

const toSearchToken = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function Header() {
  const isMobile = useMediaQuery('(max-width: 799px)');
  const navigate = useNavigate();
  const location = useLocation();
  const lastTrackedPathRef = useRef<string>('');

  const [quickModules, setQuickModules] = useState<ModuleUsageItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(() => authService.getCurrentUser());
  const [searchText, setSearchText] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const userKey = useMemo(
    () => String((currentUser as any)?.id || (currentUser as any)?.email || 'anonymous'),
    [currentUser],
  );
  const isAdmHubOnly = Boolean((currentUser as any)?.isAdmHubOnly);
  const homeRoute = isAdmHubOnly ? '/adm-hub' : '/dashboard';
  const usageStorageKey = `saudy:module-usage:v1:${userKey}`;

  const quickLinks = useMemo(() => {
    if (quickModules.length > 0) return quickModules;
    return DEFAULT_QUICK_MODULE_KEYS
      .map((key) => MODULES.find((item) => item.key === key))
      .filter(Boolean)
      .map((item) => ({ key: item!.key, label: item!.label, route: item!.route }));
  }, [quickModules]);

  const timeStr = useMemo(() => {
    return currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const dateStr = useMemo(() => {
    const day = currentTime.getDate().toString().padStart(2, '0');
    const month = currentTime.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase());
    const year = currentTime.getFullYear();
    return `${day} de ${month}, ${year}`;
  }, [currentTime]);

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

  useEffect(() => {
    const readTopModules = () => {
      try {
        const raw = localStorage.getItem(usageStorageKey);
        const usage = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        const ranked = Object.entries(usage)
          .filter(([, count]) => Number.isFinite(Number(count)) && Number(count) > 0)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 5)
          .map(([moduleKey]) => MODULES.find((item) => item.key === moduleKey))
          .filter(Boolean) as ModuleDefinition[];
        setQuickModules(ranked.map((item) => ({ key: item.key, label: item.label, route: item.route })));
      } catch {
        setQuickModules([]);
      }
    };

    readTopModules();
  }, [usageStorageKey]);

  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname || pathname === lastTrackedPathRef.current) return;
    lastTrackedPathRef.current = pathname;

    const resolved = resolveModuleByPath(pathname);
    if (!resolved) return;

    try {
      const raw = localStorage.getItem(usageStorageKey);
      const usage = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      usage[resolved.key] = Number(usage[resolved.key] || 0) + 1;
      localStorage.setItem(usageStorageKey, JSON.stringify(usage));

      const ranked = Object.entries(usage)
        .filter(([, count]) => Number.isFinite(Number(count)) && Number(count) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 5)
        .map(([moduleKey]) => MODULES.find((item) => item.key === moduleKey))
        .filter(Boolean) as ModuleDefinition[];
      setQuickModules(ranked.map((item) => ({ key: item.key, label: item.label, route: item.route })));
    } catch {
      // Ignora falha de localStorage.
    }
  }, [location.pathname, usageStorageKey]);

  const executeSearch = () => {
    const term = searchText.trim();
    if (!term) return;

    if (term.startsWith('/')) {
      navigate(term);
      return;
    }

    const normalizedTerm = toSearchToken(term);
    const matched = MODULES.find((item) => {
      const label = toSearchToken(item.label);
      const route = toSearchToken(item.route);
      const key = toSearchToken(item.key);
      return label.includes(normalizedTerm) || route.includes(normalizedTerm) || key.includes(normalizedTerm);
    });

    if (matched) {
      navigate(matched.route);
      return;
    }

    const fallbackPath = term.startsWith('/') ? term : `/${term}`;
    navigate(fallbackPath);
  };

  return (
    <Box
      bg={DARK_BLUE}
      c="white"
      px={isMobile ? 'md' : 'xl'}
      py={isMobile ? 8 : 10}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
    >
      <Group justify="space-between" wrap="nowrap" gap={isMobile ? 'sm' : 'xl'}>
        <Group onClick={() => navigate(homeRoute)} style={{ cursor: 'pointer', flexShrink: 0 }} gap="sm">
          <Box
            bg="white"
            w={44}
            h={44}
            style={{ borderRadius: 10, display: 'grid', placeItems: 'center', overflow: 'hidden' }}
          >
            <img src="/logo.png" alt="Saudy" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </Box>
          {!isMobile ? <Text fw={500} size="lg">Saudy</Text> : null}
        </Group>

        {!isMobile ? (
          <Box style={{ flex: 1, minWidth: 240, maxWidth: 680 }}>
            <TextInput
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  executeSearch();
                }
              }}
              placeholder="Pesquisar palavra-chave + caminho"
              leftSection={<Search size={18} />}
              styles={{
                input: {
                  height: 38,
                  borderRadius: 999,
                  border: '1px solid rgba(148, 177, 255, 0.65)',
                  background: 'rgba(5, 29, 93, 0.35)',
                  color: '#f4f7ff',
                  fontSize: 16,
                },
                section: {
                  color: '#8baeff',
                },
              }}
            />

            <Group gap="md" mt={6} px="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
              {quickLinks.map((module) => (
                <Anchor
                  key={module.key}
                  component="button"
                  type="button"
                  c="rgba(129,160,238,0.88)"
                  fz={14}
                  fw={500}
                  underline="never"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => navigate(module.route)}
                >
                  {module.label}
                </Anchor>
              ))}
            </Group>
          </Box>
        ) : null}

        <Group gap={isMobile ? 'xs' : 'xl'} style={{ flexShrink: 0 }}>
          {!isMobile ? (
            <Text size="md" fw={500}>{timeStr} | {dateStr}</Text>
          ) : null}

          <Group gap="xs" align="center">
            <UserMenu />
            <Text c="white" size="md">|</Text>
            <ActionIcon
              variant="subtle"
              color="white"
              size="md"
              onClick={() => {
                authService.logout();
                window.location.href = '/login';
              }}
            >
              <LogOut size={18} color="white" />
            </ActionIcon>
          </Group>
        </Group>
      </Group>
    </Box>
  );
}
