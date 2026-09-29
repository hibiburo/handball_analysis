import clsx from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

const controlClasses =
  'min-h-11 w-full rounded-lg border bg-surface px-3 text-foreground placeholder:text-muted disabled:opacity-50';

type FieldShellProps = {
  id: string;
  label: string;
  isRequired: boolean | undefined;
  error: string | undefined;
  hint: ReactNode | undefined;
  children: ReactNode;
};

function FieldShell({ id, label, isRequired, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-muted">
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  isRequired?: boolean;
};

export function TextField({ label, error, hint, isRequired, className, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} isRequired={isRequired} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-required={isRequired || undefined}
        className={clsx(controlClasses, error ? 'border-danger' : 'border-border', className)}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
};

export function TextAreaField({ label, error, hint, className, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} isRequired={false} error={error} hint={hint}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className={clsx(controlClasses, 'py-2', error ? 'border-danger' : 'border-border', className)}
        {...rest}
      />
    </FieldShell>
  );
}
