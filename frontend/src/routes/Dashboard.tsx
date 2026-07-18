import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Album, Cpu, Disc3, Download, HardDrive, ListMusic, MemoryStick, Music } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatBytes } from '../lib/formatBytes';
import { StatCard } from '../components/ui/StatCard';

interface DashboardStats {
  library: { trackCount: number; artistCount: number; albumCount: number };
  downloads: { active: number; completed: number; failed: number };
  queue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  libraryDiskUsageBytes: number;
  system: {
    cpuLoadAverage: [number, number, number];
    memory: { totalBytes: number; freeBytes: number; usedBytes: number };
  };
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch<DashboardStats>('/dashboard/stats'),
    refetchInterval: 10_000,
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">{t('nav.dashboard')}</h1>

      {isLoading && <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>}
      {isError && <p className="text-sm text-red-400">{t('dashboard.error')}</p>}

      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Music} label={t('dashboard.tracks')} value={data.library.trackCount} />
          <StatCard icon={ListMusic} label={t('dashboard.artists')} value={data.library.artistCount} />
          <StatCard icon={Album} label={t('dashboard.albums')} value={data.library.albumCount} />
          <StatCard
            icon={HardDrive}
            label={t('dashboard.diskUsage')}
            value={formatBytes(data.libraryDiskUsageBytes)}
          />
          <StatCard icon={Download} label={t('dashboard.activeDownloads')} value={data.downloads.active} />
          <StatCard
            icon={Disc3}
            label={t('dashboard.completedDownloads')}
            value={data.downloads.completed}
          />
          <StatCard icon={Cpu} label={t('dashboard.cpuLoad')} value={data.system.cpuLoadAverage[0].toFixed(2)} />
          <StatCard
            icon={MemoryStick}
            label={t('dashboard.memory')}
            value={`${formatBytes(data.system.memory.usedBytes)} / ${formatBytes(data.system.memory.totalBytes)}`}
          />
        </div>
      )}
    </div>
  );
}
