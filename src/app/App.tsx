import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsPage } from '../features/settings/SettingsPage';

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
const ProgressPage = lazy(() =>
  import('../features/progress/ProgressPage').then((module) => ({ default: module.ProgressPage })),
);

const navigation = [
  { to: '/', label: '首页', end: true },
  { to: '/review', label: '复习' },
  { to: '/progress', label: '进度' },
  { to: '/settings', label: '设置' },
] as const;

export function App() {
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
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
