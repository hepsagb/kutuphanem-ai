import React, { useState } from 'react';
import { Book, Shelf } from '../types';
import { BookOpen, MapPin, Trash2, Edit, List, Grid } from 'lucide-react';

interface BookListProps {
  books: Book[];
  shelves: Shelf[];
  onDelete: (id: string) => void;
  onEdit: (book: Book) => void;
}

export const BookList: React.FC<BookListProps> = ({ books, shelves, onDelete, onEdit }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'shelf_index'>('grid');

  const getShelfName = (id: string) => shelves.find(s => s.id === id)?.name || 'Bilinmeyen Raf';

  if (books.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Kitap bulunamadı</h3>
        <p className="text-gray-500 mt-1">Filtreleri değiştirmeyi veya yeni kitap eklemeyi deneyin.</p>
      </div>
    );
  }

  // Group books by shelf for the Index View
  const booksByShelf = shelves.reduce((acc, shelf) => {
    acc[shelf.id] = books.filter(b => b.shelfId === shelf.id);
    return acc;
  }, {} as Record<string, Book[]>);

  // Add books in unknown shelves
  const unknownShelfBooks = books.filter(b => !shelves.find(s => s.id === b.shelfId));
  if (unknownShelfBooks.length > 0) {
    booksByShelf['unknown'] = unknownShelfBooks;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-library-800' : 'text-gray-500 hover:text-gray-700'}`}
            title="Kart Görünümü"
          >
            <Grid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('shelf_index')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'shelf_index' ? 'bg-white shadow text-library-800' : 'text-gray-500 hover:text-gray-700'}`}
            title="Raf İndeksi Görünümü"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'shelf_index' ? (
        <div className="space-y-6">
          {Object.entries(booksByShelf).map(([shelfId, shelfBooks]) => {
            if (shelfBooks.length === 0) return null;
            const shelfName = shelfId === 'unknown' ? 'Tanımsız Raf' : getShelfName(shelfId);
            
            return (
              <div key={shelfId} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-library-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-library-800 flex items-center gap-2">
                    <MapPin size={16} /> {shelfName}
                  </h3>
                  <span className="text-xs font-medium text-library-600 bg-library-100 px-2 py-0.5 rounded-full">
                    {shelfBooks.length} Kitap
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {shelfBooks.map(book => (
                    <div key={book.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900">{book.title}</div>
                        <div className="text-sm text-gray-500">{book.author}</div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-gray-400 mr-2">{book.isbn}</span>
                         <button onClick={() => onEdit(book)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Edit size={14} /></button>
                         <button onClick={() => onDelete(book.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <div key={book.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{book.author}</p>
                  </div>
                  <span className="text-xs bg-library-100 text-library-700 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                    {book.genre || 'Genel'}
                  </span>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p><span className="font-semibold">Yayınevi:</span> {book.publisher}</p>
                  <p><span className="font-semibold">Yıl:</span> {book.year}</p>
                  <p><span className="font-semibold">ISBN:</span> {book.isbn}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center text-sm text-library-600 font-medium">
                  <MapPin size={16} className="mr-1" />
                  <span className="line-clamp-1">{getShelfName(book.shelfId)}</span>
                </div>
                
                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(book)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Düzenle"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm(`${book.title} kitabını silmek istediğinize emin misiniz?`)) {
                        onDelete(book.id);
                      }
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};