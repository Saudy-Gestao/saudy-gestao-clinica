import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Paper,
  Tabs,
  Box,
  Button,
  Switch,
  Table,
  Badge,
  Group,
  Stack,
  Title,
  Text,
  Alert,
  Divider,
  ActionIcon,
  Modal,
  Code,
  Card,
  Skeleton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconMessage,
  IconBell,
  IconHistory,
  IconTrash,
  IconPlus,
  IconEye,
  IconAlertCircle,
  IconClock,
  IconInfoCircle,
  IconRefresh,
  IconDeviceFloppy,
  IconSparkles,
} from '@tabler/icons-react';
import whatsappService from '../../services/whatsappService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { useWhatsAppPageDataQuery } from '../../hooks/useWhatsAppPageDataQuery';
import { queryKeys } from '../../lib/queryKeys';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingNumberInput } from '../common/FloatingNumberInput';
import { FloatingTextarea } from '../common/FloatingTextarea';
import { FloatingSelect } from '../common/FloatingSelect';
import { useWhatsAppConfigQuery } from '../../hooks/useWhatsAppConfigQuery';

interface TemplateFormValues {
  type: string;
  name: string;
  message: string;
  isActive: boolean;
}

interface NotificationFormValues {
  sendOnAppointmentCreated: boolean;
  sendConfirmationEnabled: boolean;
  confirmationHoursBefore: number;
}

interface WhatsAppConfigProps {
  embedded?: boolean;
}

