import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  useMantineColorScheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, Search, Calendar, Stethoscope, FileText, Save, PenTool, CheckCircle, LayoutTemplate, Plus, Maximize2, Minimize2, History, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, ScanLine, Settings, Eye, RotateCcw, ShieldCheck, Layers, Mic, MicOff } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { Header } from '../Header/Header';
import { DicomViewer } from '../DicomViewer/DicomViewer';
import { DARK_BLUE } from '../../themes/theme';
import reportWorklistService from '../../services/reportWorklistService';
import reportTemplateService from '../../services/reportTemplateService';
import reportPhraseService from '../../services/reportPhraseService';
import reportService from '../../services/reportService';
import reportConfigService from '../../services/reportConfigService';
import authService from '../../services/authService';
import reportAddendumService from '../../services/reportAddendumService';

type ExamStatus = 'sem_laudo' | 'laudado' | 'revisado' | 'finalizado';
type ExamPriority = 'normal' | 'urgente';

interface ExamItem {
  id: string;
  dicomStudyUid?: string;
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
  hasFinalizedAddendum?: boolean;
  dicomUrl?: string;
  dicomPath?: string;
}

const isRichTextEmpty = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim().length === 0;

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
    status: 'sem_laudo',
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
    status: 'laudado',
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
  {
    id: 'EX-004',
    patientName: 'Carlos Alberto Ferreira',
    cpf: '444.555.666-77',
    examType: 'Tomografia de crânio',
    scheduledAt: '20/03/2026 08:30',
    convenio: 'Unimed',
    requestingDoctor: 'Dr. Rafael Mendonça',
    assignedTo: 'Dra. Priscila Vaz',
    priority: 'urgente',
    status: 'revisado',
    reportText: `<h3>Descrição</h3>
<p>Exame realizado sem a administração de meio de contraste endovenoso.</p>
<p>Parênquima encefálico com coeficientes de atenuação preservados. Não são identificadas áreas de hiperdensidade ou hipodensidade parenquimatosa sugestivas de sangramento agudo ou lesão isquêmica estabelecida.</p>
<p>Sistema ventricular de morfologia e dimensões normais para a faixa etária. Sulcos corticais presentes e simétricos, sem evidência de apagamento.</p>
<p>Estruturas da linha média centradas. Sela turca sem alterações. Cisternas basais pérvias.</p>
<p>Órbitas, seios paranasais e mastoides com aspecto habitual. Partes moles do couro cabeludo sem alterações.</p>
<h3>Conclusão</h3>
<p>Tomografia computadorizada de crânio sem contraste <strong>sem alterações agudas</strong> ao presente exame. Correlacionar com o quadro clínico.</p>
<h3>Observações</h3>
<p>Sugere-se complementação com ressonância magnética caso a suspeita clínica de lesão de partes moles ou processo desmielinizante persista.</p>`,
    issuerSignedAt: '20/03/2026 09:15',
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
  sem_laudo: 'gray',
  laudado: 'blue',
  revisado: 'cyan',
  finalizado: 'green',
};

