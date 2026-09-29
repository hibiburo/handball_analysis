import clsx from 'clsx';
import type { ReactNode } from 'react';
import { goalCells, type GoalCell } from '@/domain/enums';

type GoalGridProps = {
  renderCell: (cell: GoalCell) => ReactNode;
  label: string;
  className?: string;
};

/**
 * ゴールの 3×3 グリッド（シューターから見た向き。上段左から 1・2・3）。
 * 記録の GoalCellPicker と分析の GoalHeatmap で枠の描画を共有する。
 */
export function GoalGrid({ renderCell, label, className }: GoalGridProps) {
  return (
    <div className={clsx('flex flex-col items-stretch', className)}>
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-3 gap-1 border-x-[6px] border-t-[6px] border-foreground bg-border p-1"
      >
        {goalCells.map((cell) => (
          <div key={cell} className="contents">
            {renderCell(cell)}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-3 text-center text-xs text-muted" aria-hidden="true">
        <span>左</span>
        <span>中央</span>
        <span>右</span>
      </div>
    </div>
  );
}
