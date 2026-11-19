import { describe, it, expect } from 'vitest';
import { getCronMinuteKey, isValidCronExpression, matchesCronAtDate } from './cronMatcher';

describe('cronMatcher', () => {
  it('validates standard 5-field cron expressions and rejects malformed strings', () => {
    expect(isValidCronExpression('0 8 * * *')).toBe(true);
    expect(isValidCronExpression('*/15 9-17 * * 1-5')).toBe(true);
    expect(isValidCronExpression('0 9 * * 7')).toBe(true);
    expect(isValidCronExpression('invalid cron')).toBe(false);
    expect(isValidCronExpression('99 8 * * *')).toBe(false);
    expect(isValidCronExpression('0 8 * *')).toBe(false);
  });

  it('matches exact hour/minute, step intervals, ranges, and Sunday=7', () => {
    // 2026-11-15 is a Sunday (day = 0), 09:30 local time
    const sundayMorning = new Date(2026, 10, 15, 9, 30, 0);
    expect(matchesCronAtDate('30 9 * * *', sundayMorning)).toBe(true);
    expect(matchesCronAtDate('31 9 * * *', sundayMorning)).toBe(false);
    expect(matchesCronAtDate('*/15 9 * * 0', sundayMorning)).toBe(true);
    expect(matchesCronAtDate('*/15 9 * * 7', sundayMorning)).toBe(true);
    expect(matchesCronAtDate('30 9 * * 1-5', sundayMorning)).toBe(false);

    // 2026-11-16 is a Monday (day = 1), 14:45 local time
    const mondayAfternoon = new Date(2026, 10, 16, 14, 45, 0);
    expect(matchesCronAtDate('45 14 * * 1-5', mondayAfternoon)).toBe(true);
    expect(matchesCronAtDate('0,15,30,45 12-16 * * *', mondayAfternoon)).toBe(true);
    expect(matchesCronAtDate('0 * * * *', mondayAfternoon)).toBe(false);
  });

  it('generates deterministic minute keys', () => {
    const dt = new Date(2026, 0, 5, 7, 4, 22);
    expect(getCronMinuteKey(dt)).toBe('2026-01-05T07:04');
  });
});
