export interface ProfessionalProcedureOption {
  value: string;
  label: string;
}

interface ProfessionalProcedureRecord {
  id?: unknown;
  name?: unknown;
  especialidadeId?: unknown;
  modalidadeId?: unknown;
  modalidades?: unknown;
  especialidade?: {
    id?: unknown;
    modalidadeId?: unknown;
    modalidade?: { id?: unknown } | null;
  } | null;
  modalidade?: { id?: unknown } | null;
}

interface ModalidadeOption {
  value: string;
  label: string;
}

const normalize = (value: unknown) => String(value ?? '').trim();

const getProcedureEspecialidadeId = (procedure: ProfessionalProcedureRecord) => normalize(
  procedure.especialidadeId || procedure.especialidade?.id,
);

const getProcedureModalidadeId = (procedure: ProfessionalProcedureRecord) => normalize(
  procedure.especialidade?.modalidadeId
    || procedure.especialidade?.modalidade?.id
    || procedure.modalidadeId
    || procedure.modalidade?.id,
);

export function getProfessionalProcedureOptions(
  procedures: ProfessionalProcedureRecord[],
  selectedModalidadeIds: Set<string>,
  modalidades: ModalidadeOption[],
  selectedEspecialidadeIds: Set<string>,
): ProfessionalProcedureOption[] {
  const selectedModalidades = modalidades.filter((option) => selectedModalidadeIds.has(option.value));
  const hasEspecialidadeFilter = selectedEspecialidadeIds.size > 0;

  return procedures
    .filter((procedure) => {
      const procedureEspecialidadeId = getProcedureEspecialidadeId(procedure);

      // A selected specialty is the most specific scope in this flow. A
      // procedure without that relation must not leak in just because its
      // modality matches.
      if (hasEspecialidadeFilter && !selectedEspecialidadeIds.has(procedureEspecialidadeId)) return false;

      const procedureModalidadeId = getProcedureModalidadeId(procedure);
      if (procedureModalidadeId && selectedModalidadeIds.has(procedureModalidadeId)) return true;

      const legacyModalidades = Array.isArray(procedure.modalidades)
        ? procedure.modalidades.map((value) => normalize(value).toLowerCase())
        : [];
      return selectedModalidades.some((option) => (
        legacyModalidades.includes(normalize(option.value).toLowerCase())
        || legacyModalidades.includes(normalize(option.label).toLowerCase())
      ));
    })
    .map((procedure) => ({
      value: normalize(procedure.id),
      label: normalize(procedure.name) || 'Procedimento sem nome',
    }))
    .filter((option) => option.value)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
