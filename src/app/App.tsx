import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { ProfilesPage } from '../features/profiles/ProfilesPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SignInPage } from '../features/auth/SignInPage';

const navigation = [
  { to: '/', label: '首页', end: true },
  { to: '/review', label: '复习' },
  { to: '/profiles', label: '学习者' },
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
