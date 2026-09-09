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
  Skeleton,
  Select,
  TextInput,
  Textarea,
  TagsInput,
  SimpleGrid,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { showNotification } from '@/components/ui';
import { Pencil, Trash2 } from 'lucide-react';
import { Header } from '../Header/Header';
import teaEvolutionTemplateService from '../../services/teaEvolutionTemplateService';
import { useProceduresAdminQuery } from '../../hooks/useProceduresAdminQuery';
import { useTeaEvolutionTemplatesQuery } from '../../hooks/useTeaEvolutionTemplatesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './TeaEvolucaoTemplates.css';

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
    <Box className="tea-evotemplates-page">
      <Header back={{ label: 'Voltar', onClick: () => navigate('/tea') }} />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%" className="tea-evotemplates-shell">
        <Box className="tea-evotemplates-hero">
          <Text className="tea-evotemplates-eyebrow">OPERAÇÃO CLÍNICA · TERAPIAS</Text>
          <Text className="tea-evotemplates-title" fw={700} size="2xl">Templates da Evolução de Terapias</Text>
          <Text className="tea-evotemplates-subtitle" size="sm">Padronize campos por procedimento</Text>
        </Box>

        <Paper p={isMobile ? 'sm' : 'md'} className="tea-evotemplates-panel">
          <Stack gap="lg">
            {isEditing && (
              <Badge variant="light" color="orange" size="lg" style={{ alignSelf: 'flex-start' }}>
                Editando template existente
              </Badge>
            )}

            <Box className="tea-evotemplates-section">
              <Text className="tea-evotemplates-section-title">Procedimento</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
                <Select
                  label="Procedimento"
                  placeholder="Selecione o procedimento"
                  data={procedureOptions}
                  value={form.procedureId || null}
                  onChange={(value) => setForm((prev) => ({ ...prev, procedureId: value || '' }))}
                  searchable
                  disabled={isEditing}
                />
                <TextInput
                  label="Nome interno do template"
                  placeholder="Ex.: Fonoaudiologia padrão"
                  value={form.name}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({ ...prev, name: value }));
                  }}
                />
              </SimpleGrid>
            </Box>

            <Box className="tea-evotemplates-section">
              <Text className="tea-evotemplates-section-title">Conteúdo padrão</Text>
              <Stack gap="md">
                <Textarea
                  label="Objetivo padrão"
                  minRows={2}
                  value={form.sessionGoal}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({ ...prev, sessionGoal: value }));
                  }}
                />
                <Textarea
                  label="Intervenção padrão"
                  minRows={2}
                  value={form.interventionSummary}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({ ...prev, interventionSummary: value }));
                  }}
                />
                <Textarea
                  label="Resposta padrão"
                  minRows={2}
                  value={form.patientResponse}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({ ...prev, patientResponse: value }));
                  }}
                />
                <TagsInput
                  label="Estratégias padrão"
                  placeholder="Digite e pressione Enter"
                  value={form.strategiesUsed}
                  onChange={(value) => setForm((prev) => ({ ...prev, strategiesUsed: value }))}
                  clearable
                />
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="md">
                  <Textarea
                    label="Devolutiva padrão"
                    minRows={2}
                    value={form.familyFeedback}
                    onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({ ...prev, familyFeedback: value }));
                  }}
                  />
                  <Textarea
                    label="Plano de casa padrão"
                    minRows={2}
                    value={form.homePlan}
                    onChange={(e) => {
                    const value = e.currentTarget.value;
                    setForm((prev) => ({ ...prev, homePlan: value }));
                  }}
                  />
                </SimpleGrid>
                <Box p="md" className="ui-toggle-card">
                  <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                    <Box>
                      <Text fw={600} size="sm">Template ativo</Text>
                      <Text size="xs" c="dimmed">Templates inativos deixam de aparecer na lista de seleção rápida.</Text>
                    </Box>
                    <Switch
                      label={form.isActive ? 'Ativo' : 'Inativo'}
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.currentTarget.checked }))}
                    />
                  </Group>
                </Box>
              </Stack>
            </Box>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setForm({ ...emptyForm })}>{isEditing ? 'Cancelar edição' : 'Limpar'}</Button>
              <Button onClick={handleSave} loading={saving}>{isEditing ? 'Atualizar' : 'Salvar template'}</Button>
            </Group>
          </Stack>
        </Paper>

        <Paper p={isMobile ? 'sm' : 'md'} className="tea-evotemplates-panel tea-evotemplates-history">
          <Text fw={700} className="tea-evotemplates-panel-title">Templates cadastrados</Text>

          {(loading || isFetching) ? (
            <Stack gap="sm">
              {Array.from({ length: 3 }).map((_, index) => (
                <Paper key={index} p="sm" withBorder className="tea-evotemplates-card">
                  <Skeleton height={16} width="30%" mb={10} radius="xl" />
                  <Skeleton height={12} width="46%" mb={8} radius="xl" />
                  <Skeleton height={10} width="72%" mb={8} radius="xl" />
                  <Skeleton height={24} width="34%" radius="xl" />
                </Paper>
              ))}
            </Stack>
          ) : items.length === 0 ? (
            <Text size="sm" c="dimmed" className="tea-evotemplates-empty">Nenhum template cadastrado.</Text>
          ) : (
            <Stack gap="sm">
              {items.map((item: any) => (
                <Paper key={item.id} p="md" withBorder className="tea-evotemplates-card">
                  <Group justify="space-between" align="flex-start" gap="sm">
                    <Box>
                      <Group gap={6}>
                        <Text fw={700}>{item.procedure?.name || 'Procedimento'}</Text>
                        <Badge color={item.isActive ? 'green' : 'gray'} variant="light">{item.isActive ? 'Ativo' : 'Inativo'}</Badge>
                      </Group>
                      {item.name && <Text size="xs" c="dimmed">{item.name}</Text>}
                    </Box>
                    <Group gap={4}>
                      <ActionIcon variant="subtle" color="blue" onClick={() => startEdit(item)} aria-label="Editar template"><Pencil size={16} /></ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDeactivate(String(item.id))} aria-label="Desativar template"><Trash2 size={16} /></ActionIcon>
                    </Group>
                  </Group>

                  {item.sessionGoal && <Text size="sm" mt="sm"><Text span fw={700} inherit>Objetivo: </Text>{item.sessionGoal}</Text>}
                  {item.interventionSummary && <Text size="sm" mt="xs"><Text span fw={700} inherit>Intervenção: </Text>{item.interventionSummary}</Text>}
                  {Array.isArray(item.strategiesUsed) && item.strategiesUsed.length > 0 && (
                    <Group gap={6} mt="sm">
                      {item.strategiesUsed.map((s: string) => <Badge key={`${item.id}-${s}`} size="xs" variant="outline" color="blue">{s}</Badge>)}
                    </Group>
                  )}
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
