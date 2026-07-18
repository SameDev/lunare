import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Socket } from 'socket.io-client';
import { apiFetch } from '../lib/api';
import { createSocket } from '../lib/socket';

const AUDIO_FORMATS = ['mp3', 'flac', 'opus', 'm4a', 'wav'] as const;
const AUDIO_QUALITIES = ['0', '128K', '192K', '256K', '320K'] as const;

type DownloadStatus = 'PENDING' | 'DOWNLOADING' | 'CONVERTING' | 'ORGANIZING' | 'COMPLETED' | 'FAILED';

interface DownloadJob {
  id: string;
  sourceUrl: string;
  sourceTitle: string | null;
  customTitle: string | null;
  status: DownloadStatus;
  progress: number;
  format: string;
  quality: string;
  errorMessage: string | null;
}

interface DownloadsResponse {
  items: DownloadJob[];
  total: number;
}

const STATUS_COLORS: Record<DownloadStatus, string> = {
  PENDING: 'text-slate-400',
  DOWNLOADING: 'text-accent-hover',
  CONVERTING: 'text-accent-hover',
  ORGANIZING: 'text-accent-hover',
  COMPLETED: 'text-green-400',
  FAILED: 'text-red-400',
};

export function DownloadsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const [urls, setUrls] = useState('');
  const [format, setFormat] = useState<(typeof AUDIO_FORMATS)[number]>('mp3');
  const [quality, setQuality] = useState<(typeof AUDIO_QUALITIES)[number]>('192K');
  const [destinationFolder, setDestinationFolder] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const downloadsQuery = useQuery({
    queryKey: ['downloads'],
    queryFn: () => apiFetch<DownloadsResponse>('/downloads?limit=50'),
  });

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    const updateJob = (payload: { id: string } & Partial<DownloadJob>) => {
      queryClient.setQueryData<DownloadsResponse | undefined>(['downloads'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((job) => (job.id === payload.id ? { ...job, ...payload } : job)),
        };
      });
    };

    socket.on('download:progress', updateJob);
    socket.on('download:completed', () => {
      void queryClient.invalidateQueries({ queryKey: ['downloads'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['library-tracks'] });
    });
    socket.on('download:failed', (payload: { id: string; error: string }) =>
      updateJob({ id: payload.id, status: 'FAILED', errorMessage: payload.error }),
    );

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<DownloadJob[]>('/downloads', {
        method: 'POST',
        body: JSON.stringify({
          urls: urls.split('\n').map((u) => u.trim()).filter(Boolean),
          format,
          quality,
          destinationFolder: destinationFolder || undefined,
          customTitle: customTitle || undefined,
        }),
      }),
    onSuccess: () => {
      setUrls('');
      setCustomTitle('');
      setSubmitError(null);
      void queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
    onError: (error: Error) => setSubmitError(error.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/downloads/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['downloads'] }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('nav.downloads')}</h1>

      <form onSubmit={handleSubmit} className="mb-6 max-w-xl rounded-lg border border-surface-border bg-surface-raised p-4">
        <label className="mb-1 block text-sm text-slate-400" htmlFor="urls">
          {t('downloads.urls')}
        </label>
        <textarea
          id="urls"
          required
          rows={3}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={t('downloads.urlsPlaceholder')}
          className="mb-3 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
        />

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="format">
              {t('downloads.format')}
            </label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as typeof format)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100"
            >
              {AUDIO_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="quality">
              {t('downloads.quality')}
            </label>
            <select
              id="quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value as typeof quality)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100"
            >
              {AUDIO_QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q === '0' ? t('downloads.qualityBest') : q}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="destinationFolder">
              {t('downloads.destinationFolder')}
            </label>
            <input
              id="destinationFolder"
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="customTitle">
              {t('downloads.customTitle')}
            </label>
            <input
              id="customTitle"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            />
          </div>
        </div>

        {submitError && <p className="mb-3 text-sm text-red-400">{submitError}</p>}

        <button
          type="submit"
          disabled={submit.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {submit.isPending ? t('downloads.submitting') : t('downloads.submit')}
        </button>
      </form>

      {downloadsQuery.data && (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-surface-border text-slate-400">
              <tr>
                <th className="px-4 py-2 font-normal">{t('downloads.source')}</th>
                <th className="px-4 py-2 font-normal">{t('downloads.status')}</th>
                <th className="px-4 py-2 font-normal">{t('downloads.progress')}</th>
                <th className="px-4 py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {downloadsQuery.data.items.map((job) => (
                <tr key={job.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-2 text-slate-100">
                    {job.customTitle ?? job.sourceTitle ?? job.sourceUrl}
                    {job.errorMessage && <p className="text-xs text-red-400">{job.errorMessage}</p>}
                  </td>
                  <td className={`px-4 py-2 font-medium ${STATUS_COLORS[job.status]}`}>
                    {t(`downloads.status${job.status}`)}
                  </td>
                  <td className="px-4 py-2 text-slate-400">{Math.round(job.progress)}%</td>
                  <td className="px-4 py-2">
                    {job.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => cancel.mutate(job.id)}
                        className="text-xs text-slate-400 hover:text-red-400"
                      >
                        {t('downloads.cancel')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {downloadsQuery.data.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    {t('downloads.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
