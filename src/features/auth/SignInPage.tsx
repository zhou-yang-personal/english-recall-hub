import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';

export function SignInPage() {
  const { authStatus, session } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (authStatus === 'ready' && session) {
    return <Navigate replace to="/profiles" />;
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await appServices.auth.requestEmailOtp(email.trim(), `${window.location.origin}/profiles`);
      setRequestSent(true);
      setCooldown(60);
      setMessage('邮件已发送。请点击最新邮件中的登录链接；如果邮件显示验证码，也可在下方输入。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发送失败，请稍后再试。');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await appServices.auth.verifyEmailOtp(email.trim(), token.trim());
      navigate('/profiles', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码无效或已过期。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page narrow">
      <p className="eyebrow">可选功能</p>
      <h1>开启云同步</h1>
      <p>日常学习不需要登录。仅在需要跨设备同步或恢复云端学习者时连接邮箱账号。</p>

      <form className="form-card" onSubmit={requestOtp}>
        <label htmlFor="email">邮箱</label>
        <input
          autoComplete="email"
          disabled={busy}
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <button disabled={busy || cooldown > 0} type="submit">
          {busy ? '发送中…' : cooldown > 0 ? `${cooldown} 秒后可重发` : '发送登录邮件'}
        </button>
      </form>

      {requestSent ? (
        <form className="form-card secondary-form" onSubmit={verifyOtp}>
          <label htmlFor="token">验证码</label>
          <input
            autoComplete="one-time-code"
            disabled={busy}
            id="token"
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => setToken(event.target.value)}
            required
            value={token}
          />
          <button disabled={busy} type="submit">验证并登录</button>
        </form>
      ) : null}

      {message ? <p className="status-message" role="status">{message}</p> : null}
      <p className="cloud-option"><Link to="/profiles">不登录，返回选择学习者</Link></p>
    </section>
  );
}
