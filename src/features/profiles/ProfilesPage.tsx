import { type FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { LearnerProfile } from '../../domain/profile';
import {
  createLearnerProfile,
  loadCachedLearnerProfiles,
  loadLearnerProfiles,
} from './profileRepository';

export function ProfilesPage() {
  const { authStatus, session, selectLearnerProfile } = useApp();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<LearnerProfile[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void loadCachedLearnerProfiles(session.userId, appServices.localProfiles)
      .then((result) => {
        if (active) {
          setProfiles(result);
        }

        return loadLearnerProfiles(
          session.userId,
          appServices.profiles,
          appServices.localProfiles,
        );
      })
      .then((result) => {
        if (active) {
          setProfiles(result);
          setMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const detail = error instanceof Error ? error.message : '云端暂时不可用。';
          setMessage(`云端同步失败，已保留本地学习者。${detail}`);
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

  if (authStatus === 'ready' && !session) {
    return <Navigate replace to="/sign-in" />;
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const profile = await createLearnerProfile(
        {
          userId: session.userId,
          displayName,
          contentProfileId: 'manman',
        },
        appServices.profiles,
        appServices.localProfiles,
      );
      setProfiles((current) => [...current, profile]);
      setDisplayName('');
      setMessage('学习者已创建并保存到本地。');
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
      <h1>选择学习进度</h1>
      <p>一个账号可管理多个学习者，每个学习者拥有独立的复习事件与进度。</p>

      {loading ? <p role="status">正在同步…</p> : null}

      <div className="profile-list">
        {profiles.map((profile) => (
          <button
            className="profile-card"
            key={profile.learnerProfileId}
            onClick={() => chooseProfile(profile)}
            type="button"
          >
            <strong>{profile.displayName}</strong>
            <span>内容：{profile.contentProfileId}</span>
          </button>
        ))}
      </div>

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
        <button disabled={loading} type="submit">创建学习者</button>
      </form>

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
