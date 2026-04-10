import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Switch,
  useMantineColorScheme,
  Skeleton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import teaEvolutionTemplateService from '../../services/teaEvolutionTemplateService';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useTeaEvolutionTemplatesQuery } from '../../hooks/useTeaEvolutionTemplatesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import { FloatingTagsInput } from '../common/FloatingTagsInput';
import { FloatingTextarea } from '../common/FloatingTextarea';

const emptyForm = {
  id: '',
  procedureId: '',
  name: '',
  sessionGoal: '',
  interventionSummary: '',
  patientResponse: '',
  familyFeedback: '',
  homePlan: '',
  strategiesUsed: [] as string[],
  isActive: true,
};

export function TeaEvolucaoTemplates() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const {
    data: procedures = [] as any[],
    error: proceduresError,
  } = useProceduresAdminQuery();

  const {
    data: items = [] as any[],
    isLoading: loading,
    isFetching,
    error: templatesError,
  } = useTeaEvolutionTemplatesQuery();

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const procedureOptions = useMemo(
    () => procedures
      .map((item: any) => {
        const id = String(item?.id || '').trim();
        const name = String(item?.name || '').trim();
        return id && name ? { value: id, label: name } : null;
      })
      .filter(Boolean) as Array<{ value: string; label: string }>,
    [procedures],
  );

  useEffect(() => {
    if (!proceduresError) return;
    const err: any = proceduresError;
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar procedimentos'), color: 'red' });
  }, [proceduresError]);

  useEffect(() => {
    if (!templatesError) return;
    const err: any = templatesError;
    showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao carregar templates'), color: 'red' });
  }, [templatesError]);

  const handleSave = async () => {
    if (!form.procedureId) {
      showNotification({ title: 'Validação', message: 'Selecione o procedimento', color: 'yellow' });
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await teaEvolutionTemplateService.update(form.id, {
          name: form.name || undefined,
          sessionGoal: form.sessionGoal || undefined,
          interventionSummary: form.interventionSummary || undefined,
          patientResponse: form.patientResponse || undefined,
          familyFeedback: form.familyFeedback || undefined,
          homePlan: form.homePlan || undefined,
          strategiesUsed: form.strategiesUsed,
          isActive: form.isActive,
        });
      } else {
        await teaEvolutionTemplateService.upsert({
          procedureId: form.procedureId,
          name: form.name || undefined,
          sessionGoal: form.sessionGoal || undefined,
          interventionSummary: form.interventionSummary || undefined,
          patientResponse: form.patientResponse || undefined,
          familyFeedback: form.familyFeedback || undefined,
          homePlan: form.homePlan || undefined,
          strategiesUsed: form.strategiesUsed,
          isActive: form.isActive,
        });
      }

      showNotification({ title: 'Sucesso', message: isEditing ? 'Template atualizado' : 'Template criado', color: 'green' });
      setForm({ ...emptyForm });
      await queryClient.invalidateQueries({ queryKey: queryKeys.teaEvolutionTemplates });
    } catch (err: any) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Falha ao salvar template'), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: any) => {
    setForm({
      id: String(item.id),
      procedureId: String(item.procedureId || ''),
      name: String(item.name || ''),
      sessionGoal: String(item.sessionGoal || ''),
      interventionSummary: String(item.interventionSummary || ''),
      patientResponse: String(item.patientResponse || ''),
      familyFeedback: String(item.familyFeedback || ''),
      homePlan: String(item.homePlan || ''),
      strategiesUsed: Array.isArray(item.strategiesUsed) ? item.strategiesUsed : [],
      isActive: Boolean(item.isActive),
    });
  };

  const handleDeactivate = async (id: string) => {
    try {
      await teaEvolutionTemplateService.deactivate(id);
      showNotification({ title: 'Sucesso', message: 'Template desativado', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.teaEvolutionTemplates });
    } catch (err: any) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Falha ao desativar template'), color: 'red' });
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={18} gap="md" align="flex-start">
          <ActionIcon
            variant="default"
            size={isMobile ? 44 : 52}
            radius="md"
            onClick={() => navigate('/tea')}
            aria-label="Voltar"
          >
            <ChevronLeft size={22} />
          </ActionIcon>
          <Box>
            <Text fw={800} size="lg" style={{ color: titleColor }}>Templates da Evolução TEA</Text>
            <Text size="sm" c="dimmed">Padronize campos por procedimento</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Stack gap="sm">
            <Group grow align="flex-start">
              <FloatingSelect
                label="Procedimento"
                data={procedureOptions}
                value={form.procedureId || null}
                onChange={(value) => setForm((prev) => ({ ...prev, procedureId: value || '' }))}
                searchable
                clearable={false}
              />
              <FloatingInput
                label="Nome interno do template"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.currentTarget.value }))}
              />
            </Group>

            <FloatingTextarea label="Objetivo padrão" minRows={2} value={form.sessionGoal} onChange={(e) => setForm((prev) => ({ ...prev, sessionGoal: e.currentTarget.value }))} />
            <FloatingTextarea label="Intervenção padrão" minRows={2} value={form.interventionSummary} onChange={(e) => setForm((prev) => ({ ...prev, interventionSummary: e.currentTarget.value }))} />
            <FloatingTextarea label="Resposta padrão" minRows={2} value={form.patientResponse} onChange={(e) => setForm((prev) => ({ ...prev, patientResponse: e.currentTarget.value }))} />
            <FloatingTagsInput
              label="Estratégias padrão"
              value={form.strategiesUsed}
              onChange={(value) => setForm((prev) => ({ ...prev, strategiesUsed: value }))}
            />
            <Group grow align="flex-start">
              <FloatingTextarea label="Devolutiva padrão" minRows={2} value={form.familyFeedback} onChange={(e) => setForm((prev) => ({ ...prev, familyFeedback: e.currentTarget.value }))} />
              <FloatingTextarea label="Plano de casa padrão" minRows={2} value={form.homePlan} onChange={(e) => setForm((prev) => ({ ...prev, homePlan: e.currentTarget.value }))} />
            </Group>
            <Switch
              label="Template ativo"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.currentTarget.checked }))}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setForm({ ...emptyForm })}>Limpar</Button>
              <Button bg={DARK_BLUE} onClick={handleSave} loading={saving}>{isEditing ? 'Atualizar' : 'Salvar template'}</Button>
            </Group>
          </Stack>
        </Paper>

        <Paper p="md" mt="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
          <Group mb="sm" justify="space-between">
            <Text fw={700}>Templates cadastrados</Text>
          </Group>

          {(loading || isFetching) ? (
            <Stack gap="xs">
              {Array.from({ length: 3 }).map((_, index) => (
                <Paper key={index} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Skeleton height={16} width="30%" mb={10} radius="xl" />
                  <Skeleton height={12} width="46%" mb={8} radius="xl" />
                  <Skeleton height={10} width="72%" mb={8} radius="xl" />
                  <Skeleton height={24} width="34%" radius="xl" />
                </Paper>
              ))}
            </Stack>
          ) : items.length === 0 ? (
            <Text size="sm" c="dimmed">Nenhum template cadastrado.</Text>
          ) : (
            <Stack gap="xs">
              {items.map((item: any) => (
                <Paper key={item.id} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Group gap={6}>
                        <Text fw={700}>{item.procedure?.name || 'Procedimento'}</Text>
                        <Badge color={item.isActive ? 'green' : 'gray'} variant="light">{item.isActive ? 'Ativo' : 'Inativo'}</Badge>
                      </Group>
                      {item.name && <Text size="xs" c="dimmed">{item.name}</Text>}
                      {item.sessionGoal && <Text size="sm" mt={6}><b>Objetivo:</b> {item.sessionGoal}</Text>}
                      {item.interventionSummary && <Text size="sm"><b>Intervenção:</b> {item.interventionSummary}</Text>}
                      {Array.isArray(item.strategiesUsed) && item.strategiesUsed.length > 0 && (
                        <Group gap={6} mt={6}>
                          {item.strategiesUsed.map((s: string) => <Badge key={`${item.id}-${s}`} variant="outline">{s}</Badge>)}
                        </Group>
                      )}
                    </Box>
                    <Group gap={4}>
                      <ActionIcon variant="subtle" color="blue" onClick={() => startEdit(item)}><Pencil size={16} /></ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDeactivate(String(item.id))}><Trash2 size={16} /></ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default TeaEvolucaoTemplates;
