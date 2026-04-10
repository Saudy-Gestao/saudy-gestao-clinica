import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Text,
  Stack,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { resolveApiErrorMessage } from '../../lib/apiError';
import AuthService from '../../services/authService';
import { validateCNPJ } from '../../utils/validations';
import { formatCNPJ, formatCPF, isValidEmail, normalizeEmail } from '../../utils/formatters';

export function Cadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginType = location.state?.loginType || 'empresa'; // default to empresa now
  const isEmpresa = loginType === 'empresa';
  
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    documento: '', // CPF for paciente, CNPJ for empresa
    password: '',
    confirmPassword: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCadastro = async () => {
    const email = normalizeEmail(formData.email);
    const documento = formData.documento.trim();
    const cleanedDocumento = documento.replace(/\D/g, '');
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!email || !documento || !password || !confirmPassword) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos',
        color: 'red',
      });
      return;
    }

    if (!isValidEmail(email)) {
      notifications.show({
        title: 'Erro',
        message: 'Informe um e-mail válido',
        color: 'red',
      });
      return;
    }

    if (password !== confirmPassword) {
      notifications.show({
        title: 'Erro',
        message: 'As senhas não coincidem',
        color: 'red',
      });
      return;
    }

    if (isEmpresa && !validateCNPJ(documento)) {
      notifications.show({
        title: 'Erro',
        message: 'Informe um CNPJ válido',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      if (isEmpresa) {
        // Registro de empresa - chamada para API saudy-ms-auth
        const companyData = {
          company: {
            cnpj: cleanedDocumento,
            legalName: 'Empresa Teste', // TODO: adicionar campo no formulário
            tradeName: 'Empresa Teste', // TODO: adicionar campo no formulário
            address: 'Endereço padrão', // TODO: adicionar campo no formulário
            phone: '', // TODO: adicionar campo no formulário
          },
          branch: {
            tradeName: 'Filial Principal',
            address: 'Endereço padrão',
            phone: '',
          },
          sector: {
            name: 'Administração',
            description: 'Setor de administração',
          },
          user: {
            name: 'Administrador', // TODO: adicionar campo no formulário
            birthDate: '1990-01-01', // TODO: adicionar campo no formulário
            email,
            password,
            phone: '', // TODO: adicionar campo no formulário
            address: 'Endereço padrão', // TODO: adicionar campo no formulário
          },
          accesses: [],
        };

        await AuthService.registerCompany(companyData);
      } else {
        // Registro de paciente - por enquanto simula
        // TODO: implementar registro de paciente quando houver endpoint
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      notifications.show({
        title: 'Sucesso',
        message: 'Conta criada com sucesso!',
        color: 'green',
      });

      navigate(isEmpresa ? '/dashboard' : '/login');
    } catch (error: any) {
      console.error('Erro no registro:', error);
      notifications.show({
        title: 'Erro',
        message: resolveApiErrorMessage(error, 'Erro ao criar conta'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        backgroundColor: isMobile ? DARK_BLUE : 'white',
      }}
    >
      {/* Left/Top Side - Blue with Logo */}
      <Box
        style={{
          width: isMobile ? '100%' : '50%',
          height: isMobile ? '35vh' : '100vh',
          backgroundColor: DARK_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <Stack align="center" gap="lg">
          <Box
            bg="white"
            w={isMobile ? 80 : 120}
            h={isMobile ? 80 : 120}
            style={{ borderRadius: 16 }}
          />
          <Text c="white" size={isMobile ? "1.5rem" : "2rem"} fw={600}>
            Saudy
          </Text>
        </Stack>
      </Box>

      {/* Right/Bottom Side - Cadastro Form */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '1rem 1.5rem' : '3rem',
          backgroundColor: 'white',
          borderTopLeftRadius: isMobile ? '30px' : '0',
          borderTopRightRadius: isMobile ? '30px' : '0',
          marginTop: isMobile ? '-20px' : '0',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box w="100%" maw={420}>
          <Stack gap="lg">
            <Box mb="xl" ta="center">
              <Text size="lg" c="dimmed" mb={4}>
                Você acessou como:
              </Text>
              <Text size="2rem" fw={600} style={{ lineHeight: 1.2 }}>
                {isEmpresa ? 'Empresa' : 'Paciente'}
              </Text>
            </Box>

            <Box className="floating-field">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', normalizeEmail(e.target.value))}
                placeholder=" "
                aria-label="E-mail"
              />
              <label>E-mail</label>
            </Box>

            <Box className="floating-field">
              <input
                type="text"
                value={formData.documento}
                onChange={(e) => handleChange('documento', isEmpresa ? formatCNPJ(e.target.value) : formatCPF(e.target.value))}
                placeholder=" "
                aria-label={isEmpresa ? "CNPJ" : "CPF"}
              />
              <label>{isEmpresa ? 'CNPJ' : 'CPF'}</label>
            </Box>

            <Box className="floating-field">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder=" "
                aria-label="Criar senha"
              />
              <label>Criar senha</label>
            </Box>

            <Box className="floating-field">
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder=" "
                aria-label="Confirmar senha"
              />
              <label>Confirmar senha</label>
            </Box>

            <Button
              fullWidth
              size="lg"
              bg={DARK_BLUE}
              onClick={handleCadastro}
              loading={loading}
              mt="md"
              styles={{
                root: {
                  height: '56px',
                  borderRadius: '8px',
                }
              }}
            >
              Criar conta
            </Button>

            <Button
              fullWidth
              size="lg"
              variant="outline"
              c={DARK_BLUE}
              styles={{
                root: {
                  borderColor: DARK_BLUE,
                  height: '56px',
                  borderRadius: '8px',
                  borderWidth: '2px',
                }
              }}
              onClick={() => navigate('/login')}
            >
              Voltar para login
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
