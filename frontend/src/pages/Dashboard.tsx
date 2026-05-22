import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { 
  BookOpen, ShoppingBag, ShoppingCart, DollarSign, AlertTriangle, 
  RefreshCw, CheckCircle2, History, TrendingUp, Sparkles, Box 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();

  // States
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/dashboard/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-brand-yellow"></div>
          <span className="text-sm font-semibold text-slate-500">Retrieving system statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-6 rounded-2xl max-w-xl mx-auto mt-10">
        <h3 className="font-bold text-lg">Metrics Fetch Failure</h3>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
          Retry Sync
        </button>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  // Recharts Chart Data
  const chartData = [
    { name: 'Jan', Sales: 4000, Inventory: 2400 },
    { name: 'Feb', Sales: 3000, Inventory: 1398 },
    { name: 'Mar', Sales: 2000, Inventory: 9800 },
    { name: 'Apr', Sales: 2780, Inventory: 3908 },
    { name: 'May', Sales: 1890, Inventory: 4800 },
    { name: 'Jun', Sales: 2390, Inventory: 3800 },
    { name: 'Jul', Sales: 3490, Inventory: 4300 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. INTRO BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-yellow opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>Logistics Control Center</span>
            <Sparkles className="w-5 h-5 text-brand-yellow" />
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time warehouse synchronization status, order processing, and local database inventory alerts.
          </p>
        </div>
        <button 
          onClick={fetchStats}
          className="self-start md:self-auto flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* 2. KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* KPI 1: Total Books */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-sm hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Books</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-brand-navy">{stats?.totalBooks || 0}</h3>
            <span className="text-[10px] text-emerald-600 font-medium">Catalog items registered</span>
          </div>
          <div className="bg-slate-100 p-3 rounded-2xl text-brand-navy">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-sm hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-brand-navy">
              {formatCurrency(stats?.totalRevenue || 0)}
            </h3>
            <span className="text-[10px] text-emerald-600 font-medium">Synced orders value</span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-sm hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-brand-navy">{stats?.totalOrders || 0}</h3>
            <span className="text-[10px] text-amber-600 font-medium">{stats?.pendingOrders || 0} Pending fulfillment</span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Low Stock Alerts */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-sm hover:shadow-md transition ${stats?.lowStockBooks > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-slate-200'}`}>
          <div className="space-y-1">
            <span className={`text-xs font-semibold uppercase tracking-wider ${stats?.lowStockBooks > 0 ? 'text-red-600' : 'text-slate-500'}`}>Low Stock Alerts</span>
            <h3 className="text-3xl font-extrabold tracking-tight">{stats?.lowStockBooks || 0}</h3>
            <span className="text-[10px] font-medium">Quantity threshold &lt;= 5</span>
          </div>
          <div className={`p-3 rounded-2xl ${stats?.lowStockBooks > 0 ? 'bg-red-200 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 5: Shopify Synced */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-sm hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Shopify Synced</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-brand-navy">{stats?.shopifySynced || 0}</h3>
            <span className="text-[10px] text-blue-600 font-medium">GraphQL sync success</span>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 6: Pending Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-sm hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Sync queue</span>
            <h3 className="text-3xl font-extrabold tracking-tight text-brand-navy">0</h3>
            <span className="text-[10px] text-slate-500 font-medium">All background workers idle</span>
          </div>
          <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl">
            <Box className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. CHARTS AND ACTIVITIES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts Container (Takes 2 Columns) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-yellow" />
              <span>Fulfillment & Inventory Levels</span>
            </h4>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-brand-yellow rounded-full"></span>
                <span>Sales volume</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-brand-navy rounded-full"></span>
                <span>Stock count</span>
              </div>
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F4C400" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F4C400" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Sales" stroke="#F4C400" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities (Takes 1 Column) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 mb-5">
              <History className="w-4 h-4 text-brand-yellow" />
              <span>Recent Activities</span>
            </h4>
            
            <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((log: any) => (
                  <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-800 line-clamp-1">{log.details}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[10px]">
                      <span className="text-slate-500 font-medium">
                        {log.user ? `${log.user.first_name} ${log.user.last_name.slice(0, 1)}.` : 'System'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[8px] uppercase tracking-wider">
                        {log.action}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No recent activities recorded.
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/logs')}
            className="w-full mt-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-bold transition text-center cursor-pointer block"
          >
            View Full System Logs
          </button>
        </div>

      </div>

    </div>
  );
}
