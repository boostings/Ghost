import { differenceInDays, differenceInYears, format, formatDistanceToNowStrict } from 'date-fns';

const TIMEZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

function toDate(input: string | Date): Date | null {
  const normalizedInput =
    typeof input === 'string' && !TIMEZONE_PATTERN.test(input) ? `${input}Z` : input;
  const date = typeof normalizedInput === 'string' ? new Date(normalizedInput) : normalizedInput;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(input: string | Date): string {
  const date = toDate(input);
  if (!date) return 'just now';

  const now = new Date();
  const days = differenceInDays(now, date);
  if (days < 7) return formatDistanceToNowStrict(date, { addSuffix: true });
  if (differenceInYears(now, date) < 1) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

export function formatTimestampLong(input: string | Date): string {
  const date = toDate(input);
  if (!date) return 'Unknown date';
  return format(date, "MMM d, yyyy 'at' h:mm a");
}