export function WhatsAppConfig({ embedded = false }: WhatsAppConfigProps) {
  const templateTypeLabels: Record<string, string> = {
    APPOINTMENT_CREATED: 'Resumo de Agendamento',
    TELECONSULTATION_LINK: 'Link de Teleconsulta',
    APPOINTMENT_CONFIRMATION: 'Confirmação de Agendamento',
    NO_SHOW: 'Falta',
    CONFIRMATION_REPLY_CONFIRMED: 'Resposta: Confirmado',
    CONFIRMATION_REPLY_RESCHEDULE: 'Resposta: Reagendar',
  };

  const defaultTemplateMessages: Record<string, string> = {
    APPOINTMENT_CREATED:
      'Olá, {{paciente_nome}}! 😊\nSomos da {{clinica_nome}}.\nSeu atendimento está confirmado:\n📅 {{data}} às {{hora}}\n👩‍⚕️ {{profissional}}\n📍 {{local}}\n📎 Para agilizar seu atendimento, pedimos que envie seus documentos pelo link abaixo:\n👉 {{link_documentos}}\nEm caso de necessidade, fale conosco por aqui.',
    TELECONSULTATION_LINK:
      'Olá, {{paciente_nome}}! 😊\nSeu acesso para teleconsulta na {{clinica_nome}} foi liberado.\n📅 {{data}} às {{hora}}\n👩‍⚕️ {{profissional}}\n🔗 Acesse por aqui: {{link_documentos}}\nCaso precise de ajuda, responda esta mensagem.',
    APPOINTMENT_CONFIRMATION:
      'Olá, {{paciente_nome}}! 😊\nSomos da {{clinica_nome}}.\nEstamos entrando em contato para confirmar seu agendamento:\n📅 Data: {{data}}\n⏰ Horário: {{hora}}\n👩‍⚕️ Profissional: {{profissional}}\n📍 Local: {{local}}\nPor favor, escolha uma das opções abaixo:\n✅ Confirmar\n❌ Reagendar\nFicamos no aguardo.',
    CONFIRMATION_REPLY_CONFIRMED:
      '✅ Agendamento confirmado com sucesso!\n📅 {{data}}\n⏰ {{hora}}\n👩‍⚕️ {{profissional}}\nQualquer imprevisto, fale conosco por este canal.\nAté breve! 💙',
    CONFIRMATION_REPLY_RESCHEDULE:
      'Em breve um atendente entrará em contato para realizar seu reagendamento.',
    NO_SHOW:
      'Olá, {{paciente_nome}}.\nSomos da {{clinica_nome}}.\nNotamos que você não apareceu para o seu agendamento:\n📅 {{data}} às {{hora}}\n👩‍⚕️ {{profissional}}\n📍 {{local}}\nCaso tenha ocorrido algum imprevisto, pedimos que nos informe por aqui.',
  };

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoadingType, setToggleLoadingType] = useState<string | null>(null);
  const [sendValidationOnSave, setSendValidationOnSave] = useState(false);
  const [activationConfirm, setActivationConfirm] = useState<{ mode: 'form' | 'list'; templateId?: string } | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<{ id: string; name: string } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const { data, error, isFetching } = useWhatsAppPageDataQuery();
  const { data: whatsappConfig } = useWhatsAppConfigQuery();
  const templates = data?.templates || [];
  const logs = data?.logs || [];
  const variables = data?.variables || [];

  // Forms using simple state instead of @mantine/form
  const [templateForm, setTemplateForm] = useState<TemplateFormValues>({
    type: 'APPOINTMENT_CREATED',
    name: '',
    message: '',
    isActive: false,
  });

  const [notificationForm, setNotificationForm] = useState<NotificationFormValues>({
    sendOnAppointmentCreated: true,
    sendConfirmationEnabled: true,
    confirmationHoursBefore: 24,
  });

  useEffect(() => {
    if (!data?.notificationConfig) return;
    setNotificationForm({
      sendOnAppointmentCreated: data.notificationConfig.sendOnAppointmentCreated,
      sendConfirmationEnabled: data.notificationConfig.sendConfirmationEnabled,
      confirmationHoursBefore: data.notificationConfig.confirmationHoursBefore,
    });
  }, [data?.notificationConfig]);

  useEffect(() => {
    if (!error) return;
    const err: any = error;
    notifications.show({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar configurações do WhatsApp'),
      color: 'red',
    });
  }, [error]);

  const refreshPageData = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.whatsappPageData });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao atualizar dados do WhatsApp'),
        color: 'red',
      });
    }
  };

  const hasDatabaseWhatsAppCredentials = Boolean(
    whatsappConfig?.accountSid?.trim()
    && whatsappConfig?.authToken?.trim()
    && whatsappConfig?.fromNumber?.trim(),
  );

  const getDefaultTemplateForm = (type: string): TemplateFormValues => {
    const existingTemplate = templates.find((template) => template.type === type);

    return {
      type,
      name: existingTemplate?.name || templateTypeLabels[type] || '',
      message: existingTemplate?.message || defaultTemplateMessages[type] || '',
      isActive: existingTemplate?.isActive ?? false,
    };
  };

  const validateTemplateForm = (form: TemplateFormValues) => {
    const message = form.message.trim();
    const variablesFound = message.match(/\{\{[^}]+\}\}/g) || [];

    if (/^\{\{[^}]+\}\}$/.test(message)) {
      return 'Não é permitido salvar um template com variável sozinha.';
    }

    const lastVariable = variablesFound[variablesFound.length - 1];
    if (lastVariable && message.endsWith(lastVariable)) {
      return 'Não é permitido salvar um template terminando com variável.';
    }

    return null;
  };

  const handleSaveNotificationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await whatsappService.saveNotificationConfig(notificationForm);
      notifications.show({
        title: 'Sucesso',
        message: 'Configurações de notificação salvas',
        color: 'green',
      });
      await refreshPageData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao salvar configurações de notificação',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDatabaseWhatsAppCredentials) {
      notifications.show({
        title: 'Credencial obrigatória',
        message: 'Salve primeiro a credencial do WhatsApp da filial nas configurações.',
        color: 'yellow',
      });
      return;
    }

    const validationError = validateTemplateForm(templateForm);
    if (validationError) {
      notifications.show({
        title: 'Validação do template',
        message: validationError,
        color: 'yellow',
      });
      return;
    }

    setLoading(true);
    try {
      const shouldSendForValidation = sendValidationOnSave && templateForm.isActive;
      const saved = await whatsappService.saveTemplate({
        ...(editingTemplateId ? { id: editingTemplateId } : {}),
        ...templateForm,
        isActive: shouldSendForValidation ? false : templateForm.isActive,
      });

      if (shouldSendForValidation) {
        try {
          await whatsappService.pushTemplateToGupshup(saved.id);
          await whatsappService.saveTemplate({
            id: saved.id,
            type: saved.type,
            name: saved.name,
            message: saved.message,
            isActive: true,
          });
          notifications.show({
            title: 'Template salvo e enviado para o Gupshup',
            message: 'Aguarde a aprovação da Meta para usar HSM.',
            color: 'green',
          });
        } catch (pushError: any) {
          notifications.show({
            title: 'Erro ao enviar template para Gupshup',
            message: resolveApiErrorMessage(pushError, 'O template foi mantido desativado porque o envio falhou.'),
            color: 'yellow',
            autoClose: 8000,
          });
        }
      } else {
        notifications.show({
          title: 'Sucesso',
          message: 'Template salvo com sucesso',
          color: 'green',
        });
      }

      setShowTemplateModal(false);
      setTemplateForm(getDefaultTemplateForm('APPOINTMENT_CREATED'));
      setIsEditingTemplate(false);
      setEditingTemplateId(null);
      setSendValidationOnSave(false);
      await refreshPageData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao salvar template'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;
    setDeleteLoading(true);
    try {
      await whatsappService.deleteTemplate(deleteConfirmTemplate.id);
      notifications.show({
        title: 'Excluído',
        message: `Template "${deleteConfirmTemplate.name}" removido.`,
        color: 'green',
      });
      setDeleteConfirmTemplate(null);
      await refreshPageData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao excluir template'),
        color: 'red',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSyncHsm = async () => {
    setSyncLoading(true);
    try {
      const result = await whatsappService.syncHsmStatus();
      const created = Number(result.created ?? 0);
      notifications.show({
        title: 'Sincronizado',
        message: `${result.synced} template(s) verificados, ${created} importado(s) e ${result.updated} atualizado(s).`,
        color: 'green',
      });
      await refreshPageData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao sincronizar status dos templates'),
        color: 'red',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLoadDefaults = async () => {
    setLoading(true);
    try {
      const result = await whatsappService.loadDefaultTemplates();
      const created = Number(result?.created ?? 0);
      const updated = Number(result?.updated ?? 0);
      notifications.show({
        title: 'Templates carregados',
        message: `${created} criado(s) e ${updated} atualizado(s) para esta filial.`,
        color: 'green',
      });
      await refreshPageData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao carregar templates padrão'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openTemplateModal = (template?: any) => {
    if (template) {
      setIsEditingTemplate(true);
      setEditingTemplateId(template.id);
      setTemplateForm({
        type: template.type,
        name: template.name,
        message: template.message,
        isActive: template.isActive,
      });
      setSendValidationOnSave(false);
    } else {
      setIsEditingTemplate(false);
      setEditingTemplateId(null);
      setTemplateForm(getDefaultTemplateForm('APPOINTMENT_CREATED'));
      setSendValidationOnSave(false);
    }
    setShowTemplateModal(true);
  };

  const insertVariable = (variable: string) => {
    setTemplateForm(prev => ({
      ...prev,
      message: prev.message + variable,
    }));
  };

  const getMessageTypeLabel = (type: string) => {
    return templateTypeLabels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      SENT: { color: 'green', label: 'Enviado' },
      SUBMITTED: { color: 'green', label: 'Enviado' },
      DELIVERED: { color: 'teal', label: 'Entregue' },
      READ: { color: 'blue', label: 'Lido' },
      PENDING: { color: 'yellow', label: 'Pendente' },
      RESPONDED_CONFIRMED: { color: 'green', label: 'Respondido: Confirmado' },
      RESPONDED_RESCHEDULE: { color: 'orange', label: 'Respondido: Reagendar' },
      RECEIVED: { color: 'blue', label: 'Recebido' },
      FAILED: { color: 'red', label: 'Falhou' },
    };
    const normalized = String(status || '').trim().toUpperCase();
    const config = statusConfig[normalized] || { color: 'gray', label: normalized || 'Sem status' };
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const getHsmStatusLabel = (status?: string | null) => {
    const normalized = String(status || '').trim().toUpperCase();
    const statusConfig: Record<string, { color: string; label: string }> = {
      APPROVED: { color: 'green', label: 'Aprovado' },
      REJECTED: { color: 'red', label: 'Recusado' },
      FAILED: { color: 'red', label: 'Falhou' },
      PENDING: { color: 'yellow', label: 'Pendente' },
      SUBMITTED: { color: 'blue', label: 'Enviado' },
      IN_REVIEW: { color: 'blue', label: 'Em análise' },
    };
    return statusConfig[normalized] || { color: 'gray', label: normalized || 'Sem status' };
  };

  const handleTemplateToggle = async (template: any, nextIsActive: boolean) => {
    if (!nextIsActive) {
      setToggleLoadingType(template.type);
      try {
        await whatsappService.saveTemplate({
          id: template.id,
          type: template.type,
          name: template.name,
          message: template.message,
          isActive: false,
        });
        await refreshPageData();
      } catch (toggleError: any) {
        notifications.show({
          title: 'Erro',
          message: resolveApiErrorMessage(toggleError, 'Erro ao atualizar template'),
          color: 'red',
        });
      } finally {
        setToggleLoadingType(null);
      }
      return;
    }

    if (template.hsmTemplateApproved) {
      setToggleLoadingType(template.type);
      try {
        await whatsappService.saveTemplate({
          id: template.id,
          type: template.type,
          name: template.name,
          message: template.message,
          isActive: true,
        });
        notifications.show({
          title: 'Template ativado',
          message: 'Template já aprovado na Gupshup e ativado com sucesso.',
          color: 'green',
        });
        await refreshPageData();
      } catch (toggleError: any) {
        notifications.show({
          title: 'Erro',
          message: resolveApiErrorMessage(toggleError, 'Erro ao ativar template'),
          color: 'red',
        });
      } finally {
        setToggleLoadingType(null);
      }
      return;
    }

    setActivationConfirm({ mode: 'list', templateId: template.id });
  };

  const confirmActivation = async () => {
    if (!activationConfirm) return;

    if (activationConfirm.mode === 'form') {
      const editingTemplate = editingTemplateId
        ? templates.find((item) => item.id === editingTemplateId)
        : null;
      const alreadyApproved = Boolean(editingTemplate?.hsmTemplateApproved);

      setTemplateForm((prev) => ({ ...prev, isActive: true }));
      setSendValidationOnSave(!alreadyApproved);
      setActivationConfirm(null);
      return;
    }

    const template = templates.find((item) => item.id === activationConfirm.templateId);
    if (!template) {
      setActivationConfirm(null);
      return;
    }

    setToggleLoadingType(template.type);
    try {
      if (!template.hsmTemplateApproved) {
        await whatsappService.pushTemplateToGupshup(template.id);
      }
      await whatsappService.saveTemplate({
        id: template.id,
        type: template.type,
        name: template.name,
        message: template.message,
        isActive: true,
      });
      notifications.show({
        title: template.hsmTemplateApproved ? 'Template ativado' : 'Template enviado para validação',
        message: template.hsmTemplateApproved
          ? 'O template foi ativado sem novo envio, pois já está aprovado.'
          : 'O template foi ativado e enviado para o Gupshup.',
        color: 'green',
      });
      setActivationConfirm(null);
      await refreshPageData();
    } catch (pushError: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(pushError, 'Erro ao ativar e enviar template'),
        color: 'red',
      });
    } finally {
      setToggleLoadingType(null);
    }
  };

  return (
    <Box p={embedded ? 0 : "md"}>
      {showAlert && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          mb="md" 
          color="yellow"
          withCloseButton
          onClose={() => setShowAlert(false)}
        >
          <Text size="sm">
            <strong>Importante:</strong> Você precisa configurar sua conta na Gupshup e obter aprovação
            do WhatsApp Business API antes de usar este recurso.
          </Text>
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'templates')}>
        <Tabs.List>
          <Tabs.Tab value="templates" leftSection={<IconMessage size={16} />}>
            Templates de Mensagens
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
            Notificações
          </Tabs.Tab>
          <Tabs.Tab value="logs" leftSection={<IconHistory size={16} />}>
            Histórico
          </Tabs.Tab>
        </Tabs.List>

        {/* Templates */}
        <Tabs.Panel value="templates" pt="md">
          <Paper shadow="sm" p="xl">
            <Group justify="space-between" mb="md">
              <Title order={4}>Templates de Mensagens</Title>
              <Group gap="xs">
                <Button
                  variant="light"
                  leftSection={<IconSparkles size={16} />}
                  onClick={handleLoadDefaults}
                  loading={loading}
                >
                  Carregar templates padrão
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleSyncHsm}
                  loading={syncLoading}
                >
                  Sincronizar status HSM
                </Button>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => openTemplateModal()}
                >
                  Novo Template
                </Button>
              </Group>
            </Group>

            <Alert icon={<IconInfoCircle size={16} />} mb="md">
              Use variáveis como <Code>{'{{paciente_nome}}'}</Code>, <Code>{'{{data}}'}</Code>, <Code>{'{{hora}}'}</Code> para personalizar as mensagens.
            </Alert>

            <Stack gap="md">
              {isFetching && templates.length === 0 ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} shadow="sm" padding="lg" withBorder>
                  <Stack gap="sm">
                    <Skeleton height={20} width="40%" radius="xl" />
                    <Skeleton height={16} width="80%" radius="xl" />
                  </Stack>
                </Card>
              )) : templates.map((template) => (
                <Card key={template.id} shadow="sm" padding="lg" withBorder>
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={500}>{template.name}</Text>
                      <Group gap={4} mt={4}>
                        <Badge size="sm" variant="light">
                          {getMessageTypeLabel(template.type)}
                        </Badge>
                        {template.importedFromGupshupSync && (
                          <Badge size="sm" variant="outline" color="teal">
                            Importado da Gupshup
                          </Badge>
                        )}
                        {template.hsmTemplateName && (
                          <>
                            <Badge size="sm" variant="filled" color={getHsmStatusLabel(template.hsmTemplateStatus).color}>
                              HSM: {getHsmStatusLabel(template.hsmTemplateStatus).label}
                            </Badge>
                            {template.hsmTemplateId && (
                              <Badge size="sm" variant="outline" color="gray">
                                ID: {template.hsmTemplateId}
                              </Badge>
                            )}
                          </>
                        )}
                      </Group>
                    </div>
                    <Group gap="xs">
                      <Switch
                        checked={template.isActive}
                        disabled={toggleLoadingType === template.type}
                        onChange={(event) => void handleTemplateToggle(template, event.currentTarget.checked)}
                      />
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => openTemplateModal(template)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => setDeleteConfirmTemplate({ id: template.id, name: template.name })}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {template.message.substring(0, 150)}
                    {template.message.length > 150 && '...'}
                  </Text>
                </Card>
              ))}

              {templates.length === 0 && (
                <Alert icon={<IconAlertCircle size={16} />}>
                  Nenhum template cadastrado. Clique em "Novo Template" para criar.
                </Alert>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Notificações */}
        <Tabs.Panel value="notifications" pt="md">
          <Paper shadow="sm" p="xl">
            <form onSubmit={handleSaveNotificationConfig}>
              <Stack gap="md">
                <Title order={4}>Configurações de Notificações</Title>

                <Divider label="Mensagem ao criar agendamento" />
                
                <Switch
                  label="Enviar mensagem ao criar agendamento"
                  description="Envia mensagem WhatsApp imediatamente após criar um agendamento"
                  checked={notificationForm.sendOnAppointmentCreated}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, sendOnAppointmentCreated: e.target.checked }))}
                />

                <Divider label="Confirmação de agendamento" mt="md" />
                
                <Switch
                  label="Enviar confirmação de agendamento"
                  description="Envia uma mensagem de confirmação antes do agendamento"
                  checked={notificationForm.sendConfirmationEnabled}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, sendConfirmationEnabled: e.target.checked }))}
                />

                <FloatingNumberInput
                  label="Horas antes do agendamento"
                  description="Defina quantas horas antes do agendamento a mensagem de confirmação deve ser enviada"
                  min={1}
                  max={168}
                  value={notificationForm.confirmationHoursBefore}
                  onChange={(value) => setNotificationForm(prev => ({ ...prev, confirmationHoursBefore: Number(value) }))}
                  disabled={!notificationForm.sendConfirmationEnabled}
                />

                <Button
                  type="submit"
                  leftSection={<IconDeviceFloppy size={16} />}
                  loading={loading || isFetching}
                >
                  Salvar Configurações
                </Button>

                <Alert icon={<IconClock size={16} />} color="blue">
                  <Text size="sm">
                    <strong>Nota:</strong> Para que as confirmações e lembretes funcionem, é necessário
                    configurar um job cron para chamar os endpoints de processamento regularmente.
                  </Text>
                </Alert>
              </Stack>
            </form>
          </Paper>
        </Tabs.Panel>

        {/* Histórico */}
        <Tabs.Panel value="logs" pt="md">
          <Paper shadow="sm" p="xl">
            <Group justify="space-between" mb="md">
              <Title order={4}>Histórico de Mensagens</Title>
              <Button variant="light" onClick={refreshPageData} loading={isFetching}>
                Atualizar
              </Button>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data/Hora</Table.Th>
                  <Table.Th>Paciente</Table.Th>
                  <Table.Th>Telefone</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.map((log: any) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </Table.Td>
                    <Table.Td>{log.patientName || '-'}</Table.Td>
                    <Table.Td>{log.patientPhone}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light">
                        {getMessageTypeLabel(log.messageType)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(log.status)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {logs.length === 0 && (
              <Alert icon={<IconAlertCircle size={16} />} mt="md">
                Nenhuma mensagem enviada ainda.
              </Alert>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Modal Template */}
      <Modal
        opened={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Template de Mensagem"
        size="lg"
      >
        <form onSubmit={handleSaveTemplate}>
          <Stack gap="md">
            <FloatingSelect
              label="Tipo de Mensagem"
              required
              data={[
                { value: 'APPOINTMENT_CREATED', label: 'Resumo de Agendamento', disabled: !isEditingTemplate && templates.some((template) => template.type === 'APPOINTMENT_CREATED') },
                { value: 'TELECONSULTATION_LINK', label: 'Link de Teleconsulta', disabled: !isEditingTemplate && templates.some((template) => template.type === 'TELECONSULTATION_LINK') },
                { value: 'APPOINTMENT_CONFIRMATION', label: 'Confirmação', disabled: !isEditingTemplate && templates.some((template) => template.type === 'APPOINTMENT_CONFIRMATION') },
                { value: 'NO_SHOW', label: 'Falta', disabled: !isEditingTemplate && templates.some((template) => template.type === 'NO_SHOW') },
                { value: 'CONFIRMATION_REPLY_CONFIRMED', label: 'Resposta: Confirmado', disabled: !isEditingTemplate && templates.some((template) => template.type === 'CONFIRMATION_REPLY_CONFIRMED') },
                { value: 'CONFIRMATION_REPLY_RESCHEDULE', label: 'Resposta: Reagendar', disabled: !isEditingTemplate && templates.some((template) => template.type === 'CONFIRMATION_REPLY_RESCHEDULE') },
              ]}
              value={templateForm.type}
              onChange={(value) => {
                if (!value) return;
                if (!isEditingTemplate) {
                  setTemplateForm(getDefaultTemplateForm(value));
                  setSendValidationOnSave(false);
                  return;
                }
                setTemplateForm(prev => ({ ...prev, type: value as any }));
              }}
            />

            <FloatingInput
              label="Nome do Template"
              placeholder="Ex: Confirmação Padrão"
              required
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Text size="xs" c="dimmed" mt={-8}>
              O nome interno na Gupshup será gerado automaticamente a partir deste título, normalizado e com UUID no final.
            </Text>

            <div>
              <Text size="sm" fw={500} mb={4}>Variáveis Disponíveis</Text>
              <Group gap="xs" mb="xs">
                {variables.map((v) => (
                  <Button
                    key={v.key}
                    size="xs"
                    variant="light"
                    type="button"
                    onClick={() => insertVariable(v.key)}
                  >
                    {v.key}
                  </Button>
                ))}
              </Group>
            </div>

            <FloatingTextarea
              label="Mensagem"
              placeholder="Digite a mensagem..."
              required
              minRows={6}
              value={templateForm.message}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, message: e.target.value }))}
            />

            <Switch
              label="Template ativo"
              checked={templateForm.isActive}
              onChange={(e) => {
                if (e.target.checked) {
                  setActivationConfirm({ mode: 'form' });
                  return;
                }
                setTemplateForm(prev => ({ ...prev, isActive: false }));
                setSendValidationOnSave(false);
              }}
            />

            <Group justify="flex-end">
              <Button variant="light" type="button" onClick={() => {
                setShowTemplateModal(false);
                setEditingTemplateId(null);
                setIsEditingTemplate(false);
                setSendValidationOnSave(false);
              }}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading || isFetching}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        opened={!!deleteConfirmTemplate}
        onClose={() => setDeleteConfirmTemplate(null)}
        title="Excluir template"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text>
            Tem certeza que deseja excluir o template{' '}
            <strong>"{deleteConfirmTemplate?.name}"</strong>? Esta ação não pode ser desfeita.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteConfirmTemplate(null)}>
              Cancelar
            </Button>
            <Button color="red" leftSection={<IconTrash size={16} />} onClick={handleDeleteTemplate} loading={deleteLoading}>
              Excluir
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!activationConfirm}
        onClose={() => setActivationConfirm(null)}
        title="Enviar template para validação"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Deseja enviar este template para validação na Gupshup?
            Se confirmar, o toggle será ativado.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setActivationConfirm(null)}>
              Não
            </Button>
            <Button onClick={() => void confirmActivation()} loading={toggleLoadingType !== null && activationConfirm?.mode === 'list'}>
              Sim
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default WhatsAppConfig;
