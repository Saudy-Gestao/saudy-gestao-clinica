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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import companyService from '../../services/companyService';

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

  const [active, setActive] = useState(0);

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
      if (!adminEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
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

    try {
      const additionalBranchesAllowed = branches ?? 0;

      const payload = {
        admin: {
          name: adminName.trim(),
          email: adminEmail.trim(),
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

      showNotification({ title: 'Sucesso', message: 'Cliente cadastrado com sucesso', color: 'green' });
      // Important: show the generated password to the admin so they can share it once
      if (plainPassword) {
        showNotification({ title: 'Senha gerada', message: `Senha: ${plainPassword}`, color: 'blue' });
      }

      const from = (location as unknown as { state?: { from?: string } })?.state?.from;
      if (from === 'adm-hub') {
        navigate('/adm-hub');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const message = e?.response?.data?.message || e?.message || 'Erro ao cadastrar cliente';
      showNotification({ title: 'Erro', message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Box p="xl" mx="auto" maw={900}>
        <Title order={3} fw={600} style={{ color: 'var(--mantine-color-text)', marginBottom: 18 }}>Cadastrar cliente</Title>

        <Paper p="md" withBorder radius="md">
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

                <Text size="sm" c="dimmed">A senha e gerada automaticamente (nao editavel) e hashada no cadastro. O nome do administrador e apenas informativo.</Text>
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

          <Group mt="md" justify="flex-end">
            <Button variant="default" onClick={handleBack} disabled={active === 0}>Voltar</Button>
            {active < 2 ? (
              <Button onClick={handleNext} bg={DARK_BLUE}>Próximo</Button>
            ) : (
              <Button onClick={handleSubmit} bg={DARK_BLUE} loading={submitting}>Cadastrar</Button>
            )}
          </Group>
        </Paper>
      </Box>
    </Box>
  );
}
