import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  Plus, Edit2, Trash2, Mail, Phone, Globe, 
  MapPin, HelpCircle, Save, CheckCircle, AlertTriangle, X, TrendingUp 
} from 'lucide-react';

export default function Suppliers() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    website: '',
    notes: '',
  });

  // Sourcing analytics drawer
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/suppliers');
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      website: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: any) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      email: sup.email,
      phone: sup.phone || '',
      address: sup.address || '',
      tax_id: sup.tax_id || '',
      website: sup.website || '',
      notes: sup.notes || '',
    });
    setModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingSupplier) {
        await apiClient(`/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: formData,
        });
        setSuccess('Supplier updated successfully');
      } else {
        await apiClient('/suppliers', {
          method: 'POST',
          body: formData,
        });
        setSuccess('Supplier added successfully');
      }
      setTimeout(() => setSuccess(null), 3000);
      setModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || 'Supplier save failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this supplier? All associated purchase records will be disconnected.')) return;
    try {
      await apiClient(`/suppliers/${id}`, { method: 'DELETE' });
      setSuccess('Supplier removed successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    }
  };

  const handleViewAnalytics = async (id: number) => {
    try {
      const data = await apiClient(`/suppliers/${id}/analytics`);
      const targetSup = suppliers.find(s => s.id === id);
      setAnalytics({ ...data, name: targetSup?.name });
      setAnalyticsOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analytics');
    }
  };

  const hasWriteAccess = ['Super Admin', 'Admin', 'Supplier Manager'].includes(userRole);

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">Wholesale Suppliers Directory</h2>
          <p className="text-xs text-slate-500">Register book vendors, track delivery lines, and review sourcing expenditures.</p>
        </div>

        {hasWriteAccess && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold transition rounded-xl text-xs cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier Sourcing</span>
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

      {/* SUPPLIERS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500 font-semibold">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
            Loading vendor directory...
          </div>
        ) : suppliers.length > 0 ? (
          suppliers.map((sup) => (
            <div key={sup.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition space-y-4">
              
              {/* Header Details */}
              <div>
                <h3 className="text-base font-extrabold text-brand-navy truncate">{sup.name}</h3>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                  TAX ID: {sup.tax_id || 'NOT REGISTERED'}
                </span>
                
                {/* Custom Notes */}
                {sup.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-3 line-clamp-2">
                    {sup.notes}
                  </p>
                )}
              </div>

              {/* Contact details */}
              <div className="space-y-2 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-yellow shrink-0" />
                  <span className="truncate">{sup.email}</span>
                </div>
                {sup.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-yellow shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{sup.address}</span>
                  </div>
                )}
                {sup.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-yellow shrink-0" />
                    <a href={sup.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                      {sup.website.replace(/(^\w+:|^)\/\//, '')}
                    </a>
                  </div>
                )}
              </div>

              {/* Lower panel counts and actions */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400">
                <div>
                  <span className="text-slate-800 font-bold block">{sup._count?.books || 0} books</span>
                  <span className="text-[10px] block">Procured items</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleViewAnalytics(sup.id)}
                    title="View PO Analytics"
                    className="p-1.5 hover:bg-slate-100 hover:text-brand-navy text-slate-400 rounded transition cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                  {hasWriteAccess && (
                    <button
                      onClick={() => handleOpenEdit(sup)}
                      title="Edit Supplier"
                      className="p-1.5 hover:bg-slate-100 hover:text-slate-900 text-slate-400 rounded transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {userRole === 'Super Admin' && (
                    <button
                      onClick={() => handleDelete(sup.id)}
                      title="Delete Supplier"
                      className="p-1.5 hover:bg-slate-100 hover:text-red-600 text-slate-400 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span>No wholesale vendors registered.</span>
          </div>
        )}
      </div>

      {/* ADD/EDIT SUPPLIER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-brand-navy text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold">{editingSupplier ? 'Modify Vendor Specifications' : 'Register Sourcing Vendor'}</span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name *</label>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Telephone Line</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tax Code / ID</label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Physical Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Company Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  placeholder="https://"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                />
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
                  <span>Save Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANALYTICS DRAWER */}
      {analyticsOpen && analytics && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between animate-slideLeft">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-extrabold text-brand-navy flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-yellow" />
                  <span>Procurement Spend Analytics</span>
                </h3>
                <button onClick={() => setAnalyticsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <span className="block text-xs text-slate-400 uppercase tracking-wide mb-4">Supplier: {analytics.name}</span>
              
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Issued Purchase Orders:</span>
                  <span className="font-bold text-slate-800 text-sm">{analytics.totalOrdersCount} POs</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Completed Deliveries:</span>
                  <span className="font-bold text-green-600 text-sm">{analytics.completedOrdersCount} POs</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Total Spend Volume:</span>
                  <span className="font-extrabold text-slate-900 text-sm">${analytics.totalSpend.toFixed(2)}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Avg Order Cost:</span>
                  <span className="font-semibold text-slate-800 text-sm">${analytics.averageOrderValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setAnalyticsOpen(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs cursor-pointer transition text-center block"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
