import { useEffect, useState } from 'react';
import { Menu, Avatar, Group, UnstyledButton, Switch, Badge } from '@mantine/core';
import { User, Settings, Moon, Sun, LifeBuoy } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMyTicketsQuery } from '../../hooks/useMyTicketsQuery';
import authService from '../../services/authService';
import { isDoctorUser } from '../../utils/userRole';
import { APP_COLOR_SCHEME_EVENT, applyAppColorScheme, getAppColorScheme, type AppColorScheme } from '../../utils/appColorScheme';

export function UserMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const [colorScheme, setColorScheme] = useState<AppColorScheme>(getAppColorScheme);

  const isDark = colorScheme === 'dark';
  const isAdmHubScreen = location.pathname === '/adm-hub';
  const isDashboardScreen = location.pathname === '/dashboard';
  const { data: myTicketsData } = useMyTicketsQuery();
  const unreadCount = Number(myTicketsData?.unreadCount || 0);
  const currentUser = authService.getCurrentUser() as any;
  const doctorView = isDoctorUser(currentUser);

  useEffect(() => {
    const syncColorScheme = () => {
      setColorScheme(getAppColorScheme());
    };

    window.addEventListener(APP_COLOR_SCHEME_EVENT, syncColorScheme as EventListener);
    window.addEventListener('storage', syncColorScheme);

    return () => {
      window.removeEventListener(APP_COLOR_SCHEME_EVENT, syncColorScheme as EventListener);
      window.removeEventListener('storage', syncColorScheme);
    };
  }, []);

  const navigateAfterMenuClose = (path: string) => {
    setOpened(false);
    window.setTimeout(() => navigate(path), 0);
  };

  return (
    <Menu shadow="md" position="bottom-end" opened={opened} onChange={setOpened}>
      <Menu.Target>
        <UnstyledButton>
          <Group>
            <Avatar color="blue" radius="xl">
              <User size={16} />
            </Avatar>
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {!isAdmHubScreen && !isDashboardScreen && (
          <Menu.Item
            icon={<User size={16} />}
            onClick={() => notifications.show({ title: 'Perfil', message: 'Funcionalidade de perfil em breve.' })}
          >
            Perfil
          </Menu.Item>
        )}
        {!isAdmHubScreen && !doctorView && (
          <Menu.Item icon={<Settings size={16} />} onClick={() => navigateAfterMenuClose('/settings')}>
            Configuracoes
          </Menu.Item>
        )}
        {!isAdmHubScreen && (
          <Menu.Item
            icon={<LifeBuoy size={16} />}
            onClick={() => navigateAfterMenuClose('/meus-chamados')}
            rightSection={unreadCount > 0 ? <Badge color="red" size="xs">{unreadCount}</Badge> : null}
          >
            Meus Chamados
          </Menu.Item>
        )}
        <Menu.Item
          icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
          closeMenuOnClick={false}
          rightSection={
            <Switch
              size="sm"
              checked={isDark}
              onLabel={<Moon size={12} />}
              offLabel={<Sun size={12} />}
              onChange={(event) => applyAppColorScheme(event.currentTarget.checked ? 'dark' : 'light')}
              onClick={(event) => event.stopPropagation()}
              aria-label="Alternar tema"
            />
          }
        >
          Modo escuro
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default UserMenu;
