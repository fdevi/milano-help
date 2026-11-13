import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('scripts/approval-check-schedule.sql', 'utf8');
const schedule = sql.match(/schedule := '([^']+)'/)?.[1];
const start = sql.match(/>= TIME ''(\d\d):(\d\d)''/);
const end = sql.match(/< TIME ''(\d\d):(\d\d)''/);
if (!start || !end || !schedule) throw new Error('Missing approval schedule or time guard');
const startMinute = Number(start[1]) * 60 + Number(start[2]);
const endMinute = Number(end[1]) * 60 + Number(end[2]);
const [minutes, hours] = schedule.split(' ');
if (!minutes || !hours) throw new Error('Invalid cron schedule');
const [firstHour, lastHour] = hours.split('-').map(Number);
if (firstHour === undefined || lastHour === undefined) throw new Error('Missing UTC hour bounds');
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function eligible(date: Date) {
  if (!minutes || firstHour === undefined || lastHour === undefined) throw new Error('Invalid schedule');
  const [hour, minute] = formatter.format(date).split(':').map(Number);
  if (hour === undefined || minute === undefined) throw new Error('Invalid Rome time');
  return minutes.split(',').map(Number).includes(date.getUTCMinutes()) &&
    date.getUTCHours() >= firstHour && date.getUTCHours() <= lastHour &&
    hour * 60 + minute >= startMinute && hour * 60 + minute < endMinute;
}

describe('Approval checks scheduled in Rome time', () => {
  it('runs every 30 minutes and stores the 30m setting', () => {
    expect(minutes).toBe('0,30');
    expect(sql).toContain("SET frequenza = '30m'");
  });
  it.each(['2026-11-13', '2026-07-13'])('checks only 06:00–23:59 on %s', (day) => {
    expect(startMinute).toBe(360);
    expect(endMinute).toBe(1440);
    const runs: string[] = [];
    for (let minute = 0; minute < 1440; minute++) {
      const date = new Date(`${day}T00:00:00Z`);
      date.setUTCMinutes(minute);
      if (eligible(date)) runs.push(formatter.format(date));
    }
    expect(runs).toHaveLength(36);
    expect(runs[0]).toBe('06:00');
    expect(runs.at(-1)).toBe('23:30');
    expect(runs).not.toContain('05:30');
    expect(runs).not.toContain('00:00');
  });
});