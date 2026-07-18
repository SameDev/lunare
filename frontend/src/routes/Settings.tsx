import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';

interface EditableSettings {
  libraryPath: string;
  downloadTmpPath: string;
  allowedFormats: string[];
  defaultQuality: string;
  language: 'pt-BR' | 'en';
  theme: 'dark' | 'light';
  maxConcurrentDownloads: number;
}

interface AppSettings extends EditableSettings {
  id: number;
  updatedAt: string;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<AppSettings>('/settings'),
  });

  const [form, setForm] = useState<AppSettings | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data, form]);

  const save = useMutation({
    mutationFn: (data: EditableSettings) =>
      apiFetch<AppSettings>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (data) => {
      setForm(data);
      queryClient.setQueryData(['settings'], data);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const { libraryPath, downloadTmpPath, allowedFormats, defaultQuality, language, theme, maxConcurrentDownloads } =
      form;
    save.mutate({
      libraryPath,
      downloadTmpPath,
      allowedFormats,
      defaultQuality,
      language,
      theme,
      maxConcurrentDownloads,
    });
  }

  if (!form) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold">{t('nav.settings')}</h1>
        <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('nav.settings')}</h1>

      <form onSubmit={handleSubmit} className="max-w-xl rounded-lg border border-surface-border bg-surface-raised p-4">
        <p className="mb-4 text-xs text-slate-500">{t('settings.note')}</p>

        <label className="mb-1 block text-sm text-slate-400" htmlFor="libraryPath">
          {t('settings.libraryPath')}
        </label>
        <input
          id="libraryPath"
          value={form.libraryPath}
          onChange={(e) => setForm({ ...form, libraryPath: e.target.value })}
          className="mb-3 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
        />

        <label className="mb-1 block text-sm text-slate-400" htmlFor="downloadTmpPath">
          {t('settings.downloadTmpPath')}
        </label>
        <input
          id="downloadTmpPath"
          value={form.downloadTmpPath}
          onChange={(e) => setForm({ ...form, downloadTmpPath: e.target.value })}
          className="mb-3 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
        />

        <label className="mb-1 block text-sm text-slate-400" htmlFor="allowedFormats">
          {t('settings.allowedFormats')}
        </label>
        <input
          id="allowedFormats"
          value={form.allowedFormats.join(', ')}
          onChange={(e) =>
            setForm({ ...form, allowedFormats: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
          className="mb-3 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
        />

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="defaultQuality">
              {t('settings.defaultQuality')}
            </label>
            <input
              id="defaultQuality"
              value={form.defaultQuality}
              onChange={(e) => setForm({ ...form, defaultQuality: e.target.value })}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="maxConcurrentDownloads">
              {t('settings.maxConcurrentDownloads')}
            </label>
            <input
              id="maxConcurrentDownloads"
              type="number"
              min={1}
              max={10}
              value={form.maxConcurrentDownloads}
              onChange={(e) => setForm({ ...form, maxConcurrentDownloads: Number(e.target.value) })}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="language">
              {t('settings.language')}
            </label>
            <select
              id="language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as AppSettings['language'] })}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100"
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="theme">
              {t('settings.theme')}
            </label>
            <select
              id="theme"
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value as AppSettings['theme'] })}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100"
            >
              <option value="dark">{t('settings.themeDark')}</option>
              <option value="light">{t('settings.themeLight')}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {save.isPending ? t('settings.saving') : t('settings.save')}
          </button>
          {savedMessage && <span className="text-sm text-green-400">{t('settings.saved')}</span>}
          {save.isError && <span className="text-sm text-red-400">{t('settings.error')}</span>}
        </div>
      </form>
    </div>
  );
}
