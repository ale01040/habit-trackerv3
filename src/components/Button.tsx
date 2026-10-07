import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent active:brightness-95',
  ghost: 'bg-transparent text-accent',
  danger: 'bg-alert text-on-alert active:brightness-95',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-xl px-4 font-semibold transition disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}
