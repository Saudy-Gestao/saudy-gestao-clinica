import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Group,
  Text,
  Button,
  Stack,
  ActionIcon,
  Switch,
  Tabs,
  Table,

  Paper,
  NumberInput,
  Select,
  Skeleton,
  Menu,

} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { ChevronLeft, Plus, Trash2, MoreVertical, Pencil } from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingTextarea } from '../common/FloatingTextarea';
import insuranceService from '../../services/insuranceService';
import procedureService from '../../services/procedureService';
import { useInsuranceDetailQuery } from '../../hooks/useInsuranceDetailQuery';
import { queryKeys } from '../../lib/queryKeys';
import { resolveApiErrorMessage } from '../../lib/apiError';
const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ProcedureOption {
  id: string;
  name: string;
  tussCode?: string | null;
  appointmentType?: string;
}

interface LinkedProcedure {
  id: string;
  procedureId: string;
  subInsuranceId?: string | null;
  price?: number | null;
  authorizationDays?: number | null;
  isActive: boolean;
  procedure: { id: string; name: string; tussCode?: string | null; appointmentType?: string };
  subInsurance?: { id: string; name: string } | null;
}

function InfoTab({
  form,
  setForm,
  subInsuranceInput,
  setSubInsuranceInput,
  saving,
  onSave,
  isNew,
}: {
  form: any;
  setForm: any;
  subInsuranceInput: string;
  setSubInsuranceInput: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  isNew: boolean;
  isMobile?: boolean;
}) {
  const handleAddSubInsurance = () => {
    const name = subInsuranceInput.trim();
    if (!name) return;
    setForm((prev: any) =>
      prev.subInsurances.includes(name)
        ? prev
        : { ...prev, subInsurances: [...prev.subInsurances, name] },
    );
    setSubInsuranceInput('');
  };

  return (
    <Stack gap="sm" pt="md">
      <FloatingInput
        label="Nome do convênio"
        required
        placeholder="Ex: Unimed"
        value={form.name}
        onChange={(e) => setForm((p: any) => ({ ...p, name: e.currentTarget.value }))}
      />

      <FloatingInput
        label="Código"
        placeholder="Opcional"
        value={form.code}
        onChange={(e) => setForm((p: any) => ({ ...p, code: e.currentTarget.value }))}
      />

      <FloatingTextarea
        label="Descrição"
        placeholder="Detalhes do convênio"
        minRows={3}
        value={form.description}
        onChange={(e) => setForm((p: any) => ({ ...p, description: e.currentTarget.value }))}
      />

      <Text fw={600} size="sm" mt="xs">Configuração TISS</Text>
      <Text size="xs" c="dimmed" mt={-8}>
        Esses dados são usados na geração do XML TISS.
      </Text>

      <FloatingInput
        label="Registro ANS da operadora"
        placeholder="Ex: 123456"
        value={form.tissRegistroAns}
        onChange={(e) => setForm((p: any) => ({ ...p, tissRegistroAns: e.currentTarget.value }))}
      />
      <FloatingInput
        label="CNPJ da operadora"
        placeholder="Somente números"
        value={form.tissOperadoraCnpj}
        onChange={(e) => setForm((p: any) => ({ ...p, tissOperadoraCnpj: e.currentTarget.value }))}
      />
      <FloatingInput
        label="Versão TISS"
        placeholder="Ex: 3.05.00"
        value={form.tissVersao}
        onChange={(e) => setForm((p: any) => ({ ...p, tissVersao: e.currentTarget.value }))}
      />
      <FloatingInput
        label="CNPJ do prestador executante"
        placeholder="Somente números"
        value={form.tissPrestadorCnpj}
        onChange={(e) => setForm((p: any) => ({ ...p, tissPrestadorCnpj: e.currentTarget.value }))}
      />
      <FloatingInput
        label="CNES do prestador executante"
        placeholder="Ex: 1234567"
        value={form.tissPrestadorCnes}
        onChange={(e) => setForm((p: any) => ({ ...p, tissPrestadorCnes: e.currentTarget.value }))}
      />
      <FloatingInput
        label="Código do prestador na operadora"
        placeholder="Código contratado"
        value={form.tissCodigoPrestadorOperadora}
        onChange={(e) => setForm((p: any) => ({ ...p, tissCodigoPrestadorOperadora: e.currentTarget.value }))}
      />

      <Switch
        label="Convênio ativo"
        checked={form.isActive}
        onChange={(e) => setForm((p: any) => ({ ...p, isActive: e.currentTarget.checked }))}
      />

      <Box>
        <FloatingInput
          label="Subconvênio"
          placeholder="Digite e pressione Enter"
          value={subInsuranceInput}
          onChange={(e) => setSubInsuranceInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSubInsurance();
            }
          }}
        />
      </Box>
      <Group gap="xs" mt={-4}>
        {form.subInsurances.map((sub: string) => (
          <Button
            key={sub}
            size="compact-xs"
            variant="light"
            color="blue"
            onClick={() => setForm((p: any) => ({ ...p, subInsurances: p.subInsurances.filter((s: string) => s !== sub) }))}
          >
            {sub} ×
          </Button>
        ))}
      </Group>

      <Group justify="flex-end" mt="md">
        <Button bg={DARK_BLUE} onClick={onSave} loading={saving} disabled={saving}>
          {isNew ? 'Cadastrar' : 'Salvar alterações'}
        </Button>
      </Group>
    </Stack>
  );
}

