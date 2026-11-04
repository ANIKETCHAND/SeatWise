/**
 * Input and Data Validation Helpers.
 */

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidRollNumber(roll: string): boolean {
  if (!roll || typeof roll !== 'string') return false;
  return /^[A-Za-z0-9\-_]{3,30}$/.test(roll.trim());
}

export function isValidGridDimensions(rows: number, cols: number): boolean {
  return (
    Number.isInteger(rows) &&
    Number.isInteger(cols) &&
    rows > 0 &&
    rows <= 50 &&
    cols > 0 &&
    cols <= 50
  );
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query.trim().replace(/[<>]/g, '');
}
