import { useQuery } from '@tanstack/react-query';
import teaPreReservationService from '../services/teaPreReservationService';
import { queryKeys } from '../lib/queryKeys';

export interface TeaManualGridSlot {
  time: string;
  occupied: boolean;
  selectable: boolean;
}

export interface TeaManualGridDay {
  date: string;
  weekday: string;
  enabled: boolean;
  slots: TeaManualGridSlot[];
}

export interface TeaManualGridResponse {
  days: TeaManualGridDay[];
  week?: { startDate: string; endDate: string };
}

export interface TeaManualGridTherapyRef {
  pitTherapyId: string;
}

const timeToMinutes = (value: string) => {
  const [hourRaw, minuteRaw] = String(value || '').split(':');
  return Number(hourRaw || 0) * 60 + Number(minuteRaw || 0);
};

const normalizeManualGridResponse = (grid?: TeaManualGridResponse): TeaManualGridResponse => {
  const days = Array.isArray(grid?.days)
    ? grid.days.map((day) => {
      const slotsByTime = new Map<string, TeaManualGridSlot>();
      (day?.slots || []).forEach((slot) => {
        const time = String(slot?.time || '').trim();
        if (!time) return;
        const existing = slotsByTime.get(time);
        if (!existing) {
          slotsByTime.set(time, {
            time,
            occupied: Boolean(slot?.occupied),
            selectable: Boolean(slot?.selectable),
          });
          return;
        }

        slotsByTime.set(time, {
          time,
          occupied: existing.occupied || Boolean(slot?.occupied),
          selectable: existing.selectable || Boolean(slot?.selectable),
        });
      });

      return {
        ...day,
        date: String(day?.date || ''),
        weekday: String(day?.weekday || ''),
        enabled: Boolean(day?.enabled),
        slots: Array.from(slotsByTime.values()).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
      };
    })
    : [];

  return {
    ...grid,
    days,
  };
};

export const fetchTeaManualGrid = async (
  therapies: TeaManualGridTherapyRef[],
  weekStart: string,
): Promise<Record<string, TeaManualGridResponse>> => {
  if (!therapies.length || !weekStart) return {};

  const responses = await Promise.all(
    therapies.map(async (therapy) => {
      const data = await teaPreReservationService.getManualGrid(therapy.pitTherapyId, { weekStart });
      return {
        pitTherapyId: therapy.pitTherapyId,
        data: normalizeManualGridResponse(data as TeaManualGridResponse),
      };
    }),
  );

  return responses.reduce<Record<string, TeaManualGridResponse>>((acc, response) => {
    acc[response.pitTherapyId] = response.data;
    return acc;
  }, {});
};

export const useTeaManualGridQuery = (
  therapies: TeaManualGridTherapyRef[],
  weekStart: string,
  enabled = true,
) => useQuery({
  queryKey: [
    ...queryKeys.teaManualGrid,
    weekStart || '',
    therapies.map((item) => item.pitTherapyId).join('|'),
  ],
  queryFn: () => fetchTeaManualGrid(therapies, weekStart),
  enabled: enabled && Boolean(weekStart) && therapies.length > 0,
});
