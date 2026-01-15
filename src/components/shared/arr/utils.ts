export function formatTimeLeft(timeLeft?: string): string {
  if (!timeLeft) return '';
  const parts = timeLeft.split(':');
  if (parts.length !== 3) return timeLeft;
  const [hours, minutes] = parts;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function getStatusColor(status: string, trackedState?: string): string {
  if (trackedState === 'importPending') return '#22c55e';
  if (trackedState === 'downloading') return '#0ea5e9';
  if (status === 'warning' || trackedState === 'warning') return '#f59e0b';
  if (status === 'failed' || trackedState === 'failed') return '#ef4444';
  return '#6b7280';
}

export function getStatusText(status: string, trackedState?: string): string {
  if (trackedState === 'importPending') return 'Import Pending';
  if (trackedState === 'downloading') return 'Downloading';
  if (status === 'warning') return 'Warning';
  if (status === 'failed') return 'Failed';
  if (status === 'queued') return 'Queued';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
