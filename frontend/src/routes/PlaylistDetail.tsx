import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface PlaylistTrack {
  trackId: string;
  position: number;
  track: {
    id: string;
    title: string;
    album: { title: string; artist: { name: string } };
  };
}

interface PlaylistDetail {
  id: string;
  name: string;
  description: string | null;
  tracks: PlaylistTrack[];
}

export function PlaylistDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string | null>(null);

  const playlistQuery = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => apiFetch<PlaylistDetail>(`/playlists/${id}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  };

  const rename = useMutation({
    mutationFn: (newName: string) =>
      apiFetch(`/playlists/${id}`, { method: 'PATCH', body: JSON.stringify({ name: newName }) }),
    onSuccess: invalidate,
  });

  const removeTrack = useMutation({
    mutationFn: (trackId: string) => apiFetch<void>(`/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (trackIds: string[]) =>
      apiFetch<void>(`/playlists/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ trackIds }) }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => apiFetch<void>(`/playlists/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      navigate('/playlists');
    },
  });

  function move(index: number, direction: -1 | 1) {
    if (!playlistQuery.data) return;
    const ids = playlistQuery.data.tracks.map((t) => t.trackId);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  }

  if (playlistQuery.isLoading) {
    return <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>;
  }
  if (!playlistQuery.data) {
    return <p className="text-sm text-red-400">{t('dashboard.error')}</p>;
  }

  const playlist = playlistQuery.data;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <input
          value={name ?? playlist.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name && name !== playlist.name && rename.mutate(name)}
          className="bg-transparent text-xl font-semibold text-slate-100 outline-none focus:border-b focus:border-accent"
        />
        <button
          type="button"
          onClick={() => confirm(t('playlists.confirmDelete')) && remove.mutate()}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400"
        >
          <Trash2 size={16} />
          {t('playlists.delete')}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border text-slate-400">
            <tr>
              <th className="px-4 py-2 font-normal">{t('library.title')}</th>
              <th className="px-4 py-2 font-normal">{t('library.artist')}</th>
              <th className="px-4 py-2 font-normal">{t('library.album')}</th>
              <th className="px-4 py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {playlist.tracks.map((pt, index) => (
              <tr key={pt.trackId} className="border-b border-surface-border last:border-0 hover:bg-white/5">
                <td className="px-4 py-2 text-slate-100">{pt.track.title}</td>
                <td className="px-4 py-2 text-slate-400">{pt.track.album.artist.name}</td>
                <td className="px-4 py-2 text-slate-400">{pt.track.album.title}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="disabled:opacity-30">
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === playlist.tracks.length - 1}
                      onClick={() => move(index, 1)}
                      className="disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => removeTrack.mutate(pt.trackId)} className="hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {playlist.tracks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  {t('playlists.noTracks')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
