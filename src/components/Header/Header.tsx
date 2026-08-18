import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  Group,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserMenu from './UserMenu';
import authService from '../../services/authService';
import { DARK_BLUE } from '../../themes/theme';

export function Header() {
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const headerBg = colorScheme === 'dark' ? '#05070f' : DARK_BLUE;
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(() => authService.getCurrentUser());
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

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
      bg={headerBg}
      c="white"
      px={isMobile ? 'md' : 'xl'}
      py={isMobile ? 8 : 10}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
    >
      <Group justify="space-between" wrap="nowrap" gap={isMobile ? 'sm' : 'xl'}>
        <Group className="saudy-header-brand" onClick={() => navigate(homeRoute)} style={{ cursor: 'pointer', flexShrink: 0 }} gap="sm">
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

        <Group gap={isMobile ? 'xs' : 'xl'} style={{ flexShrink: 0, marginLeft: 'auto' }}>
          {!isMobile ? (
            <Box ta="right" maw={320}>
              <Text size="md" fw={500}>{timeStr} | {dateStr}</Text>
              <Text
                size="xs"
                c="rgba(255,255,255,0.78)"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={companyDisplayName ? `${userDisplayName} | ${companyDisplayName}` : userDisplayName}
              >
                {companyDisplayName ? `${userDisplayName} | ${companyDisplayName}` : userDisplayName}
              </Text>
            </Box>
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
