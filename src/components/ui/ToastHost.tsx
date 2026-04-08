import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useToastStore } from '@/store/toastStore';

const toneClasses: Record<'success' | 'info' | 'warning' | 'danger', string> = {
  success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  info: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100',
  warning: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  danger: 'border-rose-400/40 bg-rose-400/10 text-rose-100',
};

export const ToastHost = (): JSX.Element => {
  const { items, removeToast } = useToastStore();

  useEffect(() => {
    const timers = items.map((item) => window.setTimeout(() => removeToast(item.id), 3200));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, removeToast]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-3">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-neon backdrop-blur ${toneClasses[item.tone]}`}
          >
            <p className="text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-sm opacity-90">{item.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};