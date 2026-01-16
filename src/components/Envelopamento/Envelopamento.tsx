import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, TextInput, Button, Table, Modal, Stack, ActionIcon, Select, Textarea, FileButton, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Search, Plus, ChevronLeft, Download, Edit2, UploadCloud } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { Header } from '../Header/Header';

interface PatientRow {
  id: number;
  nomeCompleto: string;
  dataHora: string;
  responsavel: string;
  status: string;
  paginas: number;
  exame?: string;
  observacao?: string;
}

const SAMPLE_ROWS: PatientRow[] = [
  {
    id: 1,
    nomeCompleto: 'Maria Silva Santos',
    dataHora: '28/12/2025 | 15:30:09',
    responsavel: 'Dr(a) Fernanda Maciel',
    status: 'Entregue',
    paginas: 5,
    exame: 'Relatório',
    observacao: '-',
  },
  {
    id: 2,
    nomeCompleto: 'João Pedro Oliveira',
    dataHora: '30/12/2025 | 16:50:04',
    responsavel: 'Dr. Luciano Farias',
    status: 'Pronto',
    paginas: 2,
    exame: 'Exame',
    observacao: 'Arquivos OK',
  },
];



export function Envelopamento() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(SAMPLE_ROWS);
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

  const [editingId, setEditingId] = useState<number | null>(null);







  const openEnvelope = (r?: PatientRow) => {
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

  const handleAddOrUpdate = () => {
    if (!envelopeData.nome.trim()) {
      showNotification({ title: 'Erro', message: 'Nome é obrigatório', color: 'red' });
      return;
    }

    if (editingId) {
      setRows((prev) => prev.map((p) => p.id === editingId ? { ...p, nomeCompleto: envelopeData.nome, responsavel: envelopeData.responsavel || '-', exame: envelopeData.tipoDocumento, observacao: envelopeData.descricao } : p));
      showNotification({ title: 'Atualizado', message: 'Envelopamento atualizado', color: 'green' });
    } else {
      const id = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
      const now = new Date();
      const dataHora = `${now.toLocaleDateString()} | ${now.toLocaleTimeString()}`;
      const newRow: PatientRow = {
        id,
        nomeCompleto: envelopeData.nome,
        dataHora,
        responsavel: envelopeData.responsavel || '-',
        status: 'Pronto',
        paginas: envelopeData.file ? 1 : 0,
        exame: envelopeData.tipoDocumento,
        observacao: envelopeData.descricao,
      };
      setRows((prev) => [newRow, ...prev]);
      showNotification({ title: 'Adicionado', message: 'Envelopamento adicionado', color: 'green' });
    }

    setModalOpen(false);
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
              onClick={() => openEnvelope()}
              size={isMobile ? 'sm' : 'md'}
              fw={600}
              px={isMobile ? 'sm' : 'xl'}
            >
              {isMobile ? <Plus size={16} /> : 'Novo envelope'}
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
                            size="sm"
                            variant="subtle"
                            disabled={actionsDisabled}
                            onClick={actionsDisabled ? undefined : () => openEnvelope(r)}
                            title={actionsDisabled ? 'Ações indisponíveis: Entregue' : 'Editar'}
                            style={{ color: actionsDisabled ? '#adb5bd' : undefined, cursor: actionsDisabled ? 'not-allowed' : 'pointer' }}
                          >
                            <Edit2 size={18} />
                          </ActionIcon>

                          <Text c="dimmed" style={{ padding: '0 6px' }}>|</Text>
                        </Group>
                      );
                    })()}
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
        title={'Envelopamento de documentação'}
        size={isMobile ? '100%' : 520}
        centered={false}
        fullScreen={isMobile}
        styles={{
          content: { left: 48, bottom: 96, top: 'auto', transform: 'none', width: isMobile ? '100%' : 520 },
          body: { overflowY: 'auto' },
        }}
      >
        <Stack gap={10}>
          <Box style={{ padding: 8 }}>
            <Text size="sm" fw={600} mb={8}>Envelopamento de documentação</Text>

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
              <Button variant="default" onClick={() => setModalOpen(false)} size="sm">Cancelar</Button>
              <Button bg={DARK_BLUE} onClick={handleAddOrUpdate} size="sm">Adicionar</Button>
            </Group>
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
