import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { appServices } from '../../app/services';

export function SignInPage() {
  const { authStatus, session } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage('邮件已发送。可点击邮件链接，或输入邮件中的验证码。');
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
      <p className="eyebrow">账号</p>
      <h1>邮箱验证码登录</h1>
      <p>首次登录会创建账号；之后浏览器会安全复用登录会话。</p>

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
        <button disabled={busy} type="submit">{busy ? '发送中…' : '发送登录邮件'}</button>
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
    </section>
  );
}
