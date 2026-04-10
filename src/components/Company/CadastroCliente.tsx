import { useState, type ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Stepper,
  TextInput,
  NumberInput,
  Button,
  Stack,
  Text,
  Group,
  Title,
  PasswordInput,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Radio,
} from '@mantine/core';
import { ArrowLeft, Building2, ShieldCheck, Waypoints } from 'lucide-react';
import { notifications, showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { resolveApiErrorMessage } from '../../lib/apiError';
import companyService from '../../services/companyService';
import { isValidEmail, normalizeEmail } from '../../utils/formatters';
import { Header } from '../Header/Header';

const COMPANY_PREFILL_STORAGE_KEY = 'settings:company-prefill';
const BRANCH_QUOTAS_STORAGE_KEY = 'settings:branch-create-quotas';

function saveBranchCreateQuota(companyId: string, allowedCreates: number, initialBranchCount: number) {
  const raw = localStorage.getItem(BRANCH_QUOTAS_STORAGE_KEY);
  let map: Record<string, { allowedCreates: number; initialBranchCount: number }> = {};

  if (raw) {
    try {
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  }

  map[companyId] = {
    allowedCreates,
    initialBranchCount,
  };

  localStorage.setItem(BRANCH_QUOTAS_STORAGE_KEY, JSON.stringify(map));
}

function generatePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let ret = '';
  for (let i = 0; i < length; i++) ret += charset.charAt(Math.floor(Math.random() * charset.length));
  return ret;
}

export function CadastroCliente() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location as unknown as { state?: { from?: string } })?.state?.from;
  const isFromAdmHub = from === 'adm-hub';

  const [active, setActive] = useState(0);

  // Novo: seleção de módulos
  const [modulo, setModulo] = useState<'padrao' | 'tea' | 'apenas-tea'>('padrao');

  // Step 1 - Client (admin user)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plainPassword, setPlainPassword] = useState('');
  const [showPlainPassword, setShowPlainPassword] = useState(false);

  // Step 2 - Company
  const [cnpj, setCnpj] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [address, setAddress] = useState('');

  // Step 3 - Branches
  const [branches, setBranches] = useState<number | undefined>(0);

  const [submitting, setSubmitting] = useState(false);

  const handleGeneratePassword = () => {
    const p = generatePassword(12);
    setPlainPassword(p);
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!adminName.trim()) {
        showNotification({ title: 'Erro', message: 'Nome do administrador é obrigatório', color: 'red' });
        return false;
      }
      if (!isValidEmail(adminEmail)) {
        showNotification({ title: 'Erro', message: 'E-mail inválido', color: 'red' });
        return false;
      }
      if (!plainPassword) {
        showNotification({ title: 'Erro', message: 'Gere uma senha para o usuário', color: 'red' });
        return false;
      }
    }

    if (step === 1) {
      if (!cnpj.trim()) {
        showNotification({ title: 'Erro', message: 'CNPJ é obrigatório', color: 'red' });
        return false;
      }
      if (!razaoSocial.trim()) {
        showNotification({ title: 'Erro', message: 'Razão social é obrigatória', color: 'red' });
        return false;
      }
    }

    if (step === 2) {
      if (branches === undefined || branches < 0) {
        showNotification({ title: 'Erro', message: 'Informe o número de filiais adicionais (>= 0)', color: 'red' });
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateStep(active)) return;
    setActive((a) => Math.min(2, a + 1));
  };

  const handleBack = () => setActive((a) => Math.max(0, a - 1));

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setSubmitting(true);
    const notificationId = 'cadastro-cliente-submit';

    notifications.show({
      id: notificationId,
      title: 'Cadastrando cliente',
      message: 'Estamos criando a empresa, o usuário inicial e enviando os dados de acesso por e-mail.',
      color: 'blue',
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const additionalBranchesAllowed = branches ?? 0;

      const payload = {
        admin: {
          name: adminName.trim(),
          email: normalizeEmail(adminEmail),
          password: plainPassword,
        },
        company: {
          cnpj: cnpj.trim(),
          phone: companyPhone.trim() || undefined,
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia.trim() || undefined,
          address: address.trim() || undefined,
        },
        branchesCount: additionalBranchesAllowed,
        modulo: modulo,
      };

      const result = await companyService.createCompany(payload);

      localStorage.setItem(
        COMPANY_PREFILL_STORAGE_KEY,
        JSON.stringify({
          cnpj: payload.company.cnpj,
          legalName: payload.company.razaoSocial,
          tradeName: payload.company.nomeFantasia || payload.company.razaoSocial,
          address: payload.company.address || '',
          phone: payload.company.phone || '',
        })
      );

      if (result?.company?.id) {
        const initialBranchCount = Array.isArray(result?.branches) ? result.branches.length : 1;
        saveBranchCreateQuota(result.company.id, payload.branchesCount, initialBranchCount);
      }

      notifications.update({
        id: notificationId,
        title: 'Cliente cadastrado',
        message: 'Cadastro concluído com sucesso. O e-mail com os dados de acesso foi processado.',
        color: 'green',
        loading: false,
        autoClose: 5000,
      });
      if (isFromAdmHub) {
        navigate('/adm-hub');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = resolveApiErrorMessage(e, 'Erro ao cadastrar cliente');
      notifications.update({
        id: notificationId,
        title: 'Falha no cadastro',
        message,
        color: 'red',
        loading: false,
        autoClose: 7000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ mdminHeight: '100vh' }}>
      <Header />
      <Box p="xl" mx="auto" maw={1180}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Group gap="xs">
                {isFromAdmHub && (
                  <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/adm-hub')}>
                    Voltar para o ADM
                  </Button>
                )}
              </Group>
              <Title order={2} fw={600} style={{ color: 'var(--mantine-color-text)' }}>
                Módulo de Cadastro de Cliente
              </Title>
              <Text c="dimmed" maw={720}>
                Cadastre uma nova empresa com usuário administrador inicial e definição de expansão por filiais,
                mantendo o fluxo administrativo separado da operação clínica.
              </Text>
            </Stack>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <Paper p="lg" withBorder radius="lg">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size={42} radius="md" color="darkBlue" variant="light">
                  <ShieldCheck size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Administrador inicial</Text>
                  <Text size="sm" c="dimmed">
                    Criamos o primeiro acesso da empresa com senha gerada no fluxo.
                  </Text>
                </Box>
              </Group>
            </Paper>

            <Paper p="lg" withBorder radius="lg">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size={42} radius="md" color="darkBlue" variant="light">
                  <Building2 size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Estrutura da empresa</Text>
                  <Text size="sm" c="dimmed">
                    Defina dados principais da matriz para seguir com configurações internas depois.
                  </Text>
                </Box>
              </Group>
            </Paper>

            <Paper p="lg" withBorder radius="lg">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size={42} radius="md" color="darkBlue" variant="light">
                  <Waypoints size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Expansão controlada</Text>
                  <Text size="sm" c="dimmed">
                    A matriz nasce no cadastro e o limite de filiais adicionais fica pré-configurado.
                  </Text>
                </Box>
              </Group>
            </Paper>
          </SimpleGrid>

          <Paper p="xl" withBorder radius="lg">
            <Stepper active={active} onStepClick={setActive}>
            <Stepper.Step description="Informações do cliente">
              <Stack>
                <TextInput label="Nome do administrador" value={adminName} onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminName(e.currentTarget.value)} />
                <TextInput label="E-mail" value={adminEmail} onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminEmail(e.currentTarget.value)} />

                <Group align="flex-end">
                  <PasswordInput
                    label="Senha de login"
                    value={plainPassword}
                    placeholder="Gere a senha"
                    visible={showPlainPassword}
                    onVisibilityChange={(v: boolean) => setShowPlainPassword(v)}
                    readOnly
                    style={{ flex: 1 }}
                  />
                  <Button onClick={handleGeneratePassword}>Gerar senha</Button>
                </Group>

                <Text size="sm" c="dimmed">A senha é gerada automaticamente (não editável) e hashada no cadastro. O nome do administrador é apenas informativo.</Text>

                {/* Seleção de módulo */}
                <Radio.Group
                  label="Selecione o módulo que o cliente irá utilizar:"
                  value={modulo}
                  onChange={(value) => setModulo(value as 'padrao' | 'tea' | 'apenas-tea')}
                  mt="md"
                >
                  <Radio mt="md" value="padrao" label="Sistema padrão" description="Tudo do sistema, exceto parte TEA." />
                  <Radio mt="xs" value="tea" label="Módulo TEA" description="Tudo do sistema, inclusive a parte TEA." />
                  <Radio mt="xs" value="apenas-tea" label="Apenas módulo TEA" description="Somente a parte TEA." />
                </Radio.Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Step description="Informações da empresa">
              <Stack>
                <TextInput label="CNPJ" value={cnpj} onChange={(e: ChangeEvent<HTMLInputElement>) => setCnpj(e.currentTarget.value)} />
                <TextInput label="Telefone" value={companyPhone} onChange={(e: ChangeEvent<HTMLInputElement>) => setCompanyPhone(e.currentTarget.value)} />
                <TextInput label="Razão social" value={razaoSocial} onChange={(e: ChangeEvent<HTMLInputElement>) => setRazaoSocial(e.currentTarget.value)} />
                <TextInput label="Nome fantasia" value={nomeFantasia} onChange={(e: ChangeEvent<HTMLInputElement>) => setNomeFantasia(e.currentTarget.value)} />
                <TextInput label="Endereço" value={address} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.currentTarget.value)} />
              </Stack>
            </Stepper.Step>

            <Stepper.Step description="Filiais">
              <Stack>
                <NumberInput label="Quantidade de filiais adicionais" value={branches} onChange={(v: string | number) => setBranches(typeof v === 'number' ? v : Number(v) || undefined)} min={0} />
                <Text size="sm" c="dimmed">No cadastro sera criada apenas a matriz. Esse numero define quantas filiais adicionais poderao ser criadas no Settings.</Text>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Text>Revisão final. Clique em <b>Cadastrar</b> para finalizar.</Text>
            </Stepper.Completed>
            </Stepper>

            <Group mt="xl" justify="space-between">
              <Text size="sm" c="dimmed">
                Fluxo administrativo com 3 etapas: acesso, empresa e quantidade de filiais adicionais.
              </Text>
              <Group>
                  <Button variant="default" onClick={handleBack} disabled={active === 0 || submitting}>
                    Voltar
                  </Button>
                {active < 2 ? (
                  <Button onClick={handleNext} bg={DARK_BLUE} disabled={submitting}>
                    Próximo
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} bg={DARK_BLUE} loading={submitting} disabled={submitting}>
                    {submitting ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                )}
              </Group>
            </Group>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
