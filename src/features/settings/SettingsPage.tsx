import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';

export function SettingsPage() {
  const { cloudStatus, unpairDevice } = useApp();

  return (
    <section className="page narrow">
      <p className="eyebrow">设置</p>
      <h1>本地与云端同步</h1>
      <p>学习数据始终先保存在本机；已配对设备会通过微型后台同步家庭学习进度。</p>
      {cloudStatus !== 'loading' ? (
        <div className="setting-card">
          <strong>家庭云同步</strong>
          {cloudStatus === 'paired' ? (
            <span>此设备已配对。日常打开可直接选择学习者，无需登录。</span>
          ) : (
            <span>此设备尚未配对，不影响本机选择学习者和保存进度。</span>
          )}
          {cloudStatus === 'paired' ? (
            <button className="secondary-action" onClick={() => void unpairDevice()} type="button">断开此设备</button>
          ) : (
            <Link to="/pair-device">输入家庭同步码</Link>
          )}
        </div>
      ) : null}
    </section>
  );
}
