import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Users, Circle, Shield, UserCheck, Clock, RefreshCw } from 'lucide-react';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/users/admin');
      setUsers(res.data.data);
      setStats(res.data.stats);
    } catch { toast.error('Failed to fetch users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const timeAgo = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return <Layout><Loader size="lg" text="Loading admin panel..." /></Layout>;

  return (
    <Layout>
      <div className="fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Admin Panel</h1>
            <p className="text-surface-500 text-sm mt-1">Manage users and monitor activity</p>
          </div>
          <button onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-50 transition-all">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-surface-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center"><Users size={20} className="text-primary-500" /></div>
              </div>
              <p className="text-2xl font-bold text-surface-900">{stats.total}</p>
              <p className="text-xs text-surface-500 mt-1">Total Users</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Circle size={20} className="text-emerald-500 fill-emerald-500" /></div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.online}</p>
              <p className="text-xs text-surface-500 mt-1">Online Now</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Shield size={20} className="text-blue-500" /></div>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.hrCount}</p>
              <p className="text-xs text-surface-500 mt-1">HR Users</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center"><UserCheck size={20} className="text-violet-500" /></div>
              </div>
              <p className="text-2xl font-bold text-violet-600">{stats.employeeCount}</p>
              <p className="text-xs text-surface-500 mt-1">Employees</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100">
            <h3 className="font-semibold text-surface-900">All Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-3">Company ID</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-3">Last Active</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${u.role === 'HR' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-violet-400 to-violet-600'}`}>
                          <span className="text-white font-semibold text-sm">{u.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-800">{u.name}</p>
                          <p className="text-xs text-surface-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${u.role === 'HR' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
                        {u.role === 'HR' ? <Shield size={12} /> : <UserCheck size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-surface-600 font-mono bg-surface-50 px-2 py-0.5 rounded">{u.companyId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Circle size={8} className={u.isOnline ? 'fill-emerald-500 text-emerald-500' : 'fill-surface-300 text-surface-300'} />
                        <span className={`text-xs font-semibold ${u.isOnline ? 'text-emerald-600' : 'text-surface-400'}`}>
                          {u.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-surface-500">
                        <Clock size={12} />
                        {timeAgo(u.lastActive)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-surface-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminPage;
