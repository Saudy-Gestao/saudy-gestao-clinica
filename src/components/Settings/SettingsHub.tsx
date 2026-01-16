import { useEffect, useState } from 'react';
import { Drawer, Tabs, Box, Button, TextInput, Group, Select, Loader, Modal, Table, ScrollArea, ActionIcon, Textarea, MultiSelect } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import companyService from '../../services/companyService.ts';
import branchService from '../../services/branchService';
import sectorService from '../../services/sectorService';
import userService from '../../services/userService';
import accessService from '../../services/accessService';
import { Edit, Trash, Plus, UserPlus } from 'lucide-react';

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function SettingsHub({ opened, onClose }: Props) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState({ cnpj: '', legalName: '', tradeName: '', address: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      fetchCompanies();
    }
  }, [opened]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await companyService.listCompanies();
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompanyId(data[0].id);
        setForm({
          cnpj: data[0].cnpj || '',
          legalName: data[0].legalName || '',
          tradeName: data[0].tradeName || '',
          address: data[0].address || '',
          phone: data[0].phone || '',
        });
      }
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar empresas', color: 'red' });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    const comp = companies.find((c) => c.id === id);
    if (comp) {
      setForm({ cnpj: comp.cnpj || '', legalName: comp.legalName || '', tradeName: comp.tradeName || '', address: comp.address || '', phone: comp.phone || '' });
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyId) {
      notifications.show({ title: 'Erro', message: 'Nenhuma empresa selecionada', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      await companyService.updateCompany(selectedCompanyId, form);
      notifications.show({ title: 'Sucesso', message: 'Empresa atualizada com sucesso', color: 'green' });
      await fetchCompanies();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao atualizar empresa', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  // Branches (filiais) state and handlers
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({ socialName: '', tradeName: '', address: '', phone: '' });
  const [savingBranch, setSavingBranch] = useState(false);

  const fetchBranches = async () => {
    if (!selectedCompanyId) {
      setBranches([]);
      return;
    }
    setLoadingBranches(true);
    try {
      const data = await branchService.listBranches();
      const filtered = (data || []).filter((b: any) => b.companyId === selectedCompanyId);
      setBranches(filtered);
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao carregar filiais', color: 'red' });
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (opened && selectedCompanyId) {
      fetchBranches();
    }
  }, [opened, selectedCompanyId]);

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
    if (!selectedCompanyId) {
      notifications.show({ title: 'Erro', message: 'Selecione uma empresa antes de criar filial', color: 'red' });
      return;
    }

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
      await fetchBranches();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar filial', color: 'red' });
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    const confirmed = window.confirm('Deseja realmente excluir esta filial?');
    if (!confirmed) return;
    try {
      await branchService.deleteBranch(id);
      notifications.show({ title: 'Sucesso', message: 'Filial excluída', color: 'green' });
      await fetchBranches();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir filial', color: 'red' });
    }
  };

  // When branches list changes, ensure a selected branch for sectors
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchForSectors) {
      setSelectedBranchForSectors(branches[0].id);
    } else if (branches.length === 0) {
      setSelectedBranchForSectors(null);
    }
  }, [branches]);

  // Sectors (setores) state and handlers
  const [sectors, setSectors] = useState<any[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [selectedBranchForSectors, setSelectedBranchForSectors] = useState<string | null>(null);
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any | null>(null);
  const [sectorForm, setSectorForm] = useState({ name: '', description: '', branchId: '' });
  const [savingSector, setSavingSector] = useState(false);

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

  useEffect(() => {
    if (opened && selectedBranchForSectors) {
      fetchSectors();
    }
  }, [opened, selectedBranchForSectors]);

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
    if (!selectedBranchForSectors) {
      notifications.show({ title: 'Erro', message: 'Selecione uma filial antes de criar setor', color: 'red' });
      return;
    }
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
      await fetchSectors();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar setor', color: 'red' });
    } finally {
      setSavingSector(false);
    }
  };

  const handleDeleteSector = async (id: string) => {
    const confirmed = window.confirm('Deseja realmente excluir este setor?');
    if (!confirmed) return;
    try {
      await sectorService.deleteSector(id);
      notifications.show({ title: 'Sucesso', message: 'Setor excluído', color: 'green' });
      await fetchSectors();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir setor', color: 'red' });
    }
  };

  // Keep selected sector for users in sync with sectors
  useEffect(() => {
    if (sectors.length > 0 && !selectedSectorForUsers) {
      setSelectedSectorForUsers(sectors[0].id);
    } else if (sectors.length === 0) {
      setSelectedSectorForUsers(null);
    }
  }, [sectors]);

  // Users (usuários) state and handlers
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({ sectorId: '', accessIds: [] as string[], name: '', birthDate: '', email: '', password: '', phone: '', address: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [accessesList, setAccessesList] = useState<any[]>([]);
  const [selectedSectorForUsers, setSelectedSectorForUsers] = useState<string | null>(null);

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

  useEffect(() => {
    if (opened) {
      fetchUsers();
      fetchAccesses();
    }
  }, [opened]);

  useEffect(() => {
    if (opened && (selectedBranchForSectors || selectedSectorForUsers)) {
      fetchUsers();
    }
  }, [selectedBranchForSectors, selectedSectorForUsers]);

  const openUserModalForCreate = () => {
    setEditingUser(null);
    setUserForm({ sectorId: selectedSectorForUsers || '', accessIds: [], name: '', birthDate: '', email: '', password: '', phone: '', address: '' });
    setUserModalOpen(true);
  };

  const openUserModalForEdit = (user: any) => {
    setEditingUser(user);
    setUserForm({ sectorId: user.sector?.id || '', accessIds: user.accesses ? user.accesses.map((a: any) => a.id) : [], name: user.name || '', birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : '', email: user.email || '', password: '', phone: user.phone || '', address: user.address || '' });
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.sectorId) {
      notifications.show({ title: 'Erro', message: 'Selecione um setor', color: 'red' });
      return;
    }
    if (!userForm.name || !userForm.email) {
      notifications.show({ title: 'Erro', message: 'Nome e email são obrigatórios', color: 'red' });
      return;
    }
    if (!editingUser && !userForm.password) {
      notifications.show({ title: 'Erro', message: 'Senha é obrigatória para novo usuário', color: 'red' });
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
      await fetchUsers();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar usuário', color: 'red' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const confirmed = window.confirm('Deseja realmente excluir este usuário?');
    if (!confirmed) return;
    try {
      await userService.deleteUser(id);
      notifications.show({ title: 'Sucesso', message: 'Usuário excluído', color: 'green' });
      await fetchUsers();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir usuário', color: 'red' });
    }
  };

  // Accesses (acessos) state and handlers
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<any | null>(null);
  const [accessForm, setAccessForm] = useState({ description: '' });
  const [savingAccess, setSavingAccess] = useState(false);

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
    if (!accessForm.description) {
      notifications.show({ title: 'Erro', message: 'Descrição é obrigatória', color: 'red' });
      return;
    }
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
      await fetchAccesses();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar acesso', color: 'red' });
    } finally {
      setSavingAccess(false);
    }
  };

  const handleDeleteAccess = async (id: string) => {
    const confirmed = window.confirm('Deseja realmente excluir este acesso?');
    if (!confirmed) return;
    try {
      await accessService.deleteAccess(id);
      notifications.show({ title: 'Sucesso', message: 'Acesso excluído', color: 'green' });
      await fetchAccesses();
    } catch (error: any) {
      notifications.show({ title: 'Erro', message: error.response?.data?.error || 'Erro ao excluir acesso', color: 'red' });
    }
  };

  return (
    <Drawer opened={opened} onClose={onClose} title="Configurações" size="lg">
      <Tabs defaultValue="company">
        <Tabs.List>
          <Tabs.Tab value="company">Empresa</Tabs.Tab>
          <Tabs.Tab value="branches">Filiais</Tabs.Tab>
          <Tabs.Tab value="sectors">Setores</Tabs.Tab>
          <Tabs.Tab value="users">Usuários</Tabs.Tab>
          <Tabs.Tab value="accesses">Acessos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="company" pt="md">
          {loadingCompanies ? (
            <Loader />
          ) : (
            <Box>
              <Select
                label="Selecionar empresa"
                data={companies.map((c) => ({ value: c.id, label: `${c.legalName} (${c.cnpj})` }))}
                value={selectedCompanyId || undefined}
                onChange={(v) => v && handleSelectCompany(v)}
                placeholder={companies.length > 0 ? undefined : 'Nenhuma empresa encontrada'}
              />

              <Box mt="md">
                <TextInput label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.currentTarget.value })} mb="sm" />
                <TextInput label="Razão social" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.currentTarget.value })} mb="sm" />
                <TextInput label="Nome fantasia" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.currentTarget.value })} mb="sm" />
                <TextInput label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} mb="sm" />
                <TextInput label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} mb="sm" />

                <Group mt="md" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                  <Button onClick={handleSave} loading={saving}>Salvar</Button>
                </Group>
              </Box>
            </Box>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="branches" pt="md">
          <Box mb="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <TextInput label="Filtrar por empresa" value={selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.legalName || '' : ''} readOnly />
            </Box>
            <Group>
              <Button leftIcon={<Plus />} onClick={() => openBranchModalForCreate()} disabled={!selectedCompanyId}>Adicionar Filial</Button>
            </Group>
          </Box>

          {selectedCompanyId ? (
            <Box>
              {loadingBranches ? (
                <Loader />
              ) : (
                <ScrollArea style={{ maxHeight: 300 }}>
                  <Table verticalSpacing="sm">
                    <thead>
                      <tr>
                        <th>Razão social</th>
                        <th>Nome fantasia</th>
                        <th>Endereço</th>
                        <th>Telefone</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b) => (
                        <tr key={b.id}>
                          <td>{b.socialName}</td>
                          <td>{b.tradeName}</td>
                          <td>{b.address}</td>
                          <td>{b.phone}</td>
                          <td>
                            <Group>
                              <ActionIcon variant="outline" color="blue" onClick={() => openBranchModalForEdit(b)}>
                                <Edit size={16} />
                              </ActionIcon>
                              <ActionIcon variant="outline" color="red" onClick={() => handleDeleteBranch(b.id)}>
                                <Trash size={16} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                      {branches.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center' }}>Nenhuma filial encontrada</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </ScrollArea>
              )}

              <Modal opened={branchModalOpen} onClose={() => setBranchModalOpen(false)} title={editingBranch ? 'Editar Filial' : 'Adicionar Filial'} size="lg">
                <Box>
                  <TextInput label="Razão social" value={branchForm.socialName} onChange={(e) => setBranchForm({ ...branchForm, socialName: e.currentTarget.value })} mb="sm" />
                  <TextInput label="Nome fantasia" value={branchForm.tradeName} onChange={(e) => setBranchForm({ ...branchForm, tradeName: e.currentTarget.value })} mb="sm" />
                  <Textarea label="Endereço" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.currentTarget.value })} mb="sm" />
                  <TextInput label="Telefone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.currentTarget.value })} mb="sm" />

                  <Group mt="md" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                    <Button variant="outline" onClick={() => setBranchModalOpen(false)}>Cancelar</Button>
                    <Button onClick={() => handleSaveBranch()} loading={savingBranch}>{editingBranch ? 'Salvar' : 'Criar'}</Button>
                  </Group>
                </Box>
              </Modal>
            </Box>
          ) : (
            <Box>Selecione uma empresa para gerenciar filiais</Box>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="sectors" pt="md">
          <Box mb="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box style={{ minWidth: 240 }}>
              <Select
                label="Selecionar filial"
                data={branches.map((b) => ({ value: b.id, label: `${b.socialName} (${b.tradeName})` }))}
                value={selectedBranchForSectors || undefined}
                onChange={(v) => setSelectedBranchForSectors(v || null)}
                placeholder={branches.length > 0 ? undefined : 'Nenhuma filial encontrada'}
              />
            </Box>
            <Group>
              <Button leftIcon={<Plus />} onClick={() => openSectorModalForCreate()} disabled={!selectedBranchForSectors}>Adicionar Setor</Button>
            </Group>
          </Box>

          {selectedBranchForSectors ? (
            <Box>
              {loadingSectors ? (
                <Loader />
              ) : (
                <ScrollArea style={{ maxHeight: 300 }}>
                  <Table verticalSpacing="sm">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectors.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.description}</td>
                          <td>
                            <Group>
                              <ActionIcon variant="outline" color="blue" onClick={() => openSectorModalForEdit(s)}>
                                <Edit size={16} />
                              </ActionIcon>
                              <ActionIcon variant="outline" color="red" onClick={() => handleDeleteSector(s.id)}>
                                <Trash size={16} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                      {sectors.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center' }}>Nenhum setor encontrado</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </ScrollArea>
              )}

              <Modal opened={sectorModalOpen} onClose={() => setSectorModalOpen(false)} title={editingSector ? 'Editar Setor' : 'Adicionar Setor'} size="lg">
                <Box>
                  <TextInput label="Nome" value={sectorForm.name} onChange={(e) => setSectorForm({ ...sectorForm, name: e.currentTarget.value })} mb="sm" />
                  <Textarea label="Descrição" value={sectorForm.description} onChange={(e) => setSectorForm({ ...sectorForm, description: e.currentTarget.value })} mb="sm" />

                  <Group mt="md" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                    <Button variant="outline" onClick={() => setSectorModalOpen(false)}>Cancelar</Button>
                    <Button onClick={() => handleSaveSector()} loading={savingSector}>{editingSector ? 'Salvar' : 'Criar'}</Button>
                  </Group>
                </Box>
              </Modal>
            </Box>
          ) : (
            <Box>Selecione uma filial para gerenciar setores</Box>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="users" pt="md">
          <Box mb="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box style={{ minWidth: 240 }}>
              <Select
                label="Selecionar filial"
                data={branches.map((b) => ({ value: b.id, label: `${b.socialName} (${b.tradeName})` }))}
                value={selectedBranchForSectors || undefined}
                onChange={(v) => setSelectedBranchForSectors(v || null)}
                placeholder={branches.length > 0 ? undefined : 'Nenhuma filial encontrada'}
              />
            </Box>

            <Box style={{ minWidth: 240 }}>
              <Select
                label="Selecionar setor"
                data={sectors.map((s) => ({ value: s.id, label: s.name }))}
                value={selectedSectorForUsers || undefined}
                onChange={(v) => setSelectedSectorForUsers(v || null)}
                placeholder={sectors.length > 0 ? undefined : 'Nenhum setor encontrado'}
              />
            </Box>

            <Group>
              <Button leftIcon={<UserPlus />} onClick={() => openUserModalForCreate()} disabled={!selectedSectorForUsers}>Adicionar Usuário</Button>
            </Group>
          </Box>

          {selectedBranchForSectors || selectedSectorForUsers ? (
            <Box>
              {loadingUsers ? (
                <Loader />
              ) : (
                <ScrollArea style={{ maxHeight: 300 }}>
                  <Table verticalSpacing="sm">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Setor</th>
                        <th>Acessos</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.sector?.name}</td>
                          <td>{u.accesses?.map((a: any) => a.description).join(', ')}</td>
                          <td>
                            <Group>
                              <ActionIcon variant="outline" color="blue" onClick={() => openUserModalForEdit(u)}>
                                <Edit size={16} />
                              </ActionIcon>
                              <ActionIcon variant="outline" color="red" onClick={() => handleDeleteUser(u.id)}>
                                <Trash size={16} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center' }}>Nenhum usuário encontrado</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </ScrollArea>
              )}

              <Modal opened={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Editar Usuário' : 'Adicionar Usuário'} size="lg">
                <Box>
                  <Select
                    label="Setor"
                    data={sectors.map((s) => ({ value: s.id, label: s.name }))}
                    value={userForm.sectorId || undefined}
                    onChange={(v) => setUserForm({ ...userForm, sectorId: v || '' })}
                    mb="sm"
                  />

                  <MultiSelect
                    label="Acessos"
                    data={accessesList.map((a) => ({ value: a.id, label: a.description }))}
                    value={userForm.accessIds}
                    onChange={(vals) => setUserForm({ ...userForm, accessIds: vals })}
                    mb="sm"
                  />

                  <TextInput label="Nome" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.currentTarget.value })} mb="sm" />
                  <TextInput label="Data de nascimento" type="date" value={userForm.birthDate} onChange={(e) => setUserForm({ ...userForm, birthDate: e.currentTarget.value })} mb="sm" />
                  <TextInput label="E-mail" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.currentTarget.value })} mb="sm" />
                  <TextInput label="Senha" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.currentTarget.value })} placeholder={editingUser ? 'Deixe em branco para manter a senha' : ''} mb="sm" />
                  <TextInput label="Telefone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.currentTarget.value })} mb="sm" />
                  <TextInput label="Endereço" value={userForm.address} onChange={(e) => setUserForm({ ...userForm, address: e.currentTarget.value })} mb="sm" />

                  <Group mt="md" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                    <Button variant="outline" onClick={() => setUserModalOpen(false)}>Cancelar</Button>
                    <Button onClick={() => handleSaveUser()} loading={savingUser}>{editingUser ? 'Salvar' : 'Criar'}</Button>
                  </Group>
                </Box>
              </Modal>
            </Box>
          ) : (
            <Box>Selecione uma filial ou setor para gerenciar usuários</Box>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="accesses" pt="md">
          <Box mb="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box />
            <Group>
              <Button leftIcon={<Plus />} onClick={() => openAccessModalForCreate()}>Adicionar Acesso</Button>
            </Group>
          </Box>

          <Box>
            {accessesList.length === 0 ? (
              <Box>Nenhum acesso cadastrado</Box>
            ) : (
              <ScrollArea style={{ maxHeight: 300 }}>
                <Table verticalSpacing="sm">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessesList.map((a) => (
                      <tr key={a.id}>
                        <td>{a.description}</td>
                        <td>
                          <Group>
                            <ActionIcon variant="outline" color="blue" onClick={() => openAccessModalForEdit(a)}>
                              <Edit size={16} />
                            </ActionIcon>
                            <ActionIcon variant="outline" color="red" onClick={() => handleDeleteAccess(a.id)}>
                              <Trash size={16} />
                            </ActionIcon>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
            )}

            <Modal opened={accessModalOpen} onClose={() => setAccessModalOpen(false)} title={editingAccess ? 'Editar Acesso' : 'Adicionar Acesso'} size="md">
              <Box>
                <TextInput label="Descrição" value={accessForm.description} onChange={(e) => setAccessForm({ ...accessForm, description: e.currentTarget.value })} mb="sm" />

                <Group mt="md" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                  <Button variant="outline" onClick={() => setAccessModalOpen(false)}>Cancelar</Button>
                  <Button onClick={() => handleSaveAccess()} loading={savingAccess}>{editingAccess ? 'Salvar' : 'Criar'}</Button>
                </Group>
              </Box>
            </Modal>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Drawer>
  );
}

export default SettingsHub;