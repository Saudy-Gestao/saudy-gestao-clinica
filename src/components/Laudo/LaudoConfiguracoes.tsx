import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Skeleton,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  Menu,
  NumberInput,
  Select,
  useMantineColorScheme,
  Textarea,
  ColorInput,
  FileInput,
  Image,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, MoreVertical, FileText, TextQuote, ListTodo, Settings2 } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingSelect } from '../common/FloatingSelect';
import reportTemplateService from '../../services/reportTemplateService';
import reportPhraseService from '../../services/reportPhraseService';
import reportWorklistService from '../../services/reportWorklistService';
import reportConfigService from '../../services/reportConfigService';
import { useReportSettingsQuery } from '../../hooks/useReportSettingsQuery';
import { queryKeys } from '../../lib/queryKeys';
import { PaginatedGrid } from '../common/PaginatedGrid';
import { normalizeReportLayout } from '../../lib/reportLayout';
import type { ReportLayoutConfig } from '../../services/reportConfigService';

type WorklistStatus = 'sem_laudo' | 'laudado' | 'revisado' | 'finalizado';
type WorklistPriority = 'normal' | 'urgente';

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const decodeHtmlEntities = (value: string) => {
  if (typeof document === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};
const buildShortcutLabelFromEvent = (event: React.KeyboardEvent<HTMLInputElement>) => {
  const isAltGraph = event.getModifierState?.('AltGraph') ?? false;
  const parts: string[] = [];
  // AltGr on pt-BR keyboards is usually reported as Ctrl+Alt. Treat as Alt for UX.
  if (event.ctrlKey && !isAltGraph) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');

  const rawKey = String(event.key || '');
  const lowered = rawKey.toLowerCase();
  if (['control', 'alt', 'shift', 'meta'].includes(lowered)) {
    return parts.join('+');
  }

  let keyLabel = rawKey;
  if (rawKey.length === 1) keyLabel = rawKey.toUpperCase();
  return [...parts, keyLabel].join('+');
};
const normalizeShortcutForValidation = (value: string) => value.toLowerCase().replace(/\s+/g, '');
const FORBIDDEN_SHORTCUTS = new Set([
  'alt+f4',
  'alt+tab',
  'ctrl+w',
  'ctrl+f4',
  'ctrl+shift+w',
]);
const DEFAULT_REPORT_GROUPS = ['Tomografia', 'Ressonancia', 'Ultrassonografia', 'Raio-X', 'Mamografia', 'Densitometria'];

interface TemplateItem {
  id: string;
  name: string;
  examType: string;
  group?: string;
  content: string;
}

interface PhraseItem {
  id: string;
  examType: string;
  label: string;
  shortcut?: string;
  text: string;
}

interface WorklistItem {
  id: string;
  patientName: string;
  patientCpf?: string;
  examType: string;
  scheduledAt?: string;
  requestingDoctor?: string;
  assignedTo?: string;
  convenio?: string;
  priority: WorklistPriority;
  status: WorklistStatus;
}

export function LaudoConfiguracoes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const isTablet = useMediaQuery('(max-width: 1279px)');
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'hub' | 'templates' | 'phrases' | 'worklist' | 'settings'>('hub');
  const [requiresReviewer, setRequiresReviewer] = useState(true);
  const [reportLayout, setReportLayout] = useState<ReportLayoutConfig>(() => normalizeReportLayout(null));
  const [savingConfig, setSavingConfig] = useState(false);
  const tinyMceContentStyle = isDark
    ? `:root, html { color-scheme: dark; }
       body { font-family: Inter, sans-serif; font-size:14px; }
       html, body { scrollbar-width: thin; scrollbar-color: #5f6b84 #1f2b3d; }
       html::-webkit-scrollbar, body::-webkit-scrollbar { width: 12px; height: 12px; background: #1f2b3d; }
       html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: #1f2b3d; }
       html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: #5f6b84; border-radius: 10px; border: 2px solid #1f2b3d; }
       html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background: #7a879f; }
       html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner { background: #1f2b3d; }`
    : `:root, html { color-scheme: light; }
       body { font-family: Inter, sans-serif; font-size:14px; }
       html, body { scrollbar-width: thin; scrollbar-color: #c1c7d0 #f1f3f5; }
       html::-webkit-scrollbar, body::-webkit-scrollbar { width: 12px; height: 12px; background: #f1f3f5; }
       html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: #f1f3f5; }
       html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: #c1c7d0; border-radius: 10px; border: 2px solid #f1f3f5; }
       html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background: #aeb5bf; }
       html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner { background: #f1f3f5; }`;

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);

  const [examTypeOptions, setExamTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [convenioOptions, setConvenioOptions] = useState<{ value: string; label: string }[]>([]);

  const [templateQuery, setTemplateQuery] = useState('');
  const [phraseQuery, setPhraseQuery] = useState('');
  const [worklistQuery, setWorklistQuery] = useState('');
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(10);
  const [phrasePage, setPhrasePage] = useState(1);
  const [phrasePageSize, setPhrasePageSize] = useState(10);
  const [worklistPage, setWorklistPage] = useState(1);
  const [worklistPageSize, setWorklistPageSize] = useState(10);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [phraseModalOpen, setPhraseModalOpen] = useState(false);
  const [worklistModalOpen, setWorklistModalOpen] = useState(false);

  const [templateEditingId, setTemplateEditingId] = useState<string | null>(null);
  const [phraseEditingId, setPhraseEditingId] = useState<string | null>(null);
  const [worklistEditingId, setWorklistEditingId] = useState<string | null>(null);

  const [templateForm, setTemplateForm] = useState({ name: '', examType: '', group: '', content: '' });
  const [phraseForm, setPhraseForm] = useState({ examType: '', label: '', shortcut: '', text: '' });
  const [worklistForm, setWorklistForm] = useState({
    patientName: '',
    patientCpf: '',
    examType: '',
    scheduledAt: '',
    requestingDoctor: '',
    assignedTo: '',
    convenio: '',
    priority: 'normal' as WorklistPriority,
    status: 'sem_laudo' as WorklistStatus,
  });
  const {
    data: settingsData,
    error: settingsError,
    isLoading: settingsLoading,
  } = useReportSettingsQuery();

  const normalizeStatus = (status: any): WorklistStatus => {
    if (status === 'finalizado') return 'finalizado';
    if (status === 'revisado') return 'revisado';
    if (status === 'laudado') return 'laudado';
    if (status === 'rascunho') return 'laudado';
    return 'sem_laudo';
  };

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((item) => item.name.toLowerCase().includes(q) || item.examType.toLowerCase().includes(q));
  }, [templates, templateQuery]);

  const templateGroupOptions = useMemo(() => {
    const groups = new Set(DEFAULT_REPORT_GROUPS);
    templates.forEach((item) => {
      const group = String(item.group || '').trim();
      if (group) groups.add(group);
    });
    return Array.from(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));
  }, [templates]);

  const filteredPhrases = useMemo(() => {
    const q = phraseQuery.trim().toLowerCase();
    if (!q) return phrases;
    return phrases.filter((item) => item.label.toLowerCase().includes(q) || item.examType.toLowerCase().includes(q) || String(item.shortcut || '').toLowerCase().includes(q) || stripHtml(item.text).toLowerCase().includes(q));
  }, [phrases, phraseQuery]);

  const filteredWorklist = useMemo(() => {
    const q = worklistQuery.trim().toLowerCase();
    if (!q) return worklist;
    return worklist.filter((item) => item.patientName.toLowerCase().includes(q) || item.examType.toLowerCase().includes(q) || item.id.toLowerCase().includes(q));
  }, [worklist, worklistQuery]);

  const paginatedTemplates = useMemo(() => {
    const start = (templatePage - 1) * templatePageSize;
    return filteredTemplates.slice(start, start + templatePageSize);
  }, [filteredTemplates, templatePage, templatePageSize]);

  const paginatedPhrases = useMemo(() => {
    const start = (phrasePage - 1) * phrasePageSize;
    return filteredPhrases.slice(start, start + phrasePageSize);
  }, [filteredPhrases, phrasePage, phrasePageSize]);

  const paginatedWorklist = useMemo(() => {
    const start = (worklistPage - 1) * worklistPageSize;
    return filteredWorklist.slice(start, start + worklistPageSize);
  }, [filteredWorklist, worklistPage, worklistPageSize]);

  const templateTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTemplates.length / templatePageSize)),
    [filteredTemplates.length, templatePageSize],
  );

  const phraseTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredPhrases.length / phrasePageSize)),
    [filteredPhrases.length, phrasePageSize],
  );

  const worklistTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredWorklist.length / worklistPageSize)),
    [filteredWorklist.length, worklistPageSize],
  );

  const renderTableSkeleton = (columns: number) =>
    Array.from({ length: 5 }).map((_, index) => (
      <Table.Tr key={`report-settings-skeleton-${columns}-${index}`}>
        {Array.from({ length: columns }).map((__, cellIndex) => (
          <Table.Td key={`report-settings-skeleton-cell-${cellIndex}`}>
            <Skeleton height={16} radius="sm" width={cellIndex === columns - 1 ? 72 : cellIndex === 0 ? '70%' : '60%'} />
          </Table.Td>
        ))}
      </Table.Tr>
    ));

  useEffect(() => {
    if (!settingsData) return;

    const {
      templatesData,
      phrasesData,
      worklistData,
      proceduresData,
      insurancesData,
      configData,
    } = settingsData;

    const templatesList = Array.isArray(templatesData)
      ? templatesData
      : (Array.isArray((templatesData as any)?.items) ? (templatesData as any).items : []);
    const phrasesList = Array.isArray(phrasesData)
      ? phrasesData
      : (Array.isArray((phrasesData as any)?.items) ? (phrasesData as any).items : []);
    const worklistList = Array.isArray(worklistData)
      ? worklistData
      : (Array.isArray((worklistData as any)?.items) ? (worklistData as any).items : []);
    const proceduresList = Array.isArray(proceduresData)
      ? proceduresData
      : (Array.isArray((proceduresData as any)?.items) ? (proceduresData as any).items : []);
    const insurancesList = Array.isArray(insurancesData)
      ? insurancesData
      : (Array.isArray((insurancesData as any)?.items) ? (insurancesData as any).items : []);

    const mappedTemplates = templatesList.map((item: any) => ({
      id: String(item.id || ''),
      name: item.name || '',
      examType: item.examType || '',
      group: item.group || '',
      content: item.content || '',
    })).filter((item: TemplateItem) => item.id);

    const mappedPhrases = phrasesList.map((item: any) => ({
      id: String(item.id || ''),
      examType: item.examType || '',
      label: item.label || '',
      shortcut: item.shortcut || '',
      text: item.text || '',
    })).filter((item: PhraseItem) => item.id);

    const mappedWorklist = worklistList.map((item: any) => ({
      id: String(item.id || ''),
      patientName: item.patientName || '',
      patientCpf: item.patientCpf || '',
      examType: item.examType || '',
      scheduledAt: item.scheduledAt || '',
      requestingDoctor: item.requestingDoctor || '',
      assignedTo: item.assignedTo || '',
      convenio: item.convenio || '',
      priority: item.priority === 'urgente' ? 'urgente' : 'normal',
      status: normalizeStatus(item.status),
    })).filter((item: WorklistItem) => item.id);

    setTemplates(mappedTemplates);
    setPhrases(mappedPhrases);
    setWorklist(mappedWorklist);
    setRequiresReviewer(Boolean((configData as any)?.requiresReviewer ?? true));
    setReportLayout(normalizeReportLayout((configData as any)?.reportLayout));

    const examTypes = new Set<string>();
    proceduresList.forEach((item: any) => {
      const name = String(item?.name || '').trim();
      if (name) examTypes.add(name);
    });
    mappedTemplates.forEach((item: TemplateItem) => {
      if (item.examType) examTypes.add(item.examType);
    });
    mappedPhrases.forEach((item: PhraseItem) => {
      if (item.examType) examTypes.add(item.examType);
    });
    mappedWorklist.forEach((item: WorklistItem) => {
      if (item.examType) examTypes.add(item.examType);
    });

    const convenios = new Set<string>();
    insurancesList.forEach((item: any) => {
      const name = String(item?.name || '').trim();
      if (name) convenios.add(name);
    });
    mappedWorklist.forEach((item: WorklistItem) => {
      if (item.convenio) convenios.add(item.convenio);
    });

    setExamTypeOptions(Array.from(examTypes).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })));
    setConvenioOptions(Array.from(convenios).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })));
  }, [settingsData]);

  useEffect(() => {
    if (!settingsError) return;
    const err: any = settingsError;
    showNotification({
      title: 'Erro',
      message: resolveApiErrorMessage(err, 'Erro ao carregar configuracoes do laudo'),
      color: 'red',
    });
  }, [settingsError]);

  useEffect(() => {
    setTemplatePage(1);
  }, [templateQuery, templatePageSize, templates.length]);

  useEffect(() => {
    if (templatePage > templateTotalPages) {
      setTemplatePage(templateTotalPages);
    }
  }, [templatePage, templateTotalPages]);

  useEffect(() => {
    setPhrasePage(1);
  }, [phraseQuery, phrasePageSize, phrases.length]);

  useEffect(() => {
    if (phrasePage > phraseTotalPages) {
      setPhrasePage(phraseTotalPages);
    }
  }, [phrasePage, phraseTotalPages]);

  useEffect(() => {
    setWorklistPage(1);
  }, [worklistQuery, worklistPageSize, worklist.length]);

  useEffect(() => {
    if (worklistPage > worklistTotalPages) {
      setWorklistPage(worklistTotalPages);
    }
  }, [worklistPage, worklistTotalPages]);

  const handleRequiresReviewerChange = async (nextValue: boolean) => {
    setRequiresReviewer(nextValue);
    setSavingConfig(true);

    try {
      await reportConfigService.update({ requiresReviewer: nextValue });
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
      showNotification({
        title: 'Configuracao atualizada',
        message: nextValue ? 'Laudo agora exige revisor para finalizacao.' : 'Laudo pode ser finalizado sem revisor.',
        color: 'green',
      });
    } catch (err: any) {
      setRequiresReviewer((prev) => !prev);
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Falha ao atualizar configuracao de revisor'),
        color: 'red',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const saveReportLayout = async () => {
    setSavingConfig(true);
    try {
      const normalizedLayout = normalizeReportLayout(reportLayout);
      await reportConfigService.update({ reportLayout: normalizedLayout });
      setReportLayout(normalizedLayout);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportExamsPageData });
      showNotification({
        title: 'Layout atualizado',
        message: 'A previa do laudo agora usara este layout.',
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        title: 'Erro',
        message: resolveApiErrorMessage(err, 'Falha ao salvar layout do laudo'),
        color: 'red',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const updateReportLayout = <K extends keyof ReportLayoutConfig>(key: K, value: ReportLayoutConfig[K]) => {
    setReportLayout((prev) => normalizeReportLayout({ ...prev, [key]: value }));
  };

  const handleLogoImageUpload = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification({
        title: 'Arquivo invalido',
        message: 'Selecione uma imagem para usar como logo.',
        color: 'red',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateReportLayout('logoImageDataUrl', String(reader.result || ''));
      updateReportLayout('showLogo', true);
    };
    reader.onerror = () => {
      showNotification({
        title: 'Erro',
        message: 'Nao foi possivel carregar a imagem do logo.',
        color: 'red',
      });
    };
    reader.readAsDataURL(file);
  };

  const openTemplateCreate = () => {
    setTemplateEditingId(null);
    setTemplateForm({ name: '', examType: '', group: '', content: '' });
    setTemplateModalOpen(true);
  };

  const openPhraseCreate = () => {
    setPhraseEditingId(null);
    setPhraseForm({ examType: '', label: '', shortcut: '', text: '' });
    setPhraseModalOpen(true);
  };

  const openWorklistCreate = () => {
    setWorklistEditingId(null);
    setWorklistForm({
      patientName: '',
      patientCpf: '',
      examType: '',
      scheduledAt: '',
      requestingDoctor: '',
      assignedTo: '',
      convenio: '',
      priority: 'normal',
      status: 'sem_laudo',
    });
    setWorklistModalOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.examType || !templateForm.content.trim()) {
      showNotification({ title: 'Campos obrigatorios', message: 'Nome, tipo de exame e conteudo sao obrigatorios.', color: 'red' });
      return;
    }

    try {
      if (templateEditingId) {
        await reportTemplateService.update(templateEditingId, {
          name: templateForm.name.trim(),
          examType: templateForm.examType,
          group: templateForm.group.trim() || undefined,
          content: templateForm.content,
        });
      } else {
        await reportTemplateService.create({
          name: templateForm.name.trim(),
          examType: templateForm.examType,
          group: templateForm.group.trim() || undefined,
          content: templateForm.content,
        });
      }

      setTemplateModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
      showNotification({ title: 'Sucesso', message: 'Padrao de laudo salvo com sucesso.', color: 'green' });
    } catch (err: any) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao salvar padrao.'), color: 'red' });
    }
  };

  const savePhrase = async () => {
    if (!phraseForm.label.trim() || !phraseForm.examType || !phraseForm.text.trim()) {
      showNotification({ title: 'Campos obrigatorios', message: 'Tipo de exame, rotulo e frase sao obrigatorios.', color: 'red' });
      return;
    }

    const normalizedShortcut = normalizeShortcutForValidation(phraseForm.shortcut || '');
    if (FORBIDDEN_SHORTCUTS.has(normalizedShortcut)) {
      showNotification({
        title: 'Atalho bloqueado',
        message: 'Esse atalho é reservado pelo sistema/navegador. Escolha outro.',
        color: 'yellow',
      });
      return;
    }

    try {
      if (phraseEditingId) {
        await reportPhraseService.update(phraseEditingId, {
          examType: phraseForm.examType,
          label: phraseForm.label.trim(),
          shortcut: phraseForm.shortcut.trim() || undefined,
          text: phraseForm.text,
        });
      } else {
        await reportPhraseService.create({
          examType: phraseForm.examType,
          label: phraseForm.label.trim(),
          shortcut: phraseForm.shortcut.trim() || undefined,
          text: phraseForm.text,
        });
      }

      setPhraseModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
      showNotification({ title: 'Sucesso', message: 'Frase de laudo salva com sucesso.', color: 'green' });
    } catch (err: any) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao salvar frase.'), color: 'red' });
    }
  };

  const saveWorklist = async () => {
    if (!worklistForm.patientName.trim() || !worklistForm.examType) {
      showNotification({ title: 'Campos obrigatorios', message: 'Paciente e tipo de exame sao obrigatorios.', color: 'red' });
      return;
    }

    try {
      const payload = {
        patientName: worklistForm.patientName.trim(),
        patientCpf: worklistForm.patientCpf.trim() || undefined,
        examType: worklistForm.examType,
        scheduledAt: worklistForm.scheduledAt.trim() || undefined,
        requestingDoctor: worklistForm.requestingDoctor.trim() || undefined,
        assignedTo: worklistForm.assignedTo.trim() || undefined,
        convenio: worklistForm.convenio || undefined,
        priority: worklistForm.priority,
        status: worklistForm.status,
      };

      if (worklistEditingId) {
        await reportWorklistService.update(worklistEditingId, payload);
      } else {
        await reportWorklistService.create(payload);
      }

      setWorklistModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
      showNotification({ title: 'Sucesso', message: 'Item da fila salvo com sucesso.', color: 'green' });
    } catch (err: any) {
      showNotification({ title: 'Erro', message: resolveApiErrorMessage(err, 'Erro ao salvar item da fila.'), color: 'red' });
    }
  };

  return (
    <Box style={{ minHeight: '100vh' }}>
      <Header />
      <Box p={isMobile ? 'sm' : isTablet ? 'md' : 'xl'} maw={isMobile ? '100%' : 1400} mx="auto">
        <Group justify="space-between" mb={isMobile ? 20 : 30} align="center" wrap="wrap">
          <Group align="center">
            <ActionIcon variant="default" size="xl" onClick={() => navigate('/laudo-exames')}>
              <ChevronLeft size={28} />
            </ActionIcon>
            <Box>
              <Text fw={600} size={isMobile ? 'md' : 'lg'} c="var(--mantine-color-text)">Configurações de Laudo</Text>
              <Text c="dimmed" size="sm">Cadastre padrões, frases e fila manual para preparação da integração DICOM</Text>
            </Box>
          </Group>
        </Group>

        {activeTab === 'hub' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {[
              {
                key: 'templates',
                icon: FileText,
                title: 'Padrões',
                desc: 'Cadastre e gerencie modelos de laudo por tipo de exame.',
                onClick: () => setActiveTab('templates'),
              },
              {
                key: 'phrases',
                icon: TextQuote,
                title: 'Frases',
                desc: 'Organize frases frequentes para acelerar o preenchimento de laudos.',
                onClick: () => setActiveTab('phrases'),
              },
              {
                key: 'worklist',
                icon: ListTodo,
                title: 'Fila Manual',
                desc: 'Gerencie itens da fila de laudo enquanto a integração completa não é usada.',
                onClick: () => setActiveTab('worklist'),
              },
              {
                key: 'settings',
                icon: Settings2,
                title: 'Configurações',
                desc: 'Defina regras globais para finalização e revisão de laudos.',
                onClick: () => setActiveTab('settings'),
              },
            ].map((card) => (
              <Paper
                key={card.key}
                p="lg"
                withBorder
                onClick={card.onClick}
                style={{ cursor: 'pointer', borderColor: 'var(--mantine-color-default-border)', minHeight: 96 }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Box
                      w={44}
                      h={44}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${isDark ? '#dbe7ff' : DARK_BLUE}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <card.icon size={22} color={isDark ? '#dbe7ff' : DARK_BLUE} />
                    </Box>
                    <Box style={{ minWidth: 0 }}>
                      <Text fw={600} size="md" lineClamp={1}>{card.title}</Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>{card.desc}</Text>
                    </Box>
                  </Group>
                  <ChevronRight size={18} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <>
            <Group justify="space-between" align="center" mb="lg" wrap="wrap">
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<ChevronLeft size={16} />}
                  onClick={() => setActiveTab('hub')}
                >
                  Voltar
                </Button>
                <Text fw={600}>
                  {activeTab === 'templates'
                    ? 'Padrões de Laudo'
                    : activeTab === 'phrases'
                      ? 'Frases de Laudo'
                      : activeTab === 'worklist'
                        ? 'Fila Manual'
                        : 'Configurações'}
                </Text>
              </Group>
            </Group>

            {activeTab === 'templates' && (
            <Paper withBorder p="md">
              <Group justify="space-between" mb="sm">
                <FloatingInput
                  label="Buscar padrões"
                  placeholder="Buscar padrão por nome ou exame"
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button leftSection={<Plus size={16} />} onClick={openTemplateCreate}>Novo padrão</Button>
              </Group>
              <PaginatedGrid
                totalItems={filteredTemplates.length}
                page={templatePage}
                pageSize={templatePageSize}
                onPageChange={setTemplatePage}
                onPageSizeChange={setTemplatePageSize}
                isMobile={isMobile}
                maxHeight={isMobile ? 500 : 620}
                showFooter
              >
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nome</Table.Th>
                      <Table.Th>Exame</Table.Th>
                      <Table.Th>Grupo</Table.Th>
                      <Table.Th style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {settingsLoading && templates.length === 0 ? renderTableSkeleton(4) : filteredTemplates.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Stack align="center" py="lg" gap={6}>
                            <Text fw={600} size="sm">Nenhum padrão encontrado</Text>
                            <Text size="sm" c="dimmed">Crie um novo padrão ou ajuste a busca para encontrar um modelo existente.</Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : paginatedTemplates.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>{item.name}</Table.Td>
                        <Table.Td>{item.examType}</Table.Td>
                        <Table.Td>{item.group || '-'}</Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={210} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações do padrão">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => {
                                  setTemplateEditingId(item.id);
                                  setTemplateForm({ name: item.name, examType: item.examType, group: item.group || '', content: item.content });
                                  setTemplateModalOpen(true);
                                }}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item leftSection={<Trash2 size={14} />} color="red" onClick={async () => {
                                  await reportTemplateService.remove(item.id);
                                  await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
                                }}>
                                  Excluir
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </PaginatedGrid>
            </Paper>
            )}

            {activeTab === 'phrases' && (
            <Paper withBorder p="md">
              <Group justify="space-between" mb="sm">
                <FloatingInput
                  label="Buscar frases"
                  placeholder="Buscar frase por rótulo, exame ou conteúdo"
                  value={phraseQuery}
                  onChange={(e) => setPhraseQuery(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button leftSection={<Plus size={16} />} onClick={openPhraseCreate}>Nova frase</Button>
              </Group>
              <PaginatedGrid
                totalItems={filteredPhrases.length}
                page={phrasePage}
                pageSize={phrasePageSize}
                onPageChange={setPhrasePage}
                onPageSizeChange={setPhrasePageSize}
                isMobile={isMobile}
                maxHeight={isMobile ? 500 : 620}
                showFooter
              >
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Rótulo</Table.Th>
                      <Table.Th>Exame</Table.Th>
                      <Table.Th>Atalho</Table.Th>
                      <Table.Th>Frase</Table.Th>
                      <Table.Th style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {settingsLoading && phrases.length === 0 ? renderTableSkeleton(5) : filteredPhrases.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Stack align="center" py="lg" gap={6}>
                            <Text fw={600} size="sm">Nenhuma frase encontrada</Text>
                            <Text size="sm" c="dimmed">Cadastre frases frequentes para acelerar o preenchimento dos laudos.</Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : paginatedPhrases.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>{decodeHtmlEntities(item.label)}</Table.Td>
                        <Table.Td>{item.examType}</Table.Td>
                        <Table.Td>{item.shortcut ? <Badge variant="light" color="indigo">{item.shortcut}</Badge> : '-'}</Table.Td>
                        <Table.Td><Text lineClamp={2}>{decodeHtmlEntities(stripHtml(item.text))}</Text></Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={210} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações da frase">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => {
                                  setPhraseEditingId(item.id);
                                  setPhraseForm({ examType: item.examType, label: item.label, shortcut: item.shortcut || '', text: item.text });
                                  setPhraseModalOpen(true);
                                }}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item leftSection={<Trash2 size={14} />} color="red" onClick={async () => {
                                  await reportPhraseService.remove(item.id);
                                  await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
                                }}>
                                  Excluir
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </PaginatedGrid>
            </Paper>
            )}

            {activeTab === 'worklist' && (
            <Paper withBorder p="md">
              <Group justify="space-between" mb="sm">
                <FloatingInput
                  label="Buscar fila de laudo"
                  placeholder="Buscar paciente, exame ou item da fila"
                  value={worklistQuery}
                  onChange={(e) => setWorklistQuery(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button leftSection={<Plus size={16} />} onClick={openWorklistCreate}>Novo item de fila</Button>
              </Group>
              <PaginatedGrid
                totalItems={filteredWorklist.length}
                page={worklistPage}
                pageSize={worklistPageSize}
                onPageChange={setWorklistPage}
                onPageSizeChange={setWorklistPageSize}
                isMobile={isMobile}
                maxHeight={isMobile ? 500 : 620}
                showFooter
              >
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Paciente</Table.Th>
                      <Table.Th>Exame</Table.Th>
                      <Table.Th>Convênio</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Prioridade</Table.Th>
                      <Table.Th style={{ textAlign: 'center', width: 96 }}>Ações</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {settingsLoading && worklist.length === 0 ? renderTableSkeleton(6) : filteredWorklist.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Stack align="center" py="lg" gap={6}>
                            <Text fw={600} size="sm">Nenhum item na fila manual</Text>
                            <Text size="sm" c="dimmed">Use esta aba para montar a fila manualmente enquanto a integração DICOM não estiver completa.</Text>
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ) : paginatedWorklist.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>{item.patientName}</Text>
                            <Text size="xs" c="dimmed">CPF: {item.patientCpf || 'Não informado'}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="sm">{item.examType}</Text>
                            <Text size="xs" c="dimmed">{item.scheduledAt || 'Data não informada'}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{item.convenio ? <Badge variant="outline" color="blue">{item.convenio}</Badge> : '-'}</Table.Td>
                        <Table.Td>
                          <Badge color={item.status === 'finalizado' ? 'green' : item.status === 'revisado' ? 'cyan' : item.status === 'laudado' ? 'blue' : 'gray'} variant="light">
                            {item.status === 'sem_laudo' ? 'Sem laudo' : item.status === 'laudado' ? 'Laudado' : item.status === 'revisado' ? 'Revisado' : 'Finalizado'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={item.priority === 'urgente' ? 'red' : 'gray'} variant="light">
                            {item.priority}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Group justify="center">
                            <Menu shadow="md" width={210} position="bottom" withArrow>
                              <Menu.Target>
                                <ActionIcon variant="light" size="sm" aria-label="Ações da fila">
                                  <MoreVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<Pencil size={14} />} onClick={() => {
                                  setWorklistEditingId(item.id);
                                  setWorklistForm({
                                    patientName: item.patientName,
                                    patientCpf: item.patientCpf || '',
                                    examType: item.examType,
                                    scheduledAt: item.scheduledAt || '',
                                    requestingDoctor: item.requestingDoctor || '',
                                    assignedTo: item.assignedTo || '',
                                    convenio: item.convenio || '',
                                    priority: item.priority,
                                    status: item.status,
                                  });
                                  setWorklistModalOpen(true);
                                }}>
                                  Editar
                                </Menu.Item>
                                <Menu.Item leftSection={<Trash2 size={14} />} color="red" onClick={async () => {
                                  await reportWorklistService.remove(item.id);
                                  await queryClient.invalidateQueries({ queryKey: queryKeys.reportSettings });
                                }}>
                                  Excluir
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </PaginatedGrid>
            </Paper>
            )}

            {activeTab === 'settings' && (
            <Paper withBorder p="md">
              <Stack gap="lg">
                <Title order={5}>Regras de Finalização</Title>
                <Switch
                  label="Exigir assinatura de revisor na finalização"
                  checked={requiresReviewer}
                  onChange={(event) => handleRequiresReviewerChange(event.currentTarget.checked)}
                  disabled={savingConfig}
                />
                <Text size="sm" c="dimmed">
                  Quando habilitado, o laudo só pode ser finalizado após assinatura do emissor e do revisor.
                </Text>

                <Box style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 18 }}>
                  <Group justify="space-between" align="center" mb="md" wrap="wrap">
                    <Box>
                      <Title order={5}>Layout da Prévia</Title>
                      <Text size="sm" c="dimmed">Estas opções controlam o documento exibido em Prévia no editor de laudo.</Text>
                    </Box>
                    <Button bg={DARK_BLUE} c="white" onClick={saveReportLayout} loading={savingConfig}>
                      Salvar layout
                    </Button>
                  </Group>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <FloatingInput label="Nome da clínica" value={reportLayout.clinicName} onChange={(event) => updateReportLayout('clinicName', event.currentTarget.value)} />
                    <FloatingInput label="Título do laudo" value={reportLayout.title} onChange={(event) => updateReportLayout('title', event.currentTarget.value)} />
                    <FloatingInput label="Subtítulo" value={reportLayout.subtitle} onChange={(event) => updateReportLayout('subtitle', event.currentTarget.value)} />
                    <FloatingInput label="URL do logo" value={reportLayout.logoUrl} onChange={(event) => updateReportLayout('logoUrl', event.currentTarget.value)} />
                    <FileInput label="Carregar logo" accept="image/*" clearable onChange={handleLogoImageUpload} />
                    <Group align="flex-end" gap="sm">
                      {reportLayout.logoImageDataUrl ? (
                        <Image src={reportLayout.logoImageDataUrl} alt="Logo carregado" fit="contain" h={54} w={120} radius="sm" />
                      ) : (
                        <Text size="sm" c="dimmed">Sem imagem carregada</Text>
                      )}
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => updateReportLayout('logoImageDataUrl', '')}
                        disabled={!reportLayout.logoImageDataUrl}
                      >
                        Remover imagem
                      </Button>
                    </Group>
                    <Select label="Papel" data={[{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'Carta' }]} value={reportLayout.paperSize} onChange={(value) => updateReportLayout('paperSize', (value as ReportLayoutConfig['paperSize']) || 'A4')} />
                    <Select label="Orientação" data={[{ value: 'portrait', label: 'Retrato' }, { value: 'landscape', label: 'Paisagem' }]} value={reportLayout.orientation} onChange={(value) => updateReportLayout('orientation', (value as ReportLayoutConfig['orientation']) || 'portrait')} />
                    <ColorInput label="Cor principal" value={reportLayout.primaryColor} onChange={(value) => updateReportLayout('primaryColor', value)} />
                    <NumberInput label="Tamanho da fonte" min={10} max={18} value={reportLayout.fontSizePx} onChange={(value) => updateReportLayout('fontSizePx', Number(value) || 13)} />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mt="md">
                    <NumberInput label="Margem topo (mm)" min={0} max={60} value={reportLayout.marginTopMm} onChange={(value) => updateReportLayout('marginTopMm', Number(value) || 0)} />
                    <NumberInput label="Margem direita (mm)" min={0} max={60} value={reportLayout.marginRightMm} onChange={(value) => updateReportLayout('marginRightMm', Number(value) || 0)} />
                    <NumberInput label="Margem base (mm)" min={0} max={60} value={reportLayout.marginBottomMm} onChange={(value) => updateReportLayout('marginBottomMm', Number(value) || 0)} />
                    <NumberInput label="Margem esquerda (mm)" min={0} max={60} value={reportLayout.marginLeftMm} onChange={(value) => updateReportLayout('marginLeftMm', Number(value) || 0)} />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
                    <Textarea label="Texto do cabeçalho" minRows={2} value={reportLayout.headerText} onChange={(event) => updateReportLayout('headerText', event.currentTarget.value)} />
                    <Textarea label="Rodapé" minRows={2} value={reportLayout.footerText} onChange={(event) => updateReportLayout('footerText', event.currentTarget.value)} />
                  </SimpleGrid>

                  <Group mt="md" gap="xl" wrap="wrap">
                    <Switch label="Exibir logo" checked={reportLayout.showLogo} onChange={(event) => updateReportLayout('showLogo', event.currentTarget.checked)} />
                    <Switch label="Exibir dados do paciente" checked={reportLayout.showPatientInfo} onChange={(event) => updateReportLayout('showPatientInfo', event.currentTarget.checked)} />
                    <Switch label="Exibir assinaturas" checked={reportLayout.showSignatures} onChange={(event) => updateReportLayout('showSignatures', event.currentTarget.checked)} />
                  </Group>
                </Box>
              </Stack>
            </Paper>
            )}
          </>
        )}
      </Box>

      <Modal opened={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title={templateEditingId ? 'Editar padrão' : 'Novo padrão'} centered size="xl">
        <Stack>
          <FloatingInput
            label="Nome"
            value={templateForm.name}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTemplateForm((prev) => ({ ...prev, name: value }));
            }}
            required
          />
          <FloatingSelect
            label="Tipo de exame"
            data={examTypeOptions}
            searchable
            value={templateForm.examType || null}
            onChange={(value) => setTemplateForm((prev) => ({ ...prev, examType: value || '' }))}
            required
          />
          <FloatingSelect
            label="Grupo"
            data={templateGroupOptions}
            searchable
            clearable
            value={templateForm.group || null}
            onChange={(value) => setTemplateForm((prev) => ({ ...prev, group: value || '' }))}
          />
          <Box>
            <Text size="sm" fw={500} mb={6}>Conteúdo do padrão</Text>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={templateForm.content}
              onEditorChange={(value) => setTemplateForm((prev) => ({ ...prev, content: value }))}
              init={{
                height: 300,
                menubar: false,
                plugins: ['lists', 'link', 'table', 'wordcount'],
                skin: isDark ? 'oxide-dark' : 'oxide',
                content_css: isDark ? 'dark' : 'default',
                toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | alignleft aligncenter alignright | table | removeformat',
                content_style: tinyMceContentStyle,
              }}
            />
          </Box>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTemplateModalOpen(false)}>Cancelar</Button>
            <Button bg={DARK_BLUE} c="white" onClick={saveTemplate}>Salvar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={phraseModalOpen} onClose={() => setPhraseModalOpen(false)} title={phraseEditingId ? 'Editar frase' : 'Nova frase'} centered size="lg">
        <Stack>
          <FloatingSelect
            label="Tipo de exame"
            data={examTypeOptions}
            searchable
            value={phraseForm.examType || null}
            onChange={(value) => setPhraseForm((prev) => ({ ...prev, examType: value || '' }))}
            required
          />
          <FloatingInput
            label="Rótulo"
            value={phraseForm.label}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setPhraseForm((prev) => ({ ...prev, label: value }));
            }}
            required
          />
          <FloatingInput
            label="Atalho (ex: Ctrl+1)"
            value={phraseForm.shortcut}
            placeholder="Pressione a combinação"
            onChange={(e) => {
              const value = e.currentTarget.value;
              setPhraseForm((prev) => ({ ...prev, shortcut: value }));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                setPhraseForm((prev) => ({ ...prev, shortcut: '' }));
                return;
              }

              const shortcut = buildShortcutLabelFromEvent(event);
              if (!shortcut) return;
              event.preventDefault();
              setPhraseForm((prev) => ({ ...prev, shortcut }));
            }}
          />
          <Box>
            <Text size="sm" fw={500} mb={6}>Frase</Text>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={phraseForm.text}
              onEditorChange={(value) => setPhraseForm((prev) => ({ ...prev, text: value }))}
              init={{
                height: 260,
                menubar: false,
                plugins: ['lists', 'link', 'table', 'wordcount'],
                skin: isDark ? 'oxide-dark' : 'oxide',
                content_css: isDark ? 'dark' : 'default',
                toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | alignleft aligncenter alignright | table | removeformat',
                content_style: tinyMceContentStyle,
              }}
            />
          </Box>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPhraseModalOpen(false)}>Cancelar</Button>
            <Button bg={DARK_BLUE} c="white" onClick={savePhrase}>Salvar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={worklistModalOpen} onClose={() => setWorklistModalOpen(false)} title={worklistEditingId ? 'Editar item da fila' : 'Novo item da fila'} centered size="lg">
        <Stack>
          <FloatingInput
            label="Paciente"
            value={worklistForm.patientName}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setWorklistForm((prev) => ({ ...prev, patientName: value }));
            }}
            required
          />
          <FloatingInput
            label="CPF"
            value={worklistForm.patientCpf}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setWorklistForm((prev) => ({ ...prev, patientCpf: value }));
            }}
          />
          <FloatingSelect
            label="Tipo de exame"
            data={examTypeOptions}
            searchable
            value={worklistForm.examType || null}
            onChange={(value) => setWorklistForm((prev) => ({ ...prev, examType: value || '' }))}
            required
          />
          <FloatingSelect
            label="Convênio"
            data={convenioOptions}
            searchable
            clearable
            value={worklistForm.convenio || null}
            onChange={(value) => setWorklistForm((prev) => ({ ...prev, convenio: value || '' }))}
          />
          <FloatingInput
            label="Data/Hora agendada"
            value={worklistForm.scheduledAt}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setWorklistForm((prev) => ({ ...prev, scheduledAt: value }));
            }}
            placeholder="dd/mm/aaaa hh:mm"
          />
          <FloatingInput
            label="Solicitante"
            value={worklistForm.requestingDoctor}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setWorklistForm((prev) => ({ ...prev, requestingDoctor: value }));
            }}
          />
          <FloatingInput
            label="Laudante"
            value={worklistForm.assignedTo}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setWorklistForm((prev) => ({ ...prev, assignedTo: value }));
            }}
          />
          <FloatingSelect
            label="Prioridade"
            data={[{ value: 'normal', label: 'Normal' }, { value: 'urgente', label: 'Urgente' }]}
            value={worklistForm.priority}
            onChange={(value) => setWorklistForm((prev) => ({ ...prev, priority: (value as WorklistPriority) || 'normal' }))}
          />
          <FloatingSelect
            label="Status"
            data={[
              { value: 'sem_laudo', label: 'Sem laudo' },
              { value: 'laudado', label: 'Laudado' },
              { value: 'revisado', label: 'Revisado' },
              { value: 'finalizado', label: 'Finalizado' },
            ]}
            value={worklistForm.status}
            onChange={(value) => setWorklistForm((prev) => ({ ...prev, status: (value as WorklistStatus) || 'sem_laudo' }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setWorklistModalOpen(false)}>Cancelar</Button>
            <Button bg={DARK_BLUE} c="white" onClick={saveWorklist}>Salvar</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
