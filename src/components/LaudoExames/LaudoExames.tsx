import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  // Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Search, Calendar, Stethoscope, FileText, Save, PenTool, CheckCircle, LayoutTemplate, Plus, User, Maximize2, Minimize2 } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';

type ExamStatus = 'pendente' | 'rascunho' | 'finalizado';
type ExamPriority = 'normal' | 'urgente';

interface ExamItem {
  id: string;
  patientName: string;
  cpf: string;
  examType: string;
  scheduledAt: string;
  convenio: string;
  requestingDoctor: string;
  assignedTo: string;
  priority: ExamPriority;
  status: ExamStatus;
  reportText: string;
  issuerSignedAt?: string;
  reviewerSignedAt?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  examType: string;
  content: string;
}

interface ReportPhrase {
  id: string;
  examType: string;
  label: string;
  text: string;
}

const MOCK_EXAMS: ExamItem[] = [
  {
    id: 'EX-001',
    patientName: 'Maria Eduarda Rocha',
    cpf: '123.456.789-01',
    examType: 'Raio-X de tórax',
    scheduledAt: '23/02/2026 09:10',
    convenio: 'SulMed',
    requestingDoctor: 'Dra. Juliana Costa',
    assignedTo: 'Dr. Henrique Lima',
    priority: 'urgente',
    status: 'pendente',
    reportText: '',
  },
  {
    id: 'EX-002',
    patientName: 'João Pedro Azevedo',
    cpf: '987.654.321-55',
    examType: 'Ultrassom abdominal',
    scheduledAt: '23/02/2026 10:25',
    convenio: 'VidaCare',
    requestingDoctor: 'Dr. Tiago Souza',
    assignedTo: 'Dra. Camila Neri',
    priority: 'normal',
    status: 'rascunho',
    reportText:
      '<h3>Descrição</h3><p>Fígado com dimensões preservadas e ecotextura homogênea.</p><h3>Conclusão</h3><p>Sem alterações ultrassonográficas significativas.</p>',
    issuerSignedAt: '23/02/2026 11:02',
  },
  {
    id: 'EX-003',
    patientName: 'Luciana Mendes',
    cpf: '111.222.333-44',
    examType: 'Mamografia bilateral',
    scheduledAt: '22/02/2026 16:40',
    convenio: 'Particular',
    requestingDoctor: 'Dra. Flávia Ramos',
    assignedTo: 'Dr. Henrique Lima',
    priority: 'normal',
    status: 'finalizado',
    reportText:
      '<h3>Descrição</h3><p>Parênquima mamário de padrão fibroglândular. Sem nódulos suspeitos.</p><h3>Conclusão</h3><p>BI-RADS 2.</p>',
    issuerSignedAt: '22/02/2026 17:20',
    reviewerSignedAt: '22/02/2026 17:48',
  },
];

const TEMPLATE_TEXT = `
<h3>Descrição</h3>
<p>Descreva os principais achados do exame.</p>
<h3>Conclusão</h3>
<p>Informe a conclusão de forma objetiva.</p>
<h3>Observações</h3>
<p>Observações adicionais, se necessário.</p>
`;

const MOCK_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'TMP-001',
    name: 'Padrão Raio-X de Tórax',
    examType: 'Raio-X de tórax',
    content:
      '<h3>Descrição</h3><p>Campos pulmonares sem opacidades focais. Silhueta cardíaca preservada.</p><h3>Conclusão</h3><p>Sem sinais radiográficos de alteração aguda.</p>',
  },
  {
    id: 'TMP-002',
    name: 'Padrão Ultrassom Abdominal',
    examType: 'Ultrassom abdominal',
    content:
      '<h3>Descrição</h3><p>Fígado de dimensões normais e ecotextura homogênea. Vias biliares sem dilatação.</p><h3>Conclusão</h3><p>Exame ultrassonográfico sem alterações relevantes.</p>',
  },
  {
    id: 'TMP-003',
    name: 'Padrão Mamografia',
    examType: 'Mamografia bilateral',
    content:
      '<h3>Descrição</h3><p>Mamas com padrão fibroglandular, sem nódulos suspeitos ou microcalcificações agrupadas.</p><h3>Conclusão</h3><p>BI-RADS 2.</p>',
  },
];