const statusLabel: Record<ExamStatus, string> = {
  sem_laudo: 'Sem laudo',
  laudado: 'Laudado',
  revisado: 'Revisado',
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

const normalizeExamStatus = (status: any): ExamStatus => {
  if (status === 'finalizado') return 'finalizado';
  if (status === 'revisado') return 'revisado';
  if (status === 'laudado') return 'laudado';
  if (status === 'rascunho') return 'laudado';
  if (status === 'pendente') return 'sem_laudo';
  return 'sem_laudo';
};

export function LaudoExames() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const { colorScheme } = useMantineColorScheme();
  const editorRef = useRef<any>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const isDark = colorScheme === 'dark';
  const pageBg = isDark ? 'var(--mantine-color-body)' : '#f8f9fa';
  const panelBg = isDark ? 'transparent' : 'var(--mantine-color-white)';
  const subtleBg = isDark ? 'rgba(255,255,255,0.03)' : 'var(--mantine-color-gray-0)';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.02)' : 'white';
  const borderColor = isDark ? 'var(--mantine-color-default-border)' : '#e9ecef';
  const titleColor = isDark ? 'var(--mantine-color-text)' : DARK_BLUE;
  const subtitleColor = isDark ? 'var(--mantine-color-dimmed)' : `${DARK_BLUE}B3`;
  const selectedRowBg = isDark ? 'rgba(255,255,255,0.06)' : '#edf2ff';

  const [query, setQuery] = useState('');
  const [examRows, setExamRows] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [templatePickerModalOpen, setTemplatePickerModalOpen] = useState(false);
  const location = useLocation();
  const [pdfPreviewModalOpen, setPdfPreviewModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState('');
  const [phraseQuery, setPhraseQuery] = useState('');
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<ReportPhrase[]>([]);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [previousReportsModalOpen, setPreviousReportsModalOpen] = useState(false);
  const [selectedPreviousReport, setSelectedPreviousReport] = useState<PreviousReport | null>(null);
  const [expandedTemplateGroups, setExpandedTemplateGroups] = useState<Record<string, boolean>>({});
  const [dicomViewerVisible, setDicomViewerVisible] = useState(false);
  const [previousReportsFromApi, setPreviousReportsFromApi] = useState<Record<string, PreviousReport[]>>({});
  const [requiresReviewer, setRequiresReviewer] = useState(true);
  const [signPasswordModalOpen, setSignPasswordModalOpen] = useState(false);
  const [signPassword, setSignPassword] = useState('');
  const [signRolePending, setSignRolePending] = useState<'issuer' | 'reviewer' | 'addendum-issuer' | 'addendum-reviewer' | null>(null);
  const [signLoading, setSignLoading] = useState(false);
  const [addendumModalOpen, setAddendumModalOpen] = useState(false);
  const [addendumId, setAddendumId] = useState<string | null>(null);
  const [addendumText, setAddendumText] = useState('');
  const [addendumIssuerSignedAt, setAddendumIssuerSignedAt] = useState<string | null>(null);
  const [addendumReviewerSignedAt, setAddendumReviewerSignedAt] = useState<string | null>(null);
  const [addendumSavedAt, setAddendumSavedAt] = useState<string | null>(null);
  const [addendumLoading, setAddendumLoading] = useState(false);
  const [addendumSaving, setAddendumSaving] = useState(false);
  const [addendumFinalizing, setAddendumFinalizing] = useState(false);
  const [savingLaudo, setSavingLaudo] = useState(false);
  const [finalizePasswordModalOpen, setFinalizePasswordModalOpen] = useState(false);
  const [finalizePassword, setFinalizePassword] = useState('');
  const [finalizeTarget, setFinalizeTarget] = useState<'laudo' | 'adendo' | null>(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  // ===== Ditado por voz =====
  const [isDictating, setIsDictating] = useState(false);
  const [dictationSupported] = useState(() => {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  });
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveNetworkFailsRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(0);

  const createRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      consecutiveNetworkFailsRef.current = 0; // reset ao receber resultado
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        if (editorRef.current) {
          editorRef.current.insertContent(finalTranscript);
          setEditorContent(editorRef.current.getContent());
        } else {
          setEditorContent((prev) => prev + finalTranscript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'network') {
        consecutiveNetworkFailsRef.current += 1;
        recognitionRef.current = null; // impede onend de reiniciar diretamente

        const elapsed = Date.now() - sessionStartedAtRef.current;
        const isInstantFail = elapsed < 2000 && consecutiveNetworkFailsRef.current >= 3;

        if (isInstantFail || consecutiveNetworkFailsRef.current > 8) {
          // Muitas falhas instantâneas = problema real de conexão ou permissão
          shouldRestartRef.current = false;
          setIsDictating(false);
          consecutiveNetworkFailsRef.current = 0;
          showNotification({
            title: 'Serviço de voz indisponível',
            message: 'Não foi possível usar o reconhecimento de voz. Certifique-se de que o microfone está permitido e a internet está funcionando.',
            color: 'orange',
            autoClose: 7000,
          });
          return;
        }

        // Falha transitória (sessão expirou no Chrome, etc.) — reconecta silenciosamente
        if (shouldRestartRef.current) {
          const delay = Math.min(500 * consecutiveNetworkFailsRef.current, 3000);
          sessionStartedAtRef.current = Date.now();
          restartTimerRef.current = setTimeout(() => {
            if (shouldRestartRef.current) {
              const r = createRecognition();
              recognitionRef.current = r;
              try { r.start(); } catch { /* ignore */ }
            }
          }, delay);
        }
        return;
      }
      // outros erros desconhecidos
      shouldRestartRef.current = false;
      recognitionRef.current = null;
      setIsDictating(false);
      showNotification({ title: 'Erro no ditado', message: `Erro: ${event.error}`, color: 'red' });
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* ignore */ }
      }
    };

    return recognition;
  };

  const startDictation = () => {
    if (!dictationSupported) {
      showNotification({ title: 'Não suportado', message: 'Seu navegador não suporta ditado por voz. Use Chrome ou Edge.', color: 'orange' });
      return;
    }
    consecutiveNetworkFailsRef.current = 0;
    sessionStartedAtRef.current = Date.now();
    shouldRestartRef.current = true;
    const recognition = createRecognition();
    recognitionRef.current = recognition;
    recognition.start();
    setIsDictating(true);
    showNotification({ title: 'Ditado iniciado', message: 'Fale agora. O texto será inserido no editor em tempo real.', color: 'green' });
  };

  const stopDictation = () => {
    shouldRestartRef.current = false;
    consecutiveNetworkFailsRef.current = 0;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsDictating(false);
    showNotification({ title: 'Ditado encerrado', message: 'Gravação parada.', color: 'gray' });
  };

  const toggleDictation = () => {
    if (isDictating) stopDictation();
    else startDictation();
  };
  // ===========================

  const requestSignature = (role: 'issuer' | 'reviewer' | 'addendum-issuer' | 'addendum-reviewer') => {
    setSignRolePending(role);
    setSignPassword('');
    setSignPasswordModalOpen(true);
  };

  const requestFinalize = (target: 'laudo' | 'adendo') => {
    setFinalizeTarget(target);
    setFinalizePassword('');
    setFinalizePasswordModalOpen(true);
  };

  const verifyCurrentUserPassword = async (password: string): Promise<boolean> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.email) return false;

    try {
      await authService.login({ email: currentUser.email, password });
      return true;
    } catch {
      return false;
    }
  };

  const mapApiToExam = (it: any): ExamItem => ({
    id: String(it.id || ''),
    dicomStudyUid: it.dicomStudyUid || undefined,
    patientName: it.patientName || '',
    cpf: it.patientCpf || '',
    examType: it.examType || '',
    scheduledAt: it.scheduledAt || '',
    convenio: it.convenio || '',
    requestingDoctor: it.requestingDoctor || '-',
    assignedTo: it.assignedTo || '-',
    priority: (it.priority === 'urgente' ? 'urgente' : 'normal') as ExamPriority,
    status: normalizeExamStatus(it.status),
    reportText: it.reportText || '',
    issuerSignedAt: it.issuerSignedAt || undefined,
    reviewerSignedAt: it.reviewerSignedAt || undefined,
    hasFinalizedAddendum: Boolean(it.hasFinalizedAddendum),
    dicomUrl: it.dicomUrl || undefined,
    dicomPath: it.dicomPath || undefined,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [worklistData, templateData, phraseData, configData] = await Promise.all([
          reportWorklistService.list({ limit: 300, offset: 0 }),
          reportTemplateService.list({ limit: 300, offset: 0 }),
          reportPhraseService.list({ limit: 300, offset: 0 }),
          reportConfigService.get(),
        ]);

        const worklist = Array.isArray(worklistData)
          ? worklistData
          : (Array.isArray(worklistData?.items)
            ? worklistData.items
            : (Array.isArray(worklistData?.data?.items)
              ? worklistData.data.items
              : []));
        const templatesList = Array.isArray(templateData)
          ? templateData
          : (Array.isArray(templateData?.items)
            ? templateData.items
            : (Array.isArray(templateData?.data?.items)
              ? templateData.data.items
              : []));
        const phrasesList = Array.isArray(phraseData)
          ? phraseData
          : (Array.isArray(phraseData?.items)
            ? phraseData.items
            : (Array.isArray(phraseData?.data?.items)
              ? phraseData.data.items
              : []));

        const mappedWorklist = worklist.map(mapApiToExam).filter((item: ExamItem) => item.id);
        setExamRows(mappedWorklist.length > 0 ? mappedWorklist : MOCK_EXAMS);

        const mappedTemplates = templatesList.map((item: any) => ({
          id: String(item.id || ''),
          name: item.name || '',
          examType: item.examType || '',
          group: item.group || 'Outros',
          content: item.content || TEMPLATE_TEXT,
        })).filter((item: ReportTemplate) => item.id);
        setTemplates(mappedTemplates.length > 0 ? mappedTemplates : MOCK_REPORT_TEMPLATES);

        const mappedPhrases = phrasesList.map((item: any) => ({
          id: String(item.id || ''),
          examType: item.examType || '',
          label: item.label || '',
          text: item.text || '',
        })).filter((item: ReportPhrase) => item.id);
        setPhrases(mappedPhrases.length > 0 ? mappedPhrases : MOCK_REPORT_PHRASES);
        setRequiresReviewer(Boolean(configData?.requiresReviewer ?? true));
      } catch (err: any) {
        setExamRows(MOCK_EXAMS);
        setTemplates(MOCK_REPORT_TEMPLATES);
        setPhrases(MOCK_REPORT_PHRASES);
        setRequiresReviewer(true);
        showNotification({
          title: 'Erro',
          message: err?.response?.data?.message || err?.message || 'Erro ao carregar dados de laudo. Exibindo dados locais de fallback.',
          color: 'red',
        });
      }
    };

    loadData();
  }, []);

  const selectedExam = useMemo(
    () => examRows.find((exam) => exam.id === selectedExamId) || null,
    [examRows, selectedExamId],
  );

  // buffer that will be passed to the DicomViewer (single file)
  const [initialDicomData, setInitialDicomData] = useState<ArrayBuffer | null>(null);
  // optional series buffers
  const [initialDicomSeries, setInitialDicomSeries] = useState<ArrayBuffer[] | null>(null);

  // when a new exam is selected, try downloading whatever DICOMs exist
  useEffect(() => {
    if (!selectedExam) {
      setInitialDicomData(null);
      setInitialDicomSeries(null);
      return;
    }

    // prefer fetching full series; fall back to single URL if provided
    reportWorklistService
      .fetchDicomSeries(selectedExam.id)
      .then((buffers) => {
        if (buffers && buffers.length > 0) {
          setInitialDicomSeries(buffers);
          setInitialDicomData(null);
          // removido auto-show: setDicomViewerVisible(true);
        } else if (selectedExam.dicomUrl) {
          return reportWorklistService.fetchDicomUrl(selectedExam.dicomUrl).then((ab) => {
            setInitialDicomData(ab);
            setInitialDicomSeries(null);
            // removido auto-show: setDicomViewerVisible(true);
          });
        } else {
          setInitialDicomData(null);
          setInitialDicomSeries(null);
        }
      })
      .catch((err) => {
        if (selectedExam.dicomUrl) {
          // try single fallback if series lookup failed
          reportWorklistService
            .fetchDicomUrl(selectedExam.dicomUrl)
            .then((ab) => {
              setInitialDicomData(ab);
              setInitialDicomSeries(null);
              // removido auto-show: setDicomViewerVisible(true);
            })
            .catch(() => {});
        }
        showNotification({
          title: 'Erro ao carregar DICOM',
          message: err?.response?.data?.message || err?.message || String(err),
          color: 'red',
        });
      });
  }, [selectedExam, selectedExam?.dicomUrl]);

  const isLaudoDirty = useMemo(() => {
    if (!selectedExam) return false;
    return editorContent !== (selectedExam.reportText || '');
  }, [selectedExam, editorContent]);

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
    return previousReportsFromApi[selectedExam.cpf] || MOCK_PREVIOUS_REPORTS[selectedExam.cpf] || [];
  }, [selectedExam, previousReportsFromApi]);

  useEffect(() => {
    const loadPreviousReports = async () => {
      if (!selectedExam?.cpf) return;
      if (previousReportsFromApi[selectedExam.cpf]) return;

      try {
        const data: any = await reportService.list({ search: selectedExam.cpf, limit: 20, offset: 0 });
        const list: any[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items)
            ? data.items
            : (Array.isArray(data?.data?.items)
              ? data.data.items
              : []));

        const mapped = list.map((it: any) => ({
          id: String(it.id || ''),
          examType: it.exam || 'Exame',
          date: it.scheduledFor || '-',
          status: normalizeExamStatus(it.status),
          summary: it.conclusion || it.description || 'Sem resumo',
          content: it.description || TEMPLATE_TEXT,
        })).filter((it: PreviousReport) => it.id);

        setPreviousReportsFromApi((prev) => ({ ...prev, [selectedExam.cpf]: mapped }));
      } catch {
        // Keep fallback without blocking the editor flow.
      }
    };

    loadPreviousReports();
  }, [selectedExam, previousReportsFromApi]);

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
      return;
    }

    setEditorContent(selectedExam.reportText || '');
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
    if (selectedExam?.status === 'finalizado') {
      showNotification({
        title: 'Laudo finalizado',
        message: 'Nao e permitido editar um laudo finalizado.',
        color: 'yellow',
      });
      return;
    }
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get('itemId');
    if (itemId) {
      openExam(itemId);
    }
  }, [location.search]);

  const openAddendumModal = async () => {
    if (!selectedExam) return;

    setAddendumLoading(true);
    setAddendumModalOpen(true);
    try {
      const data = await reportAddendumService.list({ worklistItemId: selectedExam.id, status: 'draft', limit: 1, offset: 0 });
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : []);
      const draft = list[0];

      if (draft) {
        setAddendumId(String(draft.id));
        setAddendumText(String(draft.content || ''));
        setAddendumIssuerSignedAt(draft.issuerSignedAt || null);
        setAddendumReviewerSignedAt(draft.reviewerSignedAt || null);
        setAddendumSavedAt(draft.savedAt || null);
      } else {
        setAddendumId(null);
        setAddendumText('');
        setAddendumIssuerSignedAt(null);
        setAddendumReviewerSignedAt(null);
        setAddendumSavedAt(null);
      }
    } catch (err: any) {
      showNotification({
        title: 'Erro ao carregar adendo',
        message: err?.response?.data?.message || err?.message || 'Não foi possível carregar o rascunho de adendo',
        color: 'red',
      });
    } finally {
      setAddendumLoading(false);
    }
  };

  const ensureAddendumDraft = async () => {
    if (!selectedExam) return null;
    if (addendumId) return addendumId;

    const created = await reportAddendumService.create({
      worklistItemId: selectedExam.id,
      content: addendumText,
      status: 'draft',
      issuerSignedAt: addendumIssuerSignedAt,
      reviewerSignedAt: addendumReviewerSignedAt,
      savedAt: addendumSavedAt,
    });

    const createdId = String(created?.id || '');
    if (!createdId) return null;
    setAddendumId(createdId);
    return createdId;
  };

  const closeModal = () => {
    // parar ditado se estiver ativo
    shouldRestartRef.current = false;
    consecutiveNetworkFailsRef.current = 0;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsDictating(false);
    setModalOpen(false);
    setTemplatePickerModalOpen(false);
    setPdfPreviewModalOpen(false);
    setPreviousReportsModalOpen(false);
    setSelectedPreviousReport(null);
    setSelectedTemplateId(null);
    setSelectedPhraseId(null);
    setTemplateQuery('');
    setPhraseQuery('');
    setSavingLaudo(false);
    setAddendumId(null);
    setAddendumText('');
    setAddendumIssuerSignedAt(null);
    setAddendumReviewerSignedAt(null);
    setAddendumSavedAt(null);
  };

  const getAllLaudoContent = (): string => {
    return editorContent;
  };

  const applyTemplate = () => {
    if (selectedExam?.status === 'finalizado') {
      showNotification({
        title: 'Laudo finalizado',
        message: 'Nao e permitido editar um laudo finalizado.',
        color: 'yellow',
      });
      return;
    }
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
    if (selectedExam?.status === 'finalizado') {
      showNotification({
        title: 'Laudo finalizado',
        message: 'Nao e permitido editar um laudo finalizado.',
        color: 'yellow',
      });
      return;
    }
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
          <div class="signature">Emissor: ${selectedExam.issuerSignedAt || 'Pendente'} • Revisor: ${requiresReviewer ? (selectedExam.reviewerSignedAt || 'Pendente') : 'Nao obrigatorio'}</div>
        </body>
      </html>
    `;
  };

  const printPreview = () => {
    previewFrameRef.current?.contentWindow?.focus();
    previewFrameRef.current?.contentWindow?.print();
  };

  const signExam = async (role: 'issuer' | 'reviewer') => {
    if (!selectedExam) return;
    if (selectedExam.status === 'finalizado') {
      showNotification({
        title: 'Laudo finalizado',
        message: 'Nao e permitido editar um laudo finalizado.',
        color: 'yellow',
      });
      return;
    }
    if (role === 'reviewer' && !selectedExam.issuerSignedAt) {
      showNotification({
        title: 'Assinatura bloqueada',
        message: 'A revisao so pode ser feita apos assinatura do emissor.',
        color: 'yellow',
      });
      return;
    }
    if (role === 'issuer' && selectedExam.issuerSignedAt) return;
    if (role === 'reviewer' && selectedExam.reviewerSignedAt) return;

    const signatureDate = new Date().toLocaleString('pt-BR');

    const reportText = getAllLaudoContent();
    const nextIssuer = role === 'issuer' ? signatureDate : selectedExam.issuerSignedAt;
    const nextReviewer = role === 'reviewer' ? signatureDate : selectedExam.reviewerSignedAt;
    const nextStatus: ExamStatus = nextReviewer ? 'revisado' : 'laudado';

    setExamRows((prev) => prev.map((exam) => (
      exam.id === selectedExam.id
        ? {
            ...exam,
            reportText,
            status: nextStatus,
            issuerSignedAt: nextIssuer,
            reviewerSignedAt: nextReviewer,
          }
        : exam
    )));

    try {
      await reportWorklistService.update(selectedExam.id, {
        reportText,
        status: nextStatus,
        issuerSignedAt: nextIssuer,
        reviewerSignedAt: nextReviewer,
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao assinar',
        message: err?.response?.data?.message || err?.message || 'Falha ao registrar assinatura',
        color: 'red',
      });
      return;
    }

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

  const confirmSignature = async () => {
    if (!signRolePending || !selectedExam) return;
    if (!signPassword.trim()) {
      showNotification({ title: 'Senha obrigatoria', message: 'Informe sua senha para assinar.', color: 'yellow' });
      return;
    }

    setSignLoading(true);
    const ok = await verifyCurrentUserPassword(signPassword);
    setSignLoading(false);

    if (!ok) {
      showNotification({ title: 'Senha invalida', message: 'Nao foi possivel validar sua senha.', color: 'red' });
      return;
    }

    const role = signRolePending;
    setSignPasswordModalOpen(false);
    setSignPassword('');
    setSignRolePending(null);

    if (role === 'addendum-issuer') {
      const now = new Date().toLocaleString('pt-BR');
      try {
        const draftId = await ensureAddendumDraft();
        if (!draftId) throw new Error('Draft not found');
        await reportAddendumService.update(draftId, {
          content: addendumText,
          issuerSignedAt: now,
        });
        setAddendumIssuerSignedAt(now);
      } catch (err: any) {
        showNotification({
          title: 'Erro ao assinar adendo',
          message: err?.response?.data?.message || err?.message || 'Não foi possível assinar o adendo',
          color: 'red',
        });
        return;
      }
      showNotification({ title: 'Adendo assinado', message: 'Assinatura do emissor registrada no adendo.', color: 'green' });
      return;
    }

    if (role === 'addendum-reviewer') {
      if (!addendumIssuerSignedAt) {
        showNotification({ title: 'Assinatura bloqueada', message: 'O revisor do adendo so pode assinar apos o emissor.', color: 'yellow' });
        return;
      }
      const now = new Date().toLocaleString('pt-BR');
      try {
        const draftId = await ensureAddendumDraft();
        if (!draftId) throw new Error('Draft not found');
        await reportAddendumService.update(draftId, {
          content: addendumText,
          reviewerSignedAt: now,
        });
        setAddendumReviewerSignedAt(now);
      } catch (err: any) {
        showNotification({
          title: 'Erro ao assinar adendo',
          message: err?.response?.data?.message || err?.message || 'Não foi possível assinar o adendo',
          color: 'red',
        });
        return;
      }
      showNotification({ title: 'Adendo assinado', message: 'Assinatura do revisor registrada no adendo.', color: 'green' });
      return;
    }

    await signExam(role);
  };

  const saveLaudo = async () => {
    if (!selectedExam) return;
    if (selectedExam.status === 'finalizado') {
      showNotification({ title: 'Laudo finalizado', message: 'Nao e permitido editar um laudo finalizado.', color: 'yellow' });
      return;
    }
    if (!selectedExam.issuerSignedAt) {
      showNotification({ title: 'Salvamento bloqueado', message: 'E necessario assinar como emissor antes de salvar.', color: 'yellow' });
      return;
    }

    const reportText = getAllLaudoContent();
    const nextStatus: ExamStatus = selectedExam.reviewerSignedAt ? 'revisado' : 'laudado';

    setSavingLaudo(true);

    setExamRows((prev) => prev.map((exam) => (
      exam.id === selectedExam.id
        ? { ...exam, status: nextStatus, reportText }
        : exam
    )));

    try {
      await reportWorklistService.update(selectedExam.id, {
        status: nextStatus,
        reportText,
      });
      setLastSavedAt(new Date().toLocaleString('pt-BR'));
      showNotification({ title: 'Laudo salvo', message: `Laudo salvo com status ${statusLabel[nextStatus]}.`, color: 'green' });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao salvar',
        message: err?.response?.data?.message || err?.message || 'Falha ao salvar laudo',
        color: 'red',
      });
    } finally {
      setSavingLaudo(false);
    }
  };

  const unfinalizeExam = async (examId: string) => {
    const exam = examRows.find((item) => item.id === examId);
    if (!exam || exam.status !== 'finalizado') return;
    if (exam.hasFinalizedAddendum) {
      showNotification({
        title: 'Desfinalizacao bloqueada',
        message: 'Nao e permitido desfinalizar um laudo que ja possui adendo finalizado.',
        color: 'yellow',
      });
      return;
    }

    const nextStatus: ExamStatus = exam.reviewerSignedAt ? 'revisado' : (exam.issuerSignedAt ? 'laudado' : 'sem_laudo');

    try {
      const updated = await reportWorklistService.update(examId, { status: nextStatus });
      setExamRows((prev) => prev.map((item) => {
        if (item.id !== examId) return item;
        return {
          ...item,
          ...mapApiToExam({ ...item, ...updated, status: nextStatus }),
          status: nextStatus,
        };
      }));
      showNotification({ title: 'Laudo desfinalizado', message: 'O laudo voltou para edicao.', color: 'green' });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Nao foi possivel desfinalizar o laudo',
        color: 'red',
      });
    }
  };

  const saveAddendum = async () => {
    if (!selectedExam) return;
    if (isRichTextEmpty(addendumText)) {
      showNotification({ title: 'Adendo vazio', message: 'Informe o texto do adendo.', color: 'yellow' });
      return;
    }
    if (!addendumIssuerSignedAt) {
      showNotification({ title: 'Salvamento bloqueado', message: 'Assine como emissor antes de salvar o adendo.', color: 'yellow' });
      return;
    }

    const now = new Date().toLocaleString('pt-BR');
    setAddendumSaving(true);

    try {
      const draftId = await ensureAddendumDraft();
      if (!draftId) throw new Error('Draft not found');

      await reportAddendumService.update(draftId, {
        content: addendumText,
        issuerSignedAt: addendumIssuerSignedAt,
        reviewerSignedAt: addendumReviewerSignedAt,
        savedAt: now,
      });

      setAddendumSavedAt(now);
      showNotification({ title: 'Adendo salvo', message: 'Rascunho de adendo salvo com sucesso.', color: 'green' });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao salvar adendo',
        message: err?.response?.data?.message || err?.message || 'Não foi possível salvar o rascunho de adendo',
        color: 'red',
      });
    } finally {
      setAddendumSaving(false);
    }
  };

  const finalizeAddendum = async () => {
    if (!selectedExam) return;
    if (isRichTextEmpty(addendumText)) {
      showNotification({ title: 'Adendo vazio', message: 'Informe o texto do adendo.', color: 'yellow' });
      return;
    }
    if (!addendumIssuerSignedAt) {
      showNotification({ title: 'Finalizacao bloqueada', message: 'Assine como emissor para finalizar o adendo.', color: 'yellow' });
      return;
    }
    if (requiresReviewer && !addendumReviewerSignedAt) {
      showNotification({ title: 'Finalizacao bloqueada', message: 'Este adendo exige assinatura do revisor para finalizar.', color: 'yellow' });
      return;
    }

    const now = new Date().toLocaleString('pt-BR');
    setAddendumFinalizing(true);
    const addendumBlock = `
      <hr />
      <h3>Adendo (${now})</h3>
      ${addendumText}
      <p><strong>Assinaturas do adendo:</strong> Emissor: ${addendumIssuerSignedAt} ${requiresReviewer ? `| Revisor: ${addendumReviewerSignedAt || 'Pendente'}` : ''}</p>
    `;
    const nextText = `${selectedExam.reportText || ''}${addendumBlock}`;

    try {
      const draftId = await ensureAddendumDraft();
      if (!draftId) throw new Error('Draft not found');

      await reportAddendumService.update(draftId, {
        content: addendumText,
        issuerSignedAt: addendumIssuerSignedAt,
        reviewerSignedAt: addendumReviewerSignedAt,
        savedAt: addendumSavedAt,
        status: 'finalizado',
        finalizedAt: now,
      });

      await reportWorklistService.update(selectedExam.id, {
        reportText: nextText,
        status: 'finalizado',
      });

      setExamRows((prev) => prev.map((item) => (
        item.id === selectedExam.id ? { ...item, reportText: nextText, status: 'finalizado', hasFinalizedAddendum: true } : item
      )));
      setEditorContent(nextText);
      setAddendumId(null);
      setAddendumText('');
      setAddendumIssuerSignedAt(null);
      setAddendumReviewerSignedAt(null);
      setAddendumSavedAt(null);
      setAddendumModalOpen(false);
      showNotification({ title: 'Adendo salvo', message: 'Adendo adicionado ao laudo finalizado.', color: 'green' });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: err?.response?.data?.message || err?.message || 'Não foi possível salvar o adendo',
        color: 'red',
      });
    } finally {
      setAddendumFinalizing(false);
    }
  };

  const updateExam = async (nextStatus: ExamStatus) => {
    if (!selectedExam) {
      showNotification({
        title: 'Selecione um exame',
        message: 'Escolha um exame na lista para editar o laudo.',
        color: 'yellow',
      });
      return;
    }

    if (selectedExam.status === 'finalizado') {
      showNotification({
        title: 'Laudo finalizado',
        message: 'Nao e permitido editar um laudo finalizado.',
        color: 'yellow',
      });
      return;
    }

    if (!selectedExam.issuerSignedAt) {
      showNotification({
        title: 'Finalizacao bloqueada',
        message: 'E necessario assinar como emissor antes de finalizar.',
        color: 'yellow',
      });
      return;
    }

    if (requiresReviewer && !selectedExam.reviewerSignedAt) {
      showNotification({
        title: 'Finalizacao bloqueada',
        message: 'Este laudo exige assinatura do revisor para finalizar.',
        color: 'yellow',
      });
      return;
    }

    const reportText = getAllLaudoContent();

    setExamRows((prev) =>
      prev.map((exam) =>
        exam.id === selectedExam.id
          ? {
              ...exam,
              status: nextStatus,
              reportText,
            }
          : exam,
      ),
    );

    try {
      await reportWorklistService.update(selectedExam.id, {
        status: nextStatus,
        reportText,
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro ao atualizar laudo',
        message: err?.response?.data?.message || err?.message || 'Falha ao atualizar status do laudo',
        color: 'red',
      });
      return;
    }

    const now = new Date();
    setLastSavedAt(now.toLocaleString('pt-BR'));
    showNotification({
      title: nextStatus === 'finalizado' ? 'Laudo finalizado' : 'Laudo salvo',
      message:
        nextStatus === 'finalizado'
          ? `O exame ${selectedExam.id} foi marcado como finalizado.`
          : `Laudo salvo com sucesso.`,
      color: 'green',
    });

    if (nextStatus === 'finalizado') {
      closeModal();
    }
  };

  const confirmFinalizeWithPassword = async () => {
    if (!finalizeTarget) return;
    if (!finalizePassword.trim()) {
      showNotification({ title: 'Senha obrigatoria', message: 'Informe sua senha para finalizar.', color: 'yellow' });
      return;
    }

    setFinalizeLoading(true);
    const ok = await verifyCurrentUserPassword(finalizePassword);

    if (!ok) {
      setFinalizeLoading(false);
      showNotification({ title: 'Senha invalida', message: 'Nao foi possivel validar sua senha.', color: 'red' });
      return;
    }

    setFinalizePasswordModalOpen(false);
    setFinalizePassword('');

    if (finalizeTarget === 'laudo') {
      await updateExam('finalizado');
    } else {
      await finalizeAddendum();
    }

    setFinalizeTarget(null);
    setFinalizeLoading(false);
  };

  return (
    <Box bg={pageBg} style={{ minHeight: '100vh' }}>
      <Header />

      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group mb={isMobile ? 16 : 24} justify="space-between" align="center">
          <Group align="center">
            <ActionIcon variant="default" color={isDark ? 'gray' : 'black'} size="xl" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} style={{ color: titleColor }}>
                Laudo por Exame
              </Text>
              <Text size="sm" style={{ color: subtitleColor }}>
                Fila de exames para laudar
              </Text>
            </Box>
          </Group>
          <Button variant="light" color="darkBlue" leftSection={<Settings size={16} />} onClick={() => navigate('/laudo-configuracoes')}>
            Configurações de laudo
          </Button>
        </Group>

        <Group gap="md" align="end" mb="md">
          <TextInput
            placeholder={isMobile ? 'Buscar...' : 'Buscar por paciente ou exame...'}
            leftSection={<Search size={16} color={isDark ? '#7d92c6' : '#999'} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            radius="md"
            size={isMobile ? 'sm' : 'md'}
            style={{ flex: 1 }}
            styles={isDark ? {
              input: {
                backgroundColor: 'transparent',
                borderColor,
                color: 'var(--mantine-color-text)',
              },
            } : undefined}
          />
        </Group>

        <Paper withBorder p="sm" style={{ minHeight: 560, borderColor, backgroundColor: panelBg }}>
            <Title order={5} c={titleColor} mb="sm">
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
                  {filteredRows.map((exam) => {
                    const ohifKey = exam.dicomStudyUid || exam.id;

                    return (
                    <Table.Tr
                      key={exam.id}
                      style={{
                        backgroundColor: selectedExamId === exam.id ? selectedRowBg : undefined,
                      }}
                    >
                      <Table.Td>
                        <Stack gap={0}>
                          <Text fw={500} size="sm">
                            {exam.patientName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {exam.scheduledAt}
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
                        <Group gap={6}>
                          <Tooltip label="Abrir Exame (DICOM)">
                            <ActionIcon variant="subtle" color="cyan" onClick={() => navigate(`/dicom-viewer/${encodeURIComponent(exam.id)}`)}>
                              <Eye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Abrir OHIF Viewer">
                            <ActionIcon variant="subtle" color="blue" onClick={() => navigate(`/ohif/${encodeURIComponent(ohifKey)}`)}>
                              <Layers size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Abrir Laudo">
                            <ActionIcon variant="subtle" color="darkBlue" onClick={() => openExam(exam.id)}>
                              <FileText size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Desfinalizar">
                            <ActionIcon
                              variant="subtle"
                              color="orange"
                              disabled={exam.status !== 'finalizado' || Boolean(exam.hasFinalizedAddendum)}
                              onClick={() => unfinalizeExam(exam.id)}
                            >
                              <RotateCcw size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                    );
                  })}
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
            header: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
              borderBottom: isDark ? `1px solid ${borderColor}` : undefined,
            },
            content: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
            body: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
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
              <Paper withBorder p="md" radius="md" bg={subtleBg} style={{ display: headerExpanded ? 'block' : 'none', borderColor }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group wrap="nowrap" gap="lg">
                    {/* <Avatar size="xl" radius="md" color="darkBlue">
                      <User size={28} />
                    </Avatar> */}
                    <Box>
                      <Group gap="xs" align="center" mb={4}>
                        <Title order={3} c={isDark ? 'gray.0' : 'dark.9'} style={{ lineHeight: 1.2 }}>
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
                            Solicitante: <Text span fw={500} c={isDark ? 'gray.2' : 'dark.7'}>{selectedExam.requestingDoctor}</Text>
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
                    bg={subtleBg}
                    style={{
                      flex: isMobile ? '1 1 100%' : '0 0 320px',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: isMobile ? '35vh' : 'none',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      borderColor,
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
                      {dicomViewerVisible ? 'Ocultar imagem' : 'Visualizador DICOM'}
                    </Button>

                    <TextInput
                      placeholder="Buscar frases..."
                      value={phraseQuery}
                      onChange={(event) => setPhraseQuery(event.currentTarget.value)}
                      mb="md"
                      size="sm"
                      leftSection={<Search size={16} />}
                    />

                    <Text size="sm" fw={700} c={isDark ? 'gray.1' : 'dark.8'} mb={8}>Frases de laudo</Text>
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
                                borderColor: selectedPhraseId === phrase.id ? DARK_BLUE : borderColor,
                                backgroundColor: selectedPhraseId === phrase.id ? selectedRowBg : surfaceBg,
                                transition: 'all 0.2s ease',
                              }}
                              onClick={() => setSelectedPhraseId(phrase.id)}
                              onDoubleClick={() => insertPhrase(phrase.id)}
                            >
                              <Text fw={600} size="sm" c={isDark ? 'gray.0' : 'dark.9'}>{phrase.label}</Text>
                              <Text size="xs" c="dimmed" lineClamp={2} mt={4}>{phrase.text}</Text>
                            </Paper>
                          ))
                        )}
                      </Stack>
                    </Box>

                    <Divider my="sm" color={isDark ? 'dark.3' : 'gray.3'} />

                    <Text size="sm" fw={700} c={isDark ? 'gray.1' : 'dark.8'} mb={8}>Campos dinâmicos</Text>
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
                    <DicomViewer
                      style={{ height: '100%' }}
                      initialData={initialDicomData || undefined}
                      initialSeries={initialDicomSeries || undefined}
                    />
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
                      <Tooltip label={isDictating ? 'Parar ditado' : 'Ditar laudo por voz'} position="bottom" withArrow>
                        <ActionIcon
                          variant={isDictating ? 'filled' : 'default'}
                          color={isDictating ? 'red' : undefined}
                          size="md"
                          radius="md"
                          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)', animation: isDictating ? 'pulse 1.2s infinite' : undefined }}
                          onClick={toggleDictation}
                          disabled={selectedExam?.status === 'finalizado'}
                        >
                          {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
                        </ActionIcon>
                      </Tooltip>
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

                  <Box style={{ flex: 1, minHeight: 0 }}>
                    <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    disabled={selectedExam.status === 'finalizado'}
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
                      skin: isDark ? 'oxide-dark' : 'oxide',
                      content_css: isDark ? 'dark' : 'default',
                      toolbar:
                        'undo redo | blocks | bold italic underline | bullist numlist | alignleft aligncenter alignright | table | removeformat',
                      content_style: 'body { font-family: Inter, sans-serif; font-size:14px; }',
                    }}
                  />
                  </Box>
                </Box>
              </Group>

              <Group justify="space-between" align="center" wrap="wrap" style={{ borderTop: `1px solid ${borderColor}`, paddingTop: 16, paddingBottom: 4 }}>
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
                  <Button variant="light" color="darkBlue" onClick={saveLaudo} loading={savingLaudo} leftSection={<Save size={16} />} disabled={selectedExam.status === 'finalizado' || !selectedExam.issuerSignedAt || savingLaudo || !isLaudoDirty}>
                    {savingLaudo ? 'Salvando...' : (!isLaudoDirty && selectedExam.issuerSignedAt ? 'Laudo salvo' : 'Salvar laudo')}
                  </Button>
                  <Button
                    variant="light"
                    color="green"
                    onClick={() => requestSignature('issuer')}
                    leftSection={<PenTool size={16} />}
                    disabled={selectedExam.status === 'finalizado' || Boolean(selectedExam.issuerSignedAt)}
                  >
                    {selectedExam.issuerSignedAt ? 'Emissor assinado' : 'Assinar emissor'}
                  </Button>
                  <Button
                    variant="light"
                    color="blue"
                    onClick={() => requestSignature('reviewer')}
                    leftSection={<PenTool size={16} />}
                    disabled={selectedExam.status === 'finalizado' || !selectedExam.issuerSignedAt || Boolean(selectedExam.reviewerSignedAt)}
                  >
                    {selectedExam.reviewerSignedAt ? 'Revisor assinado' : 'Assinar revisor'}
                  </Button>
                  <Button variant="light" color="orange" onClick={openAddendumModal} leftSection={<Plus size={16} />} disabled={selectedExam.status !== 'finalizado' || Boolean(selectedExam.hasFinalizedAddendum)}>
                    {selectedExam.hasFinalizedAddendum ? 'Adendo finalizado' : 'Adendo'}
                  </Button>
                  <Button
                    bg={DARK_BLUE}
                    c="white"
                    onClick={() => requestFinalize('laudo')}
                    leftSection={<CheckCircle size={16} />}
                    disabled={selectedExam.status === 'finalizado' || !selectedExam.issuerSignedAt || (requiresReviewer && !selectedExam.reviewerSignedAt)}
                  >
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
          styles={{
            header: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
              borderBottom: isDark ? `1px solid ${borderColor}` : undefined,
            },
            content: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
            body: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
          }}
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
                        bg={subtleBg}
                        radius="sm"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleTemplateGroup(group)}
                      >
                        <Group gap="xs" align="center">
                          {expandedTemplateGroups[group] === false ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                          <Text size="sm" fw={700} c={isDark ? 'gray.1' : 'dark.8'}>{group}</Text>
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
                                borderColor: selectedTemplateId === template.id ? DARK_BLUE : borderColor,
                                backgroundColor: selectedTemplateId === template.id ? selectedRowBg : surfaceBg,
                                transition: 'all 0.15s ease',
                              }}
                              onClick={() => setSelectedTemplateId(template.id)}
                            >
                              <Text fw={600} size="sm" c={isDark ? 'gray.0' : 'dark.9'}>{template.name}</Text>
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
              bg={panelBg}
              style={{
                flex: 1,
                minHeight: isMobile ? '42vh' : 420,
                maxHeight: isMobile ? '42vh' : '60vh',
                overflowY: 'auto',
                borderColor,
              }}
            >
              {selectedTemplate ? (
                <>
                  <Group gap="sm" mb="md">
                    <Badge variant="light" color="darkBlue">{selectedTemplate.group}</Badge>
                    <Badge variant="outline" color="gray">{selectedTemplate.examType}</Badge>
                  </Group>
                  <Title order={5} mb="sm" c={isDark ? 'gray.0' : 'dark.9'}>{selectedTemplate.name}</Title>
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
          styles={{
            header: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
              borderBottom: isDark ? `1px solid ${borderColor}` : undefined,
            },
            content: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
            body: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
          }}
        >
          {selectedExam && (
            <>
              <Paper withBorder p="sm" mb="md" bg={subtleBg} radius="md" style={{ borderColor }}>
                <Group gap="sm">
                  <ThemeIcon variant="light" color="darkBlue" size="lg">
                    <History size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} size="sm" c={isDark ? 'gray.0' : 'dark.9'}>{selectedExam.patientName}</Text>
                    <Text size="xs" c="dimmed">CPF: {selectedExam.cpf} • {previousReports.length} laudo(s) anterior(es)</Text>
                  </Box>
                </Group>
              </Paper>

              <Group align="stretch" gap="md" wrap={isMobile ? 'wrap' : 'nowrap'}>
                <Paper
                  withBorder
                  p="sm"
                  bg={panelBg}
                  style={{
                    flex: isMobile ? '1 1 100%' : '0 0 340px',
                    maxHeight: isMobile ? '36vh' : '55vh',
                    overflowY: 'auto',
                    borderColor,
                  }}
                >
                  {previousReports.length === 0 ? (
                    <Stack align="center" justify="center" py="xl">
                      <History size={40} color={isDark ? '#7d92c6' : '#adb5bd'} />
                      <Text size="sm" c="dimmed" ta="center">Nenhum laudo anterior encontrado para este paciente.</Text>
                    </Stack>
                  ) : (
                    <Timeline active={-1} bulletSize={28} lineWidth={2}>
                      {previousReports.map((report) => (
                        <Timeline.Item
                          key={report.id}
                          bullet={<FileText size={14} />}
                          title={
                            <Text fw={600} size="sm" c={isDark ? 'gray.0' : 'dark.9'} style={{ cursor: 'pointer' }} onClick={() => setSelectedPreviousReport(report)}>
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
                              borderColor: selectedPreviousReport?.id === report.id ? DARK_BLUE : borderColor,
                              backgroundColor: selectedPreviousReport?.id === report.id ? selectedRowBg : surfaceBg,
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
                  bg={panelBg}
                  style={{
                    flex: 1,
                    minHeight: isMobile ? '42vh' : 400,
                    maxHeight: isMobile ? '42vh' : '55vh',
                    overflowY: 'auto',
                    borderColor,
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
          styles={{
            header: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
              borderBottom: isDark ? `1px solid ${borderColor}` : undefined,
            },
            content: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
            body: {
              backgroundColor: isDark ? 'var(--mantine-color-body)' : undefined,
            },
          }}
        >
          <Stack>
            <Box style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
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

        <Modal
          opened={signPasswordModalOpen}
          onClose={() => {
            if (signLoading) return;
            setSignPasswordModalOpen(false);
            setSignPassword('');
            setSignRolePending(null);
          }}
          title={
            signRolePending === 'issuer'
              ? 'Confirmar assinatura do emissor'
              : signRolePending === 'reviewer'
                ? 'Confirmar assinatura do revisor'
                : signRolePending === 'addendum-issuer'
                  ? 'Confirmar assinatura do emissor do adendo'
                  : 'Confirmar assinatura do revisor do adendo'
          }
          centered
          zIndex={450}
        >
          <Stack>
            <Text size="sm" c="dimmed">
              Digite sua senha para confirmar a assinatura.
            </Text>
            <TextInput
              label="Senha"
              type="password"
              value={signPassword}
              onChange={(e) => setSignPassword(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmSignature();
                }
              }}
              autoFocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => {
                setSignPasswordModalOpen(false);
                setSignPassword('');
                setSignRolePending(null);
              }} disabled={signLoading}>
                Cancelar
              </Button>
              <Button bg={DARK_BLUE} c="white" onClick={confirmSignature} loading={signLoading} leftSection={<ShieldCheck size={16} />}>
                Confirmar assinatura
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={addendumModalOpen}
          onClose={() => {
            setAddendumModalOpen(false);
            setAddendumText('');
            setAddendumIssuerSignedAt(null);
            setAddendumReviewerSignedAt(null);
            setAddendumSavedAt(null);
          }}
          title="Adicionar adendo"
          centered
          size="lg"
          zIndex={300}
        >
          <Stack>
            {addendumLoading && (
              <Text size="sm" c="dimmed">Carregando adendo...</Text>
            )}
            <Text size="sm" c="dimmed">
              Registre o adendo com assinatura. Para finalizar, sera solicitada a senha do usuario.
            </Text>
            <Group gap="xs">
              <Badge variant="dot" color={addendumIssuerSignedAt ? 'green' : 'gray'}>
                Emissor: {addendumIssuerSignedAt ? 'Assinado' : 'Pendente'}
              </Badge>
              <Badge variant="dot" color={addendumReviewerSignedAt ? 'green' : 'gray'}>
                Revisor: {addendumReviewerSignedAt ? 'Assinado' : 'Pendente'}
              </Badge>
            </Group>
            <Group gap="sm">
              <Button
                variant="light"
                color="green"
                leftSection={<PenTool size={16} />}
                onClick={() => requestSignature('addendum-issuer')}
                disabled={Boolean(addendumIssuerSignedAt) || addendumLoading || addendumSaving || addendumFinalizing}
              >
                {addendumIssuerSignedAt ? 'Emissor assinado' : 'Assinar emissor'}
              </Button>
              <Button
                variant="light"
                color="blue"
                leftSection={<PenTool size={16} />}
                onClick={() => requestSignature('addendum-reviewer')}
                disabled={!addendumIssuerSignedAt || Boolean(addendumReviewerSignedAt) || addendumLoading || addendumSaving || addendumFinalizing}
              >
                {addendumReviewerSignedAt ? 'Revisor assinado' : 'Assinar revisor'}
              </Button>
            </Group>
            <Box>
              <Text size="sm" fw={500} mb={6}>Texto do adendo</Text>
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                value={addendumText}
                onEditorChange={(value) => setAddendumText(value)}
                disabled={addendumLoading || addendumSaving || addendumFinalizing}
                init={{
                  height: 260,
                  menubar: false,
                  plugins: ['lists', 'link', 'table', 'wordcount'],
                  toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | alignleft aligncenter alignright | table | removeformat',
                  content_style: 'body { font-family: Arial, sans-serif; font-size:14px; }',
                }}
              />
            </Box>
            <Text size="xs" c="dimmed">
              {addendumSavedAt ? `Ultimo salvamento do adendo: ${addendumSavedAt}` : 'Adendo ainda nao salvo nesta sessao.'}
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => {
                setAddendumModalOpen(false);
                setAddendumId(null);
                setAddendumText('');
                setAddendumIssuerSignedAt(null);
                setAddendumReviewerSignedAt(null);
                setAddendumSavedAt(null);
              }} disabled={addendumSaving || addendumFinalizing}>
                Cancelar
              </Button>
              <Button variant="light" color="darkBlue" onClick={saveAddendum} loading={addendumSaving} disabled={!addendumIssuerSignedAt || addendumLoading || addendumFinalizing}>
                Salvar adendo
              </Button>
              <Button bg={DARK_BLUE} c="white" onClick={() => requestFinalize('adendo')} loading={addendumFinalizing} disabled={!addendumIssuerSignedAt || (requiresReviewer && !addendumReviewerSignedAt) || addendumLoading || addendumSaving}>
                Finalizar adendo
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={finalizePasswordModalOpen}
          onClose={() => {
            if (finalizeLoading) return;
            setFinalizePasswordModalOpen(false);
            setFinalizePassword('');
            setFinalizeTarget(null);
          }}
          title={finalizeTarget === 'adendo' ? 'Confirmar finalizacao do adendo' : 'Confirmar finalizacao do laudo'}
          centered
          zIndex={460}
        >
          <Stack>
            <Text size="sm" c="dimmed">
              Digite sua senha para confirmar a finalizacao.
            </Text>
            <TextInput
              label="Senha"
              type="password"
              value={finalizePassword}
              onChange={(e) => setFinalizePassword(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmFinalizeWithPassword();
                }
              }}
              autoFocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => {
                setFinalizePasswordModalOpen(false);
                setFinalizePassword('');
                setFinalizeTarget(null);
              }} disabled={finalizeLoading}>
                Cancelar
              </Button>
              <Button bg={DARK_BLUE} c="white" onClick={confirmFinalizeWithPassword} loading={finalizeLoading} leftSection={<ShieldCheck size={16} />}>
                Confirmar finalizacao
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Box>
    </Box>
  );
}
