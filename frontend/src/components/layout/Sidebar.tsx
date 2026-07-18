import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Library, Download, Settings, ListMusic, History, Webhook } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/library', labelKey: 'nav.library', icon: Library },
  { to: '/playlists', labelKey: 'nav.playlists', icon: ListMusic },
  { to: '/history', labelKey: 'nav.history', icon: History },
  { to: '/downloads', labelKey: 'nav.downloads', icon: Download },
  { to: '/integrations', labelKey: 'nav.integrations', icon: Webhook },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
] as const;

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-surface-border bg-surface-raised md:flex">
      <div className="px-5 py-5 text-lg font-semibold tracking-tight">MusicHub</div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent-hover'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`
            }
          >
            <Icon size={18} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
