import { Receipt } from 'lucide-react';

export function Logo({ size = 32, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-xl bg-brand-600 text-white shadow-soft"
        style={{ width: size, height: size }}
      >
        <Receipt size={size * 0.55} strokeWidth={2.4} />
      </div>
      {withText && (
        <span className="font-display text-xl font-extrabold tracking-tight text-ink-900">
          Tenzo
        </span>
      )}
    </div>
  );
}
