import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';
import type { LearnerProfile } from '../../domain/profile';
import { resetAppResources } from '../app-update/resetAppResources';
import {
  type LearnerProfileSettings,
  updateLearnerProfileSettings,
} from '../profiles/profileRepository';
import { useSelectedLearnerProfile } from '../profiles/useSelectedLearnerProfile';

function settingsFromProfile(profile: LearnerProfile): LearnerProfileSettings {
  return {
    uiLang: profile.uiLang,
    nativeLang: profile.nativeLang,
    defaultLearningLang: profile.defaultLearningLang,
    englishVoiceLocale: profile.englishVoiceLocale,
    spanishVoiceLocale: profile.spanishVoiceLocale,
    ttsRate: profile.ttsRate,
    autoSpeak: profile.autoSpeak ?? true,
    listeningModeDefault: profile.listeningModeDefault,
    dailyNewCardLimit: profile.dailyNewCardLimit,
  };
}

export function SettingsPage() {
  const { cloudStatus, selectedLearnerProfileId, unpairDevice } = useApp();
  const { loading, profile } = useSelectedLearnerProfile();
  const [settings, setSettings] = useState<LearnerProfileSettings>();
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setSettings(settingsFromProfile(profile));
  }, [profile]);

  if (!selectedLearnerProfileId) return <Navigate replace to="/profiles" />;
  if (loading || !settings) return <p className="route-loading" role="status">正在读取设置…</p>;
  if (!profile) return <Navigate replace to="/profiles" />;

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateLearnerProfileSettings(
        profile!,
        settings!,
        cloudStatus === 'paired' && profile!.cloudSyncId ? appServices.profiles : undefined,
        appServices.localProfiles,
      );
      setMessage(cloudStatus === 'paired' && profile!.cloudSyncId
        ? '设置已保存到本机和家庭云端。'
        : '设置已保存到本机。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存设置失败。');
    } finally {
      setSaving(false);
    }
  }

  async function testVoice() {
    setMessage(null);

    try {
      await appServices.speech.speak({
        text: 'Keep going. You are making progress.',
        locale: settings!.englishVoiceLocale,
        rate: settings!.ttsRate,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '语音播放失败。');
    }
  }

  async function reloadLatestResources() {
    setReloading(true);
    setMessage('正在清理旧版 Web 资源并重新加载…');

    try {
      await resetAppResources();
    } catch (error) {
      setReloading(false);
      setMessage(error instanceof Error ? error.message : '重新加载最新版失败，请稍后重试。');
    }
  }

  return (
    <section className="page narrow settings-page">
      <p className="eyebrow">{profile.contentProfileId} · 设置</p>
      <h1>让复习更顺手。</h1>

      <form className="settings-form" onSubmit={saveSettings}>
        <section className="setting-card">
          <div><strong>发音与听力</strong><span>使用手机或电脑内置的 Web Speech 语音。</span></div>
          <label className="toggle-row">
            <span><strong>自动朗读</strong><small>理解卡出现时、表达卡揭示后自动播放</small></span>
            <input
              checked={settings.autoSpeak}
              onChange={(event) => setSettings({ ...settings, autoSpeak: event.target.checked })}
              type="checkbox"
            />
          </label>
          <label className="toggle-row">
            <span><strong>默认听力模式</strong><small>先听发音，揭示后再显示英文目标</small></span>
            <input
              checked={settings.listeningModeDefault}
              onChange={(event) => setSettings({ ...settings, listeningModeDefault: event.target.checked })}
              type="checkbox"
            />
          </label>
          <div className="field-grid">
            <label>英文口音
              <select
                onChange={(event) => setSettings({ ...settings, englishVoiceLocale: event.target.value as LearnerProfileSettings['englishVoiceLocale'] })}
                value={settings.englishVoiceLocale}
              >
                <option value="en-US">美式英语</option>
                <option value="en-GB">英式英语</option>
              </select>
            </label>
            <label>西班牙语口音
              <select
                onChange={(event) => setSettings({ ...settings, spanishVoiceLocale: event.target.value as LearnerProfileSettings['spanishVoiceLocale'] })}
                value={settings.spanishVoiceLocale}
              >
                <option value="es-MX">墨西哥西语</option>
                <option value="es-US">美国西语</option>
                <option value="es-ES">西班牙西语</option>
              </select>
            </label>
            <label>语速
              <select
                onChange={(event) => setSettings({ ...settings, ttsRate: Number(event.target.value) as LearnerProfileSettings['ttsRate'] })}
                value={settings.ttsRate}
              >
                <option value="0.75">0.75x</option>
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
              </select>
            </label>
            <label>每日新卡
              <input
                max={100}
                min={0}
                onChange={(event) => setSettings({ ...settings, dailyNewCardLimit: Number(event.target.value) })}
                type="number"
                value={settings.dailyNewCardLimit}
              />
            </label>
          </div>
          <button className="secondary-action" onClick={() => void testVoice()} type="button">试听英文发音</button>
        </section>

        <button className="primary-action" disabled={saving} type="submit">
          {saving ? '正在保存…' : '保存学习设置'}
        </button>
      </form>

      <section className="setting-card">
        <div><strong>学习者与家庭云端</strong><span>学习数据先保存在本机，配对设备会同步复习事件和设置。</span></div>
        <Link to="/profiles">切换学习者</Link>
        {cloudStatus === 'paired' ? (
          <button className="secondary-action" onClick={() => void unpairDevice()} type="button">断开此设备</button>
        ) : (
          <Link to="/pair-device">输入家庭同步码</Link>
        )}
      </section>

      <section className="setting-card app-update-card">
        <div><strong>应用更新</strong><span>当前版本：{__APP_VERSION__}</span></div>
        <p>清除旧的 Web/PWA 资源缓存并重新加载当前页面，不会删除学习者、卡片、复习进度、待同步事件或家庭配对。</p>
        <button
          className="secondary-action"
          disabled={reloading}
          onClick={() => void reloadLatestResources()}
          type="button"
        >
          {reloading ? '正在重新加载…' : '重新加载最新版'}
        </button>
      </section>

      {message ? <p className="status-message" role="status">{message}</p> : null}
    </section>
  );
}
