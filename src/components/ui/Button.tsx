import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-foreground hover:bg-surface-hover',
  danger: 'bg-danger text-danger-foreground hover:opacity-90',
  ghost: 'text-foreground hover:bg-surface-hover',
};

// タップ領域は最小 44px（development-guidelines.md 4.3）。sm も高さ 44px を確保し、横幅だけ詰める
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 min-w-11 px-2 text-sm',
  md: 'min-h-11 min-w-11 px-4',
};

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
}
