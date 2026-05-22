import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  Plus, Search, Edit2, Trash2, RefreshCw, Upload, 
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, 
  HelpCircle, Copy, SlidersHorizontal, ArrowUpDown, X
} from 'lucide-react';

export default function Inventory() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State bindings
  const [books, setBooks] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Search & Filtering
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [lowStock, setLowStock] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  // Loading & Operations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // CSV Import Dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  // Fetch Options
  const loadOptions = async () => {
    try {
      const [cats, sups] = await Promise.all([
        apiClient('/categories'),
        apiClient('/suppliers'),
      ]);
      setCategories(cats);
      setSuppliers(sups);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Catalog
  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
        category_id: categoryId,
        vendor_id: vendorId,
        lowStock: lowStock.toString(),
        sortBy,
        sortOrder,
      });

      const data = await apiClient(`/books?${queryParams.toString()}`);
      setBooks(data.books);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch catalog items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, search, status, categoryId, vendorId, lowStock, sortBy, sortOrder]);

  // Page index trigger
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev: any) => ({ ...prev, page: newPage }));
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination((prev: any) => ({ ...prev, page: 1 }));
  };

  // Row operations
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this catalog item? This will also remove it from Shopify.')) return;
    try {
      await apiClient(`/books/${id}`, { method: 'DELETE' });
      setSuccessMsg('Catalog item deleted successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchBooks();
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    }
  };

  const handleSync = async (id: number) => {
    try {
      setError(null);
      setSuccessMsg('Enqueuing Shopify synchronization job...');
      await apiClient(`/books/${id}/shopify-sync`, { method: 'POST' });
      setSuccessMsg('Shopify synchronization enqueued successfully');
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchBooks();
    } catch (err: any) {
      setError(err.message || 'Shopify sync failed');
    }
  };

  const handleDuplicate = async (book: any) => {
    try {
      setError(null);
      const duplicateData = {
        isbn: `CL-${Math.floor(10000000 + Math.random() * 90000000)}`,
        title: `${book.title} (Duplicate)`,
        author: book.author,
        description: book.description,
        category_id: book.category_id,
        vendor_id: book.vendor_id,
        price: book.price,
        shopify_price: book.shopify_price,
        quantity: 0, // Reset quantity for clone
        weight: book.weight,
        publisher: book.publisher,
        language: book.language,
        sku: book.sku ? `${book.sku}-DUP` : null,
        barcode: book.barcode,
        tags: book.tags,
        status: 'Draft', // Set to Draft for review
        dimensions: book.dimensions,
        image_url: book.image_url,
      };

      await apiClient('/books', {
        method: 'POST',
        body: duplicateData,
      });

      setSuccessMsg('Cloned item created as Draft');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchBooks();
    } catch (err: any) {
      setError(err.message || 'Duplication failed');
    }
  };

  // CSV Import Submit
  const handleCSVImport = async () => {
    if (!importText.trim()) return;
    try {
      setImporting(true);
      setError(null);

      // Parse pasted tab or comma text: Header is assumed: isbn, title, author, price, quantity
      const rows = importText.split('\n');
      const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
      
      const parsedBooks = [];
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',').map((c) => c.trim());
        if (columns.length < 3 || !columns[0]) continue;

        const rowBook: any = {};
        headers.forEach((header, index) => {
          rowBook[header] = columns[index] || '';
        });
        parsedBooks.push(rowBook);
      }

      const res = await apiClient('/books/import', {
        method: 'POST',
        body: { books: parsedBooks },
      });

      setSuccessMsg(res.message || 'CSV records imported successfully');
      setImportOpen(false);
      setImportText('');
      fetchBooks();
    } catch (err: any) {
      setError(err.message || 'CSV Import failed');
    } finally {
      setImporting(false);
    }
  };

  const hasWriteAccess = ['Super Admin', 'Admin', 'Inventory Manager'].includes(userRole);

  return (
    <div className="space-y-6">
      
      {/* 1. TOP STATS AND ACTIONS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">Warehouse Catalog Inventory</h2>
          <p className="text-xs text-slate-500">Add catalog books, monitor stock counts, and execute Shopify updates.</p>
        </div>

        {hasWriteAccess && (
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk CSV Import</span>
            </button>
            <Link
              to="/inventory/add"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold transition rounded-xl text-xs cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Single Book</span>
            </Link>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs flex gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. FILTERING CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-navy uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-brand-yellow" />
          <span>Search & Filter Criteria</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {/* Search Input */}
          <div className="relative col-span-1 sm:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search title, author, isbn, SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev: any) => ({ ...prev, page: 1 }));
              }}
              className="w-full bg-brand-gray border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-brand-yellow transition"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPagination((prev: any) => ({ ...prev, page: 1 }));
            }}
            className="bg-brand-gray border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Supplier Dropdown */}
          <select
            value={vendorId}
            onChange={(e) => {
              setVendorId(e.target.value);
              setPagination((prev: any) => ({ ...prev, page: 1 }));
            }}
            className="bg-brand-gray border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((prev: any) => ({ ...prev, page: 1 }));
            }}
            className="bg-brand-gray border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* Low Stock checkbox filter */}
        <div className="flex items-center pt-2">
          <input
            id="lowStockCheck"
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setLowStock(e.target.checked);
              setPagination((prev: any) => ({ ...prev, page: 1 }));
            }}
            className="h-4 w-4 bg-brand-gray border-slate-200 rounded text-brand-yellow"
          />
          <label htmlFor="lowStockCheck" className="ml-2 text-xs font-semibold text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Show low-stock items only (&lt;= 5 books remaining)</span>
          </label>
        </div>
      </div>

      {/* 3. DATA TABLE LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-3.5 px-4 w-16">Cover</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1.5">
                    <span>Title / Author</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('isbn')}>
                  <div className="flex items-center gap-1.5">
                    <span>ISBN</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Local Price</th>
                <th className="py-3.5 px-4">Shopify Price</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('quantity')}>
                  <div className="flex items-center gap-1.5">
                    <span>Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Shopify Sync</th>
                {hasWriteAccess && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-20 text-slate-500 font-semibold">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                    Querying warehouse catalog database...
                  </td>
                </tr>
              ) : books.length > 0 ? (
                books.map((book) => {
                  const isLow = book.quantity <= 5;
                  
                  return (
                    <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        {book.image_url ? (
                          <img src={book.image_url} alt="Cover" className="w-9 h-12 object-cover rounded shadow-sm" />
                        ) : (
                          <div className="w-9 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold font-mono">
                            BK
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 line-clamp-1">{book.title}</div>
                        <div className="text-slate-500 text-[10px]">{book.author}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{book.isbn}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                          {book.category?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">${book.price.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        {book.shopify_price ? `$${book.shopify_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <span className={isLow ? 'text-red-600 font-bold' : 'text-slate-800'}>
                            {book.quantity} units
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          book.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                          book.status === 'Draft' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {book.sync_status === 'Synced' && book.shopify_product_id ? (
                          (() => {
                            const storeDomain = import.meta.env.VITE_SHOPIFY_STORE || 'ehub-node-upgrade.myshopify.com';
                            const numericId = book.shopify_product_id.split('/').pop();
                            const shopifyAdminUrl = `https://${storeDomain}/admin/products/${numericId}`;
                            return (
                              <a
                                href={shopifyAdminUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="View in Shopify Admin"
                              >
                                <span>Synced</span>
                                <span className="text-[8px] opacity-75">↗</span>
                              </a>
                            );
                          })()
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            book.sync_status === 'Synced' ? 'bg-blue-50 text-blue-700' :
                            book.sync_status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {book.sync_status}
                          </span>
                        )}
                      </td>
                      
                      {hasWriteAccess && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSync(book.id)}
                              title="Sync to Shopify"
                              className="p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded text-slate-400 cursor-pointer transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(book)}
                              title="Duplicate Item"
                              className="p-1.5 hover:bg-slate-100 hover:text-amber-600 rounded text-slate-400 cursor-pointer transition"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              to={`/inventory/edit/${book.id}`}
                              title="Edit Properties"
                              className="p-1.5 hover:bg-slate-100 hover:text-brand-navy rounded text-slate-400 cursor-pointer transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>
                            {userRole === 'Super Admin' && (
                              <button
                                onClick={() => handleDelete(book.id)}
                                title="Delete Item"
                                className="p-1.5 hover:bg-slate-100 hover:text-red-600 rounded text-slate-400 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No catalog items match current search filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        <div className="bg-slate-50 px-4 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <div>
            Showing Page <span className="text-brand-navy font-bold">{pagination.page}</span> of <span className="text-brand-navy font-bold">{pagination.totalPages}</span> ({pagination.total} catalog items total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CSV IMPORT DIALOG MODAL */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-navy text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-yellow" />
                <span className="font-bold">Catalog Batch Spreadsheet Import</span>
              </div>
              <button onClick={() => setImportOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2 text-slate-600 leading-relaxed">
                <span className="font-bold text-brand-navy block uppercase tracking-wider text-[10px]">Data Layout Guideline</span>
                <p>Paste spreadsheet data or CSV lines below. The first row must define headers. Required columns are: <span className="font-mono bg-slate-200 px-1 rounded text-red-600">isbn, title, author, price, quantity</span></p>
                <p className="font-mono bg-slate-200/50 p-2 rounded text-[10px] block">
                  isbn,title,author,price,quantity<br />
                  9780132350884,Clean Code,Robert C. Martin,44.99,10<br />
                  9780135957059,Pragmatic Programmer,David Thomas,39.95,5
                </p>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="isbn,title,author,price,quantity&#10;9780123456789,My Book Title,Author Name,19.99,100"
                rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-yellow font-mono focus:ring-1 focus:ring-brand-yellow"
              />
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCSVImport}
                disabled={importing || !importText.trim()}
                className="px-5 py-2 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {importing ? 'Processing Rows...' : 'Initiate Catalog Sync'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
