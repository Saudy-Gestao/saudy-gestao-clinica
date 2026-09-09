import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const iconMock = (props: any) => <span aria-hidden="true" {...props} />;
const makeIconModule = (names: string[]) =>
  names.reduce<Record<string, any>>((module, name) => {
    module[name] = iconMock;
    return module;
  }, { __esModule: true });

vi.mock('@tabler/icons-react', () =>
  makeIconModule([
    'IconAlertCircle',
    'IconBell',
    'IconBrandWhatsapp',
    'IconCheck',
    'IconChevronDown',
    'IconCircleCheck',
    'IconClock',
    'IconDeviceFloppy',
    'IconEdit',
    'IconExternalLink',
    'IconInfoCircle',
    'IconHistory',
    'IconKey',
    'IconMessage',
    'IconPlus',
    'IconRefresh',
    'IconSparkles',
    'IconTrash',
    'IconX',
  ]),
);

vi.mock('lucide-react', () => {
  const icons = makeIconModule([
    'Activity',
    'AlarmClock',
    'AlertCircle',
    'AlertTriangle',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUpDown',
    'BarChart3',
    'Bell',
    'BellRing',
    'BookOpen',
    'Boxes',
    'Brain',
    'BriefcaseBusiness',
    'BriefcaseMedical',
    'Bug',
    'Building2',
    'Calendar',
    'CalendarCheck',
    'CalendarClock',
    'CalendarDays',
    'CalendarIcon',
    'CalendarPlus',
    'CalendarX2',
    'Camera',
    'Check',
    'CheckCheck',
    'CheckCircle',
    'CheckCircle2',
    'ChevronDown',
    'ChevronLeft',
    'ChevronRight',
    'ChevronUp',
    'ChevronsLeft',
    'ChevronsRight',
    'CircleAlert',
    'CircleCheck',
    'CircleDollarSign',
    'CircleHelp',
    'CircleX',
    'Clipboard',
    'ClipboardCheck',
    'ClipboardList',
    'ClipboardPenLine',
    'Clock',
    'Clock3',
    'Copy',
    'CreditCard',
    'DollarSign',
    'Download',
    'Edit',
    'Eraser',
    'Eye',
    'EyeOff',
    'FileArchive',
    'FileCheck2',
    'FileClock',
    'FileCode2',
    'FilePlus',
    'FileSearch',
    'FileSpreadsheet',
    'FileText',
    'Filter',
    'FlaskConical',
    'FlipHorizontal',
    'FlipVertical',
    'FolderOpen',
    'GitBranch',
    'Glasses',
    'Globe',
    'GraduationCap',
    'Grid2x2',
    'GripVertical',
    'Hand',
    'Heart',
    'HeartPulse',
    'History',
    'Image',
    'Images',
    'Info',
    'Keyboard',
    'LampDesk',
    'Layers',
    'Layers3',
    'LayoutDashboard',
    'LayoutGrid',
    'LayoutTemplate',
    'LifeBuoy',
    'Lightbulb',
    'LineChart',
    'Link',
    'Link2',
    'LinkIcon',
    'List',
    'ListTodo',
    'LoaderCircle',
    'Lock',
    'LockKeyhole',
    'LogIn',
    'LogOut',
    'Mail',
    'MailCheck',
    'Map',
    'MapPin',
    'Maximize2',
    'Menu',
    'MessageCircle',
    'MessageCircleMore',
    'MessageSquare',
    'MessageSquarePlus',
    'MessageSquareText',
    'Mic',
    'MicOff',
    'Minimize2',
    'Minus',
    'Moon',
    'MoreVertical',
    'Move',
    'NotebookPen',
    'Package',
    'PackageCheck',
    'PackageOpen',
    'PanelLeftClose',
    'PanelLeftOpen',
    'Paperclip',
    'Pause',
    'PenTool',
    'Pencil',
    'Phone',
    'PhoneCall',
    'PhoneOff',
    'Play',
    'Plus',
    'PlusCircle',
    'Power',
    'PowerOff',
    'Printer',
    'QrCode',
    'Radio',
    'RefreshCcw',
    'RefreshCw',
    'RotateCcw',
    'RotateCw',
    'Route',
    'Ruler',
    'Save',
    'ScanLine',
    'Search',
    'Send',
    'Settings',
    'Settings2',
    'Shield',
    'ShieldCheck',
    'ShieldOff',
    'SignalHigh',
    'Sparkles',
    'SpellCheck',
    'SquarePen',
    'Star',
    'Stethoscope',
    'Sun',
    'Sunrise',
    'Tag',
    'TextQuote',
    'Ticket',
    'Trash',
    'Trash2',
    'TrendingDown',
    'TrendingUp',
    'Upload',
    'User',
    'UserCheck',
    'UserPlus',
    'UserRoundCheck',
    'UserRoundPlus',
    'Users',
    'Video',
    'VideoOff',
    'Wallet',
    'WandSparkles',
    'Warehouse',
    'Waypoints',
    'Wifi',
    'WifiOff',
    'Wrench',
    'X',
    'XCircle',
    'ZoomIn'
  ]);

  return new Proxy(icons, {
    get: (target, prop: string | symbol) => {
      if (prop in target || prop === 'then') {
        return target[prop as keyof typeof target];
      }

      return iconMock;
    },
  });
});

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    isAxiosError: () => false,
  },
}));

