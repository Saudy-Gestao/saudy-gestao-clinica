import { describe, expect, it } from 'vitest';
import {
  AGENDA_CARD_DENSITY,
  resolveAgendaCardPresentation,
} from '../agendaCardDensity';

describe('resolveAgendaCardPresentation', () => {
  it('keeps the minimal presentation requested by the view', () => {
    expect(resolveAgendaCardPresentation(400, 1, 'minimal')).toEqual({
      detailLevel: 'minimal',
      patientOnly: false,
      showInitials: false,
      hideContent: false,
    });
  });

  it('hides content when the card cannot fit even initials', () => {
    expect(resolveAgendaCardPresentation(200, 5)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: false,
      hideContent: true,
    });

    expect(resolveAgendaCardPresentation(400, AGENDA_CARD_DENSITY.textlessConcurrency)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: false,
      hideContent: true,
    });
  });

  it('uses initials when only a short patient label fits', () => {
    expect(resolveAgendaCardPresentation(200, 2)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: true,
      hideContent: false,
    });
  });

  it('uses the summary layout in medium cards or summary views', () => {
    expect(resolveAgendaCardPresentation(400, 2)).toEqual({
      detailLevel: 'summary',
      patientOnly: false,
      showInitials: false,
      hideContent: false,
    });

    expect(resolveAgendaCardPresentation(400, 1, 'summary')).toEqual({
      detailLevel: 'summary',
      patientOnly: false,
      showInitials: false,
      hideContent: false,
    });
  });

  it('uses full details when the card has enough width', () => {
    expect(resolveAgendaCardPresentation(AGENDA_CARD_DENSITY.fullMinWidth, 1)).toEqual({
      detailLevel: 'full',
      patientOnly: false,
      showInitials: false,
      hideContent: false,
    });
  });
});
