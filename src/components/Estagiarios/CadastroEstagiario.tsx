import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  MultiSelect,
  DateInput,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@/components/ui';
import { useMediaQuery } from '@/components/ui';
import { GraduationCap, MoreVertical, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { showNotification } from '@/components/ui';
import { onlyDigits, formatCPF, formatPhone } from '../../utils/formatters';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useInternsAdminQuery } from '../../hooks/useInternsAdminQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useEspecialidadesAdminQuery } from '../../hooks/useEspecialidadesAdminQuery';
import internService, { type InternPayload } from '../../services/internService';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
import './CadastroEstagiario.css';

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

function dateStringToDate(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dateToDateString(value: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CadastroEstagiario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
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

  const isLoading = internsQuery.isLoading;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/dashboard?secao=cadastros-clinicos') }} />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Box className="cadastro-estagiario-hero">
          <Text className="cadastro-estagiario-eyebrow">CADASTROS CLÍNICOS</Text>
          <Text className="cadastro-estagiario-title" fw={700} size="2xl">Cadastro de Estagiários</Text>
          <Text className="cadastro-estagiario-subtitle" size="sm">Gerencie estagiários e seus profissionais responsáveis.</Text>
        </Box>

        <Paper className="cadastro-estagiario-panel" p="md" withBorder radius="md">
          <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
            <Text fw={600} size="lg">Estagiários cadastrados</Text>
            <Group gap="sm" wrap={isMobile ? 'wrap' : 'nowrap'} align="center" className="cadastro-estagiario-actions">
              <TextInput
                className="cadastro-estagiario-search"
                placeholder="Buscar por nome"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                leftSection={<Search size={16} aria-hidden="true" />}
              />
              <Button leftSection={<UserPlus size={16} />} onClick={openNew}>
                Novo estagiário
              </Button>
            </Group>
          </Group>

          {isLoading ? (
            isMobile ? (
              <Stack gap="sm">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Paper key={idx} className="cadastro-estagiario-card" withBorder radius="md" p="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={8} style={{ flex: 1 }}>
                        <Skeleton height={18} width="55%" radius="sm" />
                        <Skeleton height={14} width="40%" radius="sm" />
                        <Skeleton height={14} width="60%" radius="sm" />
                      </Stack>
                      <Skeleton height={24} width={70} radius="xl" />
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Box className="cadastro-estagiario-table-wrap">
                <Table verticalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th className="cadastro-estagiario-th">Estagiário</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Unidade</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Especialidade</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Instituição / curso</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Turno</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Profissionais responsáveis</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Status</Table.Th>
                      <Table.Th className="cadastro-estagiario-th">Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Table.Tr key={idx} className="cadastro-estagiario-row">
                        <Table.Td><Skeleton height={16} width="80%" radius="sm" /></Table.Td>
                        <Table.Td><Skeleton height={16} width="60%" radius="sm" /></Table.Td>
                        <Table.Td><Skeleton height={16} width="60%" radius="sm" /></Table.Td>
                        <Table.Td><Skeleton height={16} width="70%" radius="sm" /></Table.Td>
                        <Table.Td><Skeleton height={16} width="50%" radius="sm" /></Table.Td>
                        <Table.Td><Skeleton height={16} width="80%" radius="sm" /></Table.Td>
                        <Table.Td><Skeleton height={24} width={70} radius="xl" /></Table.Td>
                        <Table.Td><Skeleton height={28} width={60} radius="sm" /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            )
          ) : interns.length === 0 ? (
            <Paper className="cadastro-estagiario-empty" withBorder radius="md" p="xl">
              <Text size="sm" c="dimmed" ta="center">Nenhum estagiário cadastrado.</Text>
            </Paper>
          ) : isMobile ? (
            <Stack gap="sm">
              {interns.map((intern) => (
                <Paper key={intern.id} className="cadastro-estagiario-card" withBorder radius="md" p="md">
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Box className="cadastro-estagiario-icon-badge">
                        <GraduationCap size={18} />
                      </Box>
                      <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" truncate>{intern.name}</Text>
                        <Text size="xs" c="dimmed" truncate>{intern.email || (intern.phone ? formatPhone(intern.phone) : 'Sem contato informado')}</Text>
                      </Box>
                    </Group>
                    <Badge color={intern.isActive ? 'green' : 'gray'} variant="light" size="sm">
                      {intern.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Group>
                  <Stack gap={2} mt="sm">
                    <Text size="xs" c="dimmed">Unidade: {intern.branch?.tradeName || '-'}</Text>
                    <Text size="xs" c="dimmed">Especialidade: {intern.especialidade?.name || '-'}</Text>
                    <Text size="xs" c="dimmed">
                      Turno: {intern.workingSchedules?.length ? intern.workingSchedules.map((schedule) => `${schedule.hoursStart}–${schedule.hoursEnd}`).join(', ') : '-'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Responsáveis: {intern.professionals?.length ? intern.professionals.map((professional) => professional.name).join(', ') : 'Nenhum vinculado'}
                    </Text>
                  </Stack>
                  <Group justify="flex-end" mt="sm">
                    <Menu shadow="md" width={180} position="bottom-end" withArrow>
                      <Menu.Target>
                        <ActionIcon variant="light" size="sm" aria-label="Ações do estagiário">
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Pencil size={14} />} onClick={() => openEdit(intern)}>
                          Editar
                        </Menu.Item>
                        <Menu.Item leftSection={<Trash2 size={14} />} color="red" onClick={() => remove(intern.id)}>
                          Excluir
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Box className="cadastro-estagiario-table-wrap">
              <Table verticalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="cadastro-estagiario-th">Estagiário</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Unidade</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Especialidade</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Instituição / curso</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Turno</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Profissionais responsáveis</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Status</Table.Th>
                    <Table.Th className="cadastro-estagiario-th">Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {interns.map((intern) => (
                    <Table.Tr key={intern.id} className="cadastro-estagiario-row">
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Box className="cadastro-estagiario-icon-badge">
                            <GraduationCap size={18} />
                          </Box>
                          <Box style={{ minWidth: 0 }}>
                            <Text fw={600} size="sm">{intern.name}</Text>
                            <Text size="xs" c="dimmed">{intern.email || (intern.phone ? formatPhone(intern.phone) : 'Sem contato informado')}</Text>
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td><Text size="sm">{intern.branch?.tradeName || '-'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{intern.especialidade?.name || '-'}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm">{intern.institution || '-'}</Text>
                        {intern.course ? <Text size="xs" c="dimmed">{intern.course}</Text> : null}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {intern.workingSchedules?.length ? intern.workingSchedules.map((schedule) => `${schedule.hoursStart}–${schedule.hoursEnd}`).join(', ') : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={intern.professionals?.length ? undefined : 'dimmed'}>
                          {intern.professionals?.length ? intern.professionals.map((professional) => professional.name).join(', ') : 'Nenhum vinculado'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={intern.isActive ? 'green' : 'gray'} variant="light" size="sm">
                          {intern.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <ActionIcon variant="light" size="sm" aria-label="Editar estagiário" onClick={() => openEdit(intern)}>
                            <Pencil size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" color="red" size="sm" aria-label="Excluir estagiário" onClick={() => remove(intern.id)}>
                            <Trash2 size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Editar estagiário' : 'Novo estagiário'} centered size="lg" fullScreen={isMobile}>
        <form onSubmit={save}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Nome completo" value={form.name} onChange={(event) => update('name', event.currentTarget.value)} required />
              <TextInput
                label="CPF"
                value={formatCPF(form.cpf || '')}
                onChange={(event) => update('cpf', onlyDigits(event.currentTarget.value))}
                maxLength={14}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select label="Unidade de atuação" placeholder="Selecione a unidade" data={branchOptions} value={form.branchId || null} onChange={(value) => { update('branchId', value || ''); update('especialidadeId', ''); update('professionalIds', []); }} searchable clearable required />
              <Select label="Especialidade" placeholder="Selecione a especialidade" data={especialidadeOptions} value={form.especialidadeId || null} onChange={(value) => update('especialidadeId', value || '')} searchable clearable />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="E-mail" type="email" value={form.email} onChange={(event) => update('email', event.currentTarget.value)} />
              <TextInput label="Telefone" value={formatPhone(form.phone || '')} onChange={(event) => update('phone', onlyDigits(event.currentTarget.value))} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput label="Instituição de ensino" value={form.institution} onChange={(event) => update('institution', event.currentTarget.value)} />
              <TextInput label="Curso" value={form.course} onChange={(event) => update('course', event.currentTarget.value)} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DateInput label="Início do estágio" value={dateStringToDate(form.startDate)} onChange={(value) => update('startDate', dateToDateString(value))} />
              <DateInput label="Fim do estágio" value={dateStringToDate(form.endDate)} onChange={(value) => update('endDate', dateToDateString(value))} minDate={dateStringToDate(form.startDate) || undefined} />
            </SimpleGrid>
            <Paper className="cadastro-estagiario-panel" withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Box>
                    <Text fw={600} size="sm">Turno de atuação</Text>
                    <Text size="xs" c="dimmed">Use mais de um turno quando a escala variar por dia.</Text>
                  </Box>
                  <Button type="button" variant="light" size="xs" onClick={addSchedule}>
                    Adicionar turno
                  </Button>
                </Group>
                {(form.workingSchedules || []).map((schedule, index) => (
                  <Paper key={`schedule-${index}`} className="cadastro-estagiario-shift-card" withBorder p="sm" radius="sm">
                    <Group align="flex-end" wrap="wrap" gap="sm">
                      <MultiSelect
                        label="Dias de trabalho"
                        data={daysOptions}
                        value={schedule.days}
                        onChange={(values) => updateSchedule(index, 'days', values)}
                        searchable
                        clearable
                        style={{ flex: '1 1 220px' }}
                      />
                      <TextInput label="Horário início" type="time" value={schedule.hoursStart} onChange={(event) => updateSchedule(index, 'hoursStart', event.currentTarget.value)} style={{ flex: '1 1 120px' }} />
                      <TextInput label="Horário fim" type="time" value={schedule.hoursEnd} onChange={(event) => updateSchedule(index, 'hoursEnd', event.currentTarget.value)} style={{ flex: '1 1 120px' }} />
                      <ActionIcon type="button" variant="subtle" color="red" aria-label="Remover turno" onClick={() => removeSchedule(index)}>
                        <Trash2 size={17} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
                {!(form.workingSchedules || []).length ? <Text size="sm" c="dimmed">Nenhum turno informado.</Text> : null}
              </Stack>
            </Paper>
            <MultiSelect
              label="Profissionais responsáveis"
              placeholder="Selecione um ou mais profissionais"
              data={doctorOptions}
              value={form.professionalIds}
              onChange={(values) => update('professionalIds', values)}
              searchable
              clearable
              disabled={!form.branchId}
              description={!form.branchId ? 'Selecione a unidade para carregar os profissionais.' : undefined}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setOpened(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? 'Atualizar' : 'Cadastrar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
