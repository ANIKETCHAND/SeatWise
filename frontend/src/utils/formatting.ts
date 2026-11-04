/**
 * Text and Data Formatting Utilities.
 */

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr;
}

export function formatPercentage(val?: number | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${val.toFixed(decimals)}%`;
}

export function formatNumber(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN').format(val);
}

export function formatRollNumber(roll?: string | null): string {
  if (!roll) return '—';
  return roll.toUpperCase().trim();
}

export function formatSessionName(session?: string | null): string {
  if (!session) return '—';
  const map: Record<string, string> = {
    morning: 'Morning (FN)',
    afternoon: 'Afternoon (AN)',
    evening: 'Evening (EV)',
    fn: 'Morning (FN)',
    an: 'Afternoon (AN)',
    ev: 'Evening (EV)',
  };
  return map[session.toLowerCase()] || session;
}

export function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
