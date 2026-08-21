import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import { useSelectedLearnerProfile } from '../profiles/useSelectedLearnerProfile';
import { getReviewSummary, type ReviewSummary } from '../review/reviewQueue';

const emptySummary: ReviewSummary = {
  due: 0,
  learning: 0,
  newCards: 0,
  totalCards: 0,
};

export function HomePage() {
  const { cloudStatus, selectedLearnerProfileId } = useApp();
  const { loading: profileLoading, profile } = useSelectedLearnerProfile();
  const [summary, setSummary] = useState<ReviewSummary>(emptySummary);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ready' | 'failed'>('idle');
  const [syncMessage, setSyncMessage] = useState('尚未检查学习内容。');
  const [progressStatus, setProgressStatus] = useState<'local' | 'syncing' | 'ready' | 'failed'>('local');
  const [progressMessage, setProgressMessage] = useState('复习进度保存在本机。');

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

      if (cloudStatus === 'paired' && profile.cloudSyncId) {
        if (active) {
          setProgressStatus('syncing');
          setProgressMessage('正在同步家庭学习进度…');
        }

        try {
          const report = await appServices.progressSync.run(profile.learnerProfileId);
          await refreshSummary();

          if (active) {
            setProgressStatus('ready');
            setProgressMessage(
              report.pushed + report.pulled > 0
                ? `进度已同步：上传 ${report.pushed} 条，接收 ${report.pulled} 条。`
                : '家庭学习进度已同步。',
            );
          }
        } catch (error) {
          if (active) {
            setProgressStatus('failed');
            setProgressMessage(`进度同步失败，本机记录会保留。${error instanceof Error ? error.message : ''}`);
          }
        }
      } else if (active) {
        setProgressStatus('local');
        setProgressMessage(
          profile.cloudSyncId
            ? '此设备尚未配对，复习进度继续保存在本机。'
            : '此学习者仅保存在本机，可在学习者页面加入家庭云端。',
        );
      }

      if (active) {
        setSyncStatus('syncing');
        setSyncMessage('正在检查并导入学习内容…');
      }

      try {
        const report = await appServices.contentSync.run(profile.contentProfileId);
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
  }, [cloudStatus, profile]);

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
      const report = await appServices.contentSync.run(activeProfile.contentProfileId);
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

  async function manuallySyncProgress() {
    setProgressStatus('syncing');
    setProgressMessage('正在同步家庭学习进度…');

    try {
      const report = await appServices.progressSync.run(activeProfile.learnerProfileId);
      const nextSummary = await getReviewSummary(
        appServices.database,
        activeProfile.learnerProfileId,
        activeProfile.contentProfileId,
        activeProfile.dailyNewCardLimit,
      );
      setSummary(nextSummary);
      setProgressStatus('ready');
      setProgressMessage(`进度已同步：上传 ${report.pushed} 条，接收 ${report.pulled} 条。`);
    } catch (error) {
      setProgressStatus('failed');
      setProgressMessage(`进度同步失败，本机记录会保留。${error instanceof Error ? error.message : ''}`);
    }
  }

  return (
    <section className="page hero">
      <div>
        <p className="eyebrow">{activeProfile.contentProfileId} · 今日复习</p>
        <h1>把学过的内容，真正记住。</h1>
        <p className="lead">
          卡片和复习进度保存在本机。联网时会检查公开学习内容，断网后仍可使用已导入的卡片。
        </p>
        <div className="home-actions">
          {summary.due + summary.newCards > 0 ? (
            <Link className="primary-action" to="/review">开始复习</Link>
          ) : (
            <Link className="primary-action" to="/progress">查看学习进度</Link>
          )}
          <Link className="secondary-link" to="/progress">查看全部进度</Link>
        </div>
        <details className={`data-status ${syncStatus === 'failed' || progressStatus === 'failed' ? 'error' : ''}`}>
          <summary>
            <strong>数据状态</strong>
            <span>{syncStatus === 'syncing' || progressStatus === 'syncing' ? '正在同步…' : syncStatus === 'failed' || progressStatus === 'failed' ? '部分同步失败' : '本机数据已准备'}</span>
          </summary>
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
          <div className={`sync-panel ${progressStatus === 'failed' ? 'error' : ''}`}>
            <span role="status">{progressMessage}</span>
            {cloudStatus === 'paired' && activeProfile.cloudSyncId ? (
              <button
                disabled={progressStatus === 'syncing'}
                onClick={() => void manuallySyncProgress()}
                type="button"
              >
                {progressStatus === 'syncing' ? '同步中…' : '同步复习进度'}
              </button>
            ) : null}
          </div>
        </details>
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
