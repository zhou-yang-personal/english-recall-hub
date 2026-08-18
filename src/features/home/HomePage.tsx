import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import {
  syncContent,
  type ContentSyncReport,
} from '../content-sync/syncContent';
import { useSelectedLearnerProfile } from '../profiles/useSelectedLearnerProfile';
import { getReviewSummary, type ReviewSummary } from '../review/reviewQueue';

const inFlightContentSyncs = new Map<string, Promise<ContentSyncReport>>();

function runContentSync(contentProfileId: string): Promise<ContentSyncReport> {
  const existing = inFlightContentSyncs.get(contentProfileId);

  if (existing) {
    return existing;
  }

  const request = syncContent(
    contentProfileId,
    appServices.cardSource,
    appServices.contentStore,
  ).finally(() => {
    inFlightContentSyncs.delete(contentProfileId);
  });
  inFlightContentSyncs.set(contentProfileId, request);
  return request;
}

const emptySummary: ReviewSummary = {
  due: 0,
  learning: 0,
  newCards: 0,
  totalCards: 0,
};

export function HomePage() {
  const { selectedLearnerProfileId } = useApp();
  const { loading: profileLoading, profile } = useSelectedLearnerProfile();
  const [summary, setSummary] = useState<ReviewSummary>(emptySummary);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ready' | 'failed'>('idle');
  const [syncMessage, setSyncMessage] = useState('尚未检查学习内容。');

  useEffect(() => {
    if (!profile) {
      return;
    }

    let active = true;

    const refreshSummary = async () => {
      const nextSummary = await getReviewSummary(
        appServices.database,
        profile.learnerProfileId,
        profile.contentProfileId,
        profile.dailyNewCardLimit,
      );

      if (active) {
        setSummary(nextSummary);
      }
    };

    const initialize = async () => {
      await refreshSummary();

      if (active) {
        setSyncStatus('syncing');
        setSyncMessage('正在检查并导入学习内容…');
      }

      try {
        const report = await runContentSync(profile.contentProfileId);
        await refreshSummary();

        if (active) {
          setSyncStatus('ready');
          setSyncMessage(
            report.status === 'updated'
              ? `内容已更新：${report.validNotes} 条 Note，生成 ${report.generatedCards} 张卡片。`
              : `内容没有变化：本机已有 ${report.validNotes} 条 Note、${report.generatedCards} 张卡片。`,
          );
        }
      } catch (error) {
        if (active) {
          setSyncStatus('failed');
          setSyncMessage(
            `内容同步失败，已保留本机已有卡片。${error instanceof Error ? error.message : ''}`,
          );
        }
      }
    };

    void initialize();

    return () => {
      active = false;
    };
  }, [profile]);

  if (!selectedLearnerProfileId) {
    return <Navigate replace to="/profiles" />;
  }

  if (profileLoading) {
    return <p className="route-loading" role="status">正在读取学习者…</p>;
  }

  if (!profile) {
    return <Navigate replace to="/profiles" />;
  }

  const activeProfile = profile;

  async function manuallySyncContent() {
    setSyncStatus('syncing');
    setSyncMessage('正在检查并导入学习内容…');

    try {
      const report = await runContentSync(activeProfile.contentProfileId);
      const nextSummary = await getReviewSummary(
        appServices.database,
        activeProfile.learnerProfileId,
        activeProfile.contentProfileId,
        activeProfile.dailyNewCardLimit,
      );
      setSummary(nextSummary);
      setSyncStatus('ready');
      setSyncMessage(
        report.status === 'updated'
          ? `内容已更新：${report.validNotes} 条 Note，生成 ${report.generatedCards} 张卡片。`
          : '内容已经是最新版本。',
      );
    } catch (error) {
      setSyncStatus('failed');
      setSyncMessage(
        `内容同步失败，已保留本机已有卡片。${error instanceof Error ? error.message : ''}`,
      );
    }
  }

  return (
    <section className="page hero">
      <div>
        <p className="eyebrow">{activeProfile.displayName} · 今日复习</p>
        <h1>把学过的内容，真正记住。</h1>
        <p className="lead">
          卡片和复习进度保存在本机。联网时会检查公开学习内容，断网后仍可使用已导入的卡片。
        </p>
        <div className={`sync-panel ${syncStatus === 'failed' ? 'error' : ''}`}>
          <span role="status">{syncMessage}</span>
          <button
            disabled={syncStatus === 'syncing'}
            onClick={() => void manuallySyncContent()}
            type="button"
          >
            {syncStatus === 'syncing' ? '同步中…' : '同步学习内容'}
          </button>
        </div>
        {summary.due + summary.newCards > 0 ? (
          <Link className="primary-action" to="/review">开始复习</Link>
        ) : null}
      </div>
      <div className="metric-grid" aria-label="复习概览">
        <article><strong>{summary.due}</strong><span>到期</span></article>
        <article><strong>{summary.learning}</strong><span>学习中</span></article>
        <article><strong>{summary.newCards}</strong><span>今日新卡</span></article>
        <p className="card-total">本机共 {summary.totalCards} 张可用卡片</p>
      </div>
    </section>
  );
}
