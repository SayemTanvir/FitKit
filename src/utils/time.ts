const BANGLADESH_TIME_ZONE = 'Asia/Dhaka';

export function formatBangladeshDateKey(value: string | number | Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGLADESH_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatBangladeshDateTime(value: string | number | Date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: BANGLADESH_TIME_ZONE,
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

export function formatBangladeshDate(value: string | number | Date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: BANGLADESH_TIME_ZONE,
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(value));
}

export function formatBangladeshWeekday(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00+06:00`);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: BANGLADESH_TIME_ZONE,
    weekday: 'short',
  }).format(date);
}
