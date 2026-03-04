import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
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
  Timeline,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Search, Calendar, Stethoscope, FileText, Save, PenTool, CheckCircle, LayoutTemplate, Plus, Maximize2, Minimize2, History, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, X, ScanLine } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { Header } from '../Header/Header';
import { DicomViewer } from '../DicomViewer/DicomViewer';
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
  group: string;
  content: string;
}

interface PreviousReport {
  id: string;
  examType: string;
  date: string;
  status: ExamStatus;
  summary: string;
  content: string;
}

interface ReportPhrase {
  id: string;
  examType: string;
  label: string;
  text: string;
}

interface LaudoTab {
  id: string;
  label: string;
  content: string;
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
    name: 'Tórax PA normal',
    examType: 'Raio-X de tórax',
    group: 'Raio-X',
    content:
      '<h3>Descrição</h3><p>Campos pulmonares sem opacidades focais. Silhueta cardíaca preservada.</p><h3>Conclusão</h3><p>Sem sinais radiográficos de alteração aguda.</p>',
  },
  {
    id: 'TMP-004',
    name: 'Tórax PA com derrame',
    examType: 'Raio-X de tórax',
    group: 'Raio-X',
    content:
      '<h3>Descrição</h3><p>Opacidade homogênea ocupando terço inferior do hemitórax direito, com sinal do menisco presente.</p><h3>Conclusão</h3><p>Derrame pleural à direita.</p>',
  },
  {
    id: 'TMP-005',
    name: 'Coluna lombar normal',
    examType: 'Raio-X de coluna',
    group: 'Raio-X',
    content:
      '<h3>Descrição</h3><p>Corpos vertebrais lombares com morfologia e alturas preservadas. Espaços discais mantidos.</p><h3>Conclusão</h3><p>Estudo radiográfico da coluna lombar sem alterações significativas.</p>',
  },
  {
    id: 'TMP-002',
    name: 'Abdômen total normal',
    examType: 'Ultrassom abdominal',
    group: 'Ultrassonografia',
    content:
      '<h3>Descrição</h3><p>Fígado de dimensões normais e ecotextura homogênea. Vias biliares sem dilatação.</p><h3>Conclusão</h3><p>Exame ultrassonográfico sem alterações relevantes.</p>',
  },
  {
    id: 'TMP-006',
    name: 'Abdômen com esteatose',
    examType: 'Ultrassom abdominal',
    group: 'Ultrassonografia',
    content:
      '<h3>Descrição</h3><p>Fígado com dimensões aumentadas e ecogenicidade difusamente aumentada, com atenuação posterior do feixe sonoro.</p><h3>Conclusão</h3><p>Esteatose hepática grau II/III.</p>',
  },
  {
    id: 'TMP-003',
    name: 'Mamografia BI-RADS 2',
    examType: 'Mamografia bilateral',
    group: 'Mamografia',
    content:
      '<h3>Descrição</h3><p>Mamas com padrão fibroglandular, sem nódulos suspeitos ou microcalcificações agrupadas.</p><h3>Conclusão</h3><p>BI-RADS 2.</p>',
  },
  {
    id: 'TMP-007',
    name: 'Crânio sem contraste normal',
    examType: 'Tomografia de crânio',
    group: 'Tomografia',
    content:
      '<h3>Descrição</h3><p>Parênquima encefálico com coeficientes de atenuação normais. Sistema ventricular de dimensões e morfologia preservadas.</p><h3>Conclusão</h3><p>Tomografia computadorizada de crânio sem alterações agudas.</p>',
  },
  {
    id: 'TMP-008',
    name: 'Tórax sem contraste normal',
    examType: 'Tomografia de tórax',
    group: 'Tomografia',
    content:
      '<h3>Descrição</h3><p>Campos pulmonares com transparência preservada. Estruturas mediastinais de aspecto habitual. Não há derrame pleural.</p><h3>Conclusão</h3><p>Tomografia de tórax sem sinais de alteração parenquimatosa ou mediastinal.</p>',
  },
];

