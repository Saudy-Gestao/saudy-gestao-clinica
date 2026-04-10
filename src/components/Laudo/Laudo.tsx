import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Tabs, Paper, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Lock, Eye, Pencil, Trash } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { Header } from '../Header/Header';
import reportService from '../../services/reportService';
import ResultModal from '../common/ResultModal';
import { formatCPF, formatDateInput, isValidCPF } from '../../utils/formatters';
import { useReportsQuery } from '../../hooks/useReportsQuery';
import { queryKeys } from '../../lib/queryKeys';

interface PatientRow {
  id: string;
  nomeCompleto: string;
  cpf?: string;
  dataNascimento?: string;
  status: string;
  agendadoPara: string;
  medicoResponsavel: string;
  exame: string;
  observacao: string;
}

export function Laudo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const {
    data: reports = [],
    error: reportsError,
  } = useReportsQuery();

  const mapApiToRow = (it: any): PatientRow => ({
    id: String(it.id),
    nomeCompleto: it.patientName || '',
    cpf: it.cpf || '',
    dataNascimento: it.birthDate || '',
    status: it.status || '',
    agendadoPara: it.scheduledFor || '-',
    medicoResponsavel: it.responsibleDoctor || '-',
    exame: it.exam || '-',
    observacao: it.observation || '-',
  });

  useEffect(() => {
    if (!reportsError) return;
    const err: any = reportsError;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar laudos'),
      color: 'red',
    });
  }, [reportsError]);

  const rows = useMemo<PatientRow[]>(() => reports.map(mapApiToRow), [reports]);
  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));



  const [laudoData, setLaudoData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    medicoSolicitante: '',
    medicoLaudante: '',
    medicoRevisor: '',
    descricao: '',
    conclusao: '',
    observacoes: '',
    status: '',
    exame: '',
  });

  // inline validation errors for the modal form
  const [errors, setErrors] = useState<{ nome?: string; cpf?: string }>({});

  // When creating a new laudo, basic patient fields should be editable
  const [isNewPatient, setIsNewPatient] = useState(false);
  // viewing-only modal flag
  const [isViewing, setIsViewing] = useState(false);

  // Tabs: 'cadastro' (form) and 'cadastrados' (lista)
  const [activeTab, setActiveTab] = useState<'cadastro' | 'cadastrados'>('cadastrados');

  // centralized save handler (used by modal and cadastro tab)
  const handleSaveLaudo = async () => {
    // reset inline errors
    setErrors({});

    // client-side validations aligned with backend
    if (!laudoData.nome || !laudoData.nome.trim()) {
      setErrors({ nome: 'Nome é obrigatório' });
      showNotification({ title: 'Erro', message: 'Preencha o campo Nome', color: 'red' });
      return;
    }

    if (laudoData.cpf && laudoData.cpf.trim()) {
      if (!isValidCPF(laudoData.cpf)) {
        setErrors({ cpf: 'CPF inválido' });
        showNotification({ title: 'Erro', message: 'CPF inválido', color: 'red' });
        return;
      }
    }

    const payload = {
      patientName: laudoData.nome,
      cpf: laudoData.cpf || undefined,
      birthDate: laudoData.dataNascimento || undefined,
      requestingDoctor: laudoData.medicoSolicitante || undefined,
      reportingDoctor: laudoData.medicoLaudante || undefined,
      reviewingDoctor: laudoData.medicoRevisor || undefined,
      description: laudoData.descricao || undefined,
      conclusion: laudoData.conclusao || undefined,
      notes: laudoData.observacoes || undefined,
      status: laudoData.status || undefined,
      exam: laudoData.exame || undefined,
    };

    try {
      if (editingId) {
        const current = rows.find((r) => r.id === editingId);
        const updated = await reportService.update(editingId, {
          ...payload,
          scheduledFor: current?.agendadoPara || undefined,
          responsibleDoctor: current?.medicoResponsavel || undefined,
          observation: current?.observacao || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.reports });
        setLaudoData((prev) => ({ ...prev, status: updated.status || prev.status }));
      } else {
        await reportService.create(payload);
        await queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      }

      // after save, switch to list and clear form/modal state
      setActiveTab('cadastrados');
      setModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const backendMsg = resolveApiErrorMessage(err, 'Erro ao salvar laudo');
      showNotification({ title: 'Erro', message: backendMsg, color: 'red' });
    }
  };







  const openNovoLaudo = (r?: PatientRow, view = false) => {
    // view = true -> open modal in read-only viewing mode
    setIsViewing(Boolean(view));

    if (r) {
      setEditingId(r.id);
      setLaudoData({
        nome: r.nomeCompleto,
        cpf: r.cpf || '',
        dataNascimento: r.dataNascimento || '',
        medicoSolicitante: '',
        medicoLaudante: '',
        medicoRevisor: '',
        descricao: '',
        conclusao: '',
        observacoes: '',
        status: r.status || '',
        exame: r.exame || '',
      });
      setIsNewPatient(false);
    } else {
      setEditingId(null);
      setLaudoData({
        nome: '',
        cpf: '',
        dataNascimento: '',
        medicoSolicitante: '',
        medicoLaudante: '',
        medicoRevisor: '',
        descricao: '',
        conclusao: '',
        observacoes: '',
        status: '',
        exame: '',
      });
      setIsNewPatient(true);
    }

    setModalOpen(true);
  };

  // edit laudo in the Cadastro tab (populate form)
  const handleEditLaudo = (r: PatientRow) => {
    setIsViewing(false);
    setEditingId(r.id);
    setLaudoData({
      nome: r.nomeCompleto,
      cpf: r.cpf || '',
      dataNascimento: r.dataNascimento || '',
      medicoSolicitante: '',
      medicoLaudante: '',
      medicoRevisor: '',
      descricao: '',
      conclusao: '',
      observacoes: '',
      status: r.status || '',
      exame: r.exame || '',
    });
    setIsNewPatient(false);
    setActiveTab('cadastro');
  };

  // delete flow: open confirmation modal first (use system ResultModal)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

  const handleDeleteLaudo = (id: string, name?: string) => {
    setDeleteTarget({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteLaudo = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    try {
      await reportService.remove(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      showNotification({ title: 'Laudo excluído', message: 'Registro removido com sucesso.', color: 'green' });
      if (editingId === id) {
        setEditingId(null);
        setModalOpen(false);
        setActiveTab('cadastrados');
      }
    } catch (err: any) {
      const msg = resolveApiErrorMessage(err, 'Erro ao excluir laudo');
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };  

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 20 : 30} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">
                Laudo
              </Text>
              <Text size="sm" c="dimmed">
                Emissão de laudos
              </Text>
            </Box>
          </Group>
        </Group>

        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as 'cadastro' | 'cadastrados')}>
          <Tabs.List>
            <Tabs.Tab value="cadastro">Cadastrar</Tabs.Tab>
            <Tabs.Tab value="cadastrados">Cadastrados</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="cadastro" pt="xs">
            <Paper p="md" radius="md" withBorder>
              <Title order={5} fw={600} c="var(--mantine-color-text)" mb="sm">Cadastrar Laudo</Title>
              <Box style={{ padding: 6 }}>
                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    value={laudoData.nome}
                    onChange={(e) => setLaudoData({ ...laudoData, nome: e.currentTarget.value })}
                    placeholder=" "
                      readOnly={isViewing}
                      disabled={isViewing}
                      style={{ color: isViewing ? '#000' : undefined }}
                    aria-required={true}
                  />
                  <label>Nome completo <span style={{ color: 'var(--mantine-red-6)', marginLeft: 6 }}>*</span></label>
                  {errors.nome && (
                    <Text size="xs" c="red" mt={6}>{errors.nome}</Text>
                  )}
                </Box>

                <Group grow gap="xs" style={{ marginBottom: 8 }}>
                  <Box style={{ flex: 1 }} className="floating-field">
                    <input
                      type="text"
                      value={laudoData.cpf}
                      onChange={(e) => setLaudoData({ ...laudoData, cpf: formatCPF(e.currentTarget.value) })}
                      placeholder=" "
                        readOnly={isViewing}
                        disabled={isViewing}
                        style={{ color: isViewing ? '#000' : undefined }}
                      aria-invalid={!!errors.cpf}
                    />
                    <label>CPF</label>
                    {errors.cpf && (
                      <Text size="xs" c="red" mt={6}>{errors.cpf}</Text>
                    )}
                  </Box>

                  <Box style={{ flex: 1 }} className="floating-field">
                    <input
                      type="text"
                      value={laudoData.dataNascimento}
                      onChange={(e) => setLaudoData({ ...laudoData, dataNascimento: formatDateInput(e.currentTarget.value) })}
                      placeholder=" "
                        readOnly={isViewing}
                        disabled={isViewing}
                        style={{ color: isViewing ? '#000' : undefined }}
                    />
                    <label>Data de nascimento</label>
                  </Box>
                </Group>

                <Group grow gap="xs" style={{ marginBottom: 8 }}>
                  <Box style={{ flex: 1 }} className="floating-field">
                    <input type="text" value={laudoData.medicoSolicitante} onChange={(e) => setLaudoData({ ...laudoData, medicoSolicitante: e.currentTarget.value })} placeholder=" " />
                    <label>Médico Sol.</label>
                  </Box>

                  <Box style={{ flex: 1 }} className="floating-field">
                    <input type="text" value={laudoData.medicoLaudante} onChange={(e) => setLaudoData({ ...laudoData, medicoLaudante: e.currentTarget.value })} placeholder=" " />
                    <label>Médico Laud.</label>
                  </Box>
                </Group>

                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input type="text" value={laudoData.medicoRevisor} onChange={(e) => setLaudoData({ ...laudoData, medicoRevisor: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
                  <label>Médico Rev.</label>
                </Box>

                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input type="text" value={laudoData.descricao} onChange={(e) => setLaudoData({ ...laudoData, descricao: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
                  <label>Descrição</label>
                </Box>

                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input type="text" value={laudoData.conclusao} onChange={(e) => setLaudoData({ ...laudoData, conclusao: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
                  <label>Conclusão</label>
                </Box>

                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input type="text" value={laudoData.observacoes} onChange={(e) => setLaudoData({ ...laudoData, observacoes: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
                  <label>Observações</label>
                </Box>

                <Group justify="flex-end" mt={10}>
                  <Button variant="default" onClick={() => { setActiveTab('cadastrados'); setLaudoData({ nome: '', cpf: '', dataNascimento: '', medicoSolicitante: '', medicoLaudante: '', medicoRevisor: '', descricao: '', conclusao: '', observacoes: '', status: '', exame: '' }); }} size="sm">Cancelar</Button>
                  <Button bg={DARK_BLUE} onClick={handleSaveLaudo} size="sm">Salvar</Button>
                </Group>
              </Box>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="cadastrados" pt="xs">
            <Box mb={isMobile ? 20 : 30}>
              <Group gap="md" align="flex-end">
                <TextInput
                  placeholder={isMobile ? 'Buscar...' : 'Buscar paciente por nome ou CPF..'}
                  leftSection={<Search size={16} color="var(--mantine-color-dimmed)" />}
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
                  onClick={() => { setActiveTab('cadastro'); setIsNewPatient(true); setLaudoData({ nome: '', cpf: '', dataNascimento: '', medicoSolicitante: '', medicoLaudante: '', medicoRevisor: '', descricao: '', conclusao: '', observacoes: '', status: '', exame: '' }); }}
                  size={isMobile ? 'sm' : 'md'}
                  fw={600}
                  px={isMobile ? 'sm' : 'xl'}
                >
                  {isMobile ? <Plus size={16} /> : 'Novo laudo'}
                </Button>
              </Group>
            </Box>

            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
              <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: 'none' }}>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Agendado para</Table.Th>
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Médico responsável</Table.Th>}
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Exame</Table.Th>}
                    {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Observação</Table.Th>}
                    <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', verticalAlign: 'middle' }}>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((r) => {
                    return (
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
                                <Text size="xs" c="dimmed">Exame: {r.exame}</Text>
                              )}
                            </Box>
                          </Group>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.status}</Text>
                        </Table.Td>

                        <Table.Td>
                          <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.agendadoPara}</Text>
                        </Table.Td>

                        {!isTablet && (
                          <Table.Td>
                            <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.medicoResponsavel}</Text>
                          </Table.Td>
                        )}

                        {!isTablet && (
                          <Table.Td>
                            <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.exame}</Text>
                          </Table.Td>
                        )}

                        {!isTablet && (
                          <Table.Td>
                            <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.observacao}</Text>
                          </Table.Td>
                        )}

                        <Table.Td>
                          <Group gap={6} wrap="nowrap" justify="center" align="center">
                            <ActionIcon
                              variant="subtle"
                              style={{ color: 'var(--mantine-color-text)' }}
                              onClick={() => handleEditLaudo(r)}
                              title="Editar laudo"
                              aria-label="Editar laudo"
                            >
                              <Pencil size={16} />
                            </ActionIcon>

                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={() => openNovoLaudo(r as PatientRow, true)}
                              style={{ color: 'var(--mantine-color-text)', cursor: 'pointer' }}
                              title="Ver laudo"
                              aria-label="Ver laudo"
                            >
                              <Eye size={18} />
                            </ActionIcon>

                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => handleDeleteLaudo(r.id, r.nomeCompleto)}
                              title="Excluir laudo"
                              aria-label="Excluir laudo"
                            >
                              <Trash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); setIsViewing(false); }}
        title={isViewing ? 'Visualizar Laudo' : (editingId ? 'Editar Laudo' : 'Novo Laudo')}
        size={isMobile ? '100%' : 420}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 420 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 6 }}>
            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input
                type="text"
                value={laudoData.nome}
                onChange={(e) => {
                  setLaudoData({ ...laudoData, nome: e.currentTarget.value });
                  // clear inline error when user types
                  setErrors((prev) => ({ ...prev, nome: undefined }));
                }}
                placeholder=" "
                readOnly={isViewing || !isNewPatient}
                disabled={isViewing || !isNewPatient}
                style={{ color: isViewing || !isNewPatient ? '#adb5bd' : undefined }}
                aria-required={true}
              />
              <label>Nome completo <span style={{ color: 'var(--mantine-red-6)', marginLeft: 6 }}>*</span></label>
              {errors.nome && (
                <Text size="xs" c="red" mt={6}>{errors.nome}</Text>
              )}
            </Box>

            <Group grow gap="xs" style={{ marginBottom: 8 }}>
              <Box style={{ flex: 1 }} className="floating-field">
                <input
                  type="text"
                  value={laudoData.cpf}
                  onChange={(e) => { setLaudoData({ ...laudoData, cpf: formatCPF(e.currentTarget.value) }); setErrors((prev) => ({ ...prev, cpf: undefined })); }}
                  placeholder=" "
                  readOnly={isViewing || !isNewPatient}
                  disabled={isViewing || !isNewPatient}
                  style={{ color: isViewing || !isNewPatient ? '#adb5bd' : undefined }}
                  aria-invalid={!!errors.cpf}
                />
                <label>CPF</label>
                {!isNewPatient && !isViewing && (
                  <Lock size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                )}
                {errors.cpf && (
                  <Text size="xs" c="red" mt={6}>{errors.cpf}</Text>
                )}
              </Box>

              <Box style={{ flex: 1 }} className="floating-field">
                <input
                  type="text"
                  value={laudoData.dataNascimento}
                  onChange={(e) => setLaudoData({ ...laudoData, dataNascimento: formatDateInput(e.currentTarget.value) })}
                  placeholder=" "
                  readOnly={isViewing || !isNewPatient}
                  disabled={isViewing || !isNewPatient}
                  style={{ color: isViewing || !isNewPatient ? '#adb5bd' : undefined }}
                />
                <label>Data de nascimento</label>
                {!isNewPatient && !isViewing && (
                  <Lock size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
                )}
              </Box>
            </Group>

            <Group grow gap="xs" style={{ marginBottom: 8 }}>
              <Box style={{ flex: 1 }} className="floating-field">
                <input type="text" value={laudoData.medicoSolicitante} onChange={(e) => setLaudoData({ ...laudoData, medicoSolicitante: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
                <label>Médico Sol.</label>
              </Box>

              <Box style={{ flex: 1 }} className="floating-field">
                <input type="text" value={laudoData.medicoLaudante} onChange={(e) => setLaudoData({ ...laudoData, medicoLaudante: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
                <label>Médico Laud.</label>
              </Box>
            </Group>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.medicoRevisor} onChange={(e) => setLaudoData({ ...laudoData, medicoRevisor: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
              <label>Médico Rev.</label>
            </Box> 

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.descricao} onChange={(e) => setLaudoData({ ...laudoData, descricao: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
              <label>Descrição</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.conclusao} onChange={(e) => setLaudoData({ ...laudoData, conclusao: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
              <label>Conclusão</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input type="text" value={laudoData.observacoes} onChange={(e) => setLaudoData({ ...laudoData, observacoes: e.currentTarget.value })} placeholder=" " readOnly={isViewing} />
              <label>Observações</label>
            </Box> 

            <Group justify="flex-end" mt={70}>
              {isViewing ? (
                <Button variant="default" onClick={() => { setModalOpen(false); setIsViewing(false); }} size="sm">Fechar</Button>
              ) : (
                <>
                  <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
                  <Button bg={DARK_BLUE} onClick={handleSaveLaudo} size="sm">Salvar</Button>
                </>
              )}
            </Group>
          </Box>
        </Stack>
      </Modal>

      <ResultModal
        opened={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
        variant="error"
        title="Confirmar exclusão"
        message={`Confirma a exclusão de ${deleteTarget?.name || 'este laudo'}?`}
        primary={{ label: 'Excluir', onClick: confirmDeleteLaudo }}
        secondary={{ label: 'Cancelar', onClick: () => { setDeleteConfirmOpen(false); setDeleteTarget(null); } }}
      />
    </Box>
  );
}
