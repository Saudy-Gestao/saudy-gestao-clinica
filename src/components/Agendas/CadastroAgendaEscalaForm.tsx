import { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { Plus, Trash2, X } from 'lucide-react';
import { showNotification } from '@mantine/notifications';
import { DARK_BLUE } from '../../themes/theme';
import { FloatingInput } from '../common/FloatingInput';
import { FloatingMultiSelect } from '../common/FloatingMultiSelect';
import { FloatingSelect } from '../common/FloatingSelect';
import agendaService from '../../services/agendaService';
import { resolveApiErrorMessage } from '../../lib/apiError';
import { isRoomSector } from '../../utils/sectorClassification';
import './CadastroAgendas.css';

type Option = { value: string; label: string };

type ScaleSlot = {
  key: string;
  shiftStart: string;
  shiftEnd: string;
  startDate: string;
  endDate: string;
  status: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
  especialidadeIds: string[];
  roomId: string;
  durationMinutes: string;
};

type ScaleBlock = {
  key: string;
  days: string[];
  slots: ScaleSlot[];
};

const DAYS = [
  { value: 'domingo', short: 'D', label: 'Domingo' },
  { value: 'segunda', short: 'S', label: 'Segunda-feira' },
  { value: 'terca', short: 'T', label: 'Terça-feira' },
  { value: 'quarta', short: 'Q', label: 'Quarta-feira' },
  { value: 'quinta', short: 'Q', label: 'Quinta-feira' },
  { value: 'sexta', short: 'S', label: 'Sexta-feira' },
  { value: 'sabado', short: 'S', label: 'Sábado' },
];

const STATUS_OPTIONS = [
  { value: 'ATIVA', label: 'Ativa' },
  { value: 'INATIVA', label: 'Inativa' },
  { value: 'BLOQUEADA', label: 'Pausada' },
];

const RECURRENCE_OPTIONS = [
  { value: 'semana', label: 'Semana(s)' },
  { value: 'dia', label: 'Dia(s)' },
  { value: 'mes', label: 'Mês(es)' },
];

const DURATION_OPTIONS = Array.from({ length: 60 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1} min`,
}));

const STATUS_COLOR: Record<string, string> = {
  ATIVA: 'green',
  INATIVA: 'gray',
  BLOQUEADA: 'red',
};

const makeKey = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const makeSlot = (especialidadeIds: string[] = []): ScaleSlot => ({
  key: makeKey(),
  shiftStart: '08:00',
  shiftEnd: '12:00',
  startDate: '',
  endDate: '',
  status: 'ATIVA',
  especialidadeIds,
  roomId: '',
  durationMinutes: '30',
});

const dayLabel = (value: string) => DAYS.find((day) => day.value === value)?.label || value;

interface CadastroAgendaEscalaFormProps {
  branchOptions: Option[];
  doctors: any[];
  especialidades: any[];
  rooms: any[];
  interns: any[];
  isMobile: boolean;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}

export function CadastroAgendaEscalaForm({
  branchOptions,
  doctors,
  especialidades,
  rooms,
  interns,
  isMobile,
  onCancel,
  onSaved,
}: CadastroAgendaEscalaFormProps) {
  const [branchId, setBranchId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [especialidadeIds, setEspecialidadeIds] = useState<string[]>([]);
  const [internIds, setInternIds] = useState<string[]>([]);
  const [repeatEvery, setRepeatEvery] = useState('1');
  const [repeatUnit, setRepeatUnit] = useState('semana');
  const [blocks, setBlocks] = useState<ScaleBlock[]>([]);
  const [draft, setDraft] = useState<ScaleBlock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const doctor = useMemo(() => doctors.find((item) => item.id === doctorId), [doctors, doctorId]);

  const doctorOptions = useMemo(() => doctors
    .filter((item) => !branchId || (Array.isArray(item.branchIds) && item.branchIds.includes(branchId)) || item.branchId === branchId)
    .map((item) => ({ value: item.id, label: item.name })), [doctors, branchId]);

  const doctorSpecialtyIds = useMemo(() => new Set(
    (Array.isArray(doctor?.especialidadeGroups) ? doctor.especialidadeGroups : [])
      .map((group: any) => group?.especialidadeId)
      .filter(Boolean),
  ), [doctor]);

  const specialtyOptions = useMemo(() => especialidades
    .filter((item) => item?.id && (doctorSpecialtyIds.size === 0 || doctorSpecialtyIds.has(item.id)))
    .map((item) => ({ value: item.id, label: item.name })), [especialidades, doctorSpecialtyIds]);

  const roomOptions = useMemo(() => {
    const modalityIds = new Set(
      (Array.isArray(doctor?.especialidadeGroups) ? doctor.especialidadeGroups : [])
        .map((group: any) => group?.modalidadeId)
        .filter(Boolean),
    );
    return rooms
      .filter((room) => isRoomSector(room))
      .filter((room) => !branchId || room.branchId === branchId)
      .filter((room) => modalityIds.size === 0 || (room.modalidadeId && modalityIds.has(room.modalidadeId)))
      .map((room) => ({ value: room.id, label: room.name }));
  }, [rooms, doctor, branchId]);

  const internOptions = useMemo(() => interns
    .filter((item) => item?.id && item.isActive !== false && (!branchId || item.branchId === branchId))
    .map((item) => ({ value: item.id, label: item.name })), [interns, branchId]);

  const assignedDays = useMemo(() => new Set(blocks.flatMap((block) => block.days)), [blocks]);
  const availableDays = DAYS.filter((day) => !assignedDays.has(day.value));

  const updateDraft = (key: keyof ScaleSlot, value: string | string[]) => {
    setDraft((current) => current ? ({
      ...current,
      slots: current.slots.map((slot, index) => index === 0 ? { ...slot, [key]: value } : slot),
    }) : current);
  };

  const updateDraftSlot = (slotKey: string, key: keyof ScaleSlot, value: string | string[]) => {
    setDraft((current) => current ? ({
      ...current,
      slots: current.slots.map((slot) => slot.key === slotKey ? { ...slot, [key]: value } : slot),
    }) : current);
  };

  const updateSavedSlot = (blockKey: string, slotKey: string, key: keyof ScaleSlot, value: string | string[]) => {
    setBlocks((current) => current.map((block) => block.key !== blockKey ? block : ({
      ...block,
      slots: block.slots.map((slot) => slot.key === slotKey ? { ...slot, [key]: value } : slot),
    })));
  };

  const toggleDraftDay = (day: string) => {
    setDraft((current) => {
      if (!current) return current;
      const days = current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day];
      return { ...current, days };
    });
    setError(null);
  };

  const startNewBlock = () => {
    if (draft) return;
    setError(null);
    setDraft({ key: makeKey(), days: [], slots: [makeSlot(especialidadeIds)] });
  };

  const addSlot = () => {
    setDraft((current) => current ? ({ ...current, slots: [...current.slots, makeSlot(especialidadeIds)] }) : current);
  };

  const addSavedSlot = (blockKey: string) => {
    setBlocks((current) => current.map((block) => block.key !== blockKey ? block : ({
      ...block,
      slots: [...block.slots, makeSlot(especialidadeIds)],
    })));
  };

  const validateSlot = (slot: ScaleSlot) => {
    if (!slot.shiftStart || !slot.shiftEnd) return 'Preencha o início e o fim do horário.';
    if (slot.shiftEnd <= slot.shiftStart) return 'O fim do horário deve ser maior que o início.';
    if (slot.startDate && slot.endDate && slot.endDate < slot.startDate) return 'A data final deve ser posterior à data inicial.';
    return null;
  };

  const saveDraftBlock = () => {
    if (!draft || draft.days.length === 0) {
      setError('Selecione pelo menos um dia para o bloco.');
      return;
    }
    const slotError = draft.slots.map(validateSlot).find(Boolean);
    if (slotError) {
      setError(slotError || null);
      return;
    }
    setBlocks((current) => [...current, draft]);
    setDraft(null);
    setError(null);
  };

  const removeBlock = (key: string) => setBlocks((current) => current.filter((block) => block.key !== key));

  const editBlock = (block: ScaleBlock) => {
    setBlocks((current) => current.filter((item) => item.key !== block.key));
    setDraft(block);
    setError(null);
  };

  const validateForm = () => {
    if (!branchId || !doctorId) return 'Selecione a unidade e o profissional.';
    if (blocks.length === 0) return 'Crie e salve pelo menos um bloco de atendimento.';
    if (blocks.some((block) => block.days.length === 0 || block.slots.length === 0)) return 'Todos os blocos precisam ter dias e horários.';
    const slotError = blocks.flatMap((block) => block.slots.map(validateSlot)).find(Boolean);
    return slotError || null;
  };

  const handleSave = async () => {
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }

    setSaving(true);
    setError(null);
    let successCount = 0;
    let firstError: string | null = null;

    for (const block of blocks) {
      for (const day of block.days) {
        for (const slot of block.slots) {
          try {
            await agendaService.createAgenda({
              branchId,
              doctorId,
              weekday: day,
              shiftStart: slot.shiftStart,
              shiftEnd: slot.shiftEnd,
              // The current Agenda API stores one specialty per schedule slot.
              especialidadeId: slot.especialidadeIds[0] || especialidadeIds[0] || null,
              roomId: slot.roomId || null,
              startDate: slot.startDate || null,
              endDate: slot.endDate || null,
              status: slot.status,
            });
            successCount += 1;
          } catch (err: any) {
            if (!firstError) {
              const errorCode = err?.response?.data?.error;
              firstError = errorCode === 'AGENDA_OVERLAP'
                ? 'Existe uma agenda ativa sobrepondo um dos horários informados.'
                : resolveApiErrorMessage(err, 'Não foi possível salvar a escala.');
            }
          }
        }
      }
    }

    setSaving(false);
    if (firstError) {
      setError(successCount ? `${successCount} horário(s) salvo(s). ${firstError}` : firstError);
      return;
    }
    showNotification({ title: 'Escala salva', message: `${successCount} horário(s) de agenda cadastrado(s) com sucesso.`, color: 'green' });
    await onSaved();
  };

  const renderSlotFields = (slot: ScaleSlot, onChange: (key: keyof ScaleSlot, value: string | string[]) => void, onRemove?: () => void) => (
    <Box className="cadastro-agenda-slot" key={slot.key}>
      <Group className="cadastro-agenda-slot-heading" justify="space-between" align="center" mb="sm">
        <Text fw={700} size="sm">Horário {slot.key ? '' : ''}</Text>
        {onRemove ? (
          <Button variant="subtle" color="red" size="compact-sm" leftSection={<Trash2 size={14} />} onClick={onRemove}>
            Remover horário
          </Button>
        ) : null}
      </Group>
      <Box className="cadastro-agenda-slot-grid">
        <FloatingInput label="Início" type="time" value={slot.shiftStart} onChange={(event) => onChange('shiftStart', event.currentTarget.value)} />
        <FloatingInput label="Fim" type="time" value={slot.shiftEnd} onChange={(event) => onChange('shiftEnd', event.currentTarget.value)} />
        <FloatingInput label="Data inicial" type="date" value={slot.startDate} onChange={(event) => onChange('startDate', event.currentTarget.value)} />
        <FloatingInput label="Data final" type="date" value={slot.endDate} onChange={(event) => onChange('endDate', event.currentTarget.value)} />
        <FloatingSelect label="Status" data={STATUS_OPTIONS} value={slot.status} onChange={(value) => onChange('status', value || 'ATIVA')} />
        <FloatingMultiSelect
          label="Especialidade"
          data={specialtyOptions}
          value={slot.especialidadeIds}
          onChange={(value) => onChange('especialidadeIds', value)}
          placeholder="Herdar dos filtros"
          searchable
          clearable
        />
        <FloatingSelect label="Sala" data={roomOptions} value={slot.roomId || null} onChange={(value) => onChange('roomId', value || '')} placeholder="Sem sala" searchable clearable />
        <FloatingSelect label="Tempo" data={DURATION_OPTIONS} value={slot.durationMinutes} onChange={(value) => onChange('durationMinutes', value || '30')} searchable />
      </Box>
    </Box>
  );

  return (
    <Box className="cadastro-agenda-scale-form">
      <Group className="cadastro-agenda-form-intro" justify="space-between" align="flex-start" wrap="wrap">
        <Box>
          <Text className="cadastro-agenda-form-kicker">NOVA CONFIGURAÇÃO</Text>
          <Text className="cadastro-agenda-form-title" fw={700}>Cadastro de agenda</Text>
          <Text c="dimmed" maw={760}>Defina unidade, especialidade, profissional e os blocos de horário da semana.</Text>
        </Box>
        <Button variant="default" onClick={onCancel} disabled={saving}>Cancelar cadastro</Button>
      </Group>

      <Box className="cadastro-agenda-form-section">
        <Box className="cadastro-agenda-form-section-heading">
          <Text className="cadastro-agenda-form-section-title" fw={700}>Filtros</Text>
          <Text size="sm" c="dimmed">Selecione a unidade, o profissional e uma ou mais especialidades.</Text>
        </Box>
        <Box className="cadastro-agenda-filter-grid">
          <FloatingSelect
            label="Unidade"
            required
            data={branchOptions}
            value={branchId || null}
            onChange={(value) => { setBranchId(value || ''); setDoctorId(''); setEspecialidadeIds([]); setInternIds([]); }}
            placeholder="Selecione"
            searchable
          />
          <FloatingMultiSelect
            label="Especialidade"
            data={specialtyOptions}
            value={especialidadeIds}
            onChange={setEspecialidadeIds}
            placeholder="Selecione uma ou mais"
            searchable
            clearable
            disabled={!doctorId}
          />
          <FloatingSelect
            label="Profissional"
            required
            data={doctorOptions}
            value={doctorId || null}
            onChange={(value) => { setDoctorId(value || ''); setEspecialidadeIds([]); setInternIds([]); }}
            placeholder={branchId ? 'Selecione' : 'Selecione uma unidade primeiro'}
            searchable
            disabled={!branchId}
          />
        </Box>
        <Box mt="lg">
          <FloatingMultiSelect
            label="Estagiários (opcional)"
            data={internOptions}
            value={internIds}
            onChange={setInternIds}
            placeholder="Adicionar estagiários"
            searchable
            clearable
            disabled={!branchId}
          />
        </Box>
      </Box>

      <Box className="cadastro-agenda-form-section">
        <Box className="cadastro-agenda-form-section-heading">
          <Text className="cadastro-agenda-form-section-title" fw={700}>Recorrência</Text>
          <Text size="sm" c="dimmed">Frequência com que essa escala se repete.</Text>
        </Box>
        <Group className="cadastro-agenda-recurrence-row" align="flex-end" wrap="wrap">
          <FloatingInput label="Repetir a cada" type="number" min={1} value={repeatEvery} onChange={(event) => setRepeatEvery(event.currentTarget.value)} />
          <FloatingSelect label="Unidade" data={RECURRENCE_OPTIONS} value={repeatUnit} onChange={(value) => setRepeatUnit(value || 'semana')} />
        </Group>
      </Box>

      <Box className="cadastro-agenda-form-section">
        <Box className="cadastro-agenda-form-section-heading">
          <Text className="cadastro-agenda-form-section-title" fw={700}>Definir escala de atendimento</Text>
          <Text size="sm" c="dimmed">Monte um bloco com os dias que têm a mesma escala, configure e salve. Depois crie outro bloco para os dias restantes.</Text>
        </Box>

        {blocks.length === 0 && !draft ? (
          <Paper className="cadastro-agenda-empty-blocks" withBorder p="lg">
            <Text size="sm" c="dimmed">Nenhum bloco criado ainda.</Text>
          </Paper>
        ) : null}

        <Stack gap="md">
          {blocks.map((block, index) => (
            <Paper className="cadastro-agenda-block-card" key={block.key} withBorder p={isMobile ? 'sm' : 'md'}>
              <Group justify="space-between" align="flex-start" wrap="wrap" mb="md">
                <Box>
                  <Text fw={700}>Bloco {index + 1}</Text>
                  <Group gap={6} mt={6}>
                    {block.days.map((day) => <Badge key={day} variant="light" color="darkBlue">{dayLabel(day)}</Badge>)}
                  </Group>
                </Box>
                <Group gap="xs">
                  <Button variant="subtle" size="compact-sm" onClick={() => editBlock(block)}>Editar bloco</Button>
                  <Button variant="subtle" color="red" size="compact-sm" leftSection={<X size={14} />} onClick={() => removeBlock(block.key)}>Remover</Button>
                </Group>
              </Group>
              <Stack gap="sm">
                {block.slots.map((slot) => renderSlotFields(slot, (key, value) => updateSavedSlot(block.key, slot.key, key, value), block.slots.length > 1 ? () => setBlocks((current) => current.map((item) => item.key !== block.key ? item : ({ ...item, slots: item.slots.filter((entry) => entry.key !== slot.key) }))) : undefined))}
              </Stack>
              <Button variant="default" size="sm" mt="md" leftSection={<Plus size={15} />} onClick={() => addSavedSlot(block.key)}>Adicionar horário</Button>
            </Paper>
          ))}
        </Stack>

        {draft ? (
          <Paper className="cadastro-agenda-draft-card" withBorder p={isMobile ? 'sm' : 'md'} mt="md">
            <Text className="cadastro-agenda-draft-label">NOVO BLOCO — SELECIONE OS DIAS COM A MESMA ESCALA</Text>
            <Group className="cadastro-agenda-day-picker" gap="xs" mt="md" wrap="wrap">
              {DAYS.map((day) => {
                const disabled = assignedDays.has(day.value);
                const selected = draft.days.includes(day.value);
                return (
                  <Button
                    key={day.value}
                    className={selected ? 'is-selected' : undefined}
                    variant={selected ? 'filled' : 'default'}
                    color={selected ? 'darkBlue' : 'gray'}
                    size="sm"
                    disabled={disabled}
                    onClick={() => toggleDraftDay(day.value)}
                  >
                    <Text span fw={700}>{day.short}</Text><Text span size="xs" ml={5}>{day.label}</Text>
                  </Button>
                );
              })}
            </Group>
            <Divider my="lg" />
            <Stack gap="sm">
              {draft.slots.map((slot) => renderSlotFields(slot, (key, value) => updateDraftSlot(slot.key, key, value), draft.slots.length > 1 ? () => setDraft((current) => current ? ({ ...current, slots: current.slots.filter((entry) => entry.key !== slot.key) }) : current) : undefined))}
            </Stack>
            <Group justify="space-between" mt="md" wrap="wrap">
              <Button variant="default" size="sm" leftSection={<Plus size={15} />} onClick={addSlot}>Adicionar horário</Button>
              <Group gap="xs">
                <Button variant="subtle" size="sm" onClick={() => setDraft(null)}>Cancelar bloco</Button>
                <Button bg={DARK_BLUE} size="sm" onClick={saveDraftBlock}>Salvar bloco</Button>
              </Group>
            </Group>
          </Paper>
        ) : null}

        <Button
          className="cadastro-agenda-new-block"
          variant="light"
          leftSection={<Plus size={16} />}
          mt="md"
          onClick={startNewBlock}
          disabled={Boolean(draft) || availableDays.length === 0}
        >
          {availableDays.length === 0 ? 'Todos os dias já têm bloco' : 'Novo bloco'}
        </Button>
        <Text size="xs" c="dimmed" mt="md">Pausado: o profissional atende os pacientes já agendados, mas não recebe novos agendamentos até o fim da data definida na agenda.</Text>
      </Box>

      <Box className="cadastro-agenda-form-section">
        <Box className="cadastro-agenda-form-section-heading">
          <Text className="cadastro-agenda-form-section-title" fw={700}>Resumo da escala</Text>
        </Box>
        <Paper className="cadastro-agenda-summary" withBorder p="md">
          {!branchId && !doctorId && blocks.length === 0 ? (
            <Text size="sm" c="dimmed">Preencha os campos acima para gerar o resumo.</Text>
          ) : (
            <Stack gap={5}>
              <Text fw={700}>{doctor?.name || 'Profissional não selecionado'}{branchId ? ` · ${branchOptions.find((item) => item.value === branchId)?.label || ''}` : ''}</Text>
              <Text size="sm" c="dimmed">Especialidades: {especialidadeIds.length ? especialidadeIds.map((id) => specialtyOptions.find((item) => item.value === id)?.label).filter(Boolean).join(', ') : 'não definidas'}</Text>
              <Text size="sm" c="dimmed">Recorrência: a cada {repeatEvery || '1'} {RECURRENCE_OPTIONS.find((item) => item.value === repeatUnit)?.label.toLowerCase() || 'semana(s)'}</Text>
              <Text size="sm" c="dimmed">{blocks.length} bloco(s), {blocks.reduce((total, block) => total + block.days.length * block.slots.length, 0)} horário(s) configurado(s).</Text>
              {internIds.length ? <Text size="sm" c="dimmed">Estagiários: {internIds.map((id) => internOptions.find((item) => item.value === id)?.label).filter(Boolean).join(', ')}</Text> : null}
            </Stack>
          )}
        </Paper>
      </Box>

      {error ? <Text className="cadastro-agenda-form-error" c="red" size="sm">{error}</Text> : null}

      <Group className="cadastro-agenda-form-actions" justify="space-between" mt="lg" wrap="wrap">
        <Button variant="default" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button bg={DARK_BLUE} onClick={handleSave} loading={saving} disabled={saving}>Salvar escala</Button>
      </Group>
    </Box>
  );
}
