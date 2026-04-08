export type AppView = 'pokedex' | 'team' | 'battle';

export interface PokedexFilters {
  query: string;
  type: string;
  generation: string;
  ability: string;
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
}