import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  Search, RefreshCw, ShoppingCart, CheckCircle, AlertTriangle, 
  HelpCircle, ChevronLeft, ChevronRight, FileText, Printer, CheckSquare, X
} from 'lucide-react';

export default function Orders() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pick Slip Drawer
  const [pickSlip, setPickSlip] = useState<any>(null);
  const [pickOpen, setPickOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
      });

      const data = await apiClient(`/orders?${queryParams.toString()}`);
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, search, status]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev: any) => ({ ...prev, page: newPage }));
    }
  };

  // Sync orders with Shopify
  const handleSyncOrders = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);
      const res = await apiClient('/orders/sync', { method: 'POST' });
      setSuccess(res.message || 'Orders synchronized successfully');
      setTimeout(() => setSuccess(null), 4000);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Shopify sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Fetch Pick Slip details
  const handleViewPickSlip = async (orderId: number) => {
    try {
      const slip = await apiClient(`/orders/pick-slip/${orderId}`);
      setPickSlip(slip);
      setPickOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pick slip');
    }
  };

  const hasWriteAccess = ['Super Admin', 'Admin', 'Order Manager'].includes(userRole);

  return (
    <div className="space-y-6">
      
      {/* HEADER & TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy font-sans">Shopify Fulfillment Desk</h2>
          <p className="text-xs text-slate-500">Sync customer orders, check payments, and print packaging lists.</p>
        </div>

        {hasWriteAccess && (
          <button
            onClick={handleSyncOrders}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold transition rounded-xl text-xs cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Ingesting Shopify Webhooks...' : 'Fetch Shopify Orders'}</span>
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

      {/* FILTER SEARCH CRITERIA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="relative col-span-1 sm:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search Order No. or Customer Name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev: any) => ({ ...prev, page: 1 }));
            }}
            className="w-full bg-brand-gray border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-brand-yellow transition"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPagination((prev: any) => ({ ...prev, page: 1 }));
          }}
          className="bg-brand-gray border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Fulfilled">Fulfilled</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* ORDERS DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Order Ref No.</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Order Items Count</th>
                <th className="py-3.5 px-4">Fulfillment Cost</th>
                <th className="py-3.5 px-4">Placement Date</th>
                <th className="py-3.5 px-4">Delivery Service</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-slate-500 font-semibold">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                    Retrieving active order entries...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">{ord.order_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{ord.customer_email || 'No email'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {ord.items?.length || 0} unique books
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">${ord.amount.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{ord.delivery_method || 'Standard'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        ord.status === 'Fulfilled' ? 'bg-green-50 text-green-700' :
                        ord.status === 'Paid' ? 'bg-blue-50 text-blue-700' :
                        ord.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewPickSlip(ord.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Print Pick Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No synced orders found.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        <div className="bg-slate-50 px-4 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <div>
            Showing Page <span className="text-brand-navy font-bold">{pagination.page}</span> of <span className="text-brand-navy font-bold">{pagination.totalPages}</span> ({pagination.total} orders total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PICK SLIP DRAWER (SLIDE OUT OVERLAY) */}
      {pickOpen && pickSlip && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-100 flex flex-col justify-between animate-slideLeft">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-brand-yellow" />
                <span className="font-bold">Picking List Slip Details</span>
              </div>
              <button onClick={() => setPickOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Sheet Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* Slip Metadata Card */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Order Number:</span>
                  <span className="font-bold text-slate-800 font-mono">{pickSlip.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-semibold text-slate-800">{pickSlip.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Shipment Method:</span>
                  <span className="font-medium text-slate-700">{pickSlip.deliveryMethod || 'Standard Post'}</span>
                </div>
              </div>

              {/* Picking list table */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-brand-navy uppercase tracking-wider block">Items to Collect</span>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Collector Check</th>
                        <th className="py-2 px-3">Title / SKU</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3 text-right">Shelf Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pickSlip.items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <input type="checkbox" className="h-4 w-4 rounded text-brand-yellow cursor-pointer" />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{item.title}</div>
                            <div className="text-[9px] font-mono text-slate-500 mt-0.5">SKU: {item.sku}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{item.quantity}x</td>
                          <td className="py-3 px-3 text-right font-mono text-[10px] font-bold text-brand-navy">{item.binLocation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex gap-3 shrink-0">
              <button
                onClick={() => setPickOpen(false)}
                className="flex-1 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Slip
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print slip document</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
