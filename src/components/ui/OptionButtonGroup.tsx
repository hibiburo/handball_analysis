import clsx from 'clsx';

export type Option<T extends string | number> = {
  value: T;
  label: string;
};

type OptionButtonGroupProps<T extends string | number> = {
  label: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  /** 選択中のボタンをもう一度押したら選択を外す（任意項目向け） */
  allowDeselect?: boolean;
  isRequired?: boolean;
  /** 必須項目が未入力であることを強調する */
  isInvalid?: boolean;
  columns?: 2 | 3 | 4 | 5;
};

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export function OptionButtonGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  allowDeselect = false,
  isRequired = false,
  isInvalid = false,
  columns = 3,
}: OptionButtonGroupProps<T>) {
  return (
    <fieldset>
      <legend className={clsx('mb-1 text-sm font-bold', isInvalid ? 'text-danger' : 'text-muted')}>
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </legend>
      <div role="radiogroup" aria-label={label} className={clsx('grid gap-1.5', columnClasses[columns])}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={clsx(
                'min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-foreground hover:bg-surface-hover',
              )}
              onClick={() => onChange(isSelected && allowDeselect ? undefined : option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
