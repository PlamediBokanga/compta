import { Lock } from 'lucide-react';

type Props = {
  title: string;
  message: string;
};

export function AccessDenied({ title, message }: Props) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-50 text-danger-600">
        <Lock size={24} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink-950">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">{message}</p>
    </div>
  );
}
