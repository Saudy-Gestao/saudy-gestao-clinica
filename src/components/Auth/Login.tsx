import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, Stack, Group, Anchor, SimpleGrid, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconUsers, IconFileText, IconUser, IconBuilding } from '@tabler/icons-react';
import { DARK_BLUE } from '../../themes/theme';

export function Login() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'paciente' | 'empresa' | null>(null);
  const isEmpresa = loginType === 'empresa';
  
  const isMobile = useMediaQuery('(max-width: 799px)');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Drag to scroll logic for mobile carousel on desktop
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const features = [
    { icon: IconCalendar, title: 'Agendamento', description: 'Controle total da sua agenda' },
    { icon: IconUsers, title: 'Pacientes', description: 'Cadastro completo', active: true },
    { icon: IconFileText, title: 'Prontuário', description: 'Histórico detalhado' },
  ];

  const handleLogin = async () => {
    if (!email || !password) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Salvar token e usuário no localStorage
      localStorage.setItem('token', 'mock-token-123');
      localStorage.setItem('user', JSON.stringify({ email, name: isEmpresa ? 'Empresa' : 'Paciente' }));
      
      notifications.show({
        title: 'Sucesso',
        message: 'Login realizado com sucesso!',
        color: 'green',
      });
      
      navigate('/dashboard');
    } catch (error) {
      notifications.show({
        title: 'Erro',
        message: 'Erro ao fazer login',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!loginType) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box p="md" style={{ display: 'flex', alignItems: 'center' }}>
          <Box
            w={40}
            h={40}
            bg="#e9ecef"
            style={{ borderRadius: 8, marginRight: 12 }}
          />
          <Text fw={600} size="lg">Saudy</Text>
        </Box>

        <Stack align="center" gap="xl" style={{ flex: 1, justifyContent: 'center', padding: '2rem 1rem' }}>
          
          {/* Welcome Section */}
          <Stack align="center" gap={0}>
            <Text size={isMobile ? "1.5rem" : "2rem"} fw={600} ta="center">Bem-vindo ao Saudy</Text>
            <Text c="dimmed" size="lg">Acesse sua conta</Text>
          </Stack>

          {/* Features Carousel/Grid */}
          <Box w="100%" maw={1000}>
            {isMobile ? (
              <Box
                ref={scrollContainerRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '1rem',
                  padding: '1rem',
                  scrollSnapType: isDragging ? 'none' : 'x mandatory',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  '&::-webkit-scrollbar': {
                    display: 'none'
                  }
                }}
              >
                {features.map((feature, index) => (
                  <Box
                    key={index}
                    bg="white"
                    p="xl"
                    style={{
                      minWidth: '280px',
                      borderRadius: 16,
                      border: feature.active ? `2px solid ${DARK_BLUE}` : '1px solid transparent',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      scrollSnapAlign: 'center',
                      transform: feature.active ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <Box 
                      style={{ 
                        background: feature.active ? 'linear-gradient(180deg, #1a4b8c 0%, #001f54 100%)' : '#f8f9fa',
                        borderRadius: 8, 
                        marginBottom: 16,
                        width: 70,
                        height: 70,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      c={feature.active ? 'white' : '#adb5bd'}
                    >
                      <feature.icon size={32} stroke={1.5} />
                    </Box>
                    <Text fw={600} size="lg" mb={4}>{feature.title}</Text>
                    <Text size="sm" c="dimmed">{feature.description}</Text>
                  </Box>
                ))}
              </Box>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                {features.map((feature, index) => (
                  <Box
                    key={index}
                    bg="white"
                    p="xl"
                    style={{
                      borderRadius: 16,
                      border: feature.active ? `2px solid ${DARK_BLUE}` : '1px solid transparent',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      transform: feature.active ? 'scale(1.05)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <Box 
                      style={{ 
                        background: feature.active ? 'linear-gradient(180deg, #1a4b8c 0%, #001f54 100%)' : '#f8f9fa',
                        borderRadius: 8, 
                        marginBottom: 16,
                        width: 70,
                        height: 70,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      c={feature.active ? 'white' : '#adb5bd'}
                    >
                      <feature.icon size={32} stroke={1.5} />
                    </Box>
                    <Text fw={600} size="lg" mb={4}>{feature.title}</Text>
                    <Text size="sm" c="dimmed">{feature.description}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}
            
            {/* Dots Indicator - Only visible on mobile */}
            {isMobile && (
              <Group justify="center" gap="xs" mt="xl">
                <Box w={8} h={8} bg="#dee2e6" style={{ borderRadius: '50%' }} />
                <Box w={8} h={8} bg={DARK_BLUE} style={{ borderRadius: '50%' }} />
                <Box w={8} h={8} bg="#dee2e6" style={{ borderRadius: '50%' }} />
              </Group>
            )}
          </Box>

          {/* Login Options Section */}
          <Stack align="center" gap="xl" mt="xl" w="100%" maw={800}>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={600}>Acesse sua conta</Text>
              <Text c="dimmed">Como pretende seguir?</Text>
            </Stack>

            <Box w="100%" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', justifyContent: 'center' }}>
              <UnstyledButton 
                onClick={() => setLoginType('paciente')}
                style={{ 
                  flex: 1, 
                  width: isMobile ? '100%' : 'auto',
                  maxWidth: isMobile ? '100%' : 300 
                }}
              >
                <Box
                  bg="white"
                  p="xl"
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    border: '1px solid transparent',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e : any) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = DARK_BLUE;
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <Box 
                    style={{ 
                      background: 'linear-gradient(180deg, #1a4b8c 0%, #001f54 100%)',
                      borderRadius: 8, 
                      marginBottom: 16,
                      width: 70,
                      height: 70,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    c="white"
                  >
                    <IconUser size={32} stroke={1.5} />
                  </Box>
                  <Text fw={600} size="lg" mb={4}>Paciente</Text>
                  <Text size="sm" c="dimmed">Acesse como paciente</Text>
                </Box>
              </UnstyledButton>

              <UnstyledButton 
                onClick={() => setLoginType('empresa')}
                style={{ 
                  flex: 1, 
                  width: isMobile ? '100%' : 'auto',
                  maxWidth: isMobile ? '100%' : 300 
                }}
              >
                <Box
                  bg="white"
                  p="xl"
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    border: '1px solid transparent',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e: any) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = DARK_BLUE;
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <Box 
                    style={{ 
                      background: 'linear-gradient(180deg, #1a4b8c 0%, #001f54 100%)',
                      borderRadius: 8, 
                      marginBottom: 16,
                      width: 70,
                      height: 70,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    c="white"
                  >
                    <IconBuilding size={32} stroke={1.5} />
                  </Box>
                  <Text fw={600} size="lg" mb={4}>Empresa</Text>
                  <Text size="sm" c="dimmed">Acesse como empresa</Text>
                </Box>
              </UnstyledButton>
            </Box>
          </Stack>

        </Stack>
      </Box>
    );
  }

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

      {/* Right/Bottom Side - Login Form */}
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
          marginTop: isMobile ? '-20px' : '0', // Slight overlap to ensure no gap
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
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                aria-label="E-mail ou CPF"
              />
              <label>E-mail/CPF</label>
            </Box>

            <Box>
              <Box className="floating-field">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  aria-label="Senha"
                />
                <label>Senha</label>
              </Box>
              <Group justify="flex-end" mt="xs">
                <Anchor
                  size="sm"
                  c="blue"
                  onClick={() => navigate('/esqueci-a-senha')}
                  style={{ cursor: 'pointer' }}
                >
                  Esqueci a senha
                </Anchor>
              </Group>
            </Box>

            <Button
              fullWidth
              size="lg"
              bg={DARK_BLUE}
              onClick={handleLogin}
              loading={loading}
              mt="md"
              styles={{
                root: {
                  height: '56px',
                  borderRadius: '8px',
                }
              }}
            >
              Acessar conta
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
              onClick={() => navigate('/cadastro')}
            >
              Criar conta
            </Button>

            <Button
              variant="subtle"
              c="dimmed"
              size="sm"
              onClick={() => setLoginType(null)}
            >
              Voltar para seleção
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
