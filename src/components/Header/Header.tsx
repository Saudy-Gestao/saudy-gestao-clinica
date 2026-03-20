import { Box, Group, Text, ActionIcon, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { LogOut, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  { key: 'pre-atendimento', label: 'Pré-atendimento', route: '/pre-atendimento', prefixes: ['/pre-atendimento'] },
  { key: 'agendamento', label: 'Agendamento', route: '/agendamento', prefixes: ['/agendamento'] },
  { key: 'anamnese', label: 'Anamnese', route: '/anamnese', prefixes: ['/anamnese'] },
  { key: 'enfermagem', label: 'Enfermagem', route: '/enfermagem', prefixes: ['/enfermagem'] },
  { key: 'consulta', label: 'Consulta', route: '/consulta', prefixes: ['/consulta'] },
  { key: 'laudo', label: 'Laudo', route: '/laudo', prefixes: ['/laudo'] },
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
];

const resolveModuleByPath = (pathname: string): ModuleDefinition | null => {
  if (!pathname || pathname === '/dashboard') return null;
  return MODULES.find((item) => item.prefixes.some((prefix) => pathname.startsWith(prefix))) || null;
};

export function Header() {
  const isMobile = useMediaQuery('(max-width: 799px)');
  const navigate = useNavigate();
  const location = useLocation();
  const lastTrackedPathRef = useRef<string>('');
  const [quickModules, setQuickModules] = useState<ModuleUsageItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(() => authService.getCurrentUser());
  const userKey = useMemo(
    () => String((currentUser as any)?.id || (currentUser as any)?.email || 'anonymous'),
    [currentUser],
  );
  const unitLabel = useMemo(() => {
    const branch = (currentUser as any)?.branch || (currentUser as any)?.sector?.branch;
    return String(branch?.tradeName || branch?.name || 'Unidade não definida');
  }, [currentUser]);
  const usageStorageKey = `saudy:module-usage:v1:${userKey}`;

  const currentTime = new Date();
  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day = currentTime.getDate().toString().padStart(2, '0');
  const month = currentTime.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  const year = currentTime.getFullYear();
  const dateStr = `${day} de ${month}, ${year}`;

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
      // Ignora falha de storage sem quebrar o header.
    }
  }, [location.pathname, usageStorageKey]);

  return (
    <Box bg={DARK_BLUE} c="white" py="md" px="xl">
      <Group justify="space-between" wrap="nowrap">
        <Group
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <Box bg="white" w={40} h={40} style={{ borderRadius: 8, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <img src="/logo.png" alt="Saudy" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          </Box>
          <Text fw={500} size="lg">Saudy</Text>
        </Group>

        {!isMobile && quickModules.length > 0 && (
          <Group
            gap={10}
            style={{
              flex: 1,
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 999,
              padding: '6px 10px',
            }}
            wrap="nowrap"
          >
            <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
              <Sparkles size={14} color="rgba(255,255,255,0.92)" />
              <Text size="xs" fw={600} c="rgba(255,255,255,0.92)">
                Mais usados
              </Text>
            </Group>
            {quickModules.map((module) => (
              <Button
                key={module.key}
                size="compact-xs"
                variant="subtle"
                onClick={() => navigate(module.route)}
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  maxWidth: 170,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  transition: 'all 120ms ease',
                }}
              >
                {module.label}
              </Button>
            ))}
          </Group>
        )}

        <Group gap="xl">
          {!isMobile && (
            <Box ta="right">
              <Text size="sm">{timeStr} | {dateStr}</Text>
              <Text size="xs" c="rgba(255,255,255,0.82)">Unidade: {unitLabel}</Text>
            </Box>
          )}
          <Group gap="xs" align="center">
            <UserMenu />
            <Text c="white" size="xs">|</Text>
            <ActionIcon
              variant="subtle"
              color="white"
              size="sm"
              onClick={() => {
                authService.logout();
                window.location.href = '/login';
              }}
            >
              <LogOut size={16} color="white" />
            </ActionIcon>
          </Group>
        </Group>
      </Group>
    </Box>
  );
}
