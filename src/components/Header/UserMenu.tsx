import { useState } from 'react';
import { Menu, Avatar, Group, UnstyledButton, Switch, Badge } from '@mantine/core';
import { User, Settings, Moon, Sun, LifeBuoy } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useLocalStorage } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useMyTicketsQuery } from '../../hooks/useMyTicketsQuery';
import authService from '../../services/authService';
import { isDoctorUser } from '../../utils/userRole';

export function UserMenu() {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [colorScheme, setColorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });

  const isDark = colorScheme === 'dark';
  const { data: myTicketsData } = useMyTicketsQuery();
  const unreadCount = Number(myTicketsData?.unreadCount || 0);
  const currentUser = authService.getCurrentUser() as any;
  const doctorView = isDoctorUser(currentUser);

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
        <Menu.Item
          icon={<User size={16} />}
          onClick={() => notifications.show({ title: 'Perfil', message: 'Funcionalidade de perfil em breve.' })}
        >
          Perfil
        </Menu.Item>
        {!doctorView ? (
          <Menu.Item icon={<Settings size={16} />} onClick={() => navigateAfterMenuClose('/settings')}>
            Configuracoes
          </Menu.Item>
        ) : null}
        <Menu.Item
          icon={<LifeBuoy size={16} />}
          onClick={() => navigateAfterMenuClose('/meus-chamados')}
          rightSection={unreadCount > 0 ? <Badge color="red" size="xs">{unreadCount}</Badge> : null}
        >
          Meus Chamados
        </Menu.Item>
        <Menu.Item
          icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
          closeMenuOnClick={false}
          rightSection={
            <Switch
              size="sm"
              checked={isDark}
              onLabel={<Moon size={12} />}
              offLabel={<Sun size={12} />}
              onChange={(event) => setColorScheme(event.currentTarget.checked ? 'dark' : 'light')}
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
