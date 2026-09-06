import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { LearnerProfile } from '../../domain/profile';
import type { ContentProfileSummary } from './contentProfileCatalog';
import {
  createLocalLearnerProfile,
  createLearnerProfile,
  findLearnerProfileForContent,
  linkLocalLearnerProfile,
  listLocalLearnerProfiles,
  loadLearnerProfiles,
} from './profileRepository';

function catalogFromCache(profiles: readonly LearnerProfile[]): ContentProfileSummary[] {
  return [...new Set(profiles.map(({ contentProfileId }) => contentProfileId))]
    .map((contentProfileId) => ({ contentProfileId, displayName: contentProfileId }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function ProfilesPage() {
  const {
    cloudStatus,
    selectedLearnerProfileId,
    selectLearnerProfile,
  } = useApp();
  const navigate = useNavigate();
  const [contentProfiles, setContentProfiles] = useState<ContentProfileSummary[]>([]);
  const [progressProfiles, setProgressProfiles] = useState<LearnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingContentProfileId, setSelectingContentProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      const localProfiles = await listLocalLearnerProfiles(appServices.localProfiles);
      let nextProgressProfiles = localProfiles;
      let syncMessage: string | null = null;

      if (cloudStatus === 'paired') {
        try {
          const cloudProfiles = await loadLearnerProfiles(
            appServices.profiles,
            appServices.localProfiles,
          );
          nextProgressProfiles = [
            ...cloudProfiles,
            ...localProfiles.filter((profile) => !profile.cloudSyncId),
          ];
        } catch (error) {
          const detail = error instanceof Error ? error.message : '暂时不可用。';
          syncMessage = `云端进度读取失败，已保留本机进度。${detail}`;
        }
      }

      let nextContentProfiles: ContentProfileSummary[];

      try {
        nextContentProfiles = await appServices.contentProfiles.list();
      } catch (error) {
        nextContentProfiles = catalogFromCache(nextProgressProfiles);
        const detail = error instanceof Error ? error.message : '暂时不可用。';
        syncMessage ??= nextContentProfiles.length > 0
          ? `GitHub 目录读取失败，暂时显示本机缓存。${detail}`
          : `GitHub 目录读取失败。${detail}`;
      }

      if (active) {
        setProgressProfiles(nextProgressProfiles);
        setContentProfiles(nextContentProfiles);
        setMessage(syncMessage);
        setLoading(false);
      }
    }

    void initialize().catch((error: unknown) => {
      if (active) {
        const detail = error instanceof Error ? error.message : '暂时不可用。';
        setMessage(`读取学习者失败。${detail}`);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [cloudStatus]);

  async function chooseContentProfile(contentProfile: ContentProfileSummary) {
    setSelectingContentProfileId(contentProfile.contentProfileId);
    setMessage(null);

    try {
      const cloudProfile = findLearnerProfileForContent(
        progressProfiles.filter((candidate) => candidate.cloudSyncId === 'family'),
        contentProfile.contentProfileId,
        cloudStatus === 'paired' ? null : selectedLearnerProfileId,
      );
      const localProfile = findLearnerProfileForContent(
        progressProfiles.filter((candidate) => !candidate.cloudSyncId),
        contentProfile.contentProfileId,
        selectedLearnerProfileId,
      );
      let profile = cloudStatus === 'paired' ? cloudProfile : localProfile;

      if (!profile) {
        profile = cloudStatus === 'paired' && localProfile
          ? await linkLocalLearnerProfile(
              localProfile,
              appServices.profiles,
              appServices.localProfiles,
            )
          : cloudStatus === 'paired'
            ? await createLearnerProfile(
                {
                  displayName: contentProfile.displayName,
                  contentProfileId: contentProfile.contentProfileId,
                },
                appServices.profiles,
                appServices.localProfiles,
              )
            : await createLocalLearnerProfile(
                {
                  displayName: contentProfile.displayName,
                  contentProfileId: contentProfile.contentProfileId,
                },
                appServices.localProfiles,
              );
      }

      selectLearnerProfile(profile.learnerProfileId);
      navigate('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '选择学习者失败。');
      setSelectingContentProfileId(null);
    }
  }

  return (
    <section className="page narrow">
      <p className="eyebrow">学习者</p>
      <h1>选择学习者</h1>
      <p>学习者直接来自 GitHub 卡片目录。选择后即可开始，无需手工新建。</p>

      {loading ? <p role="status">正在读取 GitHub 学习者目录…</p> : null}

      <div className="profile-list">
        {contentProfiles.map((contentProfile) => {
          const progressProfile = findLearnerProfileForContent(
            progressProfiles,
            contentProfile.contentProfileId,
            cloudStatus === 'paired' ? null : selectedLearnerProfileId,
          );
          const isSelecting = selectingContentProfileId === contentProfile.contentProfileId;

          return (
            <div className="profile-card" key={contentProfile.contentProfileId}>
              <button
                className="profile-card-main"
                disabled={selectingContentProfileId !== null}
                onClick={() => void chooseContentProfile(contentProfile)}
                type="button"
              >
                <strong>{contentProfile.displayName}</strong>
                <span>
                  {isSelecting
                    ? '正在准备…'
                    : progressProfile?.cloudSyncId
                      ? cloudStatus === 'paired' ? '家庭云端进度已连接' : '本机可用 · 云同步暂停'
                      : progressProfile ? '本机进度已准备' : '首次选择时自动准备进度'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {!loading && contentProfiles.length === 0 ? (
        <p className="empty-state">GitHub 卡片目录中还没有可选择的学习者。</p>
      ) : null}

      {cloudStatus !== 'paired' ? (
        <p className="cloud-option">
          需要跨设备同步时，只需在本设备 <Link to="/pair-device">输入一次家庭同步码</Link>。
        </p>
      ) : null}

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
