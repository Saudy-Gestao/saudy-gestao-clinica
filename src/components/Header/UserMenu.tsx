import { Menu, Avatar, Group, UnstyledButton } from '@mantine/core';
import { User, Settings, LogOut } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

export function UserMenu() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
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
        </Menu.Dropdown>
      </Menu>
  );
}

export default UserMenu;