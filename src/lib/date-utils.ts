import {
    format as formatDateFns,
    startOfMonth as startOfMonthFns,
    endOfMonth as endOfMonthFns,
    addMonths as addMonthsFns,
    subMonths as subMonthsFns,
    differenceInCalendarMonths as diffMonthsFns,
    isBefore as isBeforeFns,
    addWeeks as addWeeksFns,
    addYears as addYearsFns,
    isSameMonth as isSameMonthFns,
    addDays as addDaysFns,
    parseISO as parseISOFns,
    isToday as isTodayFns,
    isTomorrow as isTomorrowFns,
    isPast as isPastFns,
    isSameDay as isSameDayFns
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Configuração padrão de locale
const LOCALE_OPTIONS = { locale: ptBR };

export const formatDate = (date: Date | string | number, formatStr: string = 'dd/MM/yyyy') => {
    return formatDateFns(new Date(date), formatStr, LOCALE_OPTIONS);
};

// Alias para compatibilidade com código que espera 'format'
export const format = formatDate;

export const startOfMonth = (date: Date = new Date()) => startOfMonthFns(date);
export const endOfMonth = (date: Date = new Date()) => endOfMonthFns(date);
export const addMonths = (date: Date, amount: number) => addMonthsFns(date, amount);
export const subMonths = (date: Date, amount: number) => subMonthsFns(date, amount);
export const addDays = (date: Date, amount: number) => addDaysFns(date, amount);
export const addWeeks = (date: Date, amount: number) => addWeeksFns(date, amount);
export const addYears = (date: Date, amount: number) => addYearsFns(date, amount);

export const differenceInMonths = (dateLeft: Date, dateRight: Date) => diffMonthsFns(dateLeft, dateRight);
export const isBefore = (date: Date, dateToCompare: Date) => isBeforeFns(date, dateToCompare);
export const isSameMonth = (dateLeft: Date, dateRight: Date) => isSameMonthFns(dateLeft, dateRight);
export const isSameDay = (dateLeft: Date, dateRight: Date) => isSameDayFns(dateLeft, dateRight);
export const isToday = (date: Date) => isTodayFns(date);
export const isTomorrow = (date: Date) => isTomorrowFns(date);
export const isPast = (date: Date) => isPastFns(date);

export const parseISO = (dateStr: string) => parseISOFns(dateStr);

export const formatMonthYear = (date: Date) => formatDateFns(date, 'MMM/yy', LOCALE_OPTIONS).toUpperCase();
export const formatMonthLong = (date: Date) => formatDateFns(date, 'MMMM', LOCALE_OPTIONS);
export const formatMonthShort = (date: Date) => formatDateFns(date, 'MMM', LOCALE_OPTIONS).toUpperCase();

export const getMonthKey = (date: Date) => formatDateFns(date, 'yyyy-MM');
