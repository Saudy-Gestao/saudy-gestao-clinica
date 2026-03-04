import { Menu, Avatar, Group, UnstyledButton, Switch } from '@mantine/core';
import { User, Settings, Moon, Sun } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useLocalStorage } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';

export function UserMenu() {
  const navigate = useNavigate();
  const [colorScheme, setColorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });

  const isDark = colorScheme === 'dark';

  return (
    <Menu shadow="md" position="bottom-end">
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
          <Menu.Item icon={<User size={16} />} onClick={() => notifications.show({ title: 'Perfil', message: 'Funcionalidade de perfil em breve.' })}>
            Perfil
          </Menu.Item>
          <Menu.Item icon={<Settings size={16} />} onClick={() => navigate('/settings')}>
            Configurações
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