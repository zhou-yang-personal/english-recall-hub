import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { CardRecord } from '../../domain/content';
import type { LearnerProfile } from '../../domain/profile';
import type { ReviewRating } from '../../domain/review';
import { previewReviewSchedule } from '../../domain/scheduler';
import { useSelectedLearnerProfile } from '../profiles/useSelectedLearnerProfile';
import { getOrCreateDeviceId } from './deviceId';
import { recordRating } from './recordRating';
import { prepareReviewQueue, type ReviewQueueItem } from './reviewQueue';
import { formatDueDateTime, formatScheduleDelay } from './schedulePresentation';

const ratingOptions: Array<{ rating: ReviewRating; label: string }> = [
  { rating: 'unknown', label: '不认识' },
  { rating: 'fuzzy', label: '模糊' },
  { rating: 'known', label: '认识' },
];

function speechLocale(profile: LearnerProfile, card: CardRecord): string {
  const language = card.pronunciationLang ?? profile.defaultLearningLang;
  return language.toLocaleLowerCase().startsWith('es')
    ? profile.spanishVoiceLocale
    : profile.englishVoiceLocale;
}

export function ReviewPage() {
  const { cloudStatus, selectedLearnerProfileId } = useApp();
  const { loading: profileLoading, profile } = useSelectedLearnerProfile();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [listeningMode, setListeningMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const lastAutoSpeechKey = useRef<string | null>(null);
  const current = queue[index];

  useEffect(() => {
    if (profile) setListeningMode(profile.listeningModeDefault);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    setLoading(true);

    void prepareReviewQueue(
      appServices.database,
      profile.learnerProfileId,
      profile.contentProfileId,
      profile.dailyNewCardLimit,
      () => appServices.contentSync.run(profile.contentProfileId),
    )
      .then((nextQueue) => {
        if (active) {
          setQueue(nextQueue);
          setIndex(0);
          setRevealed(false);
          lastAutoSpeechKey.current = null;
        }
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : '读取复习队列失败。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || !current?.card.pronunciationText || !(profile.autoSpeak ?? true)) return;
    const shouldSpeak = current.card.cardType === 'recognition' ? !revealed : revealed;
    const phase = current.card.cardType === 'recognition' ? 'prompt' : 'answer';
    const speechKey = `${current.card.cardId}:${phase}`;

    if (!shouldSpeak || lastAutoSpeechKey.current === speechKey) return;
    lastAutoSpeechKey.current = speechKey;
    void appServices.speech.speak({
      text: current.card.pronunciationText,
      locale: speechLocale(profile, current.card),
      rate: profile.ttsRate,
    }).catch(() => undefined);

    return () => appServices.speech.stop();
  }, [current, profile, revealed]);

  if (!selectedLearnerProfileId) return <Navigate replace to="/profiles" />;
  if (profileLoading || loading) return <p className="route-loading" role="status">正在准备复习队列…</p>;
  if (!profile) return <Navigate replace to="/profiles" />;

  async function speak(card: CardRecord) {
    if (!card.pronunciationText) return;
    setMessage(null);

    try {
      await appServices.speech.speak({
        text: card.pronunciationText,
        locale: speechLocale(profile!, card),
        rate: profile!.ttsRate,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '语音播放失败。');
    }
  }

  async function rate(rating: ReviewRating) {
    if (!current) return;
    setSaving(true);
    setMessage(null);

    try {
      const result = await recordRating(appServices.database, {
        learnerProfileId: profile!.learnerProfileId,
        cardId: current.card.cardId,
        rating,
        deviceId: getOrCreateDeviceId(),
      });
      setScheduleNotice(`上张已保存 · 下次 ${formatDueDateTime(result.state.dueAt)}`);
      setIndex((currentIndex) => currentIndex + 1);
      setRevealed(false);

      if (cloudStatus === 'paired' && profile!.cloudSyncId) {
        void appServices.progressSync.run(profile!.learnerProfileId).catch((error: unknown) => {
          setMessage(`评分已保存到本机，云同步稍后重试。${error instanceof Error ? error.message : ''}`);
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存评分失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  if (!current) {
    return (
      <section className="page narrow completion-card">
        <p className="eyebrow">{queue.length > 0 ? '本轮完成' : '复习'}</p>
        <h1>{queue.length > 0 ? '今天先复习到这里。' : '当前没有可复习卡片'}</h1>
        <p>{queue.length > 0 ? `已完成 ${queue.length} 张卡片，每次评分都已保存到本机。` : '已自动检查学习内容；当前没有到期卡片或新卡名额。'}</p>
        {scheduleNotice ? <p className="schedule-notice">{scheduleNotice}</p> : null}
        <div className="completion-actions">
          <Link className="primary-action" to="/progress">查看学习进度</Link>
          <Link className="secondary-link" to="/">返回首页</Link>
        </div>
        {message ? <p className="status-message" role="status">{message}</p> : null}
      </section>
    );
  }

  const previewedAt = new Date();
  const ratingPreviews = new Map(ratingOptions.map(({ rating }) => [
    rating,
    previewReviewSchedule(current.state, rating, previewedAt.toISOString()),
  ]));
  const listeningCard = listeningMode && current.card.cardType === 'recognition';
  const hideTarget = listeningCard && !revealed;
  const canSpeakNow = Boolean(
    current.card.pronunciationText
    && (current.card.cardType === 'recognition' || revealed),
  );

  return (
    <section className="page narrow review-page">
      <div className="review-progress">
        <span>{profile.contentProfileId}</span>
        <span>{index + 1} / {queue.length}</span>
      </div>
      <div className="review-progress-track" aria-hidden="true"><span style={{ width: `${(index + 1) / queue.length * 100}%` }} /></div>
      <div className="review-tools">
        <button className={listeningMode ? 'active' : undefined} onClick={() => setListeningMode((value) => !value)} type="button">
          {listeningMode ? '听力模式已开' : '听力模式'}
        </button>
        {canSpeakNow ? <button onClick={() => void speak(current.card)} type="button">🔊 再听一次</button> : null}
      </div>

      {scheduleNotice ? <p className="schedule-notice" role="status">{scheduleNotice}</p> : null}

      <article className="review-card">
        <span className="card-kind">{current.card.cardType === 'recognition' ? '理解' : '表达'}</span>
        {hideTarget ? (
          <div className="listening-prompt">
            <span aria-hidden="true">◖))</span>
            <h1>请听发音，回想它的含义</h1>
            <button onClick={() => void speak(current.card)} type="button">播放发音</button>
          </div>
        ) : <h1>{current.card.prompt}</h1>}

        {revealed ? (
          <div className="answer-panel">
            <span>答案</span>
            {listeningCard ? <p>{current.card.prompt}</p> : null}
            <strong>{current.card.answer}</strong>
          </div>
        ) : (
          <button className="reveal-button" onClick={() => setRevealed(true)} type="button">显示答案</button>
        )}
      </article>

      {revealed ? (
        <div className="rating-grid" aria-label="评分">
          {ratingOptions.map((option) => (
            <button disabled={saving} key={option.rating} onClick={() => void rate(option.rating)} type="button">
              <strong>{option.label}</strong>
              <span>{formatScheduleDelay(ratingPreviews.get(option.rating)!.dueAt, previewedAt)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
