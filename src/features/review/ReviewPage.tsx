import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { ReviewRating } from '../../domain/review';
import { useSelectedLearnerProfile } from '../profiles/useSelectedLearnerProfile';
import { getOrCreateDeviceId } from './deviceId';
import { recordRating } from './recordRating';
import { buildReviewQueue, type ReviewQueueItem } from './reviewQueue';

const ratingOptions: Array<{ rating: ReviewRating; label: string; detail: string }> = [
  { rating: 'unknown', label: '不认识', detail: '10 分钟后再看' },
  { rating: 'fuzzy', label: '模糊', detail: '需要继续巩固' },
  { rating: 'known', label: '认识', detail: '延长复习间隔' },
];

export function ReviewPage() {
  const { selectedLearnerProfileId } = useApp();
  const { loading: profileLoading, profile } = useSelectedLearnerProfile();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    let active = true;
    setLoading(true);

    void buildReviewQueue(
      appServices.database,
      profile.learnerProfileId,
      profile.contentProfileId,
      profile.dailyNewCardLimit,
    )
      .then((nextQueue) => {
        if (active) {
          setQueue(nextQueue);
          setIndex(0);
          setRevealed(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : '读取复习队列失败。');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profile]);

  if (!selectedLearnerProfileId) {
    return <Navigate replace to="/profiles" />;
  }

  if (profileLoading || loading) {
    return <p className="route-loading" role="status">正在准备复习队列…</p>;
  }

  if (!profile) {
    return <Navigate replace to="/profiles" />;
  }

  const current = queue[index];

  if (!current) {
    return (
      <section className="page narrow completion-card">
        <p className="eyebrow">{queue.length > 0 ? '本轮完成' : '复习'}</p>
        <h1>{queue.length > 0 ? '今天先复习到这里。' : '当前没有可复习卡片'}</h1>
        <p>
          {queue.length > 0
            ? `已完成 ${queue.length} 张卡片，每次评分都已保存到本机。`
            : '请先回到首页同步学习内容；如果内容已同步，则当前没有到期卡片或新卡名额。'}
        </p>
        <Link className="primary-action" to="/">返回首页</Link>
        {message ? <p className="status-message" role="status">{message}</p> : null}
      </section>
    );
  }

  const activeProfile = profile;
  const activeItem = current;

  async function rate(rating: ReviewRating) {
    setSaving(true);
    setMessage(null);

    try {
      await recordRating(appServices.database, {
        learnerProfileId: activeProfile.learnerProfileId,
        cardId: activeItem.card.cardId,
        rating,
        deviceId: getOrCreateDeviceId(),
      });
      setIndex((currentIndex) => currentIndex + 1);
      setRevealed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存评分失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page narrow review-page">
      <div className="review-progress">
        <span>{activeProfile.displayName}</span>
        <span>{index + 1} / {queue.length}</span>
      </div>
      <article className="review-card">
        <span className="card-kind">
          {activeItem.card.cardType === 'recognition' ? '理解' : '表达'}
        </span>
        <h1>{activeItem.card.prompt}</h1>

        {revealed ? (
          <div className="answer-panel">
            <span>答案</span>
            <strong>{activeItem.card.answer}</strong>
          </div>
        ) : (
          <button className="reveal-button" onClick={() => setRevealed(true)} type="button">
            显示答案
          </button>
        )}
      </article>

      {revealed ? (
        <div className="rating-grid" aria-label="评分">
          {ratingOptions.map((option) => (
            <button
              disabled={saving}
              key={option.rating}
              onClick={() => void rate(option.rating)}
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
            </button>
          ))}
        </div>
      ) : null}

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
