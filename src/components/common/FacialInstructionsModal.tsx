import { Modal, Stack, Text, Button, List, ThemeIcon, Box, Title, Group, Paper } from '@/components/ui';
import { 
  Camera, 
  Sun, 
  Glasses, 
  User, 
  AlertCircle, 
  CheckCircle, 
  X 
} from 'lucide-react';
interface FacialInstructionsModalProps {
  opened: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function FacialInstructionsModal({ opened, onClose, onContinue }: FacialInstructionsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="sm">
          <Camera size={24} color="var(--ui-primary)" />
          <Title order={3}>Instruções para Captura Facial</Title>
        </Group>
      }
      centered
    >
      <Stack gap="lg">
        <Paper p="md" withBorder style={{ backgroundColor: 'color-mix(in srgb, var(--ui-hue-yellow) 14%, var(--ui-surface))', borderColor: 'color-mix(in srgb, var(--ui-hue-yellow) 45%, var(--ui-border))' }}>
          <Group gap="sm" align="flex-start">
            <AlertCircle size={24} style={{ color: 'var(--ui-hue-yellow)' }} />
            <Box style={{ flex: 1 }}>
              <Text fw={600} size="sm" mb={4}>Atenção!</Text>
              <Text size="sm">
                A qualidade da foto facial é essencial para um reconhecimento preciso.
                Siga as instruções abaixo para garantir o melhor resultado.
              </Text>
            </Box>
          </Group>
        </Paper>

        <Box>
          <Group gap="xs" mb="md">
            <CheckCircle size={20} color="green" />
            <Text fw={600}>O que fazer:</Text>
          </Group>
          
          <List
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon color="green" size={20} radius="xl">
                <CheckCircle size={14} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <Text size="sm">
                <strong>Posicione o rosto centralizado</strong> - O rosto deve ocupar a maior parte da câmera
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <strong>Boa iluminação</strong> - Certifique-se de estar em ambiente bem iluminado, de preferência com luz natural
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <strong>Olhe diretamente para a câmera</strong> - Mantenha a cabeça reta, sem inclinar
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <strong>Expressão neutra</strong> - Mantenha uma expressão facial natural e neutra
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <strong>Fundo limpo</strong> - Evite fundos muito poluídos ou com muitas pessoas
              </Text>
            </List.Item>
          </List>
        </Box>

        <Box>
          <Group gap="xs" mb="md">
            <X size={20} color="red" />
            <Text fw={600}>Evite:</Text>
          </Group>
          
          <List
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon color="red" size={20} radius="xl">
                <X size={14} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <Text size="sm">
                <Glasses size={14} style={{ display: 'inline', marginRight: 4 }} />
                <strong>Óculos escuros</strong> - Remova óculos de sol ou com lentes muito escuras
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <User size={14} style={{ display: 'inline', marginRight: 4 }} />
                <strong>Bonés, chapéus ou lenços</strong> - Remova acessórios que cubram o rosto ou cabelo
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <Sun size={14} style={{ display: 'inline', marginRight: 4 }} />
                <strong>Luz contra o rosto</strong> - Evite ficar de costas para janelas ou fontes de luz forte
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <strong>Máscaras ou coberturas faciais</strong> - O rosto deve estar completamente visível
              </Text>
            </List.Item>
          </List>
        </Box>

        <Paper p="sm" withBorder style={{ backgroundColor: 'color-mix(in srgb, var(--ui-primary) 10%, var(--ui-surface))', borderColor: 'color-mix(in srgb, var(--ui-primary) 40%, var(--ui-border))' }}>
          <Text size="xs" ta="center">
            💡 <strong>Dica:</strong> Uma foto de qualidade garante maior precisão no reconhecimento facial
          </Text>
        </Paper>

        <Group justify="space-between" mt="md">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            leftSection={<Camera size={18} />}
            onClick={onContinue}
          >
            Entendi, Continuar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
