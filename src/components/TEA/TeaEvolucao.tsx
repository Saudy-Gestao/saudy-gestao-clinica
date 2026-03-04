import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Group,
  Text,
  Button,
  Paper,
  Select,
  Textarea,
  NumberInput,
  Stack,
  Badge,
  Loader,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { ChevronLeft, Activity } from 'lucide-react';
import dayjs from 'dayjs';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import teaProfileService from '../../services/teaProfileService';
import doctorService from '../../services/doctorService';
import { DARK_BLUE } from '../../themes/theme';
import { formatCPF } from '../../utils/formatters';

interface TeaProfileOption {
  value: string;
  label: string;
}

interface TherapeuticPlanOption {
  value: string;
  label: string;
}

interface EvolutionForm {
  sessionDate: Date | null;
  therapeuticPlanId: string;
  professionalDoctorId: string;
  professional: string;
  interventionSummary: string;
  patientResponse: string;
  progressScore: number | null;
  notes: string;
}

const INITIAL_FORM: EvolutionForm = {
  sessionDate: new Date(),
  therapeuticPlanId: '',
  professionalDoctorId: '',
  professional: '',
  interventionSummary: '',
  patientResponse: '',
  progressScore: null,
  notes: '',
};

export function TeaEvolucao() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const titleColor = colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : DARK_BLUE;
  const heroBg = colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)';
  const cardBg = colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-white)';

  const [teaProfiles, setTeaProfiles] = useState<any[]>([]);
  const [teaProfileOptions, setTeaProfileOptions] = useState<TeaProfileOption[]>([]);
  const [selectedTeaProfileId, setSelectedTeaProfileId] = useState<string | null>(null);

  const [planOptions, setPlanOptions] = useState<TherapeuticPlanOption[]>([]);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<Array<{ value: string; label: string }>>([]);

  const [form, setForm] = useState<EvolutionForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedProfile = useMemo(
    () => teaProfiles.find((p) => String(p.id) === String(selectedTeaProfileId || '')) || null,
    [teaProfiles, selectedTeaProfileId],
  );

  const loadTeaProfiles = async () => {
    setLoading(true);
    try {
      const data: any = await teaProfileService.list({ limit: 200, offset: 0 });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);

      setTeaProfiles(list);
      const options = list.map((it: any) => ({
        value: String(it.id),
        label: `${it.patient?.name || 'Paciente sem nome'}${it.patient?.cpf ? ` • ${formatCPF(it.patient.cpf)}` : ''}`,
      }));
      setTeaProfileOptions(options);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar pacientes TEA',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async (teaProfileId: string) => {
    try {
      const data: any = await teaProfileService.listPlans(teaProfileId, { isActive: true });
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      setPlanOptions(list.map((it: any) => ({ value: String(it.id), label: it.title || 'Plano sem título' })));
    } catch {
      setPlanOptions([]);
    }
  };

  const loadEvolutions = async (teaProfileId: string) => {
    setLoading(true);
    try {
      const data: any = await teaProfileService.listEvolutions(teaProfileId);
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      setEvolutions(list);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao carregar evoluções',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const data: any = await doctorService.listDoctors();
      const list: any[] = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.data?.items)
            ? data.data.items
            : (Array.isArray(data?.data)
              ? data.data
              : [])));

      const options = list
        .map((doctor: any) => {
          const id = String(doctor?.id || doctor?.doctorId || '').trim();
          const name = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
          return id && name ? { value: id, label: name } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;

      setDoctorOptions(options);
    } catch {
      setDoctorOptions([]);
    }
  };

  useEffect(() => {
    loadTeaProfiles();
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!selectedTeaProfileId) {
      setEvolutions([]);
      setPlanOptions([]);
      return;
    }
    loadPlans(selectedTeaProfileId);
    loadEvolutions(selectedTeaProfileId);
  }, [selectedTeaProfileId]);

  const handleSave = async () => {
    if (!selectedTeaProfileId) {
      showNotification({ title: 'Atenção', message: 'Selecione um paciente TEA', color: 'yellow' });
      return;
    }

    setSaving(true);
    try {
      const selectedDoctor = doctorOptions.find((item) => item.value === form.professionalDoctorId);
      await teaProfileService.createEvolution(selectedTeaProfileId, {
        therapeuticPlanId: form.therapeuticPlanId || undefined,
        sessionDate: form.sessionDate ? dayjs(form.sessionDate).format('YYYY-MM-DD') : undefined,
        professionalDoctorId: form.professionalDoctorId || undefined,
        professional: selectedDoctor?.label || form.professional || undefined,
        interventionSummary: form.interventionSummary || undefined,
        patientResponse: form.patientResponse || undefined,
        progressScore: Number.isFinite(form.progressScore as number) ? Number(form.progressScore) : undefined,
        notes: form.notes || undefined,
      });

      showNotification({ title: 'Sucesso', message: 'Evolução registrada com sucesso', color: 'green' });
      setForm(INITIAL_FORM);
      await loadEvolutions(selectedTeaProfileId);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar evolução',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} w="100%">
        <Group mb={14}>
          <Button variant="subtle" color="dark" leftSection={<ChevronLeft size={18} />} onClick={() => navigate('/tea')}>
            Voltar
          </Button>
          <Box>
            <Text fw={800} size="lg" style={{ color: titleColor }}>Evolução</Text>
            <Text size="sm" c="dimmed">Registro por sessão do paciente TEA</Text>
          </Box>
        </Group>

        <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: heroBg }}>
          <Group gap="sm" mb="sm">
            <ThemeIcon size="lg" variant="light" color="teal"><Activity size={16} /></ThemeIcon>
            <Text fw={700}>Acompanhamento clínico</Text>
          </Group>
          <Stack gap="md">
            <Select
              label="Paciente TEA"
              placeholder={loading ? 'Carregando...' : 'Selecione um paciente'}
              data={teaProfileOptions}
              value={selectedTeaProfileId}
              onChange={setSelectedTeaProfileId}
              searchable
              clearable
            />

            {selectedProfile && (
              <Badge variant="light" color="indigo" size="lg">
                {selectedProfile.patient?.name || 'Paciente'}
              </Badge>
            )}

            <Group grow>
              <DateInput
                label="Data da sessão"
                value={form.sessionDate}
                onChange={(value) => setForm((prev) => ({ ...prev, sessionDate: value ? new Date(value) : null }))}
                valueFormat="DD/MM/YYYY"
                locale="pt-br"
              />
              <Select
                label="Plano terapêutico (opcional)"
                data={planOptions}
                value={form.therapeuticPlanId}
                onChange={(value) => setForm((prev) => ({ ...prev, therapeuticPlanId: value || '' }))}
                searchable
                clearable
              />
              <Select
                label="Profissional"
                data={doctorOptions}
                value={form.professionalDoctorId}
                onChange={(value) => {
                  const doctorId = value || '';
                  const selectedDoctor = doctorOptions.find((item) => item.value === doctorId);
                  setForm((prev) => ({
                    ...prev,
                    professionalDoctorId: doctorId,
                    professional: selectedDoctor?.label || '',
                  }));
                }}
                searchable
                clearable
                nothingFoundMessage="Nenhum médico encontrado"
              />
            </Group>

            <Textarea
              label="Intervenção realizada"
              minRows={2}
              value={form.interventionSummary}
              onChange={(e) => setForm((prev) => ({ ...prev, interventionSummary: e.currentTarget.value }))}
            />

            <Textarea
              label="Resposta do paciente"
              minRows={2}
              value={form.patientResponse}
              onChange={(e) => setForm((prev) => ({ ...prev, patientResponse: e.currentTarget.value }))}
            />

            <Group grow>
              <NumberInput
                label="Score de progresso (0-10)"
                value={form.progressScore ?? undefined}
                onChange={(value) => setForm((prev) => ({ ...prev, progressScore: typeof value === 'number' ? value : null }))}
                min={0}
                max={10}
              />
              <Textarea
                label="Observações"
                minRows={1}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.currentTarget.value }))}
              />
            </Group>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setForm(INITIAL_FORM)}>Limpar</Button>
              <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving}>Salvar evolução</Button>
            </Group>

            <Text fw={600}>Evoluções registradas</Text>
            {loading ? (
              <Group justify="center"><Loader size="sm" /></Group>
            ) : evolutions.length === 0 ? (
              <Text size="sm" c="dimmed">Nenhuma evolução registrada.</Text>
            ) : (
              <Stack gap="xs">
                {evolutions.map((item: any) => (
                  <Paper key={item.id} p="sm" withBorder style={{ borderColor: 'var(--mantine-color-default-border)', background: cardBg }}>
                    <Text fw={600}>{dayjs(item.sessionDate).format('DD/MM/YYYY')} • {item.professional || 'Profissional não informado'}</Text>
                    <Text size="xs" c="dimmed">Plano: {item.therapeuticPlan?.title || 'Não vinculado'}</Text>
                    {item.interventionSummary && <Text size="sm" mt={4}>{item.interventionSummary}</Text>}
                    {item.patientResponse && <Text size="xs" c="dimmed" mt={4}>Resposta: {item.patientResponse}</Text>}
                    {Number.isFinite(item.progressScore) && <Text size="xs" c="dimmed">Score: {item.progressScore}</Text>}
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
