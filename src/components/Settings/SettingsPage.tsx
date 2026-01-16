import { useState, useEffect } from 'react';
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
  MultiSelect,
  Grid,
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
  UserPlus
} from 'lucide-react';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';

// Services
import companyService from '../../services/companyService';
import branchService from '../../services/branchService';
import sectorService from '../../services/sectorService';
import userService from '../../services/userService';
import accessService from '../../services/accessService';
import { FloatingInput } from '../common/FloatingInput';

const PageContainer = ({ children }: { children: React.ReactNode }) => (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Box p="xl" maw={1400} mx="auto" w="100%" style={{ flex: 1 }}>
        <Stack gap="lg">{children}</Stack>
      </Box>
    </Box>
  );

const SectionTitle = ({ title, desc }: { title: string; desc?: string }) => (
    <Box mb="md">
        <Title order={2} size="h3" fw={600} c={DARK_BLUE}>{title}</Title>
        {desc && <Text c="dimmed" size="sm">{desc}</Text>}
    </Box>
);

export function SettingsPage() {
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [activeTab, setActiveTab] = useState<string | null>('company');

  // --- States ---
  
  // Company
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({ cnpj: '', legalName: '', tradeName: '', address: '', phone: '' });
  const [savingCompany, setSavingCompany] = useState(false);

  // Branches
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({ socialName: '', tradeName: '', address: '', phone: '' });
  const [savingBranch, setSavingBranch] = useState(false);

  // Sectors
  const [sectors, setSectors] = useState<any[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [selectedBranchForSectors, setSelectedBranchForSectors] = useState<string | null>(null);
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any | null>(null);
  const [sectorForm, setSectorForm] = useState({ name: '', description: '', branchId: '' });
  const [savingSector, setSavingSector] = useState(false);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedSectorForUsers, setSelectedSectorForUsers] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({ sectorId: '', accessIds: [] as string[], name: '', birthDate: '', email: '', password: '', phone: '', address: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [accessesList, setAccessesList] = useState<any[]>([]);

  // Accesses
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<any | null>(null);
  const [accessForm, setAccessForm] = useState({ description: '' });
  const [savingAccess, setSavingAccess] = useState(false);

  // --- Effects ---

  useEffect(() => {
    fetchCompanies();
    fetchAccesses();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      const comp = companies.find((c) => c.id === selectedCompanyId);
      if (comp) {
        setCompanyForm({ 
          cnpj: comp.cnpj || '', 
          legalName: comp.legalName || '', 
          tradeName: comp.tradeName || '', 
          address: comp.address || '', 
          phone: comp.phone || '' 
        });
      }
      fetchBranches();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchForSectors) {
      setSelectedBranchForSectors(branches[0].id);
    } else if (branches.length === 0) {
      setSelectedBranchForSectors(null);
    }
  }, [branches]);

  useEffect(() => {
    if (selectedBranchForSectors) {
      fetchSectors();
    } else {
      setSectors([]);
    }
  }, [selectedBranchForSectors]);

  useEffect(() => {
    if (sectors.length > 0 && !selectedSectorForUsers) {
      setSelectedSectorForUsers(sectors[0].id);
    } else if (sectors.length === 0) {
      setSelectedSectorForUsers(null);
    }
  }, [sectors]);

  useEffect(() => {
    if (selectedBranchForSectors || selectedSectorForUsers) {
      fetchUsers();
    }
  }, [selectedBranchForSectors, selectedSectorForUsers]);

  // --- Handlers ---

  // Company
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await companyService.listCompanies();
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar empresas', color: 'red' });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!selectedCompanyId) return;
    setSavingCompany(true);
    try {
      await companyService.updateCompany(selectedCompanyId, companyForm);
      notifications.show({ title: 'Sucesso', message: 'Empresa atualizada', color: 'green' });
      fetchCompanies();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao atualizar empresa', color: 'red' });
    } finally {
      setSavingCompany(false);
    }
  };

  // Branches
  const fetchBranches = async () => {
    if (!selectedCompanyId) {
        setBranches([]);
        return;
    }
    setLoadingBranches(true);
    try {
      const data = await branchService.listBranches();
      // Filter by selected company
      const filtered = (data || []).filter((b: any) => b.companyId === selectedCompanyId);
      setBranches(filtered);
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar filiais', color: 'red' });
    } finally {
      setLoadingBranches(false);
    }
  };

  const openBranchModalForCreate = () => {
    setEditingBranch(null);
    setBranchForm({ socialName: '', tradeName: '', address: '', phone: '' });
    setBranchModalOpen(true);
  };

  const openBranchModalForEdit = (branch: any) => {
    setEditingBranch(branch);
    setBranchForm({ socialName: branch.socialName || '', tradeName: branch.tradeName || '', address: branch.address || '', phone: branch.phone || '' });
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!selectedCompanyId) return;
    setSavingBranch(true);
    try {
      if (editingBranch) {
        await branchService.updateBranch(editingBranch.id, branchForm);
        notifications.show({ title: 'Sucesso', message: 'Filial atualizada', color: 'green' });
      } else {
        await branchService.createBranch({ ...branchForm, companyId: selectedCompanyId });
        notifications.show({ title: 'Sucesso', message: 'Filial criada', color: 'green' });
      }
      setBranchModalOpen(false);
      fetchBranches();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar filial', color: 'red' });
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!window.confirm('Excluir filial?')) return;
    try {
      await branchService.deleteBranch(id);
      notifications.show({ title: 'Sucesso', message: 'Filial excluída', color: 'green' });
      fetchBranches();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir filial', color: 'red' });
    }
  };

  // Sectors
  const fetchSectors = async () => {
    if (!selectedBranchForSectors) {
        setSectors([]);
        return;
    }
    setLoadingSectors(true);
    try {
      const data = await sectorService.listSectors();
      const filtered = (data || []).filter((s: any) => s.branchId === selectedBranchForSectors);
      setSectors(filtered);
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar setores', color: 'red' });
    } finally {
      setLoadingSectors(false);
    }
  };

  const openSectorModalForCreate = () => {
    setEditingSector(null);
    setSectorForm({ name: '', description: '', branchId: selectedBranchForSectors || '' });
    setSectorModalOpen(true);
  };

  const openSectorModalForEdit = (sector: any) => {
    setEditingSector(sector);
    setSectorForm({ name: sector.name || '', description: sector.description || '', branchId: sector.branchId || '' });
    setSectorModalOpen(true);
  };

  const handleSaveSector = async () => {
    if (!selectedBranchForSectors) return;
    setSavingSector(true);
    try {
      if (editingSector) {
        await sectorService.updateSector(editingSector.id, sectorForm);
        notifications.show({ title: 'Sucesso', message: 'Setor atualizado', color: 'green' });
      } else {
        await sectorService.createSector({ ...sectorForm, branchId: selectedBranchForSectors });
        notifications.show({ title: 'Sucesso', message: 'Setor criado', color: 'green' });
      }
      setSectorModalOpen(false);
      fetchSectors();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar setor', color: 'red' });
    } finally {
      setSavingSector(false);
    }
  };

  const handleDeleteSector = async (id: string) => {
    if (!window.confirm('Excluir setor?')) return;
    try {
      await sectorService.deleteSector(id);
      notifications.show({ title: 'Sucesso', message: 'Setor excluído', color: 'green' });
      fetchSectors();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir setor', color: 'red' });
    }
  };

  // Users
  const fetchAccesses = async () => {
    try {
      const data = await accessService.listAccesses();
      setAccessesList(data || []);
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar acessos', color: 'red' });
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await userService.listUsers();
      let filtered = data || [];
      if (selectedSectorForUsers) {
        filtered = filtered.filter((u: any) => u.sector?.id === selectedSectorForUsers);
      } else if (selectedBranchForSectors) {
        filtered = filtered.filter((u: any) => u.sector?.branchId === selectedBranchForSectors);
      } else if (selectedCompanyId) {
        filtered = filtered.filter((u: any) => u.sector?.branch?.companyId === selectedCompanyId);
      }
      setUsers(filtered);
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar usuários', color: 'red' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const openUserModalForCreate = () => {
    setEditingUser(null);
    setUserForm({ sectorId: selectedSectorForUsers || '', accessIds: [], name: '', birthDate: '', email: '', password: '', phone: '', address: '' });
    setUserModalOpen(true);
  };

  const openUserModalForEdit = (user: any) => {
    setEditingUser(user);
    setUserForm({ 
        sectorId: user.sector?.id || '', 
        accessIds: user.accesses ? user.accesses.map((a: any) => a.id) : [], 
        name: user.name || '', 
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : '', 
        email: user.email || '', 
        password: '', 
        phone: user.phone || '', 
        address: user.address || '' 
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.sectorId) {
      notifications.show({ title: 'Erro', message: 'Selecione um setor', color: 'red' });
      return;
    }
    setSavingUser(true);
    try {
      const payload: any = { ...userForm };
        if (!payload.password) delete payload.password;

      if (editingUser) {
        await userService.updateUser(editingUser.id, payload);
        notifications.show({ title: 'Sucesso', message: 'Usuário atualizado', color: 'green' });
      } else {
        await userService.createUser(payload);
        notifications.show({ title: 'Sucesso', message: 'Usuário criado', color: 'green' });
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar usuário', color: 'red' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Excluir usuário?')) return;
    try {
      await userService.deleteUser(id);
      notifications.show({ title: 'Sucesso', message: 'Usuário excluído', color: 'green' });
      fetchUsers();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir usuário', color: 'red' });
    }
  };

  // Accesses
  const openAccessModalForCreate = () => {
    setEditingAccess(null);
    setAccessForm({ description: '' });
    setAccessModalOpen(true);
  };

  const openAccessModalForEdit = (access: any) => {
    setEditingAccess(access);
    setAccessForm({ description: access.description || '' });
    setAccessModalOpen(true);
  };

  const handleSaveAccess = async () => {
    if (!accessForm.description) return;
    setSavingAccess(true);
    try {
      if (editingAccess) {
        await accessService.updateAccess(editingAccess.id, accessForm);
        notifications.show({ title: 'Sucesso', message: 'Acesso atualizado', color: 'green' });
      } else {
        await accessService.createAccess(accessForm);
        notifications.show({ title: 'Sucesso', message: 'Acesso criado', color: 'green' });
      }
      setAccessModalOpen(false);
      fetchAccesses();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar acesso', color: 'red' });
    } finally {
      setSavingAccess(false);
    }
  };

  const handleDeleteAccess = async (id: string) => {
    if (!window.confirm('Excluir acesso?')) return;
    try {
      await accessService.deleteAccess(id);
      notifications.show({ title: 'Sucesso', message: 'Acesso excluído', color: 'green' });
      fetchAccesses();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir acesso', color: 'red' });
    }
  };

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
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'light' : 'subtle'}
              color={isActive ? 'darkBlue' : 'gray'}
              leftSection={<item.icon size={18} />}
              justify="flex-start"
              fullWidth
              onClick={() => setActiveTab(item.id)}
              styles={{
                root: {
                  color: isActive ? DARK_BLUE : undefined,
                  fontWeight: isActive ? 600 : 400,
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
        <Title order={1} fw={600} style={{ fontSize: '1.8rem' }}>Configurações</Title>
        <Text c="dimmed">{companies.find(c => c.id === selectedCompanyId)?.legalName}</Text>
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
                        
                        {loadingCompanies ? <Loader /> : (
                            <Stack gap="md" maw={600}>
                                <Select
                                    label="Selecionar empresa"
                                    data={companies.map((c) => ({ value: c.id, label: `${c.legalName} (${c.cnpj})` }))}
                                    value={selectedCompanyId || undefined}
                                    onChange={(v) => v && setSelectedCompanyId(v)}
                                    allowDeselect={false}
                                />
                                <Grid>
                                    <Grid.Col span={6}>
                                        <FloatingInput label="CNPJ" value={companyForm.cnpj} onChange={(e: any) => setCompanyForm({ ...companyForm, cnpj: e.currentTarget.value })} />
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <FloatingInput label="Telefone" value={companyForm.phone} onChange={(e: any) => setCompanyForm({ ...companyForm, phone: e.currentTarget.value })} />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <FloatingInput label="Razão Social" value={companyForm.legalName} onChange={(e: any) => setCompanyForm({ ...companyForm, legalName: e.currentTarget.value })} />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <FloatingInput label="Nome Fantasia" value={companyForm.tradeName} onChange={(e: any) => setCompanyForm({ ...companyForm, tradeName: e.currentTarget.value })} />
                                    </Grid.Col>
                                    <Grid.Col span={12}>
                                        <FloatingInput label="Endereço" value={companyForm.address} onChange={(e: any) => setCompanyForm({ ...companyForm, address: e.currentTarget.value })} />
                                    </Grid.Col>
                                </Grid>
                                <Group justify="flex-end" mt="md">
                                    <Button leftSection={<Save size={16} />} onClick={handleSaveCompany} loading={savingCompany} bg={DARK_BLUE}>Salvar Alterações</Button>
                                </Group>
                            </Stack>
                        )}
                    </Box>
                )}

                {activeTab === 'branches' && (
                    <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Filiais" desc="Gerencie as unidades da empresa." />
                            <Button leftSection={<Plus size={16} />} onClick={openBranchModalForCreate} bg={DARK_BLUE} disabled={!selectedCompanyId}>Nova Filial</Button>
                        </Group>

                        {loadingBranches ? <Loader /> : (
                            <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                                <Table horizontalSpacing="md" verticalSpacing="md">
                                    <Table.Thead>
                                        <Table.Tr style={{ borderBottom: 'none' }}>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Nome Fantasia</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Razão Social</Table.Th>
                                            <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Telefone</Table.Th>
                                            <Table.Th style={{ width: '100px' }}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {branches.map(branch => (
                                            <Table.Tr key={branch.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <Table.Td><Text size="sm" fw={500}>{branch.tradeName}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{branch.socialName}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{branch.phone}</Text></Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => openBranchModalForEdit(branch)}><Edit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteBranch(branch.id)}><Trash size={16} /></ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {branches.length === 0 && <Table.Tr><Table.Td colSpan={4} align="center">Nenhuma filial cadastrada</Table.Td></Table.Tr>}
                                    </Table.Tbody>
                                </Table>
                            </Box>
                        )}
                        <Modal opened={branchModalOpen} onClose={() => setBranchModalOpen(false)} title={editingBranch ? 'Editar Filial' : 'Nova Filial'} centered>
                             <Stack pt="lg">
                                <FloatingInput label="Nome Fantasia" value={branchForm.tradeName} onChange={(e: any) => setBranchForm({ ...branchForm, tradeName: e.currentTarget.value })} />
                                <FloatingInput label="Razão Social" value={branchForm.socialName} onChange={(e: any) => setBranchForm({ ...branchForm, socialName: e.currentTarget.value })} />
                                <FloatingInput label="Telefone" value={branchForm.phone} onChange={(e: any) => setBranchForm({ ...branchForm, phone: e.currentTarget.value })} />
                                <FloatingInput label="Endereço" value={branchForm.address} onChange={(e: any) => setBranchForm({ ...branchForm, address: e.currentTarget.value })} />
                                <Button fullWidth mt="md" onClick={handleSaveBranch} loading={savingBranch} bg={DARK_BLUE}>{editingBranch ? 'Salvar' : 'Criar'}</Button>
                            </Stack>
                        </Modal>
                    </Box>
                )}

                {activeTab === 'sectors' && (
                     <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Setores" desc="Organize os setores por filial." />
                            <Button leftSection={<Plus size={16} />} onClick={openSectorModalForCreate} bg={DARK_BLUE} disabled={!selectedBranchForSectors}>Novo Setor</Button>
                        </Group>

                        <Select 
                            label="Filial"
                            placeholder="Selecione uma filial" 
                            data={branches.map(b => ({ value: b.id, label: b.tradeName }))}
                            value={selectedBranchForSectors}
                            onChange={setSelectedBranchForSectors}
                            mb="lg"
                            maw={400}
                        />

                        {loadingSectors ? <Loader /> : (
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
                                        {sectors.map(sector => (
                                            <Table.Tr key={sector.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                                <Table.Td><Text size="sm" fw={500}>{sector.name}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{sector.description}</Text></Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => openSectorModalForEdit(sector)}><Edit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteSector(sector.id)}><Trash size={16} /></ActionIcon>
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
                                <FloatingInput label="Nome" value={sectorForm.name} onChange={(e: any) => setSectorForm({ ...sectorForm, name: e.currentTarget.value })} />
                                <FloatingInput label="Descrição" value={sectorForm.description} onChange={(e: any) => setSectorForm({ ...sectorForm, description: e.currentTarget.value })} />
                                <Button fullWidth mt="md" onClick={handleSaveSector} loading={savingSector} bg={DARK_BLUE}>{editingSector ? 'Salvar' : 'Criar'}</Button>
                            </Stack>
                        </Modal>
                    </Box>
                )}

                {activeTab === 'users' && (
                    <Box>
                        <Group justify="space-between" mb="md">
                            <SectionTitle title="Usuários" desc="Gerencie acesso e permissões." />
                            <Button leftSection={<UserPlus size={16} />} onClick={openUserModalForCreate} bg={DARK_BLUE} disabled={!selectedSectorForUsers}>Novo Usuário</Button>
                        </Group>

                         <Group mb="lg">
                            <Select 
                                label="Filial"
                                placeholder="Selecione..." 
                                data={branches.map(b => ({ value: b.id, label: b.tradeName }))}
                                value={selectedBranchForSectors}
                                onChange={setSelectedBranchForSectors}
                                style={{ flex: 1 }}
                            />
                            <Select 
                                label="Setor"
                                placeholder="Selecione..." 
                                data={sectors.map(s => ({ value: s.id, label: s.name }))}
                                value={selectedSectorForUsers}
                                onChange={setSelectedSectorForUsers}
                                style={{ flex: 1 }}
                                disabled={!selectedBranchForSectors}
                            />
                        </Group>

                        {loadingUsers ? <Loader /> : (
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
                                        {users.map(user => (
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
                                                            <Text size="xs" c="dimmed">{user.accesses?.map((a:any) => a.description).join(', ')}</Text>
                                                        </Box>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td><Text size="sm">{user.email}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{user.phone}</Text></Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => openUserModalForEdit(user)}><Edit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteUser(user.id)}><Trash size={16} /></ActionIcon>
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
                                        label="Setor" 
                                        data={sectors.map(s => ({ value: s.id, label: s.name }))}
                                        value={userForm.sectorId}
                                        onChange={(v) => setUserForm({...userForm, sectorId: v || ''})}
                                        mb="xs"
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <MultiSelect 
                                        label="Acessos" 
                                        data={accessesList.map(a => ({ value: a.id, label: a.description }))}
                                        value={userForm.accessIds}
                                        onChange={(v) => setUserForm({...userForm, accessIds: v})}
                                        searchable
                                        mb="md"
                                        placeholder="Selecione os acessos"
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput label="Nome" value={userForm.name} onChange={(e: any) => setUserForm({...userForm, name: e.currentTarget.value})} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput label="Email" value={userForm.email} onChange={(e: any) => setUserForm({...userForm, email: e.currentTarget.value})} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput 
                                        label={editingUser ? "Senha (Vazio para manter)" : "Senha"} 
                                        type="password" 
                                        value={userForm.password} 
                                        onChange={(e: any) => setUserForm({...userForm, password: e.currentTarget.value})} 
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput label="Telefone" value={userForm.phone} onChange={(e: any) => setUserForm({...userForm, phone: e.currentTarget.value})} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <FloatingInput type="date" label="Data de Nascimento" value={userForm.birthDate} onChange={(e: any) => setUserForm({...userForm, birthDate: e.currentTarget.value})} />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <FloatingInput label="Endereço" value={userForm.address} onChange={(e: any) => setUserForm({...userForm, address: e.currentTarget.value})} />
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

                        <Box style={{ overflowX: 'auto', border: '1px solid #e9ecef', borderRadius: 6 }}>
                            <Table horizontalSpacing="md" verticalSpacing="md">
                                <Table.Thead>
                                    <Table.Tr style={{ borderBottom: 'none' }}>
                                        <Table.Th style={{ color: '#868e96', fontSize: '0.8rem', fontWeight: 500 }}>Descrição</Table.Th>
                                        <Table.Th style={{ width: '100px' }}></Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {accessesList.map(access => (
                                        <Table.Tr key={access.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                            <Table.Td><Text size="sm" fw={500}>{access.description}</Text></Table.Td>
                                            <Table.Td>
                                                <Group gap={4} justify="flex-end">
                                                    <ActionIcon variant="subtle" color="blue" onClick={() => openAccessModalForEdit(access)}><Edit size={16} /></ActionIcon>
                                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteAccess(access.id)}><Trash size={16} /></ActionIcon>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                    {accessesList.length === 0 && <Table.Tr><Table.Td colSpan={2} align="center">Nenhum acesso cadastrado</Table.Td></Table.Tr>}
                                </Table.Tbody>
                            </Table>
                        </Box>
                        <Modal opened={accessModalOpen} onClose={() => setAccessModalOpen(false)} title={editingAccess ? 'Editar Acesso' : 'Novo Acesso'} centered>
                             <Stack pt="lg">
                                <FloatingInput label="Descrição" value={accessForm.description} onChange={(e: any) => setAccessForm({ ...accessForm, description: e.currentTarget.value })} />
                                <Button fullWidth mt="md" onClick={handleSaveAccess} loading={savingAccess} bg={DARK_BLUE}>{editingAccess ? 'Salvar' : 'Criar'}</Button>
                            </Stack>
                        </Modal>
                    </Box>
                )}
            </Paper>
        </Grid.Col>
      </Grid>
    </PageContainer>
  );
}
