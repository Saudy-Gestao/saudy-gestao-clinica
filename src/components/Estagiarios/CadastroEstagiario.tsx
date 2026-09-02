import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Modal, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { ChevronLeft, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingSelect } from '../common/FloatingSelect';
import { showNotification } from '@mantine/notifications';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useInternsAdminQuery } from '../../hooks/useInternsAdminQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import internService, { type InternPayload } from '../../services/internService';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

type Intern = InternPayload & {
  id: string;
  isActive: boolean;
  branch?: { id: string; tradeName: string; isMatriz: boolean } | null;
  especialidade?: { id: string; name: string } | null;
  professionals?: { id: string; name: string }[];
};
type WorkingSchedule = { days: string[]; hoursStart: string; hoursEnd: string };

const daysOptions = [
  { value: 'Segunda', label: 'Segunda' }, { value: 'Terca', label: 'Terça' }, { value: 'Quarta', label: 'Quarta' },
  { value: 'Quinta', label: 'Quinta' }, { value: 'Sexta', label: 'Sexta' }, { value: 'Sabado', label: 'Sábado' },
  { value: 'Domingo', label: 'Domingo' },
];

const EMPTY_FORM: InternPayload = {
  name: '', branchId: '', especialidadeId: '', cpf: '', email: '', phone: '', institution: '', course: '', startDate: '', endDate: '', professionalIds: [],
  workingDays: [], workingHoursStart: '', workingHoursEnd: '', workingSchedules: [],
};

