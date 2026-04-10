import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack,
  TextInput,
  Button,
  Switch,
  Group,
  Divider,
  Text,
  Collapse,
  ActionIcon,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceFloppy,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { resolveApiErrorMessage } from '../../lib/apiError';
import whatsappService from '../../services/whatsappService';
import { useWhatsAppConfigQuery } from '../../hooks/useWhatsAppConfigQuery';
import { queryKeys } from '../../lib/queryKeys';

interface ConfigFormValues {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  appId: string;
  isActive: boolean;
}

const maskValue = (value: string): string => {
  if (!value || value.length <= 4) return value;
  const last4 = value.slice(-4);
  const masked = '*'.repeat(value.length - 4);
  return masked + last4;
};

export function WhatsAppCredentials() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const { data: config, error } = useWhatsAppConfigQuery();

  const [configForm, setConfigForm] = useState<ConfigFormValues>({
    accountSid: '',
    authToken: '',
    fromNumber: '',
    appId: '',
    isActive: true,
  });

  const [displayValues, setDisplayValues] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: '',
    appId: '',
  });

  useEffect(() => {
    if (!config) {
      setHasExistingConfig(false);
      return;
    }

    const hasAuthToken = config.authToken && config.authToken.startsWith('***');
    setHasExistingConfig(!!config.id);
    setConfigForm({
      accountSid: config.accountSid,
      authToken: hasAuthToken ? '' : (config.authToken || ''),
      fromNumber: config.fromNumber,
      appId: config.appId || '',
      isActive: config.isActive,
    });
    setDisplayValues({
      accountSid: maskValue(config.accountSid),
      authToken: maskValue(config.authToken || ''),
      fromNumber: maskValue(config.fromNumber),
      appId: maskValue(config.appId || ''),
    });
  }, [config]);

  useEffect(() => {
    if (!error) return;
    const err: any = error;
    notifications.show({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar configurações'),
      color: 'red',
    });
  }, [error]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await whatsappService.saveConfig(configForm);
      notifications.show({
        title: 'Sucesso',
        message: 'Configuração salva com sucesso',
        color: 'green',
      });
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConfig });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao salvar configuração'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setExpanded(true);
  };

  const handleCancel = () => {
    setEditing(false);
    if (!config) return;
    const hasAuthToken = config.authToken && config.authToken.startsWith('***');
    setConfigForm({
      accountSid: config.accountSid,
      authToken: hasAuthToken ? '' : (config.authToken || ''),
      fromNumber: config.fromNumber,
      appId: config.appId || '',
      isActive: config.isActive,
    });
  };

  return (
    <>
      <Box>
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>Credenciais Gupshup</Text>
          <Group gap="xs">
            {!editing && hasExistingConfig && (
              <Button size="xs" variant="light" onClick={handleEdit}>
                Editar
              </Button>
            )}
            <ActionIcon
              variant="subtle"
              onClick={() => setExpanded(!expanded)}
              size="sm"
            >
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
        </Group>

        {!expanded && hasExistingConfig && !editing && (
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="xs" c="dimmed">API Key:</Text>
              <Text size="xs">{displayValues.accountSid}</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">App Name:</Text>
              <Text size="xs">{displayValues.authToken}</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Número:</Text>
              <Text size="xs">{displayValues.fromNumber}</Text>
            </Group>
            {displayValues.appId && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">App ID:</Text>
                <Text size="xs">{displayValues.appId}</Text>
              </Group>
            )}
          </Stack>
        )}

        <Collapse in={expanded}>
          <form onSubmit={handleSaveConfig}>
            <Stack gap="md" mt="md">
              <TextInput
                label="API Key"
                placeholder="Ex: abc123xyz..."
                required
                value={configForm.accountSid}
                onChange={(e) => setConfigForm(prev => ({ ...prev, accountSid: e.target.value }))}
                disabled={!editing && hasExistingConfig}
              />

              <TextInput
                label="App Name"
                placeholder={hasExistingConfig ? "Deixe vazio para manter o atual" : "Digite o nome do seu app no Gupshup"}
                description={hasExistingConfig ? "App Name atual configurado. Preencha apenas se quiser alterar." : undefined}
                required={!hasExistingConfig}
                type="password"
                value={configForm.authToken}
                onChange={(e) => setConfigForm(prev => ({ ...prev, authToken: e.target.value }))}
                disabled={!editing && hasExistingConfig}
              />

              <TextInput
                label="Número de Origem (WhatsApp)"
                placeholder="Ex: 5511999999999"
                description="Número WhatsApp Business no formato: 5511999999999 (somente números, sem +)"
                required
                value={configForm.fromNumber}
                onChange={(e) => setConfigForm(prev => ({ ...prev, fromNumber: e.target.value }))}
                disabled={!editing && hasExistingConfig}
              />

              <TextInput
                label="App ID (Gupshup)"
                placeholder="Ex: c0e21bb7-6e0d-4e2a-a0da-dcf67af1bab5"
                description="UUID do seu app no Gupshup — necessário para sincronizar status de templates HSM aprovados"
                value={configForm.appId}
                onChange={(e) => setConfigForm(prev => ({ ...prev, appId: e.target.value }))}
                disabled={!editing && hasExistingConfig}
              />

              <Switch
                label="Ativo"
                description="Quando desativado, nenhuma mensagem será enviada"
                checked={configForm.isActive}
                onChange={(e) => setConfigForm(prev => ({ ...prev, isActive: e.target.checked }))}
                disabled={!editing && hasExistingConfig}
              />

              {(editing || !hasExistingConfig) && (
                <>
                  <Divider my="md" />

                  <Group>
                    <Button
                      type="submit"
                      leftSection={<IconDeviceFloppy size={16} />}
                      loading={loading}
                    >
                      Salvar Configuração
                    </Button>
                    {editing && (
                      <Button
                        variant="light"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    )}
                  </Group>
                </>
              )}
            </Stack>
          </form>
        </Collapse>
      </Box>
    </>
  );
}
