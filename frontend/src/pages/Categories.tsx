import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  Plus, Edit2, Trash2, Folder, Save, CheckCircle, 
  AlertTriangle, HelpCircle, Link as LinkIcon, X 
} from 'lucide-react';

export default function Categories() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '' as string | number,
    image_url: '',
    seo_title: '',
    seo_description: '',
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/categories');
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      parent_id: '',
      image_url: '',
      seo_title: '',
      seo_description: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      parent_id: cat.parent_id || '',
      image_url: cat.image_url || '',
      seo_title: cat.seo_title || '',
      seo_description: cat.seo_description || '',
    });
    setModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      ...formData,
      parent_id: formData.parent_id ? parseInt(formData.parent_id as string, 10) : null,
    };

    try {
      if (editingCategory) {
        await apiClient(`/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: payload,
        });
        setSuccess('Category updated successfully');
      } else {
        await apiClient('/categories', {
          method: 'POST',
          body: payload,
        });
        setSuccess('Category added successfully');
      }
      setTimeout(() => setSuccess(null), 3000);
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Category save failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this category? Associated books will be unassigned.')) return;
    try {
      await apiClient(`/categories/${id}`, { method: 'DELETE' });
      setSuccess('Category deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    }
  };

  const hasWriteAccess = ['Super Admin', 'Admin', 'Inventory Manager'].includes(userRole);

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">Catalog Categories</h2>
          <p className="text-xs text-slate-500">Design nested categories hierarchy, configure SEO indexing tags, and sync Shopify collection groups.</p>
        </div>

        {hasWriteAccess && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold transition rounded-xl text-xs cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Category</span>
          </button>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs flex gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CATEGORIES DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Icon</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">Parent Level</th>
                <th className="py-3.5 px-4">Books Quantity</th>
                <th className="py-3.5 px-4">SEO Header Title</th>
                <th className="py-3.5 px-4">Shopify Collection ID</th>
                {hasWriteAccess && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-500 font-semibold">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                    Retrieving catalog categories...
                  </td>
                </tr>
              ) : categories.length > 0 ? (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <Folder className="w-4 h-4 text-brand-yellow mx-auto" />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{cat.name}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">
                      {cat.parent?.name || 'Root Level'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {cat._count?.books || 0} books
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 italic">{cat.seo_title || 'Not specified'}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {cat.shopify_collection_id ? (
                        <span className="flex items-center gap-1 text-blue-600 font-bold">
                          <LinkIcon className="w-3 h-3 shrink-0" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </td>
                    {hasWriteAccess && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-950 text-slate-400 rounded transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {userRole === 'Super Admin' && (
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="p-1.5 hover:bg-slate-100 hover:text-red-600 text-slate-400 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No catalog categories registered.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-brand-navy text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold">{editingCategory ? 'Modify Category Details' : 'Create Catalog Category'}</span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Parent Hierarchy level</label>
                  <select
                    name="parent_id"
                    value={formData.parent_id}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
                  >
                    <option value="">Root (No Parent)</option>
                    {categories.filter(c => c.id !== editingCategory?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Illustration / Image URL</label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  placeholder="https://"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] font-bold text-brand-navy uppercase tracking-wider block">SEO Integration Data</span>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SEO Title Header</label>
                  <input
                    type="text"
                    name="seo_title"
                    value={formData.seo_title}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SEO Meta Description</label>
                  <textarea
                    name="seo_description"
                    value={formData.seo_description}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