export function CadastroEstagiario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Intern | null>(null);
  const [form, setForm] = useState<InternPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const internsQuery = useInternsAdminQuery(search);
  const branchesQuery = useSettingsBranchesQuery();
  const especialidadesQuery = useEspecialidadesAdminQuery();
  const doctorsQuery = useDoctorsAdminQuery(form.branchId || undefined);
  const interns: Intern[] = Array.isArray(internsQuery.data) ? internsQuery.data : [];
  const branches: any[] = Array.isArray(branchesQuery.data)
    ? branchesQuery.data
    : Array.isArray((branchesQuery.data as any)?.items) ? (branchesQuery.data as any).items
      : Array.isArray((branchesQuery.data as any)?.data) ? (branchesQuery.data as any).data : [];
  const especialidades: any[] = Array.isArray(especialidadesQuery.data)
    ? especialidadesQuery.data
    : Array.isArray((especialidadesQuery.data as any)?.items) ? (especialidadesQuery.data as any).items
      : Array.isArray((especialidadesQuery.data as any)?.data) ? (especialidadesQuery.data as any).data : [];
  const branchOptions = useMemo(() => branches
    .filter((branch) => branch?.id && branch.isActive !== false)
    .map((branch) => ({ value: String(branch.id), label: branch.tradeName || branch.socialName || branch.name || 'Unidade' })), [branches]);
  const especialidadeOptions = useMemo(() => especialidades
    .filter((especialidade) => especialidade?.id && especialidade.isActive !== false)
    .filter((especialidade) => !form.branchId || !especialidade.branchId || especialidade.branchId === form.branchId)
    .map((especialidade) => ({ value: String(especialidade.id), label: especialidade.name })), [especialidades, form.branchId]);
  const doctorOptions = useMemo(() => {
    const doctors: any[] = Array.isArray(doctorsQuery.data) ? doctorsQuery.data : [];
    return doctors.filter((doctor) => doctor?.id && doctor.isActive !== false).map((doctor) => ({ value: String(doctor.id), label: doctor.name }));
  }, [doctorsQuery.data]);
  const update = (key: keyof InternPayload, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const getInternSchedules = (intern: Intern): WorkingSchedule[] => {
    if (intern.workingSchedules?.length) return intern.workingSchedules;
    if (intern.workingDays?.length && intern.workingHoursStart && intern.workingHoursEnd) {
      return [{ days: intern.workingDays, hoursStart: intern.workingHoursStart, hoursEnd: intern.workingHoursEnd }];
    }
    return [];
  };
  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, branchId: branchOptions.length === 1 ? branchOptions[0].value : '', professionalIds: [], workingSchedules: [] });
    setOpened(true);
  };
  const openEdit = (intern: Intern) => {
    const schedules = getInternSchedules(intern);
    setEditing(intern);
    setForm({ ...EMPTY_FORM, ...intern, branchId: intern.branchId || intern.branch?.id || '', especialidadeId: intern.especialidadeId || intern.especialidade?.id || '', professionalIds: intern.professionalIds || intern.professionals?.map((professional) => professional.id) || [], workingSchedules: schedules });
    setOpened(true);
  };
  useEffect(() => {
    if (opened && !form.branchId && branchOptions.length === 1) update('branchId', branchOptions[0].value);
  }, [branchOptions, form.branchId, opened]);
  const addSchedule = () => update('workingSchedules', [...(form.workingSchedules || []), { days: [], hoursStart: '', hoursEnd: '' }]);
  const updateSchedule = (index: number, key: keyof WorkingSchedule, value: string | string[]) => update('workingSchedules', (form.workingSchedules || []).map((schedule, scheduleIndex) => scheduleIndex === index ? { ...schedule, [key]: value } : schedule));
  const removeSchedule = (index: number) => update('workingSchedules', (form.workingSchedules || []).filter((_, scheduleIndex) => scheduleIndex !== index));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return showNotification({ title: 'Campo obrigatório', message: 'Informe o nome do estagiário.', color: 'red' });
    if (!form.branchId) return showNotification({ title: 'Campo obrigatório', message: 'Informe a unidade de atuação.', color: 'red' });
    setSaving(true);
    try {
      if (editing) await internService.updateIntern(editing.id, form);
      else await internService.createIntern(form);
      await queryClient.invalidateQueries({ queryKey: queryKeys.internsAdmin });
      setOpened(false);
      showNotification({ title: editing ? 'Estagiário atualizado' : 'Estagiário cadastrado', message: 'Dados salvos com sucesso.', color: 'green' });
    } catch (error) { showNotification({ title: 'Erro', message: resolveApiErrorMessage(error, 'Não foi possível salvar o estagiário.'), color: 'red' }); }
    finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Deseja remover este estagiário?')) return;
    try { await internService.deleteIntern(id); await queryClient.invalidateQueries({ queryKey: queryKeys.internsAdmin }); showNotification({ title: 'Estagiário removido', message: 'Registro removido com sucesso.', color: 'green' }); }
    catch (error) { showNotification({ title: 'Erro', message: resolveApiErrorMessage(error, 'Não foi possível remover o estagiário.'), color: 'red' }); }
  };
  return <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}><Header /><Box maw={1400} mx="auto" p="xl"><Stack gap="lg">
    <Group justify="space-between"><Group><ActionIcon variant="default" size="xl" onClick={() => navigate('/dashboard?secao=cadastros-clinicos')}><ChevronLeft size={24} /></ActionIcon><Box><Title order={2}>Cadastro de Estagiários</Title><Text c="dimmed">Gerencie estagiários e seus profissionais responsáveis.</Text></Box></Group><Button leftSection={<Plus size={18} />} onClick={openNew}>Novo estagiário</Button></Group>
    <Paper withBorder p="lg"><Group justify="space-between" mb="md"><Title order={4}>Estagiários cadastrados</Title><Box w={320}><FloatingInput label="Buscar estagiários" value={search} onChange={(event) => setSearch(event.currentTarget.value)} /></Box></Group>
      <Table.ScrollContainer minWidth={1060}><Table verticalSpacing="md"><Table.Thead><Table.Tr><Table.Th>Estagiário</Table.Th><Table.Th>Unidade</Table.Th><Table.Th>Especialidade</Table.Th><Table.Th>Instituição / curso</Table.Th><Table.Th>Turno</Table.Th><Table.Th>Profissionais responsáveis</Table.Th><Table.Th>Status</Table.Th><Table.Th>Ações</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{interns.map((intern) => <Table.Tr key={intern.id}><Table.Td><Group gap="sm"><ActionIcon variant="light" color="blue"><GraduationCap size={18} /></ActionIcon><Box><Text fw={600}>{intern.name}</Text><Text size="xs" c="dimmed">{intern.email || intern.phone || 'Sem contato informado'}</Text></Box></Group></Table.Td><Table.Td>{intern.branch?.tradeName || '-'}</Table.Td><Table.Td>{intern.especialidade?.name || '-'}</Table.Td><Table.Td>{intern.institution || '-'}{intern.course ? <Text size="xs" c="dimmed">{intern.course}</Text> : null}</Table.Td><Table.Td>{intern.workingSchedules?.length ? intern.workingSchedules.map((schedule) => `${schedule.hoursStart}–${schedule.hoursEnd}`).join(', ') : '-'}</Table.Td><Table.Td>{intern.professionals?.length ? intern.professionals.map((professional) => professional.name).join(', ') : <Text c="dimmed">Nenhum vinculado</Text>}</Table.Td><Table.Td><Badge color={intern.isActive ? 'green' : 'gray'}>{intern.isActive ? 'ATIVO' : 'INATIVO'}</Badge></Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => openEdit(intern)}><Pencil size={17} /></ActionIcon><ActionIcon variant="subtle" color="red" onClick={() => remove(intern.id)}><Trash2 size={17} /></ActionIcon></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>{!internsQuery.isLoading && interns.length === 0 ? <Text ta="center" c="dimmed" py="xl">Nenhum estagiário cadastrado.</Text> : null}</Paper>
    </Stack></Box>
    <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Editar estagiário' : 'Novo estagiário'} centered size="lg">
      <form onSubmit={save}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <FloatingInput label="Nome completo" value={form.name} onChange={(event) => update('name', event.currentTarget.value)} required />
            <FloatingInput label="CPF" value={form.cpf} onChange={(event) => update('cpf', event.currentTarget.value)} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <FloatingSelect label="Unidade de atuação" placeholder="Selecione a unidade" data={branchOptions} value={form.branchId || null} onChange={(value) => { update('branchId', value || ''); update('especialidadeId', ''); update('professionalIds', []); }} searchable clearable required />
            <FloatingSelect label="Especialidade" placeholder="Selecione a especialidade" data={especialidadeOptions} value={form.especialidadeId || null} onChange={(value) => update('especialidadeId', value || '')} searchable clearable />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <FloatingInput label="E-mail" type="email" value={form.email} onChange={(event) => update('email', event.currentTarget.value)} />
            <FloatingInput label="Telefone" value={form.phone} onChange={(event) => update('phone', event.currentTarget.value)} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <FloatingInput label="Instituição de ensino" value={form.institution} onChange={(event) => update('institution', event.currentTarget.value)} />
            <FloatingInput label="Curso" value={form.course} onChange={(event) => update('course', event.currentTarget.value)} />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <FloatingInput label="Início do estágio" type="date" value={form.startDate} onChange={(event) => update('startDate', event.currentTarget.value)} />
            <FloatingInput label="Fim do estágio" type="date" value={form.endDate} onChange={(event) => update('endDate', event.currentTarget.value)} />
          </SimpleGrid>
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group justify="space-between"><Box><Text fw={600}>Turno de atuação</Text><Text size="xs" c="dimmed">Use mais de um turno quando a escala variar por dia.</Text></Box><Button type="button" variant="light" size="xs" onClick={addSchedule}>Adicionar turno</Button></Group>
              {(form.workingSchedules || []).map((schedule, index) => <Paper key={`schedule-${index}`} withBorder p="sm" radius="sm"><Stack gap="sm"><Group align="flex-end" wrap="nowrap"><FloatingMultiSelect label="Dias de trabalho" data={daysOptions} value={schedule.days} onChange={(values) => updateSchedule(index, 'days', values)} searchable clearable /><FloatingInput label="Horário início" type="time" value={schedule.hoursStart} onChange={(event) => updateSchedule(index, 'hoursStart', event.currentTarget.value)} /><FloatingInput label="Horário fim" type="time" value={schedule.hoursEnd} onChange={(event) => updateSchedule(index, 'hoursEnd', event.currentTarget.value)} /><ActionIcon type="button" variant="subtle" color="red" aria-label="Remover turno" onClick={() => removeSchedule(index)}><Trash2 size={17} /></ActionIcon></Group></Stack></Paper>)}
              {!(form.workingSchedules || []).length ? <Text size="sm" c="dimmed">Nenhum turno informado.</Text> : null}
            </Stack>
          </Paper>
          <FloatingMultiSelect label="Profissionais responsáveis" placeholder="Selecione um ou mais profissionais" data={doctorOptions} value={form.professionalIds} onChange={(values) => update('professionalIds', values)} searchable clearable disabled={!form.branchId} description={!form.branchId ? 'Selecione a unidade para carregar os profissionais.' : undefined} />
          <Group justify="flex-end" mt="sm"><Button variant="default" onClick={() => setOpened(false)}>Cancelar</Button><Button type="submit" loading={saving}>{editing ? 'Atualizar' : 'Cadastrar'}</Button></Group>
        </Stack>
      </form>
    </Modal>
  </Box>;
}
