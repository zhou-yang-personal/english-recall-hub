import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { ReviewPage } from '../features/review/ReviewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useApp } from './AppContext';

const SignInPage = lazy(() =>
  import('../features/auth/SignInPage').then((module) => ({ default: module.SignInPage })),
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
  const { authStatus, session, signOut } = useApp();

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
          {authStatus === 'ready' && !session ? <NavLink to="/sign-in">登录</NavLink> : null}
          {session ? (
            <button className="nav-button" onClick={() => void signOut()} type="button">
              退出
            </button>
          ) : null}
        </nav>
      </header>

      <main>
        <Suspense fallback={<p className="route-loading" role="status">正在加载…</p>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in" element={<SignInPage />} />
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
