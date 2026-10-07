import { useId, type InputHTMLAttributes } from 'react';

export function TextField({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1 text-sm font-medium ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base font-normal text-fg outline-none focus:border-primary"
      />
      {error && (
        <span id={errorId} className="text-sm text-alert">
          {error}
        </span>
      )}
    </div>
  );
}
