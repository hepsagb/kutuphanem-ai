export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: string;
  genre: string;
  shelfId: string;
  addedAt: string;
  coverDescription?: string; // Short visual description for UI if no image
}

export interface Shelf {
  id: string;
  name: string;
  description: string;
}

export interface BookScanResult {
  isbn?: string;
  title?: string;
  author?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  LIBRARY = 'LIBRARY',
  SHELVES = 'SHELVES',
  ADD_BOOK = 'ADD_BOOK',
}
