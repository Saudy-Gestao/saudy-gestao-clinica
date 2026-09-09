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

  it('caps a wide card down to identity-only when its row is too short for two lines', () => {
    // Plenty of width for full detail, but only tall enough for one line.
    expect(resolveAgendaCardPresentation(400, 1, 'full', 25)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: false,
      hideContent: false,
    });
  });

  it('caps a wide card down to summary (no professional line) at two-line height', () => {
    expect(resolveAgendaCardPresentation(400, 1, 'full', 40)).toEqual({
      detailLevel: 'summary',
      patientOnly: false,
      showInitials: false,
      hideContent: false,
    });
  });

  it('hides content entirely when the row is too short for even one line', () => {
    expect(resolveAgendaCardPresentation(400, 1, 'full', 8)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: false,
      hideContent: true,
    });
  });

  it('still falls back to initials on a one-line-tall card if the width is too narrow for the full name', () => {
    expect(resolveAgendaCardPresentation(100, 1, 'full', 25)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: true,
      hideContent: false,
    });
  });

  it('lets a tall-enough card still show full detail once width also allows it', () => {
    expect(resolveAgendaCardPresentation(AGENDA_CARD_DENSITY.fullMinWidth, 1, 'full', 56)).toEqual({
      detailLevel: 'full',
      patientOnly: false,
      showInitials: false,
      hideContent: false,
    });
  });

  it('never lets height expand a decision beyond what width alone would allow', () => {
    // Narrow width would only allow initials, even with a tall row.
    expect(resolveAgendaCardPresentation(100, 1, 'full', 200)).toEqual({
      detailLevel: 'full',
      patientOnly: true,
      showInitials: true,
      hideContent: false,
    });
  });
});
