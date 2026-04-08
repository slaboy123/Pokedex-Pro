import type { AppView } from '@/types/app';

export const switchView = (viewName: AppView, setView: (view: AppView) => void): void => {
  setView(viewName);
};
