/**
 * Timezone & Currency standard for Bengkel Motor Joyoboyo Yuwanain Arso II
 * Standard Timezone: Asia/Jayapura (WIT - Waktu Indonesia Timur / UTC+9)
 */

export const DEFAULT_TIMEZONE = 'Asia/Jayapura';
export const TIMEZONE_OFFSET_HOURS = 9; // WIT is UTC+9

/**
 * Get current Date in Asia/Jayapura
 */
export function getJayapuraDate(): Date {
  return new Date();
}

/**
 * Get current ISO-like string formatted for Jayapura (YYYY-MM-DDTHH:mm:ss.sss+09:00)
 */
export function getJayapuraISOString(): string {
  const now = new Date();
  // Format with Jayapura offset
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  const pad = (n: number) => n.toString().padStart(2, '0');
  const padMs = (n: number) => n.toString().padStart(3, '0');

  const year = tzDate.getFullYear();
  const month = pad(tzDate.getMonth() + 1);
  const day = pad(tzDate.getDate());
  const hours = pad(tzDate.getHours());
  const minutes = pad(tzDate.getMinutes());
  const seconds = pad(tzDate.getSeconds());
  const ms = padMs(tzDate.getMilliseconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+09:00`;
}

/**
 * Get current Date string in Jayapura (YYYY-MM-DD)
 */
export function getJayapuraDateOnlyString(): string {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${tzDate.getFullYear()}-${pad(tzDate.getMonth() + 1)}-${pad(tzDate.getDate())}`;
}

/**
 * Format ISO timestamp into Indonesian date string in Jayapura timezone
 */
export function formatDateJayapura(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    return d.toLocaleDateString('id-ID', {
      timeZone: DEFAULT_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Format ISO timestamp into Indonesian date + time string in Jayapura timezone (WIT)
 */
export function formatDateTimeJayapura(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const dateStr = d.toLocaleDateString('id-ID', {
      timeZone: DEFAULT_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const timeStr = d.toLocaleTimeString('id-ID', {
      timeZone: DEFAULT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${dateStr}, ${timeStr} WIT`;
  } catch (e) {
    return isoString;
  }
}

/**
 * Format ISO timestamp into Indonesian time string in Jayapura timezone
 */
export function formatTimeJayapura(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    return d.toLocaleTimeString('id-ID', {
      timeZone: DEFAULT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' WIT';
  } catch (e) {
    return isoString;
  }
}

/**
 * Accurate integer rupiah currency formatting
 */
export function formatRupiah(amount: number | undefined | null): string {
  const cleanAmount = Math.round(Number(amount) || 0);
  return 'Rp ' + cleanAmount.toLocaleString('id-ID');
}

export const formatCurrencyWIT = formatRupiah;

/**
 * Safe integer rounding for monetary amounts
 */
export function safeMoney(amount: number | undefined | null): number {
  return Math.round(Number(amount) || 0);
}
