import dayjs from 'dayjs';

export function getEffectiveToday(): dayjs.Dayjs {
  const now = dayjs();
  return now.hour() < 4 ? now.subtract(1, 'day') : now;
}

export function getEffectiveTodayStr(): string {
  return getEffectiveToday().format('YYYY-MM-DD');
}
