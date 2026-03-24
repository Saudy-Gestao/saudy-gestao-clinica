import { useState, useEffect } from 'react';
import {
  Paper,
  Tabs,
  Box,
  TextInput,
  Button,
  Switch,
  NumberInput,
  Textarea,
  Select,
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
} from '@tabler/icons-react';
import whatsappService from '../../services/whatsappService';

interface TemplateFormValues {
  type: string;
  name: string;
  message: string;
  hsmTemplateName: string;
  isActive: boolean;
}

interface NotificationFormValues {
  sendOnAppointmentCreated: boolean;
  sendConfirmationEnabled: boolean;
  confirmationHoursBefore: number;
  sendReminderEnabled: boolean;
  reminderHoursBefore: number;
}

interface WhatsAppConfigProps {
  embedded?: boolean;
}

export function WhatsAppConfig({ embedded = false }: WhatsAppConfigProps) {
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAlert, setShowAlert] = useState(true);

  // Forms using simple state instead of @mantine/form
  const [templateForm, setTemplateForm] = useState<TemplateFormValues>({
    type: 'APPOINTMENT_CREATED',
    name: '',
    message: '',
    hsmTemplateName: '',
    isActive: true,
  });

  const [notificationForm, setNotificationForm] = useState<NotificationFormValues>({
    sendOnAppointmentCreated: true,
    sendConfirmationEnabled: true,
    confirmationHoursBefore: 24,
    sendReminderEnabled: false,
    reminderHoursBefore: 2,
  });

  useEffect(() => {
    loadData();
    loadVariables();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, notificationConfig] = await Promise.all([
        whatsappService.listTemplates(),
        whatsappService.getNotificationConfig(),
      ]);

      setTemplates(templatesData);

      if (notificationConfig) {
        setNotificationForm({
          sendOnAppointmentCreated: notificationConfig.sendOnAppointmentCreated,
          sendConfirmationEnabled: notificationConfig.sendConfirmationEnabled,
          confirmationHoursBefore: notificationConfig.confirmationHoursBefore,
          sendReminderEnabled: notificationConfig.sendReminderEnabled,
          reminderHoursBefore: notificationConfig.reminderHoursBefore,
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.message || 'Erro ao carregar configurações',
        color: 'red',
      });
    }
  };

  const loadVariables = async () => {
    try {
      const data = await whatsappService.getAvailableVariables();
      setVariables(data);
    } catch (error) {
      console.error('Failed to load variables:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await whatsappService.listLogs({ limit: 50, offset: 0 });
      setLogs(data.items);
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao carregar logs',
        color: 'red',
      });
    }
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
      await loadData();
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
    setLoading(true);
    try {
      await whatsappService.saveTemplate(templateForm);
      notifications.show({
        title: 'Sucesso',
        message: 'Template salvo com sucesso',
        color: 'green',
      });
      setShowTemplateModal(false);
      setTemplateForm({
        type: 'APPOINTMENT_CREATED',
        name: '',
        message: '',
        hsmTemplateName: '',
        isActive: true,
      });
      loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.message || 'Erro ao salvar template',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este template?')) return;
    
    try {
      await whatsappService.deleteTemplate(id);
      notifications.show({
        title: 'Sucesso',
        message: 'Template excluído',
        color: 'green',
      });
      loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao excluir template',
        color: 'red',
      });
    }
  };

  const handleSyncHsm = async () => {
    setSyncLoading(true);
    try {
      const result = await whatsappService.syncHsmStatus();
      notifications.show({
        title: 'Sincronizado',
        message: `${result.synced} template(s) verificados, ${result.updated} atualizado(s).`,
        color: 'green',
      });
      await loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.error || 'Erro ao sincronizar status dos templates',
        color: 'red',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const openTemplateModal = (template?: any) => {
    if (template) {
      setTemplateForm({
        type: template.type,
        name: template.name,
        message: template.message,
        hsmTemplateName: template.hsmTemplateName || '',
        isActive: template.isActive,
      });
    } else {
      setTemplateForm({
        type: 'APPOINTMENT_CREATED',
        name: '',
        message: '',
        hsmTemplateName: '',
        isActive: true,
      });
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
    const labels: Record<string, string> = {
      APPOINTMENT_CREATED: 'Agendamento Criado',
      APPOINTMENT_CONFIRMATION: 'Confirmação de Agendamento',
      APPOINTMENT_REMINDER: 'Lembrete de Agendamento',
      APPOINTMENT_CANCELED: 'Agendamento Cancelado',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      SENT: { color: 'green', label: 'Enviado' },
      PENDING: { color: 'yellow', label: 'Pendente' },
      FAILED: { color: 'red', label: 'Falhou' },
    };
    const config = statusConfig[status] || { color: 'gray', label: status };
    return <Badge color={config.color}>{config.label}</Badge>;
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
              {templates.map((template) => (
                <Card key={template.id} shadow="sm" padding="lg" withBorder>
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={500}>{template.name}</Text>
                      <Group gap={4} mt={4}>
                        <Badge size="sm" variant="light">
                          {getMessageTypeLabel(template.type)}
                        </Badge>
                        {template.hsmTemplateName && (
                          <Badge size="sm" variant="filled" color={template.hsmTemplateApproved ? 'green' : 'red'}>
                            HSM: {template.hsmTemplateName}{template.hsmTemplateApproved ? ' ✓' : ' ⋅ pendente'}
                          </Badge>
                        )}
                      </Group>
                    </div>
                    <Group gap="xs">
                      <Switch
                        checked={template.isActive}
                        onChange={async (event) => {
                          await whatsappService.saveTemplate({
                            ...template,
                            isActive: event.currentTarget.checked,
                          });
                          loadData();
                        }}
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
                        onClick={() => handleDeleteTemplate(template.id)}
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

                <NumberInput
                  label="Horas antes do agendamento"
                  description="Quantas horas antes do agendamento enviar a confirmação"
                  min={1}
                  max={168}
                  value={notificationForm.confirmationHoursBefore}
                  onChange={(value) => setNotificationForm(prev => ({ ...prev, confirmationHoursBefore: Number(value) }))}
                  disabled={!notificationForm.sendConfirmationEnabled}
                />

                <Divider label="Lembrete de agendamento" mt="md" />
                
                <Switch
                  label="Enviar lembrete de agendamento"
                  description="Envia um lembrete próximo ao horário do agendamento"
                  checked={notificationForm.sendReminderEnabled}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, sendReminderEnabled: e.target.checked }))}
                />

                <NumberInput
                  label="Horas antes do agendamento"
                  description="Quantas horas antes do agendamento enviar o lembrete"
                  min={1}
                  max={72}
                  value={notificationForm.reminderHoursBefore}
                  onChange={(value) => setNotificationForm(prev => ({ ...prev, reminderHoursBefore: Number(value) }))}
                  disabled={!notificationForm.sendReminderEnabled}
                />

                <Divider my="md" />

                <Button
                  type="submit"
                  leftSection={<IconDeviceFloppy size={16} />}
                  loading={loading}
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
              <Button variant="light" onClick={loadLogs}>
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
                {logs.map((log) => (
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
            <Select
              label="Tipo de Mensagem"
              required
              data={[
                { value: 'APPOINTMENT_CREATED', label: 'Agendamento Criado' },
                { value: 'APPOINTMENT_CONFIRMATION', label: 'Confirmação' },
                { value: 'APPOINTMENT_REMINDER', label: 'Lembrete' },
                { value: 'APPOINTMENT_CANCELED', label: 'Cancelamento' },
              ]}
              value={templateForm.type}
              onChange={(value) => setTemplateForm(prev => ({ ...prev, type: value as any }))}
            />

            <TextInput
              label="Nome do Template"
              placeholder="Ex: Confirmação Padrão"
              required
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
            />

            <TextInput
              label="Nome do Template (Gupshup/Meta HSM)"
              placeholder="Ex: confirmacao_agendamento"
              description="Nome exato do template aprovado no painel Gupshup. Quando preenchido, o envio usa HSM (funciona sem o paciente ter iniciado contato)."
              value={templateForm.hsmTemplateName}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, hsmTemplateName: e.target.value }))}
            />

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

            <Textarea
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
              onChange={(e) => setTemplateForm(prev => ({ ...prev, isActive: e.target.checked }))}
            />

            <Group justify="flex-end">
              <Button variant="light" type="button" onClick={() => setShowTemplateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

export default WhatsAppConfig;
