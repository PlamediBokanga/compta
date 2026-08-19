import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 print:static print:block print:p-0">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in print:hidden"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizes[size]} card animate-scale-in flex max-h-[92vh] flex-col rounded-b-none sm:rounded-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none print:ring-0`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 print:hidden">
          <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 print:overflow-visible print:px-0 print:py-0">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-4 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

