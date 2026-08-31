import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@mantine/core', () => {
  const cleanProps = ({ children, onClick, checked, value, onChange, placeholder, label, title, type, disabled, ...rest }: any) => ({
    children,
    onClick,
    checked,
    value,
    onChange,
    placeholder,
    label,
    title,
    type,
    disabled,
    'data-testid': rest['data-testid'],
  });
  const Wrap = (props: any) => <div {...cleanProps(props)}>{props.children}</div>;
  const Text = (props: any) => <span {...cleanProps(props)}>{props.children}</span>;
  const Title = (props: any) => <h2 {...cleanProps(props)}>{props.children}</h2>;
  const Button = (props: any) => <button {...cleanProps(props)}>{props.children || props.label}</button>;
  const Input = (props: any) => <input aria-label={props.label} {...cleanProps(props)} />;
  const Textarea = (props: any) => <textarea aria-label={props.label} {...cleanProps(props)} />;
  const Select = (props: any) => (
    <select aria-label={props.label} value={Array.isArray(props.value) ? '' : props.value ?? ''} onChange={(event) => props.onChange?.(event.target.value)}>
      <option value="">{props.placeholder || props.label || 'Selecione'}</option>
      {(props.data || []).map((item: any) => (
        <option key={typeof item === 'string' ? item : item.value} value={typeof item === 'string' ? item : item.value}>
          {typeof item === 'string' ? item : item.label}
        </option>
      ))}
    </select>
  );
  const Checkbox = (props: any) => <input aria-label={props.label} type="checkbox" checked={Boolean(props.checked)} onChange={props.onChange} />;
  const Modal = ({ opened, children, title }: any) => (opened ? <div role="dialog">{title && <h2>{title}</h2>}{children}</div> : null);
  const Table: any = ({ children }: any) => <table>{children}</table>;
  Table.Thead = ({ children }: any) => <thead>{children}</thead>;
  Table.Tbody = ({ children }: any) => <tbody>{children}</tbody>;
  Table.Tr = ({ children }: any) => <tr>{children}</tr>;
  Table.Th = ({ children }: any) => <th>{children}</th>;
  Table.Td = ({ children }: any) => <td>{children}</td>;
  Table.ScrollContainer = ({ children }: any) => <div>{children}</div>;

  const Tabs: any = ({ children }: any) => <div>{children}</div>;
  Tabs.List = Wrap;
  Tabs.Tab = Button;
  Tabs.Panel = Wrap;

  const Menu: any = ({ children }: any) => <div>{children}</div>;
  Menu.Target = Wrap;
  Menu.Dropdown = Wrap;
  Menu.Item = Button;
  Menu.Label = Text;
  Menu.Divider = () => <hr />;

  const Popover: any = ({ children }: any) => <div>{children}</div>;
  Popover.Target = Wrap;
  Popover.Dropdown = Wrap;
  const Grid: any = Wrap;
  Grid.Col = Wrap;

  const components = {
    Accordion: Wrap,
    ActionIcon: Button,
    Alert: Wrap,
    Anchor: Text,
    Avatar: Wrap,
    Badge: Text,
    Box: Wrap,
    Breadcrumbs: Wrap,
    Button,
    Card: Wrap,
    Center: Wrap,
    Checkbox,
    Collapse: Wrap,
    Code: Text,
    ColorInput: Input,
    Container: Wrap,
    Divider: () => <hr />,
    Drawer: Modal,
    FileInput: Input,
    Flex: Wrap,
    Grid,
    Group: Wrap,
    Image: (props: any) => <img alt={props.alt || ''} src={props.src || ''} />,
    Indicator: Wrap,
    Kbd: Text,
    Loader: () => <div>loading</div>,
    LoadingOverlay: () => null,
    MantineProvider: Wrap,
    Menu,
    Modal,
    MultiSelect: Select,
    NativeSelect: Select,
    NumberInput: Input,
    Pagination: Wrap,
    Paper: Wrap,
    PasswordInput: Input,
    PinInput: Input,
    Popover,
    Progress: Wrap,
    Radio: Checkbox,
    RingProgress: Wrap,
    ScrollArea: Wrap,
    SegmentedControl: Select,
    Select,
    SimpleGrid: Wrap,
    Skeleton: () => <div>loading</div>,
    Slider: Input,
    Stack: Wrap,
    Stepper: Wrap,
    Switch: Checkbox,
    Table,
    Tabs,
    Text,
    Textarea,
    TextInput: Input,
    ThemeIcon: Wrap,
    Timeline: Wrap,
    Title,
    Tooltip: ({ children }: any) => <>{children}</>,
    Transition: ({ children, mounted = true }: any) => (mounted ? <>{typeof children === 'function' ? children({}) : children}</> : null),
    TagsInput: Select,
    List: Wrap,
    UnstyledButton: Button,
    createTheme: (config: any) => config,
    rem: (value: number) => `${value}px`,
    useMantineColorScheme: () => ({ colorScheme: 'light', setColorScheme: vi.fn() }),
    useComputedColorScheme: () => 'light',
    useMantineTheme: () => ({ colors: {}, primaryColor: 'blue' }),
  };

  return components;
});

