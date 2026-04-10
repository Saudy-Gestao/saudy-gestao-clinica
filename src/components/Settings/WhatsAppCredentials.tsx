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
  Paper,
  Badge,
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
import type { WhatsAppConfigScope } from '../../services/whatsappService';

interface ConfigFormValues {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  appId: string;
  isActive: boolean;
}

interface WhatsAppCredentialsProps {
  scope?: WhatsAppConfigScope;
  branchId?: string | null;
}

const maskValue = (value: string): string => {
  if (!value || value.length <= 4) return value;
  const last4 = value.slice(-4);
  const masked = '*'.repeat(value.length - 4);
  return masked + last4;
};

export function WhatsAppCredentials({
  scope = 'BRANCH',
  branchId = null,
}: WhatsAppCredentialsProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [useBranchOverride, setUseBranchOverride] = useState(scope === 'COMPANY');
  const isBranchScope = scope === 'BRANCH';
  const canQuery = scope === 'COMPANY' || Boolean(branchId);
  const { data: config, error } = useWhatsAppConfigQuery({
    scope,
    branchId: branchId || undefined,
  });

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
    if (!canQuery) {
      setHasExistingConfig(false);
      return;
    }
    if (!config) {
      setHasExistingConfig(false);
      if (isBranchScope) setUseBranchOverride(false);
      return;
    }

    const hasAuthToken = config.authToken && config.authToken.startsWith('***');
    setHasExistingConfig(!!config.id);
    if (isBranchScope) {
      setUseBranchOverride((current) => {
        if (typeof config.inheritFromCompany === 'boolean') {
          return !config.inheritFromCompany;
        }
        if (config.sourceScope === 'COMPANY') return false;
        if (config.sourceScope === 'BRANCH') return true;
        // Backward compatibility: when backend does not return explicit
        // inheritance metadata, keep the current UI choice.
        return current;
      });
    }
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
  }, [canQuery, config, isBranchScope]);

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
    if (!canQuery) return;
    setLoading(true);
    try {
      await whatsappService.saveConfig(configForm, {
        scope,
        branchId: branchId || undefined,
        inheritFromCompany: isBranchScope ? !useBranchOverride : false,
      });
      notifications.show({
        title: 'Sucesso',
        message: isBranchScope
          ? (useBranchOverride
            ? 'Sobrescrita da filial salva com sucesso'
            : 'Filial configurada para herdar os dados da empresa')
          : 'Configuração padrão da empresa salva com sucesso',
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
    if (isBranchScope) setUseBranchOverride(true);
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
                {isBranchScope ? 'Editar sobrescrita' : 'Editar'}
              </Button>
            )}
            <ActionIcon
              variant="subtle"
              onClick={() => !editing && setExpanded(!expanded)}
              size="sm"
              disabled={editing}
            >
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
        </Group>

        {!expanded && hasExistingConfig && !editing && (
          <Stack gap="xs">
            {isBranchScope ? (
              <Group gap="xs">
                <Text size="xs" c="dimmed">Modo:</Text>
                <Badge color={useBranchOverride ? 'blue' : 'gray'} variant="light" size="sm">
                  {useBranchOverride ? 'Sobrescrita da filial' : 'Herdando da empresa'}
                </Badge>
              </Group>
            ) : null}
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

        {expanded && hasExistingConfig && !editing && (
          <Paper withBorder radius="md" p="sm" mb="md">
            <Stack gap="xs">
              {isBranchScope ? (
                <Group gap="xs">
                  <Text size="xs" c="dimmed">Modo atual:</Text>
                  <Badge color={useBranchOverride ? 'blue' : 'gray'} variant="light" size="sm">
                    {useBranchOverride ? 'Sobrescrita da filial' : 'Herdando da empresa'}
                  </Badge>
                </Group>
              ) : null}
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
              {displayValues.appId ? (
                <Group gap="xs">
                  <Text size="xs" c="dimmed">App ID:</Text>
                  <Text size="xs">{displayValues.appId}</Text>
                </Group>
              ) : null}
            </Stack>
          </Paper>
        )}

        <Collapse in={expanded}>
          <form onSubmit={handleSaveConfig}>
            <Stack gap="md" mt="md">
              {isBranchScope ? (
                <Switch
                  label="Sobrescrever nesta filial"
                  description="Desmarcado: herda automaticamente as credenciais da empresa"
                  checked={useBranchOverride}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setUseBranchOverride(checked);
                    if (checked) {
                      setEditing(true);
                    } else {
                      setEditing(false);
                    }
                  }}
                />
              ) : null}

              {isBranchScope && !useBranchOverride ? (
                <Paper withBorder radius="md" p="sm">
                  <Text size="sm" c="dimmed">
                    Esta filial usará automaticamente as credenciais padrão da empresa.
                  </Text>
                </Paper>
              ) : null}

              {(!isBranchScope || useBranchOverride) ? (
                <>
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
                </>
              ) : null}

              {(editing || !hasExistingConfig || (isBranchScope && !useBranchOverride)) && (
                <>
                  <Divider my="md" />

                  <Group>
                    <Button
                      type="submit"
                      leftSection={<IconDeviceFloppy size={16} />}
                      loading={loading}
                    >
                      {isBranchScope && !useBranchOverride ? 'Salvar Herança da Empresa' : 'Salvar Configuração'}
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
