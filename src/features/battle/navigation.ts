import type { AppView } from '@/types/app';

const VIEW_STORAGE_KEY = 'pokedex-pro-active-view';

export const getPersistedView = (): AppView => {
  const saved = localStorage.getItem(VIEW_STORAGE_KEY);
  if (saved === 'pokedex' || saved === 'team' || saved === 'battle') {
    return saved;
  }
  return 'pokedex';
};

export const switchView = (viewName: AppView, setView: (view: AppView) => void): void => {
  localStorage.setItem(VIEW_STORAGE_KEY, viewName);
  setView(viewName);
};
