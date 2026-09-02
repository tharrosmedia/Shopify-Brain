import 'dotenv/config';

export function toSafeJsonb(value: any, field = 'unknown') {
  if (value == null) return null;
  const t = typeof value;
  if (t === 'string') {
    console.warn(`[safe-json] string for jsonb ${field}, nulling`);
    return null;
  }
  if (t === 'object' || Array.isArray(value)) {
    return value;
  }
  console.warn(`[safe-json] bad type ${t} for jsonb ${field}, nulling`);
  return null;
}
