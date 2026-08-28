import { useMemo, useState, type FormEvent } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Modal, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { ChevronLeft, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { showNotification } from '@mantine/notifications';
import { useDoctorsAdminQuery } from '../../hooks/useDoctorsAdminQuery';
import { useInternsAdminQuery } from '../../hooks/useInternsAdminQuery';
import internService, { type InternPayload } from '../../services/internService';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';

type Intern = InternPayload & { id: string; isActive: boolean; professionals?: { id: string; name: string }[] };
const EMPTY_FORM: InternPayload = { name: '', cpf: '', email: '', phone: '', institution: '', course: '', startDate: '', endDate: '', professionalIds: [] };

export function CadastroEstagiario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Intern | null>(null);
  const [form, setForm] = useState<InternPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const internsQuery = useInternsAdminQuery(search);
  const doctorsQuery = useDoctorsAdminQuery();
  const interns: Intern[] = Array.isArray(internsQuery.data) ? internsQuery.data : [];
  const doctorOptions = useMemo(() => {
    const doctors: any[] = Array.isArray(doctorsQuery.data) ? doctorsQuery.data : [];
    return doctors.filter((doctor) => doctor?.id && doctor.isActive !== false).map((doctor) => ({ value: String(doctor.id), label: doctor.name }));
  }, [doctorsQuery.data]);
  const update = (key: keyof InternPayload, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));
  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM, professionalIds: [] }); setOpened(true); };
  const openEdit = (intern: Intern) => { setEditing(intern); setForm({ ...intern, professionalIds: intern.professionalIds || intern.professionals?.map((professional) => professional.id) || [] }); setOpened(true); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return showNotification({ title: 'Campo obrigatório', message: 'Informe o nome do estagiário.', color: 'red' });
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
      <Table.ScrollContainer minWidth={760}><Table verticalSpacing="md"><Table.Thead><Table.Tr><Table.Th>Estagiário</Table.Th><Table.Th>Instituição / curso</Table.Th><Table.Th>Profissionais responsáveis</Table.Th><Table.Th>Status</Table.Th><Table.Th>Ações</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{interns.map((intern) => <Table.Tr key={intern.id}><Table.Td><Group gap="sm"><ActionIcon variant="light" color="blue"><GraduationCap size={18} /></ActionIcon><Box><Text fw={600}>{intern.name}</Text><Text size="xs" c="dimmed">{intern.email || intern.phone || 'Sem contato informado'}</Text></Box></Group></Table.Td><Table.Td>{intern.institution || '-'}{intern.course ? <Text size="xs" c="dimmed">{intern.course}</Text> : null}</Table.Td><Table.Td>{intern.professionals?.length ? intern.professionals.map((professional) => professional.name).join(', ') : <Text c="dimmed">Nenhum vinculado</Text>}</Table.Td><Table.Td><Badge color={intern.isActive ? 'green' : 'gray'}>{intern.isActive ? 'ATIVO' : 'INATIVO'}</Badge></Table.Td><Table.Td><Group gap="xs"><ActionIcon variant="subtle" onClick={() => openEdit(intern)}><Pencil size={17} /></ActionIcon><ActionIcon variant="subtle" color="red" onClick={() => remove(intern.id)}><Trash2 size={17} /></ActionIcon></Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>{!internsQuery.isLoading && interns.length === 0 ? <Text ta="center" c="dimmed" py="xl">Nenhum estagiário cadastrado.</Text> : null}</Paper>
    </Stack></Box>
    <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Editar estagiário' : 'Novo estagiário'} centered size="lg"><form onSubmit={save}><Stack gap="md"><SimpleGrid cols={{ base: 1, sm: 2 }}><FloatingInput label="Nome completo" value={form.name} onChange={(event) => update('name', event.currentTarget.value)} required /><FloatingInput label="CPF" value={form.cpf} onChange={(event) => update('cpf', event.currentTarget.value)} /></SimpleGrid><SimpleGrid cols={{ base: 1, sm: 2 }}><FloatingInput label="E-mail" type="email" value={form.email} onChange={(event) => update('email', event.currentTarget.value)} /><FloatingInput label="Telefone" value={form.phone} onChange={(event) => update('phone', event.currentTarget.value)} /></SimpleGrid><SimpleGrid cols={{ base: 1, sm: 2 }}><FloatingInput label="Instituição de ensino" value={form.institution} onChange={(event) => update('institution', event.currentTarget.value)} /><FloatingInput label="Curso" value={form.course} onChange={(event) => update('course', event.currentTarget.value)} /></SimpleGrid><SimpleGrid cols={{ base: 1, sm: 2 }}><FloatingInput label="Início do estágio" type="date" value={form.startDate} onChange={(event) => update('startDate', event.currentTarget.value)} /><FloatingInput label="Fim do estágio" type="date" value={form.endDate} onChange={(event) => update('endDate', event.currentTarget.value)} /></SimpleGrid><FloatingMultiSelect label="Profissionais responsáveis" placeholder="Selecione um ou mais profissionais" data={doctorOptions} value={form.professionalIds} onChange={(values) => update('professionalIds', values)} searchable clearable /><Group justify="flex-end" mt="sm"><Button variant="default" onClick={() => setOpened(false)}>Cancelar</Button><Button type="submit" loading={saving}>{editing ? 'Atualizar' : 'Cadastrar'}</Button></Group></Stack></form></Modal>
  </Box>;
}