const MOCK_PREVIOUS_REPORTS: Record<string, PreviousReport[]> = {
  '123.456.789-01': [
    {
      id: 'EX-OLD-001',
      examType: 'Raio-X de tórax',
      date: '15/01/2026 10:30',
      status: 'finalizado',
      summary: 'Sem sinais radiográficos de alteração aguda.',
      content: '<h3>Descrição</h3><p>Campos pulmonares sem opacidades focais. Silhueta cardíaca preservada.</p><h3>Conclusão</h3><p>Sem sinais radiográficos de alteração aguda.</p>',
    },
    {
      id: 'EX-OLD-002',
      examType: 'Ultrassom abdominal',
      date: '02/12/2025 14:00',
      status: 'finalizado',
      summary: 'Esteatose hepática leve. Demais órgãos sem alterações.',
      content: '<h3>Descrição</h3><p>Fígado com dimensões normais e ecogenicidade levemente aumentada. Vias biliares sem dilatação.</p><h3>Conclusão</h3><p>Esteatose hepática leve.</p>',
    },
  ],
  '987.654.321-55': [
    {
      id: 'EX-OLD-003',
      examType: 'Ultrassom abdominal',
      date: '10/11/2025 09:15',
      status: 'finalizado',
      summary: 'Sem alterações ultrassonográficas significativas.',
      content: '<h3>Descrição</h3><p>Fígado com dimensões preservadas e ecotextura homogênea.</p><h3>Conclusão</h3><p>Sem alterações ultrassonográficas significativas.</p>',
    },
  ],
  '111.222.333-44': [],
};

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
  const [templates, setTemplates] = useState<ReportTemplate[]>(MOCK_REPORT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState('');
  const [phraseQuery, setPhraseQuery] = useState('');
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<ReportPhrase[]>(MOCK_REPORT_PHRASES);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [previousReportsModalOpen, setPreviousReportsModalOpen] = useState(false);
  const [selectedPreviousReport, setSelectedPreviousReport] = useState<PreviousReport | null>(null);
  const [expandedTemplateGroups, setExpandedTemplateGroups] = useState<Record<string, boolean>>({});
  const [laudoTabs, setLaudoTabs] = useState<LaudoTab[]>([]);
  const [activeLaudoTabId, setActiveLaudoTabId] = useState<string | null>(null);
  const [dicomViewerVisible, setDicomViewerVisible] = useState(false);

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

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ReportTemplate[]> = {};
    filteredTemplatesByQuery.forEach((template) => {
      const group = template.group || 'Outros';
      if (!groups[group]) groups[group] = [];
      groups[group].push(template);
    });
    return groups;
  }, [filteredTemplatesByQuery]);

  const previousReports = useMemo(() => {
    if (!selectedExam) return [];
    return MOCK_PREVIOUS_REPORTS[selectedExam.cpf] || [];
  }, [selectedExam]);

  const toggleTemplateGroup = (group: string) => {
    setExpandedTemplateGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

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
      setLaudoTabs([]);
      setActiveLaudoTabId(null);
      return;
    }

    const initialTab: LaudoTab = {
      id: `laudo-${Date.now()}`,
      label: 'Laudo 1',
      content: selectedExam.reportText || TEMPLATE_TEXT,
    };
    setLaudoTabs([initialTab]);
    setActiveLaudoTabId(initialTab.id);
    setEditorContent(initialTab.content);
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
    const contentToSave = contentOverride ?? getAllLaudoContent();

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

    if (notify && source === 'manual') {
      showNotification({
        title: 'Rascunho salvo',
        message: `Rascunho do exame ${selectedExam.id} salvo com sucesso.`,
        color: 'green',
      });
    }
  };



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

  };

  const openExam = (examId: string) => {
    setSelectedExamId(examId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTemplatePickerModalOpen(false);
    setPdfPreviewModalOpen(false);
    setPreviousReportsModalOpen(false);
    setSelectedPreviousReport(null);
    setSelectedTemplateId(null);
    setSelectedPhraseId(null);
    setTemplateQuery('');
    setPhraseQuery('');
    setLaudoTabs([]);
    setActiveLaudoTabId(null);
  };

  const switchLaudoTab = (tabId: string) => {
    if (tabId === activeLaudoTabId) return;
    const targetTab = laudoTabs.find(t => t.id === tabId);
    if (!targetTab) return;
    setLaudoTabs(prev => prev.map(tab =>
      tab.id === activeLaudoTabId ? { ...tab, content: editorContent } : tab
    ));
    setEditorContent(targetTab.content);
    setActiveLaudoTabId(tabId);
  };

  const addLaudoTab = () => {
    const newId = `laudo-${Date.now()}`;
    const newLabel = `Laudo ${laudoTabs.length + 1}`;
    const newTab: LaudoTab = {
      id: newId,
      label: newLabel,
      content: TEMPLATE_TEXT,
    };
    setLaudoTabs(prev => [
      ...prev.map(tab => tab.id === activeLaudoTabId ? { ...tab, content: editorContent } : tab),
      newTab,
    ]);
    setActiveLaudoTabId(newId);
    setEditorContent(TEMPLATE_TEXT);
  };

  const removeLaudoTab = (tabId: string) => {
    if (laudoTabs.length <= 1) return;
    const synced = laudoTabs.map(tab =>
      tab.id === activeLaudoTabId ? { ...tab, content: editorContent } : tab
    );
    const filtered = synced.filter(tab => tab.id !== tabId);
    setLaudoTabs(filtered);
    if (tabId === activeLaudoTabId) {
      const newActive = filtered[0];
      setActiveLaudoTabId(newActive.id);
      setEditorContent(newActive.content);
    }
  };

  const getAllLaudoContent = (): string => {
    const allTabs = laudoTabs.map(tab =>
      tab.id === activeLaudoTabId ? { ...tab, content: editorContent } : tab
    );
    if (allTabs.length === 1) return allTabs[0].content;
    return allTabs.map((tab, index) => {
      const pageBreak = index > 0
        ? '<hr style="page-break-after: always; border: none; margin: 24px 0;" />'
        : '';
      return pageBreak + '<h2>' + tab.label + '</h2>' + tab.content;
    }).join('');
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
    showNotification({
      title: 'Frase inserida',
      message: `A frase "${phrase.label}" foi inserida no laudo.`,
      color: 'blue',
    });
  };

  const buildPreviewHtml = () => {
    if (!selectedExam) return '';

    const resolvedContent = resolvePlaceholders(getAllLaudoContent(), selectedExam);

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
          reportText: getAllLaudoContent(),
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
              reportText: getAllLaudoContent(),
            }
          : exam,
      ),
    );

    const now = new Date();
    setLastSavedAt(now.toLocaleString('pt-BR'));
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
                      mb="sm" 
                      fullWidth
                      leftSection={<LayoutTemplate size={18} />}
                    >
                      Padrão de Laudo
                    </Button>

                    <Button 
                      variant="light" 
                      color="darkBlue" 
                      onClick={() => { setPreviousReportsModalOpen(true); setSelectedPreviousReport(null); }} 
                      mb="sm" 
                      fullWidth
                      leftSection={<History size={18} />}
                    >
                      Laudos Anteriores
                      {previousReports.length > 0 && (
                        <Badge size="sm" variant="filled" color="darkBlue" ml="xs" circle>
                          {previousReports.length}
                        </Badge>
                      )}
                    </Button>

                    <Button 
                      variant={dicomViewerVisible ? 'filled' : 'light'}
                      color="darkBlue" 
                      onClick={() => setDicomViewerVisible((v) => !v)} 
                      mb="md" 
                      fullWidth
                      leftSection={<ScanLine size={18} />}
                    >
                      {dicomViewerVisible ? 'Ocultar imagem' : 'Imagem DICOM'}
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
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.15s ease',
                            }}
                            className="dynamic-field-badge"
                            onClick={() => insertPlaceholder(item.key)}
                            title={`${item.label} — clique para inserir`}
                            leftSection={<Plus size={12} />}
                          >
                            {item.label}
                          </Badge>
                        ))}
                      </Group>
                    </Box>
                  </Paper>
                )}

                {!isMobile && dicomViewerVisible && (
                  <Box style={{ flex: '1 1 50%', minWidth: 0, minHeight: 0 }}>
                    <DicomViewer style={{ height: '100%' }} />
                  </Box>
                )}

                <Box style={{ flex: '1 1 50%', minWidth: 0, minHeight: isMobile ? 360 : 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
                          {toolsExpanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
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

                  <Paper
                    withBorder
                    px="xs"
                    py={4}
                    bg="gray.1"
                    style={{
                      borderBottom: 'none',
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                      flexShrink: 0,
                    }}
                  >
                    <Group gap={4} align="center">
                      {laudoTabs.map((tab) => (
                        <Button
                          key={tab.id}
                          variant={tab.id === activeLaudoTabId ? 'filled' : 'subtle'}
                          color={tab.id === activeLaudoTabId ? 'darkBlue' : 'gray'}
                          size="compact-sm"
                          onClick={() => switchLaudoTab(tab.id)}
                          styles={{ root: { fontWeight: tab.id === activeLaudoTabId ? 700 : 500 } }}
                          rightSection={
                            laudoTabs.length > 1 ? (
                              <ActionIcon
                                size={16}
                                variant="transparent"
                                color={tab.id === activeLaudoTabId ? 'white' : 'gray'}
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); removeLaudoTab(tab.id); }}
                              >
                                <X size={12} />
                              </ActionIcon>
                            ) : undefined
                          }
                        >
                          {tab.label}
                        </Button>
                      ))}
                      <Tooltip label="Adicionar laudo" position="bottom" withArrow>
                        <ActionIcon variant="subtle" color="gray" size="sm" onClick={addLaudoTab}>
                          <Plus size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Paper>

                  <Box style={{ flex: 1, minHeight: 0 }}>
                    <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    onInit={(_event, editor) => {
                      editorRef.current = editor;
                    }}
                    value={editorContent}
                    onEditorChange={(value) => {
                      setEditorContent(value);
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
          title="Padrão de Laudo"
          centered
          size={isMobile ? '100%' : '75%'}
          fullScreen={isMobile}
        >
          <Group justify="space-between" mb="sm" align="center">
            <Text size="sm" c="dimmed">
              {filteredTemplatesByQuery.length} padrões em {Object.keys(groupedTemplates).length} grupo(s)
            </Text>
          </Group>

          <Group align="stretch" gap="md" wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Paper
              withBorder
              p="sm"
              style={{
                flex: isMobile ? '1 1 100%' : '0 0 340px',
                maxHeight: isMobile ? '36vh' : '60vh',
                overflowY: 'auto',
              }}
            >
              <TextInput
                placeholder="Buscar padrão..."
                value={templateQuery}
                onChange={(event) => setTemplateQuery(event.currentTarget.value)}
                mb="sm"
                leftSection={<Search size={16} />}
              />

              {Object.keys(groupedTemplates).length === 0 ? (
                <Text size="sm" c="dimmed">Nenhum padrão encontrado.</Text>
              ) : (
                <Stack gap="xs">
                  {Object.entries(groupedTemplates).map(([group, groupTemplates]) => (
                    <Box key={group}>
                      <Paper
                        p="xs"
                        bg="gray.1"
                        radius="sm"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleTemplateGroup(group)}
                      >
                        <Group gap="xs" align="center">
                          {expandedTemplateGroups[group] === false ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          <Text size="sm" fw={700} c="dark.8">{group}</Text>
                          <Badge size="xs" variant="light" color="gray" ml="auto">{groupTemplates.length}</Badge>
                        </Group>
                      </Paper>
                      <Collapse in={expandedTemplateGroups[group] !== false}>
                        <Stack gap={4} mt={4} pl="sm">
                          {groupTemplates.map((template) => (
                            <Paper
                              key={template.id}
                              withBorder
                              p="xs"
                              shadow={selectedTemplateId === template.id ? 'sm' : 'none'}
                              style={{
                                cursor: 'pointer',
                                borderColor: selectedTemplateId === template.id ? DARK_BLUE : '#e9ecef',
                                backgroundColor: selectedTemplateId === template.id ? '#f0f4ff' : 'white',
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => setSelectedTemplateId(template.id)}
                            >
                              <Text fw={600} size="sm" c="dark.9">{template.name}</Text>
                              <Text size="xs" c="dimmed">{template.examType}</Text>
                            </Paper>
                          ))}
                        </Stack>
                      </Collapse>
                    </Box>
                  ))}
                </Stack>
              )}
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
                  <Group gap="sm" mb="md">
                    <Badge variant="light" color="darkBlue">{selectedTemplate.group}</Badge>
                    <Badge variant="outline" color="gray">{selectedTemplate.examType}</Badge>
                  </Group>
                  <Title order={5} mb="sm" c="dark.9">{selectedTemplate.name}</Title>
                  <Box dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                </>
              ) : (
                <Stack align="center" justify="center" style={{ height: '100%', opacity: 0.5 }}>
                  <LayoutTemplate size={48} />
                  <Text size="sm" c="dimmed">Selecione um padrão para visualizar.</Text>
                </Stack>
              )}
            </Paper>
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setTemplatePickerModalOpen(false)}>
              Fechar
            </Button>
            <Button bg={DARK_BLUE} c="white" onClick={() => { applyTemplate(); setTemplatePickerModalOpen(false); }} leftSection={<CheckCircle size={16} />}>
              Aplicar padrão
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={previousReportsModalOpen}
          onClose={() => { setPreviousReportsModalOpen(false); setSelectedPreviousReport(null); }}
          title="Laudos Anteriores do Paciente"
          centered
          size={isMobile ? '100%' : '75%'}
          fullScreen={isMobile}
        >
          {selectedExam && (
            <>
              <Paper withBorder p="sm" mb="md" bg="gray.0" radius="md">
                <Group gap="sm">
                  <ThemeIcon variant="light" color="darkBlue" size="lg">
                    <History size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} size="sm" c="dark.9">{selectedExam.patientName}</Text>
                    <Text size="xs" c="dimmed">CPF: {selectedExam.cpf} • {previousReports.length} laudo(s) anterior(es)</Text>
                  </Box>
                </Group>
              </Paper>

              <Group align="stretch" gap="md" wrap={isMobile ? 'wrap' : 'nowrap'}>
                <Paper
                  withBorder
                  p="sm"
                  style={{
                    flex: isMobile ? '1 1 100%' : '0 0 340px',
                    maxHeight: isMobile ? '36vh' : '55vh',
                    overflowY: 'auto',
                  }}
                >
                  {previousReports.length === 0 ? (
                    <Stack align="center" justify="center" py="xl">
                      <History size={40} color="#adb5bd" />
                      <Text size="sm" c="dimmed" ta="center">Nenhum laudo anterior encontrado para este paciente.</Text>
                    </Stack>
                  ) : (
                    <Timeline active={-1} bulletSize={28} lineWidth={2}>
                      {previousReports.map((report) => (
                        <Timeline.Item
                          key={report.id}
                          bullet={<FileText size={14} />}
                          title={
                            <Text fw={600} size="sm" c="dark.9" style={{ cursor: 'pointer' }} onClick={() => setSelectedPreviousReport(report)}>
                              {report.examType}
                            </Text>
                          }
                        >
                          <Paper
                            withBorder
                            p="xs"
                            mt={4}
                            shadow={selectedPreviousReport?.id === report.id ? 'sm' : 'none'}
                            style={{
                              cursor: 'pointer',
                              borderColor: selectedPreviousReport?.id === report.id ? DARK_BLUE : '#e9ecef',
                              backgroundColor: selectedPreviousReport?.id === report.id ? '#f0f4ff' : 'white',
                              transition: 'all 0.15s ease',
                            }}
                            onClick={() => setSelectedPreviousReport(report)}
                          >
                            <Group gap="xs" mb={4}>
                              <Badge size="xs" variant="light" color="gray">{report.date}</Badge>
                              <Badge size="xs" variant="light" color="green">{statusLabel[report.status]}</Badge>
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={2}>{report.summary}</Text>
                          </Paper>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  )}
                </Paper>

                <Paper
                  withBorder
                  p="md"
                  style={{
                    flex: 1,
                    minHeight: isMobile ? '42vh' : 400,
                    maxHeight: isMobile ? '42vh' : '55vh',
                    overflowY: 'auto',
                  }}
                >
                  {selectedPreviousReport ? (
                    <>
                      <Group gap="sm" mb="sm">
                        <Badge variant="light" color="darkBlue">{selectedPreviousReport.examType}</Badge>
                        <Badge variant="light" color="gray">{selectedPreviousReport.date}</Badge>
                        <Badge variant="light" color="green">{statusLabel[selectedPreviousReport.status]}</Badge>
                      </Group>
                      <Divider mb="sm" />
                      <Box dangerouslySetInnerHTML={{ __html: selectedPreviousReport.content }} />
                    </>
                  ) : (
                    <Stack align="center" justify="center" style={{ height: '100%', opacity: 0.5 }}>
                      <FileText size={48} />
                      <Text size="sm" c="dimmed">Selecione um laudo anterior para visualizar.</Text>
                    </Stack>
                  )}
                </Paper>
              </Group>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => setPreviousReportsModalOpen(false)}>
                  Fechar
                </Button>
              </Group>
            </>
          )}
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
