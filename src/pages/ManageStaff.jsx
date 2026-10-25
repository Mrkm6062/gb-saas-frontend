import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Users, 
  UserPlus, 
  Key, 
  Phone, 
  Mail, 
  Shield, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  X, 
  CreditCard, 
  ExternalLink,
  Clock,
  Search,
  Lock
} from 'lucide-react';

const ManageStaff = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const navigate = useNavigate();

  const currentStore = stores.find(s => s.storeId === storeId || s._id === storeId) || 
    (stores.length > 0 ? stores[0] : {});

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Add form fields
  const [addName, setAddName] = useState('');
  const [addStaffId, setAddStaffId] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('counter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('counter');
  const [editStatus, setEditStatus] = useState('active');
  const [editPassword, setEditPassword] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStaff = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff?storeId=${currentStore._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to load staff list', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Network error fetching staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentStore._id]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!addName.trim() || !addStaffId.trim() || !addPassword) {
      return showToast('Please fill all required fields.', 'error');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId: currentStore._id,
          name: addName.trim(),
          staffId: addStaffId.trim().toUpperCase(),
          password: addPassword,
          phone: addPhone.trim(),
          email: addEmail.trim(),
          role: addRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Staff created successfully!', 'success');
        setIsAddModalOpen(false);
        setAddName('');
        setAddStaffId('');
        setAddPassword('');
        setAddPhone('');
        setAddEmail('');
        setAddRole('counter');
        fetchStaff();
      } else {
        showToast(data.message || 'Failed to create staff', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setEditName(staff.name || '');
    setEditPhone(staff.phone || '');
    setEditEmail(staff.email || '');
    setEditRole(staff.role || 'counter');
    setEditStatus(staff.status || 'active');
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role: editRole,
        status: editStatus
      };
      if (editPassword && editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`${API_BASE_URL}/api/staff/${selectedStaff._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Staff updated successfully!', 'success');
        setIsEditModalOpen(false);
        fetchStaff();
      } else {
        showToast(data.message || 'Failed to update staff', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete staff member '${name}'? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Staff member deleted successfully.', 'success');
        fetchStaff();
      } else {
        showToast(data.message || 'Failed to delete staff', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery) ||
    s.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Staff Management">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-extrabold text-sm text-white transition-all animate-bounce ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}>
            <span>{toast.type === 'error' ? '❌' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold rounded-full border border-indigo-500/30">
                Store ID: {currentStore.storeId || storeId}
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full border border-emerald-500/30">
                Counter POS Ready
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Staff Management</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Create and manage staff accounts for Counter Sales (POS), Dine-in order taking, and billing operations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-[#76b900] hover:bg-[#68a500] text-white font-extrabold text-sm rounded-xl transition shadow-lg flex items-center gap-2"
            >
              <UserPlus size={18} /> Add New Staff
            </button>
            <a
              href={`/store/${currentStore.storeId || storeId}/counter`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition flex items-center gap-2"
            >
              <CreditCard size={18} /> Open Counter POS <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, ID, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
            />
          </div>

          <div className="text-xs font-bold text-slate-500">
            Total Staff: <span className="text-slate-900 font-black">{staffList.length}</span>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold">
              Loading staff accounts...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users size={44} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-lg text-slate-800">No Staff Members Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'No staff matched your search query.' : 'Create your first staff account so they can log in to the Counter POS and start billing.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-[#76b900] text-white font-bold text-xs rounded-xl shadow"
                >
                  + Add First Staff
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Staff ID (Login)</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Login</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStaff.map((staff) => (
                    <tr key={staff._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{staff.name}</div>
                        <div className="text-[11px] text-slate-400">Created: {new Date(staff.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs border border-slate-200">
                          {staff.staffId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {staff.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700 font-medium">
                          {staff.phone ? <div className="flex items-center gap-1">📞 {staff.phone}</div> : null}
                          {staff.email ? <div className="flex items-center gap-1 text-slate-400">✉️ {staff.email}</div> : null}
                          {!staff.phone && !staff.email ? <span className="text-slate-400">-</span> : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          staff.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                        {staff.lastLogin ? new Date(staff.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Staff"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff._id, staff.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Staff"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Add Staff */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus size={20} className="text-[#76b900]" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Add New Staff</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Staff ID (Username) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP01"
                      value={addStaffId}
                      onChange={(e) => setAddStaffId(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Role *</label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="counter">Counter POS</option>
                      <option value="cashier">Cashier</option>
                      <option value="waiter">Waiter / Server</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter login password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Staff will use this ID and password to log in to Counter POS.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="Staff email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#76b900] text-white font-extrabold rounded-xl text-xs hover:bg-[#68a500] shadow"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Staff */}
        {isEditModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 size={18} className="text-blue-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">Edit Staff ({selectedStaff.staffId})</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateStaff} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="counter">Counter POS</option>
                      <option value="cashier">Cashier</option>
                      <option value="waiter">Waiter / Server</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 text-white font-extrabold rounded-xl text-xs hover:bg-blue-700 shadow"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default ManageStaff;
