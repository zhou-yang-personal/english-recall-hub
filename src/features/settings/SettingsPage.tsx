import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';

export function SettingsPage() {
  const { authStatus, session } = useApp();

  return (
    <section className="page narrow">
      <p className="eyebrow">设置</p>
      <h1>本地与云端同步</h1>
      <p>学习数据默认保存在本机。后续会在这里提供内容同步、进度同步、语言、语音和每日新卡上限。</p>
      {authStatus === 'ready' ? (
        <div className="setting-card">
          <strong>云同步（可选）</strong>
          {session ? (
            <span>已连接 {session.email ?? '邮箱账号'}。本机学习不依赖持续联网。</span>
          ) : (
            <span>当前未连接，不影响本机选择学习者和保存进度。</span>
          )}
          {!session ? <Link to="/sign-in">开启云同步</Link> : null}
        </div>
      ) : null}
    </section>
  );
}