vi.mock('@mantine/dates', () => ({
  Calendar: (props: any) => <div data-testid="calendar" onClick={() => props.onChange?.(new Date())} />,
  DatePicker: (props: any) => <div data-testid="date-picker" onClick={() => props.onChange?.(new Date())} />,
  DateInput: (props: any) => <input aria-label={props.label} value={props.value || ''} onChange={props.onChange} />,
  DatePickerInput: (props: any) => <input aria-label={props.label} value={props.value || ''} onChange={props.onChange} />,
  DatesProvider: ({ children }: any) => <>{children}</>,
  TimeInput: (props: any) => <input aria-label={props.label} value={props.value || ''} onChange={props.onChange} />,
}));

vi.mock('@mantine/notifications', () => ({
  Notifications: () => null,
  showNotification: vi.fn(),
  notifications: {
    show: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@mantine/hooks', () => ({
  useDebouncedValue: (value: any) => [value],
  useDisclosure: (initial = false) => [initial, { open: vi.fn(), close: vi.fn(), toggle: vi.fn() }],
  useLocalStorage: ({ defaultValue }: any) => [defaultValue, vi.fn()],
  useMediaQuery: () => false,
  useElementSize: () => ({ ref: vi.fn(), width: 1024, height: 0, x: 0, y: 0 }),
}));

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
    'BarChart3',
    'BellRing',
    'BookOpen',
    'Brain',
    'BriefcaseMedical',
    'Building2',
    'Calendar',
    'CalendarCheck',
    'CalendarClock',
    'CalendarDays',
    'CalendarIcon',
    'CalendarX2',
    'Camera',
    'Check',
    'CheckCheck',
    'CheckCircle',
    'CheckCircle2',
    'CircleCheck',
    'ChevronDown',
    'ChevronLeft',
    'ChevronRight',
    'CircleAlert',
    'CircleHelp',
    'ClipboardCheck',
    'ClipboardList',
    'ClipboardPenLine',
    'Clock',
    'Clock3',
    'CreditCard',
    'Copy',
    'DollarSign',
    'Download',
    'Edit',
    'Eye',
    'EyeOff',
    'FileArchive',
    'FilePlus',
    'FileClock',
    'FileCode2',
    'FileSearch',
    'FileSpreadsheet',
    'FileText',
    'FlipHorizontal',
    'FlipVertical',
    'FolderOpen',
    'GitBranch',
    'Glasses',
    'Globe',
    'Grid2x2',
    'History',
    'Images',
    'LampDesk',
    'Layers3',
    'Layers',
    'Layers3',
    'LayoutDashboard',
    'LayoutGrid',
    'LayoutTemplate',
    'LifeBuoy',
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
    'Maximize2',
    'MessageCircleMore',
    'MessageCircle',
    'MessageSquarePlus',
    'MessageSquareText',
    'Mic',
    'MicOff',
    'Minimize2',
    'Moon',
    'MoreVertical',
    'Move',
    'NotebookPen',
    'PanelLeftClose',
    'PanelLeftOpen',
    'Paperclip',
    'Package',
    'PackageOpen',
    'Pause',
    'PenTool',
    'Pencil',
    'Phone',
    'PhoneCall',
    'PhoneOff',
    'Play',
    'Plus',
    'Power',
    'PowerOff',
    'QrCode',
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
    'SpellCheck',
    'SquarePen',
    'Stethoscope',
    'Sun',
    'Tag',
    'TextQuote',
    'Trash',
    'Trash2',
    'Upload',
    'User',
    'UserPlus',
    'UserRoundCheck',
    'UserRoundPlus',
    'Users',
    'Wallet',
    'WandSparkles',
    'Warehouse',
    'Waypoints',
    'Wifi',
    'WifiOff',
    'Wrench',
    'X',
    'ZoomIn',
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