vi.mock('recharts', () =>
  new Proxy({}, {
    get: (_target, prop) => (prop === 'then' ? undefined : ({ children }: any) => <div>{children}</div>),
  }),
);

vi.mock('@tinymce/tinymce-react', () => ({
  Editor: ({ onEditorChange }: any) => <textarea aria-label="editor" onChange={(event) => onEditorChange?.(event.target.value)} />,
}));

vi.mock('cornerstone-core', () => ({
  default: {
    enable: vi.fn(),
    disable: vi.fn(),
    displayImage: vi.fn(),
    getViewport: vi.fn(() => ({ invert: false, voi: {} })),
    setViewport: vi.fn(),
    fitToWindow: vi.fn(),
    resize: vi.fn(),
    reset: vi.fn(),
    loadAndCacheImage: vi.fn().mockResolvedValue({ imageId: 'image-1' }),
    loadImage: vi.fn().mockResolvedValue({ imageId: 'image-1' }),
    getEnabledElement: vi.fn(() => ({ image: { imageId: 'image-1' } })),
    updateImage: vi.fn(),
  },
}));

vi.mock('cornerstone-tools', () => ({
  default: {
    external: {},
    init: vi.fn(),
    addTool: vi.fn(),
    setToolActive: vi.fn(),
    setToolDisabled: vi.fn(),
    WwwcTool: vi.fn(),
    ZoomTool: vi.fn(),
    PanTool: vi.fn(),
    LengthTool: vi.fn(),
    AngleTool: vi.fn(),
    RectangleRoiTool: vi.fn(),
    EllipticalRoiTool: vi.fn(),
    ProbeTool: vi.fn(),
    ArrowAnnotateTool: vi.fn(),
    MagnifyTool: vi.fn(),
  },
}));

vi.mock('cornerstone-wado-image-loader', () => ({
  default: {
    external: {},
    configure: vi.fn(),
    wadouri: {
      fileManager: {
        add: vi.fn(() => 'wadouri:file-1'),
      },
    },
  },
}));

vi.mock('cornerstone-math', () => ({}));
vi.mock('hammerjs', () => ({ default: vi.fn() }));
vi.mock('dicom-parser', () => ({ default: {} }));

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
});

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: async () => new Blob(['ok']),
  arrayBuffer: async () => new ArrayBuffer(8),
  json: async () => ({}),
}) as any;