const MOCK_REPORT_PHRASES: ReportPhrase[] = [
  {
    id: 'PH-001',
    examType: 'Raio-X de tórax',
    label: 'Sem consolidação pulmonar',
    text: 'Não se observam consolidações pulmonares focais.',
  },
  {
    id: 'PH-002',
    examType: 'Raio-X de tórax',
    label: 'Sem derrame pleural',
    text: 'Não há evidências de derrame pleural.',
  },
  {
    id: 'PH-003',
    examType: 'Ultrassom abdominal',
    label: 'Fígado preservado',
    text: 'Fígado com dimensões preservadas e ecotextura homogênea.',
  },
  {
    id: 'PH-004',
    examType: 'Ultrassom abdominal',
    label: 'Vias biliares sem dilatação',
    text: 'Vias biliares intra e extra-hepáticas sem sinais de dilatação.',
  },
  {
    id: 'PH-005',
    examType: 'Mamografia bilateral',
    label: 'Sem achados suspeitos',
    text: 'Ausência de nódulos espiculados ou microcalcificações suspeitas.',
  },
  {
    id: 'PH-006',
    examType: 'Mamografia bilateral',
    label: 'Categoria BI-RADS 2',
    text: 'Achados compatíveis com categoria BI-RADS 2.',
  },
];

const statusColor: Record<ExamStatus, string> = {
  pendente: 'yellow',
  rascunho: 'blue',
  finalizado: 'green',
};

const statusLabel: Record<ExamStatus, string> = {
  pendente: 'Pendente',
  rascunho: 'Rascunho',
  finalizado: 'Finalizado',
};

const REPORT_PLACEHOLDERS = [
  { key: '{{paciente_nome}}', label: 'Nome do paciente' },
  { key: '{{cpf}}', label: 'CPF' },
  { key: '{{tipo_exame}}', label: 'Tipo de exame' },
  { key: '{{data_exame}}', label: 'Data do exame' },
  { key: '{{medico_solicitante}}', label: 'Solicitante' },
  { key: '{{laudante}}', label: 'Laudante' },
  { key: '{{data_atual}}', label: 'Data atual' },
];

