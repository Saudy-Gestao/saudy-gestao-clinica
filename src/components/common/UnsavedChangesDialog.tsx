import { useEffect, useRef } from 'react';
import { AlertTriangle, ArrowRight, PencilLine } from 'lucide-react';
import { Button, Group, Modal, Text, ThemeIcon } from '@/components/ui';
import './UnsavedChangesDialog.css';

interface UnsavedChangesDialogProps {
  opened: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedChangesDialog({ opened, onStay, onLeave }: UnsavedChangesDialogProps) {
  const stayButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!opened) return undefined;
    stayButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onStay();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [opened, onStay]);

  return (
    <Modal
      opened={opened}
      onClose={onStay}
      title="Alterações não salvas"
      size={500}
      className="unsaved-changes-dialog"
      closeButtonProps={{ 'aria-label': 'Fechar aviso' }}
      footer={(
        <Group className="unsaved-changes-dialog__actions" justify="flex-end" gap="sm">
          <Button ref={stayButtonRef} variant="default" leftSection={<PencilLine size={16} />} onClick={onStay}>
            Continuar editando
          </Button>
          <Button color="red" leftSection={<ArrowRight size={16} />} onClick={onLeave}>
            Sair sem salvar
          </Button>
        </Group>
      )}
    >
      <div className="unsaved-changes-dialog__content">
        <div className="unsaved-changes-dialog__summary">
          <ThemeIcon className="unsaved-changes-dialog__icon" color="yellow" size={48} radius="md">
            <AlertTriangle size={24} aria-hidden="true" />
          </ThemeIcon>
          <div className="unsaved-changes-dialog__copy">
            <Text fw={700}>Este formulário tem dados pendentes</Text>
            <Text c="dimmed">
              O que foi preenchido ainda não foi salvo. Se você sair agora, seu progresso será perdido.
            </Text>
          </div>
        </div>
        <div className="unsaved-changes-dialog__note">
          <Text size="sm" fw={600}>Escolha continuar editando ou sair sem salvar.</Text>
        </div>
      </div>
    </Modal>
  );
}
