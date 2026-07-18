import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './routes/Login';
import { DashboardPage } from './routes/Dashboard';
import { LibraryPage } from './routes/Library';
import { PlaylistsPage } from './routes/Playlists';
import { PlaylistDetailPage } from './routes/PlaylistDetail';
import { DownloadsPage } from './routes/Downloads';
import { SettingsPage } from './routes/Settings';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="playlists" element={<PlaylistsPage />} />
                <Route path="playlists/:id" element={<PlaylistDetailPage />} />
                <Route path="downloads" element={<DownloadsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
