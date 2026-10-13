import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { UploadProvider } from './context/UploadContext';

import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FilesPage } from './pages/FilesPage';
import { RecentPage } from './pages/RecentPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { SharedPage } from './pages/SharedPage';
import { TrashPage } from './pages/TrashPage';
import { StorageAnalyticsPage } from './pages/StorageAnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminHealthPage } from './pages/admin/AdminHealthPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SetupPage } from './pages/SetupPage';
import { PublicSharePage } from './pages/PublicSharePage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppContent() {
  const { isAuthenticated, isLoading, isConfigured, user } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/dashboard');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Check for public share link: /s/:token
  if (currentPath.startsWith('/s/')) {
    const shareToken = currentPath.replace('/s/', '').split('/')[0];
    return <PublicSharePage shareToken={shareToken} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center animate-spin">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
          </div>
          <span className="text-xs font-medium text-slate-400">Loading CloudStoragePX...</span>
        </div>
      </div>
    );
  }

  // First-time owner setup needed
  if (!isConfigured) {
    return <SetupPage />;
  }

  // Unauthenticated routes
  if (!isAuthenticated) {
    if (currentPath === '/register') {
      return <RegisterPage onNavigate={navigate} />;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  // Redirect root or /login to /dashboard
  let activePath = currentPath;
  if (activePath === '/' || activePath === '/login' || activePath === '/register') {
    activePath = '/dashboard';
  }

  const isAdminOrOwner = user?.role === 'owner' || user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  return (
    <AppLayout currentPath={activePath} onNavigate={navigate}>
      {activePath === '/dashboard' && <DashboardPage onNavigate={navigate} />}
      {activePath === '/files' && <FilesPage />}
      {activePath === '/recent' && <RecentPage />}
      {activePath === '/favorites' && <FavoritesPage />}
      {activePath === '/shared' && <SharedPage />}
      {activePath === '/trash' && <TrashPage />}
      {activePath === '/storage' && <StorageAnalyticsPage onNavigate={navigate} />}
      {activePath === '/settings' && <SettingsPage />}

      {/* Admin routes with role checks */}
      {activePath === '/admin/users' && (isAdminOrOwner ? <AdminUsersPage /> : <NotFoundPage onNavigate={navigate} />)}
      {activePath === '/admin/settings' && (isOwner ? <AdminSettingsPage /> : <NotFoundPage onNavigate={navigate} />)}
      {activePath === '/admin/logs' && (isAdminOrOwner ? <AdminLogsPage /> : <NotFoundPage onNavigate={navigate} />)}
      {activePath === '/admin/health' && (isAdminOrOwner ? <AdminHealthPage /> : <NotFoundPage onNavigate={navigate} />)}

      {![
        '/dashboard',
        '/files',
        '/recent',
        '/favorites',
        '/shared',
        '/trash',
        '/storage',
        '/settings',
        '/admin/users',
        '/admin/settings',
        '/admin/logs',
        '/admin/health',
      ].includes(activePath) && <NotFoundPage onNavigate={navigate} />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <UploadProvider>
            <AppContent />
          </UploadProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
