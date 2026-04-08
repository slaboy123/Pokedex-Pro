import { create } from 'zustand';
import type { ToastItem } from '@/types/app';

interface ToastState {
  items: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  pushToast: (toast) =>
    set((state) => ({
      items: [...state.items, { ...toast, id: crypto.randomUUID() }].slice(-4),
    })),
  removeToast: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));