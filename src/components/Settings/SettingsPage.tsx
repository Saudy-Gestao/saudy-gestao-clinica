import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Text, 
  Group, 
  Stack, 
  Title,
  Button, 
  Select, 
  Table, 
  ActionIcon, 
  Modal, 
  Loader, 
  Skeleton,
  MultiSelect,
  Grid,
  Badge,
  useMantineColorScheme,
  Switch,
  NumberInput,
  TextInput,
  SimpleGrid,
  Divider,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  Building2, 
  GitBranch, 
  Layers, 
  Users, 
  Shield, 
  Plus, 
  Edit, 
  Trash, 
  Save,
  UserPlus,
  ChevronLeft,
  Settings,
  MessageCircle,
  Copy,
  Power,
  PowerOff,
  RefreshCw,
  Star,
} from 'lucide-react';
import { Header } from '../Header/Header';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { DARK_BLUE } from '../../themes/theme';

// Services
import companyService from '../../services/companyService';
import branchService from '../../services/branchService';
import branchSettingsService, { type BranchSettings } from '../../services/branchSettingsService';
import sectorService from '../../services/sectorService';
import userService from '../../services/userService';
import accessService from '../../services/accessService';
import type { Module } from '../../services/moduleService';
import { FloatingInput } from '../common/FloatingInput';
import {
  filterAccessesForCompanyType,
  filterModulesForCompanyType,
  normalizeCompanyModuleType,
} from '../../utils/moduleTypeAccess';
import { isRoomSector } from '../../utils/sectorClassification';
import { WhatsAppCredentials } from './WhatsAppCredentials';
import { useSettingsCompaniesQuery } from '../../hooks/useSettingsCompaniesQuery';
import { useSettingsBranchesQuery } from '../../hooks/useSettingsBranchesQuery';
import { useBranchSettingsQuery } from '../../hooks/useBranchSettingsQuery';
import { useSettingsSectorsQuery } from '../../hooks/useSettingsSectorsQuery';
import { useSettingsUsersQuery } from '../../hooks/useSettingsUsersQuery';
import { useSettingsDoctorsQuery } from '../../hooks/useSettingsDoctorsQuery';
import { useSettingsModulesQuery } from '../../hooks/useSettingsModulesQuery';
import { useSettingsAccessesQuery } from '../../hooks/useSettingsAccessesQuery';
import { queryKeys } from '../../lib/queryKeys';

// Validations
import {
  validateCompanyForm,
  validateBranchForm,
  validateSectorForm,
  validateUserForm,
  validateAccessForm,
  validateCNPJ,
} from '../../utils/validations';
import { formatCNPJ } from '../../utils/formatters';

const PageContainer = ({ children }: { children: React.ReactNode }) => (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto" w="100%" style={{ flex: 1 }}>
        <Stack gap="lg">{children}</Stack>
      </Box>
    </Box>
  );

const SectionTitle = ({ title, desc }: { title: string; desc?: string }) => (
    <Box mb="md">
        <Title order={2} size="h3" fw={600} c="var(--mantine-color-text)">{title}</Title>
        {desc && <Text c="dimmed" size="sm">{desc}</Text>}
    </Box>
);

const COMPANY_PLACEHOLDER_VALUES = new Set([
  'empresa teste',
  'endereco padrao',
  'endereço padrão',
]);

const PLACEHOLDER_PHONE_DIGITS = new Set([
  '11999999999',
  '5511999999999',
]);

const COMPANY_PREFILL_STORAGE_KEY = 'settings:company-prefill';
const BRANCH_QUOTAS_STORAGE_KEY = 'settings:branch-create-quotas';
const ACCESS_TOTAL_VALUE = '__ACCESS_TOTAL__';
const ACCESS_TOTAL_LABEL = 'Acesso total';

const sanitizeCompanyField = (value: unknown) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (PLACEHOLDER_PHONE_DIGITS.has(digits)) return '';

  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return COMPANY_PLACEHOLDER_VALUES.has(normalized) ? '' : trimmed;
};

const getStoredCompanyPrefill = () => {
  const raw = localStorage.getItem(COMPANY_PREFILL_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return {
      cnpj: sanitizeCompanyField(parsed?.cnpj),
      legalName: sanitizeCompanyField(parsed?.legalName),
      tradeName: sanitizeCompanyField(parsed?.tradeName),
      address: sanitizeCompanyField(parsed?.address),
      phone: sanitizeCompanyField(parsed?.phone),
    };
  } catch {
    return null;
  }
};

const getStoredBranchQuotas = () => {
  const raw = localStorage.getItem(BRANCH_QUOTAS_STORAGE_KEY);
  if (!raw) return {} as Record<string, { allowedCreates: number; initialBranchCount: number }>;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, { allowedCreates: number; initialBranchCount: number }>)
      : {};
  } catch {
    return {} as Record<string, { allowedCreates: number; initialBranchCount: number }>;
  }
};

