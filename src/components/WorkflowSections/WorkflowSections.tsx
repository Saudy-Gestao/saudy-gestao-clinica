import { Box, Text, SimpleGrid, Paper, Group, ThemeIcon } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
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
  const [allowedModules, setAllowedModules] = useState<string[]>([]);

  useEffect(() => {
    // Busca os módulos permitidos do usuário logado
    const fetchUserModules = async () => {
      const userStr = localStorage.getItem('user');
      console.log('🔍 LocalStorage user string:', userStr);
      
      if (!userStr) {
        console.warn('⚠️ Nenhum usuário no localStorage');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        console.log('👤 Usuário completo:', user);
        console.log('🔐 Acessos do usuário:', user.accesses);
        
        // Verifica se os acessos têm módulos
        const hasModules = user.accesses?.some((access: any) => 
          access.modules && Array.isArray(access.modules) && access.modules.length > 0
        );

        let accesses = user.accesses;

        // Se não tiver módulos, busca da API
        if (!hasModules && user.id) {
          console.log('⚠️ Módulos não encontrados no localStorage, buscando da API...');
          console.log('🔗 Chamando GET /users/' + user.id);
          try {
            const response = await api.get(`/users/${user.id}`);
            console.log('📡 Resposta da API:', response);
            console.log('📡 Data:', response.data);
            accesses = response.data.accesses || [];
            console.log('✅ Acessos atualizados da API:', accesses);
            
            // Atualiza o localStorage com os dados completos
            const updatedUser = { ...user, accesses };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('💾 localStorage atualizado com módulos');
          } catch (error) {
            console.error('❌ Erro ao buscar acessos da API:', error);
            console.error('❌ Detalhes do erro:', error);
          }
        } else if (hasModules) {
          console.log('✅ Módulos já encontrados no localStorage');
        } else {
          console.log('⚠️ user.id não encontrado:', user);
        }
        
        // Extrai todos os módulos dos acessos
        const modules: string[] = [];
        if (accesses && Array.isArray(accesses)) {
          console.log('📋 Número de acessos:', accesses.length);
          
          accesses.forEach((access: any, index: number) => {
            console.log(`  Acesso ${index + 1}:`, access);
            console.log(`  - Description: ${access.description}`);
            console.log(`  - Modules:`, access.modules);
            
            if (access.modules && Array.isArray(access.modules)) {
              console.log(`  - Número de módulos: ${access.modules.length}`);
              access.modules.forEach((module: any) => {
                console.log(`    - Módulo:`, module);
                if (module.name && !modules.includes(module.name)) {
                  modules.push(module.name);
                  console.log(`    ✅ Adicionado: ${module.name}`);
                }
              });
            } else {
              console.warn(`  ⚠️ Acesso ${index + 1} não tem módulos ou não é array`);
            }
          });
        } else {
          console.warn('⚠️ accesses não existe ou não é array');
        }
        
        console.log('🎯 Módulos permitidos FINAL:', modules);
        setAllowedModules(modules);
      } catch (error) {
        console.error('❌ Erro ao processar usuário:', error);
      }
    };

    fetchUserModules();
  }, []);

  const sections = [
    {
      title: 'Fluxo do Paciente',
      items: [
        { icon: UserPlus, label: 'Pré-atendimento', desc: 'Recepção e cadastro', route: '/pre-atendimento', moduleName: 'pre-atendimento' },
        { icon: Calendar, label: 'Agendamento', desc: 'Consultas e exames', route: '/agendamento', moduleName: 'agendamento' },
        { icon: ClipboardList, label: 'Anamnese', desc: 'Histórico médico', route: '/consulta', moduleName: 'anamnese' },
        { icon: HeartPulse, label: 'Enfermagem', desc: 'Triagem e sinais vitais', route: '/consulta', moduleName: 'enfermagem' },
      ]
    },
    {
      title: 'Suporte Clínico',
      items: [
        { icon: Stethoscope, label: 'Consulta', desc: 'Atendimento médico', route: '/consulta', moduleName: 'consulta' },
        { icon: FileText, label: 'Laudo', desc: 'Emissão de laudos', route: '/laudo', moduleName: 'laudo' },
        { icon: Mail, label: 'Envelopamento', desc: 'Preparação de docs', route: '/envelopamento', moduleName: 'envelopamento' },
        { icon: Folder, label: 'Documentos', desc: 'Gestão documental', moduleName: 'documentos' },
      ]
    },
    {
      title: 'Administrativo',
      items: [
        { icon: Package, label: 'Entrega', desc: 'Controle de entregas', route: '/entrega', moduleName: 'entrega' },
        { icon: Warehouse, label: 'Estoque', desc: 'Materiais e insumos', route: '/estoque', moduleName: 'estoque' },
        { icon: Wallet, label: 'Financeiro', desc: 'Gestão financeira', route: '/financeiro', moduleName: 'financeiro' },
        { icon: DollarSign, label: 'Faturamento', desc: 'Cobranças e NFs', route: '/faturamento', moduleName: 'faturamento' },
      ]
    }
  ];

  // Filtra as seções para mostrar apenas módulos permitidos
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      allowedModules.length === 0 || allowedModules.includes(item.moduleName)
    )
  })).filter(section => section.items.length > 0); // Remove seções vazias

  return (
    <>
      {allowedModules.length === 0 ? (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text size="lg" c="dimmed" mb="xs">
            🔒 Você ainda não possui acessos configurados
          </Text>
          <Text size="sm" c="dimmed">
            Entre em contato com o administrador do sistema para solicitar permissões
          </Text>
        </Box>
      ) : filteredSections.length === 0 ? (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text size="lg" c="dimmed" mb="xs">
            🔒 Nenhum módulo disponível
          </Text>
          <Text size="sm" c="dimmed">
            Seus acessos não correspondem a nenhum módulo do sistema
          </Text>
        </Box>
      ) : (
        <>
          {filteredSections.map((section, idx) => (
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
      )}
    </>
  );
}