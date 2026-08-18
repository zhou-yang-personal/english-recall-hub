import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useApp } from './AppContext';

const HomePage = lazy(() =>
  import('../features/home/HomePage').then((module) => ({ default: module.HomePage })),
);
const ReviewPage = lazy(() =>
  import('../features/review/ReviewPage').then((module) => ({ default: module.ReviewPage })),
);
const PairDevicePage = lazy(() =>
  import('../features/sync-access/PairDevicePage').then((module) => ({ default: module.PairDevicePage })),
);
const ProfilesPage = lazy(() =>
  import('../features/profiles/ProfilesPage').then((module) => ({ default: module.ProfilesPage })),
);

const navigation = [
  { to: '/', label: '首页', end: true },
  { to: '/review', label: '复习' },
  { to: '/profiles', label: '学习者' },
  { to: '/settings', label: '设置' },
] as const;

export function App() {
  const { cloudStatus, unpairDevice } = useApp();

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/">
          <span className="brand-mark">ER</span>
          <span>
            <strong>English Recall Hub</strong>
            <small>offline-first recall</small>
          </span>
        </NavLink>
        <nav aria-label="主导航">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              end={'end' in item ? item.end : false}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
          {cloudStatus === 'unpaired' || cloudStatus === 'unavailable' ? (
            <NavLink to="/pair-device">配对云同步</NavLink>
          ) : null}
          {cloudStatus === 'paired' ? (
            <button className="nav-button" onClick={() => void unpairDevice()} type="button">
              断开此设备
            </button>
          ) : null}
        </nav>
      </header>

      <main>
        <Suspense fallback={<p className="route-loading" role="status">正在加载…</p>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pair-device" element={<PairDevicePage />} />
            <Route path="/sign-in" element={<Navigate replace to="/pair-device" />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
