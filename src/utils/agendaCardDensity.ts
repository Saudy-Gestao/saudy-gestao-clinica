export type AgendaCardDetailLevel = 'minimal' | 'summary' | 'full';

export type AgendaCardPresentation = {
  detailLevel: AgendaCardDetailLevel;
  patientOnly: boolean;
  showInitials: boolean;
  hideContent: boolean;
};

/** Breakpoints shared by the agenda and the room map. They describe what can
 * comfortably fit in a card, instead of tying the UI to a fixed item count. */
export const AGENDA_CARD_DENSITY = {
  fullMinWidth: 270,
  summaryMinWidth: 166,
  initialsMinWidth: 48,
  textlessConcurrency: 10,
} as const;

export const resolveAgendaCardPresentation = (
  cellWidth: number,
  itemCount: number,
  baseLevel: AgendaCardDetailLevel = 'full',
): AgendaCardPresentation => {
  if (baseLevel === 'minimal') return { detailLevel: 'minimal', patientOnly: false, showInitials: false, hideContent: false };

  const cardWidth = cellWidth / Math.max(itemCount, 1);
  if (itemCount >= AGENDA_CARD_DENSITY.textlessConcurrency || cardWidth < AGENDA_CARD_DENSITY.initialsMinWidth) {
    return { detailLevel: 'full', patientOnly: true, showInitials: false, hideContent: true };
  }
  if (cardWidth < AGENDA_CARD_DENSITY.summaryMinWidth) {
    return { detailLevel: 'full', patientOnly: true, showInitials: true, hideContent: false };
  }
  if (baseLevel === 'summary' || cardWidth < AGENDA_CARD_DENSITY.fullMinWidth) {
    return { detailLevel: 'summary', patientOnly: false, showInitials: false, hideContent: false };
  }
  return { detailLevel: 'full', patientOnly: false, showInitials: false, hideContent: false };
};
