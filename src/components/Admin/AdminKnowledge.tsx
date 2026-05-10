import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BookOpen, Check, RefreshCw, Trash2, X } from 'lucide-react';
import { Header } from '../Header/Header';
import aiHelpService, { type KnowledgeSuggestion } from '../../services/aiHelpService';

const STATUS_LABELS: Record<string, string> = {
  pending:  'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'yellow',
  approved: 'green',
  rejected: 'red',
};

function SuggestionCard({
  item,
  onUpdated,
  onDeleted,
}: {
  item: KnowledgeSuggestion;
  onUpdated: (updated: KnowledgeSuggestion) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState(item.answer);
  const [loading, setLoading] = useState(false);

  const update = async (status: string, answer?: string) => {
    setLoading(true);
    try {
      const updated = await aiHelpService.updateSuggestion(item.id, status, answer);
      onUpdated(updated);
      setEditing(false);
      notifications.show({
        title: status === 'approved' ? 'Aprovada!' : 'Rejeitada',
        message: status === 'approved' ? 'Sugestão marcada como aprovada.' : 'Sugestão rejeitada.',
        color: status === 'approved' ? 'green' : 'red',
      });
    } catch {
      notifications.show({ title: 'Erro', message: 'Não foi possível atualizar a sugestão.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    setLoading(true);
    try {
      await aiHelpService.deleteSuggestion(item.id);
      onDeleted(item.id);
    } catch {
      notifications.show({ title: 'Erro', message: 'Não foi possível excluir.', color: 'red' });
      setLoading(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Group gap="xs">
            <Badge color={STATUS_COLORS[item.status]} variant="light" size="sm">
              {STATUS_LABELS[item.status]}
            </Badge>
            <Text size="xs" c="dimmed">
              {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Group>
          <Button variant="subtle" size="xs" color="gray" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Recolher' : 'Expandir'}
          </Button>
        </Group>

        {/* Question */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }} mb={2}>Pergunta</Text>
          <Text size="sm" fw={500}>{item.question}</Text>
        </Box>

        {/* Answer */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }} mb={4}>Resposta gerada</Text>
          {editing ? (
            <Textarea
              value={editedAnswer}
              onChange={(e) => setEditedAnswer(e.currentTarget.value)}
              minRows={4}
              autosize
              radius="md"
            />
          ) : (
            <Text size="sm" lh={1.7} style={{ whiteSpace: 'pre-wrap' }}>
              {item.answer}
            </Text>
          )}
        </Box>

        {/* Code context (expandable) */}
        {expanded && item.codeContext && (
          <Box>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }} mb={4}>Contexto do código</Text>
            <Box
              style={{
                background: 'var(--mantine-color-dark-8)',
                borderRadius: 8,
                padding: '10px 14px',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Text size="xs" c="gray.4" ff="monospace" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {item.codeContext}
              </Text>
            </Box>
          </Box>
        )}

        {/* Actions */}
        {item.status === 'pending' && (
          <Group gap="xs" pt={4}>
            {editing ? (
              <>
                <Button size="xs" color="green" leftSection={<Check size={12} />} loading={loading}
                  onClick={() => update('approved', editedAnswer)}>
                  Aprovar com edição
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={() => { setEditing(false); setEditedAnswer(item.answer); }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button size="xs" color="green" leftSection={<Check size={12} />} loading={loading}
                  onClick={() => update('approved')}>
                  Aprovar
                </Button>
                <Button size="xs" variant="light" color="gray" onClick={() => setEditing(true)}>
                  Editar e aprovar
                </Button>
                <Button size="xs" color="red" variant="light" leftSection={<X size={12} />} loading={loading}
                  onClick={() => update('rejected')}>
                  Rejeitar
                </Button>
              </>
            )}
            <Button size="xs" variant="subtle" color="gray" leftSection={<Trash2 size={12} />} loading={loading}
              onClick={remove}>
              Excluir
            </Button>
          </Group>
        )}
        {item.status !== 'pending' && (
          <Group gap="xs" pt={4}>
            <Button size="xs" variant="subtle" color="gray" leftSection={<Trash2 size={12} />} loading={loading}
              onClick={remove}>
              Excluir
            </Button>
            {item.reviewedAt && (
              <Text size="xs" c="dimmed">
                Revisada em {new Date(item.reviewedAt).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

export function AdminKnowledge() {
  const [items, setItems] = useState<KnowledgeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [reindexing, setReindexing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = async (status: string) => {
    abortRef.current?.abort();
    setLoading(true);
    try {
      const data = await aiHelpService.getSuggestions(status === 'all' ? undefined : status);
      setItems(data);
    } catch {
      notifications.show({ title: 'Erro', message: 'Não foi possível carregar as sugestões.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const result = await aiHelpService.reindex();
      notifications.show({
        title: 'Reindexação concluída',
        message: `${result.repos} repos · ${result.files} arquivos · ${result.chunks} chunks`,
        color: 'green',
      });
    } catch {
      notifications.show({ title: 'Erro', message: 'Falha ao reindexar repositórios.', color: 'red' });
    } finally {
      setReindexing(false);
    }
  };

  const pending = items.filter((i) => i.status === 'pending').length;

  return (
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Header />
      <Box p="xl" maw={960} mx="auto">
        <Stack gap="xl">

          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <ThemeIcon size="xl" radius="md" color="darkBlue" variant="light">
                <BookOpen size={20} />
              </ThemeIcon>
              <div>
                <Title order={3}>Sugestões de Conhecimento</Title>
                <Text size="sm" c="dimmed">Respostas geradas pela IA que precisam de revisão antes de entrarem na base</Text>
              </div>
            </Group>
            <Button
              variant="light"
              color="gray"
              leftSection={reindexing ? <Loader size={14} /> : <RefreshCw size={14} />}
              size="sm"
              onClick={handleReindex}
              loading={reindexing}
            >
              Reindexar repositórios
            </Button>
          </Group>

          <Group>
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              data={[
                { label: `Pendentes${pending > 0 ? ` (${pending})` : ''}`, value: 'pending' },
                { label: 'Aprovadas', value: 'approved' },
                { label: 'Rejeitadas', value: 'rejected' },
                { label: 'Todas', value: 'all' },
              ]}
            />
          </Group>

          {loading ? (
            <Group justify="center" py="xl"><Loader /></Group>
          ) : items.length === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Stack align="center" gap="xs" py="md">
                <BookOpen size={32} strokeWidth={1.5} style={{ opacity: 0.3 }} />
                <Text c="dimmed" ta="center">Nenhuma sugestão {filter !== 'all' ? STATUS_LABELS[filter]?.toLowerCase() : ''} encontrada.</Text>
              </Stack>
            </Paper>
          ) : (
            <Stack gap="sm">
              {items.map((item) => (
                <SuggestionCard
                  key={item.id}
                  item={item}
                  onUpdated={(updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
                  onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                />
              ))}
            </Stack>
          )}

        </Stack>
      </Box>
    </Box>
  );
}
