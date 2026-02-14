import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, Edit2, ChevronLeft, Lock } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import { FloatingInput } from '../common/FloatingInput';
import consultationService from '../../services/consultationService';

interface PatientRow {
  id: string;
  nomeCompleto: string;
  convenio?: string;
  statusConvenio: string;
  agendadoPara: string;
  tipoFila: string;
  agenda: string;
  totem: string;
  fila: string;
}

export function Consulta() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));

  const mapApiToRow = (it: any): PatientRow => ({
    id: String(it.id),
    nomeCompleto: it.patientName || '',
    convenio: it.convenio || '',
    statusConvenio: it.convenioStatus || '',
    agendadoPara: it.scheduledFor || '-',
    tipoFila: it.queueType || '-',
    agenda: it.agenda || '-',
    totem: it.totem ? String(it.totem) : '-',
    fila: it.queue || '-',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await consultationService.list();
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data)
              ? data.data
              : []));
        setRows(list.map(mapApiToRow));
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar consultas',
          color: 'red',
        });
      }
    };

    load();
  }, []);

  const [triagemData, setTriagemData] = useState({
    nome: '',
    convenio: '',
    pressaoArterial: '',
    frequenciaCardiaca: '',
    temperatura: '',
    saturacao: '',
    peso: '',
    altura: '',
    glicemia: '',
    imc: '',
    anamnese: '',
    queixaPrincipal: '',
    historiaDoenca: '',
    alergias: '',
    medicamentos: '',
    antecedentes: '',
    gestante: '',
    observacoesTriagem: '',
  });

  const openTriagem = (r: PatientRow) => {
    setEditingId(r.id);
    setTriagemData((t) => ({
      ...t,
      nome: r.nomeCompleto,
      convenio: r.convenio || '',
    }));
    setModalOpen(true);
  };

  const openNovaConsulta = () => {
    setEditingId(null);
    setTriagemData({
      nome: '',
      convenio: '',
      pressaoArterial: '',
      frequenciaCardiaca: '',
      temperatura: '',
      saturacao: '',
      peso: '',
      altura: '',
      glicemia: '',
      imc: '',
      anamnese: '',
      queixaPrincipal: '',
      historiaDoenca: '',
      alergias: '',
      medicamentos: '',
      antecedentes: '',
      gestante: '',
      observacoesTriagem: '',
    });
    setModalOpen(true);
  };

  const handleSaveTriagem = async () => {
    if (!triagemData.nome.trim()) {
      showNotification({ title: 'Erro', message: 'Nome do paciente e obrigatorio', color: 'red' });
      return;
    }

    const payload = {
      patientName: triagemData.nome,
      convenio: triagemData.convenio || undefined,
      bloodPressure: triagemData.pressaoArterial || undefined,
      heartRate: triagemData.frequenciaCardiaca || undefined,
      temperature: triagemData.temperatura || undefined,
      oxygenSaturation: triagemData.saturacao || undefined,
      weight: triagemData.peso || undefined,
      height: triagemData.altura || undefined,
      glucose: triagemData.glicemia || undefined,
      bmi: triagemData.imc || undefined,
      anamnese: triagemData.anamnese || undefined,
      mainComplaint: triagemData.queixaPrincipal || undefined,
      diseaseHistory: triagemData.historiaDoenca || undefined,
      allergies: triagemData.alergias || undefined,
      medications: triagemData.medicamentos || undefined,
      antecedentes: triagemData.antecedentes || undefined,
      pregnant: triagemData.gestante || undefined,
      triageNotes: triagemData.observacoesTriagem || undefined,
    };

    try {
      if (editingId) {
        const current = rows.find((r) => r.id === editingId);
        const updated = await consultationService.update(editingId, {
          ...payload,
          convenioStatus: current?.statusConvenio || undefined,
          scheduledFor: current?.agendadoPara || undefined,
          queueType: current?.tipoFila || undefined,
          agenda: current?.agenda || undefined,
          totem: current?.totem || undefined,
          queue: current?.fila || undefined,
        });
        setRows((prev) => prev.map((r) => (r.id === editingId ? mapApiToRow(updated) : r)));
      } else {
        const created = await consultationService.create(payload);
        setRows((prev) => [mapApiToRow(created), ...prev]);
      }

      setModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Erro ao salvar consulta',
        color: 'red',
      });
    }
  };

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Consulta
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Atendimento médico
              </Text>
            </Box>
          </Group>
        </Group>

        {/* Search and Button Section */}
        <Box mb={isMobile ? 20 : 30}>
          <Group gap="md" align="flex-end">
            <TextInput
              placeholder={isMobile ? 'Buscar...' : 'Buscar paciente por nome ou CPF..'}
              leftSection={<Search size={16} color="#999" />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="md"
              size={isMobile ? 'sm' : 'md'}
              style={{ flex: 1 }}
            />
            <Button
              bg={DARK_BLUE}
              c="white"
              leftSection={isMobile ? undefined : <Plus size={18} />}
              onClick={openNovaConsulta}
              size={isMobile ? 'sm' : 'md'}
              fw={600}
              px={isMobile ? 'sm' : 'xl'}
            >
              {isMobile ? <Plus size={16} /> : 'Nova consulta'}
            </Button>
          </Group>
        </Box>

        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
            <Table.Thead>
              <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status Convênio</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Agendado para</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Tipo Fila</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Agenda</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Totem</Table.Th>}
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Fila</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'right' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((r) => (
                <Table.Tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                  <Table.Td>
                    <Group gap={isMobile ? "xs" : "sm"}>
                      {!isMobile && (
                        <Box
                          bg={DARK_BLUE}
                          w={32}
                          h={32}
                          style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <Text c="white" fw={600} size="sm">
                            {r.nomeCompleto.charAt(0).toUpperCase()}
                          </Text>
                        </Box>
                      )}
                      <Box>
                        <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{r.nomeCompleto}</Text>
                        {isMobile && (
                          <Text size="xs" c="dimmed">Totem: {r.totem}</Text>
                        )}
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.statusConvenio}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.agendadoPara}</Text>
                  </Table.Td>
                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.tipoFila}</Text>
                    </Table.Td>
                  )}
                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.agenda}</Text>
                    </Table.Td>
                  )}
                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.totem}</Text>
                    </Table.Td>
                  )}
                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.fila}</Text>
                    </Table.Td>
                  )}

                  <Table.Td>
                    <Group gap={4} justify="flex-end" align="center">
                      <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
                      <ActionIcon size="sm" variant="subtle" style={{ color: '#001F54' }} onClick={() => openTriagem(r as PatientRow)}>
                        <Edit2 size={18} />
                      </ActionIcon>
                      <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Triagem | Anamnese"
        size={isMobile ? '100%' : 'lg'}
        centered
        fullScreen={isMobile}
        styles={{
          body: {
            maxHeight: isMobile ? undefined : 'calc(88vh - 80px)',
            overflowY: 'auto',
          },
        }}
      >
        <Stack gap={4}>
          <Group align="center" gap="xs" my={5}>
            <Text size="sm" style={{ whiteSpace: 'nowrap' }}>Triagem</Text>
            <Box style={{ borderBottom: '1px solid #dee2e6', flex: 1 }} />
          </Group>

          <Stack gap={4}>
            <FloatingInput 
              label="Nome" 
              value={triagemData.nome} 
              readOnly 
              disabled 
              style={{ color: '#adb5bd' }} 
              rightSection={<Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
            />

            <FloatingInput 
              label="Convênio" 
              value={triagemData.convenio} 
              readOnly 
              disabled 
              style={{ color: '#adb5bd' }} 
              rightSection={<Lock size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />}
            />

            <Group grow gap="xs" wrap="wrap">
              <FloatingInput label="PA (mmHg)" value={triagemData.pressaoArterial} onChange={(e) => setTriagemData({ ...triagemData, pressaoArterial: e.currentTarget.value })} />
              <FloatingInput label="FC (bmp)" value={triagemData.frequenciaCardiaca} onChange={(e) => setTriagemData({ ...triagemData, frequenciaCardiaca: e.currentTarget.value })} />
              <FloatingInput label="Temp (°C)" value={triagemData.temperatura} onChange={(e) => setTriagemData({ ...triagemData, temperatura: e.currentTarget.value })} />
            </Group>

            <Group grow gap="xs" wrap="wrap">
              <FloatingInput label="SpO2 (%)" value={triagemData.saturacao} onChange={(e) => setTriagemData({ ...triagemData, saturacao: e.currentTarget.value })} />
              <FloatingInput label="Peso (kg)" value={triagemData.peso} onChange={(e) => setTriagemData({ ...triagemData, peso: e.currentTarget.value })} />
              <FloatingInput label="Altura (cm)" value={triagemData.altura} onChange={(e) => setTriagemData({ ...triagemData, altura: e.currentTarget.value })} />
            </Group>

            <Group grow gap="xs" wrap="wrap">
              <FloatingInput label="Glicemia" value={triagemData.glicemia} onChange={(e) => setTriagemData({ ...triagemData, glicemia: e.currentTarget.value })} />
              <FloatingInput label="IMC" value={triagemData.imc} onChange={(e) => setTriagemData({ ...triagemData, imc: e.currentTarget.value })} />
            </Group>

            <Group align="center" gap="xs" my={5}>
              <Text size="sm" style={{ whiteSpace: 'nowrap' }}>Anamnese</Text>
              <Box style={{ borderBottom: '1px solid #dee2e6', flex: 1 }} />
            </Group>

            <FloatingInput label="Anamnese" value={triagemData.anamnese} onChange={(e) => setTriagemData({ ...triagemData, anamnese: e.currentTarget.value })} />
            <FloatingInput label="Queixa principal" value={triagemData.queixaPrincipal} onChange={(e) => setTriagemData({ ...triagemData, queixaPrincipal: e.currentTarget.value })} />
            <FloatingInput label="História da Doença" value={triagemData.historiaDoenca} onChange={(e) => setTriagemData({ ...triagemData, historiaDoenca: e.currentTarget.value })} />
            <FloatingInput label="Alergias" value={triagemData.alergias} onChange={(e) => setTriagemData({ ...triagemData, alergias: e.currentTarget.value })} />
            <FloatingInput label="Medicamentos" value={triagemData.medicamentos} onChange={(e) => setTriagemData({ ...triagemData, medicamentos: e.currentTarget.value })} />
            <FloatingInput label="Antecedentes" value={triagemData.antecedentes} onChange={(e) => setTriagemData({ ...triagemData, antecedentes: e.currentTarget.value })} />
            <FloatingInput label="Gestante" value={triagemData.gestante} onChange={(e) => setTriagemData({ ...triagemData, gestante: e.currentTarget.value })} />
            <FloatingInput label="Observação" value={triagemData.observacoesTriagem} onChange={(e) => setTriagemData({ ...triagemData, observacoesTriagem: e.currentTarget.value })} />

            <Text size="xs" c="dimmed" style={{ marginTop: 6 }}>Observação editada por: Enfer. Luisa Machado</Text>


            <Group justify="flex-end" mt={8} gap={8}>
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={handleSaveTriagem} size="sm">Salvar</Button>
            </Group>
          </Stack>
        </Stack>
      </Modal>
    </Box>
  );
}
