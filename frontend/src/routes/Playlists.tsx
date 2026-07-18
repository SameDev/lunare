import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ListMusic, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export function PlaylistsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const playlistsQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: () => apiFetch<Playlist[]>('/playlists'),
  });

  const create = useMutation({
    mutationFn: () => apiFetch<Playlist>('/playlists', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) create.mutate();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('nav.playlists')}</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('playlists.newPlaceholder')}
          className="w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={create.isPending || !name.trim()}
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <Plus size={16} />
          {t('playlists.create')}
        </button>
      </form>

      {playlistsQuery.isLoading && <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>}

      {playlistsQuery.data && playlistsQuery.data.length === 0 && (
        <p className="text-sm text-slate-500">{t('playlists.empty')}</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {playlistsQuery.data?.map((playlist) => (
          <Link
            key={playlist.id}
            to={`/playlists/${playlist.id}`}
            className="rounded-lg border border-surface-border bg-surface-raised p-4 transition-colors hover:border-accent"
          >
            <ListMusic size={20} className="mb-2 text-accent-hover" />
            <div className="truncate text-sm font-medium text-slate-100">{playlist.name}</div>
            {playlist.description && (
              <div className="mt-1 truncate text-xs text-slate-500">{playlist.description}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
