import React, { useState, useEffect } from 'react';
import { AppView, Book, Shelf } from './types';
import { DEFAULT_SHELVES, GENRE_COLORS } from './constants';
import { scanBookImage, fetchBookDetails } from './services/geminiService';
import { Scanner } from './components/Scanner';
import { BookList } from './components/BookList';
import { 
  LayoutDashboard, 
  Library, 
  PlusCircle, 
  Settings, 
  Search, 
  Download, 
  Loader2, 
  BookMarked,
  ScanLine,
  Filter,
  X,
  Save,
  Trash2,
  CheckCircle,
  Layers,
  Edit,
  Check,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// --- Types for Batch Processing ---
interface BatchItem {
  id: string;
  base64: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  data?: Partial<Book>;
}

const App = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [books, setBooks] = useState<Book[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>(DEFAULT_SHELVES);
  
  // -- Filter State --
  const [searchQuery, setSearchQuery] = useState('');
  const [shelfFilter, setShelfFilter] = useState<string>('ALL');

  // -- Scanner State --
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [showBatchReview, setShowBatchReview] = useState(false);

  // -- Edit / Add Form State --
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({
    title: '', author: '', isbn: '', shelfId: DEFAULT_SHELVES[0]?.id, publisher: '', year: '', genre: ''
  });

  // -- Shelf Edit State --
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [editShelfData, setEditShelfData] = useState<{name: string, description: string}>({ name: '', description: '' });
  
  // -- New Shelf State (Moved from renderShelves to fix Hooks error) --
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');

  // Initial Load
  useEffect(() => {
    const loadedBooks = localStorage.getItem('library_books');
    const loadedShelves = localStorage.getItem('library_shelves');
    if (loadedBooks) setBooks(JSON.parse(loadedBooks));
    if (loadedShelves) {
      const parsedShelves = JSON.parse(loadedShelves);
      setShelves(parsedShelves);
      // Ensure form default shelf is valid
      if (parsedShelves.length > 0) {
        setBookForm(prev => ({ ...prev, shelfId: parsedShelves[0].id }));
      }
    }
  }, []);

  // Save on Change
  useEffect(() => {
    localStorage.setItem('library_books', JSON.stringify(books));
    localStorage.setItem('library_shelves', JSON.stringify(shelves));
  }, [books, shelves]);

  // --- Auto Suggestion Lists ---
  const uniqueAuthors = [...new Set(books.map(b => b.author).filter(Boolean))];
  const uniquePublishers = [...new Set(books.map(b => b.publisher).filter(Boolean))];

  // --- Batch Processing Effect ---
  useEffect(() => {
    const processQueue = async () => {
      const pendingItem = batchQueue.find(i => i.status === 'pending');
      if (pendingItem && showBatchReview) {
        // Update status to processing
        setBatchQueue(prev => prev.map(i => i.id === pendingItem.id ? { ...i, status: 'processing' } : i));
        
        try {
          // 1. Identify
          const identified = await scanBookImage(pendingItem.base64);
          let itemData: Partial<Book> = { shelfId: shelves[0].id, genre: 'Diğer' }; // Default values

          if (identified) {
             itemData = {
               ...itemData,
               title: identified.title,
               author: identified.author,
               isbn: identified.isbn
             };

             // 2. Details (if we found something meaningful)
             const query = identified.isbn || `${identified.title} ${identified.author}`;
             if (query.trim().length > 2) {
               const details = await fetchBookDetails(query);
               if (details) {
                 itemData = { ...itemData, ...details, isbn: details.isbn || identified.isbn };
               }
             }
             setBatchQueue(prev => prev.map(i => i.id === pendingItem.id ? { ...i, status: 'done', data: itemData } : i));
          } else {
             // Vision failed to find text
             setBatchQueue(prev => prev.map(i => i.id === pendingItem.id ? { ...i, status: 'error', errorMessage: 'Görüntüde kitap algılanamadı.' } : i));
          }

        } catch (e) {
          console.error(e);
          setBatchQueue(prev => prev.map(i => i.id === pendingItem.id ? { ...i, status: 'error', errorMessage: 'Bağlantı hatası.' } : i));
        }
      }
    };

    if (showBatchReview) {
      processQueue();
    }
  }, [batchQueue, showBatchReview, shelves]);


  // --- Actions ---

  const resetForm = () => {
    setBookForm({ 
      title: '', author: '', isbn: '', 
      shelfId: shelves[0]?.id || '', 
      publisher: '', year: '', genre: '' 
    });
    setEditingBookId(null);
  };

  const openEditModal = (book: Book) => {
    setBookForm({ ...book });
    setEditingBookId(book.id);
    setShowEditModal(true);
  };

  const handleBookDelete = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const handleSaveBook = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bookForm.title || !bookForm.shelfId) {
      alert("Lütfen en az kitap adı ve raf bilgisini girin.");
      return;
    }

    if (editingBookId) {
      // Update existing
      setBooks(prev => prev.map(b => b.id === editingBookId ? { ...b, ...bookForm } as Book : b));
      setShowEditModal(false);
      // alert("Kitap güncellendi.");
    } else {
      // Add new
      const newBook: Book = {
        ...(bookForm as Book),
        id: Date.now().toString(),
        addedAt: new Date().toISOString(),
        author: bookForm.author || 'Bilinmiyor',
        genre: bookForm.genre || 'Diğer'
      };
      setBooks(prev => [newBook, ...prev]);
      setCurrentView(AppView.LIBRARY);
      // alert("Kitap eklendi.");
    }
    resetForm();
  };

  const handleScanCapture = async (base64: string) => {
    if (batchMode) {
      // Add to queue and continue
      const newItem: BatchItem = {
        id: Date.now().toString(),
        base64,
        status: 'pending'
      };
      setBatchQueue(prev => [...prev, newItem]);
    } else {
      // Single scan flow
      setShowScanner(false);
      setIsProcessing(true);
      setScanError(null);
      setScanStatus('Görüntü analiz ediliyor...');
      
      try {
        const identified = await scanBookImage(base64);
        if (identified) {
          setScanStatus('Detaylar internetten alınıyor...');
          const query = identified.isbn || `${identified.title} ${identified.author}`;
          let details = null;
          
          if(query.trim().length > 2) {
             details = await fetchBookDetails(query);
          }

          if(!details && !identified.title) {
              setScanError("Kitap bilgisi bulunamadı. Lütfen daha net bir fotoğraf çekin.");
              setIsProcessing(false);
              return;
          }
          
          setBookForm(prev => ({
            ...prev,
            ...(details || {}),
            title: details?.title || identified.title || '',
            author: details?.author || identified.author || '',
            isbn: details?.isbn || identified.isbn || '',
          }));
          setScanStatus('Bulundu!');
        } else {
          setScanError('Görüntüde barkod veya okunabilir metin bulunamadı.');
        }
      } catch (err) {
        setScanError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBatchSaveAll = () => {
    const validItems = batchQueue.filter(i => i.status === 'done' && i.data?.title);
    if (validItems.length === 0) {
      alert("Kaydedilecek işlenmiş kitap yok.");
      return;
    }

    const newBooks: Book[] = validItems.map(item => ({
      ...(item.data as Book),
      id: item.id, // preserve unique id from batch
      addedAt: new Date().toISOString(),
      author: item.data?.author || 'Bilinmiyor',
      genre: item.data?.genre || 'Diğer',
      shelfId: item.data?.shelfId || shelves[0].id
    }));

    setBooks(prev => [...newBooks, ...prev]);
    setBatchQueue([]);
    setShowBatchReview(false);
    setBatchMode(false);
    setCurrentView(AppView.LIBRARY);
    alert(`${newBooks.length} kitap başarıyla eklendi!`);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    if (batchMode && batchQueue.length > 0) {
      setShowBatchReview(true);
    }
  };

  const handleUpdateShelf = (id: string) => {
    if (!editShelfData.name) {
      alert("Raf adı boş olamaz.");
      return;
    }
    setShelves(prev => prev.map(s => s.id === id ? { ...s, ...editShelfData } : s));
    setEditingShelfId(null);
  };

  const moveShelf = (index: number, direction: 'up' | 'down') => {
    const newShelves = [...shelves];
    if (direction === 'up' && index > 0) {
      [newShelves[index], newShelves[index - 1]] = [newShelves[index - 1], newShelves[index]];
    } else if (direction === 'down' && index < newShelves.length - 1) {
      [newShelves[index], newShelves[index + 1]] = [newShelves[index + 1], newShelves[index]];
    }
    setShelves(newShelves);
  };

  // --- Filtering Logic ---
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesShelf = shelfFilter === 'ALL' || b.shelfId === shelfFilter;
    return matchesSearch && matchesShelf;
  });

  // --- Render Helpers ---

  // Reusable Form Component (used in Add page, Edit Modal, Batch item edit)
  const renderBookFormFields = (
    form: Partial<Book>, 
    setForm: (val: Partial<Book>) => void,
    embedded = false
  ) => (
    <div className={`space-y-4 ${embedded ? 'text-sm' : ''}`}>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Kitap Adı</label>
            <input 
              type="text" 
              value={form.title || ''} 
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-library-500 outline-none"
              placeholder="Örn: Sefiller"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Yazar</label>
            <input 
              type="text" 
              list="authors-list"
              value={form.author || ''} 
              onChange={e => setForm({...form, author: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-library-500 outline-none"
            />
          </div>
        </div>

        <div className={`grid ${embedded ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
           <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">ISBN</label>
            <input type="text" value={form.isbn || ''} onChange={e => setForm({...form, isbn: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Yayınevi</label>
            <input 
              type="text" 
              list="publishers-list"
              value={form.publisher || ''} 
              onChange={e => setForm({...form, publisher: e.target.value})} 
              className="w-full border border-gray-300 rounded-lg p-2" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Yıl</label>
            <input type="text" value={form.year || ''} onChange={e => setForm({...form, year: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
           <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tür</label>
             <select value={form.genre || ''} onChange={e => setForm({...form, genre: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2">
               <option value="">Seçiniz</option>
               {Object.keys(GENRE_COLORS).map(g => (<option key={g} value={g}>{g}</option>))}
             </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Raf Konumu</label>
          <select 
            value={form.shelfId || ''}
            onChange={e => setForm({...form, shelfId: e.target.value})}
            className="w-full border border-gray-300 rounded-lg p-2 bg-library-50"
          >
            {shelves.map(shelf => (
              <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
            ))}
          </select>
        </div>
    </div>
  );

  const renderDashboard = () => {
    const genreData = Object.entries(books.reduce((acc, b) => {
      acc[b.genre || 'Diğer'] = (acc[b.genre || 'Diğer'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    return (
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-library-500 to-library-700 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg opacity-90">Toplam Kitap</h3>
            <p className="text-4xl font-bold mt-2">{books.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h3 className="text-lg text-gray-500">Toplam Raf</h3>
            <p className="text-4xl font-bold mt-2 text-library-800">{shelves.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-96">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tür Dağılımı</h3>
          {books.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENRE_COLORS[entry.name] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">Veri yok</div>
          )}
        </div>
      </div>
    );
  };

  const renderAddBook = () => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 max-w-2xl mx-auto pb-20 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-library-900">Kitap Ekle</h2>
        <div className="flex gap-2">
           <button 
            onClick={() => { setBatchMode(true); setShowScanner(true); }}
            className="flex items-center gap-2 bg-library-100 text-library-800 px-4 py-2 rounded-lg hover:bg-library-200 transition-colors"
          >
            <Layers size={18} />
            <span className="hidden sm:inline">Çoklu</span>
          </button>
          <button 
            onClick={() => { setBatchMode(false); setShowScanner(true); }}
            className="flex items-center gap-2 bg-library-600 text-white px-4 py-2 rounded-lg hover:bg-library-700 transition-colors"
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <ScanLine />}
            <span>Tara</span>
          </button>
        </div>
      </div>

      {scanStatus && !scanError && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${isProcessing ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
          {isProcessing && <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />}
          {scanStatus}
        </div>
      )}

      {scanError && (
        <div className="p-3 mb-4 rounded-lg text-sm bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {scanError}
        </div>
      )}

      {renderBookFormFields(bookForm, (val) => setBookForm(val))}

      <button 
        onClick={() => handleSaveBook()}
        className="w-full bg-library-800 text-white py-3 rounded-lg font-semibold hover:bg-library-900 transition-colors mt-6"
      >
        Kütüphaneye Ekle
      </button>
    </div>
  );

  const renderShelves = () => {
    const addShelf = () => {
      if(!newShelfName) return;
      setShelves([...shelves, { id: `shelf-${Date.now()}`, name: newShelfName, description: newShelfDesc }]);
      setNewShelfName('');
      setNewShelfDesc('');
    };

    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4">Yeni Raf Tanımla</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              className="flex-1 border p-2 rounded" 
              placeholder="Raf Adı (Örn: Billy Sağ - 3)" 
              value={newShelfName}
              onChange={e => setNewShelfName(e.target.value)}
            />
            <input 
              className="flex-1 border p-2 rounded" 
              placeholder="Açıklama (Örn: Çizgi Romanlar)" 
              value={newShelfDesc}
              onChange={e => setNewShelfDesc(e.target.value)}
            />
            <button onClick={addShelf} className="bg-library-600 text-white px-4 py-2 rounded whitespace-nowrap">
              Ekle
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shelves.map((shelf, index) => {
            const count = books.filter(b => b.shelfId === shelf.id).length;
            const isEditing = editingShelfId === shelf.id;

            return (
              <div key={shelf.id} className="bg-white p-4 rounded-lg border-l-4 border-library-500 shadow-sm flex flex-col justify-center min-h-[100px] relative group">
                {isEditing ? (
                  <div className="flex flex-col gap-2 w-full">
                    <input 
                      className="border p-1 rounded font-bold text-gray-800 w-full" 
                      value={editShelfData.name}
                      onChange={e => setEditShelfData({...editShelfData, name: e.target.value})}
                      placeholder="Raf Adı"
                    />
                    <input 
                      className="border p-1 rounded text-sm text-gray-600 w-full" 
                      value={editShelfData.description}
                      onChange={e => setEditShelfData({...editShelfData, description: e.target.value})}
                      placeholder="Açıklama"
                    />
                    <div className="flex gap-2 justify-end mt-1">
                      <button onClick={() => setEditingShelfId(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><X size={18} /></button>
                      <button onClick={() => handleUpdateShelf(shelf.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <h4 className="font-bold text-gray-800">{shelf.name}</h4>
                      <p className="text-sm text-gray-500">{shelf.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {/* Mobile-friendly Reorder Buttons */}
                       <div className="flex flex-col gap-1 mr-2">
                         <button 
                           onClick={() => moveShelf(index, 'up')} 
                           disabled={index === 0}
                           className="text-gray-400 hover:text-library-600 disabled:opacity-30"
                         >
                           <ArrowUp size={14} />
                         </button>
                         <button 
                           onClick={() => moveShelf(index, 'down')}
                           disabled={index === shelves.length - 1}
                           className="text-gray-400 hover:text-library-600 disabled:opacity-30"
                         >
                           <ArrowDown size={14} />
                         </button>
                       </div>

                       <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium">
                        {count} Kitap
                      </div>
                      <button 
                        onClick={() => {
                          setEditingShelfId(shelf.id);
                          setEditShelfData({ name: shelf.name, description: shelf.description });
                        }}
                        className="text-blue-500 hover:bg-blue-50 p-2 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => {
                           if(count > 0) alert("İçinde kitap olan rafı silemezsiniz.");
                           else setShelves(shelves.filter(s => s.id !== shelf.id));
                        }} 
                        className="text-red-500 hover:bg-red-50 p-2 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleExportExcel = () => {
    const headers = ['Kitap Adı', 'Yazar', 'Yayınevi', 'Yıl', 'Tür', 'ISBN', 'Raf Konumu', 'Eklenme Tarihi'];
    const rows = filteredBooks.map(b => [
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.author.replace(/"/g, '""')}"`,
      `"${b.publisher.replace(/"/g, '""')}"`,
      `"${b.year}"`,
      `"${b.genre}"`,
      `"${b.isbn}"`,
      `"${shelves.find(s => s.id === b.shelfId)?.name || 'Bilinmiyor'}"`,
      `"${new Date(b.addedAt).toLocaleDateString('tr-TR')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kutuphanem_export_${new Date().toLocaleDateString('tr-TR')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Hidden Datalists for Auto-suggestions */}
      <datalist id="authors-list">
        {uniqueAuthors.map((author, i) => <option key={i} value={author} />)}
      </datalist>
      <datalist id="publishers-list">
        {uniquePublishers.map((pub, i) => <option key={i} value={pub} />)}
      </datalist>

      {/* Sidebar / Bottom Nav for Mobile */}
      <nav className="bg-library-900 text-library-100 md:w-64 md:flex-col flex-row flex justify-between md:justify-start fixed md:sticky bottom-0 md:top-0 w-full md:h-screen p-2 md:p-4 shadow-xl z-50 md:z-auto safe-area-bottom">
        <div className="hidden md:block mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookMarked /> Kütüphanem
          </h1>
          <p className="text-xs text-library-400 mt-1">Kişisel Kitap Arşivi</p>
        </div>
        <div className="flex md:flex-col w-full justify-around md:justify-start gap-1 md:gap-4">
          <NavButton active={currentView === AppView.DASHBOARD} onClick={() => setCurrentView(AppView.DASHBOARD)} icon={<LayoutDashboard size={20} />} label="Özet" />
          <NavButton active={currentView === AppView.LIBRARY} onClick={() => setCurrentView(AppView.LIBRARY)} icon={<Library size={20} />} label="Kitaplar" />
          <NavButton active={currentView === AppView.ADD_BOOK} onClick={() => { resetForm(); setCurrentView(AppView.ADD_BOOK); }} icon={<PlusCircle size={20} />} label="Ekle" />
          <NavButton active={currentView === AppView.SHELVES} onClick={() => setCurrentView(AppView.SHELVES)} icon={<Settings size={20} />} label="Raflar" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentView === AppView.DASHBOARD && 'Genel Bakış'}
            {currentView === AppView.LIBRARY && 'Kitap Listesi'}
            {currentView === AppView.ADD_BOOK && 'Yeni Kitap Ekle'}
            {currentView === AppView.SHELVES && 'Raf Yönetimi'}
          </h2>
          
          {currentView === AppView.LIBRARY && (
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 text-sm text-library-700 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              <Download size={16} /> <span className="hidden sm:inline">Excel İndir</span>
            </button>
          )}
        </header>

        {currentView === AppView.DASHBOARD && renderDashboard()}
        
        {currentView === AppView.LIBRARY && (
          <div className="space-y-4 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Kitap veya yazar ara..." 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-library-300 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-3 text-gray-400" size={18} />
                <select 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-library-300 outline-none appearance-none bg-white"
                  value={shelfFilter}
                  onChange={(e) => setShelfFilter(e.target.value)}
                >
                  <option value="ALL">Tüm Raflar</option>
                  {shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            
            <BookList 
              books={filteredBooks} 
              shelves={shelves} 
              onDelete={handleBookDelete} 
              onEdit={openEditModal}
            />
          </div>
        )}

        {currentView === AppView.ADD_BOOK && renderAddBook()}
        {currentView === AppView.SHELVES && renderShelves()}
      </main>

      {/* --- MODALS & OVERLAYS --- */}

      {/* Camera Scanner */}
      {showScanner && (
        <Scanner 
          onCapture={handleScanCapture} 
          onClose={handleCloseScanner}
          batchMode={batchMode}
          batchCount={batchQueue.length}
          onToggleBatch={() => setBatchMode(!batchMode)}
        />
      )}

      {/* Batch Processing Review Modal */}
      {showBatchReview && (
        <div className="fixed inset-0 z-40 bg-gray-900 bg-opacity-90 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-gray-50 shadow-xl rounded-2xl relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Layers /> Toplu İşlem Merkezi
                </h3>
                <button onClick={() => { setShowBatchReview(false); setBatchQueue([]); }} className="text-gray-500 hover:text-red-500">
                  <X size={24} />
                </button>
              </div>
              
              {/* Batch Progress Bar */}
              <div className="mb-6">
                 <div className="flex justify-between text-sm text-gray-600 mb-1">
                   <span>İşleniyor: {batchQueue.filter(i => i.status === 'done' || i.status === 'error').length} / {batchQueue.length}</span>
                   <span>{Math.round((batchQueue.filter(i => i.status === 'done' || i.status === 'error').length / batchQueue.length) * 100)}%</span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                   <div 
                     className="bg-library-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                     style={{ width: `${(batchQueue.filter(i => i.status === 'done' || i.status === 'error').length / batchQueue.length) * 100}%` }}
                   ></div>
                 </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {batchQueue.map((item, index) => (
                  <div key={item.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row gap-4 animate-fade-in">
                    <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center relative">
                      <img src={`data:image/jpeg;base64,${item.base64}`} alt="Scan" className="w-full h-full object-cover" />
                      {item.status === 'processing' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="text-white animate-spin" /></div>}
                      {item.status === 'done' && <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1"><CheckCircle size={12} /></div>}
                      {item.status === 'error' && <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><AlertCircle size={12} /></div>}
                    </div>
                    
                    <div className="flex-1">
                      {item.status === 'pending' || item.status === 'processing' ? (
                         <div className="h-full flex items-center text-gray-400 italic">Sıra bekleniyor veya analiz ediliyor...</div>
                      ) : item.status === 'error' ? (
                         <div className="h-full flex items-center text-red-500 text-sm">
                           <AlertCircle size={16} className="mr-1" />
                           {item.errorMessage || "Analiz hatası"}
                         </div>
                      ) : (
                         <div className="bg-gray-50 p-3 rounded">
                            {renderBookFormFields(item.data!, (newData) => {
                               setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, data: { ...q.data, ...newData } } : q));
                            }, true)}
                         </div>
                      )}
                    </div>
                    
                    <button 
                       onClick={() => setBatchQueue(prev => prev.filter(q => q.id !== item.id))}
                       className="text-red-400 hover:text-red-600 self-start md:self-center"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-gray-50 p-4">
                 <button onClick={() => { setShowBatchReview(false); setBatchQueue([]); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                   İptal
                 </button>
                 <button 
                   onClick={handleBatchSaveAll}
                   disabled={batchQueue.some(i => i.status === 'pending' || i.status === 'processing')}
                   className="flex items-center gap-2 bg-library-800 text-white px-6 py-2 rounded-lg hover:bg-library-900 disabled:opacity-50"
                 >
                   <Save size={18} />
                   Tümünü Kaydet
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-library-800 text-white p-4 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg">Kitabı Düzenle</h3>
              <button onClick={() => setShowEditModal(false)}><X /></button>
            </div>
            <div className="p-6">
              {renderBookFormFields(bookForm, (val) => setBookForm(val))}
              <div className="mt-6 flex justify-end gap-3">
                 <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">İptal</button>
                 <button onClick={() => handleSaveBook()} className="px-6 py-2 bg-library-600 text-white rounded-lg hover:bg-library-700">Değişiklikleri Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component for Nav
const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-lg w-full transition-colors ${
      active ? 'bg-library-800 text-white shadow-lg' : 'text-library-400 md:text-library-300 hover:bg-library-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="text-[10px] md:text-base font-medium">{label}</span>
  </button>
);

export default App;