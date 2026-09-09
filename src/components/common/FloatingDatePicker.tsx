import { Box, Text, type BoxProps } from '@/components/ui';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { formatDateInput } from '../../utils/formatters';
import { withRequiredIndicator } from './requiredLabel';
import './FloatingDatePicker.css';

interface FloatingDatePickerProps {
  label: ReactNode;
  value?: string | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date | string | null;
  containerProps?: BoxProps;
  labelPlacement?: 'floating' | 'stacked';
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function parseIsoDate(value?: string | null) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeBoundaryDate(value?: Date | string | null) {
  if (!value) return null;
  if (typeof value === 'string') return parseIsoDate(value);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
}

function makeChangeEvent(value: string) {
  return { currentTarget: { value }, target: { value } } as ChangeEvent<HTMLInputElement>;
}

export function FloatingDatePicker({ label, value, onChange, error, required, disabled, minDate, containerProps, labelPlacement = 'floating' }: FloatingDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseIsoDate(value);
  const minimumDate = normalizeBoundaryDate(minDate);
  const [opened, setOpened] = useState(false);
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(selectedDate ? `${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}` : '');
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [yearDraft, setYearDraft] = useState(String((selectedDate || new Date()).getFullYear()));

  useEffect(() => {
    const nextDate = parseIsoDate(value);
    setDisplayValue(nextDate ? `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}` : '');
    if (nextDate && !opened) setViewDate(nextDate);
  }, [value, opened]);

  useLayoutEffect(() => {
    if (!opened) return undefined;
    const updateCalendarPosition = () => {
      const anchor = rootRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const calendarWidth = Math.min(304, window.innerWidth - 32);
      const estimatedHeight = showMonthYearPicker ? 470 : 390;
      const opensAbove = anchor.bottom + estimatedHeight > window.innerHeight && anchor.top > estimatedHeight;
      const top = opensAbove ? Math.max(8, anchor.top - estimatedHeight - 8) : Math.min(anchor.bottom + 8, window.innerHeight - estimatedHeight - 8);
      const left = Math.min(Math.max(8, anchor.left), window.innerWidth - calendarWidth - 8);
      setCalendarPosition({ top, left });
    };
    updateCalendarPosition();
    window.addEventListener('resize', updateCalendarPosition);
    window.addEventListener('scroll', updateCalendarPosition, true);
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!rootRef.current?.contains(target) && !target.closest('.floating-date-picker__calendar')) setOpened(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpened(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', updateCalendarPosition);
      window.removeEventListener('scroll', updateCalendarPosition, true);
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [opened, showMonthYearPicker]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const daysInPreviousMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstDay + 1;
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayOffset, 12);
      return { date, currentMonth: dayOffset > 0 && dayOffset <= daysInMonth, previousMonthDay: dayOffset <= 0 ? daysInPreviousMonth + dayOffset : null };
    });
  }, [viewDate]);

  const commitDate = (date: Date) => {
    if (minimumDate && date < minimumDate) return;
    const isoValue = toIsoDate(date);
    setDisplayValue(`${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`);
    onChange?.(makeChangeEvent(isoValue));
    setViewDate(date);
    setOpened(false);
    setShowMonthYearPicker(false);
  };

  const applyMonthYear = () => {
    const year = Number(yearDraft);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
    setViewDate(new Date(year, viewDate.getMonth(), 1, 12));
    setShowMonthYearPicker(false);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDisplay = formatDateInput(event.currentTarget.value);
    setDisplayValue(nextDisplay);
    const digits = nextDisplay.replace(/\D/g, '');
    if (!digits) onChange?.(makeChangeEvent(''));
    if (digits.length !== 8) return;
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4));
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      if (minimumDate && date < minimumDate) {
        setDisplayValue('');
        onChange?.(makeChangeEvent(''));
        return;
      }
      onChange?.(makeChangeEvent(toIsoDate(date)));
      setViewDate(date);
    }
  };

  const today = new Date();
  const isToday = (date: Date) => toIsoDate(date) === toIsoDate(today);
  const isSelected = (date: Date) => selectedDate ? toIsoDate(date) === toIsoDate(selectedDate) : false;
  const containerClassName = [
    labelPlacement === 'stacked' ? 'floating-date-picker-field--stacked' : '',
    containerProps?.className || '',
  ].filter(Boolean).join(' ');

  return (
    <Box {...containerProps} className={containerClassName || undefined} w="100%">
      {labelPlacement === 'stacked' && <label className="floating-date-picker__stacked-label">{withRequiredIndicator(label, Boolean(required))}</label>}
      <Box ref={rootRef} className={`floating-field floating-date-picker ${focused || displayValue ? 'has-value' : ''}${error ? ' has-error' : ''}`} w="100%">
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-haspopup="dialog"
          aria-expanded={opened}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={handleInputChange}
          onClick={() => { if (!disabled) { setViewDate(selectedDate || new Date()); setOpened(true); } }}
          onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'Enter') { event.preventDefault(); if (!disabled) setOpened(true); } }}
        />
        {labelPlacement === 'floating' && <label>{withRequiredIndicator(label, Boolean(required))}</label>}
        <button type="button" className="floating-date-picker__trigger" aria-label="Abrir calendário" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!disabled) { setViewDate(selectedDate || new Date()); setOpened((current) => !current); } }}>
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        {opened && typeof document !== 'undefined' && createPortal(
          <div className="floating-date-picker__calendar" role="dialog" aria-label="Selecionar data" style={{ position: 'fixed', top: calendarPosition.top, left: calendarPosition.left }}>
            <div className="floating-date-picker__calendar-header">
              <button type="button" className="floating-date-picker__month-year-trigger" aria-expanded={showMonthYearPicker} onClick={() => { setYearDraft(String(viewDate.getFullYear())); setShowMonthYearPicker((current) => !current); }}>
                <strong>{MONTHS[viewDate.getMonth()]} de {viewDate.getFullYear()}</strong>
                <ChevronDown aria-hidden="true" />
              </button>
              <div className="floating-date-picker__month-actions">
                <button type="button" aria-label="Mês anterior" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1, 12))}><ChevronLeft size={16} /></button>
                <button type="button" aria-label="Próximo mês" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1, 12))}><ChevronRight size={16} /></button>
              </div>
            </div>
            {showMonthYearPicker && (
              <div className="floating-date-picker__month-year-picker">
                <div className="floating-date-picker__year-field">
                  <label htmlFor="floating-date-picker-year">Ano</label>
                  <input id="floating-date-picker-year" type="number" min="1900" max="2100" value={yearDraft} onChange={(event) => setYearDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyMonthYear(); }} />
                </div>
                <div className="floating-date-picker__month-grid" aria-label="Selecionar mês">
                  {MONTHS.map((month, monthIndex) => <button key={month} type="button" className={monthIndex === viewDate.getMonth() ? 'is-selected' : ''} onClick={() => setViewDate(new Date(Number(yearDraft) || viewDate.getFullYear(), monthIndex, 1, 12))}>{month.slice(0, 3)}</button>)}
                </div>
                <button type="button" className="floating-date-picker__apply-jump" onClick={applyMonthYear}>Ir para esta data</button>
              </div>
            )}
            <div className="floating-date-picker__weekdays">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            <div className="floating-date-picker__days">
              {calendarDays.map(({ date, currentMonth }, index) => {
                const isBeforeMinimum = Boolean(minimumDate && date < minimumDate);
                return (
                <button key={`${toIsoDate(date)}-${index}`} type="button" disabled={isBeforeMinimum} className={`${currentMonth ? '' : 'is-outside'}${isSelected(date) ? ' is-selected' : ''}${isToday(date) ? ' is-today' : ''}`} onClick={() => commitDate(date)}>{date.getDate()}</button>
                );
              })}
            </div>
            <div className="floating-date-picker__footer">
              <button type="button" onClick={() => { onChange?.(makeChangeEvent('')); setDisplayValue(''); setOpened(false); }}>Limpar</button>
              <button type="button" disabled={Boolean(minimumDate && today < minimumDate)} onClick={() => commitDate(today)}>Hoje</button>
            </div>
          </div>,
          document.body,
        )}
      </Box>
      {error && <Text size="xs" c="red" mt={4}>{error}</Text>}
    </Box>
  );
}
