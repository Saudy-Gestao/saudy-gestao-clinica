import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header/Header';
import { DARK_BLUE } from '../../themes/theme';
import companyService from '../../services/companyService';
import { useSettingsCompaniesQuery } from '../../hooks/useSettingsCompaniesQuery';
import { queryKeys } from '../../lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { validateCompanyForm } from '../../utils/validations';

type CompanyModuleType = 'padrao' | 'tea' | 'apenas-tea';

type AdminCompanyForm = {
  cnpj: string;
  legalName: string;
  tradeName: string;
  address: string;
  phone: string;
  module_type: CompanyModuleType;
  additionalBranchesAllowed: number;
};

const EMPTY_FORM: AdminCompanyForm = {
  cnpj: '',
  legalName: '',
  tradeName: '',
  address: '',
  phone: '',
  module_type: 'padrao',
  additionalBranchesAllowed: 0,
};

export function AdminClients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: companies = [], isLoading } = useSettingsCompaniesQuery();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminCompanyForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const companyOptions = useMemo(
    () => companies.map((company: any) => ({
      value: company.id,
      label: company.tradeName || company.legalName || company.cnpj,
    })),
    [companies],
  );

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    const selectedCompany = companies.find((company: any) => company.id === selectedCompanyId);
    if (!selectedCompany) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      cnpj: selectedCompany.cnpj || '',
      legalName: selectedCompany.legalName || '',
      tradeName: selectedCompany.tradeName || '',
      address: selectedCompany.address || '',
      phone: selectedCompany.phone || '',
      module_type: selectedCompany.module_type || 'padrao',
      additionalBranchesAllowed: Number(selectedCompany.additionalBranchesAllowed || 0),
    });
    setErrors({});
  }, [companies, selectedCompanyId]);

  const handleSave = async () => {
    if (!selectedCompanyId) return;

    const validation = validateCompanyForm(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      notifications.show({
        title: 'Erro de validação',
        message: 'Corrija os campos destacados antes de salvar.',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      await companyService.updateCompany(selectedCompanyId, form);
      notifications.show({
        title: 'Sucesso',
        message: 'Cliente atualizado com sucesso.',
        color: 'green',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settingsCompanies });
    } catch (error: any) {
      notifications.show({
        title: 'Erro',
        message: error?.response?.data?.error || 'Erro ao atualizar cliente.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={1200} mx="auto">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/adm-hub')}>
                Voltar para o ADM
              </Button>
              <Title order={2} fw={600}>
                Gestão de Clientes
              </Title>
              <Text c="dimmed" maw={760}>
                Edite os dados cadastrais da empresa e altere o tipo de módulo liberado para cada cliente.
              </Text>
            </Stack>
          </Group>

          <Paper p="lg" radius="lg" withBorder shadow="sm">
            <Stack gap="lg">
              <Select
                label="Cliente"
                placeholder="Selecione um cliente"
                data={companyOptions}
                value={selectedCompanyId}
                onChange={setSelectedCompanyId}
                searchable
                nothingFoundMessage="Nenhum cliente encontrado"
              />

              {isLoading ? (
                <Group justify="center" py="xl">
                  <Loader />
                </Group>
              ) : !selectedCompanyId ? (
                <Text c="dimmed">Nenhum cliente disponível para edição.</Text>
              ) : (
                <>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="CNPJ"
                      value={form.cnpj}
                      onChange={(event) => setForm((current) => ({ ...current, cnpj: event.currentTarget.value }))}
                      error={errors.cnpj}
                    />
                    <TextInput
                      label="Telefone"
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.currentTarget.value }))}
                      error={errors.phone}
                    />
                    <TextInput
                      label="Razão Social"
                      value={form.legalName}
                      onChange={(event) => setForm((current) => ({ ...current, legalName: event.currentTarget.value }))}
                      error={errors.legalName}
                    />
                    <TextInput
                      label="Nome Fantasia"
                      value={form.tradeName}
                      onChange={(event) => setForm((current) => ({ ...current, tradeName: event.currentTarget.value }))}
                      error={errors.tradeName}
                    />
                  </SimpleGrid>

                  <TextInput
                    label="Endereço"
                    value={form.address}
                    onChange={(event) => setForm((current) => ({ ...current, address: event.currentTarget.value }))}
                  />

                  <NumberInput
                    label="Quantidade de filiais adicionais"
                    description="Define quantas filiais além da matriz essa empresa pode criar."
                    min={0}
                    value={form.additionalBranchesAllowed}
                    onChange={(value) => setForm((current) => ({
                      ...current,
                      additionalBranchesAllowed: typeof value === 'number' ? value : Number(value) || 0,
                    }))}
                  />

                  <Paper p="md" radius="md" withBorder>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Building2 size={18} color={DARK_BLUE} />
                        <Text fw={600}>Tipo de módulo da empresa</Text>
                      </Group>
                      <Radio.Group
                        value={form.module_type}
                        onChange={(value) => setForm((current) => ({ ...current, module_type: value as CompanyModuleType }))}
                      >
                        <Stack gap="xs">
                          <Radio value="padrao" label="Padrão" description="Tudo do sistema, exceto a parte TEA." />
                          <Radio value="tea" label="TEA" description="Tudo do sistema, inclusive a parte TEA." />
                          <Radio value="apenas-tea" label="Apenas TEA" description="Somente TEA e dependências." />
                        </Stack>
                      </Radio.Group>
                    </Stack>
                  </Paper>

                  <Group justify="flex-end">
                    <Button leftSection={<Save size={16} />} onClick={handleSave} loading={saving} bg={DARK_BLUE}>
                      Salvar alterações
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
