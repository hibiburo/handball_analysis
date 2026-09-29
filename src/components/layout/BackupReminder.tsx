import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getBackupStatus, shouldWarnBackup } from '@/domain/backup';
import { downloadAllData, useHasShots } from '@/hooks/useDataTransfer';
import { useSettings } from '@/hooks/useSettings';

/**
 * 最終バックアップから7日以上たったら（または一度も書き出していなければ）警告する（requirements.md 2.2）。
 */
export function BackupReminder() {
  const { lastBackupAt } = useSettings();
  const hasShots = useHasShots();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  // 描画のたびに現在時刻を取らないよう、表示した時点の時刻で判定する
  const [now] = useState(() => new Date());

  if (hasShots === undefined) return null;
  const status = getBackupStatus(lastBackupAt, hasShots, now);
  if (!shouldWarnBackup(status)) return null;

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadAllData();
      showToast('全データを書き出しました', { tone: 'success' });
    } catch {
      showToast('書き出せませんでした。もう一度お試しください。', { tone: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-surface px-4 py-3 text-warning"
    >
      <p className="flex-1 text-sm">
        <span className="font-bold">
          ⚠{' '}
          {status.kind === 'stale'
            ? `最終バックアップから${status.days}日たっています。`
            : 'まだ一度もバックアップしていません。'}
        </span>
        <br />
        データはこの端末のブラウザにだけ保存されています。ブラウザのデータが消えると復元できないため、定期的に書き出してください。
      </p>
      <Button variant="primary" disabled={isExporting} onClick={handleExport}>
        今すぐ書き出す
      </Button>
    </div>
  );
}
