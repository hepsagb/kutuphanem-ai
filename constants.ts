import { Shelf } from './types';

export const DEFAULT_SHELVES: Shelf[] = [
  { id: 'shelf-1', name: 'Billy Sol - Raf 1', description: 'Sol Kitaplık, En Üst Raf' },
  { id: 'shelf-2', name: 'Billy Sol - Raf 2', description: 'Sol Kitaplık, 2. Raf' },
  { id: 'shelf-3', name: 'Billy Orta - Raf 1', description: 'Orta Kitaplık, En Üst Raf' },
];

export const GENRE_COLORS: Record<string, string> = {
  'Bilim Kurgu': '#8884d8',
  'Roman': '#82ca9d',
  'Tarih': '#ffc658',
  'Felsefe': '#ff8042',
  'Çizgi Roman': '#0088FE',
  'Diğer': '#a0a0a0',
};
