import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider, createTheme, Group, Text, Title, Paper, SimpleGrid, Stack, Button, ThemeIcon, Box } from '@mantine/core';
import { useLocalStorage, useMediaQuery } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Play, 
  UserPlus, 
  Calendar, 
  ClipboardList, 
  HeartPulse, 
  Stethoscope, 
  FileText, 
  Mail, 
  Folder, 
  Package, 
  Warehouse, 
  Wallet, 
  DollarSign,
  ChevronRight,
  ArrowRight,
  Clock
} from 'lucide-react';

// Tema customizado
const theme = createTheme({
  primaryColor: 'darkBlue',
  colors: {
    darkBlue: [
      '#eef3f7',
      '#dce4eb',
      '#b6c8d9',
      '#8daac5',
      '#6b90b4',
      '#5580aa',
      '#4a78a5',
      '#3b6690',
      '#335b81',
      '#264f71',
    ],
  },
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '600',
  },
  components: {
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
  breakpoints: {
    xs: '30em',
    sm: '800px',
    md: '1280px',
    lg: '1440px',
    xl: '1920px',
  },
});

const DARK_BLUE = '#001f54'; // Cor aproximada do header e item ativo

function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const isMobile = useMediaQuery('(max-width: 799px)');

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day = currentTime.getDate().toString().padStart(2, '0');
  const month = currentTime.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  const year = currentTime.getFullYear();
  const dateStr = `${day} de ${month}, ${year}`;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia!';
    if (hour >= 12 && hour < 18) return 'Boa tarde!';
    return 'Boa noite!';
  };

  return (
    <Box bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Box bg={DARK_BLUE} c="white" py="md" px="xl">
        <Group justify="space-between">
          <Group>
            <Box bg="white" w={40} h={40} style={{ borderRadius: 8 }} />
            <Text fw={500} size="lg">Logo Clínica</Text>
          </Group>
          
          <Group gap="xl">
            {!isMobile && <Text size="sm">{timeStr} | {dateStr}</Text>}
            <Group gap="xs">
              <User size={20} />
              {!isMobile && (
                <>
                  <Text>|</Text>
                  <LogOut size={20} />
                </>
              )}
            </Group>
          </Group>
        </Group>
      </Box>

      <Box p="xl" maw={1400} mx="auto">
        {/* Welcome Section */}
        <Stack gap="xs" mb={30}>
          <Title order={1} fw={600} style={{ fontSize: '2rem' }}>{getGreeting()}</Title>
          <Text c="dimmed" size="lg">O que você precisa fazer hoje?</Text>
        </Stack>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb={40}>
          {[
            { label: 'Atendimento hoje', value: '25' },
            { label: 'Agendamentos pendentes', value: '05' },
            { label: 'Em atendimento', value: '10' },
          ].map((stat, index) => (
            <Paper key={index} p="lg" withBorder shadow="sm">
              <Text c="dimmed" size="sm" fw={500} mb="xs">{stat.label}</Text>
              <Text size="2.5rem" fw={500} style={{ lineHeight: 1 }}>{stat.value}</Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Fila de Atendimento */}
        <Box mb={40}>
                    <Group justify="space-between" mb="md">
            <Text fw={600} size="lg" style={{ color: '#A5A1A1' }}>Fila de Atendimento</Text>
            <Group gap={4} style={{ cursor: 'pointer' }}>
              {!isMobile && <Text size="sm" style={{ color: '#4B4545' }}>Ver agenda completa</Text>}
              {isMobile ? <ChevronRight size={20} color="#4B4545" /> : <ArrowRight size={16} color="gray" />}
            </Group>
          </Group>

          <Stack gap="sm">
            {/* Active Item */}
            <Paper p="md" bg={isMobile ? 'white' : DARK_BLUE} c={isMobile ? 'black' : 'white'} radius="md" withBorder={isMobile}>
              <Group justify="space-between">
                <Group>
                  <Box 
                    bg={isMobile ? '#e2e8f0' : DARK_BLUE} 
                    c={isMobile ? 'gray' : 'white'} 
                    w={32} 
                    h={32} 
                    style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}
                  >
                    1
                  </Box>
                  <Box>
                    <Text fw={600} size="lg">Maria Silva Santos</Text>
                    {isMobile ? (
                      <Box>
                        <Group gap="xs" c="black">
                          <Clock size={16} />
                          <Text size="sm">08:30</Text>
                          <Text size="sm">Consulta</Text>
                        </Group>
                        <Text size="sm" c="black">Dr.(a) Carlos Mendes</Text>
                      </Box>
                    ) : (
                      <Group gap="xs" c={isMobile ? 'black' : undefined}>
                        <Clock size={16} />
                        <Text size="sm">08:30</Text>
                        <Text size="sm">Consulta</Text>
                        <Text size="sm">Dr.(a) Carlos Mendes</Text>
                      </Group>
                    )}
                  </Box>
                </Group>
                {!isMobile && (
                  <Button bg="white" c="#001f54" leftSection={<Play size={16} fill="#001f54" />}>
                    Chamar
                  </Button>
                )}
              </Group>
            </Paper>

            {/* Inactive Items */}
            {[
              { id: 2, name: 'João Pedro Oliveira', time: '09:00', type: 'Consulta', doctor: 'Dr.(a) Ana Paula Costa' },
              { id: 3, name: 'Ana Beatriz Lima', time: '09:30', type: 'Retorno', doctor: 'Dr.(a) Carlos Mendes' },
            ].map((patient) => (
              <Paper key={patient.id} p="md" withBorder>
                <Group justify="space-between">
                  <Group>
                    <Box 
                      bg="#e2e8f0" 
                      c="gray" 
                      w={32} 
                      h={32} 
                      style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}
                    >
                      {patient.id}
                    </Box>
                    <Box>
                      <Text fw={600} size="lg">{patient.name}</Text>
                      {isMobile ? (
                        <Box>
                          <Group gap="xs" c="black">
                            <Clock size={16} />
                            <Text size="sm">{patient.time}</Text>
                            <Text size="sm">{patient.type}</Text>
                          </Group>
                          <Text size="sm" c="black">{patient.doctor}</Text>
                        </Box>
                      ) : (
                        <Group gap="xs" c="black">
                          <Clock size={16} />
                          <Text size="sm">{patient.time}</Text>
                          <Text size="sm">{patient.type}</Text>
                          <Text size="sm">{patient.doctor}</Text>
                        </Group>
                      )}
                    </Box>
                  </Group>
                  {!isMobile && (
                  <Button bg={DARK_BLUE} c="white" leftSection={<Play size={16} fill="white" />}>
                    Chamar
                  </Button>
                )}
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>

        {/* Workflow Sections */}
        {[
          {
            title: 'Fluxo do Paciente',
            items: [
              { icon: UserPlus, label: 'Pré-atendimento', desc: 'Recepção e cadastro' },
              { icon: Calendar, label: 'Agendamento', desc: 'Consultas e exames' },
              { icon: ClipboardList, label: 'Anamnese', desc: 'Histórico médico' },
              { icon: HeartPulse, label: 'Enfermagem', desc: 'Triagem e sinais vitais' },
            ]
          },
          {
            title: 'Suporte Clínico',
            items: [
              { icon: Stethoscope, label: 'Consulta', desc: 'Atendimento médico' },
              { icon: FileText, label: 'Laudo', desc: 'Emissão de laudos' },
              { icon: Mail, label: 'Envelopamento', desc: 'Preparação de docs' },
              { icon: Folder, label: 'Documentos', desc: 'Gestão documental' },
            ]
          },
          {
            title: 'Administrativo',
            items: [
              { icon: Package, label: 'Entrega', desc: 'Controle de entregas' },
              { icon: Warehouse, label: 'Estoque', desc: 'Materiais e insumos' },
              { icon: Wallet, label: 'Financeiro', desc: 'Gestão financeira' },
              { icon: DollarSign, label: 'Faturamento', desc: 'Cobranças e NFs' },
            ]
          }
        ].map((section, idx) => (
          <Box key={idx} mb={30}>
            <Text fw={600} size="lg" c="dimmed" mb="md">{section.title}</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              {section.items.map((item, i) => (
                <Paper key={i} p="md" withBorder style={{ cursor: 'pointer', borderColor: DARK_BLUE }}>
                  <Group justify="space-between" align="flex-start">
                    <Group>
                      <ThemeIcon size="xl" variant="transparent" color="darkBlue" bg="transparent" style={{ border: `1px solid ${DARK_BLUE}`, borderRadius: '8px' }}>
                        <item.icon size={28} color={DARK_BLUE} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={500}>{item.label}</Text>
                        <Text size="xs" c="dimmed">{item.desc}</Text>
                      </Box>
                    </Group>
                    <ChevronRight size={16} color="#cbd5e0" />
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Box>
        ))}

      </Box>
    </Box>
  );
}

function App() {
  const [colorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
