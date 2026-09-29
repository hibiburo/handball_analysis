import clsx from 'clsx';
import { goalCellPositionLabels, goalCells, type GoalCell } from '@/domain/enums';
import { heatLevel, type HeatmapCell, type HeatmapMetric } from '@/domain/stats/heatmap';
import { formatRate } from '@/domain/stats/metrics';
import { GoalGrid } from './GoalGrid';

const metricLabels: Record<HeatmapMetric, string> = {
  goalRate: '失点率',
  saveRate: 'セーブ率',
  shotCount: '本数',
};

/** 色の段階ごとのクラス（Tailwind が検出できるよう完全なクラス名で書く） */
const levelClasses = [
  'bg-heat-0 text-heat-0-fg',
  'bg-heat-1 text-heat-1-fg',
  'bg-heat-2 text-heat-2-fg',
  'bg-heat-3 text-heat-3-fg',
  'bg-heat-4 text-heat-4-fg',
  'bg-heat-5 text-heat-5-fg',
];

type GoalHeatmapProps = {
  heatmap: Record<GoalCell, HeatmapCell>;
  metric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  selectedCells: readonly GoalCell[];
  onCellSelect: (cell: GoalCell) => void;
};

/**
 * コースごとの指標を色の濃淡で表示する（functional-design.md 5.3）。
 * 色だけに頼らず数値を必ず表示し、枠内シュートが少ないコースは参考値と分かるようにする。
 */
export function GoalHeatmap({ heatmap, metric, onMetricChange, selectedCells, onCellSelect }: GoalHeatmapProps) {
  const maxShotCount = Math.max(0, ...goalCells.map((cell) => heatmap[cell].shotCount));

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="表示する指標" className="flex gap-1 self-center rounded-lg bg-surface-hover p-1">
        {(Object.keys(metricLabels) as HeatmapMetric[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={metric === key}
            className={clsx(
              'min-h-11 rounded-md px-4 text-sm font-medium',
              metric === key ? 'bg-surface shadow' : 'text-muted hover:text-foreground',
            )}
            onClick={() => onMetricChange(key)}
          >
            {metricLabels[key]}
          </button>
        ))}
      </div>

      <GoalGrid
        label={`コース別の${metricLabels[metric]}`}
        className="mx-auto w-full max-w-md"
        renderCell={(cell) => {
          const data = heatmap[cell];
          const level = heatLevel(data, metric, maxShotCount);
          const value = metric === 'shotCount' ? `${data.shotCount}本` : formatRate(data[metric]);
          const isSelected = selectedCells.includes(cell);
          const isLowSample = metric !== 'shotCount' && data.isLowSample && data.onTargetCount > 0;
          return (
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={`コース${cell}（${goalCellPositionLabels[cell]}）: ${metricLabels[metric]} ${value}、${data.shotCount}本${isLowSample ? '、参考値' : ''}`}
              className={clsx(
                'relative flex aspect-[3/2] min-h-16 flex-col items-center justify-center rounded',
                level === undefined ? 'bg-surface text-muted' : levelClasses[level],
                isSelected && 'ring-4 ring-primary ring-inset',
              )}
              onClick={() => onCellSelect(cell)}
            >
              {isLowSample && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgb(127_127_127/0.25)_6px_8px)]"
                />
              )}
              <span className="absolute top-1 left-1.5 text-xs opacity-70">{cell}</span>
              <span className="relative text-xl font-bold tabular-nums">{value}</span>
              {metric !== 'shotCount' && (
                <span className="relative text-xs tabular-nums opacity-80">
                  {data.goalCount}/{data.onTargetCount}
                  {data.shotCount !== data.onTargetCount && `（${data.shotCount}本）`}
                </span>
              )}
              {isLowSample && <span className="absolute top-1 right-1.5 text-[10px] font-bold opacity-80">参考</span>}
            </button>
          );
        }}
      />
      <p className="text-center text-xs text-muted">
        数値の下は「失点/枠内シュート」。斜線は枠内シュートが少ない参考値。コースを押すとシーンを絞り込みます。
      </p>
    </div>
  );
}
