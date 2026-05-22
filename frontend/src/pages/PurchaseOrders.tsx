import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  Plus, CheckCircle, AlertTriangle, HelpCircle, 
  Trash, Save, ArrowLeft, ArrowRight, ShieldCheck, X
} from 'lucide-react';

export default function PurchaseOrders() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New PO Modal Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<any[]>([{ isbn: '', title: '', quantity: 1, unit_price: 0.0 }]);
  const [creating, setCreating] = useState(false);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/orders/purchase-orders');
      setPurchaseOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await apiClient('/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
  }, []);

  // Items rows management
  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { isbn: '', title: '', quantity: 1, unit_price: 0.0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index][field] = field === 'quantity' ? parseInt(value, 10) : field === 'unit_price' ? parseFloat(value) : value;
      return updated;
    });
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.some(item => !item.isbn || !item.title)) {
      setError('Please select a supplier and provide ISBN/Title for all items.');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      await apiClient('/orders/purchase-orders', {
        method: 'POST',
        body: { supplier_id: supplierId, items },
      });

      setSuccess('Purchase Order issued successfully');
      setTimeout(() => setSuccess(null), 3000);
      setModalOpen(false);
      setSupplierId('');
      setItems([{ isbn: '', title: '', quantity: 1, unit_price: 0.0 }]);
      fetchPurchaseOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to issue Purchase Order');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      setError(null);
      await apiClient(`/orders/purchase-orders/${id}/status`, {
        method: 'PUT',
        body: { status: newStatus },
      });
      setSuccess(`Purchase Order status updated to "${newStatus}"`);
      setTimeout(() => setSuccess(null), 3000);
      fetchPurchaseOrders();
    } catch (err: any) {
      setError(err.message || 'Status update failed');
    }
  };

  const hasWriteAccess = ['Super Admin', 'Admin', 'Order Manager'].includes(userRole);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER & MAIN ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">Procurement & Purchase Orders</h2>
          <p className="text-xs text-slate-500">Manage supplier supply-lines, track PO approvals, and receive incoming inventory stock.</p>
        </div>

        {hasWriteAccess && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold transition rounded-xl text-xs cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Purchase Order</span>
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

      {/* PO LIST DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">PO Ref No.</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Placement Date</th>
                <th className="py-3.5 px-4">Status</th>
                {hasWriteAccess && <th className="py-3.5 px-4 text-right">Lifecycle Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-500 font-semibold">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                    Querying procurement database...
                  </td>
                </tr>
              ) : purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">{po.po_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{po.supplier?.name}</div>
                      <div className="text-[10px] text-slate-500">{po.supplier?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">${po.total_amount.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        po.status === 'Completed' ? 'bg-green-50 text-green-700' :
                        po.status === 'Approved' ? 'bg-blue-50 text-blue-700' :
                        po.status === 'Sent' ? 'bg-amber-50 text-amber-600' :
                        po.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    {hasWriteAccess && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {po.status === 'Draft' && (
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'Sent')}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold cursor-pointer transition"
                            >
                              Dispatch PO
                            </button>
                          )}
                          {po.status === 'Sent' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(po.id, 'Approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(po.id, 'Rejected')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {po.status === 'Approved' && (
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'Completed')}
                              className="px-2.5 py-1 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy rounded text-[10px] font-extrabold cursor-pointer transition flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Receive Stock</span>
                            </button>
                          )}
                          {po.status === 'Completed' && (
                            <span className="text-[10px] text-slate-400 font-semibold italic">Stock Received</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No procurement histories found.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PO CREATION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-brand-navy text-white px-5 py-4 flex items-center justify-between shrink-0">
              <span className="font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-yellow" />
                <span>Issue Supplier Procurement PO</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="flex flex-col flex-1 overflow-hidden">
              
              {/* Form Scrollable Contents */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* Select Supplier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Sourcing Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-brand-gray border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
                    required
                  >
                    <option value="">Choose Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* PO Items Editor Table */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-brand-navy uppercase tracking-wider">Purchase Catalog Items</span>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold cursor-pointer transition"
                    >
                      + Add Item Row
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 w-1/4">ISBN Code *</th>
                          <th className="py-2 px-3 w-1/3">Book Title *</th>
                          <th className="py-2 px-3">Quantity *</th>
                          <th className="py-2 px-3">Unit Cost ($) *</th>
                          <th className="py-2 px-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.isbn}
                                onChange={(e) => handleItemChange(idx, 'isbn', e.target.value)}
                                className="w-full bg-brand-gray border border-slate-200 rounded p-1.5 text-xs"
                                placeholder="978013..."
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                                className="w-full bg-brand-gray border border-slate-200 rounded p-1.5 text-xs"
                                placeholder="e.g. Design Patterns"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="w-full bg-brand-gray border border-slate-200 rounded p-1.5 text-xs"
                                min={1}
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                className="w-full bg-brand-gray border border-slate-200 rounded p-1.5 text-xs"
                                min={0}
                                required
                              />
                            </td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                disabled={items.length === 1}
                                className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                              >
                                <Trash className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4.5 h-4.5" />
                  <span>{creating ? 'Saving PO...' : 'Issue PO Draft'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