const formatAuditDateTime = (value?: string | null) => {
  if (!value) return 'Ainda não registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ainda não registrado';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const SettingsPanelSkeleton = () => (
  <Stack gap="md">
    <Skeleton height={26} width="35%" radius="sm" />
    <Skeleton height={16} width="60%" radius="sm" />
    <Skeleton height={42} radius="md" />
    <Skeleton height={42} radius="md" />
    <Skeleton height={42} radius="md" />
    <Skeleton height={42} radius="md" />
    <Group justify="flex-end">
      <Skeleton height={36} width={220} radius="md" />
    </Group>
  </Stack>
);

const SettingsTableSkeleton = () => (
  <Stack gap="sm">
    {Array.from({ length: 5 }).map((_, idx) => (
      <Skeleton key={`settings-table-skeleton-${idx}`} height={44} radius="md" />
    ))}
  </Stack>
);

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<string | null>('company');
  
  // Get user's company from logged user
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [loggedBranchId, setLoggedBranchId] = useState<string | null>(null);

  // --- States ---
  
  // Company
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({ cnpj: '', legalName: '', tradeName: '', address: '', phone: '' });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

  // Branches
  const [branches, setBranches] = useState<any[]>([]);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState<{
    tradeName: string;
    address: string;
    phone: string;
    type: 'Filial' | 'Matriz';
    cnpjs: Array<{ cnpj: string; label: string; isPrimary: boolean }>;
  }>({
    tradeName: '',
    address: '',
    phone: '',
    type: 'Filial',
    cnpjs: [],
  });
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchErrors, setBranchErrors] = useState<Record<string, string>>({});
  const [branchCnpjDraft, setBranchCnpjDraft] = useState({ cnpj: '', label: '' });
  const [branchCnpjError, setBranchCnpjError] = useState<string | null>(null);
  const [branchQuota, setBranchQuota] = useState<{ allowedCreates: number; initialBranchCount: number } | null>(null);

  const isBranchMatriz = (branch: any) => {
    if (!branch) return false;

    const raw = branch.isMatriz;
    if (
      raw === true ||
      raw === 1 ||
      raw === '1' ||
      raw === 'true' ||
      raw === 't' ||
      raw === 'TRUE' ||
      raw === 'T'
    ) {
      return true;
    }

    if (branch.type === 'Matriz' || branch.tipo === 'Matriz') return true;
    return false;
  };

  const normalizeBranch = (branch: any) => ({
    ...branch,
    isMatriz: isBranchMatriz(branch),
  });

  // Sectors
  const [sectors, setSectors] = useState<any[]>([]);
  const [allSectors, setAllSectors] = useState<any[]>([]);
  const [selectedBranchForSectors, setSelectedBranchForSectors] = useState<string | null>(null);
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any | null>(null);
  const [sectorForm, setSectorForm] = useState({ name: '', description: '', branchId: '' });
  const [savingSector, setSavingSector] = useState(false);
  const [sectorErrors, setSectorErrors] = useState<Record<string, string>>({});

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSectorForUsers, setSelectedSectorForUsers] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({ branchId: '', sectorId: '', doctorId: '', accessIds: [] as string[], name: '', birthDate: '', email: '', password: '', phone: '', address: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [accessesList, setAccessesList] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});

  // Accesses
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<any | null>(null);
  const [accessForm, setAccessForm] = useState({ description: '', moduleIds: [] as string[] });
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessErrors, setAccessErrors] = useState<Record<string, string>>({});

  // Delete confirmation modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('Confirmar exclusao');
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState('Deseja realmente excluir este item?');
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);
  const [deleteConfirmAction, setDeleteConfirmAction] = useState<null | (() => Promise<void>)>(null);
  
  // Modules
  const [modules, setModules] = useState<Module[]>([]);

  // Branch Settings
  const [selectedBranchForSettings, setSelectedBranchForSettings] = useState<string | null>(null);
  const [branchSettings, setBranchSettings] = useState<BranchSettings | null>(null);
  const [savingBranchSettings, setSavingBranchSettings] = useState(false);
  const [publicCheckInAuditModalOpen, setPublicCheckInAuditModalOpen] = useState(false);
  const {
    data: companiesData = [],
    isLoading: loadingCompanies,
    error: companiesError,
  } = useSettingsCompaniesQuery();
  const {
    data: branchesData = [],
    isLoading: loadingBranches,
    error: branchesError,
  } = useSettingsBranchesQuery();
  const {
    data: branchSettingsData,
    isLoading: loadingBranchSettings,
    error: branchSettingsError,
  } = useBranchSettingsQuery(selectedBranchForSettings);
  const {
    data: sectorsData = [],
    isLoading: loadingSectors,
    error: sectorsError,
  } = useSettingsSectorsQuery();
  const {
    data: usersData = [],
    isLoading: loadingUsers,
    error: usersError,
  } = useSettingsUsersQuery();
  const {
    data: doctorsData = [],
    error: doctorsError,
  } = useSettingsDoctorsQuery();
  const {
    data: modulesData = [],
    isLoading: loadingModules,
    error: modulesError,
  } = useSettingsModulesQuery();
  const {
    data: accessesData = [],
    error: accessesError,
  } = useSettingsAccessesQuery();
  const publicCheckInAuditTrail = branchSettings?.publicCheckInAuditTrail || [];
  const recentPublicCheckInAuditTrail = publicCheckInAuditTrail.slice(0, 5);

  const openDeleteConfirm = (title: string, message: string, action: () => Promise<void>) => {
    setDeleteConfirmTitle(title);
    setDeleteConfirmMessage(message);
    setDeleteConfirmAction(() => action);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteConfirmLoading) return;
    setDeleteConfirmOpen(false);
    setDeleteConfirmAction(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmAction) return;
    setDeleteConfirmLoading(true);
    try {
      await deleteConfirmAction();
      setDeleteConfirmOpen(false);
      setDeleteConfirmAction(null);
    } finally {
      setDeleteConfirmLoading(false);
    }
  };

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) || null;
  const selectedCompanyModuleType = normalizeCompanyModuleType(selectedCompany?.module_type);
  const availableModules = filterModulesForCompanyType(modules, selectedCompanyModuleType);

  const getAllModuleIds = () => (Array.isArray(availableModules) ? availableModules.map((m) => m.id).filter(Boolean) : []);

  const normalizeModuleSelection = (values: string[]) => {
    const allModuleIds = getAllModuleIds();
    const selectedIds = values.filter((v) => v !== ACCESS_TOTAL_VALUE);
    const selectedAll = allModuleIds.length > 0 && allModuleIds.every((id) => selectedIds.includes(id));

    if (values.includes(ACCESS_TOTAL_VALUE) || selectedAll) {
      return [ACCESS_TOTAL_VALUE];
    }

    return selectedIds;
  };

  const expandModuleSelectionForSave = (values: string[]) => {
    if (!values.includes(ACCESS_TOTAL_VALUE)) return values;
    return getAllModuleIds();
  };

  // --- Effects ---

  // Track if component is mounted to prevent setState on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const prefill = getStoredCompanyPrefill();
    if (prefill) {
      setCompanyForm(prefill);
    }

    // Get logged user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Extract company ID from user's sector hierarchy
        const companyId = user.sector?.branch?.company?.id || user.sector?.branch?.companyId;
        const branchId = user.branchId || user.branch?.id || user.sector?.branch?.id || null;
        setUserCompanyId(companyId);
        setLoggedBranchId(branchId);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    let nextCompanies = companiesData || [];
    if (userCompanyId) {
      nextCompanies = nextCompanies.filter((c: any) => c.id === userCompanyId);
    }
    setCompanies(nextCompanies);

    if (!selectedCompanyId && nextCompanies.length > 0) {
      setSelectedCompanyId(nextCompanies[0].id);
    }
  }, [companiesData, userCompanyId, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setBranchQuota(null);
      return;
    }

    const comp = companies.find((c) => c.id === selectedCompanyId);
    if (comp) {
      setCompanyForm({
        cnpj: sanitizeCompanyField(comp.cnpj),
        legalName: sanitizeCompanyField(comp.legalName),
        tradeName: sanitizeCompanyField(comp.tradeName),
        address: sanitizeCompanyField(comp.address),
        phone: sanitizeCompanyField(comp.phone),
      });
      localStorage.removeItem(COMPANY_PREFILL_STORAGE_KEY);
    }

    const quotas = getStoredBranchQuotas();
    setBranchQuota(quotas[selectedCompanyId] || null);
  }, [selectedCompanyId, companies]);

  const companyAdditionalBranchesAllowed = Number(selectedCompany?.additionalBranchesAllowed);
  const maxBranchesAllowed = Number.isFinite(companyAdditionalBranchesAllowed)
    ? 1 + Math.max(0, companyAdditionalBranchesAllowed)
    : branchQuota
      ? branchQuota.initialBranchCount + branchQuota.allowedCreates
      : null;
  const reachedBranchLimit = maxBranchesAllowed !== null && branches.length >= maxBranchesAllowed;

  // Reload companies when userCompanyId is set
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setBranches([]);
      return;
    }

    const filtered = (branchesData || [])
      .filter((b: any) => b.companyId === selectedCompanyId)
      .map((b: any) => normalizeBranch(b));
    setBranches(filtered);
  }, [branchesData, selectedCompanyId]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchForSectors) {
      const preferredBranch = loggedBranchId
        ? branches.find((branch: any) => branch.id === loggedBranchId)
        : null;
      setSelectedBranchForSectors(preferredBranch?.id || branches[0].id);
    } else if (branches.length === 0) {
      setSelectedBranchForSectors(null);
    }
  }, [branches, loggedBranchId]);

  useEffect(() => {
    if (!selectedBranchForSectors) {
      setSectors([]);
      setAllSectors([]);
      return;
    }

    const availableSectors = (sectorsData || []).filter((sector: any) => !isRoomSector(sector));
    setAllSectors(availableSectors);
    setSectors(availableSectors.filter((s: any) => s.branchId === selectedBranchForSectors));
  }, [selectedBranchForSectors, sectorsData]);

  useEffect(() => {
    if (sectors.length === 0) {
      setSelectedSectorForUsers(null);
      return;
    }

    if (selectedSectorForUsers && !sectors.some((sector: any) => sector.id === selectedSectorForUsers)) {
      setSelectedSectorForUsers(null);
    }
  }, [sectors, selectedSectorForUsers]);

  useEffect(() => {
    let filtered = usersData || [];
    if (userCompanyId) {
      filtered = filtered.filter((u: any) => u.sector?.branch?.company?.id === userCompanyId || u.sector?.branch?.companyId === userCompanyId);
    }
    if (selectedSectorForUsers) {
      filtered = filtered.filter((u: any) => u.sector?.id === selectedSectorForUsers);
    } else if (selectedBranchForSectors) {
      filtered = filtered.filter((u: any) => u.sector?.branchId === selectedBranchForSectors);
    }
    setUsers(filtered);
  }, [usersData, userCompanyId, selectedSectorForUsers, selectedBranchForSectors]);

  useEffect(() => {
    const normalizedDoctors = Array.isArray(doctorsData)
      ? doctorsData
      : (Array.isArray((doctorsData as any)?.items)
        ? (doctorsData as any).items
        : (Array.isArray((doctorsData as any)?.data?.items)
          ? (doctorsData as any).data.items
          : (Array.isArray((doctorsData as any)?.data)
            ? (doctorsData as any).data
            : [])));
    setDoctors(normalizedDoctors);
  }, [doctorsData]);

  useEffect(() => {
    setModules(modulesData || []);
  }, [modulesData]);

  useEffect(() => {
    setAccessesList(filterAccessesForCompanyType(accessesData || [], selectedCompanyModuleType));
  }, [accessesData, selectedCompanyModuleType]);

  // --- Handlers ---

  // Company
  const handleSaveCompany = async () => {
    if (!selectedCompanyId) return;
    
    // Validate form
    const validation = validateCompanyForm(companyForm);
    if (!validation.isValid) {
      setCompanyErrors(validation.errors);
      notifications.show({ 
        title: 'Erro de validação', 
        message: 'Corrija os campos destacados', 
        color: 'red' 
      });
      return;
    }
    
    setCompanyErrors({});
    setSavingCompany(true);
    try {
      await companyService.updateCompany(selectedCompanyId, companyForm);

      // Keep matriz branch aligned with key company contact fields.
      const matrizBranch = branches.find((branch) => isBranchMatriz(branch));
      if (matrizBranch) {
        const matrizPayload = {
          tradeName: companyForm.tradeName,
          address: companyForm.address,
          phone: companyForm.phone,
          type: 'Matriz' as const,
        };

        await branchService.updateBranch(matrizBranch.id, matrizPayload);
      }

      // Keep users' phone aligned with the company phone.
      const allUsers = await userService.listUsers();
      const companyUsers = (allUsers || []).filter((user: any) => (
        user?.sector?.branch?.company?.id === selectedCompanyId ||
        user?.sector?.branch?.companyId === selectedCompanyId
      ));

      const usersToUpdate = companyUsers.filter((user: any) => user?.phone !== companyForm.phone);
      if (usersToUpdate.length > 0) {
        await Promise.allSettled(
          usersToUpdate.map((user: any) =>
            userService.updateUser(user.id, { phone: companyForm.phone })
          )
        );
      }

      notifications.show({ title: 'Sucesso', message: 'Empresa atualizada', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsCompanies });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsBranches });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsUsers });
      refreshLoggedUserInStorage();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao atualizar empresa'), color: 'red' });
    } finally {
      setSavingCompany(false);
    }
  };

  // Branches
  const openBranchModalForCreate = () => {
    if (reachedBranchLimit) {
      notifications.show({
        title: 'Limite atingido',
        message: 'Voce atingiu o limite de filiais permitido no cadastro do cliente.',
        color: 'yellow',
      });
      return;
    }

    setEditingBranch(null);
    setBranchForm({ tradeName: '', address: '', phone: '', type: 'Filial', cnpjs: [] });
    setBranchErrors({});
    setBranchCnpjDraft({ cnpj: '', label: '' });
    setBranchCnpjError(null);
    setBranchModalOpen(true);
  };

  const openBranchModalForEdit = (branch: any) => {
    setEditingBranch(branch);
    setBranchForm({
      tradeName: branch.tradeName || '',
      address: branch.address || '',
      phone: branch.phone || '',
      type: isBranchMatriz(branch) ? 'Matriz' : 'Filial',
      cnpjs: Array.isArray(branch.cnpjs) ? branch.cnpjs : [],
    });
    setBranchErrors({});
    setBranchCnpjDraft({ cnpj: '', label: '' });
    setBranchCnpjError(null);
    setBranchModalOpen(true);
  };

  const handleAddBranchCnpj = () => {
    const digits = branchCnpjDraft.cnpj.replace(/\D/g, '');
    if (!validateCNPJ(digits)) {
      setBranchCnpjError('CNPJ inválido');
      return;
    }
    if (branchForm.cnpjs.some((entry) => entry.cnpj === digits)) {
      setBranchCnpjError('Esse CNPJ já foi adicionado');
      return;
    }
    setBranchForm((prev) => ({
      ...prev,
      cnpjs: [...prev.cnpjs, { cnpj: digits, label: branchCnpjDraft.label.trim(), isPrimary: prev.cnpjs.length === 0 }],
    }));
    setBranchCnpjDraft({ cnpj: '', label: '' });
    setBranchCnpjError(null);
  };

  const handleRemoveBranchCnpj = (cnpj: string) => {
    setBranchForm((prev) => {
      const remaining = prev.cnpjs.filter((entry) => entry.cnpj !== cnpj);
      if (remaining.length > 0 && !remaining.some((entry) => entry.isPrimary)) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return { ...prev, cnpjs: remaining };
    });
  };

  const handleSetPrimaryBranchCnpj = (cnpj: string) => {
    setBranchForm((prev) => ({
      ...prev,
      cnpjs: prev.cnpjs.map((entry) => ({ ...entry, isPrimary: entry.cnpj === cnpj })),
    }));
  };

  const [creatingDefaultSectors, setCreatingDefaultSectors] = useState(false);
  const handleCreateDefaultSectors = async () => {
    if (!selectedBranchForSectors) return;
    setCreatingDefaultSectors(true);
    try {
      await sectorService.createDefaultSectors(selectedBranchForSectors);
      notifications.show({ title: 'Sucesso', message: 'Setores padrão criados', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsSectors });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao criar setores padrão'), color: 'red' });
    } finally {
      setCreatingDefaultSectors(false);
    }
  };

  const handleSaveBranch = async () => {
    if (!selectedCompanyId) return;

    if (!editingBranch && reachedBranchLimit) {
      notifications.show({
        title: 'Limite atingido',
        message: 'Nao e possivel criar mais filiais para esta empresa.',
        color: 'red',
      });
      return;
    }
    
    // Validate form
    const validation = validateBranchForm(branchForm);
    if (!validation.isValid) {
      setBranchErrors(validation.errors);
      notifications.show({ 
        title: 'Erro de validação', 
        message: 'Corrija os campos destacados', 
        color: 'red' 
      });
      return;
    }
    
    setBranchErrors({});
    setSavingBranch(true);
    try {
      const payload = {
        tradeName: branchForm.tradeName,
        address: branchForm.address,
        phone: branchForm.phone,
        isMatriz: editingBranch ? branchForm.type === 'Matriz' : false,
        type: editingBranch ? branchForm.type : 'Filial',
        cnpjs: branchForm.cnpjs,
      };

      if (editingBranch) {
        await branchService.updateBranch(editingBranch.id, payload);
        setBranches((prev) =>
          prev.map((branch) => {
            if (branch.id === editingBranch.id) {
              return normalizeBranch({ ...branch, ...payload, isMatriz: payload.isMatriz });
            }
            if (payload.isMatriz && branch.companyId === editingBranch.companyId) {
              return normalizeBranch({ ...branch, isMatriz: false });
            }
            return normalizeBranch(branch);
          })
        );
        notifications.show({ title: 'Sucesso', message: 'Filial atualizada', color: 'green' });
      } else {
        const created = await branchService.createBranch({ ...payload, companyId: selectedCompanyId });
        setBranches((prev) => [...prev.map((branch) => normalizeBranch(branch)), normalizeBranch(created)]);
        notifications.show({ title: 'Sucesso', message: 'Filial criada', color: 'green' });
      }
      setBranchModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsBranches });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao salvar filial'), color: 'red' });
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    try {
      await branchService.deleteBranch(id);
      notifications.show({ title: 'Sucesso', message: 'Filial excluída', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsBranches });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao excluir filial'), color: 'red' });
    }
  };

  const openSectorModalForCreate = () => {
    setEditingSector(null);
    setSectorForm({ name: '', description: '', branchId: selectedBranchForSectors || '' });
    setSectorErrors({});
    setSectorModalOpen(true);
  };

  const openSectorModalForEdit = (sector: any) => {
    setEditingSector(sector);
    setSectorForm({ name: sector.name || '', description: sector.description || '', branchId: sector.branchId || '' });
    setSectorErrors({});
    setSectorModalOpen(true);
  };

  const handleSaveSector = async () => {
    if (!sectorForm.branchId) return;
    
    // Validate form
    const validation = validateSectorForm(sectorForm);
    if (!validation.isValid) {
      setSectorErrors(validation.errors);
      notifications.show({ 
        title: 'Erro de validação', 
        message: 'Corrija os campos destacados', 
        color: 'red' 
      });
      return;
    }
    
    setSectorErrors({});
    setSavingSector(true);
    try {
      if (editingSector) {
        await sectorService.updateSector(editingSector.id, sectorForm);
        notifications.show({ title: 'Sucesso', message: 'Setor atualizado', color: 'green' });
      } else {
        await sectorService.createSector(sectorForm);
        notifications.show({ title: 'Sucesso', message: 'Setor criado', color: 'green' });
      }
      setSectorModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsSectors });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao salvar setor'), color: 'red' });
    } finally {
      setSavingSector(false);
    }
  };

  const handleDeleteSector = async (id: string) => {
    try {
      await sectorService.deleteSector(id);
      notifications.show({ title: 'Sucesso', message: 'Setor excluído', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsSectors });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao excluir setor'), color: 'red' });
    }
  };

  const openUserModalForCreate = () => {
    setEditingUser(null);
    const initialBranchId = loggedBranchId || selectedBranchForSectors || '';
    setUserForm({ branchId: initialBranchId, sectorId: selectedSectorForUsers || '', doctorId: '', accessIds: [], name: '', birthDate: '', email: '', password: '', phone: '', address: '' });
    setUserErrors({});
    setUserModalOpen(true);
  };

  const openUserModalForEdit = (user: any) => {
    setEditingUser(user);
    setUserForm({ 
        branchId: user.sector?.branchId || user.sector?.branch?.id || '',
        sectorId: user.sector?.id || '', 
        doctorId: user.doctor?.id || user.doctorId || '',
        accessIds: user.accesses ? user.accesses.map((a: any) => a.id) : [], 
        name: user.name || '', 
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : '', 
        email: user.email || '', 
        password: '', 
        phone: user.phone || '', 
        address: user.address || '' 
    });
    setUserErrors({});
    setUserModalOpen(true);
  };

  const generateRandomPassword = (length = 14) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let index = 0; index < length; index += 1) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    return result;
  };

  const handleGeneratePassword = () => {
    const generated = generateRandomPassword();
    setUserForm((prev) => ({ ...prev, password: generated }));
    notifications.show({
      title: 'Senha gerada',
      message: 'Senha aleatória preenchida. O hash é aplicado automaticamente no backend ao salvar.',
      color: 'blue',
    });
  };

  const handleSaveUser = async () => {
    // Validate form
    const validation = validateUserForm(userForm, !!editingUser);
    if (!validation.isValid) {
      setUserErrors(validation.errors);
      notifications.show({ 
        title: 'Erro de validação', 
        message: 'Corrija os campos destacados', 
        color: 'red' 
      });
      return;
    }
    
    setUserErrors({});
    setSavingUser(true);
    try {
      const currentUserId = String(JSON.parse(localStorage.getItem('user') || '{}')?.id || '').trim();
      let affectedUserId = '';
      const payload: any = { ...userForm };
      if (!payload.doctorId) payload.doctorId = null;
      if (!payload.password) delete payload.password;

      payload.accessIds = Array.from(new Set(Array.isArray(userForm.accessIds) ? userForm.accessIds : []));

      if (editingUser) {
        await userService.updateUser(editingUser.id, payload);
        affectedUserId = String(editingUser.id || '').trim();
        notifications.show({ title: 'Sucesso', message: 'Usuário atualizado', color: 'green' });
      } else {
        const createdUser = await userService.createUser(payload);
        affectedUserId = String(createdUser?.id || '').trim();

        queryClient.setQueryData(queryKeys.settingsUsers, (previous: any) => {
          const list = Array.isArray(previous) ? previous : [];
          if (!createdUser?.id) return list;
          const withoutDuplicated = list.filter((user: any) => String(user?.id || '') !== String(createdUser.id));
          return [createdUser, ...withoutDuplicated];
        });

        notifications.show({ title: 'Sucesso', message: 'Usuário criado', color: 'green' });

        // Garante que a tabela esteja filtrando para a filial/setor onde o usuário foi criado.
        const createdBranchId = String(createdUser?.sector?.branchId || payload.branchId || '').trim();
        const createdSectorId = String(createdUser?.sector?.id || payload.sectorId || '').trim();

        if (createdBranchId) {
          setSelectedBranchForSectors(createdBranchId);
        }
        if (createdSectorId) {
          setSelectedSectorForUsers(createdSectorId);
        }
      }

      if (currentUserId && affectedUserId && currentUserId === affectedUserId) {
        await refreshLoggedUserInStorage();
      }

      setUserModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsUsers });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsAccesses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsDoctors });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao salvar usuário'), color: 'red' });
    } finally {
      setSavingUser(false);
    }
  };

  const availableDoctorsForUserForm = (doctors || [])
    .filter((doctor: any) => {
      if (!userForm.branchId) return true;

      const doctorBranchId = String(doctor?.branchId || doctor?.branch?.id || '').trim();
      if (doctorBranchId && doctorBranchId === userForm.branchId) return true;

      const rooms = Array.isArray(doctor?.rooms) ? doctor.rooms : [];
      const hasRoomInSelectedBranch = rooms.some((link: any) => {
        const roomBranchId = String(link?.room?.branchId || link?.branchId || '').trim();
        return roomBranchId === userForm.branchId;
      });
      if (hasRoomInSelectedBranch) return true;

      // Compatibilidade com médicos antigos que não tinham branchId preenchido.
      return !doctorBranchId && rooms.length === 0;
    })
    .map((doctor: any) => ({
      value: String(doctor.id || ''),
      label: `${doctor.name || 'Médico sem nome'}${doctor.specialty ? ` • ${doctor.specialty}` : ''}`,
    }))
    .filter((item: any) => item.value);

  const userAccessOptions = (accessesList || []).map((a: any) => ({ value: a.id, label: a.description }));

  useEffect(() => {
    if (!userModalOpen || !userForm.doctorId) return;
    const selectedDoctor = (doctors || []).find((doctor: any) => String(doctor?.id || '') === String(userForm.doctorId));
    if (!selectedDoctor) return;

    const parsedBirthDate = selectedDoctor?.birthDate
      ? new Date(selectedDoctor.birthDate).toISOString().slice(0, 10)
      : '';

    setUserForm((prev) => ({
      ...prev,
      name: String(selectedDoctor?.name || prev.name || ''),
      email: String(selectedDoctor?.email || prev.email || ''),
      phone: String(selectedDoctor?.cellphone || selectedDoctor?.phone || prev.phone || ''),
      birthDate: parsedBirthDate || prev.birthDate,
      address: String(selectedDoctor?.address || prev.address || ''),
    }));
  }, [doctors, userForm.doctorId, userModalOpen]);

  const handleDeleteUser = async (id: string) => {
    try {
      await userService.deleteUser(id);
      notifications.show({ title: 'Sucesso', message: 'Usuário excluído', color: 'green' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsUsers });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao excluir usuário'), color: 'red' });
    }
  };

  const refreshLoggedUserInStorage = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
      const currentUser = JSON.parse(userStr);
      if (!currentUser?.id) return;

      const freshUser = await userService.getUser(currentUser.id);
      localStorage.setItem('user', JSON.stringify(freshUser));
      queryClient.setQueryData([...queryKeys.currentUserProfile, String(currentUser.id)], freshUser);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.currentUserProfile, String(currentUser.id)] });
      window.dispatchEvent(new CustomEvent('auth:user-updated'));
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário logado:', error);
    }
  };

  // Accesses
  const openAccessModalForCreate = () => {
    if (availableModules.length === 0) {
      notifications.show({ 
        title: 'Aviso', 
        message: 'Nenhum módulo disponível para o tipo da empresa selecionada.', 
        color: 'yellow' 
      });
      return;
    }
    setEditingAccess(null);
    setAccessForm({ description: '', moduleIds: [] });
    setAccessErrors({});
    setAccessModalOpen(true);
  };

  const openAccessModalForEdit = (access: any) => {
    if (availableModules.length === 0) {
      notifications.show({ 
        title: 'Aviso', 
        message: 'Nenhum módulo disponível para o tipo da empresa selecionada.', 
        color: 'yellow' 
      });
      return;
    }
    setEditingAccess(access);
    const accessModuleIds = filterModulesForCompanyType(access.modules || [], selectedCompanyModuleType).map((m: any) => m.id);
    const allModuleIds = getAllModuleIds();
    const shouldUseTotal = allModuleIds.length > 0 && allModuleIds.every((id) => accessModuleIds.includes(id));

    setAccessForm({ 
      description: access.description || '', 
      moduleIds: shouldUseTotal ? [ACCESS_TOTAL_VALUE] : accessModuleIds,
    });
    setAccessErrors({});
    setAccessModalOpen(true);
  };

  const handleSaveAccess = async () => {
    const payload = {
      ...accessForm,
      moduleIds: expandModuleSelectionForSave(accessForm.moduleIds || []).filter((id) => getAllModuleIds().includes(id)),
    };

    // Validate form
    const validation = validateAccessForm(payload);
    if (!validation.isValid) {
      setAccessErrors(validation.errors);
      notifications.show({ 
        title: 'Erro de validação', 
        message: 'Corrija os campos destacados', 
        color: 'red' 
      });
      return;
    }
    
    setAccessErrors({});
    setSavingAccess(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (editingAccess) {
        await accessService.updateAccess(editingAccess.id, payload);
        notifications.show({ title: 'Sucesso', message: 'Acesso atualizado', color: 'green' });
      } else {
        const newAccess = await accessService.createAccess(payload);
        // Vincular o novo acesso ao usuário autenticado
        if (currentUser?.id && newAccess?.id) {
          await userService.addAccessToUser(currentUser.id, newAccess.id);
        }
        notifications.show({ title: 'Sucesso', message: 'Acesso criado', color: 'green' });
      }
      setAccessModalOpen(false);
      await refreshLoggedUserInStorage();
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsAccesses });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao salvar acesso'), color: 'red' });
    } finally {
      setSavingAccess(false);
    }
  };

  const handleDeleteAccess = async (id: string) => {
    try {
      await accessService.deleteAccess(id);
      notifications.show({ title: 'Sucesso', message: 'Acesso excluído', color: 'green' });
      await refreshLoggedUserInStorage();
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsAccesses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsUsers });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao excluir acesso'), color: 'red' });
    }
  };

  const handleCloneTemplate = async (template: any) => {
    try {
      const newAccess = await accessService.cloneTemplate(template);
      notifications.show({ title: 'Sucesso', message: `Perfil "${newAccess.description}" criado com base no template`, color: 'green' });
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser?.id && newAccess?.id) {
        await userService.addAccessToUser(currentUser.id, newAccess.id);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsAccesses });
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: resolveApiErrorMessage(error, 'Erro ao criar perfil'), color: 'red' });
    }
  };

  // Branch Settings functions
  const handleToggleFacialRecognition = async (enabled: boolean) => {
    if (!selectedBranchForSettings) return;
    setSavingBranchSettings(true);
    try {
      const updated = await branchSettingsService.updateBranchSettings(
        selectedBranchForSettings,
        { requireFacialForReportDelivery: enabled }
      );
      setBranchSettings(updated);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.settingsBranchSettings, selectedBranchForSettings] });
      notifications.show({ 
        title: 'Sucesso', 
        message: 'Configuração atualizada', 
        color: 'green' 
      });
    } catch (error: any) {
      notifications.show({ 
        title: 'Erro', 
        message: resolveApiErrorMessage(error, 'Erro ao atualizar configuração'), 
        color: 'red' 
      });
    } finally {
      setSavingBranchSettings(false);
    }
  };

  const handleToggleFacialRecognitionForPatientRegistration = async (enabled: boolean) => {
    if (!selectedBranchForSettings) return;
    setSavingBranchSettings(true);
    try {
      const updated = await branchSettingsService.updateBranchSettings(
        selectedBranchForSettings,
        { requireFacialForPatientRegistration: enabled }
      );
      setBranchSettings(updated);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.settingsBranchSettings, selectedBranchForSettings] });
      notifications.show({
        title: 'Sucesso',
        message: 'Configuração atualizada',
        color: 'green'
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao atualizar configuração'),
        color: 'red'
      });
    } finally {
      setSavingBranchSettings(false);
    }
  };

  const handleSaveNoShowTolerance = async (value: number | string) => {
    if (!selectedBranchForSettings) return;
    const normalized = typeof value === 'number' ? value : Number(value);
    const nextValue = Math.max(0, Math.floor(Number.isFinite(normalized) ? normalized : 0));

    setSavingBranchSettings(true);
    try {
      const updated = await branchSettingsService.updateBranchSettings(
        selectedBranchForSettings,
        { noShowToleranceMinutes: nextValue }
      );
      setBranchSettings(updated);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.settingsBranchSettings, selectedBranchForSettings] });
      notifications.show({
        title: 'Sucesso',
        message: 'Tempo de tolerância atualizado',
        color: 'green'
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao atualizar tolerância'),
        color: 'red'
      });
    } finally {
      setSavingBranchSettings(false);
    }
  };

  const handleToggleDoctorExamScheduling = async (enabled: boolean) => {
    if (!selectedBranchForSettings) return;
    setSavingBranchSettings(true);
    try {
      const updated = await branchSettingsService.updateBranchSettings(
        selectedBranchForSettings,
        { doctorCanScheduleExamFromConsultation: enabled }
      );
      setBranchSettings(updated);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.settingsBranchSettings, selectedBranchForSettings] });
      notifications.show({
        title: 'Sucesso',
        message: enabled
          ? 'Agendamento de exame pelo médico habilitado nesta filial.'
          : 'Agendamento de exame pelo médico desabilitado nesta filial.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.error || 'Erro ao atualizar configuração de agendamento médico',
        color: 'red',
      });
    } finally {
      setSavingBranchSettings(false);
    }
  };

  const handleTogglePublicCheckIn = async (enabled: boolean) => {
    if (!selectedBranchForSettings) return;
    setSavingBranchSettings(true);
    try {
      const updated = await branchSettingsService.updateBranchSettings(
        selectedBranchForSettings,
        { publicCheckInEnabled: enabled }
      );
      setBranchSettings(updated);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.settingsBranchSettings, selectedBranchForSettings] });
      notifications.show({
        title: enabled ? 'Check-in ligado' : 'Check-in desligado',
        message: enabled
          ? 'O totem desta filial já pode ser usado com login.'
          : 'O totem desta filial foi desligado com sucesso.',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao atualizar o check-in público'),
        color: 'red',
      });
    } finally {
      setSavingBranchSettings(false);
    }
  };

  const handleCopyPublicCheckInUrl = async () => {
    if (!selectedBranchForSettings || typeof window === 'undefined') return;

    const checkInUrl = `${window.location.origin}/check-in/${selectedBranchForSettings}`;

    try {
      await navigator.clipboard.writeText(checkInUrl);
      notifications.show({
        title: 'URL copiada',
        message: 'A URL pronta do check-in foi copiada para a área de transferência.',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Não foi possível copiar',
        message: checkInUrl,
        color: 'yellow',
      });
    }
  };

  useEffect(() => {
    if (!selectedBranchForSettings) {
      setBranchSettings(null);
      return;
    }
    if (branchSettingsData) {
      setBranchSettings(branchSettingsData);
    }
  }, [selectedBranchForSettings, branchSettingsData]);

  useEffect(() => {
    const error: any = companiesError || branchesError || branchSettingsError || sectorsError || usersError || doctorsError || modulesError || accessesError;
    if (!error) return;
    notifications.show({
      title: 'Erro',
      message: resolveApiErrorMessage(error, 'Erro ao carregar configurações'),
      color: 'red',
    });
  }, [companiesError, branchesError, branchSettingsError, sectorsError, usersError, doctorsError, modulesError, accessesError]);

  // Common UI components (Moved outside to prevent re-renders)
  const renderTabList = () => (
    <Paper p="md" radius="md" withBorder shadow="sm" h="100%" style={{ minHeight: '400px' }}>
      <Stack gap={0}>
        <Text c="dimmed" size="xs" fw={700} tt="uppercase" mb="sm" pl="xs">Menu</Text>
        {[
          { id: 'company', label: 'Empresa', icon: Building2 },
          { id: 'branches', label: 'Filiais', icon: GitBranch },
          { id: 'sectors', label: 'Setores', icon: Layers },
          { id: 'users', label: 'Usuários', icon: Users },
          { id: 'accesses', label: 'Acessos', icon: Shield },
          { id: 'branchSettings', label: 'Configurações', icon: Settings },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Button
              key={item.id}
              variant="subtle"
              color={isActive ? undefined : 'gray'}
              leftSection={<item.icon size={18} />}
              justify="flex-start"
              fullWidth
              onClick={() => setActiveTab(item.id)}
              styles={{
                root: {
                  color: isActive ? 'var(--mantine-color-text)' : undefined,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive
                    ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,31,84,0.10)')
                    : 'transparent',
                  border: isActive
                    ? (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,31,84,0.14)')
                    : '1px solid transparent',
                },
                inner: {
                    justifyContent: 'flex-start'
                }
              }}
              mb={4}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>
    </Paper>
  );

  return (
    <PageContainer>
      <Group justify="space-between" align="center" mb="lg">
        <Group gap="sm" align="center">
          <ActionIcon variant="default" color="black" size="xl" onClick={() => navigate(-1)}>
            <ChevronLeft size={28} />
          </ActionIcon>
          <Title order={1} fw={600} style={{ fontSize: '1.8rem' }}>Configurações</Title>
        </Group>
        <Text c="dimmed">{selectedCompany?.legalName}</Text>
      </Group>

      <Grid gutter="xl">
        <Grid.Col span={isMobile ? 12 : 3}>
          {renderTabList()}
        </Grid.Col>

        <Grid.Col span={isMobile ? 12 : 9}>
            <Paper p="xl" radius="md" withBorder shadow="sm" style={{ minHeight: '400px' }}>
                {activeTab === 'company' && (
                    <Box>
                        <SectionTitle title="Dados da Empresa" desc="Gerencie as informações principais da sua organização." />
                        
                        {loadingCompanies ? <SettingsPanelSkeleton /> : (
                            <Stack gap="lg" w="100%">
                              <Stack gap="md" w="100%">
                                <Grid>
                                    <Grid.Col span={6}>
                                        <FloatingInput 
                                          label="CNPJ" 
                                          value={companyForm.cnpj} 
                                          onChange={(e: any) => setCompanyForm({ ...companyForm, cnpj: e.currentTarget.value })} 
                                          required
                                          error={companyErrors.cnpj}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <FloatingInput 
                                          label="Telefone" 
                                          value={companyForm.phone} 
                                          onChange={(e: any) => setCompanyForm({ ...companyForm, phone: e.currentTarget.value })} 
                                          error={companyErrors.phone}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <FloatingInput 
                                          label="Razão Social" 
                                          value={companyForm.legalName} 
                                          onChange={(e: any) => setCompanyForm({ ...companyForm, legalName: e.currentTarget.value })} 
                                          required
                                          error={companyErrors.legalName}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <FloatingInput 
                                          label="Nome Fantasia" 
                                          value={companyForm.tradeName} 
                                          onChange={(e: any) => setCompanyForm({ ...companyForm, tradeName: e.currentTarget.value })} 
                                          required
                                          error={companyErrors.tradeName}
                                        />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <FloatingInput 
                                          label="Endereço" 
                                          value={companyForm.address} 
                                          onChange={(e: any) => setCompanyForm({ ...companyForm, address: e.currentTarget.value })} 
                                          error={companyErrors.address}
                                        />
                                    </Grid.Col>
                                </Grid>
                                <Group justify="flex-end" mt="xs">
                                    <Button leftSection={<Save size={16} />} onClick={handleSaveCompany} loading={savingCompany} bg={DARK_BLUE}>
                                      Salvar Dados da Empresa
                                    </Button>
                                </Group>
                              </Stack>

                              <Divider />

                              <Paper
                                p="lg"
                                radius="md"
                                withBorder
                                style={{
                                  borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                  background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                }}
                              >
                                <Group mb="md" gap="xs">
                                  <MessageCircle size={20} />
                                  <Text fw={600} size="md">
                                    Configuração WhatsApp (Padrão da Empresa)
                                  </Text>
                                </Group>
                                <WhatsAppCredentials scope="COMPANY" />
                              </Paper>
                            </Stack>
                        )}
                    </Box>
                )}

                {activeTab === 'branches' && (
                    <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Filiais" desc="Gerencie as unidades da empresa." />
                            <Button leftSection={<Plus size={16} />} onClick={openBranchModalForCreate} bg={DARK_BLUE} disabled={!selectedCompanyId || reachedBranchLimit}>Nova Filial</Button>
                        </Group>

                        {maxBranchesAllowed !== null && (
                          <Text size="sm" c={reachedBranchLimit ? 'red' : 'dimmed'} mb="md">
                            Limite de filiais: {branches.length}/{maxBranchesAllowed}
                          </Text>
                        )}

                        {loadingBranches ? <SettingsTableSkeleton /> : (
                            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                                <Table horizontalSpacing="md" verticalSpacing="md">
                                    <Table.Thead>
                                        <Table.Tr style={{ borderBottom: 'none' }}>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Nome Fantasia</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Telefone</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Tipo</Table.Th>
                                            <Table.Th style={{ width: '100px' }}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(branches || []).map(branch => (
                                            <Table.Tr key={branch.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <Table.Td><Text size="sm" fw={500}>{branch.tradeName}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{branch.phone}</Text></Table.Td>
                                                <Table.Td>
                                                    <Badge 
                                                  color={isBranchMatriz(branch) ? 'blue' : 'gray'} 
                                                        variant="light" 
                                                        size="sm"
                                                  fw={isBranchMatriz(branch) ? 600 : 500}
                                                    >
                                                  {isBranchMatriz(branch) ? 'Matriz' : 'Filial'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => openBranchModalForEdit(branch)}><Edit size={16} /></ActionIcon>
                                                  {!isBranchMatriz(branch) && (
                                                            <ActionIcon variant="subtle" color="red" onClick={() => openDeleteConfirm('Excluir filial', 'Deseja realmente excluir esta filial?', () => handleDeleteBranch(branch.id))}><Trash size={16} /></ActionIcon>
                                                        )}
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {branches.length === 0 && <Table.Tr><Table.Td colSpan={5} align="center">Nenhuma filial cadastrada</Table.Td></Table.Tr>}
                                    </Table.Tbody>
                                </Table>
                            </Box>
                        )}
                        <Modal opened={branchModalOpen} onClose={() => setBranchModalOpen(false)} title={editingBranch ? 'Editar Filial' : 'Nova Filial'} centered>
                             <Stack pt="lg">
                                    <FloatingInput 
                                      label="Nome Fantasia" 
                                      value={branchForm.tradeName} 
                                      onChange={(e: any) => setBranchForm({ ...branchForm, tradeName: e.currentTarget.value })} 
                                      required
                                      error={branchErrors.tradeName}
                                    />
                                {(!editingBranch || (editingBranch && !isBranchMatriz(editingBranch))) && (
                                  <>
                                    <FloatingInput
                                      label="Telefone"
                                      value={branchForm.phone}
                                      onChange={(e: any) => setBranchForm({ ...branchForm, phone: e.currentTarget.value })}
                                      error={branchErrors.phone}
                                    />
                                    <FloatingInput
                                      label="Endereço"
                                      value={branchForm.address}
                                      onChange={(e: any) => setBranchForm({ ...branchForm, address: e.currentTarget.value })}
                                      error={branchErrors.address}
                                    />
                                  </>
                                )}

                                <Divider label="CNPJs da unidade" labelPosition="left" mt="sm" />
                                {branchForm.cnpjs.length > 0 ? (
                                  <Stack gap={6}>
                                    {branchForm.cnpjs.map((entry) => (
                                      <Group key={entry.cnpj} justify="space-between" wrap="nowrap" p={8} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                                        <Box style={{ minWidth: 0 }}>
                                          <Text size="sm" fw={600}>{formatCNPJ(entry.cnpj)}</Text>
                                          <Text size="xs" c="dimmed">{entry.label || 'Sem apelido'}</Text>
                                        </Box>
                                        <Group gap={4} wrap="nowrap">
                                          {entry.isPrimary ? (
                                            <Badge size="xs" color="yellow" variant="light" leftSection={<Star size={10} />}>Principal</Badge>
                                          ) : (
                                            <ActionIcon variant="light" color="yellow" size="sm" onClick={() => handleSetPrimaryBranchCnpj(entry.cnpj)} title="Tornar principal">
                                              <Star size={14} />
                                            </ActionIcon>
                                          )}
                                          <ActionIcon variant="light" color="red" size="sm" onClick={() => handleRemoveBranchCnpj(entry.cnpj)}>
                                            <Trash size={14} />
                                          </ActionIcon>
                                        </Group>
                                      </Group>
                                    ))}
                                  </Stack>
                                ) : (
                                  <Text size="sm" c="dimmed">Nenhum CNPJ cadastrado ainda.</Text>
                                )}
                                <Group align="flex-end" gap="xs" wrap="nowrap">
                                  <Box style={{ flex: 1 }}>
                                    <FloatingInput
                                      label="CNPJ"
                                      value={branchCnpjDraft.cnpj}
                                      onChange={(e: any) => { setBranchCnpjDraft((prev) => ({ ...prev, cnpj: e.currentTarget.value })); setBranchCnpjError(null); }}
                                      error={branchCnpjError || undefined}
                                    />
                                  </Box>
                                  <Box style={{ flex: 1 }}>
                                    <FloatingInput
                                      label="Apelido (opcional)"
                                      placeholder="Ex: Exames"
                                      value={branchCnpjDraft.label}
                                      onChange={(e: any) => setBranchCnpjDraft((prev) => ({ ...prev, label: e.currentTarget.value }))}
                                    />
                                  </Box>
                                  <Button variant="light" onClick={handleAddBranchCnpj}>Adicionar</Button>
                                </Group>

                                <Button fullWidth mt="md" onClick={handleSaveBranch} loading={savingBranch} bg={DARK_BLUE}>{editingBranch ? 'Salvar' : 'Criar'}</Button>
                            </Stack>
                        </Modal>
                    </Box>
                )}

                {activeTab === 'sectors' && (
                     <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Setores" desc="Organize os setores por filial." />
                            <Group gap="xs">
                                <Button
                                  variant="light"
                                  leftSection={<Copy size={16} />}
                                  onClick={handleCreateDefaultSectors}
                                  loading={creatingDefaultSectors}
                                  disabled={!selectedBranchForSectors}
                                >
                                  Setores Padrão
                                </Button>
                                <Button leftSection={<Plus size={16} />} onClick={openSectorModalForCreate} bg={DARK_BLUE} disabled={!selectedBranchForSectors}>Novo Setor</Button>
                            </Group>
                        </Group>

                        <Select 
                            label="Filial"
                            placeholder="Selecione uma filial" 
                            data={(branches || []).map(b => ({ value: b.id, label: b.tradeName }))}
                            value={selectedBranchForSectors}
                            onChange={setSelectedBranchForSectors}
                            mb="lg"
                            maw={400}
                        />

                        {loadingSectors ? <SettingsTableSkeleton /> : (
                            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                                <Table horizontalSpacing="md" verticalSpacing="md">
                                    <Table.Thead>
                                        <Table.Tr style={{ borderBottom: 'none' }}>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Descrição</Table.Th>
                                            <Table.Th style={{ width: '100px' }}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(sectors || []).map(sector => (
                                            <Table.Tr key={sector.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <Table.Td><Text size="sm" fw={500}>{sector.name}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{sector.description}</Text></Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => openSectorModalForEdit(sector)}><Edit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => openDeleteConfirm('Excluir setor', 'Deseja realmente excluir este setor?', () => handleDeleteSector(sector.id))}><Trash size={16} /></ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {sectors.length === 0 && <Table.Tr><Table.Td colSpan={3} align="center">Nenhum setor encontrado para esta filial</Table.Td></Table.Tr>}
                                    </Table.Tbody>
                                </Table>
                            </Box>
                        )}
                         <Modal opened={sectorModalOpen} onClose={() => setSectorModalOpen(false)} title={editingSector ? 'Editar Setor' : 'Novo Setor'} centered>
                             <Stack pt="lg">
                                <Select 
                                  label="Filial" 
                                  data={(branches || []).map((b: any) => ({ value: b.id, label: b.tradeName }))}
                                  value={sectorForm.branchId}
                                  onChange={(v) => setSectorForm({ ...sectorForm, branchId: v || '' })}
                                  error={sectorErrors.branchId}
                                  searchable
                                  withAsterisk
                                />
                                <FloatingInput 
                                  label="Nome" 
                                  value={sectorForm.name} 
                                  onChange={(e: any) => setSectorForm({ ...sectorForm, name: e.currentTarget.value })} 
                                  required
                                  error={sectorErrors.name}
                                />
                                <FloatingInput 
                                  label="Descrição" 
                                  value={sectorForm.description} 
                                  onChange={(e: any) => setSectorForm({ ...sectorForm, description: e.currentTarget.value })} 
                                  error={sectorErrors.description}
                                />
                                <Button fullWidth mt="md" onClick={handleSaveSector} loading={savingSector} bg={DARK_BLUE}>{editingSector ? 'Salvar' : 'Criar'}</Button>
                            </Stack>
                        </Modal>
                    </Box>
                )}

                {activeTab === 'users' && (
                    <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Usuários" desc="Gerencie acesso e permissões." />
                            <Button
                              leftSection={<UserPlus size={16} />}
                              onClick={openUserModalForCreate}
                              bg={DARK_BLUE}
                              disabled={branches.length === 0}
                            >
                              Novo Usuário
                            </Button>
                        </Group>

                         <Group mb="lg">
                            <Select 
                                label="Filial"
                                placeholder="Selecione..." 
                                data={(branches || []).map((b: any) => ({ value: b.id, label: b.tradeName }))}
                                value={selectedBranchForSectors}
                                onChange={setSelectedBranchForSectors}
                                style={{ flex: 1 }}
                            />
                            <Select 
                                label="Setor"
                                placeholder="Todos os setores" 
                                data={[
                                  { value: '__ALL__', label: 'Todos os setores' },
                                  ...(sectors || []).map(s => ({ value: s.id, label: s.name })),
                                ]}
                                value={selectedSectorForUsers || '__ALL__'}
                                onChange={(value) => setSelectedSectorForUsers(value === '__ALL__' ? null : value)}
                                style={{ flex: 1 }}
                                disabled={!selectedBranchForSectors}
                            />
                        </Group>

                        {loadingUsers ? <SettingsTableSkeleton /> : (
                            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                                <Table horizontalSpacing="md" verticalSpacing="md">
                                    <Table.Thead>
                                        <Table.Tr style={{ borderBottom: 'none' }}>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Nome</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Email</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Telefone</Table.Th>
                                            <Table.Th style={{ width: '100px' }}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(users || []).map(user => (
                                            <Table.Tr key={user.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <Table.Td>
                                                    <Group gap="sm">
                                                        <Box
                                                            bg={DARK_BLUE}
                                                            w={32}
                                                            h={32}
                                                            style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                        >
                                                            <Text c="white" fw={600} size="sm">
                                                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                            </Text>
                                                        </Box>
                                                        <Box>
                                                            <Text size="sm" fw={500}>{user.name}</Text>
                                                            <Text size="xs" c="dimmed">{(user.accesses || []).map((a:any) => a.description).join(', ') || 'Sem acessos'}</Text>
                                                        </Box>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td><Text size="sm">{user.email}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{user.phone}</Text></Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => openUserModalForEdit(user)}><Edit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => openDeleteConfirm('Excluir usuário', 'Deseja realmente excluir este usuário?', () => handleDeleteUser(user.id))}><Trash size={16} /></ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {users.length === 0 && <Table.Tr><Table.Td colSpan={4} align="center">Nenhum usuário encontrado neste setor</Table.Td></Table.Tr>}
                                    </Table.Tbody>
                                </Table>
                            </Box>
                        )}
                        <Modal opened={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Editar Usuário' : 'Novo Usuário'} size="lg" centered>
                            <Grid pt="lg">
                                <Grid.Col span={12}>
                                    <Select
                                        label="Filial"
                                        data={(branches || []).map((b: any) => ({ value: b.id, label: b.tradeName }))}
                                        value={userForm.branchId}
                                        onChange={(v) => setUserForm({ ...userForm, branchId: v || '', sectorId: '', doctorId: '' })}
                                        mb="xs"
                                        error={userErrors.branchId}
                                        searchable
                                        withAsterisk
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <Select 
                                        label="Setor" 
                                        data={(allSectors || [])
                                          .filter((s: any) => s.branchId === userForm.branchId)
                                          .map((s: any) => ({ value: s.id, label: s.name }))}
                                        value={userForm.sectorId}
                                        onChange={(v) => setUserForm({...userForm, sectorId: v || ''})}
                                        mb="xs"
                                        error={userErrors.sectorId}
                                        disabled={!userForm.branchId}
                                        withAsterisk
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <Select
                                        label="Médico vinculado"
                                        placeholder="Opcional: vincule este usuário a um médico"
                                        data={availableDoctorsForUserForm}
                                        value={userForm.doctorId}
                                        onChange={(v) => setUserForm({ ...userForm, doctorId: v || '' })}
                                        mb="xs"
                                        searchable
                                        clearable
                                        disabled={!userForm.branchId}
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <MultiSelect 
                                        label="Acessos" 
                                        data={userAccessOptions}
                                        value={userForm.accessIds || []}
                                        onChange={(v) => setUserForm({...userForm, accessIds: v})}
                                        searchable
                                        mb="md"
                                        placeholder="Selecione os acessos"
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput 
                                      label="Nome" 
                                      value={userForm.name} 
                                      onChange={(e: any) => setUserForm({...userForm, name: e.currentTarget.value})} 
                                      required
                                      error={userErrors.name}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput 
                                      label="Email" 
                                      value={userForm.email} 
                                      onChange={(e: any) => setUserForm({...userForm, email: e.currentTarget.value})} 
                                      required
                                      error={userErrors.email}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput 
                                        label={editingUser ? "Senha (Vazio para manter)" : "Senha"} 
                                        type="password" 
                                        value={userForm.password} 
                                        onChange={(e: any) => setUserForm({...userForm, password: e.currentTarget.value})} 
                                        required={!editingUser}
                                        rightSection={(
                                          <ActionIcon
                                            variant="subtle"
                                            color="blue"
                                            size="sm"
                                            onClick={handleGeneratePassword}
                                            title="Gerar senha aleatória"
                                          >
                                            <RefreshCw size={14} />
                                          </ActionIcon>
                                        )}
                                        error={userErrors.password}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput 
                                      label="Telefone" 
                                      value={userForm.phone} 
                                      onChange={(e: any) => setUserForm({...userForm, phone: e.currentTarget.value})} 
                                      error={userErrors.phone}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput 
                                      type="date" 
                                      label="Data de Nascimento" 
                                      value={userForm.birthDate} 
                                      onChange={(e: any) => setUserForm({...userForm, birthDate: e.currentTarget.value})} 
                                      required
                                      error={userErrors.birthDate}
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <FloatingInput 
                                      label="Endereço" 
                                      value={userForm.address} 
                                      onChange={(e: any) => setUserForm({...userForm, address: e.currentTarget.value})} 
                                      error={userErrors.address}
                                    />
                                </Grid.Col>
                            </Grid>
                            <Button fullWidth mt="md" onClick={handleSaveUser} loading={savingUser} bg={DARK_BLUE}>{editingUser ? 'Salvar' : 'Criar'}</Button>
                        </Modal>
                    </Box>
                )}

                {activeTab === 'accesses' && (
                    <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Acessos e Permissões" desc="Defina papéis e permissões do sistema." />
                            <Button leftSection={<Plus size={16} />} onClick={openAccessModalForCreate} bg={DARK_BLUE}>Novo Acesso</Button>
                        </Group>

                        {/* Perfis padrão */}
                        {(accessesList || []).some((a: any) => a.isTemplate) && (
                          <Box mb="lg">
                            <Text size="sm" fw={600} c="dimmed" mb="xs" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Perfis Padrão</Text>
                            <Box style={{ overflowX: 'hidden', border: '1px solid #e9ecef', borderRadius: 6 }}>
                              <Table horizontalSpacing="md" verticalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                                <Table.Thead>
                                  <Table.Tr style={{ borderBottom: 'none' }}>
                                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, width: '240px' }}>Descrição</Table.Th>
                                    <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Módulos</Table.Th>
                                    <Table.Th style={{ width: '120px' }}></Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {(accessesList || []).filter((a: any) => a.isTemplate).map((access: any) => (
                                    <Table.Tr key={access.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                      <Table.Td style={{ width: '240px' }}>
                                        <Group gap={6}>
                                          <Text size="sm" fw={500}>{access.description}</Text>
                                          <Badge size="xs" variant="light" color="blue">Padrão</Badge>
                                        </Group>
                                      </Table.Td>
                                      <Table.Td>
                                        <Box style={{ overflowX: 'auto' }}>
                                          <Group gap={4} wrap="nowrap">
                                            {(access.modules || []).map((module: any) => (
                                              <Text
                                                key={module.id}
                                                size="xs"
                                                c="dimmed"
                                                style={{
                                                  padding: '2px 8px',
                                                  background: isDark ? 'rgba(255,255,255,0.08)' : '#e7f5ff',
                                                  borderRadius: 4,
                                                  whiteSpace: 'nowrap',
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {module.label}
                                              </Text>
                                            ))}
                                          </Group>
                                        </Box>
                                      </Table.Td>
                                      <Table.Td>
                                        <Group gap={4} justify="flex-end">
                                          <ActionIcon variant="subtle" color="blue" title="Usar como base" onClick={() => handleCloneTemplate(access)}>
                                            <Copy size={16} />
                                          </ActionIcon>
                                        </Group>
                                      </Table.Td>
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </Box>
                          </Box>
                        )}

                        {/* Perfis personalizados */}
                        <Box>
                          {(accessesList || []).some((a: any) => !a.isTemplate) && (
                            <Text size="sm" fw={600} c="dimmed" mb="xs" tt="uppercase" style={{ letterSpacing: '0.05em' }}>Perfis Personalizados</Text>
                          )}
                          <Box style={{ overflowX: 'hidden', border: '1px solid #e9ecef', borderRadius: 6 }}>
                            <Table horizontalSpacing="md" verticalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                              <Table.Thead>
                                <Table.Tr style={{ borderBottom: 'none' }}>
                                  <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500, width: '220px' }}>Descrição</Table.Th>
                                  <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Módulos</Table.Th>
                                  <Table.Th style={{ width: '100px' }}></Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {(accessesList || []).filter((a: any) => !a.isTemplate).map((access: any) => (
                                  <Table.Tr key={access.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                    <Table.Td style={{ width: '220px' }}><Text size="sm" fw={500}>{access.description}</Text></Table.Td>
                                    <Table.Td>
                                      <Box style={{ overflowX: 'auto' }}>
                                        <Group gap={4} wrap="nowrap">
                                          {(access.modules || []).map((module: any) => (
                                            <Text
                                              key={module.id}
                                              size="xs"
                                              c="dimmed"
                                              style={{
                                                padding: '2px 8px',
                                                background: isDark ? 'rgba(255,255,255,0.08)' : '#e7f5ff',
                                                borderRadius: 4,
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                              }}
                                            >
                                              {module.label}
                                            </Text>
                                          )) || <Text size="xs" c="dimmed">Nenhum módulo</Text>}
                                        </Group>
                                      </Box>
                                    </Table.Td>
                                    <Table.Td>
                                      <Group gap={4} justify="flex-end">
                                        <ActionIcon variant="subtle" color="blue" onClick={() => openAccessModalForEdit(access)}><Edit size={16} /></ActionIcon>
                                        <ActionIcon variant="subtle" color="red" onClick={() => openDeleteConfirm('Excluir acesso', 'Deseja realmente excluir este acesso?', () => handleDeleteAccess(access.id))}><Trash size={16} /></ActionIcon>
                                      </Group>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                                {(accessesList || []).filter((a: any) => !a.isTemplate).length === 0 && (
                                  <Table.Tr><Table.Td colSpan={3} align="center"><Text size="sm" c="dimmed" py="md">Nenhum perfil personalizado. Use um perfil padrão como base.</Text></Table.Td></Table.Tr>
                                )}
                              </Table.Tbody>
                            </Table>
                          </Box>
                        </Box>
                        <Modal
                          opened={accessModalOpen}
                          onClose={() => setAccessModalOpen(false)}
                          title={editingAccess ? 'Editar Acesso' : 'Novo Acesso'}
                          centered
                          styles={{
                            content: {
                              background: isDark ? 'var(--mantine-color-body)' : undefined,
                              border: isDark ? '1px solid var(--mantine-color-default-border)' : undefined,
                            },
                            header: {
                              background: isDark ? 'var(--mantine-color-body)' : undefined,
                              borderBottom: isDark ? '1px solid var(--mantine-color-default-border)' : undefined,
                            },
                            body: {
                              background: isDark ? 'var(--mantine-color-body)' : undefined,
                            },
                            title: {
                              color: isDark ? 'var(--mantine-color-text)' : undefined,
                            },
                          }}
                        >
                             <Stack pt="lg">
                                <FloatingInput 
                                  label="Descrição" 
                                  value={accessForm.description} 
                                  onChange={(e: any) => setAccessForm({ ...accessForm, description: e.currentTarget.value })} 
                                  required
                                  error={accessErrors.description}
                                />
                                {loadingModules ? (
                                  <Stack gap="sm" py="sm">
                                    <Skeleton height={42} radius="md" />
                                    <Skeleton height={42} radius="md" />
                                  </Stack>
                                ) : (
                                  <MultiSelect
                                    label="Módulos"
                                    placeholder="Selecione os módulos"
                                    data={
                                      Array.isArray(availableModules) && availableModules.length > 0
                                        ? [
                                            { value: ACCESS_TOTAL_VALUE, label: ACCESS_TOTAL_LABEL },
                                            ...availableModules.map((m) => ({
                                              value: m.id || '',
                                              label: m.label || m.name || 'Sem nome',
                                            })),
                                          ]
                                        : []
                                    }
                                    value={accessForm.moduleIds || []}
                                    onChange={(value) => setAccessForm({ ...accessForm, moduleIds: normalizeModuleSelection(value) })}
                                    searchable
                                    disabled={!availableModules || availableModules.length === 0}
                                    error={accessErrors.moduleIds}
                                    withAsterisk
                                    styles={{
                                      label: { marginBottom: 8, fontWeight: 500 },
                                      input: isDark ? {
                                        background: 'var(--mantine-color-default)',
                                        borderColor: 'var(--mantine-color-default-border)',
                                        color: 'var(--mantine-color-text)',
                                      } : undefined,
                                      pill: isDark ? {
                                        background: 'rgba(255,255,255,0.08)',
                                        color: 'var(--mantine-color-text)',
                                      } : undefined,
                                      pillsList: {
                                        flexWrap: 'nowrap',
                                        overflowX: 'auto',
                                      },
                                    }}
                                    nothingFoundMessage="Nenhum módulo encontrado"
                                  />
                                )}
                                <Button 
                                  fullWidth 
                                  mt="md" 
                                  onClick={handleSaveAccess} 
                                  loading={savingAccess}
                                  disabled={loadingModules}
                                  bg={DARK_BLUE}
                                >
                                  {editingAccess ? 'Salvar' : 'Criar'}
                                </Button>
                            </Stack>
                        </Modal>
                    </Box>
                )}

                {activeTab === 'branchSettings' && (
                    <Box>
                        <SectionTitle 
                            title="Configurações Gerais por Filial" 
                            desc="Configure comportamentos específicos de cada filial do sistema." 
                        />

                        <Select 
                            label="Filial"
                            placeholder="Selecione uma filial" 
                            data={(branches || []).map(b => ({ value: b.id, label: b.tradeName }))}
                            value={selectedBranchForSettings}
                            onChange={setSelectedBranchForSettings}
                            mb="xl"
                            searchable
                            styles={{
                                label: { marginBottom: 8, fontWeight: 500 },
                                input: isDark ? {
                                    background: 'var(--mantine-color-default)',
                                    borderColor: 'var(--mantine-color-default-border)',
                                    color: 'var(--mantine-color-text)',
                                } : undefined,
                            }}
                        />

                        {selectedBranchForSettings && (
                            <>
                                {loadingBranchSettings ? (
                                    <Stack gap="sm" py="sm">
                                        <Skeleton height={82} radius="md" />
                                        <Skeleton height={82} radius="md" />
                                        <Skeleton height={82} radius="md" />
                                    </Stack>
                                ) : (
                                    <Stack gap="lg">
                                        <Paper 
                                            p="lg" 
                                            radius="md" 
                                            withBorder 
                                            style={{ 
                                                borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                            }}
                                        >
                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                <Box style={{ flex: 1 }}>
                                                    <Text fw={600} size="sm" mb={4}>
                                                        Reconhecimento Facial para Entrega de Laudos
                                                    </Text>
                                                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                                                        Quando ativado, será obrigatório realizar o reconhecimento facial do paciente 
                                                        antes de permitir a retirada de laudos médicos. Esta configuração se aplica 
                                                        apenas aos pacientes cadastrados nesta filial.
                                                    </Text>
                                                </Box>
                                                <Switch
                                                    checked={branchSettings?.requireFacialForReportDelivery || false}
                                                    onChange={(event) => handleToggleFacialRecognition(event.currentTarget.checked)}
                                                    disabled={savingBranchSettings}
                                                    size="lg"
                                                    color={DARK_BLUE}
                                                    styles={{
                                                        track: {
                                                            cursor: savingBranchSettings ? 'not-allowed' : 'pointer',
                                                        },
                                                    }}
                                                />
                                            </Group>
                                            {savingBranchSettings && (
                                                <Group gap="xs" mt="sm">
                                                    <Loader size="xs" />
                                                    <Text size="xs" c="dimmed">Salvando...</Text>
                                                </Group>
                                            )}
                                        </Paper>

                                        <Paper
                                            p="lg"
                                            radius="md"
                                            withBorder
                                            style={{
                                                borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                            }}
                                        >
                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                <Box style={{ flex: 1 }}>
                                                    <Text fw={600} size="sm" mb={4}>
                                                        Reconhecimento Facial no Cadastro de Paciente
                                                    </Text>
                                                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                                                        Quando ativado, será obrigatório capturar a foto facial durante o cadastro
                                                        de pacientes desta filial. Quando desativado, o cadastro pode ser concluído
                                                        sem a captura facial.
                                                    </Text>
                                                </Box>
                                                <Switch
                                                    checked={branchSettings?.requireFacialForPatientRegistration ?? true}
                                                    onChange={(event) => handleToggleFacialRecognitionForPatientRegistration(event.currentTarget.checked)}
                                                    disabled={savingBranchSettings}
                                                    size="lg"
                                                    color={DARK_BLUE}
                                                    styles={{
                                                        track: {
                                                            cursor: savingBranchSettings ? 'not-allowed' : 'pointer',
                                                        },
                                                    }}
                                                />
                                            </Group>
                                        </Paper>

                                        <Paper
                                            p="lg"
                                            radius="md"
                                            withBorder
                                            style={{
                                                borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                            }}
                                        >
                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                <Box style={{ flex: 1 }}>
                                                    <Text fw={600} size="sm" mb={4}>
                                                        Agendamento Médico de Exame na Consulta
                                                    </Text>
                                                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                                                        Quando ativado, o médico pode sair da consulta com o exame já agendado
                                                        (com sugestão de horários livres). Quando desativado, o médico apenas
                                                        emite o pedido e o agendamento ocorre na recepção.
                                                    </Text>
                                                </Box>
                                                <Switch
                                                    checked={branchSettings?.doctorCanScheduleExamFromConsultation || false}
                                                    onChange={(event) => handleToggleDoctorExamScheduling(event.currentTarget.checked)}
                                                    disabled={savingBranchSettings}
                                                    size="lg"
                                                    color={DARK_BLUE}
                                                />
                                            </Group>
                                        </Paper>

                                        <Paper
                                            p="lg"
                                            radius="md"
                                            withBorder
                                            style={{
                                                borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                            }}
                                        >
                                            <Stack gap="md">
                                                <Box>
                                                    <Text fw={600} size="sm" mb={4}>
                                                        Tolerância Para Não Comparecimento
                                                    </Text>
                                                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                                                        Define quantos minutos após o horário marcado o sistema deve aguardar
                                                        antes de mudar automaticamente o agendamento para "Não compareceu".
                                                    </Text>
                                                </Box>
                                                <Group align="end">
                                                    <NumberInput
                                                        label="Tempo de tolerância (minutos)"
                                                        min={0}
                                                        max={240}
                                                        step={5}
                                                        value={branchSettings?.noShowToleranceMinutes ?? 30}
                                                        onChange={(value) => {
                                                            const nextValue = typeof value === 'number' ? value : Number(value);
                                                            setBranchSettings((prev) => prev ? ({
                                                                ...prev,
                                                                noShowToleranceMinutes: Number.isFinite(nextValue) ? nextValue : 0,
                                                            }) : prev);
                                                        }}
                                                        styles={{
                                                            label: { marginBottom: 8, fontWeight: 500 },
                                                        }}
                                                        style={{ maxWidth: 260 }}
                                                    />
                                                    <Button
                                                        bg={DARK_BLUE}
                                                        c="white"
                                                        onClick={() => handleSaveNoShowTolerance(branchSettings?.noShowToleranceMinutes ?? 30)}
                                                        loading={savingBranchSettings}
                                                    >
                                                        Salvar tolerância
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </Paper>

                                        <Paper
                                            p="lg"
                                            radius="md"
                                            withBorder
                                            style={{
                                                borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                            }}
                                        >
                                            <Stack gap="md">
                                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                    <Box style={{ flex: 1 }}>
                                                        <Text fw={600} size="sm" mb={4}>
                                                            Check-in da Filial
                                                        </Text>
                                                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                                                            Controle se o totem desta filial está ligado, audite quem ativou ou desligou e copie a URL pronta para uso.
                                                        </Text>
                                                    </Box>
                                                    <Switch
                                                        checked={branchSettings?.publicCheckInEnabled || false}
                                                        onChange={(event) => handleTogglePublicCheckIn(event.currentTarget.checked)}
                                                        disabled={savingBranchSettings}
                                                        size="lg"
                                                        color={DARK_BLUE}
                                                        onLabel={<Power size={14} />}
                                                        offLabel={<PowerOff size={14} />}
                                                    />
                                                </Group>

                                                <Group align="end" wrap="wrap">
                                                    <TextInput
                                                        label="URL pronta do check-in"
                                                        value={selectedBranchForSettings && typeof window !== 'undefined'
                                                            ? `${window.location.origin}/check-in/${selectedBranchForSettings}`
                                                            : ''}
                                                        readOnly
                                                        styles={{
                                                            label: { marginBottom: 8, fontWeight: 500 },
                                                        }}
                                                        style={{ flex: 1, minWidth: 320 }}
                                                    />
                                                    <Button
                                                        leftSection={<Copy size={16} />}
                                                        variant="light"
                                                        onClick={handleCopyPublicCheckInUrl}
                                                        disabled={!selectedBranchForSettings}
                                                    >
                                                        Copiar URL
                                                    </Button>
                                                </Group>

                                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                                    <Paper p="md" withBorder radius="md" bg={isDark ? 'rgba(255,255,255,0.02)' : 'var(--mantine-color-gray-0)'}>
                                                        <Stack gap={4}>
                                                            <Text size="xs" c="dimmed">Última ativação</Text>
                                                            <Text fw={600} size="sm">
                                                                {branchSettings?.publicCheckInLastEnabledByName || 'Ainda não ativado'}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                {formatAuditDateTime(branchSettings?.publicCheckInLastEnabledAt)}
                                                            </Text>
                                                        </Stack>
                                                    </Paper>

                                                    <Paper p="md" withBorder radius="md" bg={isDark ? 'rgba(255,255,255,0.02)' : 'var(--mantine-color-gray-0)'}>
                                                        <Stack gap={4}>
                                                            <Text size="xs" c="dimmed">Último desligamento</Text>
                                                            <Text fw={600} size="sm">
                                                                {branchSettings?.publicCheckInLastDisabledByName || 'Ainda não desligado'}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                {formatAuditDateTime(branchSettings?.publicCheckInLastDisabledAt)}
                                                            </Text>
                                                        </Stack>
                                                    </Paper>
                                                </SimpleGrid>

                                                <Box>
                                                    <Group justify="space-between" align="center" mb={8}>
                                                        <Text fw={600} size="sm">
                                                            Auditoria recente do check-in
                                                        </Text>
                                                        {publicCheckInAuditTrail.length > 5 && (
                                                            <Button
                                                                variant="subtle"
                                                                size="compact-sm"
                                                                onClick={() => setPublicCheckInAuditModalOpen(true)}
                                                            >
                                                                Ver mais
                                                            </Button>
                                                        )}
                                                    </Group>
                                                    <Stack gap="xs">
                                                        {recentPublicCheckInAuditTrail.length > 0 ? (
                                                            recentPublicCheckInAuditTrail.map((entry) => (
                                                                <Group key={entry.id} justify="space-between" wrap="nowrap">
                                                                    <Group gap="xs" wrap="nowrap">
                                                                        <Badge color={entry.action === 'ENABLED' ? 'green' : 'red'} variant="light">
                                                                            {entry.action === 'ENABLED' ? 'Ligado' : 'Desligado'}
                                                                        </Badge>
                                                                        <Text size="sm">
                                                                            {entry.performedByName || 'Usuário não identificado'}
                                                                        </Text>
                                                                    </Group>
                                                                    <Text size="xs" c="dimmed">
                                                                        {formatAuditDateTime(entry.createdAt)}
                                                                    </Text>
                                                                </Group>
                                                            ))
                                                        ) : (
                                                            <Text size="sm" c="dimmed">
                                                                Ainda não há registros de ativação ou desligamento para esta filial.
                                                            </Text>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </Stack>
                                        </Paper>

                                        <Modal
                                            opened={publicCheckInAuditModalOpen}
                                            onClose={() => setPublicCheckInAuditModalOpen(false)}
                                            title="Histórico completo do check-in"
                                            centered
                                            size="lg"
                                        >
                                            <Stack gap="sm" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
                                                {publicCheckInAuditTrail.length > 0 ? (
                                                    publicCheckInAuditTrail.map((entry) => (
                                                        <Paper
                                                            key={entry.id}
                                                            p="sm"
                                                            withBorder
                                                            radius="md"
                                                            bg={isDark ? 'rgba(255,255,255,0.02)' : 'var(--mantine-color-gray-0)'}
                                                        >
                                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                                <Group gap="xs" wrap="nowrap">
                                                                    <Badge color={entry.action === 'ENABLED' ? 'green' : 'red'} variant="light">
                                                                        {entry.action === 'ENABLED' ? 'Ligado' : 'Desligado'}
                                                                    </Badge>
                                                                    <Text size="sm">
                                                                        {entry.performedByName || 'Usuário não identificado'}
                                                                    </Text>
                                                                </Group>
                                                                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                                                    {formatAuditDateTime(entry.createdAt)}
                                                                </Text>
                                                            </Group>
                                                        </Paper>
                                                    ))
                                                ) : (
                                                    <Text size="sm" c="dimmed">
                                                        Ainda não há registros de ativação ou desligamento para esta filial.
                                                    </Text>
                                                )}
                                            </Stack>
                                        </Modal>

                                        <Paper
                                            p="lg"
                                            radius="md"
                                            withBorder
                                            style={{
                                                borderColor: isDark ? 'var(--mantine-color-default-border)' : undefined,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : undefined,
                                            }}
                                        >
                                            <Group mb="md" gap="xs">
                                                <MessageCircle size={20} />
                                                <Text fw={600} size="md">
                                                    Configuração WhatsApp
                                                </Text>
                                            </Group>
                                            <WhatsAppCredentials scope="BRANCH" branchId={selectedBranchForSettings} />
                                        </Paper>

                                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                                            💡 Dica: Por padrão, a filial herda as credenciais da empresa. Ative a sobrescrita apenas quando necessário.
                                        </Text>
                                    </Stack>
                                )}
                            </>
                        )}

                        {!selectedBranchForSettings && (
                            <Box style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <Text size="sm" c="dimmed">
                                    Selecione uma filial para visualizar e configurar suas opções específicas.
                                </Text>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            <Modal
              opened={deleteConfirmOpen}
              onClose={closeDeleteConfirm}
              title={deleteConfirmTitle}
              centered
            >
              <Stack>
                <Text size="sm" c="dimmed">{deleteConfirmMessage}</Text>
                <Group justify="flex-end" mt="sm">
                  <Button variant="default" onClick={closeDeleteConfirm} disabled={deleteConfirmLoading}>Cancelar</Button>
                  <Button color="red" onClick={confirmDelete} loading={deleteConfirmLoading}>Excluir</Button>
                </Group>
              </Stack>
            </Modal>
        </Grid.Col>
      </Grid>
    </PageContainer>
  );
}
