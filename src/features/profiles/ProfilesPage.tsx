import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { LearnerProfile } from '../../domain/profile';
import {
  createLocalLearnerProfile,
  createLearnerProfile,
  listLocalLearnerProfiles,
  loadLearnerProfiles,
} from './profileRepository';

export function ProfilesPage() {
  const { authStatus, session, selectLearnerProfile } = useApp();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<LearnerProfile[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [createInCloud, setCreateInCloud] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void listLocalLearnerProfiles(appServices.localProfiles)
      .then(async (result) => {
        if (active) {
          setProfiles(result);
        }

        if (session) {
          await loadLearnerProfiles(
            session.userId,
            appServices.profiles,
            appServices.localProfiles,
          );
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
            session
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
  }, [session]);

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);

    try {
      const profile = createInCloud && session
        ? await createLearnerProfile(
            {
              userId: session.userId,
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
      setProfiles((current) => [...current, profile]);
      setDisplayName('');
      setMessage(
        profile.userId
          ? '学习者已创建，并保存到本机和云端。'
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

  return (
    <section className="page narrow">
      <p className="eyebrow">学习者</p>
      <h1>选择学习者</h1>
      <p>直接选择或创建学习者即可开始。学习数据默认保存在本机，云同步是可选功能。</p>

      {loading ? <p role="status">正在读取学习者…</p> : null}

      <div className="profile-list">
        {profiles.map((profile) => (
          <button
            className="profile-card"
            key={profile.learnerProfileId}
            onClick={() => chooseProfile(profile)}
            type="button"
          >
            <strong>{profile.displayName}</strong>
            <span>
              {profile.userId
                ? session?.userId === profile.userId
                  ? '云端已连接'
                  : '本机可用 · 云同步暂停'
                : '仅保存在本机'}
              {' · '}内容：{profile.contentProfileId}
            </span>
          </button>
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
        {session ? (
          <label className="check-row" htmlFor="create-in-cloud">
            <input
              checked={createInCloud}
              disabled={loading}
              id="create-in-cloud"
              onChange={(event) => setCreateInCloud(event.target.checked)}
              type="checkbox"
            />
            同时保存到云端（可选）
          </label>
        ) : null}
        <button disabled={loading} type="submit">创建学习者</button>
      </form>

      {authStatus === 'ready' && !session ? (
        <p className="cloud-option">
          只在需要跨设备同步或恢复数据时，才需要 <Link to="/sign-in">开启云同步</Link>。
        </p>
      ) : null}

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