const renderPage = (element: React.ReactElement, route = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="*" element={<div data-testid="page-smoke-root">{element}</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const cases: Array<[string, () => Promise<React.ReactElement>, string?]> = [
  ['Adm', async () => React.createElement((await import('../Auth/Adm')).Adm)],
  ['AdmRegister', async () => React.createElement((await import('../Auth/AdmRegister')).AdmRegister)],
  ['Cadastro', async () => React.createElement((await import('../Auth/Cadastro')).Cadastro)],
  ['EsqueciSenha', async () => React.createElement((await import('../Auth/EsqueciSenha')).EsqueciSenha)],
  ['CadastroAnamnese', async () => React.createElement((await import('../Anamnese/CadastroAnamnese')).CadastroAnamnese)],
  ['Conversations', async () => React.createElement((await import('../Communication/Conversations')).Conversations)],
  ['Consulta', async () => React.createElement((await import('../Consulta/Consulta')).Consulta)],
  ['CadastroConvenio', async () => React.createElement((await import('../Convenios/CadastroConvenio')).CadastroConvenio)],
  ['AutorizacaoConvenio', async () => React.createElement((await import('../Convenios/AutorizacaoConvenio')).AutorizacaoConvenio)],
  ['PatientInfoModal', async () => React.createElement((await import('../Dashboard/PatientInfoModal')).PatientInfoModal, { opened: true, onClose: vi.fn(), patientData: { id: 'p1', nome: 'Maria' } })],
  ['DicomViewerPage', async () => React.createElement((await import('../DicomViewer/DicomViewerPage')).DicomViewerPage)],
  ['CadastroEnfermagem', async () => React.createElement((await import('../Enfermagem/CadastroEnfermagem')).CadastroEnfermagem)],
  ['Entrega', async () => React.createElement((await import('../Entrega/Entrega')).Entrega)],
  ['CadastroEquipamento', async () => React.createElement((await import('../Equipamentos/CadastroEquipamento')).CadastroEquipamento)],
  ['CadastroModalidades', async () => React.createElement((await import('../Modalidades/CadastroModalidades')).CadastroModalidades)],
  ['CadastroEspecialidades', async () => React.createElement((await import('../Especialidades/CadastroEspecialidades')).CadastroEspecialidades)],
  ['Estoque', async () => React.createElement((await import('../Estoque/Estoque')).Estoque)],
  ['ExecucaoExames', async () => React.createElement((await import('../Exames/ExecucaoExames')).ExecucaoExames)],
  ['Laudo', async () => React.createElement((await import('../Laudo/Laudo')).Laudo)],
  ['LaudoConfiguracoes', async () => React.createElement((await import('../Laudo/LaudoConfiguracoes')).LaudoConfiguracoes)],
  ['LaudoExames', async () => React.createElement((await import('../LaudoExames/LaudoExames')).LaudoExames)],
  ['CadastroMedico', async () => React.createElement((await import('../Medicos/CadastroMedico')).CadastroMedico)],
  ['CadastroPaciente', async () => React.createElement((await import('../Patient/CadastroPaciente')).CadastroPaciente)],
  ['PatientPortalLogin', async () => React.createElement((await import('../PatientPortal/PatientPortalLogin')).PatientPortalLogin)],
  ['PatientPortalDashboard', async () => React.createElement((await import('../PatientPortal/PatientPortalDashboard')).PatientPortalDashboard)],
  ['FacialRecognition', async () => React.createElement((await import('../PatientQueue/FacialRecognition')).FacialRecognition)],
  ['PatientQueue', async () => React.createElement((await import('../PatientQueue/PatientQueue')).PatientQueue)],
  ['PatientQueuePage', async () => React.createElement((await import('../PatientQueue/PatientQueuePage')).PatientQueuePage)],
  ['Agendamento', async () => React.createElement((await import('../PreAgendamento/Agendamento')).Agendamento)],
  ['PublicPreAgendamentoDocs', async () => React.createElement((await import('../PreAgendamento/PublicPreAgendamentoDocs')).PublicPreAgendamentoDocs), '/pre-atendimento/documentos/token'],
  ['CadastroProcedimento', async () => React.createElement((await import('../Procedimentos/CadastroProcedimento')).CadastroProcedimento)],
  ['PublicCheckIn', async () => React.createElement((await import('../PublicCheckIn/PublicCheckIn')).PublicCheckIn)],
  ['CadastroSala', async () => React.createElement((await import('../Salas/CadastroSala')).CadastroSala)],
  ['CadastroAgendas', async () => React.createElement((await import('../Agendas/CadastroAgendas')).CadastroAgendas)],
  ['WhatsAppConfig', async () => React.createElement((await import('../Settings/WhatsAppConfig')).WhatsAppConfig)],
  ['WhatsAppCredentials', async () => React.createElement((await import('../Settings/WhatsAppCredentials')).WhatsAppCredentials, { config: null, onSaved: vi.fn() })],
  ['WhatsAppPage', async () => React.createElement((await import('../Settings/WhatsAppPage')).WhatsAppPage)],
  ['CadastroTEA', async () => React.createElement((await import('../TEA/CadastroTEA')).CadastroTEA)],
  ['TeaAgendaSemanal', async () => React.createElement((await import('../TEA/TeaAgendaSemanal')).TeaAgendaSemanal)],
  ['TeaDesmarcacaoLote', async () => React.createElement((await import('../TEA/TeaDesmarcacaoLote')).TeaDesmarcacaoLote)],
  ['TeaEvolucao', async () => React.createElement((await import('../TEA/TeaEvolucao')).TeaEvolucao)],
  ['TeaEvolucaoTemplates', async () => React.createElement((await import('../TEA/TeaEvolucaoTemplates')).TeaEvolucaoTemplates)],
  ['TeaHome', async () => React.createElement((await import('../TEA/TeaHome')).TeaHome)],
  ['TeaPIT', async () => React.createElement((await import('../TEA/TeaPIT')).TeaPIT)],
  ['TeaPreReserva', async () => React.createElement((await import('../TEA/TeaPreReserva')).TeaPreReserva)],
  ['TeaRelatorios', async () => React.createElement((await import('../TEA/TeaRelatorios')).TeaRelatorios)],
  ['TeleconsultaPatientWaiting', async () => React.createElement((await import('../Teleconsulta/TeleconsultaPatientWaiting')).TeleconsultaPatientWaiting)],
  ['MyTicketDetailsPage', async () => React.createElement((await import('../Tickets/MyTicketDetailsPage')).MyTicketDetailsPage), '/meus-chamados/t1'],
  ['MyTicketsPage', async () => React.createElement((await import('../Tickets/MyTicketsPage')).MyTicketsPage)],
  ['WorkflowSections', async () => React.createElement((await import('../WorkflowSections/WorkflowSections')).WorkflowSections)],
];

describe('page smoke coverage', () => {
  it.each(cases)('renders %s without crashing', async (_name, load, route) => {
    renderPage(await load(), route);

    expect(screen.getByTestId('page-smoke-root')).toBeInTheDocument();
  });
});
