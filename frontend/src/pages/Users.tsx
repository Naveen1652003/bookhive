import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';
import { useAppSelector } from '../app/hooks';
import { 
  Plus, Edit2, Trash2, ShieldCheck, Mail, Save, 
  CheckCircle, AlertTriangle, HelpCircle, X, Check, Power 
} from 'lucide-react';

export default function Users() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'Viewer';

  // State
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'Viewer',
    is_active: true,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (['Super Admin', 'Admin'].includes(userRole)) {
      fetchUsers();
    }
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'Viewer',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (targetUsr: any) => {
    setEditingUser(targetUsr);
    setFormData({
      first_name: targetUsr.first_name,
      last_name: targetUsr.last_name,
      email: targetUsr.email,
      password: '', // Skip password update in generic edit
      role: targetUsr.role,
      is_active: targetUsr.is_active,
    });
    setModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingUser) {
        // Edit flow
        const payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        };
        await apiClient(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: payload,
        });
        setSuccess('User updated successfully');
      } else {
        // Create flow
        if (!formData.password) {
          setError('Password is required for new accounts');
          return;
        }
        await apiClient('/users', {
          method: 'POST',
          body: formData,
        });
        setSuccess('User registered successfully');
      }

      setTimeout(() => setSuccess(null), 3000);
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Saving user failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user profile?')) return;
    try {
      await apiClient(`/users/${id}`, { method: 'DELETE' });
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Deletion failed');
    }
  };

  if (!['Super Admin', 'Admin'].includes(userRole)) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-xl mx-auto mt-10 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-600" />
        <h3 className="font-bold text-lg">Access Prohibited</h3>
        <p className="text-sm">Only administrative accounts (Super Admin & Admin) are permitted to edit platform operator profiles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER BARS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">Warehouse Operators Registry</h2>
          <p className="text-xs text-slate-500">Configure operator privileges, verify email registries, and toggle status access keys.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-yellow hover:bg-brand-darkYellow text-brand-navy font-bold transition rounded-xl text-xs cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register Team Operator</span>
        </button>
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

      {/* USER LIST DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Operator Name</th>
                <th className="py-3.5 px-4">Work Email</th>
                <th className="py-3.5 px-4">System Privilege Role</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-500 font-semibold">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-brand-yellow mx-auto mb-3"></div>
                    Retrieving active user accounts...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {usr.first_name} {usr.last_name}
                      {user?.id === usr.id && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[8px] uppercase tracking-wider">
                          Self session
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{usr.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 text-brand-navy font-bold text-[10px] uppercase font-mono">
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(usr.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit mx-auto ${
                        usr.is_active 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-red-50 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${usr.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span>{usr.is_active ? 'Active' : 'Deactivated'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(usr)}
                          className="p-1.5 hover:bg-slate-100 hover:text-slate-950 text-slate-400 rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user?.id !== usr.id && (
                          <button
                            onClick={() => handleDelete(usr.id)}
                            className="p-1.5 hover:bg-slate-100 hover:text-red-600 text-slate-400 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No team operator profiles found.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-scaleUp">
            <div className="bg-brand-navy text-white px-5 py-4 flex items-center justify-between">
              <span className="font-bold">{editingUser ? 'Modify Operator Attributes' : 'Register Platform Operator'}</span>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Work Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              {/* Password field only shown when creating */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">System Privilege Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-brand-gray border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-brand-yellow cursor-pointer"
                  required
                >
                  <option value="Viewer">Viewer (Read-only)</option>
                  <option value="Supplier Manager">Supplier Manager</option>
                  <option value="Order Manager">Order Manager</option>
                  <option value="Inventory Manager">Inventory Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              {/* Is Active Status checkbox - only shown when editing */}
              {editingUser && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="isActiveCheck"
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded text-brand-yellow"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Power className="w-3.5 h-3.5 text-slate-500" />
                    <span>Authorize user session access (Active)</span>
                  </label>
                </div>
              )}

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
                  <Check className="w-4.5 h-4.5" />
                  <span>{editingUser ? 'Update Profile' : 'Register Operator'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
