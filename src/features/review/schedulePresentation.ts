import type { ReviewStage } from '../../domain/review';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export const REVIEW_STAGE_LABELS: Record<ReviewStage, string> = {
  new: '未开始',
  learning: '学习中',
  review: '复习中',
  relearning: '重新学习',
  mature: '熟练',
};

export function formatScheduleDelay(dueAt: string, now: Date): string {
  const difference = Math.max(0, Date.parse(dueAt) - now.getTime());

  if (difference < HOUR_MS) {
    return `${Math.max(1, Math.round(difference / MINUTE_MS))} 分钟后`;
  }

  if (difference < DAY_MS) {
    return `${Math.max(1, Math.round(difference / HOUR_MS))} 小时后`;
  }

  return `${Math.max(1, Math.round(difference / DAY_MS))} 天后`;
}

export function formatDueDateTime(dueAt: string, now = new Date()): string {
  const delay = formatScheduleDelay(dueAt, now);
  const dateTime = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dueAt));
  return `${dateTime}（${delay}）`;
}
