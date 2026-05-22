import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { 
  ArrowLeft, Save, Plus, Package, DollarSign, 
  Info, Barcode, ClipboardSignature, RefreshCw, CheckCircle2 
} from 'lucide-react';

export default function BookForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Form Fields
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    description: '',
    category_id: '' as string | number,
    vendor_id: '' as string | number,
    price: 0,
    shopify_price: 0,
    quantity: 0,
    weight: 0,
    publisher: '',
    language: 'English',
    sku: '',
    barcode: '',
    tags: '',
    status: 'Draft',
    dimensions: '',
    image_url: '',
  });

  // Supporting States
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Categories & Suppliers
  const loadOptions = async () => {
    try {
      const [cats, sups] = await Promise.all([
        apiClient('/categories'),
        apiClient('/suppliers'),
      ]);
      setCategories(cats);
      setSuppliers(sups);
    } catch (err) {
      console.error('Failed to load form options: ', err);
    }
  };

  // Load Book detail if Edit
  const loadBookDetail = async () => {
    if (!isEditMode) return;
    try {
      setFetching(true);
      const book = await apiClient(`/books/${id}`);
      setFormData({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        description: book.description || '',
        category_id: book.category_id || '',
        vendor_id: book.vendor_id || '',
        price: book.price || 0,
        shopify_price: book.shopify_price || book.price || 0,
        quantity: book.quantity || 0,
        weight: book.weight || 0,
        publisher: book.publisher || '',
        language: book.language || 'English',
        sku: book.sku || '',
        barcode: book.barcode || '',
        tags: book.tags || '',
        status: book.status || 'Draft',
        dimensions: book.dimensions || '',
        image_url: book.image_url || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch book data');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadOptions();
    loadBookDetail();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'price' || name === 'shopify_price' || name === 'quantity' || name === 'weight'
        ? (value === '' ? '' : parseFloat(value))
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prepare payload
    const payload = {
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id as string, 10) : null,
      vendor_id: formData.vendor_id ? parseInt(formData.vendor_id as string, 10) : null,
      price: Number(formData.price),
      shopify_price: formData.shopify_price ? Number(formData.shopify_price) : Number(formData.price),
      quantity: Number(formData.quantity),
      weight: formData.weight ? Number(formData.weight) : null,
    };

    try {
      if (isEditMode) {
        await apiClient(`/books/${id}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await apiClient('/books', {
          method: 'POST',
          body: payload,
        });
      }
      navigate('/inventory');
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-900 border-t-brand-yellow"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* HEADER BARS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/inventory" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-brand-navy">{isEditMode ? 'Edit Book Properties' : 'Register New Book'}</h2>
            <p className="text-xs text-slate-500">Provide catalog descriptions, barcodes, and inventory specifications.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-xs flex gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* FORM BODY */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core details card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="w-4 h-4 text-brand-yellow" />
            <span>Book Metadata</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Book Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="e.g. Clean Code"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Primary Author *</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="e.g. Robert C. Martin"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ISBN Number *</label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="9780132350884"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Publishing status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
              >
                <option value="Draft">Draft (Offline)</option>
                <option value="Active">Active (Publish)</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
              placeholder="Detailed description of the book content and review summaries..."
            />
          </div>
        </div>

        {/* Pricing & Stock card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Package className="w-4 h-4 text-brand-yellow" />
            <span>Procurement & Stock Limits</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Base Price ($) *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 pl-6 text-sm focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Shopify Price ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  name="shopify_price"
                  value={formData.shopify_price}
                  onChange={handleChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 pl-6 text-sm focus:outline-none focus:border-brand-yellow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Initial Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">System SKU (Unique Reference)</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="BOOK-CLEAN-CODE"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">EAN / Barcode</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="9780132350884"
              />
            </div>
          </div>
        </div>

        {/* Vendors and categorizations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <ClipboardSignature className="w-4 h-4 text-brand-yellow" />
            <span>Categorization & Sourcing</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category Designation</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Wholesale Supplier</label>
              <select
                name="vendor_id"
                value={formData.vendor_id}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Publisher Name</label>
              <input
                type="text"
                name="publisher"
                value={formData.publisher}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="e.g. Prentice Hall"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tags (Comma-separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="programming, clean-code, tech"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cover Image URL</label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dimensions (LxWxH)</label>
              <input
                type="text"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand-yellow"
                placeholder="e.g. 7.3 x 1.2 x 9.1 inches"
              />
            </div>
          </div>
        </div>

        {/* Form controls */}
        <div className="flex justify-end gap-3.5 border-t border-slate-200 pt-5">
          <Link
            to="/inventory"
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-600 rounded-xl text-sm font-semibold cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy transition rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Catalog Item'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
