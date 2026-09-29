import clsx from 'clsx';
import { shotResultLabels, shotTypeLabels, zoneLabels, type ShotResult } from '@/domain/enums';
import type { Match, Shot } from '@/domain/types';
import { formatVideoTime } from '@/lib/time';

type SceneListProps = {
  /** 表示するシーン（試合日 → 動画時刻の順に並べたもの） */
  shots: Shot[];
  matchesById: Map<string, Match>;
  onPlay: (shot: Shot) => void;
};

const resultClasses: Record<ShotResult, string> = {
  goal: 'text-result-goal',
  save: 'text-result-save',
  post: 'text-result-other',
  miss: 'text-result-other',
  blocked: 'text-result-other',
};

/** 絞り込み結果のシーン一覧。押すと動画プレーヤーでそのシーンを再生する */
export function SceneList({ shots, matchesById, onPlay }: SceneListProps) {
  if (shots.length === 0) {
    return <p className="p-3 text-sm text-muted">条件に合うシーンはありません</p>;
  }
  return (
    <ol className="divide-y divide-border">
      {shots.map((shot) => {
        const match = matchesById.get(shot.matchId);
        return (
          <li key={shot.id}>
            <button
              type="button"
              className="flex min-h-12 w-full items-start gap-2 px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
              onClick={() => onPlay(shot)}
            >
              <span aria-hidden="true" className="pt-0.5 text-primary">
                ▶
              </span>
              <span className="flex-1">
                <span className="block text-xs text-muted">
                  {match?.date.slice(5).replace('-', '/')} {formatVideoTime(shot.videoTime)}
                </span>
                <span>
                  {zoneLabels[shot.zone]}
                  {shot.shotType && <span className="text-muted"> {shotTypeLabels[shot.shotType]}</span>}
                  {shot.goalCell !== undefined && <span className="font-bold"> {shot.goalCell}</span>}{' '}
                  <span className={clsx('font-bold', resultClasses[shot.result])}>{shotResultLabels[shot.result]}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
