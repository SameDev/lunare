import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}
