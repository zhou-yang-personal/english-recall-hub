import { describe, expect, it } from 'vitest';
import {
  formatDueDateTime,
  formatScheduleDelay,
} from '../../src/features/review/schedulePresentation';

describe('schedule presentation', () => {
  const now = new Date('2026-08-21T12:00:00.000Z');

  it('formats short and day-scale scheduler delays', () => {
    expect(formatScheduleDelay('2026-08-21T12:10:00.000Z', now)).toBe('10 分钟后');
    expect(formatScheduleDelay('2026-08-24T12:00:00.000Z', now)).toBe('3 天后');
  });

  it('combines an exact local date with the relative delay', () => {
    expect(formatDueDateTime('2026-08-24T12:00:00.000Z', now)).toContain('3 天后');
  });
});
