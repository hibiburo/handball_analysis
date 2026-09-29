import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { shotResultLabels, shotTypeLabels, zoneLabels, type ShotResult } from '@/domain/enums';
import type { Goalkeeper, Shot } from '@/domain/types';
import { formatVideoTime } from '@/lib/time';

type ShotListProps = {
  shots: Shot[];
  goalkeepers: Goalkeeper[];
  editingShotId: string | null;
  onJump: (shot: Shot) => void;
  onEdit: (shot: Shot) => void;
  onDelete: (shot: Shot) => void;
};

const resultClasses: Record<ShotResult, string> = {
  goal: 'text-result-goal',
  save: 'text-result-save',
  post: 'text-result-other',
  miss: 'text-result-other',
  blocked: 'text-result-other',
};

/** 試合内のシュートを動画時刻の順に表示する。行を押すとその時刻にジャンプする */
export function ShotList({ shots, goalkeepers, editingShotId, onJump, onEdit, onDelete }: ShotListProps) {
  const showGoalkeeper = goalkeepers.length > 1;
  const goalkeeperNames = new Map(goalkeepers.map((g) => [g.id, g.name]));

  if (shots.length === 0) {
    return <p className="p-4 text-center text-sm text-muted">まだシュートが記録されていません</p>;
  }

  return (
    <ol className="divide-y divide-border">
      {shots.map((shot) => (
        <li
          key={shot.id}
          className={clsx('flex items-center gap-1 pr-1', shot.id === editingShotId && 'bg-warning-surface')}
        >
          <button
            type="button"
            className="flex min-h-11 flex-1 items-center gap-2 px-2 text-left text-sm hover:bg-surface-hover"
            aria-label={`${formatVideoTime(shot.videoTime)} ${zoneLabels[shot.zone]} ${shotResultLabels[shot.result]} の場面を再生`}
            onClick={() => onJump(shot)}
          >
            <span className="w-14 font-mono tabular-nums">{formatVideoTime(shot.videoTime)}</span>
            <span className="w-28 truncate">{zoneLabels[shot.zone]}</span>
            <span className="w-20 truncate text-muted">{shot.shotType ? shotTypeLabels[shot.shotType] : ''}</span>
            <span className="w-6 text-center font-bold">{shot.goalCell ?? ''}</span>
            <span className={clsx('w-24 font-bold', resultClasses[shot.result])}>{shotResultLabels[shot.result]}</span>
            {showGoalkeeper && (
              <span className="flex-1 truncate text-xs text-muted">{goalkeeperNames.get(shot.goalkeeperId)}</span>
            )}
          </button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${formatVideoTime(shot.videoTime)} のシュートを編集`}
            onClick={() => onEdit(shot)}
          >
            ✎
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${formatVideoTime(shot.videoTime)} のシュートを削除`}
            onClick={() => onDelete(shot)}
          >
            🗑
          </Button>
        </li>
      ))}
    </ol>
  );
}
