import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Heart, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useDebounce } from '../lib/useDebounce';
import { formatDuration } from '../lib/formatDuration';

interface Track {
  id: string;
  title: string;
  trackNumber: number | null;
  durationSeconds: number | null;
  genre: string | null;
  album: { title: string; artist: { name: string } };
}

interface TracksResponse {
  items: Track[];
  total: number;
}

interface Favorite {
  trackId: string;
}

const PAGE_SIZE = 20;

export function LibraryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const tracksQuery = useQuery({
    queryKey: ['library-tracks', debouncedSearch, page],
    queryFn: () =>
      apiFetch<TracksResponse>(
        `/library/tracks?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${PAGE_SIZE}`,
      ),
  });

  const favoritesQuery = useQuery({
    queryKey: ['library-favorites'],
    queryFn: () => apiFetch<Favorite[]>('/library/favorites'),
  });

  const favoriteTrackIds = useMemo(
    () => new Set(favoritesQuery.data?.map((f) => f.trackId)),
    [favoritesQuery.data],
  );

  const toggleFavorite = useMutation({
    mutationFn: ({ trackId, isFavorite }: { trackId: string; isFavorite: boolean }) =>
      apiFetch<void>(`/library/tracks/${trackId}/favorite`, { method: isFavorite ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['library-favorites'] });
    },
  });

  const totalPages = tracksQuery.data ? Math.ceil(tracksQuery.data.total / PAGE_SIZE) : 1;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('nav.library')}</h1>

      <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-slate-400">
        <Search size={16} />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('search.placeholder')}
          className="w-full bg-transparent outline-none placeholder:text-slate-500"
        />
      </div>

      {tracksQuery.isLoading && <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>}
      {tracksQuery.isError && <p className="text-sm text-red-400">{t('dashboard.error')}</p>}

      {tracksQuery.data && (
        <>
          <div className="overflow-hidden rounded-lg border border-surface-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-normal">{t('library.title')}</th>
                  <th className="px-4 py-2 font-normal">{t('library.artist')}</th>
                  <th className="px-4 py-2 font-normal">{t('library.album')}</th>
                  <th className="px-4 py-2 font-normal">{t('library.duration')}</th>
                  <th className="px-4 py-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {tracksQuery.data.items.map((track) => {
                  const isFavorite = favoriteTrackIds.has(track.id);
                  return (
                    <tr key={track.id} className="border-b border-surface-border last:border-0 hover:bg-white/5">
                      <td className="px-4 py-2 text-slate-100">{track.title}</td>
                      <td className="px-4 py-2 text-slate-400">{track.album.artist.name}</td>
                      <td className="px-4 py-2 text-slate-400">{track.album.title}</td>
                      <td className="px-4 py-2 text-slate-400">{formatDuration(track.durationSeconds)}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => toggleFavorite.mutate({ trackId: track.id, isFavorite })}
                          className="text-slate-400 transition-colors hover:text-accent-hover"
                        >
                          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tracksQuery.data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      {t('library.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-surface-border px-3 py-1 disabled:opacity-40"
              >
                {t('library.previous')}
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-surface-border px-3 py-1 disabled:opacity-40"
              >
                {t('library.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