function ProceduresTab({
  insuranceId,
  subInsurances,
  isMobile,
}: {
  insuranceId: string;
  subInsurances: { id: string; name: string }[];
  isMobile?: boolean;
}) {
  const queryClient = useQueryClient();

  const [linked, setLinked] = useState<LinkedProcedure[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(true);

  const [procedureOptions, setProcedureOptions] = useState<ProcedureOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [searchAdd, setSearchAdd] = useState('');
  const [selectedProcedureOption, setSelectedProcedureOption] = useState<ProcedureOption | null>(null);

  const [adding, setAdding] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [selectedSubInsuranceId, setSelectedSubInsuranceId] = useState<string | null>(null);
  const [addPrice, setAddPrice] = useState<number | string>('');
  const [addAuthDays, setAddAuthDays] = useState<number | string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number | string>('');
  const [editAuthDays, setEditAuthDays] = useState<number | string>('');

  const loadLinked = useCallback(async () => {
    setLoadingLinked(true);
    try {
      const data = await insuranceService.listInsuranceProcedures(insuranceId);
      setLinked(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoadingLinked(false);
    }
  }, [insuranceId]);

  useEffect(() => {
    loadLinked();
  }, [loadLinked]);

  useEffect(() => {
    if (!searchAdd.trim()) {
      if (!selectedProcedureId) setProcedureOptions([]);
      return;
    }
    setLoadingOptions(true);
    const timer = setTimeout(async () => {
      try {
        const data = await procedureService.listProcedures({ search: searchAdd, limit: 30 });
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setProcedureOptions(list.map((p: any) => ({ id: p.id, name: p.name, tussCode: p.tussCode, appointmentType: p.appointmentType })));
      } catch {
        setProcedureOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchAdd, selectedProcedureId]);

  const linkedProcedureIds = new Set(linked.filter((l) => !l.subInsuranceId).map((l) => l.procedureId));

  const handleAdd = async () => {
    if (!selectedProcedureId) {
      notifications.show({ title: 'Erro', message: 'Selecione um procedimento', color: 'red' });
      return;
    }
    setSaving('new');
    try {
      await insuranceService.addInsuranceProcedure(insuranceId, {
        procedureId: selectedProcedureId,
        subInsuranceId: selectedSubInsuranceId || null,
        price: addPrice !== '' ? Number(addPrice) : null,
        authorizationDays: addAuthDays !== '' ? Number(addAuthDays) : null,
      });
      notifications.show({ title: 'Adicionado', message: 'Procedimento vinculado ao convênio', color: 'green' });
      setSelectedProcedureId(null);
      setSelectedProcedureOption(null);
      setSelectedSubInsuranceId(null);
      setAddPrice('');
      setAddAuthDays('');
      setSearchAdd('');
      setProcedureOptions([]);
      setAdding(false);
      await loadLinked();
      queryClient.invalidateQueries({ queryKey: queryKeys.insuranceProcedures });
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao vincular procedimento'), color: 'red' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(id);
    try {
      await insuranceService.updateInsuranceProcedure(insuranceId, id, {
        price: editPrice !== '' ? Number(editPrice) : null,
        authorizationDays: editAuthDays !== '' ? Number(editAuthDays) : null,
      });
      notifications.show({ title: 'Salvo', message: 'Valor atualizado', color: 'green' });
      setEditingId(null);
      await loadLinked();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao atualizar'), color: 'red' });
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await insuranceService.removeInsuranceProcedure(insuranceId, id);
      notifications.show({ title: 'Removido', message: 'Procedimento desvinculado', color: 'green' });
      await loadLinked();
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao remover'), color: 'red' });
    } finally {
      setRemoving(null);
    }
  };

  const subInsuranceOptions = [
    { value: '__main__', label: 'Convênio principal' },
    ...subInsurances.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Stack gap="md" pt="md">
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          {linked.length} procedimento(s) vinculado(s)
        </Text>
        <Button
          bg={DARK_BLUE}
          leftSection={<Plus size={16} />}
          size="sm"
          onClick={() => setAdding((v) => !v)}
        >
          Adicionar procedimento
        </Button>
      </Group>

      {adding && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Text fw={600} size="sm">Vincular procedimento</Text>

            <Select
              label="Procedimento"
              placeholder="Buscar por nome..."
              searchable
              data={(() => {
                const opts = procedureOptions.map((opt) => ({
                  value: opt.id,
                  label: opt.tussCode ? `${opt.name} (${opt.tussCode})` : opt.name,
                  disabled: linkedProcedureIds.has(opt.id),
                }));
                if (selectedProcedureOption && !opts.find((o) => o.value === selectedProcedureOption.id)) {
                  opts.unshift({
                    value: selectedProcedureOption.id,
                    label: selectedProcedureOption.tussCode
                      ? `${selectedProcedureOption.name} (${selectedProcedureOption.tussCode})`
                      : selectedProcedureOption.name,
                    disabled: false,
                  });
                }
                return opts;
              })()}
              value={selectedProcedureId}
              onChange={(v) => {
                setSelectedProcedureId(v);
                const opt = procedureOptions.find((o) => o.id === v) ?? null;
                setSelectedProcedureOption(opt);
              }}
              searchValue={searchAdd}
              onSearchChange={setSearchAdd}
              nothingFoundMessage={loadingOptions ? 'Buscando...' : searchAdd.trim() ? 'Nenhum procedimento encontrado' : 'Digite para buscar'}
              filter={({ options }) => options}
            />

            {subInsurances.length > 0 && (
              <Select
                label="Sub-convênio (opcional)"
                placeholder="Convênio principal"
                data={subInsuranceOptions}
                value={selectedSubInsuranceId ?? '__main__'}
                onChange={(v) => setSelectedSubInsuranceId(v && v !== '__main__' ? v : null)}
                clearable
              />
            )}

            <Group grow>
              <NumberInput
                label="Valor pago pelo convênio (R$)"
                placeholder="0,00"
                decimalScale={2}
                fixedDecimalScale
                decimalSeparator=","
                thousandSeparator="."
                prefix="R$ "
                value={addPrice}
                onChange={setAddPrice}
              />
              <NumberInput
                label="Prazo de autorização (dias)"
                placeholder="Ex: 7"
                min={0}
                allowDecimal={false}
                value={addAuthDays}
                onChange={setAddAuthDays}
              />
            </Group>

            <Group justify="flex-end">
              <Button variant="default" size="sm" onClick={() => { setAdding(false); setSearchAdd(''); setSelectedProcedureId(null); setSelectedProcedureOption(null); setProcedureOptions([]); setAddPrice(''); setAddAuthDays(''); }}>
                Cancelar
              </Button>
              <Button
                bg={DARK_BLUE}
                size="sm"
                loading={saving === 'new'}
                disabled={!selectedProcedureId}
                onClick={handleAdd}
              >
                Vincular
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {loadingLinked ? (
        <Stack gap="xs">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} radius="sm" />)}
        </Stack>
      ) : linked.length === 0 ? (
        <Paper withBorder radius="md" p="xl">
          <Text size="sm" c="dimmed" ta="center">
            Nenhum procedimento vinculado. Clique em "Adicionar procedimento" para começar.
          </Text>
        </Paper>
      ) : isMobile ? (
        <Stack gap="xs">
          {linked.map((item) => (
            <Paper key={item.id} withBorder radius="md" p="md">
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text size="sm" fw={600}>{item.procedure.name}</Text>
                  {item.subInsurance && <Text size="xs" c="dimmed">{item.subInsurance.name}</Text>}
                  {item.procedure.tussCode && <Text size="xs" c="dimmed">TUSS: {item.procedure.tussCode}</Text>}
                  {editingId === item.id ? (
                    <Group gap="xs" mt={4} wrap="wrap">
                      <NumberInput
                        size="xs"
                        placeholder="R$ 0,00"
                        decimalScale={2}
                        fixedDecimalScale
                        decimalSeparator=","
                        thousandSeparator="."
                        prefix="R$ "
                        value={editPrice}
                        onChange={setEditPrice}
                        style={{ width: 120 }}
                      />
                      <NumberInput
                        size="xs"
                        placeholder="Dias"
                        min={0}
                        allowDecimal={false}
                        value={editAuthDays}
                        onChange={setEditAuthDays}
                        style={{ width: 80 }}
                      />
                      <Button size="compact-xs" bg={DARK_BLUE} loading={saving === item.id} onClick={() => handleSaveEdit(item.id)}>Salvar</Button>
                      <Button size="compact-xs" variant="default" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </Group>
                  ) : (
                    <Group gap={6} mt={4}>
                      <Text size="sm" fw={500} c={item.price != null ? 'green' : 'dimmed'}>
                        {item.price != null ? formatCurrency(Number(item.price)) : 'Sem valor'}
                      </Text>
                      {item.authorizationDays != null && (
                        <Text size="xs" c="dimmed">· {item.authorizationDays}d autorização</Text>
                      )}
                    </Group>
                  )}
                </Stack>
                <Menu shadow="md" width={180}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="sm">
                      <MoreVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => { setEditingId(item.id); setEditPrice(item.price ?? ''); setEditAuthDays(item.authorizationDays ?? ''); }}>
                      Editar valor
                    </Menu.Item>
                    <Menu.Item color="red" onClick={() => handleRemove(item.id)} disabled={removing === item.id}>
                      Remover
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing="md" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Procedimento</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>TUSS</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Sub-convênio</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Valor / Prazo autorização</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, textAlign: 'center', width: 90 }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {linked.map((item) => (
                <Table.Tr key={item.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{item.procedure.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{item.procedure.tussCode ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{item.subInsurance?.name ?? 'Principal'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {editingId === item.id ? (
                      <Group gap="xs" wrap="wrap">
                        <NumberInput
                          size="xs"
                          placeholder="R$ 0,00"
                          decimalScale={2}
                          fixedDecimalScale
                          decimalSeparator=","
                          thousandSeparator="."
                          prefix="R$ "
                          value={editPrice}
                          onChange={setEditPrice}
                          style={{ width: 120 }}
                        />
                        <NumberInput
                          size="xs"
                          placeholder="Dias"
                          min={0}
                          allowDecimal={false}
                          value={editAuthDays}
                          onChange={setEditAuthDays}
                          style={{ width: 70 }}
                        />
                        <Button size="compact-xs" bg={DARK_BLUE} loading={saving === item.id} onClick={() => handleSaveEdit(item.id)}>
                          Salvar
                        </Button>
                        <Button size="compact-xs" variant="default" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </Group>
                    ) : (
                      <Group gap={4}>
                        <Text size="sm" fw={500} c={item.price != null ? 'green' : 'dimmed'}>
                          {item.price != null ? formatCurrency(Number(item.price)) : '—'}
                        </Text>
                        {item.authorizationDays != null && (
                          <Text size="xs" c="dimmed">({item.authorizationDays}d)</Text>
                        )}
                      </Group>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Group gap={4} justify="center">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="sm"
                        onClick={() => { setEditingId(item.id); setEditPrice(item.price ?? ''); setEditAuthDays(item.authorizationDays ?? ''); }}
                      >
                        <Pencil size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        loading={removing === item.id}
                        onClick={() => handleRemove(item.id)}
                      >
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
    </Stack>
  );
}

export function ConvenioForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isNew = !id;

  const detailQuery = useInsuranceDetailQuery(id);

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    tissRegistroAns: '',
    tissOperadoraCnpj: '',
    tissVersao: '3.05.00',
    tissPrestadorCnpj: '',
    tissPrestadorCnes: '',
    tissCodigoPrestadorOperadora: '',
    isActive: true,
    subInsurances: [] as string[],
  });
  const [subInsuranceInput, setSubInsuranceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(id);

  // Sub-insurances from detail (with ids) for the Procedures tab
  const subInsurancesWithIds: { id: string; name: string }[] = (() => {
    const data: any = detailQuery.data;
    return Array.isArray(data?.subInsurances)
      ? data.subInsurances.map((s: any) => ({ id: s.id, name: s.name }))
      : [];
  })();

  useEffect(() => {
    const data: any = detailQuery.data;
    if (!data) return;
    setForm({
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      tissRegistroAns: data.tissRegistroAns || '',
      tissOperadoraCnpj: data.tissOperadoraCnpj || '',
      tissVersao: data.tissVersao || '3.05.00',
      tissPrestadorCnpj: data.tissPrestadorCnpj || '',
      tissPrestadorCnes: data.tissPrestadorCnes || '',
      tissCodigoPrestadorOperadora: data.tissCodigoPrestadorOperadora || '',
      isActive: data.isActive ?? true,
      subInsurances: Array.isArray(data.subInsurances)
        ? data.subInsurances.map((s: any) => String(s?.name || s || '').trim()).filter(Boolean)
        : [],
    });
  }, [detailQuery.data]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      notifications.show({ title: 'Erro', message: 'Nome do convênio é obrigatório', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        tissRegistroAns: form.tissRegistroAns.trim() || undefined,
        tissOperadoraCnpj: form.tissOperadoraCnpj.trim() || undefined,
        tissVersao: form.tissVersao.trim() || undefined,
        tissPrestadorCnpj: form.tissPrestadorCnpj.trim() || undefined,
        tissPrestadorCnes: form.tissPrestadorCnes.trim() || undefined,
        tissCodigoPrestadorOperadora: form.tissCodigoPrestadorOperadora.trim() || undefined,
        isActive: form.isActive,
        subInsurances: form.subInsurances,
      };

      if (savedId) {
        await insuranceService.updateInsurance(savedId, payload);
        notifications.show({ title: 'Salvo', message: 'Convênio atualizado', color: 'green' });
        await queryClient.invalidateQueries({ queryKey: queryKeys.insurancesAdmin });
        await queryClient.invalidateQueries({ queryKey: [...queryKeys.insuranceDetail, savedId] });
      } else {
        const created = await insuranceService.createInsurance(payload);
        const newId = created?.id;
        notifications.show({ title: 'Cadastrado', message: 'Convênio cadastrado com sucesso', color: 'green' });
        await queryClient.invalidateQueries({ queryKey: queryKeys.insurancesAdmin });
        setSavedId(newId);
        if (newId) navigate(`/convenios/${newId}`, { replace: true });
      }
    } catch (err: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao salvar convênio'), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = !isNew && detailQuery.isLoading;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : 'xl'} maw={900} mx="auto">
        <Group mb={isMobile ? 20 : 30} align="center">
          <ActionIcon variant="default" size="xl" onClick={() => navigate('/cadastro-convenio')}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Box>
            <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
              {isNew ? 'Novo convênio' : (form.name || 'Convênio')}
            </Text>
            <Text size="sm" c="dimmed">
              {isNew ? 'Preencha as informações do convênio' : 'Editar convênio'}
            </Text>
          </Box>
        </Group>

        {isLoading ? (
          <Stack gap="sm">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={48} radius="sm" />)}
          </Stack>
        ) : (
          <Tabs defaultValue="info">
            <Tabs.List>
              <Tabs.Tab value="info">Informações</Tabs.Tab>
              <Tabs.Tab value="procedures" disabled={isNew && !savedId}>
                Procedimentos
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="info">
              <InfoTab
                form={form}
                setForm={setForm}
                subInsuranceInput={subInsuranceInput}
                setSubInsuranceInput={setSubInsuranceInput}
                saving={saving}
                onSave={handleSave}
                isNew={isNew && !savedId}
                isMobile={isMobile}
              />
            </Tabs.Panel>

            <Tabs.Panel value="procedures">
              {(savedId) ? (
                <ProceduresTab
                  insuranceId={savedId}
                  subInsurances={subInsurancesWithIds}
                  isMobile={isMobile}
                />
              ) : null}
            </Tabs.Panel>
          </Tabs>
        )}
      </Box>
    </Box>
  );
}
