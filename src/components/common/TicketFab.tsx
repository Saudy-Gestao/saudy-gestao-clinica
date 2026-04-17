import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { CircleHelp, LoaderCircle, MessageSquarePlus, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ticketService, { type TicketType } from '../../services/ticketService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingSelect } from './FloatingSelect';
import { FloatingTextarea } from './FloatingTextarea';

const FLOW_OPTIONS = [
  { value: 'ATENDIMENTO_AGENDA', label: 'Atendimento e Agenda' },
  { value: 'EXAMES_LAUDO', label: 'Exames e Laudo' },
  { value: 'CADASTROS', label: 'Cadastros' },
  { value: 'FINANCEIRO_FATURAMENTO', label: 'Financeiro e Faturamento' },
  { value: 'TEA', label: 'Módulo TEA' },
  { value: 'OUTRO', label: 'Outro fluxo' },
];

const MODULE_OPTIONS = [
  { value: 'DASHBOARD', label: 'Dashboard' },
  { value: 'PRE_ATENDIMENTO', label: 'Pré-atendimento' },
  { value: 'AGENDAMENTO', label: 'Agendamento' },
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'EXECUCAO_EXAMES', label: 'Execução de Exames' },
  { value: 'LAUDO_EXAMES', label: 'Laudo de Exames' },
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'ESTOQUE', label: 'Estoque' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'FATURAMENTO', label: 'Faturamento' },
  { value: 'SETTINGS', label: 'Configurações' },
  { value: 'MODULO_TEA', label: 'Módulo TEA' },
  { value: 'OUTRO', label: 'Outro módulo' },
];

const TYPE_OPTIONS: Array<{ value: TicketType; label: string }> = [
  { value: 'BUG', label: 'Bug' },
  { value: 'ERROR', label: 'Erro' },
  { value: 'IMPROVEMENT', label: 'Melhoria' },
];

const HIDDEN_PATH_PREFIXES = [
  '/login',
  '/cadastro',
  '/esqueci-a-senha',
  '/adm',
  '/adm-register',
  '/check-in',
  '/pre-atendimento/documentos',
  '/pre-agendamento/documentos',
  '/teleconsulta/preparacao',
  '/teleconsulta/paciente',
  '/teleconsulta/finalizada',
];

const isAuthenticated = () => Boolean(localStorage.getItem('token'));

export function TicketFab() {
  const location = useLocation();
  const [opened, { open, close }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);
  const [flow, setFlow] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState<string | null>(null);
  const [type, setType] = useState<TicketType | null>('BUG');
  const [description, setDescription] = useState('');

  const hidden = useMemo(
    () => HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)),
    [location.pathname],
  );

  if (!isAuthenticated() || hidden) return null;

  const resetForm = () => {
    setFlow(null);
    setModuleName(null);
    setType('BUG');
    setDescription('');
  };

  const handleClose = () => {
    close();
    resetForm();
  };

  const handleSubmit = async () => {
    if (!flow || !moduleName || !type || !description.trim()) {
      notifications.show({
        title: 'Campos obrigatórios',
        message: 'Preencha fluxo, módulo, tipo e descrição para abrir o chamado.',
        color: 'yellow',
      });
      return;
    }

    if (description.trim().length < 10) {
      notifications.show({
        title: 'Descrição muito curta',
        message: 'Descreva melhor o contexto (mínimo de 10 caracteres).',
        color: 'yellow',
      });
      return;
    }

    setSubmitting(true);
    try {
      await ticketService.create({
        flow,
        module: moduleName,
        type,
        description: description.trim(),
      });

      notifications.show({
        title: 'Chamado aberto',
        message: 'Seu ticket foi enviado para análise da equipe interna.',
        color: 'green',
      });
      handleClose();
    } catch (error: any) {
      notifications.show({
        title: 'Erro ao abrir chamado',
        message: resolveApiErrorMessage(error, 'Não foi possível enviar o ticket.'),
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Box
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 210,
        }}
      >
        <Paper
          radius="xl"
          p={6}
          style={{
            border: '1px solid rgba(255,255,255,0.24)',
            background: 'linear-gradient(135deg, #132a63 0%, #1e3f95 100%)',
            boxShadow: '0 16px 42px rgba(19,42,99,0.38)',
          }}
        >
          <ActionIcon size={56} radius="xl" variant="transparent" color="white" onClick={open} aria-label="Abrir ajuda">
            <CircleHelp size={28} />
          </ActionIcon>
        </Paper>
      </Box>

      <Modal
        opened={opened}
        onClose={handleClose}
        title={(
          <Group gap="sm">
            <ThemeIcon color="darkBlue" variant="light" radius="md">
              <MessageSquarePlus size={16} />
            </ThemeIcon>
            <Text fw={700}>Abrir Ticket de Ajuda</Text>
          </Group>
        )}
        centered
        size="lg"
      >
        <Stack gap="md">
          <Badge variant="light" color="darkBlue" w="fit-content">Suporte interno</Badge>

          <FloatingSelect
            label="Fluxo"
            placeholder="Selecione o fluxo"
            data={FLOW_OPTIONS}
            value={flow}
            onChange={setFlow}
            searchable
            required
          />

          <FloatingSelect
            label="Módulo"
            placeholder="Selecione o módulo"
            data={MODULE_OPTIONS}
            value={moduleName}
            onChange={setModuleName}
            searchable
            required
          />

          <FloatingSelect
            label="Tipo"
            data={TYPE_OPTIONS}
            value={type}
            onChange={(value) => setType((value as TicketType | null) || 'BUG')}
            required
          />

          <FloatingTextarea
            label="Descrição do bug, erro ou melhoria"
            placeholder="Explique o que aconteceu, onde ocorreu e qual comportamento era esperado"
            minRows={5}
            autosize
            required
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={submitting}>Cancelar</Button>
            <Button
              leftSection={submitting ? <LoaderCircle size={14} /> : <Send size={14} />}
              onClick={handleSubmit}
              loading={submitting}
            >
              Enviar chamado
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
