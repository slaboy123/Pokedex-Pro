import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ open, title, onClose, children }: ModalProps): JSX.Element | null => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-neon-green/30 bg-[linear-gradient(160deg,rgba(40,32,24,0.98),rgba(20,16,12,0.98))] shadow-neon"
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neon-green/20 px-5 py-4 md:px-6">
              <div>
                {title ? <p className="text-xs uppercase tracking-[0.3em] text-neon-purple">Detalhes</p> : null}
                {title ? <h2 className="text-xl font-bold text-[#f8edd7] md:text-2xl">{title}</h2> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neon-green/30 bg-black/20 px-3 py-2 text-sm font-semibold text-[#f6ebd3] transition hover:border-neon-green/70 hover:bg-black/35"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5 md:p-6">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};