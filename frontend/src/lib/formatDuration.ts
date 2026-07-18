export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}
