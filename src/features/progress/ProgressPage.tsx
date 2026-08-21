import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import { useSelectedLearnerProfile } from '../profiles/useSelectedLearnerProfile';
import { REVIEW_STAGE_LABELS, formatDueDateTime } from '../review/schedulePresentation';
import {
  loadProgressInsights,
  type NoteProgressInsight,
  type ProgressInsights,
} from './progressInsights';

type ProgressFilter = 'all' | 'due' | 'learning' | 'mature' | 'forgotten';

const filterOptions: Array<{ value: ProgressFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'due', label: '已到期' },
  { value: 'learning', label: '学习中' },
  { value: 'mature', label: '熟练' },
  { value: 'forgotten', label: '遗忘过' },
];

function matchesFilter(item: NoteProgressInsight, filter: ProgressFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'due') return item.due;
  if (filter === 'forgotten') return item.forgotten;
  return item.category === filter;
}

export function ProgressPage() {
  const { cloudStatus, selectedLearnerProfileId } = useApp();
  const { loading: profileLoading, profile } = useSelectedLearnerProfile();
  const [insights, setInsights] = useState<ProgressInsights>();
  const [filter, setFilter] = useState<ProgressFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;

    async function initialize() {
      setLoading(true);
      setMessage(null);
      const warnings: string[] = [];

      if (cloudStatus === 'paired' && profile?.cloudSyncId) {
        try {
          await appServices.progressSync.run(profile.learnerProfileId);
        } catch {
          warnings.push('云端进度暂时不可用，当前显示本机记录。');
        }
      }

      try {
        await appServices.contentSync.run(profile!.contentProfileId);
      } catch {
        warnings.push('内容更新暂时不可用，当前显示本机内容。');
      }

      const nextInsights = await loadProgressInsights(
        appServices.database,
        profile!.learnerProfileId,
        profile!.contentProfileId,
      );

      if (active) {
        setInsights(nextInsights);
        setMessage(warnings.join(' ') || null);
        setLoading(false);
      }
    }

    void initialize().catch((error: unknown) => {
      if (active) {
        setMessage(error instanceof Error ? error.message : '读取复习进度失败。');
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [cloudStatus, profile]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return (insights?.items ?? []).filter((item) =>
      matchesFilter(item, filter)
      && (!normalizedSearch
        || item.core.toLocaleLowerCase().includes(normalizedSearch)
        || item.meaningCn.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [filter, insights, search]);

  if (!selectedLearnerProfileId) return <Navigate replace to="/profiles" />;
  if (profileLoading || loading) return <p className="route-loading" role="status">正在整理复习进度…</p>;
  if (!profile) return <Navigate replace to="/profiles" />;

  const maxActivity = Math.max(1, ...(insights?.recentActivity.map(({ count }) => count) ?? [1]));

  return (
    <section className="page progress-page">
      <p className="eyebrow">{profile.contentProfileId} · 学习进度</p>
      <h1>每一次复习，都看得见。</h1>
      <p className="lead">统计来自本机已同步的复习事件；离线时仍可查看。</p>

      <div className="insight-grid" aria-label="进度概览">
        <article><strong>{insights?.total ?? 0}</strong><span>学习条目</span></article>
        <article><strong>{insights?.due ?? 0}</strong><span>当前到期</span></article>
        <article><strong>{insights?.unseen ?? 0}</strong><span>未开始</span></article>
        <article><strong>{insights?.learning ?? 0}</strong><span>学习中</span></article>
        <article><strong>{insights?.review ?? 0}</strong><span>复习中</span></article>
        <article><strong>{insights?.mature ?? 0}</strong><span>熟练</span></article>
        <article><strong>{insights?.todayReviews ?? 0}</strong><span>今日复习</span></article>
      </div>

      <section className="activity-card" aria-labelledby="recent-activity-title">
        <div>
          <p className="section-kicker">最近 7 天</p>
          <h2 id="recent-activity-title">复习活动</h2>
        </div>
        <div className="activity-bars">
          {insights?.recentActivity.map((activity) => (
            <div className="activity-day" key={activity.dateKey}>
              <strong>{activity.count}</strong>
              <span
                aria-label={`${activity.label}复习 ${activity.count} 次`}
                className="activity-bar"
                style={{ height: `${Math.max(6, Math.round(activity.count / maxActivity * 72))}px` }}
              />
              <small>{activity.label}</small>
            </div>
          ))}
        </div>
      </section>

      <details className="mechanism-card">
        <summary>当前使用什么复习机制？</summary>
        <div>
          <p>首次：不认识 10 分钟，模糊 1 天，认识 3 天。</p>
          <p>后续：不认识重置为 10 分钟；模糊约为当前间隔 × 1.5；认识约为 × 2.5。</p>
          <p>间隔达到 90 天标记为熟练，最长间隔为 180 天。熟练后仍会安排维护复习。</p>
          <p>“至少还需”只估算未来每次都选“认识”时达到熟练的最少次数，不是固定轮数。</p>
        </div>
      </details>

      <div className="progress-toolbar">
        <div className="filter-row" aria-label="进度筛选">
          {filterOptions.map((option) => (
            <button
              className={filter === option.value ? 'active' : undefined}
              key={option.value}
              onClick={() => setFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          aria-label="搜索学习条目"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索英文或中文"
          type="search"
          value={search}
        />
      </div>

      <div className="progress-list">
        {visibleItems.map((item) => (
          <details className="progress-item" key={item.noteId}>
            <summary>
              <span><strong>{item.core}</strong><small>{item.meaningCn}</small></span>
              <span className={`stage-pill ${item.category}`}>{item.due ? '已到期' : item.category === 'unseen' ? '未开始' : item.category === 'learning' ? '学习中' : item.category === 'review' ? '复习中' : '熟练'}</span>
            </summary>
            <div className="card-progress-grid">
              {item.cards.map((card) => (
                <article key={card.cardId}>
                  <div><strong>{card.cardType === 'recognition' ? '理解' : '表达'}</strong><span>{REVIEW_STAGE_LABELS[card.stage]}</span></div>
                  <dl>
                    <div><dt>下次复习</dt><dd>{card.dueAt ? formatDueDateTime(card.dueAt) : '首次学习时'}</dd></div>
                    <div><dt>当前间隔</dt><dd>{card.intervalDays > 0 ? `${card.intervalDays} 天` : '未建立'}</dd></div>
                    <div><dt>已复习</dt><dd>{card.reviewCount} 次</dd></div>
                    <div><dt>遗忘</dt><dd>{card.lapseCount} 次</dd></div>
                  </dl>
                  <p>{card.minimumKnownRatingsToMature === 0 ? '已达到熟练阶段' : `至少还需 ${card.minimumKnownRatingsToMature} 次“认识”达到熟练`}</p>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>

      {visibleItems.length === 0 ? <p className="empty-state">没有符合当前条件的学习条目。</p> : null}
      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
