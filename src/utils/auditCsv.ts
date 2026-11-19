import { SystemAuditRecord } from '../types';

const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const safe = FORMULA_TRIGGER_RE.test(raw) ? `'${raw}` : raw;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

export const AUDIT_CSV_HEADERS = [
  'ID',
  'Timestamp',
  'Actor',
  'Action',
  'Target Resource',
  'Event Details',
  'IP Origin',
] as const;

export function buildAuditCsvContent(records: SystemAuditRecord[]): string {
  const headerRow = AUDIT_CSV_HEADERS.map((h) => escapeCsvCell(h)).join(',');
  const dataRows = records.map((rec) =>
    [rec.id, rec.timestamp, rec.actor, rec.action, rec.resource, rec.details, rec.ipAddress]
      .map((cell) => escapeCsvCell(cell))
      .join(',')
  );

  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}`;
}

export function buildAuditCsvFilename(
  date: Date = new Date(),
  isFiltered: boolean = false
): string {
  const isoDate = date.toISOString().slice(0, 10);
  return isFiltered
    ? `supremeai_audit_logs_filtered_${isoDate}.csv`
    : `supremeai_audit_logs_${isoDate}.csv`;
}
