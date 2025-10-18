const CROATIAN_TIME_FORMATTER = new Intl.DateTimeFormat('hr-HR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Zagreb',
});

export function formatToZagreb(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : undefined;
  }

  return CROATIAN_TIME_FORMATTER.format(date);
}
