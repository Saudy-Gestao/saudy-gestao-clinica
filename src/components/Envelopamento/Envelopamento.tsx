import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Select, Textarea, FileButton, Badge, Tabs, Paper, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Download, Edit2, UploadCloud, Eye, Trash } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';
import envelopmentService from '../../services/envelopmentService';
import ResultModal from '../common/ResultModal';

interface PatientRow {
  id: string;
  nomeCompleto: string;
  dataHora: string;
  responsavel: string;
  status: string;
  paginas: number;
  exame?: string;
  observacao?: string;
}


export function Envelopamento() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');

  const filtered = rows.filter((r) => r.nomeCompleto.toLowerCase().includes(query.toLowerCase()));



  const [envelopeData, setEnvelopeData] = useState<{
    nome: string;
    responsavel: string;
    tipoDocumento: string;
    descricao: string;
    file: File | null;
  }>({ nome: '', responsavel: '', tipoDocumento: '', descricao: '', file: null });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cadastro' | 'cadastrados'>('cadastrados');
  const [isViewing, setIsViewing] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

  const mapApiToRow = (it: any): PatientRow => ({
    id: String(it.id),
    nomeCompleto: it.patientName || '',
    dataHora: it.dateTime || '-',
    responsavel: it.responsible || '-',
    status: it.status || '-',
    paginas: it.pages ?? 0,
    exame: it.documentType || '-',
    observacao: it.description || '-',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await envelopmentService.list();
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
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar envelopamentos',
          color: 'red',
        });
      }
    };

    load();
  }, []);







  // open modal: view-only when `view` is true; otherwise used for creating new (but edits happen in Cadastro tab)
  const openEnvelope = (r?: PatientRow, view = false) => {
    setIsViewing(Boolean(view));

    if (r) {
      setEnvelopeData({ nome: r.nomeCompleto, responsavel: r.responsavel, tipoDocumento: r.exame || '', descricao: r.observacao || '', file: null });
      setEditingId(r.id);
    } else {
      setEnvelopeData({ nome: '', responsavel: '', tipoDocumento: '', descricao: '', file: null });
      setEditingId(null);
    }

    setModalOpen(true);
  };

  const handleDownload = (r: PatientRow) => {
    showNotification({ title: 'Download', message: `Solicitado download do registro de ${r.nomeCompleto}`, color: 'blue' });
  };

  const handleEditEnvelopment = (r: PatientRow) => {
    setIsViewing(false);
    setEditingId(r.id);
    setEnvelopeData({ nome: r.nomeCompleto, responsavel: r.responsavel, tipoDocumento: r.exame || '', descricao: r.observacao || '', file: null });
    setActiveTab('cadastro');
  };

  const handleDeleteEnvelopment = async (id: string) => {
    try {
      await envelopmentService.remove(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      showNotification({ title: 'Envelopamento excluído', message: 'Registro removido com sucesso.', color: 'green' });
    } catch (err: any) {
      const msg = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Erro ao excluir envelopamento';
      showNotification({ title: 'Erro', message: msg, color: 'red' });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!envelopeData.nome.trim()) {
      showNotification({ title: 'Erro', message: 'Nome é obrigatório', color: 'red' });
      return;
    }

    const now = new Date();
    const payload = {
      patientName: envelopeData.nome,
      dateTime: `${now.toLocaleDateString()} | ${now.toLocaleTimeString()}`,
      responsible: envelopeData.responsavel || undefined,
      status: 'Pronto',
      pages: envelopeData.file ? 1 : 0,
      documentType: envelopeData.tipoDocumento || undefined,
      description: envelopeData.descricao || undefined,
      fileName: envelopeData.file?.name || undefined,
    };

    if (editingId) {
      try {
        const updated = await envelopmentService.update(editingId, payload);
        setRows((prev) => prev.map((p) => (p.id === editingId ? mapApiToRow(updated) : p)));
        showNotification({ title: 'Atualizado', message: 'Envelopamento atualizado', color: 'green' });
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao atualizar envelopamento',
          color: 'red',
        });
        return;
      }
    } else {
      try {
        const created = await envelopmentService.create(payload);
        setRows((prev) => [mapApiToRow(created), ...prev]);
        showNotification({ title: 'Adicionado', message: 'Envelopamento adicionado', color: 'green' });
      } catch (err: any) {
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao adicionar envelopamento',
          color: 'red',
        });
        return;
      }
    }

    // after save switch to list and clear
    setActiveTab('cadastrados');
    setEnvelopeData({ nome: '', responsavel: '', tipoDocumento: '', descricao: '', file: null });
    setEditingId(null);
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
                Envelopamento
              </Text>
              <Text size="sm" c="blue" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Preparação de docs
              </Text>
            </Box>
          </Group>
        </Group>

        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as any)}>
          <Tabs.List>
            <Tabs.Tab value="cadastro">Cadastrar</Tabs.Tab>
            <Tabs.Tab value="cadastrados">Cadastrados</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="cadastro" pt="xs">
            <Paper p="md" radius="md" withBorder>
              <Title order={5} fw={600} c={DARK_BLUE} mb="sm">Cadastrar Envelopamento</Title>
              <Box style={{ padding: 8 }}>
                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input type="text" value={envelopeData.nome} onChange={(e) => setEnvelopeData({ ...envelopeData, nome: e.currentTarget.value })} placeholder=" " />
                  <label>Nome</label>
                </Box>

                <Box className="floating-field" style={{ marginBottom: 8 }}>
                  <input type="text" value={envelopeData.responsavel} onChange={(e) => setEnvelopeData({ ...envelopeData, responsavel: e.currentTarget.value })} placeholder=" " />
                  <label>Responsável</label>
                </Box>

                <Box style={{ marginBottom: 8 }}>
                  <Select
                    data={[{ value: 'relatorio', label: 'Relatório' }, { value: 'exame', label: 'Exame' }, { value: 'laudo', label: 'Laudo' }, { value: 'outro', label: 'Outro' }]}
                    placeholder="Tipo de documento"
                    value={envelopeData.tipoDocumento}
                    onChange={(val) => setEnvelopeData({ ...envelopeData, tipoDocumento: val || '' })}
                  />
                </Box>

                <Box style={{ marginBottom: 8 }}>
                  <Textarea placeholder="Descrição/Conteúdo" value={envelopeData.descricao} onChange={(e) => setEnvelopeData({ ...envelopeData, descricao: e.currentTarget.value })} minRows={3} />
                </Box>

                <Box style={{ marginBottom: 8 }}>
                  <FileButton accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword" onChange={(file) => setEnvelopeData({ ...envelopeData, file })}>
                    {(props) => (
                      <Box {...props} style={{ border: '1px dashed #dee2e6', padding: 18, borderRadius: 6, textAlign: 'center', cursor: 'pointer' }}>
                        <UploadCloud size={20} style={{ color: '#6c757d' }} />
                        <Text size="sm" c="dimmed">Upload do documento</Text>
                        <Text size="xs" c="dimmed">Tamanho limite: 200mb</Text>
                        {envelopeData.file && (
                          <Box mt={8}>
                            <Badge variant="outline">{envelopeData.file.name}</Badge>
                          </Box>
                        )}
                      </Box>
                    )}
                  </FileButton>
                  <Text size="xs" c="dimmed" mt={6}>Arquivos suportados: pdf, doc, xls</Text>
                </Box>

                <Group justify="flex-end" mt={8}>
                  <Button variant="default" onClick={() => { setActiveTab('cadastrados'); setEnvelopeData({ nome: '', responsavel: '', tipoDocumento: '', descricao: '', file: null }); setEditingId(null); }} size="sm">Cancelar</Button>
                  <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm">{editingId ? 'Salvar' : 'Adicionar'}</Button>
                </Group>
              </Box>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="cadastrados" pt="xs">
            <Box mb={isMobile ? 20 : 30}>
              <Group gap="md" align="flex-end">
                <TextInput
                  placeholder={isMobile ? 'Buscar...' : 'Buscar por nome...'}
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
                  onClick={() => { setActiveTab('cadastro'); setEnvelopeData({ nome: '', responsavel: '', tipoDocumento: '', descricao: '', file: null }); setEditingId(null); }}
                  size={isMobile ? 'sm' : 'md'}
                  fw={600}
                  px={isMobile ? 'sm' : 'xl'}
                >
                  {isMobile ? <Plus size={16} /> : 'Novo'}
                </Button>
              </Group>
            </Box>

        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
          <Table horizontalSpacing={isMobile ? 'sm' : 'md'} verticalSpacing={isMobile ? 'sm' : 'md'}>
            <Table.Thead>
                <Table.Tr style={{ borderBottom: 'none' }}>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Data/Hora</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Responsável</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500 }}>Status</Table.Th>
                {!isTablet && <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Páginas</Table.Th>}
                <Table.Th style={{ color: '#868e96', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 500, textAlign: 'center', verticalAlign: 'middle' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((r) => (
                <Table.Tr key={r.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                  <Table.Td>
                    <Group gap={isMobile ? 'xs' : 'sm'}>
                      {!isMobile && (
                        <Box
                          bg={DARK_BLUE}
                          w={32}
                          h={32}
                          style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <Text c="white" fw={600} size="sm">{r.nomeCompleto.charAt(0).toUpperCase()}</Text>
                        </Box>
                      )}
                      <Box>
                        <Text fw={500} size="xs" style={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{r.nomeCompleto}</Text>
                        {isMobile && <Text size="xs" c="dimmed">Responsável: {r.responsavel}</Text>}
                      </Box>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.dataHora}</Text>
                  </Table.Td>

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.responsavel}</Text>
                    </Table.Td>
                  )}

                  <Table.Td>
                    <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.status}</Text>
                  </Table.Td>

                  {!isTablet && (
                    <Table.Td>
                      <Text size="xs" style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>{r.paginas}</Text>
                    </Table.Td>
                  )}

                  <Table.Td>
                    {(() => {
                      const actionsDisabled = (r.status || '').toLowerCase() === 'entregue';
                      return (
                        <Group gap={4} justify="center" align="center">
                          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>

                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            disabled={actionsDisabled}
                            onClick={actionsDisabled ? undefined : () => handleDownload(r)}
                            title={actionsDisabled ? 'Ações indisponíveis: Entregue' : 'Baixar'}
                            style={{ color: actionsDisabled ? '#adb5bd' : undefined, cursor: actionsDisabled ? 'not-allowed' : 'pointer' }}
                          >
                            <Download size={18} />
                          </ActionIcon>

                          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>

                          <ActionIcon
                            variant="subtle"
                            color={DARK_BLUE}
                            onClick={() => { handleEditEnvelopment(r); }}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Edit2 size={16} />
                          </ActionIcon>

                          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>

                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => openEnvelope(r, true)}
                            title="Visualizar"
                            aria-label="Visualizar"
                            style={{ color: '#001F54', cursor: 'pointer' }}
                          >
                            <Eye size={18} />
                          </ActionIcon>

                          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>

                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => { setDeleteTarget({ id: r.id, name: r.nomeCompleto }); setDeleteConfirmOpen(true); }}
                            title="Excluir"
                            aria-label="Excluir"
                          >
                            <Trash size={16} />
                          </ActionIcon>
                        </Group>
                      );
                    })()}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Tabs.Panel>
    </Tabs>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); setIsViewing(false); }}
        title={isViewing ? 'Visualizar Envelopamento' : 'Envelopamento de documentação'}
        size={isMobile ? '100%' : 520}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 520 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 6 }}>
            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input 
                type="text" 
                value={envelopeData.nome} 
                readOnly={isViewing}
                disabled={isViewing}
                placeholder=" " 
                style={{ color: isViewing ? '#adb5bd' : undefined }} 
              />
              <label>Nome</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input 
                type="text" 
                value={envelopeData.responsavel} 
                readOnly={isViewing}
                disabled={isViewing}
                placeholder=" " 
                style={{ color: isViewing ? '#adb5bd' : undefined }} 
              />
              <label>Responsável</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input 
                type="text" 
                value={envelopeData.tipoDocumento} 
                readOnly={isViewing}
                disabled={isViewing}
                placeholder=" " 
                style={{ color: isViewing ? '#adb5bd' : undefined }} 
              />
              <label>Tipo de documento</label>
            </Box>

            <Box className="floating-field" style={{ marginBottom: 8 }}>
              <input 
                type="text" 
                value={envelopeData.descricao} 
                readOnly={isViewing}
                disabled={isViewing}
                placeholder=" " 
                style={{ color: isViewing ? '#adb5bd' : undefined }} 
              />
              <label>Descrição</label>
            </Box>

            {envelopeData.file && (
              <Box style={{ marginBottom: 8 }}>
                <Badge variant="outline">{envelopeData.file.name}</Badge>
              </Box>
            )}

            <Group justify="flex-end" mt={70}>
              {isViewing ? (
                <Button variant="default" onClick={() => { setModalOpen(false); setIsViewing(false); }} size="sm">Fechar</Button>
              ) : (
                <>
                  <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
                  <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm">Salvar</Button>
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
        message={`Confirma a exclusão de ${deleteTarget?.name || 'este envelopamento'}?`}
        primary={{ label: 'Excluir', onClick: () => deleteTarget && handleDeleteEnvelopment(deleteTarget.id) }}
        secondary={{ label: 'Cancelar', onClick: () => { setDeleteConfirmOpen(false); setDeleteTarget(null); } }}
      />
    </Box>
  );
}