export function LaudoExames() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const editorRef = useRef<any>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const [query, setQuery] = useState('');
  const [examRows, setExamRows] = useState<ExamItem[]>(MOCK_EXAMS);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [templatePickerModalOpen, setTemplatePickerModalOpen] = useState(false);
  const [pdfPreviewModalOpen, setPdfPreviewModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasEditorChanges, setHasEditorChanges] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>(MOCK_REPORT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState('');
  const [phraseQuery, setPhraseQuery] = useState('');
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<ReportPhrase[]>(MOCK_REPORT_PHRASES);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [headerExpanded, setHeaderExpanded] = useState(true);

  const selectedExam = useMemo(
    () => examRows.find((exam) => exam.id === selectedExamId) || null,
    [examRows, selectedExamId],
  );

  const filteredRows = useMemo(() => {
    return examRows.filter((exam) => {
      const normalizedQuery = query.toLowerCase().trim();
      return (
        !normalizedQuery ||
        exam.patientName.toLowerCase().includes(normalizedQuery) ||
        exam.examType.toLowerCase().includes(normalizedQuery) ||
        exam.id.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [examRows, query]);

  const filteredTemplates = useMemo(() => {
    if (!selectedExam) return templates;
    const exactMatches = templates.filter((template) => template.examType === selectedExam.examType);
    return exactMatches.length > 0 ? exactMatches : templates;
  }, [templates, selectedExam]);

  const filteredTemplatesByQuery = useMemo(() => {
    const normalizedQuery = templateQuery.toLowerCase().trim();
    if (!normalizedQuery) return filteredTemplates;

    return filteredTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.examType.toLowerCase().includes(normalizedQuery),
    );
  }, [filteredTemplates, templateQuery]);

  const availablePhrases = useMemo(() => {
    if (!selectedExam) return phrases;
    return phrases.filter((phrase) => phrase.examType === selectedExam.examType);
  }, [selectedExam, phrases]);

  const filteredPhrases = useMemo(() => {
    const normalizedQuery = phraseQuery.toLowerCase().trim();
    if (!normalizedQuery) return availablePhrases;

    return availablePhrases.filter(
      (phrase) =>
        phrase.label.toLowerCase().includes(normalizedQuery) ||
        phrase.text.toLowerCase().includes(normalizedQuery),
    );
  }, [availablePhrases, phraseQuery]);

  const selectedTemplate = useMemo(
    () => filteredTemplatesByQuery.find((template) => template.id === selectedTemplateId)
      || filteredTemplates.find((template) => template.id === selectedTemplateId)
      || null,
    [filteredTemplatesByQuery, filteredTemplates, selectedTemplateId],
  );

  useEffect(() => {
    if (!selectedExam) {
      setEditorContent('');
      setHasEditorChanges(false);
      return;
    }

    setEditorContent(selectedExam.reportText || TEMPLATE_TEXT);
    setHasEditorChanges(false);
  }, [selectedExam]);

  useEffect(() => {
    if (!selectedExam) {
      setSelectedTemplateId(null);
      setSelectedPhraseId(null);
      return;
    }

    const exactTemplate = filteredTemplates.find((template) => template.examType === selectedExam.examType);
    setSelectedTemplateId(exactTemplate?.id || filteredTemplates[0]?.id || null);
    setTemplateQuery('');

    const firstPhrase = phrases.find((phrase) => phrase.examType === selectedExam.examType);
    setSelectedPhraseId(firstPhrase?.id || null);
    setPhraseQuery('');
  }, [selectedExam, filteredTemplates, phrases]);

  const upsertExam = (updater: (exam: ExamItem) => ExamItem) => {
    if (!selectedExam) return;
    setExamRows((previous) => previous.map((exam) => (exam.id === selectedExam.id ? updater(exam) : exam)));
  };

  const saveDraft = (notify = true, source: 'manual' | 'auto' = 'manual', contentOverride?: string) => {
    if (!selectedExam) return;
    const contentToSave = contentOverride ?? editorContent;

    const now = new Date().toLocaleString('pt-BR');
    upsertExam((exam) => ({
      ...exam,
      status: exam.status === 'finalizado' ? 'finalizado' : 'rascunho',
      reportText: contentToSave,
    }));

    if (contentOverride !== undefined) {
      setEditorContent(contentToSave);
    }

    setLastSavedAt(now);
    setHasEditorChanges(false);

    if (notify && source === 'manual') {
      showNotification({
        title: 'Rascunho salvo',
        message: `Rascunho do exame ${selectedExam.id} salvo com sucesso.`,
        color: 'green',
      });
    }
  };

  useEffect(() => {
    if (!modalOpen || !selectedExam || !hasEditorChanges) return;

    const timeoutId = setTimeout(() => {
      saveDraft(false, 'auto');
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [modalOpen, selectedExam, editorContent, hasEditorChanges]);

  const resolvePlaceholders = (content: string, exam: ExamItem) => {
    const replacements: Record<string, string> = {
      '{{paciente_nome}}': exam.patientName,
      '{{cpf}}': exam.cpf,
      '{{tipo_exame}}': exam.examType,
      '{{data_exame}}': exam.scheduledAt,
      '{{medico_solicitante}}': exam.requestingDoctor,
      '{{laudante}}': exam.assignedTo,
      '{{data_atual}}': new Date().toLocaleDateString('pt-BR'),
    };

    return Object.entries(replacements).reduce(
      (current, [placeholder, value]) => current.split(placeholder).join(value),
      content,
    );
  };

  const insertPlaceholder = (placeholderKey: string) => {
    const htmlFragment = `<span>${placeholderKey}</span>`;

    if (editorRef.current) {
      editorRef.current.insertContent(htmlFragment);
      setEditorContent(editorRef.current.getContent());
    } else {
      setEditorContent((previous) => `${previous}${htmlFragment}`);
    }

    setHasEditorChanges(true);
  };

  const openExam = (examId: string) => {
    setSelectedExamId(examId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTemplatePickerModalOpen(false);
    setPdfPreviewModalOpen(false);
    setSelectedTemplateId(null);
    setSelectedPhraseId(null);
    setTemplateQuery('');
    setPhraseQuery('');
    setHasEditorChanges(false);
  };

  const applyTemplate = () => {
    if (!selectedTemplate) {
      showNotification({
        title: 'Selecione um padrão',
        message: 'Escolha um padrão para aplicar no editor.',
        color: 'yellow',
      });
      return;
    }

    setEditorContent(selectedTemplate.content);
    setHasEditorChanges(true);
    showNotification({
      title: 'Padrão aplicado',
      message: `${selectedTemplate.name} aplicado ao laudo atual.`,
      color: 'blue',
    });
  };

  const insertPhrase = (phraseId?: string) => {
    const phrase = filteredPhrases.find((item) => item.id === (phraseId || selectedPhraseId));

    if (!phrase) {
      showNotification({
        title: 'Selecione uma frase',
        message: 'Escolha uma frase para inserir no laudo.',
        color: 'yellow',
      });
      return;
    }

    const htmlFragment = `<p>${phrase.text}</p>`;

    if (editorRef.current) {
      editorRef.current.insertContent(htmlFragment);
      setEditorContent(editorRef.current.getContent());
    } else {
      setEditorContent((previous) => `${previous}${htmlFragment}`);
    }

    setHasEditorChanges(true);
    showNotification({
      title: 'Frase inserida',
      message: `A frase "${phrase.label}" foi inserida no laudo.`,
      color: 'blue',
    });
  };

  const buildPreviewHtml = () => {
    if (!selectedExam) return '';

    const resolvedContent = resolvePlaceholders(editorContent, selectedExam);

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Laudo ${selectedExam.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 28px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 6px; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 18px; }
            .block { margin-bottom: 14px; }
            .signature { margin-top: 24px; font-size: 12px; color: #334155; }
          </style>
        </head>
        <body>
          <h1>Laudo - ${selectedExam.examType}</h1>
          <div class="meta">Paciente: ${selectedExam.patientName} • CPF: ${selectedExam.cpf} • Exame: ${selectedExam.id}</div>
          <div class="block">${resolvedContent}</div>
          <div class="signature">Emissor: ${selectedExam.issuerSignedAt || 'Pendente'} • Revisor: ${selectedExam.reviewerSignedAt || 'Pendente'}</div>
        </body>
      </html>
    `;
  };

  const printPreview = () => {
    previewFrameRef.current?.contentWindow?.focus();
    previewFrameRef.current?.contentWindow?.print();
  };

  const signExam = (role: 'issuer' | 'reviewer') => {
    if (!selectedExam) return;

    const signatureDate = new Date().toLocaleString('pt-BR');

    setExamRows((prev) =>
      prev.map((exam) => {
        if (exam.id !== selectedExam.id) return exam;

        const updatedExam = {
          ...exam,
          reportText: editorContent,
          status: 'rascunho' as ExamStatus,
          issuerSignedAt: role === 'issuer' ? signatureDate : exam.issuerSignedAt,
          reviewerSignedAt: role === 'reviewer' ? signatureDate : exam.reviewerSignedAt,
        };

        if (updatedExam.issuerSignedAt && updatedExam.reviewerSignedAt) {
          updatedExam.status = 'finalizado';
        }

        return updatedExam;
      }),
    );

    setLastSavedAt(signatureDate);
    setHasEditorChanges(false);
    // showNotification({
    //   title: role === 'issuer' ? 'Assinado como emissor' : 'Assinado como revisor',
    //   message:
    //     role === 'issuer'
    //       ? `Assinatura de emissor registrada para o exame ${selectedExam.id}.`
    //       : `Assinatura de revisor registrada para o exame ${selectedExam.id}.`,
    //   color: 'green',
    // });
  };

  const updateExam = (nextStatus: ExamStatus) => {
    if (!selectedExam) {
      showNotification({
        title: 'Selecione um exame',
        message: 'Escolha um exame na lista para editar o laudo.',
        color: 'yellow',
      });
      return;
    }

    if (nextStatus === 'rascunho') {
      saveDraft(true, 'manual');
      return;
    }

    setExamRows((prev) =>
      prev.map((exam) =>
        exam.id === selectedExam.id
          ? {
              ...exam,
              status: nextStatus,
              reportText: editorContent,
            }
          : exam,
      ),
    );

    const now = new Date();
    setLastSavedAt(now.toLocaleString('pt-BR'));
    setHasEditorChanges(false);
    showNotification({
      title: nextStatus === 'finalizado' ? 'Laudo finalizado' : 'Rascunho salvo',
      message:
        nextStatus === 'finalizado'
          ? `O exame ${selectedExam.id} foi marcado como finalizado.`
          : `Rascunho do exame ${selectedExam.id} salvo com sucesso.`,
      color: 'green',
    });

    if (nextStatus === 'finalizado') {
      closeModal();
    }
  };

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 16 : 24} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: DARK_BLUE }}>
                Laudo por Exame
              </Text>
              <Text size="sm" style={{ color: DARK_BLUE, opacity: 0.7 }}>
                Fila de exames para laudar (mock)
              </Text>
            </Box>
          </Group>
        </Group>

        <Group gap="md" align="end" mb="md">
          <TextInput
            placeholder={isMobile ? 'Buscar...' : 'Buscar por paciente, exame ou ID...'}
            leftSection={<Search size={16} color="#999" />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            radius="md"
            size={isMobile ? 'sm' : 'md'}
            style={{ flex: 1 }}
          />
        </Group>

        <Paper withBorder p="sm" style={{ minHeight: 560 }}>
            <Title order={5} c={DARK_BLUE} mb="sm">
              Exames para laudar
            </Title>

            <Box style={{ overflowX: 'auto' }}>
              <Table horizontalSpacing="sm" verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Paciente</Table.Th>
                    {!isTablet && <Table.Th>Exame</Table.Th>}
                    {!isTablet && <Table.Th>Solicitante</Table.Th>}
                    {!isTablet && <Table.Th>Assinaturas</Table.Th>}
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Prioridade</Table.Th>
                    <Table.Th>Ação</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRows.map((exam) => (
                    <Table.Tr
                      key={exam.id}
                      style={{
                        backgroundColor: selectedExamId === exam.id ? '#edf2ff' : undefined,
                      }}
                    >
                      <Table.Td>
                        <Stack gap={0}>
                          <Text fw={500} size="sm">
                            {exam.patientName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {exam.id} • {exam.scheduledAt}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {!isTablet && <Table.Td>{exam.examType}</Table.Td>}

                      {!isTablet && <Table.Td>{exam.requestingDoctor}</Table.Td>}

                      {!isTablet && (
                        <Table.Td>
                          <Group gap={4}>
                            <Badge variant="light" color={exam.issuerSignedAt ? 'green' : 'gray'}>
                              E
                            </Badge>
                            <Badge variant="light" color={exam.reviewerSignedAt ? 'green' : 'gray'}>
                              R
                            </Badge>
                          </Group>
                        </Table.Td>
                      )}

                      <Table.Td>
                        <Badge color={statusColor[exam.status]} variant="light">
                          {statusLabel[exam.status]}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Badge color={exam.priority === 'urgente' ? 'red' : 'gray'} variant="light">
                          {exam.priority === 'urgente' ? 'Urgente' : 'Normal'}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Button
                          variant="subtle"
                          color="darkBlue"
                          size="compact-sm"
                          onClick={() => openExam(exam.id)}
                        >
                          Abrir laudo
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
        </Paper>

        <Modal
          opened={modalOpen}
          onClose={closeModal}
          title="Editor de laudo"
          centered
          size={isMobile ? '100%' : '95%'}
          fullScreen={true}
          styles={{
            body: {
              height: isMobile ? 'calc(100vh - 68px)' : 'calc(95vh - 68px)',
              overflowY: isMobile ? 'auto' : 'hidden',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 12,
            },
          }}
        >
          {!selectedExam ? (
            <Text size="sm" c="dimmed">
              Nenhum exame selecionado.
            </Text>
          ) : (
            <Stack gap="sm" style={{ height: '100%', minHeight: 0 }}>
              <Paper withBorder p="md" radius="md" bg="gray.0" style={{ display: headerExpanded ? 'block' : 'none' }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group wrap="nowrap" gap="lg">
                    {/* <Avatar size="xl" radius="md" color="darkBlue">
                      <User size={28} />
                    </Avatar> */}
                    <Box>
                      <Group gap="xs" align="center" mb={4}>
                        <Title order={3} c="dark.9" style={{ lineHeight: 1.2 }}>
                          {selectedExam.patientName}
                        </Title>
                        <Badge variant="light" color="darkBlue" size="lg" radius="sm">
                          {selectedExam.examType}
                        </Badge>
                      </Group>
                      
                      <Group gap="sm" align="center" mb={8}>
                        <Text size="sm" c="dimmed" fw={500}>
                          CPF: {selectedExam.cpf}
                        </Text>
                        <Text size="sm" c="dimmed">•</Text>
                        <Badge variant="outline" color="gray" size="sm" radius="sm">
                          Convênio: {selectedExam.convenio}
                        </Badge>
                      </Group>

                      <Group gap="md">
                        <Group gap={6}>
                          <ThemeIcon variant="light" color="gray" size="sm">
                            <Calendar size={14} />
                          </ThemeIcon>
                          <Text size="sm" c="dimmed">
                            {selectedExam.scheduledAt}
                          </Text>
                        </Group>
                        <Group gap={6}>
                          <ThemeIcon variant="light" color="gray" size="sm">
                            <Stethoscope size={14} />
                          </ThemeIcon>
                          <Text size="sm" c="dimmed">
                            Solicitante: <Text span fw={500} c="dark.7">{selectedExam.requestingDoctor}</Text>
                          </Text>
                        </Group>
                      </Group>
                    </Box>
                  </Group>

                  <Stack gap="xs" align="flex-end">
                    <Group gap="xs">
                      {selectedExam.priority === 'urgente' && (
                        <Badge color="red" variant="filled" size="md" radius="sm">
                          URGENTE
                        </Badge>
                      )}
                      <Badge color={statusColor[selectedExam.status]} variant="light" size="md" radius="sm" fw={700}>
                        {statusLabel[selectedExam.status].toUpperCase()}
                      </Badge>
                    </Group>
                    <Group gap="xs">
                      <Badge variant="dot" color={selectedExam.issuerSignedAt ? 'green' : 'gray'} size="sm">
                        Emissor: {selectedExam.issuerSignedAt ? 'Assinado' : 'Pendente'}
                      </Badge>
                      <Badge variant="dot" color={selectedExam.reviewerSignedAt ? 'green' : 'gray'} size="sm">
                        Revisor: {selectedExam.reviewerSignedAt ? 'Assinado' : 'Pendente'}
                      </Badge>
                      {hasEditorChanges && (
                        <Badge variant="dot" color="orange" size="sm">
                          Alterações pendentes
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Group>
              </Paper>

              <Group
                align="stretch"
                gap="sm"
                wrap={isMobile ? 'wrap' : 'nowrap'}
                style={{ flex: 1, minHeight: isMobile ? 'auto' : 0 }}
              >
                {toolsExpanded && (
                  <Paper
                    withBorder
                    p="md"
                    bg="gray.0"
                    style={{
                      flex: isMobile ? '1 1 100%' : '0 0 320px',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: isMobile ? '35vh' : 'none',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Button 
                      variant="filled" 
                      color="darkBlue" 
                      onClick={() => setTemplatePickerModalOpen(true)} 
                      mb="md" 
                      fullWidth
                      leftSection={<LayoutTemplate size={18} />}
                    >
                      Escolher padrão de laudo
                    </Button>

                    <TextInput
                      placeholder="Buscar frases..."
                      value={phraseQuery}
                      onChange={(event) => setPhraseQuery(event.currentTarget.value)}
                      mb="md"
                      size="sm"
                      leftSection={<Search size={16} />}
                    />

                    <Text size="sm" fw={700} c="dark.8" mb={8}>Frases de laudo</Text>
                    <Box style={{ minHeight: 0, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                      <Stack gap="xs" mb="md">
                        {filteredPhrases.length === 0 ? (
                          <Text size="sm" c="dimmed">
                            Nenhuma frase para este exame.
                          </Text>
                        ) : (
                          filteredPhrases.map((phrase) => (
                            <Paper
                              key={phrase.id}
                              withBorder
                              p="sm"
                              shadow={selectedPhraseId === phrase.id ? 'sm' : 'none'}
                              style={{
                                cursor: 'pointer',
                                borderColor: selectedPhraseId === phrase.id ? DARK_BLUE : '#e9ecef',
                                backgroundColor: 'white',
                                transition: 'all 0.2s ease',
                              }}
                              onClick={() => setSelectedPhraseId(phrase.id)}
                              onDoubleClick={() => insertPhrase(phrase.id)}
                            >
                              <Text fw={600} size="sm" c="dark.9">{phrase.label}</Text>
                              <Text size="xs" c="dimmed" lineClamp={2} mt={4}>{phrase.text}</Text>
                            </Paper>
                          ))
                        )}
                      </Stack>
                    </Box>

                    <Divider my="sm" color="gray.3" />

                    <Text size="sm" fw={700} c="dark.8" mb={8}>Campos dinâmicos</Text>
                    <Box style={{ minHeight: 0, maxHeight: 200, overflowY: 'auto' }}>
                      <Group gap="xs" wrap="wrap">
                        {REPORT_PLACEHOLDERS.map((item) => (
                          <Badge
                            key={item.key}
                            variant="light"
                            color="blue"
                            size="md"
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onDoubleClick={() => insertPlaceholder(item.key)}
                            title={`${item.label} (${item.key}) — duplo clique para inserir`}
                            leftSection={<Plus size={12} />}
                          >
                            {item.label}
                          </Badge>
                        ))}
                      </Group>
                    </Box>
                  </Paper>
                )}

                <Box style={{ flex: 1, minWidth: 0, minHeight: isMobile ? 360 : 0, position: 'relative' }}>
                  {!isMobile && (
                    <Group 
                      gap="xs" 
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                      }}
                    >
                      <Tooltip label={toolsExpanded ? "Ocultar ferramentas" : "Mostrar ferramentas"} position="bottom" withArrow>
                        <ActionIcon
                          variant="default"
                          size="md"
                          radius="md"
                          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                          onClick={() => setToolsExpanded(!toolsExpanded)}
                        >
                          <LayoutTemplate size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={headerExpanded ? "Expandir editor (ocultar cabeçalho)" : "Restaurar cabeçalho"} position="bottom" withArrow>
                        <ActionIcon
                          variant="default"
                          size="md"
                          radius="md"
                          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                          onClick={() => setHeaderExpanded(!headerExpanded)}
                        >
                          {headerExpanded ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    onInit={(_event, editor) => {
                      editorRef.current = editor;
                    }}
                    value={editorContent}
                    onEditorChange={(value) => {
                      setEditorContent(value);
                      setHasEditorChanges(true);
                    }}
                    init={{
                      height: isMobile ? 320 : '100%',
                      menubar: false,
                      resize: false,
                      plugins: ['lists', 'link', 'table', 'wordcount'],
                      toolbar:
                        'undo redo | blocks | bold italic underline | bullist numlist | alignleft aligncenter alignright | table | removeformat',
                      content_style: 'body { font-family:Poppins,sans-serif; font-size:14px; }',
                    }}
                  />
                </Box>
              </Group>

              <Group justify="space-between" align="center" wrap="wrap" style={{ borderTop: '1px solid #e9ecef', paddingTop: 16, paddingBottom: 4 }}>
                <Group gap="xs">
                  <ThemeIcon variant="light" color="gray" size="sm">
                    <Save size={14} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    {lastSavedAt ? `Último salvamento: ${lastSavedAt}` : 'Sem salvamento nesta sessão'}
                  </Text>
                </Group>

                <Group wrap="wrap" justify="flex-end" gap="sm">
                  <Button variant="default" onClick={() => setPdfPreviewModalOpen(true)} leftSection={<FileText size={16} />}>
                    Preview PDF
                  </Button>
                  <Button variant="default" onClick={closeModal}>
                    Fechar
                  </Button>
                  <Button variant="light" color="darkBlue" onClick={() => updateExam('rascunho')} leftSection={<Save size={16} />}>
                    Salvar rascunho
                  </Button>
                  <Button variant="light" color="green" onClick={() => signExam('issuer')} leftSection={<PenTool size={16} />}>
                    Assinar emissor
                  </Button>
                  <Button variant="light" color="blue" onClick={() => signExam('reviewer')} leftSection={<PenTool size={16} />}>
                    Assinar revisor
                  </Button>
                  <Button bg={DARK_BLUE} c="white" onClick={() => updateExam('finalizado')} leftSection={<CheckCircle size={16} />}>
                    Finalizar laudo
                  </Button>
                </Group>
              </Group>
            </Stack>
          )}
        </Modal>

        <Modal
          opened={templatePickerModalOpen}
          onClose={() => { setTemplatePickerModalOpen(false); setTemplateQuery(''); }}
          title="Padrões de laudo"
          centered
          size={isMobile ? '100%' : '70%'}
          fullScreen={isMobile}
        >
          <Group justify="space-between" mb="sm">
            <Text size="sm" c="dimmed">
              {filteredTemplatesByQuery.length} padrões encontrados
            </Text>
          </Group>

          <Group align="stretch" gap="md" wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Paper
              withBorder
              p="sm"
              style={{
                flex: isMobile ? '1 1 100%' : '0 0 320px',
                maxHeight: isMobile ? '36vh' : '60vh',
                overflowY: 'auto',
              }}
            >
              <TextInput
                placeholder="Buscar padrão..."
                value={templateQuery}
                onChange={(event) => setTemplateQuery(event.currentTarget.value)}
                mb="sm"
              />

              <Stack gap="xs">
                {filteredTemplatesByQuery.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Nenhum padrão encontrado.
                  </Text>
                ) : (
                  filteredTemplatesByQuery.map((template) => (
                    <Paper
                      key={template.id}
                      withBorder
                      p="xs"
                      style={{ cursor: 'pointer', borderColor: selectedTemplateId === template.id ? DARK_BLUE : undefined }}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <Text fw={500} size="sm">{template.name}</Text>
                      <Text size="xs" c="dimmed">{template.examType}</Text>
                    </Paper>
                  ))
                )}
              </Stack>
            </Paper>

            <Paper
              withBorder
              p="md"
              style={{
                flex: 1,
                minHeight: isMobile ? '42vh' : 420,
                maxHeight: isMobile ? '42vh' : '60vh',
                overflowY: 'auto',
              }}
            >
              {selectedTemplate ? (
                <>
                  <Badge variant="outline" color="gray" mb="sm">
                    Tipo de exame: {selectedTemplate.examType}
                  </Badge>
                  <Box dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                </>
              ) : (
                <Text size="sm" c="dimmed">Selecione um padrão para visualizar.</Text>
              )}
            </Paper>
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setTemplatePickerModalOpen(false)}>
              Fechar
            </Button>
            <Button bg={DARK_BLUE} c="white" onClick={() => { applyTemplate(); setTemplatePickerModalOpen(false); }}>
              Aplicar padrão
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={pdfPreviewModalOpen}
          onClose={() => setPdfPreviewModalOpen(false)}
          title="Preview do laudo em PDF"
          centered
          size={isMobile ? '100%' : '80%'}
          fullScreen={isMobile}
        >
          <Stack>
            <Box style={{ border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                ref={previewFrameRef}
                title="Preview PDF"
                srcDoc={buildPreviewHtml()}
                style={{ width: '100%', height: isMobile ? '58vh' : '64vh', border: 0 }}
              />
            </Box>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPdfPreviewModalOpen(false)}>
                Fechar
              </Button>
              <Button bg={DARK_BLUE} c="white" onClick={printPreview}>
                Imprimir / Salvar PDF
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Box>
    </Box>
  );
}
