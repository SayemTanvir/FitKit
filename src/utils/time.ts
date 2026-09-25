const BANGLADESH_TIME_ZONE = 'Asia/Dhaka';

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
