import type { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-1 ring-success-500/30',
  warning: 'bg-warning-50 text-warning-700 ring-1 ring-warning-500/30',
  danger: 'bg-danger-50 text-danger-700 ring-1 ring-danger-500/30',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-accent-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${tones[tone]} ${className}`}>{children}</span>;
}
