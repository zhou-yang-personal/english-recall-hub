import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/AppContext';

export function PairDevicePage() {
  const { cloudStatus, pairDevice, refreshCloudStatus } = useApp();
  const navigate = useNavigate();
  const [pairingCode, setPairingCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (cloudStatus === 'paired') {
    return <Navigate replace to="/profiles" />;
  }

  async function pair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await pairDevice(pairingCode);
      navigate('/profiles', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '配对失败，请稍后再试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page narrow">
      <p className="eyebrow">仅新设备需要一次</p>
      <h1>配对家庭云同步</h1>
      <p>输入家庭同步码后，这台设备会长期保持授权。以后打开应用可直接选择学习者，不需要邮箱、验证码或日常登录。</p>

      <form className="form-card" onSubmit={pair}>
        <label htmlFor="pairing-code">家庭同步码</label>
        <input
          autoCapitalize="none"
          autoComplete="off"
          disabled={busy}
          id="pairing-code"
          minLength={12}
          onChange={(event) => setPairingCode(event.target.value)}
          required
          type="password"
          value={pairingCode}
        />
        <button disabled={busy} type="submit">{busy ? '正在配对…' : '配对这台设备'}</button>
      </form>

      {cloudStatus === 'unavailable' ? (
        <p className="status-message" role="status">
          云同步后台暂时不可用或尚未配置。你仍可返回使用本机学习者。{' '}
          <button className="inline-button" onClick={() => void refreshCloudStatus()} type="button">重新检查</button>
        </p>
      ) : null}
      {message ? <p className="status-message" role="status">{message}</p> : null}
      <p className="cloud-option"><Link to="/profiles">暂不配对，返回选择学习者</Link></p>
    </section>
  );
}
