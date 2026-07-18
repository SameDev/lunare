import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';

interface HistoryEntry {
  id: string;
  playedAt: string;
  track: {
    id: string;
    title: string;
    album: { title: string; artist: { name: string } };
  };
}

export function HistoryPage() {
  const { t, i18n } = useTranslation();

  const historyQuery = useQuery({
    queryKey: ['library-history'],
    queryFn: () => apiFetch<HistoryEntry[]>('/library/history'),
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('nav.history')}</h1>

      {historyQuery.isLoading && <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>}

      {historyQuery.data && historyQuery.data.length === 0 && (
        <p className="text-sm text-slate-500">{t('history.empty')}</p>
      )}

      {historyQuery.data && historyQuery.data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-surface-border text-slate-400">
              <tr>
                <th className="px-4 py-2 font-normal">{t('library.title')}</th>
                <th className="px-4 py-2 font-normal">{t('library.artist')}</th>
                <th className="px-4 py-2 font-normal">{t('library.album')}</th>
                <th className="px-4 py-2 font-normal">{t('history.playedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {historyQuery.data.map((entry) => (
                <tr key={entry.id} className="border-b border-surface-border last:border-0 hover:bg-white/5">
                  <td className="px-4 py-2 text-slate-100">{entry.track.title}</td>
                  <td className="px-4 py-2 text-slate-400">{entry.track.album.artist.name}</td>
                  <td className="px-4 py-2 text-slate-400">{entry.track.album.title}</td>
                  <td className="px-4 py-2 text-slate-400">
                    {new Date(entry.playedAt).toLocaleString(i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
