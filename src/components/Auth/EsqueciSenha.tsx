import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Text,
  Stack,
  PinInput,
  Group,
  Checkbox,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import authService from '../../services/authService';

type Step = 'email' | 'code' | 'newPassword';

export function EsqueciSenha() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const handleSendEmail = async () => {
    if (!identifier) {
      notifications.show({
        title: 'Erro',
        message: 'Digite seu e-mail ou CPF',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.sendResetCode(identifier);
      notifications.show({
        title: 'Código enviado',
        message: 'Se o usuário existir, o código foi enviado por e-mail',
        color: 'green',
      });
      setStep('code');
    } catch (error) {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao enviar código',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      notifications.show({
        title: 'Erro',
        message: 'Digite o código completo',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.verifyResetCode(identifier, code);
      setStep('newPassword');
    } catch (error) {
      notifications.show({
        title: 'Erro',
        message: 'Código inválido',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!identifier) {
      notifications.show({
        title: 'Erro',
        message: 'Informe seu e-mail ou CPF para reenviar o código',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.sendResetCode(identifier);
      notifications.show({
        title: 'Código reenviado',
        message: 'Verifique seu e-mail',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao reenviar código',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordStrength({
      minLength: value.length >= 8,
      hasNumber: /\d/.test(value),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos',
        color: 'red',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Erro',
        message: 'As senhas não coincidem',
        color: 'red',
      });
      return;
    }

    if (!passwordStrength.minLength || !passwordStrength.hasNumber || !passwordStrength.hasSpecialChar) {
      notifications.show({
        title: 'Erro',
        message: 'A senha não atende aos requisitos de segurança',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        identifier,
        code,
        newPassword,
      });
      notifications.show({
        title: 'Sucesso',
        message: 'Senha alterada com sucesso!',
        color: 'green',
      });
      navigate('/login');
    } catch (error) {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao alterar senha',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <Group justify="center" gap="xs" mb="xl">
      <Box
        w={8}
        h={8}
        bg={step === 'email' ? DARK_BLUE : '#e9ecef'}
        style={{ borderRadius: '50%', transition: 'all 0.3s' }}
      />
      <Box
        w={8}
        h={8}
        bg={step === 'code' ? DARK_BLUE : '#e9ecef'}
        style={{ borderRadius: '50%', transition: 'all 0.3s' }}
      />
      <Box
        w={8}
        h={8}
        bg={step === 'newPassword' ? DARK_BLUE : '#e9ecef'}
        style={{ borderRadius: '50%', transition: 'all 0.3s' }}
      />
    </Group>
  );

  const renderEmailStep = () => (
    <Stack gap="lg">
      <Box mb="md">
        <Text size="2rem" fw={400} mb="xs" style={{ lineHeight: 1.2 }}>
          Alterar senha
        </Text>
        <Text size="sm" c="dimmed">
          Recupere sua senha e volte a acessar sua conta.
        </Text>
      </Box>

      <Box className="floating-field">
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder=" "
          aria-label="E-mail/CPF"
        />
        <label>E-mail/CPF</label>
      </Box>

      <Button
        fullWidth
        size="lg"
        bg={DARK_BLUE}
        onClick={handleSendEmail}
        loading={loading}
        mt="md"
        styles={{
          root: {
            height: '56px',
            borderRadius: '8px',
          }
        }}
      >
        Enviar código
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
        Voltar
      </Button>
    </Stack>
  );

  const renderCodeStep = () => (
    <Stack gap="lg" align="center">
      <Box w="100%" mb="md">
        <Text size="2rem" fw={400} mb="xs" ta="center" style={{ lineHeight: 1.2 }}>
          Código de verificação
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Insira o código enviado para seu e-mail
        </Text>
      </Box>

      <PinInput
        length={6}
        size="lg"
        value={code}
        onChange={setCode}
        type="number"
        placeholder=""
        gap="md"
      />

      <Button
        fullWidth
        size="lg"
        bg={DARK_BLUE}
        onClick={handleVerifyCode}
        loading={loading}
        mt="md"
        styles={{
          root: {
            height: '56px',
            borderRadius: '8px',
          }
        }}
      >
        Verificar código
      </Button>

      <Button
        fullWidth
        size="lg"
        variant="outline"
        c={DARK_BLUE}
        onClick={handleResendCode}
        loading={loading}
        styles={{
          root: {
            borderColor: DARK_BLUE,
            height: '56px',
            borderRadius: '8px',
            borderWidth: '2px',
          }
        }}
      >
        Reenviar código
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
        Voltar
      </Button>
    </Stack>
  );

  const renderNewPasswordStep = () => (
    <Stack gap="lg">
      <Box mb="md">
        <Text size="2rem" fw={400} mb="xs" style={{ lineHeight: 1.2 }}>
          Alterar senha
        </Text>
        <Text size="sm" c="dimmed">
          Cadastre uma senha mais forte e continue sua jornada.
        </Text>
      </Box>

      <Box className="floating-field">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder=" "
          aria-label="Nova senha"
        />
        <label>Nova senha</label>
      </Box>

      <Box className="floating-field">
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder=" "
          aria-label="Confirmar nova senha"
        />
        <label>Confirmar nova senha</label>
      </Box>

      <Box>
        <Text size="sm" fw={500} mb="xs">
          A senha deve ter no mínimo:
        </Text>
        <Stack gap="xs">
          <Checkbox
            label="8 caracteres"
            checked={passwordStrength.minLength}
            readOnly
            styles={{
              input: { cursor: 'default', pointerEvents: 'none' },
              label: { cursor: 'default' },
            }}
          />
          <Checkbox
            label="1 número"
            checked={passwordStrength.hasNumber}
            readOnly
            styles={{
              input: { cursor: 'default', pointerEvents: 'none' },
              label: { cursor: 'default' },
            }}
          />
          <Checkbox
            label="1 caractere especial (!, @, #, $, etc.)"
            checked={passwordStrength.hasSpecialChar}
            readOnly
            styles={{
              input: { cursor: 'default', pointerEvents: 'none' },
              label: { cursor: 'default' },
            }}
          />
        </Stack>
      </Box>

      <Button
        fullWidth
        size="lg"
        bg={DARK_BLUE}
        onClick={handleResetPassword}
        loading={loading}
        mt="md"
        styles={{
          root: {
            height: '56px',
            borderRadius: '8px',
          }
        }}
      >
        Confirmar senha
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
        Cancelar
      </Button>
    </Stack>
  );

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

      {/* Right/Bottom Side - Form */}
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
          {renderStepIndicator()}
          
          {step === 'email' && renderEmailStep()}
          {step === 'code' && renderCodeStep()}
          {step === 'newPassword' && renderNewPasswordStep()}
        </Box>
      </Box>
    </Box>
  );
}
