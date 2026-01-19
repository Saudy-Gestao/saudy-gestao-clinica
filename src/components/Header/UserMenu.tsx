import { Menu, Avatar, Group, UnstyledButton } from '@mantine/core';
import { User, Settings, LogOut } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

export function UserMenu() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

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
          <Menu.Divider />
          <Menu.Item color="red" icon={<LogOut size={16} />} onClick={handleLogout}>
            Sair
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
  );
}

export default UserMenu;