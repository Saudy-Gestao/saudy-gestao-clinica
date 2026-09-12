import { useEffect, useState } from 'react';
import { Menu, Avatar, Group, UnstyledButton, Switch, Badge, Modal, Stack, Text, PasswordInput, Button, Alert, Box } from '@/components/ui';
import { User, Settings, Moon, Sun, LifeBuoy, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { notifications } from '@/components/ui';
import { useMyTicketsQuery } from '../../hooks/useMyTicketsQuery';
import { useCurrentUserProfileQuery } from '../../hooks/useCurrentUserProfileQuery';
import authService from '../../services/authService';
import userService from '../../services/userService';
import { hasModuleAccess, isAdminUser } from '../../utils/userRole';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { APP_COLOR_SCHEME_EVENT, applyAppColorScheme, getAppColorScheme, type AppColorScheme } from '../../utils/appColorScheme';
import { OPEN_RELEASE_NOTES_EVENT } from '../common/ReleaseNotesModal';

export function UserMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const [colorScheme, setColorScheme] = useState<AppColorScheme>(getAppColorScheme);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isDark = colorScheme === 'dark';
  const isAdmHubScreen = location.pathname === '/adm-hub';
  const { data: myTicketsData } = useMyTicketsQuery();
  const { data: profileUser } = useCurrentUserProfileQuery();
  const unreadCount = Number(myTicketsData?.unreadCount || 0);
  const currentUser = authService.getCurrentUser() as any;
  const effectiveUser = profileUser || currentUser;
  const adminView = isAdminUser(effectiveUser) || hasModuleAccess(effectiveUser, 'configuracoes');
  const accountName = String(effectiveUser?.name || effectiveUser?.email?.split('@')[0] || 'Usuário').trim();
  const accountEmail = String(effectiveUser?.email || 'Acesso interno').trim();

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

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleteLoading(true);
    try {
      await userService.deleteMyAccount(deletePassword);
      notifications.show({ title: 'Conta excluída', message: 'Sua conta foi excluída permanentemente.', color: 'green' });
      authService.logout();
      navigate('/login');
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Não foi possível excluir a conta.'),
        color: 'red',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
    <Modal
      opened={deleteModalOpen}
      onClose={() => { setDeleteModalOpen(false); setDeletePassword(''); }}
      title={
        <Group gap="xs">
          <AlertTriangle size={18} color="var(--ui-hue-red)" />
          <Text fw={700} c="red">Excluir minha conta permanentemente</Text>
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        <Alert color="red" variant="filled" icon={<AlertTriangle size={16} />}>
          <Text fw={700} size="sm">Esta ação não pode ser desfeita.</Text>
          <Text size="sm" mt={4}>
            Ao confirmar, sua conta será excluída permanentemente e não haverá como recuperá-la.
          </Text>
        </Alert>
        <Box style={{ background: 'color-mix(in srgb, var(--ui-hue-red) 12%, var(--ui-surface))', borderRadius: 8, padding: '12px 14px' }}>
          <Text size="sm" fw={600} c="var(--ui-hue-red)" mb={4}>O que será excluído:</Text>
          <Stack gap={2}>
            <Text size="sm">• Seu acesso ao sistema</Text>
            <Text size="sm">• Todas as suas informações de perfil</Text>
            <Text size="sm">• Suas configurações e preferências</Text>
          </Stack>
        </Box>
        <PasswordInput
          label="Confirme sua senha para continuar"
          placeholder="Digite sua senha"
          value={deletePassword}
          onChange={(e) => { const v = e.currentTarget.value; setDeletePassword(v); }}
          autoFocus
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => { setDeleteModalOpen(false); setDeletePassword(''); }} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button color="red" onClick={handleDeleteAccount} loading={deleteLoading} disabled={!deletePassword} leftSection={<Trash2 size={14} />}>
            Sim, excluir permanentemente
          </Button>
        </Group>
      </Stack>
    </Modal>
    <Menu shadow="md" position="bottom-end" opened={opened} onChange={setOpened}>
      <div className="saudy-account-menu-anchor">
        <Menu.Target>
          <UnstyledButton aria-label="Abrir menu da conta">
            <Group>
              <Avatar color="blue" radius="xl" size={38}>
                <User size={16} />
              </Avatar>
            </Group>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown className="saudy-account-menu">
        <div className="saudy-account-menu__identity">
          <Avatar className="saudy-account-menu__avatar" color="blue" radius="xl" size={42}>
            <User size={18} />
          </Avatar>
          <div className="saudy-account-menu__identity-copy">
            <span className="saudy-account-menu__identity-kicker">Conta ativa</span>
            <strong title={accountName}>{accountName}</strong>
            <small title={accountEmail}>{accountEmail}</small>
          </div>
        </div>
        <Menu.Label className="saudy-account-menu__label">Acesso e preferências</Menu.Label>
        {!isAdmHubScreen && adminView && (
          <Menu.Item leftSection={<Settings size={16} />} onClick={() => navigateAfterMenuClose('/settings')}>
            Configurações
          </Menu.Item>
        )}
        {!isAdmHubScreen && (
          <Menu.Item
            leftSection={<LifeBuoy size={16} />}
            onClick={() => navigateAfterMenuClose('/meus-chamados')}
            rightSection={unreadCount > 0 ? <Badge color="red" size="xs">{unreadCount}</Badge> : null}
          >
            Meus Chamados
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<Sparkles size={16} />}
          onClick={() => {
            setOpened(false);
            window.dispatchEvent(new Event(OPEN_RELEASE_NOTES_EVENT));
          }}
        >
          Novidades da versão
        </Menu.Item>
        <Menu.Item
          className="saudy-account-menu__theme-item"
          leftSection={isDark ? <Moon size={16} /> : <Sun size={16} />}
          closeMenuOnClick={false}
          rightSection={
            <Switch
              className="saudy-account-menu__switch"
              size="xs"
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
        <Menu.Divider className="saudy-account-menu__divider" />
        <Menu.Item
          className="saudy-account-menu__danger"
          leftSection={<Trash2 size={16} />}
          color="red"
          onClick={() => { setOpened(false); setDeleteModalOpen(true); }}
        >
          Excluir minha conta
        </Menu.Item>
        </Menu.Dropdown>
      </div>
    </Menu>
    </>
  );
}

export default UserMenu;
