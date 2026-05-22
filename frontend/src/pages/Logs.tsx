import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  History, RefreshCw, Activity, CheckCircle, 
  AlertTriangle, HelpCircle, User, Terminal, Calendar 
} from 'lucide-react';

export default function Logs() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State
  const [activeTab, setActiveTab] = useState<'audit' | 'sync'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'audit') {
        const data = await apiClient('/audit-logs');
        setAuditLogs(data);
      } else {
        const data = await apiClient('/sync-logs');
        setSyncLogs(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if admin/super admin
    if (['Super Admin', 'Admin'].includes(userRole)) {
      fetchLogs();
    }
  }, [activeTab]);

  if (!['Super Admin', 'Admin'].includes(userRole)) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-xl mx-auto mt-10 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-600" />
        <h3 className="font-bold text-lg">Access Prohibited</h3>
        <p className="text-sm">Only administrative accounts (Super Admin & Admin) are permitted to inspect log transactions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER BARS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">System Logs & Audit Trail</h2>
          <p className="text-xs text-slate-500">Review security access history, catalog alterations, and background queue workers.</p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Logs</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TABS CONTROLLER */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit' 
              ? 'border-brand-yellow text-brand-navy' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'sync' 
              ? 'border-brand-yellow text-brand-navy' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Shopify Sync History</span>
        </button>
      </div>

      {/* LOG DATA TABLES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'audit' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-44">Date / Time</th>
                  <th className="py-3.5 px-4 w-36">Action</th>
                  <th className="py-3.5 px-4">Event Details</th>
                  <th className="py-3.5 px-4 w-48">Responsible Operator</th>
                  <th className="py-3.5 px-4 w-32">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-500 font-semibold">
                      <div className="animate-spin rounded-full h-7 w-7 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                      Fetching audit database records...
                    </td>
                  </tr>
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-medium font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold font-mono text-[9px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.details}</td>
                      <td className="py-3 px-4">
                        {log.user ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.user.first_name} {log.user.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">System Automated</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{log.ip_address || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>No security audit entries recorded.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-44">Date / Time</th>
                  <th className="py-3.5 px-4 w-32">Sync Domain</th>
                  <th className="py-3.5 px-4">Log Message</th>
                  <th className="py-3.5 px-4 w-32">Execution Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-slate-500 font-semibold">
                      <div className="animate-spin rounded-full h-7 w-7 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                      Fetching sync logs...
                    </td>
                  </tr>
                ) : syncLogs.length > 0 ? (
                  syncLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-medium font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 font-mono text-[10px]">
                        {log.type}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.message}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-fit ${
                          log.status === 'Success' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {log.status === 'Success' ? (
                            <CheckCircle className="w-3 h-3 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                          )}
                          <span>{log.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-slate-400">
                      <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>No Shopify synchronization operations recorded.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
