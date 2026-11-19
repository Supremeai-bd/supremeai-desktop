import { describe, it, expect } from 'vitest';
import { buildAuditCsvContent, buildAuditCsvFilename, escapeCsvCell } from './auditCsv';
import { SystemAuditRecord } from '../types';

describe('auditCsv compliance export helpers', () => {
  it('escapes quotes, commas, newlines, and neutralizes spreadsheet formula prefixes', () => {
    expect(escapeCsvCell('normal text')).toBe('"normal text"');
    expect(escapeCsvCell('he said "hi", ok\nnext line')).toBe('"he said ""hi"", ok\nnext line"');
    expect(escapeCsvCell('=CMD("calc")')).toBe('"\'=CMD(""calc"")"');
    expect(escapeCsvCell('+1234')).toBe('"\'+1234"');
    expect(escapeCsvCell('-admin')).toBe('"\'-admin"');
    expect(escapeCsvCell('@SUM(A1:A2)')).toBe('"\'@SUM(A1:A2)"');
    expect(escapeCsvCell(null)).toBe('""');
  });

  it('serializes audit records with UTF-8 BOM, headers, and CRLF line endings', () => {
    const records: SystemAuditRecord[] = [
      {
        id: 'aud_01',
        timestamp: '2026-11-15T10:12:00Z',
        actor: 'niloyjoy7@gmail.com',
        action: 'UPDATE_FEATURE_FLAG',
        resource: 'flag:voice_stream',
        details: 'Enabled flag, verified "strict" mode',
        ipAddress: '203.0.113.10',
      },
      {
        id: 'aud_02',
        timestamp: '2026-11-15T10:15:00Z',
        actor: 'admin@supremeai.bd',
        action: 'BLOCK_IP',
        resource: '198.51.100.44',
        details: '=HYPERLINK("http://evil")',
        ipAddress: '198.51.100.1',
      },
    ];

    const csv = buildAuditCsvContent(records);
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      '"ID","Timestamp","Actor","Action","Target Resource","Event Details","IP Origin"'
    );
    expect(lines[1]).toBe(
      '"aud_01","2026-11-15T10:12:00Z","niloyjoy7@gmail.com","UPDATE_FEATURE_FLAG","flag:voice_stream","Enabled flag, verified ""strict"" mode","203.0.113.10"'
    );
    expect(lines[2]).toContain('"\'=HYPERLINK(""http://evil"")"');
  });

  it('generates compliance filenames distinguishing full vs filtered views', () => {
    const sampleDate = new Date('2026-11-15T08:00:00Z');
    expect(buildAuditCsvFilename(sampleDate, false)).toBe('supremeai_audit_logs_2026-11-15.csv');
    expect(buildAuditCsvFilename(sampleDate, true)).toBe(
      'supremeai_audit_logs_filtered_2026-11-15.csv'
    );
  });
});
