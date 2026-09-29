import { daysBetween } from '@/lib/time';

/** 最終バックアップからこの日数以上たったら警告する（functional-design.md 7章 BackupReminder） */
export const BACKUP_WARNING_DAYS = 7;

export type BackupStatus =
  | { kind: 'no_data' }
  | { kind: 'never' }
  | { kind: 'stale'; days: number }
  | { kind: 'recent'; days: number };

/**
 * バックアップの状態を判定する。
 * Safari は7日間開かないサイトのデータを消すことがあるため、書き出しを促す（architecture.md 3.2）。
 */
export function getBackupStatus(lastBackupAt: string | null, hasData: boolean, now: Date): BackupStatus {
  if (!hasData) return { kind: 'no_data' };
  if (lastBackupAt === null) return { kind: 'never' };
  const days = daysBetween(lastBackupAt, now);
  return days >= BACKUP_WARNING_DAYS ? { kind: 'stale', days } : { kind: 'recent', days };
}

export function shouldWarnBackup(status: BackupStatus): boolean {
  return status.kind === 'never' || status.kind === 'stale';
}
