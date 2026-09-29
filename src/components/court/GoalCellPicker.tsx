import clsx from 'clsx';
import { goalCellLabels, goalCellPositionLabels, type GoalCell } from '@/domain/enums';
import { GoalGrid } from './GoalGrid';

type GoalCellPickerProps = {
  value: GoalCell | undefined;
  onChange: (cell: GoalCell | undefined) => void;
  isRequired: boolean;
  isDisabled: boolean;
  isInvalid?: boolean;
};

/** コース（3×3）を選ぶ。選択中のコースをもう一度押すと選択を外す */
export function GoalCellPicker({ value, onChange, isRequired, isDisabled, isInvalid = false }: GoalCellPickerProps) {
  return (
    <div>
      <p className={clsx('mb-1 text-sm font-bold', isInvalid ? 'text-danger' : 'text-muted')}>
        コース
        {isRequired && <span aria-hidden="true"> *</span>}
        {isDisabled && <span className="ml-2 font-normal">（この結果では記録しません）</span>}
      </p>
      <GoalGrid
        label="コース"
        className={clsx('mx-auto max-w-64', isDisabled && 'opacity-30')}
        renderCell={(cell) => {
          const isSelected = cell === value;
          return (
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={`${goalCellLabels[cell]}（${goalCellPositionLabels[cell]}）`}
              title={goalCellPositionLabels[cell]}
              disabled={isDisabled}
              className={clsx(
                'aspect-[3/2] min-h-11 rounded text-lg font-bold',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-surface-hover',
              )}
              onClick={() => onChange(isSelected ? undefined : cell)}
            >
              {cell}
            </button>
          );
        }}
      />
    </div>
  );
}
