import { Box, Text, SimpleGrid, Paper, Group, ThemeIcon } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
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
  ChevronRight
} from 'lucide-react';
import { DARK_BLUE } from '../../themes/theme';

export function WorkflowSections() {
  const navigate = useNavigate();
  const sections = [
    {
      title: 'Fluxo do Paciente',
      items: [
        { icon: UserPlus, label: 'Pré-atendimento', desc: 'Recepção e cadastro', route: '/pre-atendimento' },
        { icon: Calendar, label: 'Agendamento', desc: 'Consultas e exames', route: '/agendamento' },
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
  ];

  return (
    <>
      {sections.map((section, idx) => (
        <Box key={idx} mb={30}>
          <Text fw={600} size="lg" c="dimmed" mb="md">{section.title}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {section.items.map((item, i) => (
              <Paper 
                key={i} 
                p="md" 
                withBorder 
                style={{ cursor: item.route ? 'pointer' : 'default', borderColor: DARK_BLUE }}
                onClick={() => item.route && navigate(item.route)}
              >
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
                  {item.route && <ChevronRight size={16} color="#cbd5e0" />}
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </>
  );
}