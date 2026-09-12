import { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Divider, Group, Modal, Stack, Text, ThemeIcon } from '@/components/ui';
import { Check, GitCommitHorizontal, Sparkles } from 'lucide-react';
import { releaseMetadata, releaseNotes } from '../../config/release';
import './ReleaseNotesModal.css';

export const OPEN_RELEASE_NOTES_EVENT = 'saudy:open-release-notes';
const LAST_SEEN_RELEASE_KEY = 'saudy:last-seen-release';

const RELEASE_AREAS: Array<{ matcher: RegExp; label: string }> = [
  { matcher: /src\/components\/PreAgendamento|src\/components\/Agendas/i, label: 'Agendamento e agendas' },
  { matcher: /src\/components\/Consulta|src\/components\/Teleconsulta/i, label: 'Atendimento clínico' },
  { matcher: /src\/components\/Exames|src\/components\/Laudo/i, label: 'Exames e laudos' },
  { matcher: /src\/components\/Medicos|src\/components\/Patient|src\/components\/Procedimentos/i, label: 'Cadastros clínicos' },
  { matcher: /src\/components\/BI|src\/components\/Dashboard/i, label: 'Indicadores e visão geral' },
  { matcher: /src\/components\/ui|src\/components\/common/i, label: 'Interface e experiência' },
  { matcher: /src\/hooks|src\/services/i, label: 'Fluxos e integrações' },
  { matcher: /vite\.config|package\.json|vercel\.json/i, label: 'Infraestrutura da aplicação' },
];

function readLastSeenRelease() {
  try {
    return window.localStorage.getItem(LAST_SEEN_RELEASE_KEY);
  } catch {
    return null;
  }
}

function markReleaseAsSeen() {
  try {
    window.localStorage.setItem(LAST_SEEN_RELEASE_KEY, releaseMetadata.id);
  } catch {
    // A ausência de localStorage não deve impedir o uso do sistema.
  }
}

function formatCommitDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

interface ReleaseNotesModalProps {
  enabled?: boolean
}

export function ReleaseNotesModal({ enabled = true }: ReleaseNotesModalProps) {
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const [dismissedRelease, setDismissedRelease] = useState<string | null>(null);

  const impactedAreas = useMemo(() => {
    const areas = RELEASE_AREAS
      .filter(({ matcher }) => releaseMetadata.changedFiles.some((file) => matcher.test(file)))
      .map(({ label }) => label);
    return areas.length > 0 ? areas : ['Melhorias gerais do sistema'];
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const openModal = () => setManuallyOpened(true);
    window.addEventListener(OPEN_RELEASE_NOTES_EVENT, openModal);
    return () => window.removeEventListener(OPEN_RELEASE_NOTES_EVENT, openModal);
  }, [enabled]);

  const closeModal = () => {
    markReleaseAsSeen();
    setDismissedRelease(releaseMetadata.id);
    setManuallyOpened(false);
  };

  const notes = releaseNotes.length > 0 ? releaseNotes : [releaseMetadata.title];
  const commitDate = formatCommitDate(releaseMetadata.committedAt);
  const autoOpened = enabled
    && import.meta.env.PROD
    && dismissedRelease !== releaseMetadata.id
    && readLastSeenRelease() !== releaseMetadata.id;
  const opened = enabled && (autoOpened || manuallyOpened);

  return (
    <Modal
      opened={opened}
      onClose={closeModal}
      title="Novidades da versão"
      size={620}
      className="release-notes-modal"
      closeButtonProps={{ 'aria-label': 'Fechar novidades da versão' }}
      footer={(
        <Group className="release-notes-modal__footer" justify="space-between" gap="sm" wrap="wrap">
          <Text size="xs" c="dimmed">
            {releaseMetadata.ref ? `Branch ${releaseMetadata.ref}` : 'Versão publicada'}
            {commitDate ? ` · ${commitDate}` : ''}
          </Text>
          <Button onClick={closeModal} leftSection={<Check size={16} aria-hidden="true" />}>
            Entendi
          </Button>
        </Group>
      )}
    >
      <Stack className="release-notes-modal__content" gap="lg">
        <Box className="release-notes-modal__hero">
          <ThemeIcon className="release-notes-modal__icon" color="blue" size={52} radius="md">
            <Sparkles size={25} aria-hidden="true" />
          </ThemeIcon>
          <Box className="release-notes-modal__hero-copy">
            <Text className="release-notes-modal__eyebrow">ATUALIZAÇÃO DISPONÍVEL</Text>
            <Text className="release-notes-modal__title" component="h3">{releaseMetadata.title}</Text>
            <Text className="release-notes-modal__description" c="dimmed">
              Confira os principais ajustes e melhorias desta publicação.
            </Text>
          </Box>
          <Badge className="release-notes-modal__version" variant="light" color="blue">
            {releaseMetadata.shortSha}
          </Badge>
        </Box>

        <Box className="release-notes-modal__section">
          <Group className="release-notes-modal__section-heading" gap="xs" wrap="nowrap">
            <GitCommitHorizontal size={17} aria-hidden="true" />
            <Text fw={700}>O que mudou</Text>
          </Group>
          <Box component="ul" className="release-notes-modal__notes">
            {notes.map((note, index) => (
              <li key={`${note}-${index}`}>
                <Check size={15} aria-hidden="true" />
                <Text size="sm">{note}</Text>
              </li>
            ))}
          </Box>
        </Box>

        <Divider />

        <Box className="release-notes-modal__section">
          <Text className="release-notes-modal__section-label">Áreas impactadas</Text>
          <Group gap="xs" wrap="wrap">
            {impactedAreas.map((area) => (
              <Badge key={area} variant="light" color="violet">{area}</Badge>
            ))}
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}
