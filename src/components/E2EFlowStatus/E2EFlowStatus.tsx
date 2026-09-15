import { useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@/components/ui';
import {
  CheckCircle2,
  CircleDashed,
  ListChecks,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { E2EFlow, E2EFlowResult } from '../../lib/e2eFlowCatalog';
import { flowCatalog } from '../../lib/e2eFlowCatalog';
import { Header } from '../Header/Header';
import './E2EFlowStatus.css';

type StatusMeta = {
  label: string;
  description: string;
  color: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const statusMeta: Record<E2EFlowResult, StatusMeta> = {
  approved: {
    label: 'Aprovado',
    description: 'Automatizado e aprovado na última rodada local.',
    color: 'green',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pendente',
    description: 'Ainda não coberto pela suíte automatizada.',
    color: 'yellow',
    icon: CircleDashed,
  },
  rejected: {
    label: 'Reprovado',
    description: 'Encontrou uma falha que precisa ser corrigida.',
    color: 'red',
    icon: XCircle,
  },
};

const statusOrder: E2EFlowResult[] = ['approved', 'pending', 'rejected'];

const resultOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'rejected', label: 'Reprovados' },
];

const formatProfiles = (profiles: string[]) => profiles.join(' · ');

function FlowCard({ flow }: { flow: E2EFlow }) {
  const meta = statusMeta[flow.result];
  const StatusIcon = meta.icon;

  return (
    <Paper
      className={`e2e-flow-card e2e-flow-card--${flow.result}`}
      withBorder
      data-testid={`e2e-flow-${flow.id}`}
    >
      <Box className="e2e-flow-card__status-icon" aria-hidden="true">
        <StatusIcon size={20} strokeWidth={2.2} />
      </Box>
      <Box className="e2e-flow-card__content">
        <Group className="e2e-flow-card__heading" gap="xs" wrap="wrap">
          <Text className="e2e-flow-card__title" fw={700}>{flow.title}</Text>
          {flow.critical && <Badge className="e2e-flow-card__critical" variant="light">Crítico</Badge>}
        </Group>
        <Text className="e2e-flow-card__meta" size="sm">
          {flow.area} · Perfil: {formatProfiles(flow.profiles)}
        </Text>
        <Group className="e2e-flow-card__footer" gap="xs" wrap="wrap">
          <Badge className="e2e-flow-card__result" color={meta.color} variant="light">
            {meta.label}
          </Badge>
          <Badge className="e2e-flow-card__automation" variant="outline">
            {flow.automationStatus === 'automated' ? 'Playwright ativo' : 'Cobertura planejada'}
          </Badge>
        </Group>
      </Box>
    </Paper>
  );
}

function EmptyStatus({ result }: { result: E2EFlowResult }) {
  const meta = statusMeta[result];
  const StatusIcon = result === 'rejected' ? ShieldAlert : ListChecks;

  return (
    <Paper className={`e2e-flow-empty e2e-flow-empty--${result}`} withBorder>
      <StatusIcon size={22} aria-hidden="true" />
      <Box>
        <Text fw={700}>
          {result === 'rejected' ? 'Nenhum fluxo reprovado nesta rodada' : `Nenhum fluxo ${meta.label.toLowerCase()} na busca`}
        </Text>
        <Text size="sm">{result === 'rejected' ? 'Os testes executados até agora não deixaram falhas abertas.' : 'Ajuste os filtros para ver outros fluxos.'}</Text>
      </Box>
    </Paper>
  );
}

export function E2EFlowStatus() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [result, setResult] = useState('all');

  const areas = useMemo(() => [
    { value: 'all', label: 'Todas as áreas' },
    ...Array.from(new Set(flowCatalog.map((flow) => flow.area)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((item) => ({ value: item, label: item })),
  ], []);

  const counts = useMemo(() => flowCatalog.reduce<Record<E2EFlowResult, number>>((acc, flow) => {
    acc[flow.result] += 1;
    return acc;
  }, { approved: 0, pending: 0, rejected: 0 }), []);

  const filteredFlows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return flowCatalog.filter((flow) => {
      const matchesQuery = !normalizedQuery || [flow.title, flow.area, ...flow.profiles]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedQuery);
      const matchesArea = area === 'all' || flow.area === area;
      const matchesResult = result === 'all' || flow.result === result;
      return matchesQuery && matchesArea && matchesResult;
    });
  }, [area, query, result]);

  const coverage = Math.round((counts.approved / flowCatalog.length) * 100);

  return (
    <Box className="e2e-flow-status-page" style={{ minHeight: '100%' }}>
      <Header back={{ label: 'Voltar', onClick: () => navigate('/dashboard') }} contextLabel="Cobertura de fluxos" />

      <main className="e2e-flow-status-shell" data-testid="e2e-flow-status-page">
        <section className="e2e-flow-status-hero">
          <Box>
            <Text className="e2e-flow-status-eyebrow">QUALIDADE · REGRESSÃO</Text>
            <Title order={1} className="e2e-flow-status-title">Cobertura de fluxos</Title>
            <Text className="e2e-flow-status-description">
              Acompanhe o que já foi validado no produto e o que ainda precisa entrar na suíte automatizada.
            </Text>
          </Box>
          <Paper className="e2e-flow-status-hero-note" withBorder>
            <Text className="e2e-flow-status-hero-note__label">Base do painel</Text>
            <Text className="e2e-flow-status-hero-note__value">Catálogo E2E do repositório</Text>
            <Text className="e2e-flow-status-hero-note__hint">Atualizado junto com a cobertura Playwright.</Text>
          </Paper>
        </section>

        <section className="e2e-flow-summary" aria-label="Resumo da cobertura">
          <Paper className="e2e-flow-summary-card e2e-flow-summary-card--approved" withBorder data-testid="e2e-summary-approved">
            <CheckCircle2 size={19} aria-hidden="true" />
            <Text className="e2e-flow-summary-card__label">Aprovados</Text>
            <Text className="e2e-flow-summary-card__value">{counts.approved}</Text>
            <Text className="e2e-flow-summary-card__hint">fluxos validados</Text>
          </Paper>
          <Paper className="e2e-flow-summary-card e2e-flow-summary-card--pending" withBorder data-testid="e2e-summary-pending">
            <CircleDashed size={19} aria-hidden="true" />
            <Text className="e2e-flow-summary-card__label">Pendentes</Text>
            <Text className="e2e-flow-summary-card__value">{counts.pending}</Text>
            <Text className="e2e-flow-summary-card__hint">fluxos ainda sem teste</Text>
          </Paper>
          <Paper className="e2e-flow-summary-card e2e-flow-summary-card--rejected" withBorder data-testid="e2e-summary-rejected">
            <XCircle size={19} aria-hidden="true" />
            <Text className="e2e-flow-summary-card__label">Reprovados</Text>
            <Text className="e2e-flow-summary-card__value">{counts.rejected}</Text>
            <Text className="e2e-flow-summary-card__hint">falhas abertas</Text>
          </Paper>
          <Paper className="e2e-flow-progress-card" withBorder>
            <Group justify="space-between" gap="sm">
              <Text className="e2e-flow-summary-card__label">Cobertura aprovada</Text>
              <Text className="e2e-flow-progress-card__value">{coverage}%</Text>
            </Group>
            <Progress value={coverage} aria-label={`Cobertura aprovada: ${coverage}%`} />
            <Text className="e2e-flow-summary-card__hint">{counts.approved} de {flowCatalog.length} fluxos no catálogo</Text>
          </Paper>
        </section>

        <section className="e2e-flow-list-panel">
          <Group className="e2e-flow-list-header" justify="space-between" align="flex-end" gap="md" wrap="wrap">
            <Box>
              <Text className="e2e-flow-list-eyebrow">INVENTÁRIO FUNCIONAL</Text>
              <Title order={2} className="e2e-flow-list-title">Status da regressão</Title>
              <Text className="e2e-flow-list-description">Cada item representa um fluxo de negócio, não apenas uma tela isolada.</Text>
            </Box>
            <Text className="e2e-flow-list-count">{filteredFlows.length} de {flowCatalog.length} fluxos exibidos</Text>
          </Group>

          <Group className="e2e-flow-filters" align="flex-end" gap="sm" wrap="wrap">
            <TextInput
              className="e2e-flow-filter-search"
              label="Buscar fluxo"
              placeholder="Paciente, agenda, laudo..."
              leftSection={<Search size={16} aria-hidden="true" />}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              aria-label="Buscar fluxos de teste"
            />
            <Select className="e2e-flow-filter-select" label="Área" data={areas} value={area} onChange={(value) => setArea(value || 'all')} aria-label="Filtrar por área" />
            <Select className="e2e-flow-filter-select" label="Status" data={resultOptions} value={result} onChange={(value) => setResult(value || 'all')} aria-label="Filtrar por status" />
          </Group>

          <Stack className="e2e-flow-sections" gap="xl">
            {statusOrder.map((status) => {
              const flows = filteredFlows.filter((flow) => flow.result === status);
              const meta = statusMeta[status];
              return (
                <section key={status} className={`e2e-flow-section e2e-flow-section--${status}`} aria-labelledby={`e2e-flow-section-${status}`}>
                  <Group className="e2e-flow-section__header" justify="space-between" align="center" gap="sm">
                    <Group gap="xs" wrap="nowrap">
                      <Box className="e2e-flow-section__marker" aria-hidden="true" />
                      <Title id={`e2e-flow-section-${status}`} order={3}>{meta.label}</Title>
                    </Group>
                    <Badge color={meta.color} variant="light">{flows.length} {flows.length === 1 ? 'fluxo' : 'fluxos'}</Badge>
                  </Group>
                  {flows.length > 0 ? (
                    <div className="e2e-flow-grid">{flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}</div>
                  ) : <EmptyStatus result={status} />}
                </section>
              );
            })}
          </Stack>
        </section>
      </main>
    </Box>
  );
}
