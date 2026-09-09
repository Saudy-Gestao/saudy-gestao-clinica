/** Shared with every `showInitials` consumer — a card that has room for a
 * short label but not a full name (see `widthTier`'s tier-1 case) needs the
 * exact same two-letter abbreviation wherever it renders, whether that's a
 * patient, a therapist, or a room-agenda's assigned professional. Kept here
 * rather than duplicated per-screen so the density tiers and the label they
 * imply can't drift apart. */
export function formatCardInitials(name?: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return `${parts[0][0]}${(parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || '')}`.toUpperCase();
}

export type AgendaCardDetailLevel = 'minimal' | 'summary' | 'full';

export type AgendaCardPresentation = {
  detailLevel: AgendaCardDetailLevel;
  patientOnly: boolean;
  showInitials: boolean;
  hideContent: boolean;
};

/** Breakpoints shared by the agenda and the room map. They describe what can
 * comfortably fit in a card, instead of tying the UI to a fixed item count.
 *
 * Space is two-dimensional: a card can be starved by width (a narrow lane),
 * by height (a short compact-density row), or by both — the final answer is
 * whichever dimension is more restrictive. Everything a card can't fit stays
 * available in its tooltip, never lost. */
export const AGENDA_CARD_DENSITY = {
  // Width: how wide a card needs to be to show a given richness of text
  // without truncating illegibly.
  fullMinWidth: 270,
  summaryMinWidth: 166,
  nameOnlyMinWidth: 72,
  initialsMinWidth: 48,
  // Height: same idea, expressed as text lines. Calibrated against the
  // rendered chip/card chrome — one line box (size="xs"/fw700 alike) is
  // ~15px, and the card's own padding+border consumes ~10px regardless of
  // content.
  lineHeight: 15,
  cardChrome: 10,
  // Kept for legacy width-only callers that pack several concurrent items
  // into one shared cell instead of giving each its own lane; 10+ crammed
  // in is illegible regardless of how wide the shared cell is.
  textlessConcurrency: 10,
} as const;

/** How many text lines actually fit in a card of this height. `undefined`
 * means the caller isn't tracking height yet — treated as unconstrained so
 * existing width-only call sites keep their exact prior behavior. */
function availableLines(cellHeight: number | undefined): number {
  if (cellHeight === undefined) return Infinity;
  const usable = cellHeight - AGENDA_CARD_DENSITY.cardChrome;
  return usable < AGENDA_CARD_DENSITY.lineHeight ? 0 : Math.floor(usable / AGENDA_CARD_DENSITY.lineHeight);
}

/** 0 = hide content (marker only), 1 = identity only, 2 = identity + procedure,
 * 3 = identity + procedure + professional. Width and height each vote for a
 * tier independently; the card gets the lower (more conservative) of the two. */
function widthTier(cardWidth: number, itemCount: number, baseLevel: AgendaCardDetailLevel): 0 | 1 | 2 | 3 {
  if (itemCount >= AGENDA_CARD_DENSITY.textlessConcurrency || cardWidth < AGENDA_CARD_DENSITY.initialsMinWidth) return 0;
  if (cardWidth < AGENDA_CARD_DENSITY.summaryMinWidth) return 1;
  if (baseLevel === 'summary' || cardWidth < AGENDA_CARD_DENSITY.fullMinWidth) return 2;
  return 3;
}

function heightTier(lines: number): 0 | 1 | 2 | 3 {
  if (lines <= 0) return 0;
  if (lines === 1) return 1;
  if (lines === 2) return 2;
  return 3;
}

export const resolveAgendaCardPresentation = (
  cellWidth: number,
  itemCount: number,
  baseLevel: AgendaCardDetailLevel = 'full',
  cellHeight?: number,
): AgendaCardPresentation => {
  if (baseLevel === 'minimal') return { detailLevel: 'minimal', patientOnly: false, showInitials: false, hideContent: false };

  const cardWidth = cellWidth / Math.max(itemCount, 1);
  const tier = Math.min(
    widthTier(cardWidth, itemCount, baseLevel),
    heightTier(availableLines(cellHeight)),
  );

  if (tier === 0) return { detailLevel: 'full', patientOnly: true, showInitials: false, hideContent: true };
  // One line of room: show the fullest name/label form that still fits — a
  // short label first, initials only once even that would overflow.
  if (tier === 1) return { detailLevel: 'full', patientOnly: true, showInitials: cardWidth < AGENDA_CARD_DENSITY.summaryMinWidth, hideContent: false };
  if (tier === 2) return { detailLevel: 'summary', patientOnly: false, showInitials: false, hideContent: false };
  return { detailLevel: 'full', patientOnly: false, showInitials: false, hideContent: false };
};
