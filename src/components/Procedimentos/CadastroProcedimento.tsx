import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Group,
  Text,
  Title,
  ActionIcon,
  Paper,
  Stack,
  Button,
  TextInput,
  Textarea,
  Switch,
  NumberInput,
  MultiSelect,
  TagsInput,
  SimpleGrid,
  Loader,
  Table,
  Center,
  Tabs
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import doctorService from '../../services/doctorService';
import procedureService from '../../services/procedureService';
import ResultModal from '../common/ResultModal';

interface ProcedureForm {
  name: string;
  description: string;
  price: number | null;
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
  modalities: string[];
  doctorIds: string[];
}

interface ProcedureItem {
  id: string;
  name: string;
  price: number | null;
  acceptsInsurance: boolean;
  acceptedInsurances: string[];
  modalities: string[];
  doctorsCount: number;
}

const INITIAL_FORM: ProcedureForm = {
  name: '',
  description: '',
  price: null,
  acceptsInsurance: false,
  acceptedInsurances: [],
  modalities: [],
  doctorIds: [],
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Title order={5} fw={600} c={DARK_BLUE} mb="sm" mt="md">
      {children}
    </Title>
  );
}

export function CadastroProcedimento() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const [form, setForm] = useState<ProcedureForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [doctorDirectory, setDoctorDirectory] = useState<Record<string, { name?: string }>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedName, setLastCreatedName] = useState<string | null>(null);

  const doctorLabelById = useMemo(() => {
    return doctorOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, [doctorOptions]);

  const filteredProcedures = useMemo(() => {
    const q = procedureQuery.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((item) => item.name.toLowerCase().includes(q));
  }, [procedures, procedureQuery]);

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
  };

  useEffect(() => {
    const loadProcedures = async () => {
      setProceduresLoading(true);
      try {
        const data: any = await procedureService.listProcedures({ limit: 200, offset: 0 });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : (Array.isArray(data?.data)
                ? data.data
                : [])));

        const mapped: ProcedureItem[] = list.map((it: any) => ({
          id: String(it.id ?? it.procedureId ?? ''),
          name: it.name || 'Procedimento',
          price: it.price !== undefined && it.price !== null ? Number(it.price) : null,
          acceptsInsurance: Boolean(it.acceptsInsurance),
          acceptedInsurances: Array.isArray(it.acceptedInsurances) ? it.acceptedInsurances : [],
          modalities: Array.isArray(it.modalities) ? it.modalities : [],
          doctorsCount: Array.isArray(it.doctors) ? it.doctors.length : 0,
        })).filter((item: ProcedureItem) => item.id);

        setProcedures(mapped);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar procedimentos',
          color: 'red',
        });
      } finally {
        setProceduresLoading(false);
      }
    };

    loadProcedures();
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);
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

        const options = list.map((doctor: any) => {
          const id = String(doctor.id ?? doctor.doctorId ?? '');
          const name = doctor.name || doctor.nome || doctor.fullName || 'Sem nome';
          return { value: id, label: name };
        }).filter((item: { value: string }) => item.value);

        const directory = list.reduce<Record<string, { name?: string }>>((acc, doctor: any) => {
          const id = String(doctor.id ?? doctor.doctorId ?? '');
          if (!id) return acc;
          acc[id] = { name: doctor.name || doctor.nome || doctor.fullName || undefined };
          return acc;
        }, {});

        setDoctorOptions(options);
        setDoctorDirectory(directory);
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar medicos',
          color: 'red',
        });
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showNotification({
        title: 'Campo obrigatorio',
        message: 'Informe o nome do procedimento.',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      const doctors = form.doctorIds.map((doctorId) => ({
        doctorId,
        doctorName: doctorLabelById[doctorId] || doctorDirectory[doctorId]?.name || doctorId,
      }));

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: form.price ?? null,
        acceptsInsurance: form.acceptsInsurance,
        acceptedInsurances: form.acceptsInsurance ? form.acceptedInsurances : [],
        modalities: form.modalities,
        doctors,
      };

      await procedureService.createProcedure(payload);
      setLastCreatedName(form.name.trim());
      setShowSuccessModal(true);
      setForm(INITIAL_FORM);
      setProcedureQuery('');
      const refreshed: any = await procedureService.listProcedures({ limit: 200, offset: 0 });
      const list: any[] = Array.isArray(refreshed)
        ? refreshed
        : (Array.isArray(refreshed?.items)
          ? refreshed.items
          : (Array.isArray(refreshed?.data?.items)
            ? refreshed.data.items
            : (Array.isArray(refreshed?.data)
              ? refreshed.data
              : [])));
      const mapped: ProcedureItem[] = list.map((it: any) => ({
        id: String(it.id ?? it.procedureId ?? ''),
        name: it.name || 'Procedimento',
        price: it.price !== undefined && it.price !== null ? Number(it.price) : null,
        acceptsInsurance: Boolean(it.acceptsInsurance),
        acceptedInsurances: Array.isArray(it.acceptedInsurances) ? it.acceptedInsurances : [],
        modalities: Array.isArray(it.modalities) ? it.modalities : [],
        doctorsCount: Array.isArray(it.doctors) ? it.doctors.length : 0,
      })).filter((item: ProcedureItem) => item.id);
      setProcedures(mapped);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erro ao salvar procedimento';
      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(INITIAL_FORM);
    navigate('/dashboard');
  };

  const handleAcceptsInsuranceChange = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      acceptsInsurance: checked,
      acceptedInsurances: checked ? prev.acceptedInsurances : [],
    }));
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setForm((prev) => ({ ...prev, description: value }));
  };

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group gap="sm">
              <ActionIcon
                variant="default"
                size="xl"
                onClick={() => navigate('/dashboard')}
                style={{ borderColor: DARK_BLUE }}
              >
                <ChevronLeft size={20} />
              </ActionIcon>
              <Box>
                <Title order={2} fw={600}>Cadastro de Procedimentos</Title>
                <Text c="dimmed">Procedimentos, modalidades, precos e convenios aceitos.</Text>
              </Box>
            </Group>
          </Group>

          <Tabs defaultValue="cadastro" keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="cadastro">Cadastrar</Tabs.Tab>
              <Tabs.Tab value="lista">Cadastrados</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="cadastro" pt="md">
              <Paper p="lg">
                <SectionTitle>Procedimento</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label="Nome do procedimento"
                    placeholder="Ex: Consulta cardiologica"
                    value={form.name}
                    onChange={(e) => handleNameChange(e?.currentTarget?.value ?? '')}
                    required
                  />
                  <NumberInput
                    label="Preco"
                    placeholder="0,00"
                    value={form.price ?? undefined}
                    onChange={(value) => setForm((prev) => ({ ...prev, price: typeof value === 'number' ? value : null }))}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    thousandSeparator="."
                    decimalSeparator="," 
                  />
                </SimpleGrid>

                <Textarea
                  mt="md"
                  label="Descricao"
                  placeholder="Descreva o procedimento"
                  minRows={3}
                  value={form.description}
                  onChange={(e) => handleDescriptionChange(e?.currentTarget?.value ?? '')}
                />

                <SectionTitle>Convenios e Modalidades</SectionTitle>
                <Group align="flex-end" gap="md" wrap="wrap">
                  <Switch
                    label="Aceita convenio"
                    checked={form.acceptsInsurance}
                    onChange={(e) => handleAcceptsInsuranceChange(e?.currentTarget?.checked ?? !form.acceptsInsurance)}
                  />
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
                  <TagsInput
                    label="Convenios aceitos"
                    placeholder={form.acceptsInsurance ? 'Digite e selecione' : 'Ative o convenio para adicionar'}
                    value={form.acceptedInsurances}
                    onChange={(values) => setForm((prev) => ({ ...prev, acceptedInsurances: values }))}
                    disabled={!form.acceptsInsurance}
                    maxDropdownHeight={220}
                  />
                  <TagsInput
                    label="Modalidades"
                    placeholder="Ex: Presencial, Telemedicina"
                    value={form.modalities}
                    onChange={(values) => setForm((prev) => ({ ...prev, modalities: values }))}
                    maxDropdownHeight={220}
                  />
                </SimpleGrid>

                <SectionTitle>Medicos vinculados</SectionTitle>
                <MultiSelect
                  label="Selecione os medicos"
                  placeholder={loadingDoctors ? 'Carregando medicos' : 'Selecione ou digite'}
                  data={doctorOptions}
                  value={form.doctorIds}
                  onChange={(values) => setForm((prev) => ({ ...prev, doctorIds: values }))}
                  searchable
                  nothingFoundMessage="Nenhum medico"
                  rightSection={loadingDoctors ? <Loader size={16} /> : undefined}
                />

                <Group justify="space-between" mt="xl" wrap="wrap">
                  <Button variant="default" onClick={handleCancel} fullWidth={isMobile}>
                    Cancelar
                  </Button>
                  <Button
                    bg={DARK_BLUE}
                    c="white"
                    onClick={handleSave}
                    loading={saving}
                    fullWidth={isMobile}
                    style={{ minWidth: isTablet ? undefined : 220 }}
                  >
                    Salvar procedimento
                  </Button>
                </Group>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="lista" pt="md">
              <Paper p="lg">
                <Group justify="space-between" mb="md" wrap="wrap">
                  <SectionTitle>Procedimentos cadastrados</SectionTitle>
                  <TextInput
                    placeholder="Buscar por nome"
                    value={procedureQuery}
                    onChange={(e) => setProcedureQuery(e.currentTarget.value)}
                    w={isMobile ? '100%' : 280}
                  />
                </Group>

                {proceduresLoading ? (
                  <Center style={{ padding: 16, gap: 8 }}>
                    <Loader size={18} />
                    <Text size="sm">Carregando procedimentos...</Text>
                  </Center>
                ) : (
                  <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                    <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                      <Table.Thead>
                        <Table.Tr style={{ borderBottom: 'none' }}>
                          <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Preço</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Convênio</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Modalidades</Table.Th>}
                          {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médicos</Table.Th>}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredProcedures.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={5}>
                              <Text size="sm" c="dimmed" ta="center">Nenhum procedimento encontrado</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          filteredProcedures.map((item) => (
                            <Table.Tr key={item.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <Table.Td>
                                <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.name}</Text>
                              </Table.Td>
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{formatPrice(item.price)}</Text>
                                </Table.Td>
                              )}
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.acceptsInsurance ? 'Sim' : 'Não'}</Text>
                                </Table.Td>
                              )}
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.modalities.length ? item.modalities.join(', ') : '-'}</Text>
                                </Table.Td>
                              )}
                              {!isTablet && (
                                <Table.Td>
                                  <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{item.doctorsCount}</Text>
                                </Table.Td>
                              )}
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </Box>
                )}
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Box>

      <ResultModal
        opened={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        variant="success"
        title="Procedimento salvo"
        message={lastCreatedName ? `Procedimento ${lastCreatedName} cadastrado com sucesso.` : 'Procedimento cadastrado com sucesso.'}
        primary={{
          label: 'Cadastrar outro',
          onClick: () => setShowSuccessModal(false),
        }}
        secondary={{
          label: 'Voltar ao dashboard',
          onClick: () => {
            setShowSuccessModal(false);
            navigate('/dashboard');
          },
        }}
      />

      <ResultModal
        opened={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        variant="error"
        title="Erro ao salvar"
        message={errorMessage || 'Ocorreu um erro ao salvar o procedimento.'}
        primary={{
          label: 'Tentar novamente',
          onClick: () => {
            setShowErrorModal(false);
            handleSave();
          },
        }}
        secondary={{
          label: 'Fechar',
          onClick: () => setShowErrorModal(false),
        }}
      />
    </Box>
  );
}
