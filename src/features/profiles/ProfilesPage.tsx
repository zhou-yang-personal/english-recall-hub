import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { LearnerProfile } from '../../domain/profile';
import {
  createLocalLearnerProfile,
  createLearnerProfile,
  linkLocalLearnerProfile,
  listLocalLearnerProfiles,
  loadLearnerProfiles,
} from './profileRepository';

export function ProfilesPage() {
  const { cloudStatus, selectLearnerProfile } = useApp();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<LearnerProfile[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkingProfileId, setLinkingProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const duplicateKeys = new Set(
    profiles
      .map((profile) => `${profile.displayName.trim().toLocaleLowerCase()}|${profile.contentProfileId}`)
      .filter((key, index, keys) => keys.indexOf(key) !== index),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    void listLocalLearnerProfiles(appServices.localProfiles)
      .then(async (result) => {
        if (active) {
          setProfiles(result);
        }

        if (cloudStatus === 'paired') {
          await loadLearnerProfiles(appServices.profiles, appServices.localProfiles);
          return listLocalLearnerProfiles(appServices.localProfiles);
        }

        return result;
      })
      .then((result) => {
        if (active) {
          setProfiles(result);
          setMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const detail = error instanceof Error ? error.message : '暂时不可用。';
          setMessage(
            cloudStatus === 'paired'
              ? `云端同步失败，已保留本地学习者。${detail}`
              : `读取本机学习者失败。${detail}`,
          );
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
  }, [cloudStatus]);

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);

    try {
      const profile = cloudStatus === 'paired'
        ? await createLearnerProfile(
            {
              displayName,
              contentProfileId: 'manman',
            },
            appServices.profiles,
            appServices.localProfiles,
          )
        : await createLocalLearnerProfile(
            { displayName, contentProfileId: 'manman' },
            appServices.localProfiles,
          );
      setProfiles((current) => {
        const existingIndex = current.findIndex(
          ({ learnerProfileId }) => learnerProfileId === profile.learnerProfileId,
        );

        if (existingIndex === -1) {
          return [...current, profile];
        }

        return current.map((item, index) => index === existingIndex ? profile : item);
      });
      setDisplayName('');
      setMessage(
        profile.cloudSyncId
          ? '学习者已创建，并保存到本机和家庭云端。'
          : '学习者已创建并保存到本机，无需登录即可使用。',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '创建学习者失败。');
    } finally {
      setLoading(false);
    }
  }

  function chooseProfile(profile: LearnerProfile) {
    selectLearnerProfile(profile.learnerProfileId);
    navigate('/');
  }

  async function linkProfile(profile: LearnerProfile) {
    setLinkingProfileId(profile.learnerProfileId);
    setMessage(null);

    try {
      const linked = await linkLocalLearnerProfile(
        profile,
        appServices.profiles,
        appServices.localProfiles,
      );
      setProfiles((current) => current.map((item) => (
        item.learnerProfileId === linked.learnerProfileId ? linked : item
      )));
      setMessage(`${linked.displayName} 已加入家庭云端，现有本机进度会在联网时同步。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加入家庭云端失败。');
    } finally {
      setLinkingProfileId(null);
    }
  }

  return (
    <section className="page narrow">
      <p className="eyebrow">学习者</p>
      <h1>选择学习者</h1>
      <p>直接选择学习者即可开始。已配对设备会自动读取家庭学习者，不需要邮箱登录。</p>

      {loading ? <p role="status">正在读取学习者…</p> : null}

      {duplicateKeys.size > 0 ? (
        <p className="status-message" role="status">
          发现同名学习者。它们是不同的进度记录，系统不会自动合并或删除；记录尾号用于区分。
        </p>
      ) : null}

      <div className="profile-list">
        {profiles.map((profile) => (
          <div className="profile-card" key={profile.learnerProfileId}>
            <button className="profile-card-main" onClick={() => chooseProfile(profile)} type="button">
              <strong>{profile.displayName}</strong>
              <span>
                {profile.cloudSyncId
                  ? cloudStatus === 'paired' ? '家庭云端已连接' : '本机可用 · 云同步暂停'
                  : '仅保存在本机'}
                {' · '}内容：{profile.contentProfileId}
                {duplicateKeys.has(
                  `${profile.displayName.trim().toLocaleLowerCase()}|${profile.contentProfileId}`,
                ) ? ` · 记录尾号：${profile.learnerProfileId.slice(-4)}` : ''}
              </span>
            </button>
            {cloudStatus === 'paired' && !profile.cloudSyncId ? (
              <button
                className="secondary-action"
                disabled={linkingProfileId === profile.learnerProfileId}
                onClick={() => void linkProfile(profile)}
                type="button"
              >
                {linkingProfileId === profile.learnerProfileId ? '正在加入…' : '加入家庭云端'}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {!loading && profiles.length === 0 ? (
        <p className="empty-state">还没有学习者，请在下面创建一个。</p>
      ) : null}

      <form className="form-card" onSubmit={createProfile}>
        <label htmlFor="display-name">新学习者名称</label>
        <input
          disabled={loading}
          id="display-name"
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          value={displayName}
        />
        <button disabled={loading} type="submit">
          {cloudStatus === 'paired' ? '创建家庭学习者' : '创建本机学习者'}
        </button>
      </form>

      {cloudStatus !== 'paired' ? (
        <p className="cloud-option">
          需要跨设备同步时，只需在本设备 <Link to="/pair-device">输入一次家庭同步码</Link>。
        </p>
      ) : null}

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
